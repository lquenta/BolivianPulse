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

export type MapLayerPoint = {
  id: string;
  layer: "sismos" | "incendios" | "eventos" | "aviones" | "alertas";
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
    for (const key of keys) {
      const row = map.get(key);
      if (!row) continue;
      row.count += 1;
      if (!row.lastTitle) {
        row.lastTitle = ev.title;
        row.lastUrl = ev.sourceUrl;
        row.lastAt = ev.occurredAt;
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
    { k: "santa cruz", lat: -17.78, lon: -63.18, place: "Santa Cruz" },
    { k: "cochabamba", lat: -17.39, lon: -66.16, place: "Cochabamba" },
    { k: "montero", lat: -17.34, lon: -63.25, place: "Montero" },
    { k: "warnes", lat: -17.5, lon: -63.16, place: "Warnes" },
    { k: "yacuiba", lat: -22.02, lon: -63.68, place: "Yacuiba" },
    { k: "riberalta", lat: -11.01, lon: -66.09, place: "Riberalta" },
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
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s*[-–|·]\s*[^-–|·]{1,48}$/u, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
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

export function dedupeByHeadline<
  T extends { title: string; source: string; occurredAt: string },
>(items: T[]): T[] {
  const best = new Map<string, T>();
  for (const item of items) {
    const key = normalizeHeadline(item.title);
    if (!key) continue;
    const prev = best.get(key);
    if (!prev) {
      best.set(key, item);
      continue;
    }
    const nextScore = sourcePrecedence(item.source);
    const prevScore = sourcePrecedence(prev.source);
    if (nextScore > prevScore) {
      best.set(key, item);
      continue;
    }
    if (
      nextScore === prevScore &&
      new Date(item.occurredAt).getTime() > new Date(prev.occurredAt).getTime()
    ) {
      best.set(key, item);
    }
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
