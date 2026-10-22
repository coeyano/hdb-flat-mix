import { labelModel, layoutSearchUrl } from "../lib/models";

/** Link to a free image search of typical layouts for one flat model. */
export function LayoutLink({ type, model, className = "" }: { type: number; model: string; className?: string }) {
  const label = labelModel(type, model);
  return (
    <a
      href={layoutSearchUrl(type, model)}
      target="_blank"
      rel="noopener"
      aria-label={`Typical layouts of ${label.code ?? label.short} ${label.name} (image search, opens in a new tab)`}
      className={`inline-flex items-center gap-1 whitespace-nowrap text-xs text-accent hover:text-accent-strong ${className}`}
    >
      Typical layouts
      <svg aria-hidden viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 4h8v8M16 4 5 15" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

export function ModelChip({ code }: { code: string }) {
  return (
    <span className="tabular inline-flex min-w-11 justify-center rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent-strong">
      {code}
    </span>
  );
}
