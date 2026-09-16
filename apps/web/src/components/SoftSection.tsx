"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  updating?: boolean;
  className?: string;
  label?: string;
  /** Stretch to fill grid/flex parent height */
  fill?: boolean;
};

/**
 * Keeps content fully visible. Only shows a spinner badge while updating.
 */
export function SoftSection({
  children,
  updating = false,
  className = "",
  label = "Actualizando…",
  fill = false,
}: Props) {
  return (
    <div
      className={`soft-section ${fill ? "soft-section--fill" : ""} ${updating ? "is-updating" : ""} ${className}`}
    >
      {updating && (
        <div className="soft-section__badge" aria-live="polite" aria-busy="true">
          <span className="spinner spinner--sm" />
          <span>{label}</span>
        </div>
      )}
      <div className="soft-section__body is-in">{children}</div>
    </div>
  );
}
