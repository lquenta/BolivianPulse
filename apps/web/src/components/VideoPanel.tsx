"use client";

import { useState } from "react";
import type { VideoItem } from "@bo-dash/shared";

export function VideoPanel({ videos }: { videos: VideoItem[] }) {
  const [active, setActive] = useState<VideoItem | null>(null);
  const list = videos.slice(0, 12);

  return (
    <section className="panel p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="panel-title mb-1">Media · 12h / lives</h2>
          <p className="text-[0.72rem] text-[var(--muted)]">
            YouTube embebido · fuentes legales
          </p>
        </div>
        <span className="chip">{list.length} clips</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {list.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setActive(v)}
            className="group overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--bg-elev)] text-left transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40"
          >
            {v.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={v.thumb}
                alt=""
                className="aspect-video w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-[var(--bg-soft)] text-xs text-[var(--muted)]">
                {v.live ? "LIVE" : "Video"}
              </div>
            )}
            <div className="p-2.5">
              <div className="line-clamp-2 text-xs font-medium leading-snug tracking-tight">
                {v.title}
              </div>
              <div className="mt-1 text-[0.65rem] text-[var(--muted)]">{v.channel}</div>
            </div>
          </button>
        ))}
      </div>

      {!list.length && (
        <p className="text-sm text-[var(--muted)]">
          Configura <code>YOUTUBE_API_KEY</code> para enriquecer este panel.
        </p>
      )}

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setActive(null)}
        >
          <div
            className="panel w-full max-w-3xl overflow-hidden p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
              <div className="truncate text-sm font-medium">{active.title}</div>
              <button type="button" className="btn" onClick={() => setActive(null)}>
                Cerrar
              </button>
            </div>
            {active.url.includes("youtube") && active.url.includes("embed") ? (
              <iframe
                title={active.title}
                src={active.url}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="p-5 text-sm">
                <a
                  href={active.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--accent)] underline-offset-2 hover:underline"
                >
                  Abrir en fuente externa →
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
