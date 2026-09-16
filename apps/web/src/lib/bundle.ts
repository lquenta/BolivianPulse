import { buildBundle, loadBundle, runIngestCycle } from "@bo-dash/ingest";
import { summarizeTopics, type DashboardBundle } from "@bo-dash/shared";

function coerceRate(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.valor === "number") return o.valor;
    if (typeof o.compra === "number") return o.compra;
  }
  return undefined;
}

function sanitize(bundle: DashboardBundle): DashboardBundle {
  const official = coerceRate(bundle.kpis.official);
  const parallel = coerceRate(bundle.kpis.parallel);
  const spreadPct =
    typeof bundle.kpis.spreadPct === "number"
      ? bundle.kpis.spreadPct
      : official && parallel
        ? ((parallel - official) / official) * 100
        : undefined;

  const events = bundle.events ?? [];
  const topics =
    bundle.topicIndicators?.some((t) => t.count > 0)
      ? bundle.topicIndicators
      : summarizeTopics(events);

  return {
    ...bundle,
    events,
    kpis: {
      ...bundle.kpis,
      official,
      parallel,
      buy: coerceRate(bundle.kpis.buy),
      sell: coerceRate(bundle.kpis.sell),
      spreadPct,
      history: (bundle.kpis.history ?? []).map((h) => ({
        ...h,
        official: coerceRate(h.official),
        parallel: coerceRate(h.parallel),
      })),
    },
    topicIndicators: topics,
  };
}

export async function getDashboardBundle(): Promise<DashboardBundle> {
  const fromDisk = await loadBundle();
  if (fromDisk) return sanitize(fromDisk);
  await runIngestCycle();
  return sanitize(buildBundle());
}
