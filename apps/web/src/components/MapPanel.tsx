"use client";

import dynamic from "next/dynamic";
import type { MapLayerPoint } from "@bo-dash/shared";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <section className="panel map-panel flex h-full min-h-[460px] flex-col overflow-hidden p-0">
      <div className="flex h-[420px] flex-1 items-center justify-center gap-2 text-sm text-[var(--muted)]">
        <span className="spinner" />
        Cargando mapa…
      </div>
    </section>
  ),
});

export function MapPanel({ points }: { points: MapLayerPoint[] }) {
  return <MapCanvas points={points} />;
}
