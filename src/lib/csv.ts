import type { Block } from "./blocks";
import { dominantTypeLabel } from "./blocks";
import { FLAT_TYPES, townName } from "./flatTypes";
import { formatArea, labelModel } from "./models";

const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
// Types that can appear in resale records (not studio or rentals).
const MODEL_TYPES = FLAT_TYPES.map((t, i) => ({ t, i })).filter(({ t }) => t.group !== "rental" && t.key !== "studio");

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
  ...FLAT_TYPES.map((t) => slug(t.label)),
  "dominant_flat_type",
  ...MODEL_TYPES.flatMap(({ t }) => [`${slug(t.label)}_models`, `${slug(t.label)}_floor_area_sqm`]),
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
    ...MODEL_TYPES.flatMap(({ i }) => {
      const models = b.models.filter((m) => m.type === i);
      return [
        models.map((m) => labelModel(m.type, m.model)).map((l) => (l.code ? `${l.code} ${l.name}` : l.name)).join("; "),
        models.map((m) => formatArea(m).replace(" m²", "")).join("; "),
      ];
    }),
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
