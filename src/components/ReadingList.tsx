import { READING_LIST, type LinkStatus } from "../lib/readingList";

const STATUS_NOTE: Record<LinkStatus, string | null> = {
  live: null,
  moved: null,
  archived: "Archived copy: no longer on the publisher’s site",
};

export function ReadingList() {
  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-sm leading-relaxed text-ink-2">
        Public sources on how HDB towns are planned, renewed and lived in, grouped by topic. Pages that agencies have
        since moved link to their current address; pages no longer online open an Internet Archive copy.
      </p>
      <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
        {READING_LIST.map((section) => (
          <section key={section.topic}>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">{section.topic}</h2>
            <ul className="space-y-4">
              {section.items.map((item) => (
                <li key={item.url}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener"
                    className="group inline-flex items-baseline gap-1.5 font-medium text-ink hover:text-accent"
                  >
                    {item.title}
                    <svg aria-hidden viewBox="0 0 20 20" className="h-3 w-3 shrink-0 text-muted group-hover:text-accent" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 4h8v8M16 4 5 15" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-2">
                    <span className="text-muted">{item.publisher} · </span>
                    {item.summary}
                  </p>
                  {STATUS_NOTE[item.status] && <p className="mt-0.5 text-xs text-muted">{STATUS_NOTE[item.status]}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
