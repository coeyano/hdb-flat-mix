import { FLAT_TYPES } from "../../src/lib/flatTypes";
import { type Block, compareBlockNo } from "../../src/lib/blocks";
import { blockKey, normaliseBlock, normalisePostal } from "../../src/lib/street";

export type PropertyRow = Record<string, string>;

export interface Building {
  blk: string;
  stCod: string;
  postal: string;
  lat: number;
  lng: number;
  area: number;
}

export interface Location {
  postal: string | null;
  lat: number;
  lng: number;
}

/** Minimal RFC 4180 CSV parser (handles quoted fields with commas and quotes). */
export function parseCsv(text: string): PropertyRow[] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || record.length) records.push([...record, field]);

  const [header, ...rows] = records.filter((r) => r.some((f) => f.trim() !== ""));
  if (!header) return [];
  const names = header.map((h) => h.trim().replace(/^﻿/, ""));
  return rows.map((r) => Object.fromEntries(names.map((h, i) => [h, (r[i] ?? "").trim()])));
}

type Ring = number[][];

/** Area-weighted centroid of a ring of [lng, lat] points, plus its (planar) area. */
export function ringCentroid(ring: Ring): { lng: number; lat: number; area: number } {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x0, y0] = ring[j];
    const [x1, y1] = ring[i];
    const cross = x0 * y1 - x1 * y0;
    a += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (Math.abs(a) < 1e-14) {
    const n = ring.length || 1;
    return { lng: ring.reduce((s, p) => s + p[0], 0) / n, lat: ring.reduce((s, p) => s + p[1], 0) / n, area: 0 };
  }
  return { lng: cx / (3 * a), lat: cy / (3 * a), area: Math.abs(a / 2) };
}

export function geometryCentroid(geometry: { type: string; coordinates: unknown }): { lng: number; lat: number; area: number } | null {
  const outerRings: Ring[] =
    geometry.type === "Polygon"
      ? [(geometry.coordinates as Ring[])[0]]
      : geometry.type === "MultiPolygon"
        ? (geometry.coordinates as Ring[][]).map((p) => p[0])
        : [];
  const centroids = outerRings.filter((r) => r && r.length >= 3).map(ringCentroid);
  if (!centroids.length) return null;
  return centroids.reduce((best, c) => (c.area > best.area ? c : best));
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export function buildingsFromGeoJson(geojson: { features: { properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } | null }[] }): Building[] {
  const out: Building[] = [];
  for (const f of geojson.features) {
    const p = f.properties;
    const c = f.geometry ? geometryCentroid(f.geometry) : null;
    if (!c || p.BLK_NO == null || !p.ST_COD || p.POSTAL_COD == null) continue;
    out.push({
      blk: normaliseBlock(String(p.BLK_NO)),
      stCod: String(p.ST_COD),
      postal: normalisePostal(String(p.POSTAL_COD)),
      lat: round6(c.lat),
      lng: round6(c.lng),
      area: c.area,
    });
  }
  return out;
}

/** Block numbers on each HDB street, used to sanity-check and infer street codes. */
export function blocksByStreet(rows: PropertyRow[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const r of rows) {
    const street = r.street;
    if (!map.has(street)) map.set(street, new Set());
    map.get(street)!.add(normaliseBlock(r.blk_no));
  }
  return map;
}

/**
 * Guess a street code's street from block-number overlap. Only returns a street when
 * it covers >=80% of the code's blocks and clearly beats the runner-up.
 */
export function inferStreetByOverlap(codeBlocks: Set<string>, byStreet: Map<string, Set<string>>): string | null {
  const scores: [string, number][] = [];
  for (const [street, blocks] of byStreet) {
    let hits = 0;
    for (const b of codeBlocks) if (blocks.has(b)) hits++;
    if (hits) scores.push([street, hits / codeBlocks.size + hits / blocks.size]);
  }
  scores.sort((a, b) => b[1] - a[1]);
  const [top, next] = scores;
  if (!top || top[1] < 1.3) return null;
  if (next && top[1] - next[1] < 0.5) return null;
  return top[0];
}

export function toInt(v: string | undefined): number {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : 0;
}

export interface JoinResult {
  blocks: Block[];
  unmatched: Block[]; // residential blocks with no location
  unusedBuildings: Building[]; // building outlines with no HDB property row
}

/**
 * Join residential property rows to building outlines on block + street.
 * `streetCodes` maps ST_COD → HDB street name; `extraLocations` holds OneMap lookups
 * (keyed like blockKey) for blocks missing from the building outlines.
 */
export function joinBlocks(
  rows: PropertyRow[],
  buildings: Building[],
  streetCodes: Record<string, string | null>,
  extraLocations: Record<string, Location | null> = {},
): JoinResult {
  const byKey = new Map<string, Building>();
  for (const b of buildings) {
    const street = streetCodes[b.stCod];
    if (!street) continue;
    const key = blockKey(b.blk, street);
    const existing = byKey.get(key);
    if (!existing || b.area > existing.area) byKey.set(key, b);
  }

  const used = new Set<string>();
  const blocks: Block[] = [];
  const unmatched: Block[] = [];
  for (const r of rows) {
    if (r.residential !== "Y") continue;
    const key = blockKey(r.blk_no, r.street);
    const building = byKey.get(key);
    const extra = extraLocations[key];
    const loc: Location | null = building ?? extra ?? null;
    if (building) used.add(key);
    const block: Block = {
      id: `${normaliseBlock(r.blk_no)}|${r.street}`,
      blk: normaliseBlock(r.blk_no),
      street: r.street,
      town: r.bldg_contract_town,
      year: toInt(r.year_completed),
      maxFloor: toInt(r.max_floor_lvl),
      units: toInt(r.total_dwelling_units),
      counts: FLAT_TYPES.map((t) => toInt(r[t.column])),
      postal: loc?.postal ?? null,
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
    };
    blocks.push(block);
    if (!loc) unmatched.push(block);
  }

  const unusedBuildings = buildings.filter((b) => {
    const street = streetCodes[b.stCod];
    return !street || !used.has(blockKey(b.blk, street));
  });

  blocks.sort((a, b) => a.street.localeCompare(b.street) || compareBlockNo(a.blk, b.blk));
  return { blocks, unmatched, unusedBuildings };
}
