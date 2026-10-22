import { useState } from "react";
import { FLAT_TYPES } from "../lib/flatTypes";
import planSizes from "../lib/planSizes.json";
import {
  commonsPageUrl,
  LICENCE_URLS,
  planImagePath,
  type TypicalPlan as Plan,
  typicalPlanFor,
} from "../lib/typicalPlans";

const SIZES: Record<string, number[] | undefined> = planSizes;

export const planImageUrl = (p: Plan) => `${import.meta.env.BASE_URL}${planImagePath(p)}`;

/** The plan for a flat type index + model id, if HDB published one we use. */
export function planForModel(type: number, model: string): Plan | undefined {
  const t = FLAT_TYPES[type];
  return t ? typicalPlanFor(t.key, model) : undefined;
}

const linkClass = "underline decoration-line underline-offset-2 hover:text-ink";

export function PlanCredit({ plan }: { plan: Plan }) {
  return (
    <>
      {plan.source.title}, p. {plan.page} of the scan. Scanned by My Community SG,{" "}
      <a href={commonsPageUrl(plan)} target="_blank" rel="noopener" className={linkClass}>
        Wikimedia Commons
      </a>
      ,{" "}
      <a href={LICENCE_URLS[plan.source.licence]} target="_blank" rel="noopener" className={linkClass}>
        {plan.source.licence}
      </a>
      ; {plan.crop ? "cropped and resized" : "resized"} for this app.
    </>
  );
}

/** HDB's typical plan for a model, shown inline with its credit and a full-size link. */
export function TypicalPlanFigure({ plan }: { plan: Plan }) {
  const [failed, setFailed] = useState(false);
  const src = planImageUrl(plan);
  const [width, height] = SIZES[plan.id] ?? [];
  return (
    <figure className="mt-2 basis-full overflow-hidden rounded-lg border border-line bg-white">
      <div className="flex items-baseline justify-between gap-3 border-b border-line bg-plane px-3 py-1.5 text-xs">
        <span className="font-medium text-ink">HDB typical plan · {plan.label}</span>
        <a
          href={src}
          target="_blank"
          rel="noopener"
          aria-label={`${plan.label}: open full-size image in a new tab`}
          className="shrink-0 text-accent hover:text-accent-strong"
        >
          Full size
        </a>
      </div>
      {failed ? (
        <p className="px-3 py-6 text-center text-xs text-muted">The plan image couldn’t be loaded. Use “Full size”.</p>
      ) : (
        <img
          src={src}
          alt={`${plan.label}, from ${plan.source.title}`}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="mx-auto block h-auto w-full max-w-xl"
        />
      )}
      <figcaption className="border-t border-line px-3 py-2 text-[11px] leading-relaxed text-muted">
        A typical plan of this model, not this block’s exact layout: corner units and later changes can differ.{" "}
        <PlanCredit plan={plan} />
      </figcaption>
    </figure>
  );
}
