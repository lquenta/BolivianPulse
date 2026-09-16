import { hashId, type VideoItem } from "@bo-dash/shared";
import { fetchJson, withCircuit } from "../lib/http";
import { setHealth, setVideos } from "../lib/store";

/** Prefer query-based discovery; channel IDs can be added when verified. */
export const YOUTUBE_CHANNELS: Array<{ id: string; name: string }> = [];

// Real curated channel searches via query when API key present
const SEARCH_QUERIES = [
  "Bolivia noticias",
  "Bolivia protesta",
  "Bolivia dólar",
  "Bolivia incendio",
  "Unitel Bolivia",
  "Red Uno en vivo",
  "RTP Bolivia",
];

export const LIVE_EMBEDS: VideoItem[] = [
  {
    id: "live_unitel_search",
    title: "Buscar lives Bolivia (YouTube)",
    channel: "YouTube",
    publishedAt: new Date().toISOString(),
    url: "https://www.youtube.com/results?search_query=Bolivia+en+vivo&sp=EgJAAQ%253D%253D",
    live: true,
  },
];

type YtSearch = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      channelTitle?: string;
      publishedAt?: string;
      thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
    };
  }>;
};

export async function pollMedia() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    setVideos([
      ...LIVE_EMBEDS,
      {
        id: "demo_news_1",
        title: "Configura YOUTUBE_API_KEY para videos de las últimas 12h",
        channel: "Sistema",
        publishedAt: new Date().toISOString(),
        url: "https://www.youtube.com/results?search_query=Bolivia+noticias+hoy",
        thumb: undefined,
      },
    ]);
    setHealth({
      source: "youtube",
      status: "stale",
      errorStreak: 0,
      message: "YOUTUBE_API_KEY no configurada — usando enlaces de búsqueda",
      cadenceSec: 60,
    });
    return;
  }

  const publishedAfter = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const videos: VideoItem[] = [...LIVE_EMBEDS];

  for (const q of SEARCH_QUERIES.slice(0, 4)) {
    const url =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=date&maxResults=5` +
      `&publishedAfter=${encodeURIComponent(publishedAfter)}` +
      `&q=${encodeURIComponent(q)}` +
      `&regionCode=BO&relevanceLanguage=es&key=${key}`;
    const res = await withCircuit(`youtube:${q}`, async () => fetchJson<YtSearch>(url));
    if (!res.ok) {
      setHealth({
        source: "youtube",
        status: "error",
        latencyMs: res.latencyMs,
        errorStreak: 1,
        message: res.error,
        cadenceSec: 60,
      });
      continue;
    }
    for (const item of res.value.items ?? []) {
      const id = item.id?.videoId;
      if (!id) continue;
      videos.push({
        id: hashId("yt", id),
        title: item.snippet?.title ?? id,
        channel: item.snippet?.channelTitle ?? "YouTube",
        publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
        thumb: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url,
        url: `https://www.youtube-nocookie.com/embed/${id}`,
      });
    }
  }

  setVideos(videos);
  setHealth({
    source: "youtube",
    status: "ok",
    lastOk: new Date().toISOString(),
    errorStreak: 0,
    cadenceSec: 60,
  });
}
