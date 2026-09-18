"use client";

import { useMemo } from "react";
import type {
  DashboardBundle,
  MapLayerPoint,
  SourceHealth,
} from "@bo-dash/shared";
import { asNumber, formatNum, formatPct } from "@/lib/format";

/** Only surfaces that poll frequently enough to feel "live". */
const LIVE_CADENCE_MAX_SEC = 90;
const STALE_GRACE = 3;

type LiveCard = {
  id: string;
  domain: "economia" | "seguridad" | "clima" | "sociedad" | "infra" | "media";
  label: string;
  value: string;
  hint: string;
  source: string;
  cadenceSec: number;
};

function healthMap(health: SourceHealth[]) {
  return new Map(health.map((h) => [h.source, h]));
}

function isLive(h?: SourceHealth): h is SourceHealth {
  if (!h || h.status === "error") return false;
  if (h.cadenceSec > LIVE_CADENCE_MAX_SEC) return false;
  if (!h.lastOk) return h.status === "ok";
  const age = Date.now() - new Date(h.lastOk).getTime();
  return age <= h.cadenceSec * STALE_GRACE * 1000;
}

function layerCount(points: MapLayerPoint[], layer: MapLayerPoint["layer"]) {
  return points.filter((p) => p.layer === layer).length;
}

function buildLiveCards(bundle: DashboardBundle): LiveCard[] {
  const health = healthMap(bundle.sourceHealth ?? []);
  const cards: LiveCard[] = [];
  const kpis = bundle.kpis;
  const points = bundle.mapLayers ?? [];
  const weather = bundle.weather ?? [];
  const events = bundle.events ?? [];
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;

  const paralelo = health.get("paralelo.bo");
  if (isLive(paralelo)) {
    const parallel = asNumber(kpis.parallel);
    const official = asNumber(kpis.official);
    const spread =
      asNumber(kpis.spreadPct) ??
      (official && parallel ? ((parallel - official) / official) * 100 : undefined);
    cards.push({
      id: "fx-parallel",
      domain: "economia",
      label: "Paralelo",
      value: formatNum(parallel),
      hint: spread !== undefined ? `Brecha ${formatPct(spread)}` : "paralelo.bo",
      source: "paralelo.bo",
      cadenceSec: paralelo.cadenceSec,
    });
  }

  const usgs = health.get("usgs");
  const emsc = health.get("emsc");
  if (isLive(usgs) || isLive(emsc)) {
    const n = layerCount(points, "sismos");
    const src = isLive(usgs) ? usgs! : emsc!;
    cards.push({
      id: "quakes",
      domain: "clima",
      label: "Sismos",
      value: String(n),
      hint: "USGS + EMSC",
      source: src.source,
      cadenceSec: src.cadenceSec,
    });
  }

  const inpe = health.get("inpe-queimadas");
  const firms = health.get("firms");
  if (isLive(inpe) || isLive(firms)) {
    const n = layerCount(points, "incendios");
    const src = isLive(inpe) ? inpe! : firms!;
    cards.push({
      id: "fires",
      domain: "seguridad",
      label: "Focos fuego",
      value: String(n),
      hint: isLive(inpe) ? "INPE Queimadas" : "NASA FIRMS",
      source: src.source,
      cadenceSec: src.cadenceSec,
    });
  }

  const gdacs = health.get("gdacs");
  const eonet = health.get("eonet");
  if (isLive(gdacs) || isLive(eonet)) {
    const n = layerCount(points, "alertas");
    const src = isLive(gdacs) ? gdacs! : eonet!;
    cards.push({
      id: "alerts",
      domain: "seguridad",
      label: "Alertas",
      value: String(n),
      hint: "GDACS + EONET",
      source: src.source,
      cadenceSec: src.cadenceSec,
    });
  }

  const opensky = health.get("opensky");
  if (isLive(opensky)) {
    const n = layerCount(points, "aviones");
    cards.push({
      id: "planes",
      domain: "infra",
      label: "Aviones",
      value: String(n),
      hint: "OpenSky",
      source: "opensky",
      cadenceSec: opensky.cadenceSec,
    });
  }

  const meteo = health.get("open-meteo");
  if (isLive(meteo) && weather.length) {
    const temps = weather.map((w) => w.tempC).filter((t): t is number => typeof t === "number");
    const avg =
      temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : undefined;
    cards.push({
      id: "weather",
      domain: "clima",
      label: "Temp. media",
      value: avg !== undefined ? `${avg.toFixed(0)}°` : "—",
      hint: `${weather.length} ciudades`,
      source: "open-meteo",
      cadenceSec: meteo.cadenceSec,
    });
  }

  const rssLive = [...health.values()].filter(
    (h) => h.source.startsWith("rss:") && isLive(h)
  );
  if (rssLive.length) {
    const recent = events.filter((e) => new Date(e.occurredAt).getTime() >= hourAgo).length;
    const seguridad = events.filter(
      (e) => e.domain === "seguridad" && new Date(e.occurredAt).getTime() >= hourAgo
    ).length;
    cards.push({
      id: "news-hour",
      domain: "sociedad",
      label: "Titulares 1h",
      value: String(recent),
      hint: `${rssLive.length} feeds vivos`,
      source: "rss",
      cadenceSec: Math.min(...rssLive.map((h) => h.cadenceSec)),
    });
    if (seguridad > 0) {
      cards.push({
        id: "security-hour",
        domain: "seguridad",
        label: "Seguridad 1h",
        value: String(seguridad),
        hint: "menciones recientes",
        source: "rss",
        cadenceSec: Math.min(...rssLive.map((h) => h.cadenceSec)),
      });
    }
  }

  const gdelt = health.get("gdelt");
  if (isLive(gdelt)) {
    const n = events.filter((e) => e.source.toLowerCase().includes("gdelt")).length;
    cards.push({
      id: "gdelt",
      domain: "media",
      label: "GDELT",
      value: String(n),
      hint: "menciones BO",
      source: "gdelt",
      cadenceSec: gdelt.cadenceSec,
    });
  }

  return cards;
}

export function LiveIndicators({ bundle }: { bundle: DashboardBundle }) {
  const cards = useMemo(() => buildLiveCards(bundle), [bundle]);

  if (!cards.length) {
    return (
      <section className="panel live-strip px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="panel-title mb-0">En vivo</h2>
          <span className="live-badge">Esperando</span>
        </div>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          Solo fuentes con cadencia ≤ {LIVE_CADENCE_MAX_SEC}s y datos frescos.
        </p>
      </section>
    );
  }

  return (
    <section className="panel live-strip px-4 py-3 sm:px-5">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="panel-title mb-0">En vivo</h2>
          <p className="text-[0.7rem] text-[var(--muted)]">
            Feeds ≤{LIVE_CADENCE_MAX_SEC}s
          </p>
        </div>
        <span className="live-badge">{cards.length}</span>
      </div>
      <div className="live-strip__grid">
        {cards.map((card, i) => (
          <div
            key={card.id}
            className={`live-card live-card--${card.domain}`}
            style={{ animationDelay: `${Math.min(i, 10) * 0.04}s` }}
          >
            <div className="live-card__head">
              <span className={`domain-pill domain-pill--${card.domain}`}>{card.domain}</span>
              <span className="live-card__cadence">{card.cadenceSec}s</span>
            </div>
            <div className="live-card__label">{card.label}</div>
            <div className="live-card__value">{card.value}</div>
            <div className="live-card__hint">{card.hint}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
