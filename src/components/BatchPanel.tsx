import { useEffect, useMemo, useRef, useState } from "react";
import type { Block } from "../lib/blocks";
import { blocksToCsv, downloadCsv } from "../lib/csv";
import { FLAT_TYPES, townName } from "../lib/flatTypes";
import { fmt } from "../lib/format";
import type { BlockIndex, ResolvedEntry } from "../lib/search";
import { BlockCard } from "./BlockCard";
import { applyFilter, EMPTY_FILTER, EstateFilter, type FilterState } from "./EstateFilter";
import { useColourBy } from "../lib/useColourBy";
import { BlockMap } from "./BlockMap";
import { MixBar } from "./MixBar";
import { PasteList } from "./PasteList";
import { ResultsTable } from "./ResultsTable";

type Mode = "filter" | "paste";

const MARSILING_1970S: FilterState = {
  town: "WL",
  streetQuery: "Marsiling",
  streets: ["MARSILING CRES", "MARSILING DR", "MARSILING LANE", "MARSILING RD", "MARSILING RISE"],
  yearFrom: "1970",
  yearTo: "1979",
  models: [],
};

export function BatchPanel({ index }: { index: BlockIndex }) {
  const [mode, setMode] = useState<Mode>("filter");
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [entries, setEntries] = useState<ResolvedEntry[]>([]);
  const [selected, setSelected] = useState<Block | null>(null);
  const [colourBy, setColourBy] = useColourBy();

  const results = useMemo(() => {
    if (mode === "filter") return applyFilter(index.blocks, filter);
    const unique = new Map<string, Block>();
    for (const e of entries) if (e.block && !unique.has(e.block.id)) unique.set(e.block.id, e.block);
    return [...unique.values()];
  }, [mode, index, filter, entries]);

  const totals = useMemo(
    () => ({
      units: results.reduce((s, b) => s + b.units, 0),
      counts: FLAT_TYPES.map((_, i) => results.reduce((s, b) => s + b.counts[i], 0)),
    }),
    [results],
  );

  const exportCsv = () => {
    const scope = mode === "filter" && filter.town ? townName(filter.town).toLowerCase().replace(/[^a-z]+/g, "-") : "list";
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`hdb-flat-mix-${scope}-${date}.csv`, blocksToCsv(results));
  };

  const selectedInResults = selected && results.some((b) => b.id === selected.id) ? selected : null;
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selectedInResults) cardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedInResults]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Batch mode" className="inline-flex rounded-lg bg-plane p-1 text-sm">
            {(["filter", "paste"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-md px-3.5 py-1.5 ${mode === m ? "bg-surface font-medium shadow-sm" : "text-ink-2 hover:text-ink"}`}
              >
                {m === "filter" ? "Filter by estate" : "Paste a list"}
              </button>
            ))}
          </div>
          {mode === "filter" && (
            <button type="button" className="text-sm text-accent hover:text-accent-strong" onClick={() => setFilter(MARSILING_1970S)}>
              Example: Marsiling, 1970s
            </button>
          )}
        </div>

        {mode === "filter" ? (
          <EstateFilter blocks={index.blocks} value={filter} onChange={setFilter} />
        ) : (
          <PasteList index={index} entries={entries} onResolve={setEntries} />
        )}
      </section>

      {results.length > 0 && (
        <section className="space-y-6" aria-label="Results">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {fmt(results.length)} {results.length === 1 ? "block" : "blocks"}
                <span className="font-normal text-ink-2"> · {fmt(totals.units)} dwelling units</span>
              </h2>
              <p className="text-sm text-muted">Tap a pin or row for the block’s details. Click a column header to sort.</p>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium hover:border-muted"
            >
              <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M10 3v10m0 0-4-4m4 4 4-4M4 16h12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Download CSV
            </button>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Combined unit mix</h3>
            <MixBar counts={totals.counts} />
          </div>

          <div className="h-[22rem] sm:h-[28rem]">
            <BlockMap
              blocks={results}
              selected={selectedInResults}
              onSelect={setSelected}
              colourBy={colourBy}
              onColourByChange={setColourBy}
              fitToBlocks
            />
          </div>

          {selectedInResults && (
            <div ref={cardRef} className="relative scroll-mt-4">
              <button
                type="button"
                aria-label="Close block details"
                onClick={() => setSelected(null)}
                className="absolute right-4 top-4 rounded-full p-1.5 text-muted hover:bg-plane hover:text-ink"
              >
                <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
                </svg>
              </button>
              <BlockCard block={selectedInResults} />
            </div>
          )}

          <ResultsTable blocks={results} selectedId={selectedInResults?.id} onSelect={setSelected} />
        </section>
      )}

      {mode === "filter" && filter.town && results.length === 0 && (
        <p className="text-sm text-muted">No residential blocks match these filters.</p>
      )}
    </div>
  );
}
