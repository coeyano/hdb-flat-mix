import { useId, useMemo, useState } from "react";
import type { Block } from "../lib/blocks";
import { townName } from "../lib/flatTypes";
import { formatAddress } from "../lib/format";
import { type BlockIndex, searchBlocks } from "../lib/search";

interface Props {
  index: BlockIndex;
  onSelect: (block: Block) => void;
}

export function SearchBox({ index, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  const results = useMemo(() => searchBlocks(index, query), [index, query]);
  const showList = open && query.trim().length > 0;

  const choose = (block: Block) => {
    onSelect(block);
    setQuery(formatAddress(block.blk, block.street).replace(/^Blk /, ""));
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results.length) {
      e.preventDefault();
      choose(results[Math.min(active, results.length - 1)]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Postal code or block and street
      </label>
      <div className="flex items-center rounded-xl border border-line bg-surface px-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] focus-within:border-accent">
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" strokeLinecap="round" />
        </svg>
        <input
          id={`${listId}-input`}
          type="search"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Postal code or block + street"
          className="w-full bg-transparent px-3 py-3.5 text-base outline-none placeholder:text-muted"
          value={query}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results.length ? `${listId}-${active}` : undefined}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-[1100] mt-2 w-full overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg"
        >
          {results.length === 0 && <li className="px-4 py-3 text-sm text-muted">No HDB block matches “{query}”.</li>}
          {results.map((b, i) => (
            <li
              key={b.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-4 py-2.5 text-sm ${i === active ? "bg-accent-soft" : ""}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(b);
              }}
            >
              <span className="font-medium">{formatAddress(b.blk, b.street)}</span>
              <span className="tabular shrink-0 text-xs text-muted">
                {townName(b.town)}
                {b.postal && ` · ${b.postal}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
