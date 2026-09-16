import {
  classifyDomain,
  detectUrgency,
  hashId,
  inferGeoFromText,
  matchTopics,
  type EventItem,
} from "@bo-dash/shared";
import { XMLParser } from "fast-xml-parser";
import { fetchText, withCircuit } from "../lib/http";
import { setHealth, upsertEvents } from "../lib/store";

const gn = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=es-419&gl=BO&ceid=BO:es`;

const FEEDS: Array<{ source: string; url: string }> = [
  { source: "Los Tiempos", url: "https://www.lostiempos.com/rss/ultimas" },
  { source: "Los Tiempos Portada", url: "https://www.lostiempos.com/rss/portada" },
  { source: "Los Tiempos Actualidad", url: "https://www.lostiempos.com/rss/actualidad" },
  { source: "Los Tiempos Deportes", url: "https://www.lostiempos.com/rss/deportes" },
  { source: "Google News BO", url: gn("Bolivia") },
  { source: "Google News Dólar", url: gn("dólar OR paralelo Bolivia") },
  { source: "Google News Bloqueos", url: gn("bloqueos Bolivia") },
  { source: "Google News Combustibles", url: gn("combustibles OR gasolina OR diésel Bolivia YPFB") },
  { source: "Google News Huelgas", url: gn("huelga OR paro Bolivia") },
  { source: "Google News Protestas", url: gn("protesta OR manifestación Bolivia") },
  { source: "Google News Seguridad", url: gn("asesinato OR homicidio OR feminicidio Bolivia") },
  { source: "Google News Política", url: gn("Asamblea OR presidente OR gobierno Bolivia") },
  { source: "Google News Clima", url: gn("incendio OR inundación OR sequía Bolivia") },
  { source: "Google News Salud", url: gn("hospital OR dengue OR salud Bolivia") },
  { source: "Google News Coronación", url: gn("coronación OR jura OR posesión Bolivia") },
  { source: "Google News Santa Cruz", url: gn("Santa Cruz Bolivia") },
  { source: "Google News La Paz", url: gn("La Paz El Alto Bolivia") },
  { source: "Google News Cochabamba", url: gn("Cochabamba Bolivia") },
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function asArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function enrichEvent(partial: Omit<EventItem, "tags" | "geo" | "urgency"> & Partial<EventItem>): EventItem {
  const blob = `${partial.title} ${partial.summary ?? ""}`;
  const topics = matchTopics(blob);
  const domain = partial.domain ?? classifyDomain(blob);
  return {
    ...partial,
    domain,
    geo: partial.geo ?? inferGeoFromText(blob),
    urgency: detectUrgency(partial.title, domain, partial.metrics) === "breaking" ? "breaking" : "normal",
    tags: [...new Set([...(partial.tags ?? []), domain, ...topics])],
  };
}

function parseRss(xml: string, source: string): EventItem[] {
  const doc = parser.parse(xml);
  const channel = doc?.rss?.channel ?? doc?.feed;
  const items = asArray(channel?.item ?? channel?.entry);
  const now = new Date().toISOString();
  return items
    .map((item) => {
      const title = String(item.title?.["#text"] ?? item.title ?? "").trim();
      const linkRaw = item.link?.["@_href"] ?? item.link ?? item.id ?? "";
      const link = String(Array.isArray(linkRaw) ? linkRaw[0] : linkRaw).trim();
      const pub =
        item.pubDate ?? item.published ?? item.updated ?? item["dc:date"] ?? now;
      const summary = String(item.description ?? item.summary ?? "")
        .replace(/<[^>]+>/g, "")
        .slice(0, 280);
      if (!title) return null;
      const occurredAt = new Date(pub).toISOString();
      return enrichEvent({
        id: hashId(source, link || title, occurredAt),
        domain: classifyDomain(`${title} ${summary}`),
        title,
        summary,
        source,
        sourceUrl: link || undefined,
        occurredAt,
        ingestedAt: now,
      });
    })
    .filter(Boolean) as EventItem[];
}

async function parseReliefWeb(): Promise<EventItem[]> {
  const url =
    "https://api.reliefweb.int/v1/reports?appname=bo-dash&filter[field]=primary_country&filter[value]=Bolivia&limit=20";
  const data = (await fetch(url, {
    headers: { "User-Agent": "BoliviaPulseDashboard/1.0" },
  }).then((r) => r.json())) as {
    data?: Array<{
      id: number;
      fields?: { title?: string; url?: string; date?: { created?: string }; body?: string };
    }>;
  };
  const now = new Date().toISOString();
  return (data.data ?? []).map((row) => {
    const title = row.fields?.title ?? `ReliefWeb ${row.id}`;
    const summary = (row.fields?.body ?? "").replace(/<[^>]+>/g, "").slice(0, 280);
    const occurredAt = row.fields?.date?.created
      ? new Date(row.fields.date.created).toISOString()
      : now;
    return enrichEvent({
      id: hashId("reliefweb", String(row.id)),
      domain: classifyDomain(title),
      title,
      summary,
      source: "ReliefWeb",
      sourceUrl: row.fields?.url,
      occurredAt,
      ingestedAt: now,
      tags: ["humanitario"],
    });
  });
}

export async function pollNews() {
  const all: EventItem[] = [];

  for (const feed of FEEDS) {
    const res = await withCircuit(`rss:${feed.source}`, async () => fetchText(feed.url));
    if (!res.ok) {
      setHealth({
        source: `rss:${feed.source}`,
        status: "error",
        latencyMs: res.latencyMs,
        errorStreak: 1,
        message: res.error,
        cadenceSec: 30,
      });
      continue;
    }
    try {
      const items = parseRss(res.value, feed.source);
      all.push(...items);
      setHealth({
        source: `rss:${feed.source}`,
        status: "ok",
        lastOk: new Date().toISOString(),
        latencyMs: res.latencyMs,
        errorStreak: 0,
        cadenceSec: 30,
      });
    } catch (err) {
      setHealth({
        source: `rss:${feed.source}`,
        status: "error",
        latencyMs: res.latencyMs,
        errorStreak: 1,
        message: err instanceof Error ? err.message : String(err),
        cadenceSec: 30,
      });
    }
  }

  const relief = await withCircuit("reliefweb", parseReliefWeb);
  if (relief.ok) {
    all.push(...relief.value);
    setHealth({
      source: "reliefweb",
      status: "ok",
      lastOk: new Date().toISOString(),
      latencyMs: relief.latencyMs,
      errorStreak: 0,
      cadenceSec: 30,
    });
  } else {
    setHealth({
      source: "reliefweb",
      status: "error",
      latencyMs: relief.latencyMs,
      errorStreak: 1,
      message: relief.error,
      cadenceSec: 30,
    });
  }

  const gdeltUrl =
    "https://api.gdeltproject.org/api/v2/doc/doc?query=Bolivia&mode=ArtList&maxrecords=40&format=json&sort=HybridRel";
  const gdelt = await withCircuit(
    "gdelt",
    async () =>
      fetchJsonSafe<{
        articles?: Array<{
          title?: string;
          url?: string;
          seendate?: string;
          domain?: string;
        }>;
      }>(gdeltUrl),
    { threshold: 2, coolDownMs: 5 * 60_000 }
  );
  if (gdelt.ok) {
    const now = new Date().toISOString();
    for (const a of gdelt.value.articles ?? []) {
      if (!a.title) continue;
      const occurredAt = a.seendate
        ? new Date(
            `${a.seendate.slice(0, 4)}-${a.seendate.slice(4, 6)}-${a.seendate.slice(6, 8)}T${a.seendate.slice(8, 10)}:${a.seendate.slice(10, 12)}:00Z`
          ).toISOString()
        : now;
      all.push(
        enrichEvent({
          id: hashId("gdelt", a.url ?? a.title, occurredAt),
          domain: classifyDomain(a.title),
          title: a.title,
          source: a.domain ? `GDELT:${a.domain}` : "GDELT",
          sourceUrl: a.url,
          occurredAt,
          ingestedAt: now,
          tags: ["gdelt"],
        })
      );
    }
    setHealth({
      source: "gdelt",
      status: "ok",
      lastOk: new Date().toISOString(),
      latencyMs: gdelt.latencyMs,
      errorStreak: 0,
      cadenceSec: 30,
    });
  } else {
    setHealth({
      source: "gdelt",
      status: "error",
      latencyMs: gdelt.latencyMs,
      errorStreak: 1,
      message: gdelt.error,
      cadenceSec: 30,
    });
  }

  upsertEvents(all);
}

async function fetchJsonSafe<T>(url: string): Promise<T> {
  const text = await fetchText(url);
  return JSON.parse(text) as T;
}
