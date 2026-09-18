"use client";

import { useEffect, useState } from "react";
import type { SourceHealth } from "@bo-dash/shared";
import { asNumber, formatNum, formatPct } from "@/lib/format";
import { useMounted } from "@/hooks/useClientTime";
import { useTheme } from "@/hooks/useTheme";
import { RefreshPill } from "@/components/LoadingScreen";

export function OpsTopBar({
  connected,
  spreadPct,
  official,
  parallel,
  health,
  clock,
  generatedAt,
  refreshing = false,
}: {
  connected: boolean;
  spreadPct?: number;
  official?: unknown;
  parallel?: unknown;
  health: SourceHealth[];
  clock: string;
  generatedAt?: string;
  refreshing?: boolean;
}) {
  const mounted = useMounted();
  const { theme, toggle, ready } = useTheme();
  const [lag, setLag] = useState<number | null>(null);
  const ok = health.filter((h) => h.status === "ok").length;
  const err = health.filter((h) => h.status === "error").length;
  const off = asNumber(official);
  const par = asNumber(parallel);
  const spread =
    typeof spreadPct === "number" && Number.isFinite(spreadPct)
      ? spreadPct
      : off && par
        ? ((par - off) / off) * 100
        : undefined;

  useEffect(() => {
    if (!generatedAt) {
      setLag(null);
      return;
    }
    const t = new Date(generatedAt).getTime();
    if (!Number.isFinite(t) || t <= 0) {
      setLag(null);
      return;
    }
    const tick = () => setLag(Math.max(0, Math.round((Date.now() - t) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [generatedAt]);

  return (
    <header className="ops-topbar">
      <div className="ops-topbar__brand">
        <div>
          <h1 className="ops-topbar__title">Bolivia Pulse</h1>
          <p className="ops-topbar__sub">
            Sala de monitoreo · {mounted ? clock : "—"}
          </p>
        </div>
      </div>

      <div className="ops-topbar__meta">
        <span className="ops-live-badge">Live</span>
        <RefreshPill show={refreshing} />
        {mounted && lag != null && !refreshing && (
          <span className="text-[0.65rem] text-[var(--muted)]" suppressHydrationWarning>
            datos · {lag < 60 ? `${lag}s` : `${Math.round(lag / 60)}m`}
          </span>
        )}
      </div>

      <div className="ops-topbar__right">
        <div className="ops-kpi">
          <span className="ops-kpi__label">Oficial</span>
          <span className="ops-kpi__value">{formatNum(off)}</span>
        </div>
        <div className="ops-kpi ops-kpi--accent">
          <span className="ops-kpi__label">Paralelo</span>
          <span className="ops-kpi__value">
            {formatNum(par)}
            {spread !== undefined && (
              <span className="ml-1 text-[0.65rem] opacity-90">
                {spread >= 0 ? "+" : ""}
                {formatPct(spread)}
              </span>
            )}
          </span>
        </div>
        <div className="ops-kpi">
          <span className="ops-kpi__label">{connected ? "SSE" : "SSE…"}</span>
          <span className="ops-kpi__value text-[0.78rem]">
            {ok} ok{err ? ` · ${err}` : ""}
          </span>
        </div>
        <button type="button" className="theme-toggle" onClick={toggle}>
          {ready ? (theme === "dark" ? "Claro" : "Oscuro") : "…"}
        </button>
      </div>
    </header>
  );
}
