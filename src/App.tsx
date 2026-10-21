import { useCallback, useEffect, useMemo, useState } from "react";
import { BatchPanel } from "./components/BatchPanel";
import { BlockCard } from "./components/BlockCard";
import { Footer } from "./components/Footer";
import { MapView } from "./components/MapView";
import { SearchBox } from "./components/SearchBox";
import type { Block } from "./lib/blocks";
import type { BlockIndex } from "./lib/search";
import { useData } from "./lib/useData";

type Tab = "single" | "batch";

/** The URL hash remembers the open block (#730001 or #1|MARSILING DR) so a lookup can be shared. */
function blockFromHash(index: BlockIndex): Block | null {
  let raw: string;
  try {
    raw = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return null; // malformed link
  }
  if (!raw) return null;
  return index.byPostal.get(raw) ?? index.byKey.get(raw) ?? null;
}

function SingleLookup({ index }: { index: BlockIndex }) {
  const [block, setBlock] = useState<Block | null>(() => blockFromHash(index));
  const mapBlocks = useMemo(() => (block ? [block] : []), [block]);

  const select = useCallback((b: Block) => {
    setBlock(b);
    history.replaceState(null, "", `#${encodeURIComponent(b.postal ?? b.id)}`);
  }, []);

  useEffect(() => {
    const onHash = () => setBlock(blockFromHash(index));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [index]);

  return (
    <div className="space-y-6">
      <SearchBox index={index} onSelect={select} />
      {block ? (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <BlockCard block={block} />
          {block.lat != null ? (
            <MapView blocks={mapBlocks} selectedId={block.id} className="h-72 lg:h-full lg:min-h-[420px]" />
          ) : (
            <p className="text-sm text-muted">No map location for this block.</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">
          Try <button className="text-accent hover:text-accent-strong" onClick={() => { const b = index.byPostal.get("730001"); if (b) select(b); }}>730001</button>{" "}
          or type a street name such as “Marsiling Rd”.
        </p>
      )}
    </div>
  );
}

export default function App() {
  const data = useData();
  const [tab, setTab] = useState<Tab>("single");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-5xl px-4 pb-8 pt-12 sm:px-6 sm:pt-16">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-accent">HDB Flat Mix</p>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          How many of each flat type are in an HDB block?
        </h1>
        <p className="mt-3 max-w-2xl text-ink-2">
          Look up one block by postal code or address, or pull a whole estate into a table you can sort, map and
          download.
        </p>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6">
        <nav role="tablist" aria-label="Lookup mode" className="mb-6 flex gap-6 border-b border-line text-sm">
          {(
            [
              ["single", "Single block"],
              ["batch", "Batch & estate"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 pb-3 ${tab === key ? "border-accent font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {data.status === "loading" && <p className="py-10 text-sm text-muted">Loading block data…</p>}
        {data.status === "error" && (
          <p role="alert" className="rounded-lg border border-line bg-surface p-4 text-sm">
            Sorry, the block data could not be loaded. {data.message}
          </p>
        )}
        {data.status === "ready" && (
          <>
            <div hidden={tab !== "single"}>
              <SingleLookup index={data.index} />
            </div>
            <div hidden={tab !== "batch"}>
              <BatchPanel index={data.index} />
            </div>
          </>
        )}
      </main>

      <Footer meta={data.status === "ready" ? data.meta : null} />
    </div>
  );
}
