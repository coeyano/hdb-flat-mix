/**
 * Refresh the app's data: `npm run fetch-data`
 *
 * 1. Downloads HDB Property Information (flat-type counts per block) and
 *    HDB Existing Building (postal code + outline per block) from data.gov.sg.
 * 2. Resolves each building's street code (ST_COD) to an HDB street name via OneMap,
 *    cached in scripts/cache so later runs only look up new codes.
 * 3. Joins the two on block + street, looks up any leftovers on OneMap,
 *    and writes public/data/*.json plus a match report in reports/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodeBlock, ROW_FIELDS, type Block } from "../src/lib/blocks";
import { townName } from "../src/lib/flatTypes";
import { blockKey, normaliseBlock, normalisePostal, normaliseStreet, STREET_EXPANSIONS } from "../src/lib/street";
import { downloadDataset, fetchMetadata } from "./lib/datagov";
import {
  blocksByStreet,
  buildingsFromGeoJson,
  inferStreetByOverlap,
  joinBlocks,
  parseCsv,
  type Building,
  type Location,
  type PropertyRow,
} from "./lib/join";
import { oneMapSearch } from "./lib/onemap";

const PROPERTY_ID = "d_17f5382f26140b1fdae0ba2ef6239d2f";
const BUILDINGS_ID = "d_16b157c52ed637edd6ba1232e026258d";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = path.join(root, "scripts", "cache");
const STREET_CODE_CACHE = path.join(CACHE_DIR, "street-codes.json");
const BLOCK_LOOKUP_CACHE = path.join(CACHE_DIR, "block-lookups.json");
const DATA_DIR = path.join(root, "public", "data");
const REPORT_DIR = path.join(root, "reports");

interface StreetCodeEntry {
  postal: string;
  road: string | null;
}

function readJson<T>(file: string, fallback: T): T {
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as T) : fallback;
}

function writeJson(file: string, value: unknown, pretty = false) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, pretty ? 1 : undefined) + "\n");
}

const pct = (n: number, d: number) => (d ? ((100 * n) / d).toFixed(1) : "0.0") + "%";

async function lookUpStreetCodes(buildings: Building[]): Promise<Record<string, StreetCodeEntry>> {
  const cache = readJson<Record<string, StreetCodeEntry>>(STREET_CODE_CACHE, {});
  const samples = new Map<string, Building>();
  for (const b of buildings) if (!samples.has(b.stCod)) samples.set(b.stCod, b);

  const missing = [...samples.keys()].filter((c) => !(c in cache));
  if (missing.length) console.log(`  Looking up ${missing.length} new street codes on OneMap (~1.5 s each)…`);
  for (const [i, code] of missing.entries()) {
    const sample = samples.get(code)!;
    try {
      const results = await oneMapSearch(sample.postal);
      const hit = results.find((r) => r.POSTAL === sample.postal) ?? results[0];
      cache[code] = { postal: sample.postal, road: hit?.ROAD_NAME ?? null };
    } catch (err) {
      console.warn(`  ! ${code}: ${String(err)}`);
    }
    if ((i + 1) % 50 === 0) {
      console.log(`    ${i + 1}/${missing.length}`);
      writeJson(STREET_CODE_CACHE, cache, true);
    }
  }
  writeJson(STREET_CODE_CACHE, cache, true);
  return cache;
}

function resolveStreetCodes(
  buildings: Building[],
  cache: Record<string, StreetCodeEntry>,
  rows: PropertyRow[],
): { streetCodes: Record<string, string | null>; viaOverlap: string[]; unresolved: string[] } {
  const byStreet = blocksByStreet(rows);
  const codeBlocks = new Map<string, Set<string>>();
  for (const b of buildings) {
    if (!codeBlocks.has(b.stCod)) codeBlocks.set(b.stCod, new Set());
    codeBlocks.get(b.stCod)!.add(b.blk);
  }
  const streetCodes: Record<string, string | null> = {};
  const viaOverlap: string[] = [];
  const unresolved: string[] = [];
  for (const [code, blocks] of codeBlocks) {
    const road = cache[code]?.road;
    const fromOneMap = road ? normaliseStreet(road) : null;
    if (fromOneMap && byStreet.has(fromOneMap)) {
      streetCodes[code] = fromOneMap;
      continue;
    }
    const inferred = inferStreetByOverlap(blocks, byStreet);
    streetCodes[code] = inferred;
    if (inferred) viaOverlap.push(`${code} → ${inferred}`);
    else unresolved.push(`${code} (OneMap: ${road ?? "no result"})`);
  }
  return { streetCodes, viaOverlap, unresolved };
}

const expandStreet = (street: string) =>
  street
    .split(" ")
    .map((w) => STREET_EXPANSIONS[w] ?? w)
    .join(" ");

/** OneMap lookup for blocks missing from the building outlines (usually brand-new blocks). */
async function lookUpMissingBlocks(missing: Block[]): Promise<Record<string, Location | null>> {
  const cache = readJson<Record<string, Location | null>>(BLOCK_LOOKUP_CACHE, {});
  const todo = missing.filter((b) => !cache[blockKey(b.blk, b.street)]);
  if (todo.length) console.log(`  Looking up ${todo.length} blocks missing from the building outlines on OneMap…`);
  for (const b of todo) {
    let found: Location | null = null;
    for (const query of [`${b.blk} ${expandStreet(b.street)}`, `${b.blk} ${b.street}`]) {
      try {
        const results = await oneMapSearch(query);
        const hit = results.find(
          (r) => normaliseBlock(r.BLK_NO) === b.blk && normaliseStreet(r.ROAD_NAME) === b.street,
        );
        if (hit) {
          found = {
            postal: /^\d{6}$/.test(hit.POSTAL) ? normalisePostal(hit.POSTAL) : null,
            lat: Math.round(Number(hit.LATITUDE) * 1e6) / 1e6,
            lng: Math.round(Number(hit.LONGITUDE) * 1e6) / 1e6,
          };
          break;
        }
      } catch (err) {
        console.warn(`  ! ${b.blk} ${b.street}: ${String(err)}`);
      }
    }
    cache[blockKey(b.blk, b.street)] = found;
  }
  writeJson(BLOCK_LOOKUP_CACHE, cache, true);
  return cache;
}

function writeReports(
  blocks: Block[],
  unmatched: Block[],
  unusedBuildings: Building[],
  streetInfo: ReturnType<typeof resolveStreetCodes>,
  viaOneMap: number,
) {
  const located = blocks.length - unmatched.length;
  const lines = [
    "# Join report",
    "",
    `Generated ${new Date().toISOString()}`,
    "",
    `- Residential blocks in HDB Property Information: **${blocks.length}**`,
    `- Matched to a postal code and location: **${located} (${pct(located, blocks.length)})**`,
    `  - via HDB Existing Building outlines: ${located - viaOneMap}`,
    `  - via OneMap block search (blocks missing from the outlines): ${viaOneMap}`,
    `- Unmatched: **${unmatched.length}**`,
    `- Building outlines not linked to a residential block: ${unusedBuildings.length} (mostly non-residential, e.g. carparks and shops)`,
    `- Street codes resolved by block overlap instead of OneMap: ${streetInfo.viaOverlap.length}`,
    `- Street codes not resolved: ${streetInfo.unresolved.length}`,
    "",
    "## Unmatched residential blocks",
    "",
    "| Block | Street | Town | Year |",
    "|---|---|---|---|",
    ...unmatched.map((b) => `| ${b.blk} | ${b.street} | ${townName(b.town)} | ${b.year} |`),
    "",
    "## Street codes resolved by block overlap",
    "",
    ...streetInfo.viaOverlap.map((s) => `- ${s}`),
    "",
    "## Street codes not resolved",
    "",
    ...streetInfo.unresolved.map((s) => `- ${s}`),
    "",
  ];
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, "join-report.md"), lines.join("\n"));
  fs.writeFileSync(
    path.join(REPORT_DIR, "unmatched-blocks.csv"),
    ["blk_no,street,town,year_completed", ...unmatched.map((b) => `${b.blk},${b.street},${townName(b.town)},${b.year}`)].join("\n") + "\n",
  );
}

async function main() {
  console.log("1/5 Reading dataset metadata…");
  const propertyMeta = await fetchMetadata(PROPERTY_ID);
  const buildingsMeta = await fetchMetadata(BUILDINGS_ID);
  console.log(`  ${propertyMeta.name}: last updated ${propertyMeta.lastUpdatedAt}`);
  console.log(`  ${buildingsMeta.name}: last updated ${buildingsMeta.lastUpdatedAt}`);

  console.log("2/5 Downloading HDB Property Information…");
  const rows = parseCsv(await downloadDataset(PROPERTY_ID));
  const required = ["blk_no", "street", "residential", "year_completed", "total_dwelling_units", "bldg_contract_town"];
  const missingCols = required.filter((c) => !(c in (rows[0] ?? {})));
  if (missingCols.length) throw new Error(`Property dataset is missing columns: ${missingCols.join(", ")}. HDB may have changed the schema.`);
  console.log(`  ${rows.length} rows`);

  console.log("3/5 Downloading HDB Existing Building (≈57 MB)…");
  const buildings = buildingsFromGeoJson(JSON.parse(await downloadDataset(BUILDINGS_ID)));
  console.log(`  ${buildings.length} building outlines`);

  console.log("4/5 Resolving street codes and joining…");
  const cache = await lookUpStreetCodes(buildings);
  const streetInfo = resolveStreetCodes(buildings, cache, rows);
  const firstPass = joinBlocks(rows, buildings, streetInfo.streetCodes);
  const extra = await lookUpMissingBlocks(firstPass.unmatched);
  const { blocks, unmatched, unusedBuildings } = joinBlocks(rows, buildings, streetInfo.streetCodes, extra);
  const viaOneMap = firstPass.unmatched.length - unmatched.length;

  console.log("5/5 Writing files…");
  writeJson(path.join(DATA_DIR, "blocks.json"), { fields: ROW_FIELDS, rows: blocks.map(encodeBlock) });
  writeJson(
    path.join(DATA_DIR, "meta.json"),
    {
      generatedAt: new Date().toISOString(),
      sources: [propertyMeta, buildingsMeta],
      residentialBlocks: blocks.length,
      locatedBlocks: blocks.length - unmatched.length,
      unmatched: unmatched.map((b) => `${b.blk} ${b.street}`),
    },
    true,
  );
  writeReports(blocks, unmatched, unusedBuildings, streetInfo, viaOneMap);

  const located = blocks.length - unmatched.length;
  console.log("");
  console.log(`Join match rate: ${located}/${blocks.length} residential blocks (${pct(located, blocks.length)})`);
  console.log(`  via building outlines: ${located - viaOneMap}, via OneMap block search: ${viaOneMap}`);
  console.log(`  street codes: ${Object.values(streetInfo.streetCodes).filter(Boolean).length} resolved, ${streetInfo.viaOverlap.length} by overlap, ${streetInfo.unresolved.length} unresolved`);
  if (unmatched.length) {
    console.log(`Unmatched (${unmatched.length}):`);
    for (const b of unmatched) console.log(`  ${b.blk} ${b.street} (${townName(b.town)}, ${b.year})`);
  }
  console.log("Report: reports/join-report.md");
}

main().catch((err) => {
  console.error(`\nData refresh failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
