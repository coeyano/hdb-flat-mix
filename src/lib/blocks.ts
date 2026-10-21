import { FLAT_TYPES, type MixGroup } from "./flatTypes";

export interface Block {
  id: string; // "blk|street"
  blk: string;
  street: string;
  town: string; // bldg_contract_town code
  year: number;
  maxFloor: number;
  units: number;
  counts: readonly number[]; // aligned with FLAT_TYPES
  postal: string | null;
  lat: number | null;
  lng: number | null;
}

// Compact on-disk row: [blk, street, town, year, maxFloor, units, ...counts, postal, lat, lng]
export type BlockRow = (string | number | null)[];

export const ROW_FIELDS = [
  "blk",
  "street",
  "town",
  "year",
  "maxFloor",
  "units",
  ...FLAT_TYPES.map((t) => t.key),
  "postal",
  "lat",
  "lng",
] as const;

export interface BlocksFile {
  fields: readonly string[];
  rows: BlockRow[];
}

export function encodeBlock(b: Block): BlockRow {
  return [b.blk, b.street, b.town, b.year, b.maxFloor, b.units, ...b.counts, b.postal, b.lat, b.lng];
}

export function decodeRow(row: BlockRow): Block {
  const n = FLAT_TYPES.length;
  const [blk, street, town, year, maxFloor, units] = row as [string, string, string, number, number, number];
  const counts = row.slice(6, 6 + n).map(Number);
  const [postal, lat, lng] = row.slice(6 + n) as [string | null, number | null, number | null];
  return { id: `${blk}|${street}`, blk, street, town, year, maxFloor, units, counts, postal, lat, lng };
}

export function decodeFile(file: BlocksFile): Block[] {
  if (file.fields.join(",") !== ROW_FIELDS.join(",")) {
    throw new Error("Data file format does not match this version of the app. Re-run `npm run fetch-data`.");
  }
  return file.rows.map(decodeRow);
}

export function groupTotals(b: Block): Record<MixGroup, number> {
  const totals: Record<MixGroup, number> = { small: 0, r3: 0, r4: 0, r5: 0, large: 0, rental: 0 };
  FLAT_TYPES.forEach((t, i) => {
    totals[t.group] += b.counts[i] ?? 0;
  });
  return totals;
}

/** The colour group holding the most units; ties go to the smaller flat type. */
export function dominantGroup(b: Block): MixGroup | null {
  let best: MixGroup | null = null;
  let bestCount = 0;
  for (const [group, count] of Object.entries(groupTotals(b)) as [MixGroup, number][]) {
    if (count > bestCount) {
      best = group;
      bestCount = count;
    }
  }
  return best;
}

/** The single flat type with the most units, e.g. "3-room". */
export function dominantTypeLabel(b: Block): string {
  let bestIdx = -1;
  b.counts.forEach((c, i) => {
    if (c > 0 && (bestIdx < 0 || c > b.counts[bestIdx])) bestIdx = i;
  });
  return bestIdx < 0 ? "—" : FLAT_TYPES[bestIdx].label;
}

export function compareBlockNo(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}
