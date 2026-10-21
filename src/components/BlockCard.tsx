import type { Block } from "../lib/blocks";
import { FLAT_TYPES, townName } from "../lib/flatTypes";
import { fmt, formatAddress } from "../lib/format";
import { MixBar } from "./MixBar";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tabular mt-0.5 text-lg font-medium">{value}</dd>
    </div>
  );
}

export function BlockCard({ block }: { block: Block }) {
  const sold = FLAT_TYPES.map((t, i) => ({ t, n: block.counts[i] })).filter((x) => x.t.group !== "rental");
  const rental = FLAT_TYPES.map((t, i) => ({ t, n: block.counts[i] })).filter((x) => x.t.group === "rental");

  return (
    <article className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
      <header>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{formatAddress(block.blk, block.street)}</h2>
        <p className="mt-1 text-sm text-ink-2">
          {townName(block.town)}
          {block.postal && <> · Singapore {block.postal}</>}
        </p>
      </header>

      <dl className="mt-6 grid grid-cols-3 gap-4 border-y border-line py-4">
        <Stat label="Year completed" value={block.year ? String(block.year) : "—"} />
        <Stat label="Max floor level" value={block.maxFloor ? String(block.maxFloor) : "—"} />
        <Stat label="Dwelling units" value={fmt(block.units)} />
      </dl>

      <section className="mt-6">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Unit mix</h3>
        <MixBar counts={block.counts} />
      </section>

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <TypeList title="Sold flats" items={sold} />
        <TypeList title="Rental flats" items={rental} />
      </section>
    </article>
  );
}

function TypeList({ title, items }: { title: string; items: { t: (typeof FLAT_TYPES)[number]; n: number }[] }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
      <dl className="divide-y divide-line">
        {items.map(({ t, n }) => (
          <div key={t.key} className={`flex justify-between py-1.5 text-sm ${n ? "" : "text-muted"}`}>
            <dt>{t.label}</dt>
            <dd className={`tabular ${n ? "font-medium" : ""}`}>{fmt(n)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
