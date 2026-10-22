import type { Block, BlockModel } from "./blocks";
import { modelCode, modelInfo } from "./flatModels";
import { FLAT_TYPES } from "./flatTypes";

export interface ModelLabel {
  code: string | null; // "3NG"
  name: string; // "New Generation"
  short: string; // code, or "5-room Adjoined flat" when there is no code
}

export function labelModel(type: number, model: string): ModelLabel {
  const t = FLAT_TYPES[type];
  const info = modelInfo(model);
  const code = t ? modelCode(t.key, model) : null;
  return { code, name: info.name, short: code ?? `${t?.label ?? ""} ${info.name}`.trim() };
}

export function formatArea(m: Pick<BlockModel, "areaMin" | "areaMax">): string {
  const min = Math.round(m.areaMin);
  const max = Math.round(m.areaMax);
  return min === max ? `${min} m²` : `${min}–${max} m²`;
}

/** "3NG, 4NG" — the block's models in flat-type order. */
export function modelCodes(b: Block): string {
  return b.models.map((m) => labelModel(m.type, m.model).short).join(", ");
}

/** Filter key for one flat type + model, e.g. "2|NG". */
export const modelKey = (m: Pick<BlockModel, "type" | "model">) => `${m.type}|${m.model}`;

function quantile(sorted: readonly number[], q: number): number {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export interface GuideEntry {
  key: string;
  type: number;
  model: string;
  label: ModelLabel;
  blocks: number;
  sales: number;
  areaLow: number; // 10th–90th percentile of the blocks' median floor areas
  areaMedian: number;
  areaHigh: number;
  yearFrom: number; // 10th–90th percentile of the blocks' completion years
  yearTo: number;
}

/** One row per flat type + model, summarised across every block that has it. */
export function buildModelGuide(blocks: readonly Block[]): GuideEntry[] {
  const groups = new Map<string, { type: number; model: string; areas: number[]; years: number[]; sales: number }>();
  for (const b of blocks) {
    for (const m of b.models) {
      const key = modelKey(m);
      if (!groups.has(key)) groups.set(key, { type: m.type, model: m.model, areas: [], years: [], sales: 0 });
      const g = groups.get(key)!;
      g.areas.push(m.areaMedian);
      if (b.year) g.years.push(b.year);
      g.sales += m.sales;
    }
  }
  return [...groups.entries()]
    .map(([key, g]) => {
      const areas = [...g.areas].sort((a, b) => a - b);
      const years = [...g.years].sort((a, b) => a - b);
      return {
        key,
        type: g.type,
        model: g.model,
        label: labelModel(g.type, g.model),
        blocks: g.areas.length,
        sales: g.sales,
        areaLow: Math.round(quantile(areas, 0.1)),
        areaMedian: Math.round(quantile(areas, 0.5)),
        areaHigh: Math.round(quantile(areas, 0.9)),
        yearFrom: Math.round(quantile(years, 0.1)),
        yearTo: Math.round(quantile(years, 0.9)),
      };
    })
    .sort((a, b) => a.type - b.type || a.yearFrom - b.yearFrom || b.blocks - a.blocks);
}
