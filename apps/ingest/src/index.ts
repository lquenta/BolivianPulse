import { persistBundle } from "./lib/store";
import { pollEconomy } from "./pollers/economy";
import { pollHazards } from "./pollers/hazards";
import { pollMedia } from "./pollers/media";
import { pollNews } from "./pollers/news";
import { pollSocialExperimental } from "./pollers/social-experimental";

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

export async function runIngestCycle() {
  if (running) return;
  running = true;
  cycle += 1;
  try {
    const tasks: Array<Promise<void>> = [
      tick("economy", pollEconomy),
      tick("news", pollNews),
      tick("hazards", pollHazards),
      tick("media", pollMedia),
      tick("social", pollSocialExperimental),
    ];
    // GDELT is inside news; news already runs. Soften: every 3rd cycle skip heavy news extras via env later.
    if (cycle % 3 === 0) {
      // reserved for heavier adapters
    }
    await Promise.all(tasks);
    const bundle = await persistBundle();
    console.log(
      `[ingest] bundle @ ${bundle.generatedAt} events=${bundle.events.length} ticker=${bundle.ticker.length} layers=${bundle.mapLayers.length}`
    );
  } finally {
    running = false;
  }
}

export function startIngestLoop(intervalMs = 25_000) {
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
