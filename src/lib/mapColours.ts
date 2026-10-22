import { type Block, dominantGroup } from "./blocks";
import { GROUP_BY_KEY, MIX_GROUPS } from "./flatTypes";

export type ColourBy = "type" | "year";

export interface LegendItem {
  label: string;
  color: string;
}

// Year built, older = darker so older estates stand out. One-hue ordinal ramp validated
// for step gaps and light-end contrast.
export const YEAR_BANDS: readonly (LegendItem & { until: number })[] = [
  { label: "Before 1970", until: 1969, color: "#6b2c14" },
  { label: "1970–79", until: 1979, color: "#a3431f" },
  { label: "1980–89", until: 1989, color: "#cf5a2b" },
  { label: "1990–99", until: 1999, color: "#e8794a" },
  { label: "2000 onwards", until: Number.POSITIVE_INFINITY, color: "#f2a07a" },
];

const NO_DATA = "#c3c2b7";

export function blockColour(b: Block, by: ColourBy): string {
  if (by === "year") {
    if (!b.year) return NO_DATA;
    return (YEAR_BANDS.find((band) => b.year <= band.until) ?? YEAR_BANDS[YEAR_BANDS.length - 1]).color;
  }
  const g = dominantGroup(b);
  return g ? GROUP_BY_KEY[g].color : NO_DATA;
}

export function legendFor(by: ColourBy): readonly LegendItem[] {
  return by === "year" ? YEAR_BANDS : MIX_GROUPS;
}
