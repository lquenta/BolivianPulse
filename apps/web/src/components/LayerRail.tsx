"use client";

import type { MapLayerPoint } from "@bo-dash/shared";

export const MAP_LAYERS: Array<MapLayerPoint["layer"]> = [
  "sismos",
  "incendios",
  "alertas",
  "aviones",
  "eventos",
];

export type LayerEnabled = Record<MapLayerPoint["layer"], boolean>;

export function defaultLayerEnabled(): LayerEnabled {
  return {
    sismos: true,
    incendios: true,
    alertas: true,
    aviones: true,
    eventos: true,
  };
}

export function LayerRail({
  enabled,
  points,
  onToggle,
}: {
  enabled: LayerEnabled;
  points: MapLayerPoint[];
  onToggle: (layer: MapLayerPoint["layer"]) => void;
}) {
  const counts = MAP_LAYERS.reduce(
    (acc, layer) => {
      acc[layer] = points.filter((p) => p.layer === layer).length;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <aside className="ops-panel ops-rail" aria-label="Capas del mapa">
      <h2 className="ops-rail__title">Capas</h2>
      <div className="ops-rail__list">
        {MAP_LAYERS.map((layer) => (
          <button
            key={layer}
            type="button"
            className={`ops-rail__btn ${enabled[layer] ? "is-on" : ""}`}
            onClick={() => onToggle(layer)}
            aria-pressed={enabled[layer]}
          >
            <span>{layer}</span>
            <span className="ops-rail__count">{counts[layer] ?? 0}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
