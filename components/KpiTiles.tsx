import { KPIS } from "@/lib/data";
import { delta, formatByKind, isImprovement } from "@/lib/format";

/**
 * Six stat tiles. No plot — a sparkline behind a number this small would be
 * decoration rather than a second reading of the data.
 *
 * Direction is never carried by color alone: each tile pairs the tint with an
 * arrow glyph and the words "vs. prior period".
 */
export default function KpiTiles() {
  return (
    <div className="tile-grid">
      {KPIS.map((kpi) => {
        const good = isImprovement(kpi.value, kpi.prior, kpi.lowerIsBetter);
        const up = kpi.value >= kpi.prior;

        return (
          <div
            key={kpi.id}
            className="card"
            style={{ padding: 18, display: "flex", flexDirection: "column" }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: 10,
                // Two lines' worth, so a one-line label doesn't lift its value
                // above the neighbouring tiles'.
                minHeight: "2.6em",
                lineHeight: 1.3,
              }}
            >
              {kpi.label}
            </div>

            <div
              style={{
                fontSize: 30,
                fontWeight: 650,
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
                color: "var(--text-primary)",
              }}
            >
              {formatByKind(kpi.value, kpi.format)}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "2px 6px",
                marginTop: 8,
                fontSize: 13,
                minHeight: "2.6em",
              }}
            >
              <span
                aria-hidden
                style={{
                  color: good ? "var(--good-text)" : "var(--critical)",
                  fontWeight: 700,
                }}
              >
                {up ? "↑" : "↓"}
              </span>
              <span
                className="tabular"
                style={{
                  color: good ? "var(--good-text)" : "var(--critical)",
                  fontWeight: 600,
                }}
              >
                {delta(kpi.value, kpi.prior)}
              </span>
              <span style={{ color: "var(--text-muted)" }}>vs. prior period</span>
            </div>

            <p
              style={{
                fontSize: 12.5,
                color: "var(--text-secondary)",
                // The label and delta rows above are fixed height, so the notes
                // start on the same line across the row without pinning.
                margin: "10px 0 0",
                lineHeight: 1.45,
              }}
            >
              {kpi.note}
            </p>
          </div>
        );
      })}
    </div>
  );
}
