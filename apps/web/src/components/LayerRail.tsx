"use client";

import type { MapLayer, MapLayerPoint } from "@bo-dash/shared";

export const MAP_LAYERS: Array<{ key: MapLayer; label: string }> = [
  { key: "sismos", label: "Sismos" },
  { key: "incendios", label: "Incendios" },
  { key: "alertas", label: "Alertas" },
  { key: "aviones", label: "Aviones" },
  { key: "eventos", label: "Eventos" },
  { key: "clima", label: "Clima" },
];

export type LayerEnabled = Record<MapLayer, boolean>;

export function defaultLayerEnabled(): LayerEnabled {
  return {
    sismos: true,
    incendios: true,
    alertas: true,
    aviones: true,
    eventos: true,
    clima: true,
  };
}

export function LayerRail({
  enabled,
  points,
  onToggle,
}: {
  enabled: LayerEnabled;
  points: MapLayerPoint[];
  onToggle: (layer: MapLayer) => void;
}) {
  const counts = MAP_LAYERS.reduce(
    (acc, { key }) => {
      acc[key] = points.filter((p) => p.layer === key).length;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <aside className="ops-panel ops-rail" aria-label="Capas del mapa">
      <h2 className="ops-rail__title">Capas</h2>
      <div className="ops-rail__list">
        {MAP_LAYERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`ops-rail__btn ${enabled[key] ? "is-on" : ""}`}
            onClick={() => onToggle(key)}
            aria-pressed={enabled[key]}
          >
            <span>{label}</span>
            <span className="ops-rail__count">{counts[key] ?? 0}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
