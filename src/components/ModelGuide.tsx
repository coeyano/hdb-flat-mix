import { useMemo } from "react";
import type { Block } from "../lib/blocks";
import { FLAT_TYPES } from "../lib/flatTypes";
import { fmt } from "../lib/format";
import { buildModelGuide } from "../lib/models";
import { ModelChip } from "./BlockCard";
import { FLOOR_PLAN_SERVICE_URL } from "./FloorPlans";

const range = (a: number, b: number, unit = "") => (a === b ? `${a}${unit}` : `${a}–${b}${unit}`);

/** Reference table of every flat model, summarised from the blocks that have it. */
export function ModelGuide({ blocks }: { blocks: readonly Block[] }) {
  const guide = useMemo(() => buildModelGuide(blocks), [blocks]);

  return (
    <div className="space-y-6">
      <div className="max-w-2xl space-y-3 text-sm leading-relaxed text-ink-2">
        <p>
          HDB has built each flat type to a series of standard designs, called <strong className="font-medium text-ink">flat
          models</strong>. Agents often shorten them to a code: <ModelChip code="3NG" /> is a 3-room New Generation flat,{" "}
          <ModelChip code="4A" /> a 4-room Model A, <ModelChip code="EM" /> an Executive Maisonette.
        </p>
        <p>
          The table below is worked out from HDB’s resale records since 1990: which blocks each model appears in, those
          blocks’ completion years, and the floor areas sold. Ranges show the middle 80% of blocks, so the odd outlier is
          left out.
        </p>
        <p>
          For the actual layout of a model, buy a plan of one flat from{" "}
          <a href={FLOOR_PLAN_SERVICE_URL} target="_blank" rel="noopener" className="text-accent hover:text-accent-strong">
            HDB’s floor plan service
          </a>{" "}
          (about S$5).
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th scope="col" className="px-4 py-2.5 font-medium">Code</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Flat type</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Model</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Typical floor area</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Mostly built</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Blocks</th>
            </tr>
          </thead>
          <tbody>
            {guide.map((g) => (
              <tr key={g.key} className="border-b border-line last:border-0">
                <td className="px-4 py-2">{g.label.code ? <ModelChip code={g.label.code} /> : <span className="text-[#c3c2b7]">—</span>}</td>
                <td className="whitespace-nowrap px-3 py-2 text-ink-2">{FLAT_TYPES[g.type].label}</td>
                <td className="whitespace-nowrap px-3 py-2 font-medium">{g.label.name}</td>
                <td className="tabular whitespace-nowrap px-3 py-2 text-right">
                  {g.areaMedian} m² <span className="text-muted">({range(g.areaLow, g.areaHigh)})</span>
                </td>
                <td className="tabular whitespace-nowrap px-3 py-2 text-right">{range(g.yearFrom, g.yearTo)}</td>
                <td className="tabular px-4 py-2 text-right">{fmt(g.blocks)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
