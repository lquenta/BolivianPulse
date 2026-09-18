import { pollEconomy } from "./pollers/economy";
import { pollHazards } from "./pollers/hazards";
import { pollNews } from "./pollers/news";
import { pollSocialExperimental } from "./pollers/social-experimental";
import { persistBundle } from "./lib/store";

let running = false;
let timer: ReturnType<typeof setInterval> | null = null;

async function tick(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.error(`[ingest] ${label} failed`, err);
  }
}

let cycle = 0;

/**
 * Stagger heavy work so we don't hammer CPU every tick:
 * - every cycle: economy (cheap)
 * - every 2nd: news RSS (+ optional OG thumbs)
 * - every 2nd (offset): hazards
 * - every 3rd: social experimental
 */
export async function runIngestCycle() {
  if (running) return;
  running = true;
  cycle += 1;
  try {
    const jobs: Array<Promise<void>> = [tick("economy", pollEconomy)];

    if (cycle % 2 === 1) {
      jobs.push(tick("news", () => pollNews({ enrichImages: cycle % 4 === 1 })));
    }
    if (cycle % 2 === 0) {
      jobs.push(tick("hazards", pollHazards));
    }
    if (cycle % 3 === 0) {
      jobs.push(tick("social", pollSocialExperimental));
    }

    await Promise.all(jobs);
    const bundle = await persistBundle();
    console.log(
      `[ingest] cycle=${cycle} bundle @ ${bundle.generatedAt} events=${bundle.events.length} ticker=${bundle.ticker.length} layers=${bundle.mapLayers.length} weather=${bundle.weather.length}`
    );
  } finally {
    running = false;
  }
}

export function startIngestLoop(intervalMs = 90_000) {
  if (timer) return;
  console.log(`[ingest] starting loop every ${intervalMs}ms`);
  void runIngestCycle();
  timer = setInterval(() => void runIngestCycle(), intervalMs);
}

export function stopIngestLoop() {
  if (timer) clearInterval(timer);
  timer = null;
}

export { buildBundle, loadBundle, persistBundle } from "./lib/store";
