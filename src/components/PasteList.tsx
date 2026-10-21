import { useState } from "react";
import { formatAddress } from "../lib/format";
import { type BlockIndex, parseBatchInput, resolveEntry, type ResolvedEntry } from "../lib/search";

interface Props {
  index: BlockIndex;
  entries: readonly ResolvedEntry[];
  onResolve: (entries: ResolvedEntry[]) => void;
}

const EXAMPLE = "730001\n730010\n2 Marsiling Drive\nBlk 3 Marsiling Rd\n13 Marsiling Lane";

export function PasteList({ index, entries, onResolve }: Props) {
  const [text, setText] = useState("");
  const run = (value = text) => onResolve(parseBatchInput(value).map((line) => resolveEntry(index, line)));

  const missing = entries.filter((e) => e.status === "not-found");
  const closest = entries.filter((e) => e.status === "closest");

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="paste" className="mb-1.5 block text-xs font-medium text-ink-2">
          One postal code or block + street per line
        </label>
        <textarea
          id="paste"
          rows={6}
          spellCheck={false}
          placeholder={EXAMPLE}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => run()}
          disabled={!text.trim()}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-40"
        >
          Look up {parseBatchInput(text).length || ""} {parseBatchInput(text).length === 1 ? "entry" : "entries"}
        </button>
        <button
          type="button"
          className="text-sm text-ink-2 hover:text-ink"
          onClick={() => {
            setText(EXAMPLE);
            run(EXAMPLE);
          }}
        >
          Try an example
        </button>
      </div>

      {entries.length > 0 && (
        <div className="space-y-2 text-sm">
          <p className="text-ink-2">
            Found <strong className="font-medium text-ink">{entries.length - missing.length}</strong> of {entries.length}.
          </p>
          {missing.length > 0 && (
            <div className="rounded-lg border border-line bg-plane px-3 py-2">
              <p className="mb-1 text-xs font-medium text-ink-2">Not found — check the spelling, or it may not be an HDB residential block:</p>
              <ul className="font-mono text-xs text-ink-2">
                {missing.map((e, i) => (
                  <li key={i}>{e.input}</li>
                ))}
              </ul>
            </div>
          )}
          {closest.length > 0 && (
            <div className="rounded-lg border border-line bg-plane px-3 py-2">
              <p className="mb-1 text-xs font-medium text-ink-2">Matched to the closest address — please check:</p>
              <ul className="text-xs text-ink-2">
                {closest.map((e, i) => (
                  <li key={i}>
                    <span className="font-mono">{e.input}</span> → {formatAddress(e.block!.blk, e.block!.street)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
