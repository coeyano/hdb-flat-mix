import { useEffect, useState } from "react";
import type { Block } from "../lib/blocks";
import { titleCase } from "../lib/format";
import { labelModel } from "../lib/models";

// HDB's "Purchase of Residential Floor Plan" e-service (Singpass login, about S$5 per plan).
export const FLOOR_PLAN_SERVICE_URL = "https://services2.hdb.gov.sg/webapp/BC31ISOP2/BC31SMain";

function CopyButton({ text }: { text: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => setStatus("idle"), 1800);
    return () => clearTimeout(timer);
  }, [status]);

  const copy = () => {
    if (!navigator.clipboard) {
      setStatus("failed");
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => setStatus("copied"),
      () => setStatus("failed"),
    );
  };
  return (
    <button type="button" onClick={copy} aria-live="polite" className="shrink-0 text-xs text-accent hover:text-accent-strong">
      {status === "copied" ? "Copied" : status === "failed" ? "Copy failed — select the text" : "Copy"}
    </button>
  );
}

export function FloorPlans({ block }: { block: Block }) {
  const address = `Blk ${block.blk} ${titleCase(block.street)}${block.postal ? `, Singapore ${block.postal}` : ""}`;
  const models = block.models.map((m) => ({ ...m, label: labelModel(m.type, m.model) }));

  return (
    <section className="mt-7 rounded-xl bg-plane p-4 sm:p-5">
      <h3 className="text-sm font-semibold">Floor plans</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
        <strong className="font-medium text-ink">Free:</strong>{" "}
        {models.length > 0
          ? "use the “Typical layouts” link next to each model above. These are image searches, so results come from other websites and can include similar models; check the code and size."
          : "no flat models are recorded for this block, so there are no typical-layout links."}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-ink-2">
        <strong className="font-medium text-ink">Your plans:</strong> after buying a plan, use “Attach plan” next to its
        model above to see it on this card. It’s saved only in this browser on this device, never uploaded, so other
        people won’t see it.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-ink-2">
        <strong className="font-medium text-ink">Exact plan:</strong> HDB sells the official plan of any flat online for
        about S$5 (Singpass and a credit card needed). Flats of the same model in one block usually share a layout, so one
        plan per model is often enough.
      </p>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-baseline gap-3">
          <dt className="w-16 shrink-0 text-xs text-muted">Address</dt>
          <dd className="flex-1">{address}</dd>
          <CopyButton key={address} text={address} />
        </div>
        {models.length > 0 && (
          <div className="flex items-baseline gap-3">
            <dt className="w-16 shrink-0 text-xs text-muted">Models</dt>
            <dd className="flex-1">
              {models.map((m) => (m.label.code ? `${m.label.code} · ${m.label.name}` : m.label.short)).join("; ")}
            </dd>
          </div>
        )}
      </dl>
      <a
        href={FLOOR_PLAN_SERVICE_URL}
        target="_blank"
        rel="noopener"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-strong"
      >
        Open HDB’s floor plan service
        <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 4h8v8M16 4 5 15" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        HDB may ask for a unit number; any flat of the same model in this block should do. Plans are HDB copyright: use
        them for your own study, but don’t republish them.
      </p>
    </section>
  );
}
