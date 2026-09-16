/**
 * Experimental social adapters — OFF by default (ENABLE_SOCIAL_SCRAPERS=true).
 * Prefer legal embeds / official APIs. Scrapers are fragile and may violate ToS.
 */
import { classifyDomain, hashId, type EventItem } from "@bo-dash/shared";
import { setHealth, upsertEvents } from "../lib/store";

export async function pollSocialExperimental() {
  if (process.env.ENABLE_SOCIAL_SCRAPERS !== "true") {
    setHealth({
      source: "social-experimental",
      status: "stale",
      errorStreak: 0,
      message: "Desactivado (ENABLE_SOCIAL_SCRAPERS!=true)",
      cadenceSec: 120,
    });
    return;
  }

  // Placeholder: when enabled, integrate official APIs or sanctioned embeds only.
  // Intentionally does not scrape X/TikTok/Instagram by default.
  const now = new Date().toISOString();
  const stub: EventItem[] = [
    {
      id: hashId("social", "stub"),
      domain: classifyDomain("social bolivia"),
      title: "Adaptador social experimental activo (sin scrapers por defecto)",
      source: "social-experimental",
      occurredAt: now,
      ingestedAt: now,
      tags: ["experimental"],
    },
  ];
  upsertEvents(stub);
  setHealth({
    source: "social-experimental",
    status: "ok",
    lastOk: now,
    errorStreak: 0,
    message: "Stub listo — conectar APIs oficiales aquí",
    cadenceSec: 120,
  });
}
