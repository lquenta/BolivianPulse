"use client";

import { useMemo, useState } from "react";
import {
  sourceFaviconUrl,
  type Domain,
  type EventItem,
} from "@bo-dash/shared";
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

const DOMAIN_LABEL: Record<Domain | "todos", string> = {
  todos: "Todos",
  economia: "Economía",
  politica: "Política",
  seguridad: "Seguridad",
  sociedad: "Sociedad",
  clima: "Clima",
  infra: "Infra",
  media: "Media",
};

function FeedThumb({ ev }: { ev: EventItem }) {
  const [broken, setBroken] = useState(false);
  const photo = !broken ? ev.media?.thumb || ev.media?.url : undefined;
  const fav =
    !photo
      ? sourceFaviconUrl({
          source: ev.source,
          title: ev.title,
          url: ev.sourceUrl,
        })
      : undefined;
  const src = photo || fav;

  return (
    <div
      className={`feed-card__media domain-thumb--${ev.domain} ${photo ? "is-photo" : "is-favicon"}`}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        <span>{ev.domain.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}

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
          e.source.toLowerCase().includes(query) ||
          (e.summary ?? "").toLowerCase().includes(query)
      )
      .slice(0, 50);
  }, [events, filter, q]);

  const counts = useMemo(() => {
    const c: Partial<Record<Domain | "todos", number>> = { todos: events.length };
    for (const e of events) c[e.domain] = (c[e.domain] ?? 0) + 1;
    return c;
  }, [events]);

  return (
    <section className="panel feed-panel flex max-h-[560px] flex-col p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="panel-title mb-0">Feed · últimas 12h</h2>
          <p className="mt-1 text-[0.7rem] text-[var(--muted)]">
            Titulares vivos, filtrables por dominio
          </p>
        </div>
        <span className="feed-count-chip">{filtered.length} ítems</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {DOMAINS.map((d) => {
          const n = counts[d] ?? 0;
          if (d !== "todos" && n === 0) return null;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setFilter(d)}
              className={`feed-filter feed-filter--${d} ${filter === d ? "is-active" : ""}`}
            >
              {DOMAIN_LABEL[d]}
              <span className="feed-filter__n">{n}</span>
            </button>
          );
        })}
      </div>

      <label className="feed-search mb-3">
        <span className="sr-only">Buscar</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en titulares…"
          className="feed-search__input"
        />
      </label>

      <div className="feed-list min-h-0 flex-1 overflow-y-auto pr-1">
        {filtered.map((ev, i) => (
          <a
            key={ev.id}
            href={ev.sourceUrl || "#"}
            target="_blank"
            rel="noreferrer"
            className={`feed-card feed-card--${ev.domain}`}
            style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}
          >
            <FeedThumb ev={ev} />
            <div className="feed-card__body">
              <div className="feed-card__meta">
                <span className={`domain-pill domain-pill--${ev.domain}`}>
                  {ev.domain}
                </span>
                <span className="truncate text-[0.68rem] text-[var(--muted)]">
                  {ev.source.replace(/^Google News\s+/i, "")}
                </span>
                <span className="ml-auto shrink-0 tabular-nums text-[0.65rem] text-[var(--faint)]">
                  <RelativeTime iso={ev.occurredAt} />
                </span>
              </div>
              <div className="feed-card__title">{ev.title}</div>
              {ev.summary && ev.summary !== ev.title && (
                <div className="feed-card__summary line-clamp-2">{ev.summary}</div>
              )}
            </div>
          </a>
        ))}
        {!filtered.length && (
          <div className="py-10 text-center text-sm text-[var(--muted)]">Sin coincidencias.</div>
        )}
      </div>
    </section>
  );
}
