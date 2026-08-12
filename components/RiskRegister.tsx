"use client";

import React from "react";
import { SEVERITY_META, buildRiskRegister, riskSummary } from "@/lib/risks";
import { currency } from "@/lib/format";

const RISKS = buildRiskRegister();
const SUMMARY = riskSummary(RISKS);

/**
 * Severity chip. Status color never carries the meaning alone — every chip
 * pairs the tint with a distinct glyph and the word, so it survives colorblind
 * viewing, greyscale print and forced-colors mode.
 */
function SeverityChip({ severity }: { severity: keyof typeof SEVERITY_META }) {
  const meta = SEVERITY_META[severity];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11.5,
        fontWeight: 650,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        color: meta.color,
        border: `1px solid ${meta.color}`,
        borderRadius: 999,
        padding: "2px 9px",
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

export default function RiskRegister() {
  const [view, setView] = React.useState<"cards" | "table">("cards");

  return (
    <section className="card">
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2 className="card-title">Risk register</h2>
          <p className="card-subtitle">
            Computed from the data by fixed rules, not written by hand — each item states the
            threshold that triggered it. {SUMMARY.critical} critical, {SUMMARY.serious} serious,{" "}
            {SUMMARY.warning} to watch, {SUMMARY.good} healthy.
          </p>
        </div>

        <div
          role="group"
          aria-label="Risk register view"
          style={{
            display: "inline-flex",
            border: "1px solid var(--border)",
            borderRadius: 8,
            overflow: "hidden",
            flex: "none",
          }}
        >
          {(["cards", "table"] as const).map((v) => (
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
              {v === "cards" ? "Cards" : "Table"}
            </button>
          ))}
        </div>
      </header>

      {view === "cards" ? (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))",
          }}
        >
          {RISKS.map((risk) => {
            const meta = SEVERITY_META[risk.severity];
            return (
              <li
                key={risk.id}
                style={{
                  border: "1px solid var(--border)",
                  borderLeft: `3px solid ${meta.color}`,
                  borderRadius: 10,
                  padding: "15px 16px",
                  background: "var(--surface-sunken)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                }}
              >
                {/* Stacked rather than wrapped: a row layout puts the exposure
                    beside the chip on short labels and below it on long ones,
                    so cards in the same grid don't line up. */}
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span>
                    <SeverityChip severity={risk.severity} />
                  </span>
                  <span
                    className="tabular"
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {risk.exposureLabel}
                  </span>
                </div>

                <h3
                  style={{
                    margin: 0,
                    fontSize: 14.5,
                    fontWeight: 650,
                    letterSpacing: "-0.01em",
                    color: "var(--text-primary)",
                    lineHeight: 1.3,
                  }}
                >
                  {risk.title}
                </h3>

                <p
                  style={{
                    margin: 0,
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    color: "var(--text-secondary)",
                  }}
                >
                  {risk.finding}
                </p>

                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: "var(--text-primary)",
                    paddingTop: 8,
                    borderTop: "1px solid var(--grid)",
                  }}
                >
                  <strong style={{ fontWeight: 650 }}>Do:</strong> {risk.action}
                </p>

                <p
                  style={{
                    margin: 0,
                    fontSize: 11.5,
                    lineHeight: 1.45,
                    color: "var(--text-muted)",
                  }}
                >
                  {risk.rule}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="scroll-x">
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Risk</th>
                <th className="num" style={{ paddingRight: 18, minWidth: 108 }}>
                  Exposure
                </th>
                <th>Finding</th>
                <th>Triggering rule</th>
              </tr>
            </thead>
            <tbody>
              {RISKS.map((risk) => (
                <tr key={risk.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span aria-hidden style={{ color: SEVERITY_META[risk.severity].color }}>
                      {SEVERITY_META[risk.severity].icon}
                    </span>{" "}
                    {SEVERITY_META[risk.severity].label}
                  </td>
                  <td>{risk.title}</td>
                  <td
                    className="num"
                    style={{ whiteSpace: "nowrap", paddingRight: 18, minWidth: 108 }}
                  >
                    {risk.exposure === null ? "—" : currency(risk.exposure)}
                  </td>
                  <td style={{ minWidth: 300 }}>{risk.finding}</td>
                  <td style={{ minWidth: 240, color: "var(--text-muted)" }}>{risk.rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
