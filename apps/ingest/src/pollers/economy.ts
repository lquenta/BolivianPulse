import { fetchJson, withCircuit } from "../lib/http";
import { setEconomy, setHealth } from "../lib/store";

type ParaleloRate = {
  median?: number;
  buy?: number;
  sell?: number;
  timestamp?: string;
  compra?: number;
  venta?: number;
  mediana?: number;
  actualizado?: string;
};

function asRate(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.valor === "number") return o.valor;
    if (typeof o.compra === "number") return o.compra;
    if (typeof o.tc_oficial === "number") return o.tc_oficial;
  }
  return undefined;
}

export async function pollEconomy() {
  const paralelo = await withCircuit("paralelo.bo", async () => {
    return fetchJson<ParaleloRate>("https://paralelo.bo/api/v1/rate");
  });

  if (paralelo.ok) {
    const d = paralelo.value;
    const parallel = asRate(d.median) ?? asRate(d.mediana) ?? asRate(d.sell) ?? asRate(d.venta);
    const buy = asRate(d.buy) ?? asRate(d.compra);
    const sell = asRate(d.sell) ?? asRate(d.venta);
    setEconomy({
      parallel,
      buy,
      sell,
      parallelUpdatedAt: d.timestamp ?? d.actualizado ?? new Date().toISOString(),
    });
    setHealth({
      source: "paralelo.bo",
      status: "ok",
      lastOk: new Date().toISOString(),
      latencyMs: paralelo.latencyMs,
      errorStreak: 0,
      cadenceSec: 30,
    });
  } else {
    setHealth({
      source: "paralelo.bo",
      status: "error",
      latencyMs: paralelo.latencyMs,
      errorStreak: 1,
      message: paralelo.error,
      cadenceSec: 30,
    });
  }

  const bcb = await withCircuit("bcb-cucu", async () => {
    return fetchJson<Record<string, unknown>>("https://apibcb.cucu.bo/api/v1/tc/oficial");
  });

  if (bcb.ok) {
    const d = bcb.value;
    const official =
      asRate(d.tc_oficial) ??
      asRate(d.oficial) ??
      asRate(d.valor) ??
      asRate(d.compra) ??
      asRate(d);
    const updated =
      (typeof d.actualizado === "string" && d.actualizado) ||
      (typeof d.fecha === "string" && d.fecha) ||
      (d.tc_oficial &&
      typeof d.tc_oficial === "object" &&
      typeof (d.tc_oficial as { actualizado?: string }).actualizado === "string"
        ? (d.tc_oficial as { actualizado: string }).actualizado
        : undefined) ||
      new Date().toISOString();
    setEconomy({
      official,
      officialUpdatedAt: updated,
    });
    setHealth({
      source: "bcb-cucu",
      status: "ok",
      lastOk: new Date().toISOString(),
      latencyMs: bcb.latencyMs,
      errorStreak: 0,
      cadenceSec: 300,
    });
  } else {
    setHealth({
      source: "bcb-cucu",
      status: "error",
      latencyMs: bcb.latencyMs,
      errorStreak: 1,
      message: bcb.error,
      cadenceSec: 300,
    });
  }
}
