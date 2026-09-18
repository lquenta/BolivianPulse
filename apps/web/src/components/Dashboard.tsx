"use client";

import { useEffect, useState } from "react";
import { useDashboardStream } from "@/hooks/useDashboardStream";
import { OpsShell } from "@/components/OpsShell";
import { LoadingScreen } from "@/components/LoadingScreen";

export function Dashboard() {
  const { bundle, loading, refreshing, connected, error } = useDashboardStream();
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleString("es-BO", {
          timeZone: "America/La_Paz",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          day: "2-digit",
          month: "short",
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
        <LoadingScreen message="Preparando feeds públicos y mapa…" />
      </div>
    );
  }

  return (
    <OpsShell
      bundle={bundle}
      connected={connected}
      refreshing={refreshing}
      clock={clock}
      error={error}
    />
  );
}
