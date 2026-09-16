"use client";

import { useMemo, useState } from "react";
import type { Domain, EventItem } from "@bo-dash/shared";
import { RelativeTime } from "@/hooks/useClientTime";

const DOMAINS: Array<Domain | "todos"> = [
  "todos",
  "economia",
  "politica",
  "seguridad",
  "sociedad",
  "clima",
  "infra",
  "media",
];

export function EventsFeed({ events }: { events: EventItem[] }) {
  const [filter, setFilter] = useState<(typeof DOMAINS)[number]>("todos");
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return events
      .filter((e) => filter === "todos" || e.domain === filter)
      .filter(
        (e) =>
          !query ||
          e.title.toLowerCase().includes(query) ||
          e.source.toLowerCase().includes(query)
      )
      .slice(0, 50);
  }, [events, filter, q]);

  return (
    <section className="panel flex max-h-[560px] flex-col p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="panel-title mb-0">Feed · últimas 12h</h2>
        <span className="text-xs text-[var(--muted)]">{filtered.length} ítems</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {DOMAINS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setFilter(d)}
            className={`chip ${filter === d ? "active" : ""}`}
          >
            {d}
          </button>
        ))}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar en titulares…"
        className="mb-3 w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)] focus:border-[var(--accent)]/50"
      />

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {filtered.map((ev) => (
          <a key={ev.id} href={ev.sourceUrl || "#"} target="_blank" rel="noreferrer" className="feed-item">
            <div className="mb-1 flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.08em] text-[var(--muted)]">
              <span className={`domain-dot domain-${ev.domain}`} />
              <span>{ev.domain}</span>
              <span className="text-[var(--faint)]">·</span>
              <span className="truncate">{ev.source}</span>
              <span className="ml-auto tabular-nums text-[var(--faint)]">
                <RelativeTime iso={ev.occurredAt} />
              </span>
            </div>
            <div className="text-sm font-medium leading-snug tracking-tight">{ev.title}</div>
            {ev.summary && (
              <div className="mt-1 line-clamp-2 text-[0.72rem] leading-snug text-[var(--muted)]">
                {ev.summary}
              </div>
            )}
          </a>
        ))}
        {!filtered.length && (
          <div className="py-8 text-center text-sm text-[var(--muted)]">Sin coincidencias.</div>
        )}
      </div>
    </section>
  );
}
