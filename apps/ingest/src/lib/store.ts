import fs from "node:fs";
import path from "node:path";
import {
  dedupeByHeadline,
  detectUrgency,
  inferGeoFromText,
  summarizeTopics,
  type DashboardBundle,
  type Domain,
  type EconomySnapshot,
  type EventItem,
  type MapLayerPoint,
  type SourceHealth,
  type TickerItem,
  type VideoItem,
  type WeatherCity,
} from "@bo-dash/shared";

const DATA_DIR = (() => {
  const fromEnv = process.env.DATA_DIR;
  if (fromEnv) return path.resolve(fromEnv);
  // monorepo root /data whether cwd is root, apps/web, or apps/ingest
  const cwd = process.cwd();
  if (cwd.replace(/\\/g, "/").endsWith("/apps/web") || cwd.replace(/\\/g, "/").endsWith("/apps/ingest")) {
    return path.resolve(cwd, "..", "..", "data");
  }
  return path.resolve(cwd, "data");
})();
const BUNDLE_PATH = path.join(DATA_DIR, "bundle.json");

export type StoreState = {
  events: Map<string, EventItem>;
  economy: EconomySnapshot;
  mapLayers: MapLayerPoint[];
  videos: VideoItem[];
  weather: WeatherCity[];
  sourceHealth: Map<string, SourceHealth>;
  historyOfficial: Array<{ t: string; v: number }>;
  historyParallel: Array<{ t: string; v: number }>;
};

function emptyEconomy(): EconomySnapshot {
  return { history: [], exchanges: [] };
}

function createState(): StoreState {
  return {
    events: new Map(),
    economy: emptyEconomy(),
    mapLayers: [],
    videos: [],
    weather: [],
    sourceHealth: new Map(),
    historyOfficial: [],
    historyParallel: [],
  };
}

let state = createState();
let redis: import("ioredis").default | null = null;
let redisTried = false;

async function getRedis() {
  if (redisTried) return redis;
  redisTried = true;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    const Redis = (await import("ioredis")).default;
    redis = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    await redis.connect();
    return redis;
  } catch {
    redis = null;
    return null;
  }
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function upsertEvents(items: EventItem[]) {
  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  for (const item of items) {
    state.events.set(item.id, item);
  }
  for (const [id, ev] of state.events) {
    if (new Date(ev.occurredAt).getTime() < cutoff) state.events.delete(id);
  }
}

export function setEconomy(partial: Partial<EconomySnapshot>) {
  const next: Partial<EconomySnapshot> = { ...partial };
  if ("official" in next) next.official = coerceRate(next.official);
  if ("parallel" in next) next.parallel = coerceRate(next.parallel);
  if ("buy" in next) next.buy = coerceRate(next.buy);
  if ("sell" in next) next.sell = coerceRate(next.sell);
  state.economy = { ...state.economy, ...next };
  if (typeof next.official === "number") {
    state.historyOfficial.push({ t: new Date().toISOString(), v: next.official });
    if (state.historyOfficial.length > 500) state.historyOfficial.shift();
  }
  if (typeof next.parallel === "number") {
    state.historyParallel.push({ t: new Date().toISOString(), v: next.parallel });
    if (state.historyParallel.length > 500) state.historyParallel.shift();
  }
  const times = new Set([
    ...state.historyOfficial.map((p) => p.t),
    ...state.historyParallel.map((p) => p.t),
  ]);
  state.economy.history = [...times]
    .sort()
    .slice(-200)
    .map((t) => ({
      t,
      official: state.historyOfficial.find((p) => p.t === t)?.v ?? state.economy.official,
      parallel: state.historyParallel.find((p) => p.t === t)?.v ?? state.economy.parallel,
    }));
  if (typeof state.economy.official === "number" && typeof state.economy.parallel === "number") {
    state.economy.spreadPct =
      ((state.economy.parallel - state.economy.official) / state.economy.official) * 100;
  }
}

function coerceRate(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.valor === "number") return o.valor;
    if (typeof o.compra === "number") return o.compra;
    if (typeof o.median === "number") return o.median;
  }
  return undefined;
}

export function setMapLayer(layer: MapLayerPoint["layer"], points: MapLayerPoint[]) {
  state.mapLayers = [
    ...state.mapLayers.filter((p) => p.layer !== layer),
    ...points,
  ];
}

export function setVideos(videos: VideoItem[]) {
  state.videos = videos.slice(0, 24);
}

export function setWeather(weather: WeatherCity[]) {
  state.weather = weather;
}

export function setHealth(health: SourceHealth) {
  state.sourceHealth.set(health.source, health);
}

export function buildTicker(limit = 60): TickerItem[] {
  const events = dedupeByHeadline(
    [...state.events.values()].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )
  );
  return events.slice(0, limit).map((ev) => ({
    id: ev.id,
    domain: ev.domain,
    title: ev.title,
    source: ev.source,
    sourceUrl: ev.sourceUrl,
    occurredAt: ev.occurredAt,
    urgency: detectUrgency(ev.title, ev.domain, ev.metrics),
    summary: ev.summary?.slice(0, 180),
    imageUrl: ev.media?.thumb || ev.media?.url,
  }));
}

export function domainCounts(): Record<Domain, number> {
  const counts: Record<Domain, number> = {
    economia: 0,
    politica: 0,
    seguridad: 0,
    sociedad: 0,
    clima: 0,
    infra: 0,
    media: 0,
  };
  for (const ev of state.events.values()) counts[ev.domain] += 1;
  return counts;
}

function syncNewsMapLayer(events: EventItem[]) {
  const points: MapLayerPoint[] = [];
  for (const ev of events) {
    const geo =
      ev.geo ??
      inferGeoFromText(`${ev.title} ${ev.summary ?? ""}`);
    if (!geo) continue;
    const topics = (ev.tags ?? []).join(", ");
    points.push({
      id: `evt_${ev.id}`,
      layer: "eventos",
      lat: geo.lat,
      lon: geo.lon,
      label: ev.title.slice(0, 90),
      summary:
        ev.summary?.slice(0, 180) ||
        `${ev.domain.toUpperCase()} · ${ev.source}${topics ? ` · ${topics}` : ""}`,
      sourceUrl: ev.sourceUrl,
      color:
        ev.domain === "seguridad"
          ? "#c44536"
          : ev.domain === "economia"
            ? "#d4a017"
            : ev.domain === "politica"
              ? "#5b8def"
              : "#3d8b6e",
      meta: { domain: ev.domain, source: ev.source },
    });
  }
  // Keep newest unique places first
  const seen = new Set<string>();
  const unique: MapLayerPoint[] = [];
  for (const p of points) {
    const key = `${p.lat.toFixed(2)},${p.lon.toFixed(2)},${p.label.slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
    if (unique.length >= 80) break;
  }
  setMapLayer("eventos", unique);
}

export function buildBundle(): DashboardBundle {
  const events = dedupeByHeadline(
    [...state.events.values()].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )
  );
  syncNewsMapLayer(events);
  return {
    generatedAt: new Date().toISOString(),
    kpis: state.economy,
    events: events.slice(0, 200),
    ticker: buildTicker(),
    mapLayers: state.mapLayers,
    videos: [],
    weather: state.weather,
    domainCounts: domainCounts(),
    topicIndicators: summarizeTopics(events),
    sourceHealth: [...state.sourceHealth.values()],
  };
}

export async function persistBundle() {
  const bundle = buildBundle();
  ensureDataDir();
  fs.writeFileSync(BUNDLE_PATH, JSON.stringify(bundle, null, 2), "utf8");
  const r = await getRedis();
  if (r) {
    await r.set("dashboard:bundle", JSON.stringify(bundle));
    await r.set("ticker:headlines", JSON.stringify(bundle.ticker));
  }
  return bundle;
}

export async function loadBundle(): Promise<DashboardBundle | null> {
  const r = await getRedis();
  if (r) {
    const raw = await r.get("dashboard:bundle");
    if (raw) return JSON.parse(raw) as DashboardBundle;
  }
  try {
    if (fs.existsSync(BUNDLE_PATH)) {
      return JSON.parse(fs.readFileSync(BUNDLE_PATH, "utf8")) as DashboardBundle;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function getState() {
  return state;
}

export function resetState() {
  state = createState();
}
