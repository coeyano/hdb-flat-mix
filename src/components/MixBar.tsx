import { FLAT_TYPES, MIX_GROUPS } from "../lib/flatTypes";
import { fmt } from "../lib/format";

interface Props {
  counts: readonly number[]; // aligned with FLAT_TYPES
  showLegend?: boolean;
}

/** Horizontal stacked bar of the unit mix, one segment per colour group. */
export function MixBar({ counts, showLegend = true }: Props) {
  const total = counts.reduce((s, c) => s + c, 0);
  const groups = MIX_GROUPS.map((g) => {
    const types = FLAT_TYPES.map((t, i) => ({ t, n: counts[i] ?? 0 })).filter((x) => x.t.group === g.key && x.n > 0);
    return { ...g, n: types.reduce((s, x) => s + x.n, 0), detail: types.map((x) => `${x.t.label} ${fmt(x.n)}`).join(", ") };
  }).filter((g) => g.n > 0);

  if (!total) return <p className="text-sm text-muted">No dwelling units recorded for this block.</p>;

  const pct = (n: number) => (100 * n) / total;
  const pctLabel = (n: number) => (pct(n) < 1 ? "<1%" : `${Math.round(pct(n))}%`);
  const label = groups.map((g) => `${g.label}: ${fmt(g.n)} (${pctLabel(g.n)})`).join("; ");

  return (
    <div>
      <div className="flex h-3 w-full gap-[2px]" role="img" aria-label={`Unit mix — ${label}`}>
        {groups.map((g) => (
          <div
            key={g.key}
            className="h-full min-w-[3px] first:rounded-l last:rounded-r"
            style={{ width: `${pct(g.n)}%`, background: g.color }}
            title={`${g.detail} — ${pctLabel(g.n)}`}
          />
        ))}
      </div>
      {showLegend && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-2">
          {groups.map((g) => (
            <li key={g.key} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: g.color }} />
              <span>{g.label}</span>
              <span className="tabular text-muted">{pctLabel(g.n)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
