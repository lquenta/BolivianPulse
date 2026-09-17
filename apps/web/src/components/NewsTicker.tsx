"use client";

import { useEffect, useMemo, useState } from "react";
import type { TickerItem } from "@bo-dash/shared";
import { RelativeTime } from "@/hooks/useClientTime";

export function NewsTicker({ items }: { items: TickerItem[] }) {
  const safe = useMemo(() => (items.length ? items : []), [items]);
  const breaking = useMemo(
    () => safe.filter((t) => t.urgency === "breaking"),
    [safe]
  );
  const [paused, setPaused] = useState(false);
  const [idx, setIdx] = useState(0);
  const [breakIdx, setBreakIdx] = useState(0);
  const doubled = useMemo(() => [...safe, ...safe], [safe]);
  const current = safe[idx] ?? breaking[0];
  const breakItem = breaking[breakIdx] ?? breaking[0];

  useEffect(() => {
    if (paused || safe.length === 0) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % safe.length), 28000);
    return () => clearInterval(id);
  }, [paused, safe.length]);

  useEffect(() => {
    if (paused || breaking.length <= 1) return;
    const id = setInterval(
      () => setBreakIdx((i) => (i + 1) % breaking.length),
      12000
    );
    return () => clearInterval(id);
  }, [paused, breaking.length]);

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
        {breakItem && (
          <div className="breaking-strip">
            <span className="breaking-strip__label">Breaking</span>
            <a
              href={breakItem.sourceUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className="breaking-strip__text line-clamp-1 no-underline"
            >
              {breakItem.title}
              <span className="ml-2 font-normal text-[var(--muted)]">
                · {breakItem.source}
              </span>
            </a>
          </div>
        )}

        <div className="flex items-center gap-3 border-b border-[var(--line)] px-3 py-2 sm:px-4">
          <span className="live-badge">En vivo</span>
          <span className="text-xs text-[var(--muted)]">
            {safe.length} titulares
            {breaking.length ? ` · ${breaking.length} breaking` : ""}
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
                className={`ticker-item inline-flex shrink-0 items-center gap-2.5 text-sm no-underline ${item.urgency}`}
              >
                <span className={`domain-pill domain-pill--${item.domain}`}>
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

        <div className="destacado-block">
          <span className="destacado-block__badge">Destacado</span>
          <a
            href={current?.sourceUrl || "#"}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 no-underline transition hover:opacity-90"
          >
            <div className="destacado-block__title line-clamp-2">{current?.title}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              {current && (
                <span className={`domain-pill domain-pill--${current.domain}`}>
                  {current.domain}
                </span>
              )}
              <span>
                {current?.source} · <RelativeTime iso={current?.occurredAt} />
              </span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
