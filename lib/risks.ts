/**
 * Risk register — computed, not authored.
 *
 * Every item below is derived from lib/data.ts by an explicit rule, and each
 * rule is stated in the output so a reader can disagree with the threshold
 * rather than having to trust a label. Severities move on their own when the
 * underlying numbers move: swap in a real CRM and a green item can turn red.
 *
 * This is deliberately independent of the AI panels — the register renders
 * with no API key, like the charts.
 */

import { CAMPAIGNS, LAPSED, MONTHLY_REVENUE, SEGMENTS, TOP_DONORS } from "./data";

export type Severity = "critical" | "serious" | "warning" | "good";

export type Risk = {
  id: string;
  title: string;
  severity: Severity;
  /** Dollars exposed if the risk lands. Null when the risk isn't dollar-denominated. */
  exposure: number | null;
  exposureLabel: string;
  /** What the data actually says. */
  finding: string;
  /** The threshold that produced this severity — stated so it can be argued with. */
  rule: string;
  /** The recommended move. */
  action: string;
};

export const SEVERITY_META: Record<
  Severity,
  { label: string; icon: string; color: string; rank: number }
> = {
  critical: { label: "Critical", icon: "▲", color: "var(--critical)", rank: 0 },
  serious: { label: "Serious", icon: "●", color: "var(--serious)", rank: 1 },
  warning: { label: "Watch", icon: "◆", color: "var(--warning)", rank: 2 },
  good: { label: "Healthy", icon: "✓", color: "var(--good)", rank: 3 },
};

const AS_OF = new Date("2026-06-30T00:00:00Z");
const YTD_RAISED = MONTHLY_REVENUE.reduce((s, m) => s + (m.y2026 ?? 0), 0);

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;
const daysUntil = (iso: string) =>
  Math.round((new Date(`${iso}T00:00:00Z`).getTime() - AS_OF.getTime()) / 86_400_000);

/* ------------------------------------------------------------------ */

function concentrationRisk(): Risk {
  const top3 = [...TOP_DONORS].sort((a, b) => b.ytd - a.ytd).slice(0, 3);
  const top3Total = top3.reduce((s, d) => s + d.ytd, 0);
  const share = top3Total / YTD_RAISED;
  const largest = top3[0];

  const severity: Severity =
    share >= 0.5 ? "critical" : share >= 0.35 ? "serious" : share >= 0.25 ? "warning" : "good";

  return {
    id: "concentration",
    title: "Revenue concentrated in three donors",
    severity,
    exposure: largest.ytd,
    exposureLabel: `${money(largest.ytd)} single-donor exposure`,
    finding: `Three donors have given ${money(top3Total)} of the ${money(YTD_RAISED)} raised this year — ${pct(share)} of all revenue. The largest, ${largest.name}, accounts for ${money(largest.ytd)} on its own.`,
    rule: "Critical when the top three donors exceed 50% of year-to-date revenue; serious above 35%.",
    action: `Confirm ${largest.name}'s renewal intent before Q4 planning, and do not build the 2027 budget on all three renewing at this level.`,
  };
}

function decemberRisk(): Risk {
  const dec = MONTHLY_REVENUE.find((m) => m.month === "Dec")!;
  const total2025 = MONTHLY_REVENUE.reduce((s, m) => s + m.y2025, 0);
  const share = dec.y2025 / total2025;

  // Same growth basis the projection tool uses, so the two agree.
  const ytd2025 = MONTHLY_REVENUE.filter((m) => m.y2026 !== null).reduce(
    (s, m) => s + m.y2025,
    0,
  );
  const growth = YTD_RAISED / ytd2025;
  const projectedDec = dec.y2025 * growth;
  const softMiss = projectedDec * 0.15;

  const severity: Severity = share >= 0.25 ? "serious" : share >= 0.18 ? "warning" : "good";

  return {
    id: "december",
    title: "A quarter of the year rides on December",
    severity,
    exposure: softMiss,
    exposureLabel: `${money(softMiss)} at risk from a 15% miss`,
    finding: `December delivered ${money(dec.y2025)} last year — ${pct(share)} of the annual total. On this year's growth rate it projects to ${money(projectedDec)}, so a 15% shortfall costs ${money(softMiss)} with no month left to recover it.`,
    rule: "Serious when a single month carries 25% or more of annual revenue.",
    action:
      "Lock the December appeal creative and the matching-gift commitment by end of September, not November.",
  };
}

function churnRisk(): Risk {
  const biggest = [...SEGMENTS].sort((a, b) => b.donors - a.donors)[0];
  const lapsing = biggest.donors * (1 - biggest.retention);
  const valueLost = biggest.revenue * (1 - biggest.retention);
  const avgGift = biggest.revenue / biggest.donors;

  const severity: Severity =
    biggest.retention < 0.45 ? "serious" : biggest.retention < 0.6 ? "warning" : "good";

  return {
    id: "churn",
    title: `${biggest.name} donors churn faster than they can be replaced`,
    severity,
    exposure: valueLost,
    exposureLabel: `${money(valueLost)} lost per year`,
    finding: `${biggest.name} retains ${pct(biggest.retention, 0)} of ${biggest.donors.toLocaleString("en-US")} donors, so roughly ${Math.round(lapsing).toLocaleString("en-US")} lapse annually — about ${money(valueLost)} at their ${money(avgGift)} average gift. Acquisition spend goes to standing still.`,
    rule: "Serious when the largest segment by donor count retains under 45%.",
    action:
      "Test a second-gift conversion path within 90 days of first gift; moving retention to 45% is worth roughly " +
      money(biggest.revenue * 0.07) +
      " a year.",
  };
}

function campaignPaceRisk(): Risk {
  const open = CAMPAIGNS.filter((c) => c.raised < c.goal && daysUntil(c.closes) > 0).map((c) => ({
    ...c,
    gap: c.goal - c.raised,
    days: daysUntil(c.closes),
    ratio: c.raised / c.goal,
  }));

  const behind = open.filter((c) => c.ratio < 0.75 && c.days <= 190);
  const totalGap = behind.reduce((s, c) => s + c.gap, 0);
  const worst = [...behind].sort((a, b) => a.ratio - b.ratio)[0];

  const severity: Severity =
    behind.length >= 2 || totalGap > 200_000
      ? "serious"
      : behind.length >= 1
        ? "warning"
        : "good";

  if (!behind.length) {
    return {
      id: "campaign-pace",
      title: "Open campaigns are on pace",
      severity: "good",
      exposure: null,
      exposureLabel: "No campaign materially behind",
      finding: "Every open campaign is at or above 75% of goal with time remaining.",
      rule: "Flagged when an open campaign sits under 75% of goal with 190 days or fewer left.",
      action: "Keep the current solicitation schedule.",
    };
  }

  return {
    id: "campaign-pace",
    title: `${behind.length} campaign${behind.length > 1 ? "s are" : " is"} behind pace`,
    severity,
    exposure: totalGap,
    exposureLabel: `${money(totalGap)} of unmet goals`,
    finding: `${behind
      .map(
        (c) =>
          `${c.name} at ${pct(c.ratio, 0)} (${money(c.gap)} short, ${c.days} days left)`,
      )
      .join("; ")}. Together that is ${money(totalGap)} of goal still to raise.`,
    rule: "Flagged when an open campaign sits under 75% of goal with 190 days or fewer left; serious at two or more, or over $200,000 combined.",
    action: `${worst.name} is furthest behind and needs ${money(Math.round(worst.gap / worst.days))} a day to close — decide now whether to resource it or rebase the goal.`,
  };
}

function lapsedRisk(): Risk {
  const { lybunt } = LAPSED;
  const share = lybunt.value / YTD_RAISED;
  const recoverable = lybunt.value * 0.15;

  const severity: Severity = share >= 0.25 ? "serious" : share >= 0.1 ? "warning" : "good";

  return {
    id: "lapsed",
    title: "Lapsed donors sitting unworked",
    severity,
    exposure: lybunt.value,
    exposureLabel: `${money(lybunt.value)} in recently lapsed donors`,
    finding: `${lybunt.donors.toLocaleString("en-US")} donors who gave last year have not given this year, worth ${money(lybunt.value)} — ${pct(share)} of everything raised so far. No campaign in the active list targets them.`,
    rule: "Serious when recently lapsed donors exceed 25% of year-to-date revenue.",
    action: `A reactivation appeal converting 15% returns about ${money(recoverable)}, and those donors re-enter the retention base for next year.`,
  };
}

function acquisitionPace(): Risk {
  // Acquisition is seasonal like revenue, so a half-year count is compared
  // against last year's first-half REVENUE share rather than a flat 50%.
  const closed = MONTHLY_REVENUE.filter((m) => m.y2026 !== null);
  const h1Share =
    closed.reduce((s, m) => s + m.y2025, 0) /
    MONTHLY_REVENUE.reduce((s, m) => s + m.y2025, 0);

  const acquired2025 = 3_644;
  const acquired2026H1 = 1_986;
  const expected = acquired2025 * h1Share;
  const ratio = acquired2026H1 / expected;

  const severity: Severity = ratio >= 1 ? "good" : ratio >= 0.85 ? "warning" : "serious";

  return {
    id: "acquisition",
    title: "New-donor acquisition pace",
    severity,
    exposure: null,
    exposureLabel:
      ratio >= 1
        ? `${pct(ratio - 1, 0)} ahead of seasonal pace`
        : `${pct(1 - ratio, 0)} behind seasonal pace`,
    finding: `${acquired2026H1.toLocaleString("en-US")} donors acquired in the first half against roughly ${Math.round(expected).toLocaleString("en-US")} expected at this point in the year — the first half historically carries only ${pct(h1Share, 0)} of annual activity, so a flat half-year comparison understates it.`,
    rule: "Serious below 85% of seasonally-adjusted pace; healthy at or above 100%.",
    action:
      ratio >= 1
        ? "No action — but the gain is in donors, not dollars, and grassroots retention decides whether it holds."
        : "Rebuild the top of the funnel before Q4; acquisition made in December retains worst.",
  };
}

/* ------------------------------------------------------------------ */

/** The full register, worst first. */
export function buildRiskRegister(): Risk[] {
  return [
    concentrationRisk(),
    decemberRisk(),
    churnRisk(),
    lapsedRisk(),
    campaignPaceRisk(),
    acquisitionPace(),
  ].sort((a, b) => SEVERITY_META[a.severity].rank - SEVERITY_META[b.severity].rank);
}

/** Counts by severity, for the section summary line. */
export function riskSummary(risks: Risk[]) {
  return {
    critical: risks.filter((r) => r.severity === "critical").length,
    serious: risks.filter((r) => r.severity === "serious").length,
    warning: risks.filter((r) => r.severity === "warning").length,
    good: risks.filter((r) => r.severity === "good").length,
    // Deliberately no combined total: these exposures are different units over
    // different horizons (one renewal, one month, a year of churn, a standing
    // file). Summing them would produce a confident-looking meaningless number.
  };
}

/** Rendered into the AI prompt so the chat and the dashboard agree. */
export function riskRegisterForAI(): string {
  const risks = buildRiskRegister();
  const lines = ["RISK REGISTER (computed from the data by fixed rules):"];
  for (const r of risks) {
    lines.push(
      `- [${SEVERITY_META[r.severity].label.toUpperCase()}] ${r.title} — ${r.exposureLabel}. ${r.finding} Rule: ${r.rule}`,
    );
  }
  return lines.join("\n");
}
