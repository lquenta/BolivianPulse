"use client";

import { useState } from "react";
import type { DashboardBundle } from "@bo-dash/shared";
import { FeaturedPanel } from "@/components/NewsTicker";
import { LiveIndicators } from "@/components/LiveIndicators";
import { EconomyPanel } from "@/components/EconomyPanel";
import { TopicIndicators } from "@/components/TopicIndicators";
import { EventsFeed } from "@/components/EventsFeed";
import { WeatherPanel } from "@/components/WeatherPanel";
import { SourceHealthPanel } from "@/components/SourceHealthPanel";
import { DomainPie } from "@/components/DomainPie";
import { HazardsBars } from "@/components/HazardsBars";

export function SignalDock({ bundle }: { bundle: DashboardBundle }) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <aside className="ops-dock" aria-label="Señales">
      <div className="ops-dock__scroll ops-compact">
        <FeaturedPanel items={bundle.ticker} />

        <div className="ops-panel ops-dock__section">
          <LiveIndicators bundle={bundle} />
        </div>

        <EconomyPanel kpis={bundle.kpis} compact />

        <div className="ops-panel ops-dock__section">
          <TopicIndicators
            items={bundle.topicIndicators ?? []}
            events={bundle.events ?? []}
          />
        </div>

        <div className="ops-panel ops-dock__section">
          <EventsFeed events={bundle.events} />
        </div>

        <button
          type="button"
          className="ops-more-toggle"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
        >
          {moreOpen ? "Ocultar más" : "Más · clima · fuentes · charts"}
        </button>

        {moreOpen && (
          <>
            <div className="ops-panel ops-dock__section">
              <WeatherPanel weather={bundle.weather} />
            </div>
            <div className="ops-panel ops-dock__section">
              <SourceHealthPanel health={bundle.sourceHealth} />
            </div>
            <div className="ops-panel ops-dock__section">
              <DomainPie counts={bundle.domainCounts} />
            </div>
            <div className="ops-panel ops-dock__section">
              <HazardsBars points={bundle.mapLayers} />
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
