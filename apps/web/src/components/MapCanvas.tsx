"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Marker,
  NavigationControl,
  Popup,
} from "react-map-gl/maplibre";
import type { MapLayerPoint } from "@bo-dash/shared";
import type { LayerEnabled } from "@/components/LayerRail";

export default function MapCanvas({
  points,
  enabled,
  bleed = false,
}: {
  points: MapLayerPoint[];
  enabled: LayerEnabled;
  bleed?: boolean;
}) {
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
    <div
      ref={mapBoxRef}
      className={
        bleed
          ? "ops-map-bleed"
          : "relative min-h-[420px] w-full flex-1"
      }
    >
      {!ready && (
        <div className="absolute inset-0 z-[1] flex items-center justify-center gap-2 bg-[var(--bg)] text-sm text-[var(--muted)]">
          <span className="spinner" />
          Inicializando mapa…
        </div>
      )}
      <Map
        initialViewState={{ longitude: -64.5, latitude: -16.5, zoom: 4.6 }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        onLoad={(e: { target: { resize: () => void } }) => {
          mapInstance.current = e.target;
          const forceResize = () => {
            try {
              e.target.resize();
            } catch {
              /* ignore */
            }
          };
          forceResize();
          requestAnimationFrame(forceResize);
          window.setTimeout(forceResize, 50);
          window.setTimeout(forceResize, 300);
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
                background: p.color ?? "#39ff9a",
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
                  className="text-xs text-[var(--ops-live)] underline-offset-2 hover:underline"
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
      {!bleed && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-[0.65rem] text-[var(--muted)]">
          {visible.length} pts
        </div>
      )}
    </div>
  );
}
