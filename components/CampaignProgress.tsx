"use client";

import ChartCard from "./ChartCard";
import { CAMPAIGNS } from "@/lib/data";
import { count, currency, percent } from "@/lib/format";

/**
 * Progress-to-goal is one measure against a fixed target per row, so meters
 * read better than bars: the goal is the track, and the eye compares fill
 * fractions rather than absolute lengths across campaigns of different size.
 *
 * Every row is directly labeled, so the fill color carries no meaning on its own.
 */
export default function CampaignProgress() {
  const sorted = [...CAMPAIGNS].sort((a, b) => b.raised / b.goal - a.raised / a.goal);

  return (
    <ChartCard
      title="Campaign progress to goal"
      subtitle="Six active campaigns. Two are already past goal; planned giving has barely started."
      table={
        <table className="data-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Channel</th>
              <th className="num">Raised</th>
              <th className="num">Goal</th>
              <th className="num">% to goal</th>
              <th className="num">Donors</th>
              <th className="num">Closes</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.name}>
                <td>{c.name}</td>
                <td>{c.channel}</td>
                <td className="num">{currency(c.raised)}</td>
                <td className="num">{currency(c.goal)}</td>
                <td className="num">{percent(c.raised / c.goal, 0)}</td>
                <td className="num">{count(c.donors)}</td>
                <td className="num">{c.closes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 18 }}>
        {sorted.map((c) => {
          const ratio = c.raised / c.goal;
          const atGoal = ratio >= 1;
          const fillPct = Math.min(ratio, 1) * 100;

          return (
            <li key={c.name}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 12,
                  marginBottom: 7,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {c.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                    {c.channel} · {count(c.donors)} donors · closes {c.closes}
                  </div>
                </div>

                <div style={{ textAlign: "right", flex: "none" }}>
                  <span
                    className="tabular"
                    style={{ fontSize: 14, fontWeight: 650, color: "var(--text-primary)" }}
                  >
                    {percent(ratio, 0)}
                  </span>
                  <div className="tabular" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {currency(c.raised)} of {currency(c.goal)}
                  </div>
                </div>
              </div>

              <div
                role="meter"
                aria-valuenow={Math.round(ratio * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${c.name}: ${percent(ratio, 0)} of goal`}
                title={`${currency(c.raised)} raised of a ${currency(c.goal)} goal`}
                style={{
                  height: 9,
                  borderRadius: 5,
                  background: "var(--surface-sunken)",
                  border: "1px solid var(--border)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${fillPct}%`,
                    height: "100%",
                    borderRadius: 4,
                    background: atGoal ? "var(--good)" : "var(--series-1)",
                  }}
                />
              </div>

              {atGoal && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--good-text)",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span aria-hidden>✓</span>
                  Goal met — {currency(c.raised - c.goal)} over
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </ChartCard>
  );
}
