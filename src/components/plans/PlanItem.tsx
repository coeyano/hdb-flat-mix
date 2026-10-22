import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { removePlan, type SavedPlan } from "../../lib/plans/planStore";

const PdfPages = lazy(() => import("./PdfPages").then((m) => ({ default: m.PdfPages })));

const sizeLabel = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** One saved plan: a row with show/hide, open and remove, and the plan drawn inline when shown. */
export function PlanItem({ plan, startOpen = false }: { plan: SavedPlan; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef(plan.file);
  fileRef.current = plan.file;

  // Keyed on the plan id: re-reading the store returns a new Blob for the same plan.
  // The URL's type is fixed to the checked kind, so the browser never treats it as a web page.
  useEffect(() => {
    const file = fileRef.current;
    const type =
      plan.kind === "pdf" ? "application/pdf" : /^image\/(png|jpeg|gif|webp)$/.test(file.type) ? file.type : "image/png";
    const objectUrl = URL.createObjectURL(new Blob([file], { type }));
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [plan.id, plan.kind]);

  const remove = () => {
    if (!window.confirm(`Remove “${plan.name}” from this device? Your original file isn’t affected.`)) return;
    removePlan(plan.id).catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  };

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs">
        <span aria-hidden className="rounded bg-plane px-1.5 py-0.5 font-medium uppercase text-ink-2">
          {plan.kind === "pdf" ? "PDF" : "IMG"}
        </span>
        <span className="min-w-[9rem] flex-1 truncate font-medium text-ink" title={plan.name}>
          {plan.name}
        </span>
        <span className="tabular text-muted">{sizeLabel(plan.size)}</span>
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="text-accent hover:text-accent-strong">
          {open ? "Hide" : "Show"}
        </button>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-strong">
            Open full size
          </a>
        )}
        <button type="button" onClick={remove} className="text-ink-2 hover:text-ink">
          Remove
        </button>
      </div>
      {error && (
        <p role="alert" className="px-3 pb-2 text-xs text-ink-2">
          {error}
        </p>
      )}
      {open && (
        <div className="border-t border-line p-2">
          {plan.kind === "image" ? (
            url && <img src={url} alt={`Floor plan: ${plan.name}`} className="block h-auto w-full rounded-md bg-white" />
          ) : (
            <Suspense fallback={<p className="py-6 text-center text-xs text-muted">Loading the PDF viewer…</p>}>
              <PdfPages planId={plan.id} file={plan.file} title={`Floor plan: ${plan.name}`} />
            </Suspense>
          )}
        </div>
      )}
    </div>
  );
}
