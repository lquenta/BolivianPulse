"use client";

import { useEffect, useState } from "react";
import { useDashboardStream } from "@/hooks/useDashboardStream";
import { HeaderBar } from "@/components/HeaderBar";
import { NewsTicker } from "@/components/NewsTicker";
import { MapPanel } from "@/components/MapPanel";
import { EconomyPanel } from "@/components/EconomyPanel";
import { EventsFeed } from "@/components/EventsFeed";
import { DomainPie } from "@/components/DomainPie";
import { WeatherPanel } from "@/components/WeatherPanel";
import { SourceHealthPanel } from "@/components/SourceHealthPanel";
import { HazardsBars } from "@/components/HazardsBars";
import { TopicIndicators } from "@/components/TopicIndicators";
import { AbsoluteTime } from "@/hooks/useClientTime";
import { SoftSection } from "@/components/SoftSection";
import { LoadingScreen, RefreshPill } from "@/components/LoadingScreen";

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
      <div className="dash-shell mx-auto max-w-[1680px] p-4">
        <LoadingScreen message="Preparando feeds públicos y mapa…" />
      </div>
    );
  }

  return (
    <div className="dash-shell mx-auto flex min-h-screen max-w-[1680px] flex-col gap-3 p-3 sm:gap-3.5 sm:p-4">
      <HeaderBar
        connected={connected}
        official={bundle.kpis.official}
        parallel={bundle.kpis.parallel}
        spreadPct={bundle.kpis.spreadPct}
        health={bundle.sourceHealth}
        clock={clock}
        generatedAt={bundle.generatedAt}
        refreshing={refreshing}
      />

      <SoftSection updating={refreshing} label="Actualizando titulares…">
        <NewsTicker items={bundle.ticker} />
      </SoftSection>

      {error && (
        <div className="rounded-[12px] border border-[var(--danger)]/35 bg-[var(--danger)]/10 px-3 py-2 text-sm">
          Stream: {error}
        </div>
      )}

      <SoftSection updating={refreshing} label="Actualizando pulso…">
        <TopicIndicators
          items={bundle.topicIndicators ?? []}
          events={bundle.events ?? []}
        />
      </SoftSection>
      <div className="grid min-h-0 gap-3 lg:grid-cols-[1.25fr_0.75fr] lg:items-stretch lg:gap-3.5">
        <SoftSection
          fill
          updating={refreshing}
          label="Actualizando mapa…"
          className="soft-section--map"
        >
          <MapPanel points={bundle.mapLayers} />
        </SoftSection>
        <SoftSection updating={refreshing} label="Actualizando economía…">
          <EconomyPanel kpis={bundle.kpis} />
        </SoftSection>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:gap-3.5">
        <SoftSection updating={refreshing}>
          <DomainPie counts={bundle.domainCounts} />
        </SoftSection>
        <SoftSection updating={refreshing}>
          <HazardsBars points={bundle.mapLayers} />
        </SoftSection>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr] lg:gap-3.5">
        <SoftSection updating={refreshing} label="Actualizando feed…">
          <EventsFeed events={bundle.events} />
        </SoftSection>
        <div className="flex flex-col gap-3">
          <SoftSection updating={refreshing}>
            <WeatherPanel weather={bundle.weather} />
          </SoftSection>
          <SoftSection updating={refreshing}>
            <SourceHealthPanel health={bundle.sourceHealth} />
          </SoftSection>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-center gap-3 pb-1 text-center text-[0.68rem] tracking-wide text-[var(--faint)]">
        <span>
          Actualizado <AbsoluteTime iso={bundle.generatedAt} /> · fuentes públicas · UI cada ~60s
        </span>
        <RefreshPill show={refreshing} />
      </footer>
    </div>
  );
}
