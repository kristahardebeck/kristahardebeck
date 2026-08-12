import AiAnalyst from "@/components/AiAnalyst";
import AnalystChat from "@/components/AnalystChat";
import CampaignProgress from "@/components/CampaignProgress";
import ChannelMix from "@/components/ChannelMix";
import DonorMovement from "@/components/DonorMovement";
import KpiTiles from "@/components/KpiTiles";
import OpportunityCards from "@/components/OpportunityCards";
import OutreachStudio from "@/components/OutreachStudio";
import RevenueTrend from "@/components/RevenueTrend";
import RiskRegister from "@/components/RiskRegister";
import SegmentChart from "@/components/SegmentChart";
import ThemeToggle from "@/components/ThemeToggle";
import { ORG } from "@/lib/data";

function SectionHeading({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div style={{ marginBottom: 14, marginTop: 8 }}>
      <h2
        style={{
          fontSize: 13,
          fontWeight: 650,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          margin: 0,
        }}
      >
        {children}
      </h2>
      {note && (
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "5px 0 0" }}>{note}</p>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <main
      style={{
        maxWidth: 1240,
        margin: "0 auto",
        padding: "32px 24px 72px",
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--series-1)",
              marginBottom: 8,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                background: "var(--series-1)",
                display: "inline-block",
              }}
            />
            {ORG.name}
          </div>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 680,
              letterSpacing: "-0.03em",
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            Fundraising Performance
          </h1>
          <p
            style={{
              fontSize: 14.5,
              color: "var(--text-secondary)",
              margin: "7px 0 0",
              maxWidth: 620,
            }}
          >
            {ORG.mission} {ORG.asOfLabel} · fiscal year runs January to December.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
          <span
            style={{
              fontSize: 12.5,
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: "6px 12px",
              whiteSpace: "nowrap",
            }}
          >
            Data as of {ORG.asOf}
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* Headline numbers */}
      <section>
        <SectionHeading>Headline Metrics</SectionHeading>
        <KpiTiles />
      </section>

      {/* AI analyst */}
      <section>
        <SectionHeading note="Have a conversation with the data, or run one of the standing analyses.">
          Analysis
        </SectionHeading>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AnalystChat />
          <AiAnalyst />
        </div>
      </section>

      {/* Trend + campaigns */}
      <section>
        <SectionHeading>Revenue</SectionHeading>
        <div className="chart-grid">
          <RevenueTrend />
          <CampaignProgress />
        </div>
      </section>

      {/* Donors */}
      <section>
        <SectionHeading>Donors</SectionHeading>
        <div className="chart-grid">
          <SegmentChart />
          <DonorMovement />
          <ChannelMix />
        </div>
      </section>

      {/* Risk */}
      <section>
        <SectionHeading note="Standing checks against the donor file. Thresholds are stated on every item.">
          Risk
        </SectionHeading>
        <RiskRegister />
      </section>

      {/* Opportunity */}
      <section>
        <SectionHeading note="Money already inside the donor file, waiting on someone to go get it.">
          Opportunity
        </SectionHeading>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <OpportunityCards />
        </div>
      </section>

      {/* Outreach */}
      <section>
        <SectionHeading note="Turn what the data says into something you can actually send.">
          Outreach
        </SectionHeading>
        <OutreachStudio />
      </section>

      <footer
        style={{
          borderTop: "1px solid var(--grid)",
          paddingTop: 20,
          fontSize: 12.5,
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}
      >
        <p style={{ margin: 0 }}>
          Demonstration dashboard. The Meridian Hope Foundation and every donor, campaign and
          figure on this page are fictional. Replace <code>lib/data.ts</code> with your CRM adapter
          to run it on real data.
        </p>
      </footer>
    </main>
  );
}
