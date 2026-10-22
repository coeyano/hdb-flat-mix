import { formatDate } from "../lib/format";
import type { DataMeta } from "../lib/useData";

export function Footer({ meta }: { meta: DataMeta | null }) {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 text-sm text-ink-2 sm:grid-cols-2 sm:px-6">
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">About this data</h2>
          <ul className="space-y-2 leading-relaxed">
            <li>
              Shows the <strong className="font-medium text-ink">number</strong> of each flat type in a block. It does{" "}
              <strong className="font-medium text-ink">not</strong> show unit floor plans or layouts.
            </li>
            <li>
              Flat models and floor areas come from HDB resale records since 1990. They show which models a block has,
              not how many units of each, and are missing for blocks that have never been resold.
            </li>
            <li>
              Floor plans you attach are saved only in your browser on your device. They are never uploaded or shared.
              Clearing this site’s data removes them, and Safari may clear them after a few weeks without a visit, so
              keep your original files.
            </li>
            <li>Covers HDB residential blocks only. Private condominiums, ECs and landed homes are not included.</li>
            <li>
              Counts follow HDB’s published dataset, which may lag recent completions, redevelopment (e.g. SERS) and
              conversions.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Sources</h2>
          <ul className="space-y-2 leading-relaxed">
            {meta?.sources.map((s) => (
              <li key={s.id}>
                <a href={s.pageUrl} target="_blank" rel="noopener" className="text-ink underline decoration-line underline-offset-4 hover:decoration-accent">
                  {s.name}
                </a>{" "}
                <span className="text-muted">— Housing &amp; Development Board via data.gov.sg, last updated {formatDate(s.lastUpdatedAt)}</span>
              </li>
            ))}
            <li>
              <a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener" className="text-ink underline decoration-line underline-offset-4 hover:decoration-accent">
                OneMap
              </a>{" "}
              <span className="text-muted">— Singapore Land Authority: base map, and street names for postal codes</span>
            </li>
            <li>
              <a href="https://services2.hdb.gov.sg/webapp/BC31ISOP2/BC31SMain" target="_blank" rel="noopener" className="text-ink underline decoration-line underline-offset-4 hover:decoration-accent">
                HDB floor plan service
              </a>{" "}
              <span className="text-muted">— official floor plans, sold per flat (not included in this app)</span>
            </li>
            {meta && (
              <li className="text-muted">
                Data compiled {formatDate(meta.generatedAt)} · {meta.locatedBlocks.toLocaleString("en-SG")} of{" "}
                {meta.residentialBlocks.toLocaleString("en-SG")} blocks matched to a postal code.
              </li>
            )}
          </ul>
        </section>
      </div>
    </footer>
  );
}
