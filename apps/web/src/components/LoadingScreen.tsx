"use client";

export function LoadingScreen({ message = "Cargando Bolivia Pulse…" }: { message?: string }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-screen__card">
        <span className="spinner spinner--lg" />
        <div>
          <div
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Bolivia Pulse
          </div>
          <div className="mt-1 text-sm text-[var(--muted)]">{message}</div>
        </div>
      </div>
      <div className="loading-screen__bars" aria-hidden>
        <div className="skeleton-bar" />
        <div className="skeleton-bar skeleton-bar--short" />
        <div className="skeleton-grid">
          <div className="skeleton-block" />
          <div className="skeleton-block" />
          <div className="skeleton-block" />
        </div>
      </div>
    </div>
  );
}

export function RefreshPill({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="refresh-pill" aria-live="polite">
      <span className="spinner spinner--sm" />
      Actualizando datos
    </span>
  );
}
