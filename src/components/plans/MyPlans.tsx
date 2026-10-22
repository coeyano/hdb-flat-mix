import type { Block } from "../../lib/blocks";
import { FLAT_TYPES } from "../../lib/flatTypes";
import { formatAddress } from "../../lib/format";
import { labelModel } from "../../lib/models";
import { useAllPlans } from "../../lib/plans/usePlans";
import type { BlockIndex } from "../../lib/search";

const slotLabel = (slot: string) => {
  const [type, model] = slot.split("|");
  const t = Number(type);
  if (!model) return FLAT_TYPES[t]?.label ?? "";
  const l = labelModel(t, model);
  return l.code ? `${l.code} ${l.name}` : l.short;
};

/** Every plan saved on this device, so students can jump back to the block it belongs to. */
export function MyPlans({ index, onOpen }: { index: BlockIndex; onOpen: (b: Block) => void }) {
  const { plans } = useAllPlans();
  if (!plans.length) return null;

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold">Your saved floor plans</h2>
      <p className="mt-1 text-xs text-muted">Saved only in this browser on this device. They are never uploaded.</p>
      <ul className="mt-3 divide-y divide-line text-sm">
        {plans.map((p) => {
          const block = index.byKey.get(p.blockId);
          const [blk, street] = p.blockId.split("|");
          return (
            <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2">
              <button
                type="button"
                disabled={!block}
                onClick={() => block && onOpen(block)}
                className="text-left font-medium hover:text-accent disabled:text-ink-2"
              >
                {formatAddress(blk, street ?? "")}
                <span className="font-normal text-ink-2"> · {slotLabel(p.slot)}</span>
              </button>
              <span className="truncate text-xs text-muted">{p.name}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
