import AnalystChat from "@/components/AnalystChat";
import CampaignProgress from "@/components/CampaignProgress";
import ChannelMix from "@/components/ChannelMix";
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
            Fundraising Dashboard
          </h1>
          <p
            style={{
              fontSize: 14.5,
              color: "var(--text-secondary)",
              margin: "7px 0 0",
              maxWidth: 620,
            }}
          >
            {ORG.mission}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
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
        <SectionHeading note="Run a standing analysis or ask your own question.">
          Analysis
        </SectionHeading>
        <AnalystChat />
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
          <ChannelMix />
        </div>
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

      {/* Risk */}
      <section>
        <SectionHeading>Risk</SectionHeading>
        <RiskRegister />
      </section>

    </main>
  );
}
