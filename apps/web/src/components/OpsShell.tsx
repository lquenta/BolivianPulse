"use client";

import { useEffect, useState } from "react";
import type { DashboardBundle } from "@bo-dash/shared";
import { OpsTopBar } from "@/components/OpsTopBar";
import { LayerRail, defaultLayerEnabled, type LayerEnabled } from "@/components/LayerRail";
import { MapPanel } from "@/components/MapPanel";
import { SignalDock } from "@/components/SignalDock";
import { TickerStrip } from "@/components/NewsTicker";

export function OpsShell({
  bundle,
  connected,
  refreshing,
  clock,
  error,
}: {
  bundle: DashboardBundle;
  connected: boolean;
  refreshing: boolean;
  clock: string;
  error?: string | null;
}) {
  const [layers, setLayers] = useState<LayerEnabled>(defaultLayerEnabled);

  useEffect(() => {
    document.documentElement.classList.add("ops-mode");
    return () => document.documentElement.classList.remove("ops-mode");
  }, []);

  return (
    <div className="ops-shell">
      <OpsTopBar
        connected={connected}
        official={bundle.kpis.official}
        parallel={bundle.kpis.parallel}
        spreadPct={bundle.kpis.spreadPct}
        health={bundle.sourceHealth}
        clock={clock}
        generatedAt={bundle.generatedAt}
        refreshing={refreshing}
      />

      {error && (
        <div className="border-b border-[var(--danger)]/40 bg-[var(--danger)]/12 px-3 py-2 text-sm">
          Stream: {error}
        </div>
      )}

      <div className="ops-shell__stage">
        <div className="ops-shell__map" aria-label="Mapa de eventos">
          <MapPanel points={bundle.mapLayers} enabled={layers} bleed />
        </div>

        <LayerRail
          enabled={layers}
          points={bundle.mapLayers}
          onToggle={(layer) =>
            setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }))
          }
        />

        <SignalDock bundle={bundle} />
      </div>

      <TickerStrip items={bundle.ticker} />
    </div>
  );
}
