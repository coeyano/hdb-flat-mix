import { useMemo, useState } from "react";
import { type Block, compareBlockNo } from "../lib/blocks";
import { FLAT_TYPES } from "../lib/flatTypes";
import { fmt, titleCase } from "../lib/format";
import { modelCodes } from "../lib/models";
import { MixBar } from "./MixBar";

interface Column {
  key: string;
  label: string;
  title?: string;
  value: (b: Block) => string | number;
  numeric?: boolean;
}

const COLUMNS: readonly Column[] = [
  { key: "address", label: "Block", value: (b) => `${b.street} ${b.blk}` },
  { key: "postal", label: "Postal", value: (b) => b.postal ?? "" },
  { key: "year", label: "Year", value: (b) => b.year, numeric: true },
  { key: "floors", label: "Floors", title: "Max floor level", value: (b) => b.maxFloor, numeric: true },
  { key: "units", label: "Units", title: "Total dwelling units", value: (b) => b.units, numeric: true },
  { key: "models", label: "Models", title: "Flat models from resale records", value: (b) => modelCodes(b) },
  ...FLAT_TYPES.map((t, i) => ({ key: t.key, label: t.short, title: t.label, value: (b: Block) => b.counts[i], numeric: true })),
];

type Sort = { key: string; dir: 1 | -1 };

function compare(col: Column, a: Block, b: Block): number {
  if (col.key === "address") return a.street.localeCompare(b.street) || compareBlockNo(a.blk, b.blk);
  const va = col.value(a);
  const vb = col.value(b);
  return typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
}

interface Props {
  blocks: readonly Block[];
  selectedId?: string | null;
  onSelect?: (block: Block) => void;
}

export function ResultsTable({ blocks, selectedId, onSelect }: Props) {
  const [sort, setSort] = useState<Sort>({ key: "address", dir: 1 });
  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sort.key) ?? COLUMNS[0];
    return [...blocks].sort((a, b) => sort.dir * compare(col, a, b));
  }, [blocks, sort]);

  const toggle = (key: string, numeric?: boolean) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: numeric ? -1 : 1 }));

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            {COLUMNS.map((c, i) => {
              const active = sort.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                  className={`whitespace-nowrap px-3 py-2.5 font-medium ${c.numeric ? "text-right" : "text-left"} ${i === 0 ? "sticky left-0 z-10 bg-surface pl-4" : ""}`}
                >
                  <button
                    type="button"
                    title={c.title ? `Sort by ${c.title}` : `Sort by ${c.label}`}
                    className={`inline-flex items-center gap-1 hover:text-ink ${active ? "text-ink" : ""}`}
                    onClick={() => toggle(c.key, c.numeric)}
                  >
                    {c.label}
                    <span aria-hidden className={`text-[10px] ${active ? "" : "invisible"}`}>
                      {sort.dir === 1 ? "▲" : "▼"}
                    </span>
                  </button>
                </th>
              );
            })}
            <th scope="col" className="min-w-36 px-4 py-2.5 text-left font-medium">
              Mix
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((b) => {
            const selected = b.id === selectedId;
            return (
              <tr
                key={b.id}
                onClick={() => onSelect?.(b)}
                className={`cursor-pointer border-b border-line last:border-0 ${selected ? "bg-accent-soft" : "hover:bg-plane"}`}
              >
                <th
                  scope="row"
                  className={`sticky left-0 whitespace-nowrap py-2 pl-4 pr-3 text-left font-medium ${selected ? "bg-accent-soft" : "bg-surface"}`}
                >
                  <button
                    type="button"
                    className="text-left hover:text-accent"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect?.(b);
                    }}
                  >
                    {b.blk} {titleCase(b.street)}
                  </button>
                </th>
                <td className="tabular px-3 py-2 text-ink-2">{b.postal ?? "—"}</td>
                <td className="tabular px-3 py-2 text-right">{b.year || "—"}</td>
                <td className="tabular px-3 py-2 text-right">{b.maxFloor || "—"}</td>
                <td className="tabular px-3 py-2 text-right font-medium">{fmt(b.units)}</td>
                <td className="min-w-28 max-w-56 px-3 py-2 text-xs leading-snug text-ink-2">{modelCodes(b) || <span className="text-[#c3c2b7]">—</span>}</td>
                {b.counts.map((n, i) => (
                  <td key={FLAT_TYPES[i].key} className={`tabular px-3 py-2 text-right ${n ? "" : "text-[#c3c2b7]"}`}>
                    {n ? fmt(n) : "0"}
                  </td>
                ))}
                <td className="px-4 py-2">
                  <MixBar counts={b.counts} showLegend={false} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
