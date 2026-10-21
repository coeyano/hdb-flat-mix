import type { Block } from "./blocks";
import { dominantTypeLabel } from "./blocks";
import { FLAT_TYPES, townName } from "./flatTypes";

const escapeCell = (v: string | number | null): string => {
  const s = v == null ? "" : String(v);
  // Prefix cells that spreadsheet apps would treat as formulas.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const CSV_HEADER = [
  "blk_no",
  "street",
  "town",
  "postal_code",
  "year_completed",
  "max_floor_lvl",
  "total_dwelling_units",
  ...FLAT_TYPES.map((t) => t.label.toLowerCase().replace(/[^a-z0-9]+/g, "_")),
  "dominant_flat_type",
  "latitude",
  "longitude",
];

export function blocksToCsv(blocks: readonly Block[]): string {
  const rows = blocks.map((b) => [
    b.blk,
    b.street,
    townName(b.town),
    b.postal,
    b.year,
    b.maxFloor,
    b.units,
    ...b.counts,
    dominantTypeLabel(b),
    b.lat,
    b.lng,
  ]);
  return [CSV_HEADER, ...rows].map((r) => r.map(escapeCell).join(",")).join("\r\n") + "\r\n";
}

export function downloadCsv(filename: string, csv: string): void {
  // BOM so Excel opens UTF-8 correctly.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
