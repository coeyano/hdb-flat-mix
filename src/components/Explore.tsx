import { useCallback, useEffect, useRef, useState } from "react";
import type { Block } from "../lib/blocks";
import { townName } from "../lib/flatTypes";
import { fmt, formatAddress } from "../lib/format";
import type { BlockIndex } from "../lib/search";
import { BlockCard } from "./BlockCard";
import { useColourBy } from "../lib/useColourBy";
import { BlockMap } from "./BlockMap";
import { MyPlans } from "./plans/MyPlans";
import { SearchBox } from "./SearchBox";

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

function EmptyState({ onExample }: { onExample: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface p-6 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">Pick a block</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">
        Every dot on the map is an HDB block. Click one to see how many of each flat type it has, its flat models and
        HDB’s typical floor plans. Or search by postal code or address.
      </p>
      <p className="mt-4 text-sm text-ink-2">
        Try{" "}
        <button type="button" onClick={onExample} className="font-medium text-accent hover:text-accent-strong">
          Blk 1 Marsiling Dr (730001)
        </button>
        , a 1973 block of 3-room Improved flats.
      </p>
    </div>
  );
}

/** Map-first lookup: click a block on the map or search for it, and its card opens alongside. */
export function Explore({ index }: { index: BlockIndex }) {
  const [block, setBlock] = useState<Block | null>(() => blockFromHash(index));
  const [colourBy, setColourBy] = useColourBy();
  const [focusKey, setFocusKey] = useState(0);
  const details = useRef<HTMLDivElement>(null);

  const select = useCallback((b: Block) => {
    setBlock(b);
    setFocusKey((k) => k + 1); // re-centre even when the same block is chosen again
    history.replaceState(null, "", `#${encodeURIComponent(b.postal ?? b.id)}`);
  }, []);

  useEffect(() => {
    const onHash = () => setBlock(blockFromHash(index));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [index]);

  const showDetails = () => details.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-3 lg:sticky lg:top-4">
        <SearchBox index={index} onSelect={select} selected={block} />
        <div className="h-[56vh] min-h-[340px] lg:h-[calc(100vh-9.5rem)] lg:max-h-[780px]">
          <BlockMap
            blocks={index.blocks}
            selected={block}
            onSelect={select}
            colourBy={colourBy}
            onColourByChange={setColourBy}
            focusKey={focusKey}
          />
        </div>
        {block && (
          <button
            type="button"
            onClick={showDetails}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left lg:hidden"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{formatAddress(block.blk, block.street)}</span>
              <span className="block truncate text-xs text-muted">
                {townName(block.town)} · {block.year || "—"} · {fmt(block.units)} units
              </span>
            </span>
            <span className="shrink-0 text-sm font-medium text-accent">Details ↓</span>
          </button>
        )}
      </div>

      <div ref={details} className="scroll-mt-4 space-y-6">
        {block ? (
          <BlockCard block={block} />
        ) : (
          <EmptyState
            onExample={() => {
              const b = index.byPostal.get("730001");
              if (b) select(b);
            }}
          />
        )}
        <MyPlans
          index={index}
          onOpen={(b) => {
            select(b);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    </div>
  );
}
