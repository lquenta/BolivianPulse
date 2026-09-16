"use client";

import { useMemo } from "react";
import type { Domain } from "@bo-dash/shared";
import { Chart } from "@/components/Chart";

export function DomainPie({ counts }: { counts: Record<Domain, number> }) {
  const option = useMemo(
    () => ({
      backgroundColor: "transparent",
      tooltip: { trigger: "item" as const },
      series: [
        {
          type: "pie" as const,
          radius: ["38%", "68%"],
          label: { color: "#e7ebf0", fontSize: 10 },
          data: (Object.entries(counts) as Array<[Domain, number]>)
            .filter(([, v]) => v > 0)
            .map(([name, value]) => ({ name, value })),
          color: [
            "#c9a227",
            "#5b7fa6",
            "#c75a52",
            "#4a8f9e",
            "#6a9e8c",
            "#7d8aa3",
            "#8f9aab",
          ],
        },
      ],
    }),
    [counts]
  );

  return (
    <section className="panel p-4 sm:p-5">
      <h2 className="panel-title">Noticias por dominio (12h)</h2>
      <Chart option={option} height={200} />
    </section>
  );
}
