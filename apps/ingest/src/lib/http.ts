export type CircuitState = {
  failures: number;
  openUntil: number;
};

const circuits = new Map<string, CircuitState>();

export async function withCircuit<T>(
  name: string,
  fn: () => Promise<T>,
  opts: { threshold?: number; coolDownMs?: number } = {}
): Promise<{ ok: true; value: T; latencyMs: number } | { ok: false; error: string; latencyMs: number }> {
  const threshold = opts.threshold ?? 5;
  const coolDownMs = opts.coolDownMs ?? 60_000;
  const circuit = circuits.get(name) ?? { failures: 0, openUntil: 0 };
  const now = Date.now();
  if (circuit.openUntil > now) {
    return { ok: false, error: `circuit open until ${new Date(circuit.openUntil).toISOString()}`, latencyMs: 0 };
  }
  const start = Date.now();
  try {
    const value = await fn();
    circuits.set(name, { failures: 0, openUntil: 0 });
    return { ok: true, value, latencyMs: Date.now() - start };
  } catch (err) {
    const failures = circuit.failures + 1;
    circuits.set(name, {
      failures,
      openUntil: failures >= threshold ? now + coolDownMs : 0,
    });
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - start,
    };
  }
}

export async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "BoliviaPulseDashboard/1.0 (+local; research)",
        Accept: "*/*",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchJson<T>(url: string, timeoutMs = 15000): Promise<T> {
  const text = await fetchText(url, timeoutMs);
  return JSON.parse(text) as T;
}
