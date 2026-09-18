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

function extractRssImage(item: Record<string, unknown>, html: string): string | undefined {
  const enclosure = item.enclosure as Record<string, string> | Array<Record<string, string>> | undefined;
  for (const enc of asArray(enclosure)) {
    const encUrl = enc?.["@_url"] ?? enc?.url;
    const encType = enc?.["@_type"] ?? enc?.type ?? "";
    if (encUrl && (encType.startsWith("image") || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(encUrl))) {
      return encUrl;
    }
  }

  const mediaThumb = item["media:thumbnail"] as Record<string, string> | Array<Record<string, string>> | undefined;
  for (const thumb of asArray(mediaThumb)) {
    const thumbUrl = thumb?.["@_url"] ?? thumb?.url;
    if (thumbUrl) return thumbUrl;
  }

  const mediaContent = item["media:content"] as Record<string, string> | Array<Record<string, string>> | undefined;
  for (const media of asArray(mediaContent)) {
    const mediaUrl = media?.["@_url"] ?? media?.url;
    const mediaType = media?.["@_type"] ?? media?.type ?? "";
    const medium = media?.["@_medium"] ?? media?.medium ?? "";
    if (
      mediaUrl &&
      (medium === "image" ||
        mediaType.startsWith("image") ||
        mediaType === "" ||
        /\.(jpe?g|png|webp|gif)(\?|$)/i.test(mediaUrl))
    ) {
      return mediaUrl;
    }
  }

  // Prefer larger img candidates from HTML description / content:encoded
  const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
  const og = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
  const candidates = [og, ...imgs].filter(Boolean) as string[];
  for (const url of candidates) {
    if (/favicon|sprite|logo|1x1|pixel|emoji|icon/i.test(url)) continue;
    if (/^https?:\/\//i.test(url) || url.startsWith("//")) {
      return url.startsWith("//") ? `https:${url}` : url;
    }
  }
  return undefined;
}

function safeIsoDate(value: unknown, fallback: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : fallback;
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
      const rawHtml = String(item.description ?? item.summary ?? item["content:encoded"] ?? "");
      const summary = rawHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280);
      if (!title) return null;
      const occurredAt = safeIsoDate(pub, now);
      const imageUrl = extractRssImage(item as Record<string, unknown>, rawHtml);
      return enrichEvent({
        id: hashId(source, link || title, occurredAt),
        domain: classifyDomain(`${title} ${summary}`),
        title,
        summary,
        source,
        sourceUrl: link || undefined,
        occurredAt,
        ingestedAt: now,
        media: imageUrl ? { type: "image", url: imageUrl, thumb: imageUrl } : undefined,
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

function extractOgImage(html: string): string | undefined {
  const patterns = [
    /property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i,
    /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    /name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re)?.[1]?.trim();
    if (!m) continue;
    const url = m.startsWith("//") ? `https:${m}` : m;
    if (/^https?:\/\//i.test(url) && !/favicon|sprite|1x1|pixel/i.test(url)) return url;
  }
  return undefined;
}

const ogCache = new Map<string, string | null>();

async function resolveCanonicalUrl(url: string): Promise<string | undefined> {
  if (!/news\.google\.com/i.test(url)) return url;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": "BoliviaPulseDashboard/1.0 (+local; research)",
        Accept: "text/html",
      },
    });
    clearTimeout(t);
    const finalUrl = res.url;
    if (finalUrl && !/news\.google\.com/i.test(finalUrl)) return finalUrl;
    // Sometimes the article URL is in the HTML
    const html = await res.text();
    const canonical =
      html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ||
      html.match(/href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1];
    if (canonical && /^https?:\/\//i.test(canonical) && !/news\.google\.com/i.test(canonical)) {
      return canonical;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

async function fetchArticleImage(articleUrl: string): Promise<string | undefined> {
  const cached = ogCache.get(articleUrl);
  if (cached !== undefined) return cached || undefined;
  try {
    const html = await fetchText(articleUrl, 7000);
    const img = extractOgImage(html);
    ogCache.set(articleUrl, img ?? null);
    return img;
  } catch {
    ogCache.set(articleUrl, null);
    return undefined;
  }
}

/** Pull real article thumbs (og:image) when RSS has none — low concurrency. */
async function enrichMissingImages(events: EventItem[], limit = 8): Promise<void> {
  const score = (e: EventItem) => {
    const s = e.source.toLowerCase();
    if (s.startsWith("los tiempos")) return 0;
    if (!s.startsWith("google news") && !s.startsWith("gdelt")) return 1;
    if (s.startsWith("google news")) return 2;
    return 3;
  };
  const candidates = events
    .filter((e) => !e.media?.thumb && !e.media?.url && e.sourceUrl)
    .sort((a, b) => score(a) - score(b) || new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);

  const concurrency = 3;
  for (let i = 0; i < candidates.length; i += concurrency) {
    const batch = candidates.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (ev) => {
        const canonical = await resolveCanonicalUrl(ev.sourceUrl!);
        if (!canonical) return;
        const img = await fetchArticleImage(canonical);
        if (!img) return;
        ev.media = { type: "image", url: img, thumb: img };
        if (canonical !== ev.sourceUrl && !/news\.google\.com/i.test(canonical)) {
          ev.sourceUrl = canonical;
        }
      })
    );
  }
}

export async function pollNews(opts: { enrichImages?: boolean } = {}) {
  const enrichImages =
    opts.enrichImages !== false && process.env.ENABLE_OG_ENRICH !== "false";
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
        cadenceSec: 60,
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
        cadenceSec: 60,
      });
    } catch (err) {
      setHealth({
        source: `rss:${feed.source}`,
        status: "error",
        latencyMs: res.latencyMs,
        errorStreak: 1,
        message: err instanceof Error ? err.message : String(err),
        cadenceSec: 60,
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
        ? safeIsoDate(
            `${a.seendate.slice(0, 4)}-${a.seendate.slice(4, 6)}-${a.seendate.slice(6, 8)}T${a.seendate.slice(8, 10)}:${a.seendate.slice(10, 12)}:00Z`,
            now
          )
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

  if (enrichImages) {
    await enrichMissingImages(all, 8);
  }
  upsertEvents(all);
}

async function fetchJsonSafe<T>(url: string): Promise<T> {
  const text = await fetchText(url);
  return JSON.parse(text) as T;
}
