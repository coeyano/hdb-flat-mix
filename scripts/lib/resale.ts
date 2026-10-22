import type { Block, BlockModel } from "../../src/lib/blocks";
import { isKnownModel, modelId, resaleTypeKey } from "../../src/lib/flatModels";
import { FLAT_TYPES } from "../../src/lib/flatTypes";
import { blockKey } from "../../src/lib/street";
import type { PropertyRow } from "./join";

const TYPE_INDEX = new Map(FLAT_TYPES.map((t, i) => [t.key, i]));

interface ModelTally {
  type: number;
  model: string;
  areas: number[];
}

export interface ResaleSummary {
  byBlock: Map<string, Map<string, ModelTally>>; // blockKey → "type|model" → tally
  sales: number;
  skipped: number; // rows with an unknown flat type or no floor area
  unknownModels: Set<string>;
}

export function emptySummary(): ResaleSummary {
  return { byBlock: new Map(), sales: 0, skipped: 0, unknownModels: new Set() };
}

/**
 * Tally resale records by block, flat type and flat model, keeping every floor area seen.
 * Pass an existing summary to add another dataset to it (it is updated in place).
 */
export function summariseResales(rows: Iterable<PropertyRow>, summary: ResaleSummary = emptySummary()): ResaleSummary {
  const tallies = summary.byBlock;
  for (const r of rows) {
    summary.sales++;
    const typeKey = resaleTypeKey(r.flat_type ?? "");
    const type = typeKey ? TYPE_INDEX.get(typeKey) : undefined;
    const area = Number(r.floor_area_sqm);
    if (type === undefined || !r.flat_model || !Number.isFinite(area) || area <= 0) {
      summary.skipped++;
      continue;
    }
    if (!isKnownModel(r.flat_model)) summary.unknownModels.add(r.flat_model);
    const model = modelId(r.flat_model);
    const key = blockKey(r.block, r.street_name);
    if (!tallies.has(key)) tallies.set(key, new Map());
    const perBlock = tallies.get(key)!;
    const combo = `${type}|${model}`;
    if (!perBlock.has(combo)) perBlock.set(combo, { type, model, areas: [] });
    perBlock.get(combo)!.areas.push(area);
  }
  return summary;
}

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function toBlockModels(tallies: Iterable<ModelTally>): BlockModel[] {
  return [...tallies]
    .map((t) => ({
      type: t.type,
      model: t.model,
      sales: t.areas.length,
      areaMin: round1(Math.min(...t.areas)),
      areaMax: round1(Math.max(...t.areas)),
      areaMedian: round1(median(t.areas)),
    }))
    .sort((a, b) => a.type - b.type || b.sales - a.sales);
}

export interface ModelStats {
  blocksWithModels: number;
  blocksWithSoldFlats: number; // denominator for blocksWithModels (excludes rental-only blocks)
  matchedSales: number;
  soldSlots: number; // block × sold flat type with units
  slotsWithModel: number;
}

const SOLD_TYPE_INDEXES = FLAT_TYPES.flatMap((t, i) => (t.group === "rental" || t.key === "studio" ? [] : [i]));
const hasSoldFlats = (b: Block) => SOLD_TYPE_INDEXES.some((i) => b.counts[i] > 0);

/** Months covered by a dataset, to catch overlapping datasets that would double-count sales. */
export function monthRange(rows: readonly PropertyRow[]): { from: string; to: string } | null {
  let from = "";
  let to = "";
  for (const r of rows) {
    if (!r.month) continue;
    if (!from || r.month < from) from = r.month;
    if (!to || r.month > to) to = r.month;
  }
  return from ? { from, to } : null;
}

export function findOverlaps(ranges: readonly { name: string; from: string; to: string }[]): string[] {
  const sorted = [...ranges].sort((a, b) => a.from.localeCompare(b.from));
  return sorted.slice(1).flatMap((r, i) => (r.from <= sorted[i].to ? [`${sorted[i].name} and ${r.name} overlap`] : []));
}

/** Attach resale models to blocks (returns new blocks) and report coverage. */
export function attachModels(blocks: readonly Block[], summary: ResaleSummary): { blocks: Block[]; stats: ModelStats } {
  let matchedSales = 0;
  let soldSlots = 0;
  let slotsWithModel = 0;
  const withModels = blocks.map((b) => {
    const tallies = summary.byBlock.get(blockKey(b.blk, b.street));
    const models = tallies ? toBlockModels(tallies.values()) : [];
    matchedSales += models.reduce((s, m) => s + m.sales, 0);
    FLAT_TYPES.forEach((t, i) => {
      if (t.group === "rental" || t.key === "studio" || !b.counts[i]) return;
      soldSlots++;
      if (models.some((m) => m.type === i)) slotsWithModel++;
    });
    return { ...b, models };
  });
  return {
    blocks: withModels,
    stats: {
      blocksWithModels: withModels.filter((b) => b.models.length).length,
      blocksWithSoldFlats: withModels.filter((b) => hasSoldFlats(b)).length,
      matchedSales,
      soldSlots,
      slotsWithModel,
    },
  };
}
