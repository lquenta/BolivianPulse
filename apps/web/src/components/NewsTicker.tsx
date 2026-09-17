"use client";

import { useEffect, useMemo, useState } from "react";
import type { TickerItem } from "@bo-dash/shared";
import { RelativeTime } from "@/hooks/useClientTime";

const FEATURED_LIMIT = 8;

function FeaturedThumb({ item }: { item: TickerItem }) {
  const [broken, setBroken] = useState(false);
  const showImg = Boolean(item.imageUrl) && !broken;

  return (
    <div className={`destacado-block__thumb domain-thumb--${item.domain}`} aria-hidden>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="destacado-block__thumb-fallback">
          {item.domain.slice(0, 3).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export function NewsTicker({ items }: { items: TickerItem[] }) {
  const safe = useMemo(() => (items.length ? items : []), [items]);
  const breaking = useMemo(
    () => safe.filter((t) => t.urgency === "breaking"),
    [safe]
  );
  const featured = useMemo(() => {
    const ranked = [
      ...breaking,
      ...safe.filter((t) => t.urgency !== "breaking"),
    ];
    const seen = new Set<string>();
    const out: TickerItem[] = [];
    for (const item of ranked) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
      if (out.length >= FEATURED_LIMIT) break;
    }
    return out;
  }, [safe, breaking]);

  const featuredKey = useMemo(() => featured.map((f) => f.id).join("|"), [featured]);

  const [paused, setPaused] = useState(false);
  const [featIdx, setFeatIdx] = useState(0);
  const [breakIdx, setBreakIdx] = useState(0);
  const doubled = useMemo(() => [...safe, ...safe], [safe]);
  const current = featured[featIdx] ?? featured[0];
  const breakItem = breaking[breakIdx] ?? breaking[0];

  useEffect(() => {
    setFeatIdx(0);
  }, [featuredKey]);

  useEffect(() => {
    if (paused || featured.length <= 1) return;
    const id = setInterval(
      () => setFeatIdx((i) => (i + 1) % featured.length),
      9000
    );
    return () => clearInterval(id);
  }, [paused, featured.length]);

  useEffect(() => {
    if (paused || breaking.length <= 1) return;
    const id = setInterval(
      () => setBreakIdx((i) => (i + 1) % breaking.length),
      12000
    );
    return () => clearInterval(id);
  }, [paused, breaking.length]);

  const goPrev = () => {
    if (!featured.length) return;
    setFeatIdx((i) => (i - 1 + featured.length) % featured.length);
  };
  const goNext = () => {
    if (!featured.length) return;
    setFeatIdx((i) => (i + 1) % featured.length);
  };

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

        {current && (
          <div className="destacado-block">
            <div className="destacado-block__main">
              <FeaturedThumb item={current} />
              <div className="destacado-block__body">
                <div className="destacado-block__meta-row">
                  <span className="destacado-block__badge">Destacado</span>
                  <span className={`domain-pill domain-pill--${current.domain}`}>
                    {current.domain}
                  </span>
                  <span className="text-[0.7rem] text-[var(--muted)]">
                    {featIdx + 1}/{featured.length}
                  </span>
                </div>
                <a
                  href={current.sourceUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="no-underline transition hover:opacity-90"
                >
                  <div className="destacado-block__title line-clamp-2">{current.title}</div>
                  {current.summary && (
                    <p className="destacado-block__summary line-clamp-2">{current.summary}</p>
                  )}
                  <div className="mt-1.5 text-xs text-[var(--muted)]">
                    {current.source} · <RelativeTime iso={current.occurredAt} />
                  </div>
                </a>
              </div>
            </div>

            <div className="destacado-block__controls">
              <button
                type="button"
                className="destacado-nav"
                onClick={goPrev}
                aria-label="Destacado anterior"
                disabled={featured.length <= 1}
              >
                ‹
              </button>
              <div className="destacado-dots" role="tablist" aria-label="Destacados">
                {featured.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={i === featIdx}
                    className={`destacado-dot ${i === featIdx ? "is-active" : ""}`}
                    onClick={() => setFeatIdx(i)}
                    aria-label={`Ir al destacado ${i + 1}`}
                  />
                ))}
              </div>
              <button
                type="button"
                className="destacado-nav"
                onClick={goNext}
                aria-label="Siguiente destacado"
                disabled={featured.length <= 1}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
