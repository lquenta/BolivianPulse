"use client";

import { useMemo } from "react";
import {
  summarizeTopics,
  type EventItem,
  type TopicIndicator,
} from "@bo-dash/shared";
import { RelativeTime } from "@/hooks/useClientTime";

function accentFor(domain: string) {
  switch (domain) {
    case "seguridad":
      return "var(--danger)";
    case "economia":
      return "var(--accent)";
    case "politica":
      return "var(--info)";
    case "clima":
      return "#6a9e8c";
    case "infra":
      return "#7d8aa3";
    default:
      return "var(--accent-2)";
  }
}

function tileSize(count: number, max: number, index: number): string {
  const ratio = max > 0 ? count / max : 0;
  if (index === 0 || ratio >= 0.85) return "pulse-tile pulse-tile--xl";
  if (index < 3 || ratio >= 0.55) return "pulse-tile pulse-tile--lg";
  if (ratio >= 0.25) return "pulse-tile pulse-tile--md";
  return "pulse-tile pulse-tile--sm";
}

function pickTopics(items: TopicIndicator[], events: EventItem[]): TopicIndicator[] {
  const fromItems = items ?? [];
  const fromEvents = events.length ? summarizeTopics(events) : [];
  const itemActive = fromItems.filter((t) => t.count > 0).length;
  const eventActive = fromEvents.filter((t) => t.count > 0).length;
  if (eventActive > itemActive) return fromEvents;
  if (itemActive > 0) return fromItems;
  if (fromEvents.length) return fromEvents;
  return fromItems;
}

export function TopicIndicators({
  items,
  events = [],
}: {
  items: TopicIndicator[];
  events?: EventItem[];
}) {
  const derived = useMemo(
    () => pickTopics(items ?? [], events ?? []),
    [items, events]
  );

  const ranked = useMemo(
    () => [...derived].sort((a, b) => b.count - a.count),
    [derived]
  );
  const active = ranked.filter((t) => t.count > 0);
  const shown = active.slice(0, 12);
  const max = Math.max(1, ...shown.map((t) => t.count));

  return (
    <section className="panel pulse-panel p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="panel-title mb-1">Pulso social · menciones 12h</h2>
          <p className="text-[0.72rem] text-[var(--muted)]">
            Señales derivadas de titulares (no son cifras oficiales).
          </p>
        </div>
        <span className="chip">{active.length} activos</span>
      </div>

      {shown.length === 0 ? (
        <div className="pulse-empty rounded-[10px] border border-dashed border-[var(--line)] px-4 py-10 text-center text-sm text-[var(--muted)]">
          Aún no hay menciones temáticas en la ventana de 12h.
        </div>
      ) : (
        <div className="pulse-grid">
          {shown.map((t, i) => {
            const accent = accentFor(t.domain);
            const intensity = t.count > 0 ? t.count / max : 0.08;
            return (
              <a
                key={t.key}
                href={t.lastUrl || undefined}
                target={t.lastUrl ? "_blank" : undefined}
                rel="noreferrer"
                className={`${tileSize(t.count, max, i)} no-underline`}
                style={{
                  borderColor: `color-mix(in srgb, ${accent} 35%, var(--line))`,
                  background: `linear-gradient(165deg, color-mix(in srgb, ${accent} ${8 + intensity * 14}%, var(--bg-elev)), var(--bg-elev))`,
                }}
              >
                <div
                  className="absolute bottom-0 left-0 h-[3px]"
                  style={{
                    width: `${Math.max(12, intensity * 100)}%`,
                    background: accent,
                  }}
                />
                <div className="flex items-start justify-between gap-2">
                  <span className={`domain-dot mt-1.5 domain-${t.domain}`} />
                  <span className="kpi pulse-count tabular-nums">{t.count}</span>
                </div>
                <div className="pulse-label mt-1 font-medium tracking-tight">{t.label}</div>
                <div className="mt-1 text-[0.62rem] uppercase tracking-[0.1em] text-[var(--faint)]">
                  {t.domain}
                </div>
                {t.lastTitle && (
                  <div className="pulse-excerpt mt-2 line-clamp-3 text-[0.7rem] leading-snug text-[var(--muted)]">
                    {t.lastTitle}
                    {t.lastAt && (
                      <>
                        {" · "}
                        <RelativeTime iso={t.lastAt} />
                      </>
                    )}
                  </div>
                )}
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
