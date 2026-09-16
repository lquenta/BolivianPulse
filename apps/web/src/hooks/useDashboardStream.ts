"use client";

import { useEffect, useRef, useState } from "react";
import { summarizeTopics, type DashboardBundle } from "@bo-dash/shared";

const EMPTY: DashboardBundle = {
  generatedAt: "",
  kpis: { history: [] },
  events: [],
  ticker: [],
  mapLayers: [],
  videos: [],
  weather: [],
  domainCounts: {
    economia: 0,
    politica: 0,
    seguridad: 0,
    sociedad: 0,
    clima: 0,
    infra: 0,
    media: 0,
  },
  topicIndicators: [],
  sourceHealth: [],
};

/** Keep Pulso filled even if ingest omitted topicIndicators. */
function ensureTopics(data: DashboardBundle): DashboardBundle {
  const events = data.events ?? [];
  const topics = data.topicIndicators ?? [];
  if (topics.some((t) => t.count > 0)) return { ...data, events, topicIndicators: topics };
  if (events.length) {
    return { ...data, events, topicIndicators: summarizeTopics(events) };
  }
  return { ...data, events, topicIndicators: topics };
}

/** Minimum time between UI data swaps (ms) */
const UI_REFRESH_MIN_MS = 60_000;

export type StreamStatus = "loading" | "ready" | "refreshing";

export function useDashboardStream() {
  const [bundle, setBundle] = useState<DashboardBundle>(EMPTY);
  const [status, setStatus] = useState<StreamStatus>("loading");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasData = useRef(false);
  const lastKey = useRef("");
  const lastAppliedAt = useRef(0);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queued = useRef<DashboardBundle | null>(null);

  useEffect(() => {
    let es: EventSource | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const clearTimers = () => {
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
      if (clearRefreshTimer.current) clearTimeout(clearRefreshTimer.current);
      pendingTimer.current = null;
      clearRefreshTimer.current = null;
    };

    const commit = (data: DashboardBundle, key: string) => {
      lastKey.current = key;
      lastAppliedAt.current = Date.now();
      setBundle(ensureTopics(data));
      setConnected(true);
      setError(null);
      clearRefreshTimer.current = setTimeout(() => {
        if (!cancelled) setStatus("ready");
      }, 1200);
    };

    const apply = (raw: DashboardBundle) => {
      if (cancelled) return;
      const data = ensureTopics(raw);
      const key = data.generatedAt || `n-${data.events?.length}-${data.mapLayers?.length}`;

      if (hasData.current && key && key === lastKey.current) {
        setConnected(true);
        setError(null);
        return;
      }

      if (!hasData.current) {
        setStatus("loading");
        clearTimers();
        pendingTimer.current = setTimeout(() => {
          if (cancelled) return;
          hasData.current = true;
          commit(data, key);
          setStatus("ready");
        }, 250);
        return;
      }

      const elapsed = Date.now() - lastAppliedAt.current;
      if (elapsed < UI_REFRESH_MIN_MS) {
        // Keep newest payload queued; apply when spacing allows
        queued.current = data;
        if (!pendingTimer.current) {
          pendingTimer.current = setTimeout(() => {
            pendingTimer.current = null;
            const next = queued.current;
            queued.current = null;
            if (next) apply(next);
          }, UI_REFRESH_MIN_MS - elapsed);
        }
        return;
      }

      setStatus("refreshing");
      clearTimers();
      // Brief spinner, content stays on screen
      pendingTimer.current = setTimeout(() => {
        if (cancelled) return;
        commit(data, key);
      }, 350);
    };

    const poll = async () => {
      try {
        const res = await fetch("/api/bundle", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        apply(await res.json());
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setConnected(false);
        setStatus(hasData.current ? "ready" : "loading");
      }
    };

    void poll();

    try {
      es = new EventSource("/api/stream");
      es.onopen = () => {
        if (!cancelled) {
          setConnected(true);
          setError(null);
        }
      };
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as DashboardBundle & { error?: string };
          if (data.error) {
            setError(data.error);
            return;
          }
          apply(data);
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => {
        setConnected(false);
        es?.close();
        if (!pollId) pollId = setInterval(() => void poll(), 60_000);
      };
    } catch {
      pollId = setInterval(() => void poll(), 60_000);
    }

    return () => {
      cancelled = true;
      clearTimers();
      es?.close();
      if (pollId) clearInterval(pollId);
    };
  }, []);

  return {
    bundle,
    status,
    loading: status === "loading",
    refreshing: status === "refreshing",
    connected,
    error,
  };
}
