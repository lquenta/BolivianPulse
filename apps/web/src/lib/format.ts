export function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return asNumber(o.valor) ?? asNumber(o.compra) ?? asNumber(o.median) ?? asNumber(o.tc_oficial);
  }
  return undefined;
}

export function formatNum(value: unknown, digits = 2): string {
  const n = asNumber(value);
  return n === undefined ? "—" : n.toFixed(digits);
}

export function formatPct(value: unknown, digits = 1): string {
  const n = asNumber(value);
  return n === undefined ? "—" : `${n.toFixed(digits)}%`;
}
