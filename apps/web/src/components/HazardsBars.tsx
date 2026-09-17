"use client";

import { useMemo } from "react";
import type { MapLayerPoint } from "@bo-dash/shared";
import { Chart } from "@/components/Chart";

export function HazardsBars({ points }: { points: MapLayerPoint[] }) {
  const option = useMemo(() => {
    const sismos = points.filter((p) => p.layer === "sismos");
    const buckets = ["<3", "3-4", "4-5", "≥5"];
    const counts = [0, 0, 0, 0];
    for (const s of sismos) {
      const m = s.magnitude ?? 0;
      if (m < 3) counts[0]++;
      else if (m < 4) counts[1]++;
      else if (m < 5) counts[2]++;
      else counts[3]++;
    }
    const fires = points.filter((p) => p.layer === "incendios").length;
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" as const },
      grid: { left: 36, right: 12, top: 24, bottom: 28 },
      xAxis: {
        type: "category" as const,
        data: [...buckets, "fuegos"],
        axisLabel: { color: "#9eb4d4", fontSize: 10 },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { color: "#9eb4d4", fontSize: 10 },
        splitLine: { lineStyle: { color: "#1e3a62", type: "dashed" as const } },
      },
      series: [
        {
          type: "bar" as const,
          data: [
            { value: counts[0], itemStyle: { color: "#ffcc00" } },
            { value: counts[1], itemStyle: { color: "#ff9a1f" } },
            { value: counts[2], itemStyle: { color: "#ff6b3d" } },
            { value: counts[3], itemStyle: { color: "#ff3d5a" } },
            { value: fires, itemStyle: { color: "#ff2048" } },
          ],
        },
      ],
    };
  }, [points]);

  return (
    <section className="panel p-4 sm:p-5">
      <h2 className="panel-title">Sismos por magnitud / focos fuego</h2>
      <Chart option={option} height={160} />
    </section>
  );
}
