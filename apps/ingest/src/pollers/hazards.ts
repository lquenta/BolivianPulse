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

type EmscFeature = {
  id?: string | number;
  properties?: {
    mag?: number;
    magType?: string;
    place?: string;
    flynn_region?: string;
    time?: string;
    lastupdate?: string;
    url?: string;
  };
  geometry?: { coordinates?: number[] };
};

type EonetEvent = {
  id: string;
  title: string;
  link?: string;
  categories?: Array<{ id?: string; title?: string }>;
  sources?: Array<{ id?: string; url?: string }>;
  geometry?: Array<{
    date?: string;
    type?: string;
    coordinates?: number[] | number[][];
  }>;
};

let inpeCache: { at: number; points: MapLayerPoint[]; day: string } | null = null;
const INPE_TTL_MS = 45 * 60_000;
const MAX_FIRES = 220;
const MAX_QUAKES = 80;
const MAX_ALERTS = 60;

function ymdLaPaz(offsetDays = 0): string {
  const d = new Date(Date.now() - offsetDays * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${y}${m}${day}`;
}

function dedupeQuakes(points: MapLayerPoint[]): MapLayerPoint[] {
  const best = new Map<string, MapLayerPoint>();
  for (const p of points) {
    const key = `${p.lat.toFixed(2)},${p.lon.toFixed(2)},${(p.magnitude ?? 0).toFixed(1)}`;
    const prev = best.get(key);
    if (!prev || (p.magnitude ?? 0) >= (prev.magnitude ?? 0)) best.set(key, p);
  }
  return [...best.values()]
    .sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0))
    .slice(0, MAX_QUAKES);
}

function mergeLayer(
  ...groups: MapLayerPoint[][]
): MapLayerPoint[] {
  const byId = new Map<string, MapLayerPoint>();
  for (const group of groups) {
    for (const p of group) byId.set(p.id, p);
  }
  return [...byId.values()];
}

function pointFromCoords(coords: number[] | number[][] | undefined): { lon: number; lat: number } | null {
  if (!coords || !Array.isArray(coords)) return null;
  if (typeof coords[0] === "number" && typeof coords[1] === "number") {
    return { lon: coords[0] as number, lat: coords[1] as number };
  }
  const first = coords[0];
  if (Array.isArray(first) && typeof first[0] === "number") {
    return { lon: first[0] as number, lat: first[1] as number };
  }
  return null;
}

export async function pollHazards() {
  const [usgs, emsc, inpe, firms, eonet, gdacs, weatherPts, planes] = await Promise.all([
    pollUsgs(),
    pollEmsc(),
    pollInpeQueimadas(),
    pollFirms(),
    pollEonet(),
    pollGdacs(),
    pollWeather(),
    pollOpenSky(),
  ]);

  setMapLayer("sismos", dedupeQuakes(mergeLayer(usgs.points, emsc.points)));
  upsertEvents([...usgs.events, ...emsc.events]);

  const fires = mergeLayer(inpe, firms)
    .sort((a, b) => Number(b.meta?.frp ?? 0) - Number(a.meta?.frp ?? 0))
    .slice(0, MAX_FIRES);
  // Prefer EONET wildfire points that aren't already dense INPE coverage
  const fireExtras = eonet.fires.filter(
    (p) =>
      !fires.some(
        (f) => Math.abs(f.lat - p.lat) < 0.15 && Math.abs(f.lon - p.lon) < 0.15
      )
  );
  setMapLayer("incendios", [...fires, ...fireExtras].slice(0, MAX_FIRES));

  setMapLayer(
    "alertas",
    mergeLayer(gdacs.points, eonet.alerts).slice(0, MAX_ALERTS)
  );
  upsertEvents([...gdacs.events, ...eonet.events]);

  setMapLayer("aviones", planes);
  setMapLayer("clima", weatherPts);
}

async function pollUsgs(): Promise<{ points: MapLayerPoint[]; events: EventItem[] }> {
  const start = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=${BOLIVIA_BBOX.minLat}&maxlatitude=${BOLIVIA_BBOX.maxLat}&minlongitude=${BOLIVIA_BBOX.minLon}&maxlongitude=${BOLIVIA_BBOX.maxLon}&orderby=time&limit=80&starttime=${start}`;
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
    return { points: [], events: [] };
  }
  const now = new Date().toISOString();
  const points: MapLayerPoint[] = [];
  const events: EventItem[] = [];
  for (const f of res.value.features ?? []) {
    const [lon, lat] = f.geometry.coordinates;
    if (!inBolivia(lat, lon) && !f.properties.place?.toLowerCase().includes("bolivia")) continue;
    points.push({
      id: `usgs_${f.id}`,
      layer: "sismos",
      lat,
      lon,
      label: `M${f.properties.mag} ${f.properties.place}`,
      summary: `Sismo magnitud ${f.properties.mag} cerca de ${f.properties.place} (USGS).`,
      sourceUrl: f.properties.url,
      magnitude: f.properties.mag,
      color: f.properties.mag >= 5 ? "#c0392b" : "#e67e22",
      meta: { mag: f.properties.mag, src: "usgs" },
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
  setHealth({
    source: "usgs",
    status: "ok",
    lastOk: now,
    latencyMs: res.latencyMs,
    errorStreak: 0,
    cadenceSec: 20,
  });
  return { points, events };
}

async function pollEmsc(): Promise<{ points: MapLayerPoint[]; events: EventItem[] }> {
  const url = `https://www.seismicportal.eu/fdsnws/event/1/query?minlatitude=${BOLIVIA_BBOX.minLat}&maxlatitude=${BOLIVIA_BBOX.maxLat}&minlongitude=${BOLIVIA_BBOX.minLon}&maxlongitude=${BOLIVIA_BBOX.maxLon}&format=json&limit=80&orderby=time`;
  const res = await withCircuit("emsc", async () =>
    fetchJson<{ features?: EmscFeature[] }>(url, 20_000)
  );
  if (!res.ok) {
    setHealth({
      source: "emsc",
      status: "error",
      latencyMs: res.latencyMs,
      errorStreak: 1,
      message: res.error,
      cadenceSec: 30,
    });
    return { points: [], events: [] };
  }
  const now = new Date().toISOString();
  const points: MapLayerPoint[] = [];
  const events: EventItem[] = [];
  for (const f of res.value.features ?? []) {
    const lon = Number(f.geometry?.coordinates?.[0]);
    const lat = Number(f.geometry?.coordinates?.[1]);
    const mag = Number(f.properties?.mag);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(mag)) continue;
    if (!inBolivia(lat, lon)) continue;
    const place =
      f.properties?.flynn_region || f.properties?.place || "región Bolivia";
    const id = String(f.id ?? `${lat}_${lon}_${mag}`);
    const when = f.properties?.time || f.properties?.lastupdate || now;
    points.push({
      id: `emsc_${id}`,
      layer: "sismos",
      lat,
      lon,
      label: `M${mag} ${place}`,
      summary: `Sismo magnitud ${mag} · ${place} (EMSC).`,
      sourceUrl: f.properties?.url || "https://www.emsc-csem.org/",
      magnitude: mag,
      color: mag >= 5 ? "#c0392b" : "#e67e22",
      meta: { mag, src: "emsc" },
    });
    events.push({
      id: hashId("emsc", id),
      domain: "clima",
      title: `M${mag} ${place}`,
      source: "EMSC",
      sourceUrl: f.properties?.url,
      occurredAt: new Date(when).toISOString(),
      ingestedAt: now,
      geo: { lat, lon, place },
      metrics: { magnitude: mag },
      urgency: mag >= 5 ? "breaking" : "normal",
      tags: ["sismo", "emsc"],
    });
  }
  setHealth({
    source: "emsc",
    status: "ok",
    lastOk: now,
    latencyMs: res.latencyMs,
    errorStreak: 0,
    cadenceSec: 30,
  });
  return { points, events };
}

async function pollInpeQueimadas(): Promise<MapLayerPoint[]> {
  if (inpeCache && Date.now() - inpeCache.at < INPE_TTL_MS) {
    setHealth({
      source: "inpe-queimadas",
      status: "ok",
      lastOk: new Date(inpeCache.at).toISOString(),
      latencyMs: 0,
      errorStreak: 0,
      message: `cache ${inpeCache.day} · ${inpeCache.points.length} focos`,
      cadenceSec: 60,
    });
    return inpeCache.points;
  }

  const res = await withCircuit(
    "inpe-queimadas",
    async () => {
      let lastErr: Error | null = null;
      for (let offset = 0; offset <= 2; offset++) {
        const day = ymdLaPaz(offset);
        const url = `https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/diario/America_Sul/focos_diario_${day}.csv`;
        try {
          const text = await fetchText(url, 60_000);
          return { day, text };
        } catch (err) {
          lastErr = err instanceof Error ? err : new Error(String(err));
        }
      }
      throw lastErr ?? new Error("INPE CSV no disponible");
    },
    { threshold: 3, coolDownMs: 120_000 }
  );

  if (!res.ok) {
    setHealth({
      source: "inpe-queimadas",
      status: "error",
      latencyMs: res.latencyMs,
      errorStreak: 1,
      message: res.error,
      cadenceSec: 60,
    });
    return inpeCache?.points ?? [];
  }

  const lines = res.value.text.split(/\r?\n/);
  const candidates: Array<MapLayerPoint & { frp: number }> = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !/Bolivia/i.test(line)) continue;
    const cols = line.split(",");
    if (cols.length < 8) continue;
    const id = cols[0]?.trim();
    const lat = Number(cols[1]);
    const lon = Number(cols[2]);
    const sat = cols[4]?.trim() || "satélite";
    const muni = cols[5]?.trim() || "";
    const estado = cols[6]?.trim() || "";
    const frp = Number(cols[15]) || 0;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inBolivia(lat, lon)) continue;
    candidates.push({
      id: `inpe_${id || `${lat}_${lon}_${i}`}`,
      layer: "incendios",
      lat,
      lon,
      label: muni ? `Foco ${muni}` : "Foco de calor INPE",
      summary: `Detección ${sat}${estado ? ` · ${estado}` : ""}${frp ? ` · FRP ${frp.toFixed(0)}` : ""} (INPE Queimadas).`,
      sourceUrl: "https://terrabrasilis.dpi.inpe.br/queimadas/portal/",
      color: frp >= 80 ? "#ff3d5a" : "#e74c3c",
      meta: { frp, src: "inpe" },
      frp,
    });
  }

  candidates.sort((a, b) => b.frp - a.frp);
  const points: MapLayerPoint[] = candidates.slice(0, MAX_FIRES).map(({ frp: _f, ...p }) => p);
  inpeCache = { at: Date.now(), points, day: res.value.day };
  setHealth({
    source: "inpe-queimadas",
    status: "ok",
    lastOk: new Date().toISOString(),
    latencyMs: res.latencyMs,
    errorStreak: 0,
    message: `${res.value.day} · ${points.length}/${candidates.length} focos BO`,
    cadenceSec: 60,
  });
  return points;
}

async function pollFirms(): Promise<MapLayerPoint[]> {
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) {
    setHealth({
      source: "firms",
      status: "stale",
      errorStreak: 0,
      message: "FIRMS_MAP_KEY opcional — INPE cubre focos BO",
      cadenceSec: 60,
    });
    return [];
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
    return [];
  }
  const lines = res.value.trim().split(/\r?\n/);
  const points: MapLayerPoint[] = [];
  for (let i = 1; i < lines.length && points.length < 120; i++) {
    const cols = lines[i].split(",");
    const lat = Number(cols[0]);
    const lon = Number(cols[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inBolivia(lat, lon)) continue;
    points.push({
      id: `firms_${i}_${lat}_${lon}`,
      layer: "incendios",
      lat,
      lon,
      label: "Foco VIIRS NASA",
      summary: "Detección satelital NASA FIRMS (VIIRS) de calor/incendio.",
      sourceUrl: "https://firms.modaps.eosdis.nasa.gov/map/",
      color: "#ff6b35",
      meta: { frp: 0, src: "firms" },
    });
  }
  setHealth({
    source: "firms",
    status: "ok",
    lastOk: new Date().toISOString(),
    latencyMs: res.latencyMs,
    errorStreak: 0,
    cadenceSec: 60,
  });
  return points;
}

async function pollWeather(): Promise<MapLayerPoint[]> {
  const res = await withCircuit(
    "open-meteo",
    async () => {
      const lats = BOLIVIA_CITIES.map((c) => c.lat).join(",");
      const lons = BOLIVIA_CITIES.map((c) => c.lon).join(",");

      type WxPayload = {
        latitude?: number;
        longitude?: number;
        current?: {
          temperature_2m?: number;
          weather_code?: number;
          wind_speed_10m?: number;
        };
      };

      const wxRaw = await fetchJson<WxPayload | WxPayload[]>(
        `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,weather_code,wind_speed_10m&timezone=America%2FLa_Paz`,
        20_000
      );
      const wxList = Array.isArray(wxRaw) ? wxRaw : [wxRaw];

      let aqList: Array<{ current?: { us_aqi?: number } }> = [];
      try {
        const aqRaw = await fetchJson<
          { current?: { us_aqi?: number } } | Array<{ current?: { us_aqi?: number } }>
        >(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=us_aqi`,
          20_000
        );
        aqList = Array.isArray(aqRaw) ? aqRaw : [aqRaw];
      } catch {
        /* AQI optional */
      }

      const now = new Date().toISOString();
      const rows: WeatherCity[] = BOLIVIA_CITIES.map((city, i) => ({
        ...city,
        tempC: wxList[i]?.current?.temperature_2m,
        weatherCode: wxList[i]?.current?.weather_code,
        windKmh: wxList[i]?.current?.wind_speed_10m,
        aqi: aqList[i]?.current?.us_aqi,
        updatedAt: now,
      }));

      if (!rows.some((r) => r.tempC !== undefined)) {
        throw new Error("Open-Meteo sin temperaturas");
      }
      return rows;
    },
    { threshold: 3, coolDownMs: 45_000 }
  );

  if (!res.ok) {
    setHealth({
      source: "open-meteo",
      status: "error",
      latencyMs: res.latencyMs,
      errorStreak: 1,
      message: res.error,
      cadenceSec: 120,
    });
    return [];
  }

  setWeather(res.value);
  setHealth({
    source: "open-meteo",
    status: "ok",
    lastOk: new Date().toISOString(),
    latencyMs: res.latencyMs,
    errorStreak: 0,
    cadenceSec: 120,
  });

  return res.value
    .filter((c) => typeof c.tempC === "number")
    .map((c) => ({
      id: `wx_${c.name}`,
      layer: "clima" as const,
      lat: c.lat,
      lon: c.lon,
      label: `${c.name} ${c.tempC!.toFixed(0)}°C`,
      summary: `Temperatura ${c.tempC!.toFixed(1)}°C · viento ${Number(c.windKmh ?? 0).toFixed(0)} km/h${
        c.aqi !== undefined ? ` · AQI ${c.aqi}` : ""
      } (Open-Meteo).`,
      sourceUrl: "https://open-meteo.com/",
      color: "#3da9ff",
      meta: {
        tempC: c.tempC!,
        ...(c.aqi !== undefined ? { aqi: c.aqi } : {}),
      },
    }));
}

async function pollEonet(): Promise<{
  fires: MapLayerPoint[];
  alerts: MapLayerPoint[];
  events: EventItem[];
}> {
  const url = `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=200&bbox=${BOLIVIA_BBOX.minLon},${BOLIVIA_BBOX.minLat},${BOLIVIA_BBOX.maxLon},${BOLIVIA_BBOX.maxLat}`;
  const res = await withCircuit("eonet", async () =>
    fetchJson<{ events?: EonetEvent[] }>(url, 25_000)
  );
  if (!res.ok) {
    setHealth({
      source: "eonet",
      status: "error",
      latencyMs: res.latencyMs,
      errorStreak: 1,
      message: res.error,
      cadenceSec: 60,
    });
    return { fires: [], alerts: [], events: [] };
  }

  const now = new Date().toISOString();
  const fires: MapLayerPoint[] = [];
  const alerts: MapLayerPoint[] = [];
  const events: EventItem[] = [];
  const cutoff = Date.now() - 120 * 86_400_000; // ~4 months of open events

  for (const ev of res.value.events ?? []) {
    const title = ev.title ?? "";
    const cat = (ev.categories?.[0]?.id || ev.categories?.[0]?.title || "").toLowerCase();
    const geom = [...(ev.geometry ?? [])].reverse().find((g) => g.coordinates);
    const pt = pointFromCoords(geom?.coordinates as number[] | number[][] | undefined);
    const titleBo = /bolivia/i.test(title);
    if (!pt && !titleBo) continue;
    const lat = pt?.lat ?? -16.5;
    const lon = pt?.lon ?? -64.5;
    if (pt && !inBolivia(lat, lon) && !titleBo) continue;
    if (!pt && !titleBo) continue;

    const when = geom?.date ? new Date(geom.date).getTime() : Date.now();
    if (Number.isFinite(when) && when < cutoff && !titleBo) continue;

    const sourceUrl = ev.sources?.[0]?.url || ev.link || `https://eonet.gsfc.nasa.gov/api/v3/events/${ev.id}`;
    const isFire = /wildfire|fire/.test(cat) || /wildfire|incendio/i.test(title);
    const point: MapLayerPoint = {
      id: `eonet_${ev.id}`,
      layer: isFire ? "incendios" : "alertas",
      lat,
      lon,
      label: title.slice(0, 80),
      summary: `NASA EONET · ${ev.categories?.[0]?.title ?? "evento natural"}.`,
      sourceUrl,
      color: isFire ? "#ff7043" : "#f39c12",
      meta: { src: "eonet" },
    };
    if (isFire) fires.push(point);
    else alerts.push(point);

    events.push({
      id: hashId("eonet", ev.id),
      domain: isFire ? "clima" : "seguridad",
      title,
      source: "NASA EONET",
      sourceUrl,
      occurredAt: geom?.date || now,
      ingestedAt: now,
      geo: { lat, lon },
      urgency: /severe|red|orange/i.test(title) ? "breaking" : "normal",
      tags: ["eonet", cat || "hazard"],
    });
  }

  setHealth({
    source: "eonet",
    status: "ok",
    lastOk: now,
    latencyMs: res.latencyMs,
    errorStreak: 0,
    message: `${fires.length} fuegos · ${alerts.length} alertas`,
    cadenceSec: 60,
  });
  return { fires: fires.slice(0, 40), alerts: alerts.slice(0, 40), events };
}

async function pollGdacs(): Promise<{ points: MapLayerPoint[]; events: EventItem[] }> {
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
    return { points: [], events: [] };
  }
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(res.value);
  const items = doc?.rss?.channel?.item;
  const list = Array.isArray(items) ? items : items ? [items] : [];
  const now = new Date().toISOString();
  const events: EventItem[] = [];
  const points: MapLayerPoint[] = [];
  for (const item of list.slice(0, 60)) {
    const title = String(item.title ?? "");
    const desc = String(item.description ?? "");
    const country = String(item["gdacs:country"] ?? "").toLowerCase();
    const blob = `${title} ${desc} ${country}`.toLowerCase();
    const lat = Number(item["geo:lat"] ?? item["georss:point"]?.split?.(" ")?.[0]);
    const lon = Number(item["geo:long"] ?? item["georss:point"]?.split?.(" ")?.[1]);
    const hasGeo = Number.isFinite(lat) && Number.isFinite(lon);
    const inBo = hasGeo && inBolivia(lat, lon);
    const isBo = blob.includes("bolivia") || inBo;
    const isAndes =
      blob.includes("peru") ||
      blob.includes("chile") ||
      blob.includes("paraguay") ||
      blob.includes("brazil") ||
      blob.includes("brasil") ||
      blob.includes("argentina");
    if (!isBo && !(isAndes && /(earthquake|flood|wildfire|volcano|drought)/i.test(title))) {
      continue;
    }
    if (hasGeo && !isBo && !inBo && !isAndes) continue;

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
      geo: hasGeo ? { lat, lon } : undefined,
      metrics: { gdacsLevel: /Orange|Red/i.test(title) ? 2 : 1 },
      urgency: /Orange|Red/i.test(title) ? "breaking" : "normal",
      tags: ["gdacs"],
    });
    if (hasGeo) {
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
        meta: { src: "gdacs" },
      });
    }
  }
  setHealth({
    source: "gdacs",
    status: "ok",
    lastOk: now,
    latencyMs: res.latencyMs,
    errorStreak: 0,
    cadenceSec: 30,
  });
  return { points, events };
}

async function pollOpenSky(): Promise<MapLayerPoint[]> {
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
    return [];
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
  setHealth({
    source: "opensky",
    status: "ok",
    lastOk: new Date().toISOString(),
    latencyMs: res.latencyMs,
    errorStreak: 0,
    cadenceSec: 25,
  });
  return points;
}
