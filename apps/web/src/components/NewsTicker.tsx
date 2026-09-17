"use client";

import { useEffect, useMemo, useState } from "react";
import type { TickerItem } from "@bo-dash/shared";
import { RelativeTime } from "@/hooks/useClientTime";

export function NewsTicker({ items }: { items: TickerItem[] }) {
  const safe = useMemo(() => (items.length ? items : []), [items]);
  const [paused, setPaused] = useState(false);
  const [idx, setIdx] = useState(0);
  const doubled = useMemo(() => [...safe, ...safe], [safe]);
  const current = safe[idx];

  useEffect(() => {
    if (paused || safe.length === 0) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % safe.length), 28000);
    return () => clearInterval(id);
  }, [paused, safe.length]);

  if (!safe.length) {
    return (
      <div className="panel px-4 py-3 text-sm text-[var(--muted)]">Esperando titulares…</div>
    );
  }

  return (
    <div className="space-y-2 section-enter">
      <div
        className="panel overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-3 py-2 sm:px-4">
          <span className="live-badge">En vivo</span>
          <span className="text-xs text-[var(--muted)]">
            {safe.length} titulares · cartelero
          </span>
          <button
            type="button"
            className="btn ml-auto !px-2.5 !py-1"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "Reanudar" : "Pausar"}
          </button>
        </div>

        <div className="ticker-shell py-2.5">
          <div className={`ticker-track gap-8 px-4 ${paused ? "paused" : ""}`}>
            {doubled.map((item, i) => (
              <a
                key={`${item.id}-${i}`}
                href={item.sourceUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className={`ticker-item inline-flex shrink-0 items-baseline gap-2.5 text-sm no-underline ${item.urgency}`}
              >
                <span className="text-[0.62rem] uppercase tracking-[0.12em] text-[var(--faint)]">
                  {item.domain}
                </span>
                <span className="font-medium tracking-tight">{item.title}</span>
                <span className="text-xs text-[var(--muted)]">
                  {item.source} · <RelativeTime iso={item.occurredAt} />
                </span>
                <span className="text-[var(--faint)]">|</span>
              </a>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3 border-t border-[var(--line)] bg-[var(--bg-elev)]/35 px-3 py-2.5 sm:px-4">
          <span className="mt-0.5 shrink-0 rounded bg-[var(--accent-soft)] px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
            Destacado
          </span>
          <a
            href={current?.sourceUrl || "#"}
            target="_blank"
            rel="noreferrer"
            className={`min-w-0 flex-1 text-sm leading-snug no-underline transition hover:text-[var(--accent)] ${current?.urgency ?? ""}`}
          >
            <span className="line-clamp-2 font-medium">{current?.title}</span>
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              {current?.source} · <RelativeTime iso={current?.occurredAt} />
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
