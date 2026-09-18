export type Domain =
  | "economia"
  | "politica"
  | "seguridad"
  | "sociedad"
  | "clima"
  | "infra"
  | "media";

export type EventItem = {
  id: string;
  domain: Domain;
  title: string;
  summary?: string;
  source: string;
  sourceUrl?: string;
  occurredAt: string;
  ingestedAt: string;
  geo?: { lat: number; lon: number; place?: string };
  metrics?: Record<string, number>;
  tags?: string[];
  media?: { type: "video" | "image" | "live"; url: string; thumb?: string };
  urgency?: "breaking" | "high" | "normal";
};

export type TickerItem = {
  id: string;
  domain: Domain;
  title: string;
  source: string;
  sourceUrl?: string;
  occurredAt: string;
  urgency: "breaking" | "economia" | "normal";
  summary?: string;
  imageUrl?: string;
};

export type SourceHealth = {
  source: string;
  status: "ok" | "stale" | "error";
  lastOk?: string;
  latencyMs?: number;
  errorStreak: number;
  message?: string;
  cadenceSec: number;
};

export type FxPoint = {
  t: string;
  official?: number;
  parallel?: number;
  buy?: number;
  sell?: number;
};

export type EconomySnapshot = {
  official?: number;
  parallel?: number;
  buy?: number;
  sell?: number;
  spreadPct?: number;
  officialUpdatedAt?: string;
  parallelUpdatedAt?: string;
  history: FxPoint[];
  exchanges?: Array<{
    name: string;
    buy: number;
    sell: number;
    median: number;
  }>;
};

export type WeatherCity = {
  name: string;
  dept: string;
  lat: number;
  lon: number;
  tempC?: number;
  weatherCode?: number;
  windKmh?: number;
  aqi?: number;
  updatedAt?: string;
};

export type MapLayer =
  | "sismos"
  | "incendios"
  | "eventos"
  | "aviones"
  | "alertas"
  | "clima";

export type MapLayerPoint = {
  id: string;
  layer: MapLayer;
  lat: number;
  lon: number;
  label: string;
  summary?: string;
  sourceUrl?: string;
  magnitude?: number;
  color?: string;
  meta?: Record<string, string | number>;
};

export type TopicKey =
  | "bloqueos"
  | "huelgas"
  | "asesinatos"
  | "protestas"
  | "coronaciones"
  | "combustibles"
  | "dolar"
  | "sismos"
  | "incendios"
  | "inundaciones"
  | "narco"
  | "salud"
  | "elecciones"
  | "apagones";

export type TopicIndicator = {
  key: TopicKey;
  label: string;
  domain: Domain;
  count: number;
  lastTitle?: string;
  lastUrl?: string;
  lastAt?: string;
  lastSource?: string;
  lastSummary?: string;
  lastImageUrl?: string;
};

export type VideoItem = {
  id: string;
  title: string;
  channel: string;
  publishedAt: string;
  thumb?: string;
  url: string;
  live?: boolean;
};

export type DashboardBundle = {
  generatedAt: string;
  kpis: EconomySnapshot;
  events: EventItem[];
  ticker: TickerItem[];
  mapLayers: MapLayerPoint[];
  videos: VideoItem[];
  weather: WeatherCity[];
  domainCounts: Record<Domain, number>;
  topicIndicators: TopicIndicator[];
  sourceHealth: SourceHealth[];
};

/** Bounding box roughly covering Bolivia */
export const BOLIVIA_BBOX = {
  minLat: -23.0,
  maxLat: -9.5,
  minLon: -69.8,
  maxLon: -57.3,
} as const;

export const BOLIVIA_CITIES: Array<{
  name: string;
  dept: string;
  lat: number;
  lon: number;
}> = [
  { name: "La Paz", dept: "La Paz", lat: -16.5, lon: -68.15 },
  { name: "El Alto", dept: "La Paz", lat: -16.51, lon: -68.17 },
  { name: "Santa Cruz", dept: "Santa Cruz", lat: -17.78, lon: -63.18 },
  { name: "Cochabamba", dept: "Cochabamba", lat: -17.39, lon: -66.16 },
  { name: "Sucre", dept: "Chuquisaca", lat: -19.03, lon: -65.26 },
  { name: "Oruro", dept: "Oruro", lat: -17.98, lon: -67.15 },
  { name: "Potosí", dept: "Potosí", lat: -19.58, lon: -65.75 },
  { name: "Tarija", dept: "Tarija", lat: -21.53, lon: -64.73 },
  { name: "Trinidad", dept: "Beni", lat: -14.83, lon: -64.9 },
  { name: "Cobija", dept: "Pando", lat: -11.03, lon: -68.77 },
  { name: "Montero", dept: "Santa Cruz", lat: -17.34, lon: -63.25 },
  { name: "Warnes", dept: "Santa Cruz", lat: -17.5, lon: -63.16 },
  { name: "Quillacollo", dept: "Cochabamba", lat: -17.4, lon: -66.28 },
  { name: "Sacaba", dept: "Cochabamba", lat: -17.4, lon: -66.04 },
  { name: "Viacha", dept: "La Paz", lat: -16.65, lon: -68.3 },
  { name: "Riberalta", dept: "Beni", lat: -11.01, lon: -66.09 },
  { name: "Guayaramerín", dept: "Beni", lat: -10.82, lon: -65.36 },
  { name: "Yacuiba", dept: "Tarija", lat: -22.02, lon: -63.68 },
  { name: "Villazón", dept: "Potosí", lat: -22.09, lon: -65.6 },
  { name: "Uyuni", dept: "Potosí", lat: -20.46, lon: -66.82 },
  { name: "Tupiza", dept: "Potosí", lat: -21.45, lon: -65.72 },
  { name: "Camiri", dept: "Santa Cruz", lat: -20.04, lon: -63.52 },
  { name: "Puerto Suárez", dept: "Santa Cruz", lat: -18.96, lon: -57.8 },
  { name: "San Ignacio de Velasco", dept: "Santa Cruz", lat: -16.37, lon: -60.96 },
  { name: "Rurrenabaque", dept: "Beni", lat: -14.44, lon: -67.53 },
  { name: "Copacabana", dept: "La Paz", lat: -16.17, lon: -69.09 },
  { name: "Patacamaya", dept: "La Paz", lat: -17.24, lon: -67.92 },
  { name: "Llallagua", dept: "Potosí", lat: -18.42, lon: -66.58 },
  { name: "Punata", dept: "Cochabamba", lat: -17.55, lon: -65.83 },
  { name: "Bermejo", dept: "Tarija", lat: -22.73, lon: -64.34 },
];

export const BREAKING_KEYWORDS = [
  "bloqueo",
  "emergencia",
  "sismo",
  "terremoto",
  "incendio",
  "explosión",
  "explosion",
  "tiroteo",
  "masacre",
  "golpe",
  "evacuación",
  "evacuacion",
  "alerta roja",
];

export const ECONOMY_KEYWORDS = [
  "dólar",
  "dolar",
  "paralelo",
  "combustible",
  "gasolina",
  "diésel",
  "diesel",
  "ypfb",
  "bcb",
  "inflación",
  "inflacion",
  "ufv",
  "devaluación",
  "devaluacion",
];

export const DOMAIN_KEYWORDS: Record<Domain, string[]> = {
  economia: ECONOMY_KEYWORDS,
  politica: [
    "asamblea",
    "presidente",
    "ministerio",
    "elección",
    "eleccion",
    "partido",
    "congreso",
    "senado",
    "gobierno",
    "coronación",
    "coronacion",
    "jura",
    "gabinete",
  ],
  seguridad: [
    "policia",
    "policía",
    "militar",
    "narco",
    "secuestro",
    "asesinato",
    "homicidio",
    "feminicidio",
    "violencia",
    "protesta",
    "conflicto",
    "bloqueo",
    "tiroteo",
  ],
  sociedad: [
    "salud",
    "educación",
    "educacion",
    "hospital",
    "universidad",
    "transporte",
    "huelga",
    "paro",
    "manifestación",
    "manifestacion",
    "coronación",
    "coronacion",
  ],
  clima: [
    "lluvia",
    "sequía",
    "sequia",
    "inundación",
    "inundacion",
    "granizo",
    "helada",
    "incendio",
    "sismo",
  ],
  infra: ["carretera", "aeropuerto", "vial", "puente", "electricidad", "apagón", "apagon"],
  media: [],
};

export const TOPIC_DEFS: Array<{
  key: TopicKey;
  label: string;
  domain: Domain;
  keywords: string[];
}> = [
  {
    key: "bloqueos",
    label: "Bloqueos",
    domain: "seguridad",
    keywords: ["bloqueo", "bloqueos", "corte de ruta", "toma de ruta"],
  },
  {
    key: "huelgas",
    label: "Huelgas / paros",
    domain: "sociedad",
    keywords: ["huelga", "paro", "paro nacional", "cese de actividades"],
  },
  {
    key: "asesinatos",
    label: "Asesinatos / homicidios",
    domain: "seguridad",
    keywords: ["asesinato", "asesinado", "homicidio", "feminicidio", "linchamiento"],
  },
  {
    key: "protestas",
    label: "Protestas",
    domain: "seguridad",
    keywords: ["protesta", "manifestación", "manifestacion", "movilización", "movilizacion"],
  },
  {
    key: "coronaciones",
    label: "Coronaciones / actos",
    domain: "politica",
    keywords: ["coronación", "coronacion", "jura", "posesión", "posesion", "investidura"],
  },
  {
    key: "combustibles",
    label: "Combustibles",
    domain: "economia",
    keywords: ["combustible", "gasolina", "diésel", "diesel", "ypfb", "surtidor", "fila de"],
  },
  {
    key: "dolar",
    label: "Dólar / cambio",
    domain: "economia",
    keywords: ["dólar", "dolar", "paralelo", "tipo de cambio", "divisas"],
  },
  {
    key: "sismos",
    label: "Sismos",
    domain: "clima",
    keywords: ["sismo", "terremoto", "temblor"],
  },
  {
    key: "incendios",
    label: "Incendios",
    domain: "clima",
    keywords: ["incendio", "focos de calor", "quemas", "chaqueo"],
  },
  {
    key: "inundaciones",
    label: "Inundaciones",
    domain: "clima",
    keywords: ["inundación", "inundacion", "desborde", "riada"],
  },
  {
    key: "narco",
    label: "Narcotráfico",
    domain: "seguridad",
    keywords: ["narco", "droga", "cocaína", "cocaina", "narcotráfico", "narcotrafico"],
  },
  {
    key: "salud",
    label: "Salud",
    domain: "sociedad",
    keywords: ["hospital", "salud", "epidemia", "dengue", "médico", "medico"],
  },
  {
    key: "elecciones",
    label: "Elecciones",
    domain: "politica",
    keywords: ["elección", "eleccion", "electoral", "voto", "tse", "campaña", "campana"],
  },
  {
    key: "apagones",
    label: "Apagones / energía",
    domain: "infra",
    keywords: ["apagón", "apagon", "sin luz", "corte de luz", "electricidad"],
  },
];

export function matchTopics(text: string): TopicKey[] {
  const t = text.toLowerCase();
  return TOPIC_DEFS.filter((def) => def.keywords.some((k) => t.includes(k))).map((d) => d.key);
}

export function summarizeTopics(events: EventItem[]): TopicIndicator[] {
  const map = new Map<TopicKey, TopicIndicator>();
  for (const def of TOPIC_DEFS) {
    map.set(def.key, {
      key: def.key,
      label: def.label,
      domain: def.domain,
      count: 0,
    });
  }
  const sorted = [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
  for (const ev of sorted) {
    const keys = matchTopics(`${ev.title} ${ev.summary ?? ""} ${(ev.tags ?? []).join(" ")}`);
    const imageUrl = ev.media?.thumb || ev.media?.url;
    for (const key of keys) {
      const row = map.get(key);
      if (!row) continue;
      row.count += 1;
      if (!row.lastTitle) {
        row.lastTitle = ev.title;
        row.lastUrl = ev.sourceUrl;
        row.lastAt = ev.occurredAt;
        row.lastSource = ev.source;
        row.lastSummary = ev.summary?.slice(0, 140);
        row.lastImageUrl = imageUrl;
      } else if (imageUrl && !row.lastImageUrl) {
        // Prefer a story that carries a real article thumb for the tile
        row.lastTitle = ev.title;
        row.lastUrl = ev.sourceUrl;
        row.lastAt = ev.occurredAt;
        row.lastSource = ev.source;
        row.lastSummary = ev.summary?.slice(0, 140);
        row.lastImageUrl = imageUrl;
      } else if (!row.lastSummary && ev.summary) {
        row.lastSummary = ev.summary.slice(0, 140);
      }
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/** Rough place inference from text using Bolivian cities/depts */
export function inferGeoFromText(text: string): { lat: number; lon: number; place: string } | undefined {
  const t = text.toLowerCase();
  for (const city of BOLIVIA_CITIES) {
    if (t.includes(city.name.toLowerCase()) || t.includes(city.dept.toLowerCase())) {
      return { lat: city.lat, lon: city.lon, place: city.name };
    }
  }
  const aliases: Array<{ k: string; lat: number; lon: number; place: string }> = [
    { k: "el alto", lat: -16.51, lon: -68.17, place: "El Alto" },
    { k: "la paz", lat: -16.5, lon: -68.15, place: "La Paz" },
    { k: "santa cruz de la sierra", lat: -17.78, lon: -63.18, place: "Santa Cruz" },
    { k: "santa cruz", lat: -17.78, lon: -63.18, place: "Santa Cruz" },
    { k: "cochabamba", lat: -17.39, lon: -66.16, place: "Cochabamba" },
    { k: "montero", lat: -17.34, lon: -63.25, place: "Montero" },
    { k: "warnes", lat: -17.5, lon: -63.16, place: "Warnes" },
    { k: "yacuiba", lat: -22.02, lon: -63.68, place: "Yacuiba" },
    { k: "riberalta", lat: -11.01, lon: -66.09, place: "Riberalta" },
    { k: "guayaramerin", lat: -10.82, lon: -65.36, place: "Guayaramerín" },
    { k: "guayaramerín", lat: -10.82, lon: -65.36, place: "Guayaramerín" },
    { k: "rurrenabaque", lat: -14.44, lon: -67.53, place: "Rurrenabaque" },
    { k: "chapare", lat: -16.9, lon: -65.4, place: "Chapare" },
    { k: "yapacani", lat: -17.4, lon: -63.88, place: "Yapacani" },
    { k: "yapacaní", lat: -17.4, lon: -63.88, place: "Yapacani" },
    { k: "ascension de guarayos", lat: -15.9, lon: -63.18, place: "Ascensión de Guarayos" },
    { k: "san julian", lat: -17.3, lon: -62.87, place: "San Julián" },
    { k: "san julián", lat: -17.3, lon: -62.87, place: "San Julián" },
    { k: "desaguadero", lat: -16.57, lon: -69.04, place: "Desaguadero" },
    { k: "alto beni", lat: -15.5, lon: -67.4, place: "Alto Beni" },
    { k: "ixiamas", lat: -13.77, lon: -68.13, place: "Ixiamas" },
    { k: "charagua", lat: -19.79, lon: -63.2, place: "Charagua" },
    { k: "robore", lat: -18.33, lon: -59.76, place: "Roboré" },
    { k: "roboré", lat: -18.33, lon: -59.76, place: "Roboré" },
    { k: "beni", lat: -14.83, lon: -64.9, place: "Trinidad" },
    { k: "pando", lat: -11.03, lon: -68.77, place: "Cobija" },
    { k: "chuquisaca", lat: -19.03, lon: -65.26, place: "Sucre" },
  ];
  for (const a of aliases) {
    if (t.includes(a.k)) return { lat: a.lat, lon: a.lon, place: a.place };
  }
  return undefined;
}

export function classifyDomain(text: string): Domain {
  const t = text.toLowerCase();
  let best: Domain = "sociedad";
  let score = 0;
  (Object.keys(DOMAIN_KEYWORDS) as Domain[]).forEach((domain) => {
    const hits = DOMAIN_KEYWORDS[domain].filter((k) => t.includes(k)).length;
    if (hits > score) {
      score = hits;
      best = domain;
    }
  });
  return best;
}

export function detectUrgency(
  title: string,
  domain: Domain,
  metrics?: Record<string, number>
): TickerItem["urgency"] {
  const t = title.toLowerCase();
  if (
    BREAKING_KEYWORDS.some((k) => t.includes(k)) ||
    (metrics?.magnitude !== undefined && metrics.magnitude >= 5) ||
    (metrics?.gdacsLevel !== undefined && metrics.gdacsLevel >= 2)
  ) {
    return "breaking";
  }
  if (domain === "economia" || ECONOMY_KEYWORDS.some((k) => t.includes(k))) {
    return "economia";
  }
  return "normal";
}

export function hashId(...parts: string[]): string {
  const s = parts.join("|");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `e_${Math.abs(h).toString(36)}`;
}

/** Collapse near-identical headlines for dedupe (strip accents, trailing " - fuente"). */
export function normalizeHeadline(title: string): string {
  let t = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  // Strip trailing publisher segments once or twice ("Title - Outlet - Google News")
  for (let i = 0; i < 2; i++) {
    t = t.replace(/\s*[-–|·]\s*[^-–|·]{1,56}$/u, "");
  }
  return t
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Soft key: first meaningful words — catches near-duplicates with slightly different tails. */
export function headlineDedupeKey(title: string): string {
  const words = normalizeHeadline(title)
    .split(" ")
    .filter((w) => w.length > 2);
  return words.slice(0, 5).join(" ");
}

/** Title for UI: drop trailing " - Publisher" so source isn't shown twice. */
export function displayHeadline(title: string): string {
  let t = title.trim();
  for (let i = 0; i < 2; i++) {
    const next = t.replace(/\s*[-–|·]\s*[^-–|·]{2,48}$/u, "").trim();
    if (next.length < 18 || next === t) break;
    t = next;
  }
  return t;
}

/** True when summary just repeats the headline (avoid double titular). */
export function isRedundantSummary(title: string, summary?: string): boolean {
  if (!summary) return true;
  const a = normalizeHeadline(title);
  const b = normalizeHeadline(summary).slice(0, Math.max(a.length + 8, 48));
  if (!a || !b) return true;
  if (a === normalizeHeadline(summary) || b.startsWith(a) || a.startsWith(b.slice(0, a.length))) {
    return true;
  }
  const aw = a.split(" ").slice(0, 6).join(" ");
  const bw = normalizeHeadline(summary).split(" ").slice(0, 6).join(" ");
  return Boolean(aw) && aw === bw;
}

function mediaScore(item: { media?: { thumb?: string; url?: string }; imageUrl?: string }): number {
  if (item.media?.thumb || item.media?.url || item.imageUrl) return 1;
  return 0;
}

function mergeHeadlineItems<
  T extends {
    title: string;
    source: string;
    occurredAt: string;
    summary?: string;
    media?: { type?: string; url?: string; thumb?: string };
    imageUrl?: string;
  },
>(prev: T, next: T): T {
  const preferNext =
    sourcePrecedence(next.source) > sourcePrecedence(prev.source) ||
    (sourcePrecedence(next.source) === sourcePrecedence(prev.source) &&
      new Date(next.occurredAt).getTime() > new Date(prev.occurredAt).getTime()) ||
    (mediaScore(next) > mediaScore(prev) &&
      sourcePrecedence(next.source) >= sourcePrecedence(prev.source) - 10);

  const winner = preferNext ? { ...next } : { ...prev };
  const other = preferNext ? prev : next;

  if (!winner.media && other.media) winner.media = other.media;
  if (!winner.imageUrl && other.imageUrl) winner.imageUrl = other.imageUrl;
  if (!winner.imageUrl && winner.media) {
    winner.imageUrl = winner.media.thumb || winner.media.url;
  }
  if (
    (!winner.summary || isRedundantSummary(winner.title, winner.summary)) &&
    other.summary &&
    !isRedundantSummary(winner.title, other.summary)
  ) {
    winner.summary = other.summary;
  }
  return winner;
}

/** Higher = preferred when two stories share the same normalized title. */
export function sourcePrecedence(source: string): number {
  const s = source.toLowerCase();
  if (s.startsWith("los tiempos")) return 100;
  if (/(unitel|red uno|atb|bolivia tv|rtp|pat|erbol|abi)/.test(s)) return 85;
  if (/(correo del sur|el deber|opinion|página siete|pagina siete|oxígeno|oxigeno)/.test(s))
    return 80;
  if (s.startsWith("google news")) return 35;
  if (/(gdelt|reliefweb)/.test(s)) return 15;
  if (/(usgs|gdacs|firms|opensky)/.test(s)) return 10;
  return 55;
}

const SOURCE_FAVICON_DOMAINS: Array<{ match: RegExp; domain: string }> = [
  { match: /los tiempos/i, domain: "lostiempos.com" },
  { match: /el deber/i, domain: "eldeber.com.bo" },
  { match: /unitel/i, domain: "unitel.bo" },
  { match: /red uno/i, domain: "reduno.com.bo" },
  { match: /correo del sur/i, domain: "correodelsur.com" },
  { match: /p[aá]gina siete/i, domain: "paginasiete.bo" },
  { match: /opini[oó]n/i, domain: "opinion.com.bo" },
  { match: /ox[ií]geno/i, domain: "oxigeno.bo" },
  { match: /erbol/i, domain: "erbol.com.bo" },
  { match: /abi\b/i, domain: "abi.bo" },
  { match: /urgentebo/i, domain: "urgentebo.com" },
  { match: /la raz[oó]n/i, domain: "la-razon.com" },
  { match: /gdacs/i, domain: "gdacs.org" },
  { match: /reliefweb/i, domain: "reliefweb.int" },
];

function publisherFromTitle(title?: string): string | undefined {
  if (!title) return undefined;
  const m = title.match(/\s[-–|]\s([^–|-]{2,40})$/);
  return m?.[1]?.trim();
}

/** Favicon URL for a news source (avoids useless google.com icons). */
export function sourceFaviconUrl(opts: {
  source?: string;
  title?: string;
  url?: string;
}): string | undefined {
  const { source, title, url } = opts;
  if (url) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      if (
        host &&
        !host.includes("google.") &&
        !host.includes("news.google") &&
        !host.includes("gstatic.")
      ) {
        return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
      }
    } catch {
      /* ignore */
    }
  }

  const hint = `${source ?? ""} ${publisherFromTitle(title) ?? ""}`.trim();
  if (!hint) return undefined;
  for (const row of SOURCE_FAVICON_DOMAINS) {
    if (row.match.test(hint)) {
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(row.domain)}&sz=64`;
    }
  }
  return undefined;
}

export function dedupeByHeadline<
  T extends {
    title: string;
    source: string;
    occurredAt: string;
    summary?: string;
    media?: { type?: string; url?: string; thumb?: string };
    imageUrl?: string;
  },
>(items: T[]): T[] {
  const best = new Map<string, T>();
  for (const item of items) {
    const key = headlineDedupeKey(item.title);
    if (!key) continue;
    const prev = best.get(key);
    if (!prev) {
      best.set(key, item);
      continue;
    }
    best.set(key, mergeHeadlineItems(prev, item));
  }
  return [...best.values()];
}

export function inBolivia(lat: number, lon: number): boolean {
  return (
    lat >= BOLIVIA_BBOX.minLat &&
    lat <= BOLIVIA_BBOX.maxLat &&
    lon >= BOLIVIA_BBOX.minLon &&
    lon <= BOLIVIA_BBOX.maxLon
  );
}
