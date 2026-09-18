"use client";

import { useEffect, useMemo, useState } from "react";
import {
  displayHeadline,
  isRedundantSummary,
  type TickerItem,
} from "@bo-dash/shared";
import { RelativeTime } from "@/hooks/useClientTime";

const FEATURED_LIMIT = 8;

function FeaturedThumb({ item }: { item: TickerItem }) {
  const [broken, setBroken] = useState(false);
  const showImg = Boolean(item.imageUrl) && !broken;
  if (!showImg) return null;

  return (
    <div className={`destacado-block__thumb domain-thumb--${item.domain}`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.imageUrl}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    </div>
  );
}

function useFeatured(items: TickerItem[]) {
  const safe = useMemo(() => (items.length ? items : []), [items]);
  const breaking = useMemo(
    () => safe.filter((t) => t.urgency === "breaking"),
    [safe]
  );
  const featured = useMemo(() => {
    const ranked = [
      ...breaking.filter((t) => t.imageUrl),
      ...safe.filter((t) => t.urgency !== "breaking" && t.imageUrl),
      ...breaking.filter((t) => !t.imageUrl),
      ...safe.filter((t) => t.urgency !== "breaking" && !t.imageUrl),
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
  return { safe, breaking, featured };
}

export function FeaturedPanel({ items }: { items: TickerItem[] }) {
  const { featured } = useFeatured(items);
  const featuredKey = useMemo(() => featured.map((f) => f.id).join("|"), [featured]);
  const [featIdx, setFeatIdx] = useState(0);
  const current = featured[featIdx] ?? featured[0];

  useEffect(() => {
    setFeatIdx(0);
  }, [featuredKey]);

  useEffect(() => {
    if (featured.length <= 1) return;
    const id = setInterval(() => setFeatIdx((i) => (i + 1) % featured.length), 9000);
    return () => clearInterval(id);
  }, [featured.length]);

  if (!current) {
    return (
      <div className="ops-panel ops-dock__section text-sm text-[var(--muted)]">
        Esperando destacados…
      </div>
    );
  }

  const title = displayHeadline(current.title);
  const summary =
    current.summary && !isRedundantSummary(current.title, current.summary)
      ? current.summary
      : undefined;

  return (
    <div className="ops-panel ops-dock__section">
      <div className="ops-dock__head">
        <h2 className="ops-dock__title">Destacado</h2>
        <span className="text-[0.65rem] text-[var(--muted)]">
          {featIdx + 1}/{featured.length}
        </span>
      </div>
      <div className="destacado-block__main">
        <div className="destacado-block__body">
          <div className="destacado-block__meta-row">
            <span className={`domain-pill domain-pill--${current.domain}`}>
              {current.domain}
            </span>
          </div>
          <a
            href={current.sourceUrl || "#"}
            target="_blank"
            rel="noreferrer"
            className="no-underline transition hover:opacity-90"
          >
            <div className="destacado-block__title line-clamp-2">{title}</div>
            {summary && (
              <p className="destacado-block__summary line-clamp-2">{summary}</p>
            )}
            <div className="mt-1.5 text-xs text-[var(--muted)]">
              {current.source} · <RelativeTime iso={current.occurredAt} />
            </div>
          </a>
        </div>
        <FeaturedThumb item={current} />
      </div>
      <div className="destacado-block__controls mt-2">
        <button
          type="button"
          className="destacado-nav"
          onClick={() =>
            setFeatIdx((i) => (i - 1 + featured.length) % featured.length)
          }
          disabled={featured.length <= 1}
        >
          ‹
        </button>
        <div className="destacado-dots">
          {featured.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className={`destacado-dot ${i === featIdx ? "is-active" : ""}`}
              onClick={() => setFeatIdx(i)}
              aria-label={`Ir al destacado ${i + 1}`}
            />
          ))}
        </div>
        <button
          type="button"
          className="destacado-nav"
          onClick={() => setFeatIdx((i) => (i + 1) % featured.length)}
          disabled={featured.length <= 1}
        >
          ›
        </button>
      </div>
    </div>
  );
}

export function TickerStrip({ items }: { items: TickerItem[] }) {
  const { safe, breaking } = useFeatured(items);
  const [paused, setPaused] = useState(false);
  const [breakIdx, setBreakIdx] = useState(0);
  const doubled = useMemo(() => [...safe, ...safe], [safe]);
  const breakItem = breaking[breakIdx] ?? breaking[0];

  useEffect(() => {
    if (paused || breaking.length <= 1) return;
    const id = setInterval(() => setBreakIdx((i) => (i + 1) % breaking.length), 12000);
    return () => clearInterval(id);
  }, [paused, breaking.length]);

  if (!safe.length) return null;

  return (
    <div
      className="ops-ticker"
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
            {displayHeadline(breakItem.title)}
            <span className="ml-2 font-normal text-[var(--muted)]">
              · {breakItem.source}
            </span>
          </a>
        </div>
      )}
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-3 py-1.5">
        <span className="ops-live-badge">En vivo</span>
        <span className="text-xs text-[var(--muted)]">{safe.length} titulares</span>
        <button
          type="button"
          className="btn ml-auto !px-2 !py-0.5"
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? "Reanudar" : "Pausar"}
        </button>
      </div>
      <div className="ticker-shell py-2">
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
              <span className="font-medium tracking-tight">
                {displayHeadline(item.title)}
              </span>
              <span className="text-xs text-[var(--muted)]">
                {item.source} · <RelativeTime iso={item.occurredAt} />
              </span>
              <span className="text-[var(--faint)]">|</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Legacy full ticker+featured block (kept for compatibility). */
export function NewsTicker({ items }: { items: TickerItem[] }) {
  return (
    <div className="space-y-2">
      <FeaturedPanel items={items} />
      <TickerStrip items={items} />
    </div>
  );
}
