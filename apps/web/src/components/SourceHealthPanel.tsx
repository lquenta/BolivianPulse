"use client";

import type { SourceHealth } from "@bo-dash/shared";

export function SourceHealthPanel({ health }: { health: SourceHealth[] }) {
  const sorted = [...health].sort((a, b) => a.source.localeCompare(b.source));
  const ok = sorted.filter((h) => h.status === "ok").length;

  return (
    <section className="panel p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="panel-title mb-0">Salud de fuentes</h2>
        <span className="chip">
          {ok}/{sorted.length} ok
        </span>
      </div>
      <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
        {sorted.map((h) => (
          <div
            key={h.source}
            className="flex items-center gap-2 rounded-[10px] border border-[var(--line)]/80 bg-[var(--bg-elev)]/40 px-2.5 py-1.5 text-xs"
          >
            <span className={`health-dot ${h.status}`} />
            <span className="min-w-0 flex-1 truncate font-medium">{h.source}</span>
            <span className="shrink-0 tabular-nums text-[var(--faint)]">
              {h.cadenceSec}s
              {h.latencyMs !== undefined ? ` · ${h.latencyMs}ms` : ""}
            </span>
          </div>
        ))}
        {!sorted.length && (
          <div className="text-[var(--muted)]">Ingestión aún no reportó fuentes.</div>
        )}
      </div>
    </section>
  );
}
