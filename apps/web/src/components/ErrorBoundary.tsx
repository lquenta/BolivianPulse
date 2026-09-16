"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-xl p-8 text-[var(--text)]">
          <h1 className="mb-2 text-xl font-semibold">Error en el dashboard</h1>
          <p className="mb-4 text-sm text-[var(--muted)]">
            {this.state.error.message}
          </p>
          <button
            type="button"
            className="rounded border border-[var(--line)] px-3 py-2 text-sm"
            onClick={() => this.setState({ error: null })}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
