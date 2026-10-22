import type { Block, BlockModel } from "../lib/blocks";
import { FLAT_TYPES, townName } from "../lib/flatTypes";
import { fmt, formatAddress } from "../lib/format";
import { formatArea, labelModel } from "../lib/models";
import { FloorPlans } from "./FloorPlans";
import { MixBar } from "./MixBar";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tabular mt-0.5 text-lg font-medium">{value}</dd>
    </div>
  );
}

export function ModelChip({ code }: { code: string }) {
  return (
    <span className="tabular inline-flex min-w-11 justify-center rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent-strong">
      {code}
    </span>
  );
}

function ModelLine({ m }: { m: BlockModel }) {
  const label = labelModel(m.type, m.model);
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
      {label.code ? <ModelChip code={label.code} /> : null}
      <span className="font-medium">{label.name}</span>
      <span className="tabular text-ink-2">{formatArea(m)}</span>
      <span className="tabular text-xs text-muted">
        · {fmt(m.sales)} {m.sales === 1 ? "resale" : "resales"}
      </span>
    </li>
  );
}

export function BlockCard({ block }: { block: Block }) {
  const rows = FLAT_TYPES.map((t, i) => ({ t, n: block.counts[i], models: block.models.filter((m) => m.type === i) }));
  const present = rows.filter((r) => r.n > 0 || r.models.length > 0);
  const absent = rows.filter((r) => r.n === 0 && r.models.length === 0);

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

      <section className="mt-7">
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Flat types and models</h3>
        <ul className="divide-y divide-line">
          {present.map(({ t, n, models }) => (
            <li key={t.key} className="py-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-medium">{t.label}</span>
                <span className="tabular text-sm">
                  <span className="font-semibold">{fmt(n)}</span> <span className="text-muted">{n === 1 ? "unit" : "units"}</span>
                </span>
              </div>
              {n === 0 && models.length > 0 && (
                <p className="mt-1 text-xs text-muted">
                  HDB’s block data lists no units of this type, but resale records show some existed (they may have
                  been merged or converted).
                </p>
              )}
              {models.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {models.map((m) => (
                    <ModelLine key={m.model} m={m} />
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-muted">
                  {t.group === "rental"
                    ? "Rental flats aren't sold, so HDB records no model."
                    : t.key === "studio"
                      ? "Studio apartments aren't in the resale records."
                      : "Model not recorded: no resales since 1990."}
                </p>
              )}
            </li>
          ))}
        </ul>
        {absent.length > 0 && (
          <p className="mt-2 text-xs text-muted">Not in this block: {absent.map((r) => r.t.label).join(", ")}.</p>
        )}
        {block.models.length > 0 && (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Models and floor areas come from resale records since 1990. They show which models exist here, not how many
            units of each.
          </p>
        )}
      </section>

      <FloorPlans block={block} />
    </article>
  );
}
