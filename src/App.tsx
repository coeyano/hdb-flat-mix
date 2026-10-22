import { useState } from "react";
import { BatchPanel } from "./components/BatchPanel";
import { Explore } from "./components/Explore";
import { Footer } from "./components/Footer";
import { ModelGuide } from "./components/ModelGuide";
import { ReadingList } from "./components/ReadingList";
import { useData } from "./lib/useData";

type Tab = "explore" | "batch" | "models" | "reading";

const TABS: readonly [Tab, string][] = [
  ["explore", "Explore"],
  ["batch", "Batch & estate"],
  ["models", "Flat models"],
  ["reading", "Reading list"],
];

export default function App() {
  const data = useData();
  const [tab, setTab] = useState<Tab>("explore");

  // Left/right arrows move between tabs, as screen-reader users expect.
  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = TABS.findIndex(([k]) => k === tab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0];
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-6xl px-4 pb-6 pt-8 sm:px-6 sm:pt-10">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-accent">HDB Flat Mix</p>
        <h1 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
          The flat types, models and plans of every HDB block
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-2 sm:text-base">
          Click a block on the map or search for it, or pull a whole estate into a table you can sort, map and
          download.
        </p>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        <div
          role="tablist"
          aria-label="Sections"
          onKeyDown={onTabKey}
          className="mb-5 flex gap-5 overflow-x-auto overflow-y-hidden border-b border-line text-sm sm:gap-7"
        >
          {TABS.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              id={`tab-${key}`}
              aria-controls={`panel-${key}`}
              aria-selected={tab === key}
              tabIndex={tab === key ? 0 : -1}
              onClick={() => setTab(key)}
              className={`-mb-px shrink-0 border-b-2 pb-3 ${tab === key ? "border-accent font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {data.status === "loading" && <p className="py-10 text-sm text-muted">Loading block data…</p>}
        {data.status === "error" && (
          <p role="alert" className="rounded-lg border border-line bg-surface p-4 text-sm">
            Sorry, the block data could not be loaded. {data.message}
          </p>
        )}
        {data.status === "ready" && (
          <>
            <div role="tabpanel" id="panel-explore" aria-labelledby="tab-explore" hidden={tab !== "explore"}>
              <Explore index={data.index} />
            </div>
            <div role="tabpanel" id="panel-batch" aria-labelledby="tab-batch" hidden={tab !== "batch"}>
              <BatchPanel index={data.index} />
            </div>
            <div role="tabpanel" id="panel-models" aria-labelledby="tab-models" hidden={tab !== "models"}>
              <ModelGuide blocks={data.blocks} />
            </div>
            <div role="tabpanel" id="panel-reading" aria-labelledby="tab-reading" hidden={tab !== "reading"}>
              <ReadingList />
            </div>
          </>
        )}
      </main>

      <Footer meta={data.status === "ready" ? data.meta : null} />
    </div>
  );
}
