import { LAPSED, TOP_DONORS } from "@/lib/data";
import { count, currency } from "@/lib/format";

/**
 * Three hero figures the development team acts on directly, plus the top-donor
 * table. These are numbers, not trends — a stat tile reads faster than a plot.
 */
export default function OpportunityCards() {
  const items = [LAPSED.pipeline, LAPSED.lybunt, LAPSED.sybunt];

  return (
    <>
      <div className="stat-grid">
        {items.map((item) => (
          <div key={item.label} className="card">
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 650,
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                marginTop: 8,
                color: "var(--text-primary)",
              }}
            >
              {currency(item.value)}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
              across {count(item.donors)}{" "}
              {item.label === "Major gift pipeline" ? "open proposals" : "donors"}
            </div>
            <p
              style={{
                fontSize: 12.5,
                color: "var(--text-muted)",
                margin: "10px 0 0",
                lineHeight: 1.45,
              }}
            >
              {item.description}
            </p>
          </div>
        ))}
      </div>

      <section className="card">
        <h2 className="card-title">Top donors, year to date</h2>
        <p className="card-subtitle">
          The three principal donors account for {currency(920_000)} of the {currency(1_538_000)}{" "}
          raised so far this year.
        </p>
        <div className="scroll-x" style={{ marginTop: 16 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Donor</th>
                <th>Segment</th>
                <th className="num">YTD</th>
                <th className="num">Lifetime</th>
                <th className="num">Donor since</th>
                <th className="num">Last gift</th>
              </tr>
            </thead>
            <tbody>
              {TOP_DONORS.map((d) => (
                <tr key={d.name}>
                  <td>{d.name}</td>
                  <td>{d.segment}</td>
                  <td className="num">{currency(d.ytd)}</td>
                  <td className="num">{currency(d.lifetime)}</td>
                  <td className="num">{d.firstGift}</td>
                  <td className="num">{d.lastGift}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
