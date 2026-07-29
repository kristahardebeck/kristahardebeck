"use client";

import React from "react";

export type LegendEntry = { label: string; color: string; shape?: "line" | "block" };

/**
 * Card shell for every chart on the dashboard.
 *
 * Owns the Chart/Table toggle. The table view is not decoration: three light-mode
 * palette steps sit below 3:1 against the light surface, and the relief rule for
 * that is a table view or visible direct labels. Every chart here ships both.
 */
export default function ChartCard({
  title,
  subtitle,
  legend,
  table,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  legend?: LegendEntry[];
  table: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const [view, setView] = React.useState<"chart" | "table">("chart");

  return (
    <section className="card" style={{ display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: legend?.length ? 12 : 16,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2 className="card-title">{title}</h2>
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
          {action}
          <div
            role="group"
            aria-label={`${title} view`}
            style={{
              display: "inline-flex",
              border: "1px solid var(--border)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {(["chart", "table"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                style={{
                  font: "inherit",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "5px 10px",
                  border: "none",
                  cursor: "pointer",
                  background: view === v ? "var(--accent-wash)" : "transparent",
                  color: view === v ? "var(--series-1)" : "var(--text-muted)",
                }}
              >
                {v === "chart" ? "Chart" : "Table"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {legend?.length ? (
        <div className="legend" style={{ marginBottom: 14 }}>
          {legend.map((entry) => (
            <span className="legend-item" key={entry.label}>
              <span
                className={
                  entry.shape === "line" ? "legend-swatch legend-swatch--line" : "legend-swatch"
                }
                style={{ background: entry.color }}
                aria-hidden
              />
              {entry.label}
            </span>
          ))}
        </div>
      ) : null}

      <div
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {view === "chart" ? children : <div className="scroll-x">{table}</div>}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

type TooltipRow = { label: string; value: string; color?: string };

export function TooltipBox({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="tooltip">
      <div className="tooltip-title">{title}</div>
      {rows.map((row) => (
        <div className="tooltip-row" key={row.label}>
          {row.color && (
            <span
              className="legend-swatch"
              style={{ background: row.color, width: 9, height: 9 }}
              aria-hidden
            />
          )}
          <span>{row.label}</span>
          <span className="tooltip-value">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
