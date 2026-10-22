import type { Block, BlockModel } from "../lib/blocks";
import { FLAT_TYPES, townName } from "../lib/flatTypes";
import { fmt, formatAddress } from "../lib/format";
import { formatArea, labelModel } from "../lib/models";
import { FloorPlans } from "./FloorPlans";
import { MixBar } from "./MixBar";
import { LayoutLink, ModelChip } from "./ModelLinks";
import { AttachPlan } from "./plans/AttachPlan";
import { PlanItem } from "./plans/PlanItem";
import type { SavedPlan } from "../lib/plans/planStore";
import { useBlockPlans } from "../lib/plans/usePlans";
import { planForModel, TypicalPlanFigure } from "./TypicalPlan";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tabular mt-0.5 text-lg font-medium">{value}</dd>
    </div>
  );
}

function SavedPlans({ plans }: { plans: readonly SavedPlan[] }) {
  if (!plans.length) return null;
  return (
    <div className="mt-1.5 basis-full space-y-1.5">
      {plans.map((p) => (
        <PlanItem key={p.id} plan={p} />
      ))}
    </div>
  );
}

interface LineProps {
  m: BlockModel;
  blockId: string;
  plans: readonly SavedPlan[];
}

function ModelLine({ m, blockId, plans }: LineProps) {
  const label = labelModel(m.type, m.model);
  const typical = planForModel(m.type, m.model);
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
      {label.code ? <ModelChip code={label.code} /> : null}
      <span className="font-medium">{label.name}</span>
      <span className="tabular text-ink-2">{formatArea(m)}</span>
      <span className="tabular text-xs text-muted">
        · {fmt(m.sales)} {m.sales === 1 ? "resale" : "resales"}
      </span>
      <span className="ml-auto flex flex-wrap items-center gap-x-3">
        {!typical && <LayoutLink type={m.type} model={m.model} />}
        <AttachPlan blockId={blockId} slot={`${m.type}|${m.model}`} label={label.code ?? label.short} />
      </span>
      {typical && <TypicalPlanFigure plan={typical} />}
      <SavedPlans plans={plans} />
    </li>
  );
}

export function BlockCard({ block }: { block: Block }) {
  const rows = FLAT_TYPES.map((t, i) => ({ t, n: block.counts[i], models: block.models.filter((m) => m.type === i) }));
  const present = rows.filter((r) => r.n > 0 || r.models.length > 0);
  const absent = rows.filter((r) => r.n === 0 && r.models.length === 0);
  const { plans, error: planError } = useBlockPlans(block.id);
  const plansFor = (slot: string) => plans.filter((p) => p.slot === slot);
  // Plans saved against a model this block no longer lists (e.g. after a data refresh).
  const slots = new Set(
    present.flatMap((r) => (r.models.length ? r.models.map((m) => `${m.type}|${m.model}`) : [`${FLAT_TYPES.indexOf(r.t)}|`])),
  );
  const otherPlans = plans.filter((p) => !slots.has(p.slot));

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
                    <ModelLine key={m.model} m={m} blockId={block.id} plans={plansFor(`${m.type}|${m.model}`)} />
                  ))}
                </ul>
              ) : (
                <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <p className="text-xs text-muted">
                    {t.group === "rental"
                      ? "Rental flats aren't sold, so HDB records no model."
                      : t.key === "studio"
                        ? "Studio apartments aren't in the resale records."
                        : "Model not recorded: no resales since 1990."}
                  </p>
                  <span className="ml-auto">
                    <AttachPlan blockId={block.id} slot={`${FLAT_TYPES.indexOf(t)}|`} label={t.label} />
                  </span>
                  <SavedPlans plans={plansFor(`${FLAT_TYPES.indexOf(t)}|`)} />
                </div>
              )}
            </li>
          ))}
        </ul>
        {otherPlans.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted">Your other plans for this block:</p>
            <SavedPlans plans={otherPlans} />
          </div>
        )}
        {planError && <p className="mt-2 text-xs text-ink-2">Saved plans can’t be shown: {planError}</p>}
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
