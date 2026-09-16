"use client";

import { useEffect, useState } from "react";

/** Avoid SSR/client mismatches from Date.now() / toLocaleString. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function formatRelative(iso?: string, now = Date.now()): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t) || t <= 0) return "";
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  return `hace ${Math.round(m / 60)}h`;
}

export function formatWhen(iso?: string): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t) || t <= 0) return "—";
  return new Date(iso).toLocaleString("es-BO", {
    timeZone: "America/La_Paz",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function RelativeTime({ iso }: { iso?: string }) {
  const mounted = useMounted();
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!iso) {
      setLabel("");
      return;
    }
    const tick = () => setLabel(formatRelative(iso));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [iso]);

  if (!mounted || !iso) return null;
  return <span suppressHydrationWarning>{label}</span>;
}

export function AbsoluteTime({ iso, fallback = "—" }: { iso?: string; fallback?: string }) {
  const mounted = useMounted();
  if (!mounted) return <span suppressHydrationWarning>{fallback}</span>;
  return <span suppressHydrationWarning>{formatWhen(iso)}</span>;
}
