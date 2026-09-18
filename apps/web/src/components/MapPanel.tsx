"use client";

import dynamic from "next/dynamic";
import type { MapLayerPoint } from "@bo-dash/shared";
import type { LayerEnabled } from "@/components/LayerRail";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[280px] w-full items-center justify-center gap-2 bg-[var(--bg)] text-sm text-[var(--muted)]">
      <span className="spinner" />
      Cargando mapa…
    </div>
  ),
});

export function MapPanel({
  points,
  enabled,
  bleed = false,
}: {
  points: MapLayerPoint[];
  enabled: LayerEnabled;
  bleed?: boolean;
}) {
  return <MapCanvas points={points} enabled={enabled} bleed={bleed} />;
}
