"use client";

import type { WeatherCity } from "@bo-dash/shared";

export function WeatherPanel({ weather }: { weather: WeatherCity[] }) {
  return (
    <section className="panel p-4 sm:p-5">
      <h2 className="panel-title">Clima / AQI · ciudades</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {weather.map((c) => {
          const aqi = c.aqi;
          const aqiTone =
            aqi == null
              ? "var(--faint)"
              : aqi <= 50
                ? "var(--ok)"
                : aqi <= 100
                  ? "var(--accent)"
                  : "var(--danger)";
          return (
            <div
              key={c.name}
              className="rounded-[12px] border border-[var(--line)] bg-[var(--bg-elev)]/55 p-2.5 transition hover:border-[var(--line-strong)]"
            >
              <div className="text-[0.62rem] uppercase tracking-[0.1em] text-[var(--muted)]">
                {c.dept}
              </div>
              <div className="text-sm font-medium tracking-tight">{c.name}</div>
              <div className="mt-1 flex items-end justify-between gap-2">
                <div className="kpi text-[1.35rem]">
                  {c.tempC !== undefined ? `${c.tempC.toFixed(0)}°` : "—"}
                </div>
                <div className="text-right text-[0.68rem] text-[var(--muted)]">
                  <div>{c.windKmh?.toFixed(0) ?? "—"} km/h</div>
                  <div style={{ color: aqiTone }}>
                    AQI {aqi ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!weather.length && (
          <div className="col-span-full text-sm text-[var(--muted)]">
            Sin datos de Open-Meteo todavía (reintentando en el próximo ciclo).
          </div>
        )}
      </div>
    </section>
  );
}
