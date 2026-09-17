"use client";

import { useMemo } from "react";
import type { EconomySnapshot } from "@bo-dash/shared";
import { Chart } from "@/components/Chart";
import { asNumber, formatNum, formatPct } from "@/lib/format";

export function EconomyPanel({ kpis }: { kpis: EconomySnapshot }) {
  const official = asNumber(kpis.official);
  const parallel = asNumber(kpis.parallel);
  const spreadPct =
    asNumber(kpis.spreadPct) ??
    (official && parallel ? ((parallel - official) / official) * 100 : undefined);

  const lineOption = useMemo(() => {
    const hist = kpis.history ?? [];
    return {
      backgroundColor: "transparent",
      grid: { left: 36, right: 12, top: 28, bottom: 24 },
      tooltip: { trigger: "axis" as const },
                  legend: { textStyle: { color: "#9eb4d4" }, top: 0, right: 0 },
      xAxis: {
        type: "category" as const,
        data: hist.map((h) =>
          new Date(h.t).toLocaleTimeString("es-BO", {
            hour: "2-digit",
            minute: "2-digit",
          })
        ),
        axisLabel: { color: "#9eb4d4", fontSize: 10 },
        axisLine: { lineStyle: { color: "#1e3a62" } },
      },
      yAxis: {
        type: "value" as const,
        scale: true,
        axisLabel: { color: "#9eb4d4", fontSize: 10 },
        splitLine: { lineStyle: { color: "#1e3a62", type: "dashed" as const } },
      },
      series: [
        {
          name: "Oficial",
          type: "line" as const,
          smooth: true,
          data: hist.map((h) => asNumber(h.official)),
          lineStyle: { color: "#00f0c8", width: 2.5 },
          itemStyle: { color: "#00f0c8" },
          showSymbol: false,
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(0,240,200,0.28)" },
                { offset: 1, color: "rgba(0,240,200,0)" },
              ],
            },
          },
        },
        {
          name: "Paralelo",
          type: "line" as const,
          smooth: true,
          data: hist.map((h) => asNumber(h.parallel)),
          lineStyle: { color: "#ffcc00", width: 2.5 },
          itemStyle: { color: "#ffcc00" },
          showSymbol: false,
        },
      ],
    };
  }, [kpis.history]);

  const pieOption = useMemo(() => {
    const exchanges = kpis.exchanges?.length
      ? kpis.exchanges
      : [
          {
            name: "Paralelo",
            median: parallel ?? 0,
            buy: asNumber(kpis.buy) ?? 0,
            sell: asNumber(kpis.sell) ?? 0,
          },
        ];
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "item" as const },
      series: [
        {
          type: "pie" as const,
          radius: ["42%", "70%"],
          label: { color: "#e7ebf0", fontSize: 10 },
          data: exchanges
            .map((e) => ({
              name: e.name,
              value: asNumber(e.median) || asNumber(e.sell) || asNumber(e.buy) || 0,
            }))
            .filter((d) => d.value > 0),
          color: ["#ffcc00", "#00f0c8", "#3da9ff", "#ff3d5a", "#a78bfa", "#2dff9a"],
        },
      ],
    };
  }, [kpis, parallel]);

  return (
    <section className="panel economy-panel p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="panel-title mb-0">Economía · tipo de cambio</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="chip">BCB + paralelo</span>
          <span className="live-badge">FX</span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="kpi-card">
          <div className="text-[0.62rem] uppercase tracking-[0.1em] text-[var(--muted)]">
            Oficial
          </div>
          <div className="kpi mt-1">{formatNum(official)}</div>
        </div>
        <div className="kpi-card kpi-card--accent">
          <div className="text-[0.62rem] uppercase tracking-[0.1em] text-[var(--accent)]">
            Paralelo
          </div>
          <div className="kpi mt-1 text-[var(--accent)]">{formatNum(parallel)}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[0.62rem] uppercase tracking-[0.1em] text-[var(--muted)]">
            Brecha
          </div>
          <div className="kpi mt-1">{formatPct(spreadPct)}</div>
        </div>
      </div>

      <Chart option={lineOption} height={170} />
      <h3 className="panel-title mt-3">Distribución / exchanges</h3>
      <Chart option={pieOption} height={150} />
    </section>
  );
}
