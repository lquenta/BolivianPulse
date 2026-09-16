"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MapLayerPoint } from "@bo-dash/shared";

const Map = dynamic(() => import("react-map-gl/maplibre").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center gap-2 text-sm text-[var(--muted)]">
      <span className="spinner" />
      Cargando mapa…
    </div>
  ),
});

const Marker = dynamic(() => import("react-map-gl/maplibre").then((m) => m.Marker), {
  ssr: false,
});

const Popup = dynamic(() => import("react-map-gl/maplibre").then((m) => m.Popup), {
  ssr: false,
});

const NavigationControl = dynamic(
  () => import("react-map-gl/maplibre").then((m) => m.NavigationControl),
  { ssr: false }
);

const LAYERS: Array<MapLayerPoint["layer"]> = [
  "sismos",
  "incendios",
  "alertas",
  "aviones",
  "eventos",
];

export function MapPanel({ points }: { points: MapLayerPoint[] }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    sismos: true,
    incendios: true,
    alertas: true,
    aviones: true,
    eventos: true,
  });
  const [hover, setHover] = useState<MapLayerPoint | null>(null);
  const [ready, setReady] = useState(false);
  const mapBoxRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<{ resize: () => void } | null>(null);

  const visible = useMemo(
    () => points.filter((p) => enabled[p.layer]),
    [points, enabled]
  );

  useEffect(() => {
    const resize = () => {
      try {
        mapInstance.current?.resize();
      } catch {
        /* ignore */
      }
    };
    const id = window.setTimeout(resize, 150);
    const id2 = window.setTimeout(resize, 700);
    window.addEventListener("resize", resize);

    const el = mapBoxRef.current;
    const ro =
      el && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => resize())
        : null;
    if (el && ro) ro.observe(el);

    return () => {
      window.clearTimeout(id);
      window.clearTimeout(id2);
      window.removeEventListener("resize", resize);
      ro?.disconnect();
    };
  }, []);

  return (
    <section className="panel map-panel flex h-full min-h-[460px] flex-col overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-3 py-2.5 sm:px-4">
        <h2 className="panel-title mb-0 mr-1">Mapa de eventos</h2>
        {LAYERS.map((layer) => (
          <button
            key={layer}
            type="button"
            onClick={() => setEnabled((e) => ({ ...e, [layer]: !e[layer] }))}
            className={`chip ${enabled[layer] ? "active" : ""}`}
          >
            {layer}
          </button>
        ))}
        <span className="ml-auto text-xs tabular-nums text-[var(--muted)]">
          {visible.length} pts
        </span>
      </div>
      <div ref={mapBoxRef} className="relative min-h-[420px] w-full flex-1">
        {!ready && (
          <div className="absolute inset-0 z-[1] flex items-center justify-center gap-2 bg-[var(--bg-elev)] text-sm text-[var(--muted)]">
            <span className="spinner" />
            Inicializando mapa…
          </div>
        )}
        <Map
          initialViewState={{ longitude: -64.5, latitude: -16.5, zoom: 4.6 }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          onLoad={(e) => {
            mapInstance.current = e.target;
            try {
              e.target.resize();
            } catch {
              /* ignore */
            }
            setReady(true);
          }}
        >
          <NavigationControl position="top-right" />
          {visible.map((p) => (
            <Marker key={p.id} longitude={p.lon} latitude={p.lat} anchor="center">
              <button
                type="button"
                aria-label={p.label}
                onMouseEnter={() => setHover(p)}
                onFocus={() => setHover(p)}
                onClick={() => setHover(p)}
                style={{
                  width: p.layer === "sismos" ? 10 + (p.magnitude ?? 0) * 2 : 10,
                  height: p.layer === "sismos" ? 10 + (p.magnitude ?? 0) * 2 : 10,
                  borderRadius: "50%",
                  background: p.color ?? "#4a8f9e",
                  border: "1px solid rgba(255,255,255,0.45)",
                  boxShadow: "0 0 8px rgba(0,0,0,0.35)",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            </Marker>
          ))}
          {hover && (
            <Popup
              longitude={hover.lon}
              latitude={hover.lat}
              anchor="bottom"
              closeButton={false}
              closeOnClick={false}
              offset={14}
              onClose={() => setHover(null)}
            >
              <div className="max-w-[240px] p-1" onMouseLeave={() => setHover(null)}>
                <div className="mb-1 text-[0.65rem] uppercase tracking-wide text-[var(--muted)]">
                  {hover.layer}
                </div>
                <div className="mb-1 text-sm font-semibold leading-snug">{hover.label}</div>
                {hover.summary && (
                  <p className="mb-2 text-xs leading-snug text-[var(--muted)]">{hover.summary}</p>
                )}
                {hover.sourceUrl ? (
                  <a
                    href={hover.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--accent)] underline-offset-2 hover:underline"
                  >
                    Ver detalle →
                  </a>
                ) : (
                  <span className="text-xs text-[var(--muted)]">Sin enlace externo</span>
                )}
              </div>
            </Popup>
          )}
        </Map>
      </div>
    </section>
  );
}
