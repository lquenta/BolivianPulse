import {
  BOLIVIA_BBOX,
  BOLIVIA_CITIES,
  hashId,
  inBolivia,
  type EventItem,
  type MapLayerPoint,
  type WeatherCity,
} from "@bo-dash/shared";
import { XMLParser } from "fast-xml-parser";
import { fetchJson, fetchText, withCircuit } from "../lib/http";
import { setHealth, setMapLayer, setWeather, upsertEvents } from "../lib/store";

type UsgsFeature = {
  id: string;
  properties: { mag: number; place: string; time: number; url: string; title: string };
  geometry: { coordinates: [number, number, number] };
};

export async function pollHazards() {
  await Promise.all([pollUsgs(), pollFirms(), pollWeather(), pollGdacs(), pollOpenSky()]);
}

async function pollUsgs() {
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=${BOLIVIA_BBOX.minLat}&maxlatitude=${BOLIVIA_BBOX.maxLat}&minlongitude=${BOLIVIA_BBOX.minLon}&maxlongitude=${BOLIVIA_BBOX.maxLon}&orderby=time&limit=50`;
  const res = await withCircuit("usgs", async () =>
    fetchJson<{ features: UsgsFeature[] }>(url)
  );
  if (!res.ok) {
    setHealth({
      source: "usgs",
      status: "error",
      latencyMs: res.latencyMs,
      errorStreak: 1,
      message: res.error,
      cadenceSec: 20,
    });
    return;
  }
  const now = new Date().toISOString();
  const points: MapLayerPoint[] = [];
  const events: EventItem[] = [];
  for (const f of res.value.features ?? []) {
    const [lon, lat] = f.geometry.coordinates;
    if (!inBolivia(lat, lon) && !f.properties.place?.toLowerCase().includes("bolivia")) continue;
    points.push({
      id: f.id,
      layer: "sismos",
      lat,
      lon,
      label: `M${f.properties.mag} ${f.properties.place}`,
      summary: `Sismo magnitud ${f.properties.mag} cerca de ${f.properties.place}.`,
      sourceUrl: f.properties.url,
      magnitude: f.properties.mag,
      color: f.properties.mag >= 5 ? "#c0392b" : "#e67e22",
      meta: { mag: f.properties.mag },
    });
    events.push({
      id: hashId("usgs", f.id),
      domain: "clima",
      title: f.properties.title,
      source: "USGS",
      sourceUrl: f.properties.url,
      occurredAt: new Date(f.properties.time).toISOString(),
      ingestedAt: now,
      geo: { lat, lon, place: f.properties.place },
      metrics: { magnitude: f.properties.mag },
      urgency: f.properties.mag >= 5 ? "breaking" : "normal",
      tags: ["sismo"],
    });
  }
  setMapLayer("sismos", points);
  upsertEvents(events);
  setHealth({
    source: "usgs",
    status: "ok",
    lastOk: now,
    latencyMs: res.latencyMs,
    errorStreak: 0,
    cadenceSec: 20,
  });
}

async function pollFirms() {
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) {
    setHealth({
      source: "firms",
      status: "stale",
      errorStreak: 0,
      message: "FIRMS_MAP_KEY no configurada",
      cadenceSec: 60,
    });
    // Demo empty layer so UI toggle works
    setMapLayer("incendios", []);
    return;
  }
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/${BOLIVIA_BBOX.minLon},${BOLIVIA_BBOX.minLat},${BOLIVIA_BBOX.maxLon},${BOLIVIA_BBOX.maxLat}/1`;
  const res = await withCircuit("firms", async () => fetchText(url));
  if (!res.ok) {
    setHealth({
      source: "firms",
      status: "error",
      latencyMs: res.latencyMs,
      errorStreak: 1,
      message: res.error,
      cadenceSec: 60,
    });
    return;
  }
  const lines = res.value.trim().split(/\r?\n/);
  const points: MapLayerPoint[] = [];
  for (let i = 1; i < lines.length && points.length < 200; i++) {
    const cols = lines[i].split(",");
    const lat = Number(cols[0]);
    const lon = Number(cols[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    points.push({
      id: `firms_${i}_${lat}_${lon}`,
      layer: "incendios",
      lat,
      lon,
      label: "Foco de calor VIIRS",
      summary: "Detección satelital NASA FIRMS (VIIRS) de calor/incendio en las últimas horas.",
      sourceUrl: "https://firms.modaps.eosdis.nasa.gov/map/",
      color: "#e74c3c",
    });
  }
  setMapLayer("incendios", points);
  setHealth({
    source: "firms",
    status: "ok",
    lastOk: new Date().toISOString(),
    latencyMs: res.latencyMs,
    errorStreak: 0,
    cadenceSec: 60,
  });
}

async function pollWeather() {
  const weather: WeatherCity[] = [];
  const res = await withCircuit("open-meteo", async () => {
    const results: WeatherCity[] = [];
    for (const city of BOLIVIA_CITIES) {
      const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=America%2FLa_Paz`;
      const wx = await fetchJson<{
        current?: { temperature_2m?: number; weather_code?: number; wind_speed_10m?: number };
      }>(wxUrl);
      let aqi: number | undefined;
      try {
        const aq = await fetchJson<{
          current?: { us_aqi?: number };
        }>(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=us_aqi`
        );
        aqi = aq.current?.us_aqi;
      } catch {
        /* optional */
      }
      results.push({
        ...city,
        tempC: wx.current?.temperature_2m,
        weatherCode: wx.current?.weather_code,
        windKmh: wx.current?.wind_speed_10m,
        aqi,
        updatedAt: new Date().toISOString(),
      });
    }
    return results;
  });

  if (res.ok) {
    setWeather(res.value);
    setHealth({
      source: "open-meteo",
      status: "ok",
      lastOk: new Date().toISOString(),
      latencyMs: res.latencyMs,
      errorStreak: 0,
      cadenceSec: 120,
    });
  } else {
    setHealth({
      source: "open-meteo",
      status: "error",
      latencyMs: res.latencyMs,
      errorStreak: 1,
      message: res.error,
      cadenceSec: 120,
    });
  }
  void weather;
}

async function pollGdacs() {
  const res = await withCircuit("gdacs", async () => fetchText("https://www.gdacs.org/xml/rss.xml"));
  if (!res.ok) {
    setHealth({
      source: "gdacs",
      status: "error",
      latencyMs: res.latencyMs,
      errorStreak: 1,
      message: res.error,
      cadenceSec: 30,
    });
    return;
  }
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(res.value);
  const items = doc?.rss?.channel?.item;
  const list = Array.isArray(items) ? items : items ? [items] : [];
  const now = new Date().toISOString();
  const events: EventItem[] = [];
  const points: MapLayerPoint[] = [];
  for (const item of list.slice(0, 40)) {
    const title = String(item.title ?? "");
    const desc = String(item.description ?? "");
    const isBo =
      title.toLowerCase().includes("bolivia") ||
      desc.toLowerCase().includes("bolivia") ||
      String(item["gdacs:country"] ?? "").toLowerCase().includes("bolivia");
    if (!isBo && !title.toLowerCase().includes("chile") && !title.toLowerCase().includes("peru")) {
      // keep regional Andes alerts lightly
      if (!/(earthquake|flood|wildfire|volcano)/i.test(title)) continue;
    }
    const lat = Number(item["geo:lat"] ?? item["georss:point"]?.split?.(" ")?.[0]);
    const lon = Number(item["geo:long"] ?? item["georss:point"]?.split?.(" ")?.[1]);
    const link = String(item.link ?? "");
    const pub = item.pubDate ?? now;
    events.push({
      id: hashId("gdacs", link || title),
      domain: "seguridad",
      title,
      summary: desc.replace(/<[^>]+>/g, "").slice(0, 240),
      source: "GDACS",
      sourceUrl: link || undefined,
      occurredAt: new Date(pub).toISOString(),
      ingestedAt: now,
      geo: Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : undefined,
      metrics: { gdacsLevel: /Orange|Red/i.test(title) ? 2 : 1 },
      urgency: /Orange|Red/i.test(title) ? "breaking" : "normal",
      tags: ["gdacs"],
    });
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      points.push({
        id: hashId("gdacs-pt", link || title),
        layer: "alertas",
        lat,
        lon,
        label: title.slice(0, 80),
        summary: String(item.description ?? title)
          .replace(/<[^>]+>/g, "")
          .slice(0, 180),
        sourceUrl: link || undefined,
        color: /Red/i.test(title) ? "#c0392b" : "#f39c12",
      });
    }
  }
  upsertEvents(events);
  setMapLayer("alertas", points);
  setHealth({
    source: "gdacs",
    status: "ok",
    lastOk: now,
    latencyMs: res.latencyMs,
    errorStreak: 0,
    cadenceSec: 30,
  });
}

async function pollOpenSky() {
  const { minLat, maxLat, minLon, maxLon } = BOLIVIA_BBOX;
  const url = `https://opensky-network.org/api/states/all?lamin=${minLat}&lomin=${minLon}&lamax=${maxLat}&lomax=${maxLon}`;
  const res = await withCircuit("opensky", async () =>
    fetchJson<{ states?: Array<Array<string | number | null>> }>(url)
  );
  if (!res.ok) {
    setHealth({
      source: "opensky",
      status: "error",
      latencyMs: res.latencyMs,
      errorStreak: 1,
      message: res.error,
      cadenceSec: 25,
    });
    setMapLayer("aviones", []);
    return;
  }
  const points: MapLayerPoint[] = [];
  for (const s of res.value.states ?? []) {
    const icao = String(s[0] ?? "");
    const callsign = String(s[1] ?? "").trim() || icao;
    const lon = Number(s[5]);
    const lat = Number(s[6]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    points.push({
      id: `ac_${icao}`,
      layer: "aviones",
      lat,
      lon,
      label: callsign,
      summary: `Aeronave ${callsign}. Alt ${Number(s[7] ?? 0).toFixed(0)} m · vel ${Number(s[9] ?? 0).toFixed(0)} m/s (OpenSky ADS-B).`,
      sourceUrl: `https://globe.adsbexchange.com/?icao=${icao}`,
      color: "#2980b9",
      meta: { alt: Number(s[7] ?? 0), velocity: Number(s[9] ?? 0) },
    });
  }
  setMapLayer("aviones", points);
  setHealth({
    source: "opensky",
    status: "ok",
    lastOk: new Date().toISOString(),
    latencyMs: res.latencyMs,
    errorStreak: 0,
    cadenceSec: 25,
  });
}
