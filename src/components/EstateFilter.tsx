import { useMemo } from "react";
import type { Block } from "../lib/blocks";
import { TOWNS } from "../lib/flatTypes";
import { titleCase } from "../lib/format";

export interface FilterState {
  town: string;
  streetQuery: string;
  streets: readonly string[]; // empty = all streets in town
  yearFrom: string;
  yearTo: string;
}

export const EMPTY_FILTER: FilterState = { town: "", streetQuery: "", streets: [], yearFrom: "", yearTo: "" };

export function applyFilter(blocks: readonly Block[], f: FilterState): Block[] {
  if (!f.town && !f.streets.length) return [];
  const streets = new Set(f.streets);
  const from = Number.parseInt(f.yearFrom, 10);
  const to = Number.parseInt(f.yearTo, 10);
  return blocks.filter(
    (b) =>
      (!f.town || b.town === f.town) &&
      (!streets.size || streets.has(b.street)) &&
      (Number.isNaN(from) || b.year >= from) &&
      (Number.isNaN(to) || b.year <= to),
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base sm:text-sm outline-none focus:border-accent";
const labelClass = "mb-1.5 block text-xs font-medium text-ink-2";

interface Props {
  blocks: readonly Block[];
  value: FilterState;
  onChange: (f: FilterState) => void;
}

export function EstateFilter({ blocks, value, onChange }: Props) {
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });

  const townStreets = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of blocks) if (b.town === value.town) counts.set(b.street, (counts.get(b.street) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [blocks, value.town]);

  const q = value.streetQuery.trim().toUpperCase();
  const shown = townStreets.filter(([s]) => !q || s.includes(q));
  const selected = new Set(value.streets);

  const toggleStreet = (s: string) =>
    set({ streets: selected.has(s) ? value.streets.filter((x) => x !== s) : [...value.streets, s] });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor="f-town" className={labelClass}>
            Town
          </label>
          <select
            id="f-town"
            className={inputClass}
            value={value.town}
            onChange={(e) => set({ town: e.target.value, streets: [], streetQuery: "" })}
          >
            <option value="">Choose a town…</option>
            {Object.entries(TOWNS)
              .sort((a, b) => a[1].localeCompare(b[1]))
              .map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
          </select>
        </div>
        <fieldset>
          <legend className={labelClass}>Year completed</legend>
          <div className="flex items-center gap-2">
            <input
              aria-label="From year"
              inputMode="numeric"
              placeholder="From"
              className={`${inputClass} sm:w-24`}
              value={value.yearFrom}
              onChange={(e) => set({ yearFrom: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            />
            <span className="text-muted">–</span>
            <input
              aria-label="To year"
              inputMode="numeric"
              placeholder="To"
              className={`${inputClass} sm:w-24`}
              value={value.yearTo}
              onChange={(e) => set({ yearTo: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            />
          </div>
        </fieldset>
      </div>

      {value.town && (
        <div>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <label htmlFor="f-street" className={labelClass + " mb-0"}>
              Streets <span className="font-normal text-muted">— none selected means all {townStreets.length}</span>
            </label>
            <div className="flex gap-3 text-xs">
              <button type="button" className="text-accent hover:text-accent-strong" onClick={() => set({ streets: [...new Set([...value.streets, ...shown.map(([s]) => s)])] })}>
                Select shown
              </button>
              <button type="button" className="text-ink-2 hover:text-ink" onClick={() => set({ streets: [] })}>
                Clear
              </button>
            </div>
          </div>
          <input
            id="f-street"
            placeholder="Filter streets, e.g. Marsiling"
            className={`${inputClass} mb-3`}
            value={value.streetQuery}
            onChange={(e) => set({ streetQuery: e.target.value })}
          />
          <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
            {shown.map(([s, n]) => {
              const on = selected.has(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleStreet(s)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    on ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink-2 hover:border-muted"
                  }`}
                >
                  {titleCase(s)} <span className={on ? "text-white/75" : "text-muted"}>{n}</span>
                </button>
              );
            })}
            {!shown.length && <p className="text-sm text-muted">No streets in this town match “{value.streetQuery}”.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
