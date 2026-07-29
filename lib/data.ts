/**
 * Fundraising dataset for the Meridian Hope Foundation demo.
 *
 * Everything here is fictional but internally consistent: the monthly series,
 * campaign totals, segment totals and channel mix all reconcile against each
 * other, so figures the AI analyst derives from one table agree with another.
 *
 * Swap this file for your CRM adapter (Blackbaud, Bloomerang, Salesforce NPSP,
 * Stripe...) and every chart and the AI panel pick up the real numbers — the
 * shapes below are the contract.
 */

export const ORG = {
  name: "Meridian Hope Foundation",
  mission: "Girls' secondary education across Uganda.",
  fiscalYear: "Calendar year (Jan–Dec)",
  asOf: "2026-06-30",
  asOfLabel: "Through June 30, 2026",
} as const;

/* ------------------------------------------------------------------ */
/* Monthly revenue                                                     */
/* ------------------------------------------------------------------ */

export type MonthlyPoint = {
  month: string; // short label, e.g. "Jan"
  y2024: number;
  y2025: number;
  y2026: number | null; // null once past the close date — the line stops
};

export const MONTHLY_REVENUE: MonthlyPoint[] = [
  { month: "Jan", y2024: 178_000, y2025: 210_000, y2026: 238_000 },
  { month: "Feb", y2024: 162_000, y2025: 185_000, y2026: 214_000 },
  { month: "Mar", y2024: 208_000, y2025: 245_000, y2026: 279_000 },
  { month: "Apr", y2024: 231_000, y2025: 268_000, y2026: 302_000 },
  { month: "May", y2024: 199_000, y2025: 232_000, y2026: 261_000 },
  { month: "Jun", y2024: 176_000, y2025: 205_000, y2026: 244_000 },
  { month: "Jul", y2024: 154_000, y2025: 178_000, y2026: null },
  { month: "Aug", y2024: 149_000, y2025: 168_000, y2026: null },
  { month: "Sep", y2024: 205_000, y2025: 242_000, y2026: null },
  { month: "Oct", y2024: 254_000, y2025: 295_000, y2026: null },
  { month: "Nov", y2024: 341_000, y2025: 402_000, y2026: null },
  { month: "Dec", y2024: 796_000, y2025: 928_000, y2026: null },
];

/* ------------------------------------------------------------------ */
/* Campaigns                                                           */
/* ------------------------------------------------------------------ */

export type Campaign = {
  name: string;
  goal: number;
  raised: number;
  donors: number;
  channel: string;
  closes: string;
};

export const CAMPAIGNS: Campaign[] = [
  {
    name: "Spring Term Appeal",
    goal: 450_000,
    raised: 487_300,
    donors: 3_142,
    channel: "Direct mail + email",
    closes: "2026-05-31",
  },
  {
    name: "Monthly Sustainer Drive",
    goal: 300_000,
    raised: 318_400,
    donors: 1_876,
    channel: "Digital",
    closes: "2026-12-31",
  },
  {
    name: "Classrooms for Wakiso",
    goal: 400_000,
    raised: 286_000,
    donors: 47,
    channel: "Major gifts",
    closes: "2026-09-30",
  },
  {
    name: "Girls' Scholarship Fund",
    goal: 350_000,
    raised: 241_500,
    donors: 289,
    channel: "Events + mid-level",
    closes: "2026-10-15",
  },
  {
    name: "Corporate Match Challenge",
    goal: 250_000,
    raised: 163_200,
    donors: 34,
    channel: "Corporate",
    closes: "2026-11-30",
  },
  {
    name: "Legacy Circle",
    goal: 200_000,
    raised: 41_600,
    donors: 12,
    channel: "Planned giving",
    closes: "2026-12-31",
  },
];

/* ------------------------------------------------------------------ */
/* Donor segments (trailing 12 months)                                 */
/* ------------------------------------------------------------------ */

export type Segment = {
  name: string;
  range: string;
  donors: number;
  revenue: number;
  retention: number; // 0–1
};

export const SEGMENTS: Segment[] = [
  {
    name: "Grassroots",
    range: "Under $100",
    donors: 6_842,
    revenue: 412_600,
    retention: 0.38,
  },
  {
    name: "Sustainer",
    range: "$100–999",
    donors: 2_187,
    revenue: 681_900,
    retention: 0.64,
  },
  {
    name: "Mid-level",
    range: "$1K–9,999",
    donors: 412,
    revenue: 1_043_000,
    retention: 0.78,
  },
  {
    name: "Major",
    range: "$10K–99,999",
    donors: 63,
    revenue: 986_400,
    retention: 0.87,
  },
  {
    name: "Principal",
    range: "$100K+",
    donors: 7,
    revenue: 1_182_000,
    retention: 1.0,
  },
];

/* ------------------------------------------------------------------ */
/* Donor file movement                                                 */
/* ------------------------------------------------------------------ */

export type RetentionYear = {
  year: string;
  retained: number;
  reactivated: number;
  acquired: number;
  lapsed: number;
};

export const DONOR_MOVEMENT: RetentionYear[] = [
  { year: "2023", retained: 3_890, reactivated: 611, acquired: 3_402, lapsed: 3_120 },
  { year: "2024", retained: 4_502, reactivated: 703, acquired: 3_118, lapsed: 2_984 },
  { year: "2025", retained: 4_981, reactivated: 742, acquired: 3_644, lapsed: 2_847 },
  { year: "2026 YTD", retained: 5_412, reactivated: 498, acquired: 1_986, lapsed: 1_402 },
];

/* ------------------------------------------------------------------ */
/* Channel mix (trailing 12 months)                                    */
/* ------------------------------------------------------------------ */

export type Channel = { name: string; revenue: number; gifts: number };

export const CHANNELS: Channel[] = [
  { name: "Major gifts", revenue: 1_486_000, gifts: 118 },
  { name: "Direct mail", revenue: 742_000, gifts: 5_204 },
  { name: "Digital & email", revenue: 618_400, gifts: 7_891 },
  { name: "Events", revenue: 521_000, gifts: 1_412 },
  { name: "Recurring giving", revenue: 487_300, gifts: 22_512 },
  { name: "Corporate & foundations", revenue: 451_200, gifts: 86 },
];

/* ------------------------------------------------------------------ */
/* Top donors                                                          */
/* ------------------------------------------------------------------ */

export type TopDonor = {
  name: string;
  lifetime: number;
  ytd: number;
  segment: string;
  firstGift: string;
  lastGift: string;
};

export const TOP_DONORS: TopDonor[] = [
  { name: "Halvorsen Family Foundation", lifetime: 2_840_000, ytd: 425_000, segment: "Principal", firstGift: "2014", lastGift: "2026-05-12" },
  { name: "The Okonjo Trust", lifetime: 1_620_000, ytd: 310_000, segment: "Principal", firstGift: "2018", lastGift: "2026-06-02" },
  { name: "Rivera-Castellanos Fund", lifetime: 2_105_000, ytd: 185_000, segment: "Principal", firstGift: "2011", lastGift: "2026-03-19" },
  { name: "Blue Ridge Community Bank", lifetime: 412_000, ytd: 95_000, segment: "Major", firstGift: "2020", lastGift: "2026-04-08" },
  { name: "M. & D. Thackeray", lifetime: 986_000, ytd: 72_500, segment: "Major", firstGift: "2009", lastGift: "2026-06-21" },
  { name: "Northlight Charitable Trust", lifetime: 305_000, ytd: 60_000, segment: "Major", firstGift: "2021", lastGift: "2026-02-14" },
  { name: "A. Weathersby", lifetime: 528_000, ytd: 48_000, segment: "Major", firstGift: "2016", lastGift: "2026-05-30" },
  { name: "Sandoval Family Giving", lifetime: 261_000, ytd: 41_200, segment: "Major", firstGift: "2019", lastGift: "2026-01-27" },
];

/* ------------------------------------------------------------------ */
/* Headline metrics                                                    */
/* ------------------------------------------------------------------ */

export type Kpi = {
  id: string;
  label: string;
  value: number;
  prior: number;
  format: "currency" | "percent" | "number" | "currency-precise";
  /** true when a *decrease* is the good outcome (e.g. cost to raise a dollar) */
  lowerIsBetter?: boolean;
  note: string;
};

export const KPIS: Kpi[] = [
  {
    id: "ytd",
    label: "Raised year to date",
    value: 1_538_000,
    prior: 1_345_000,
    format: "currency",
    note: "Jan–Jun 2026 vs. the same six months of 2025.",
  },
  {
    id: "retention",
    label: "Donor retention rate",
    value: 0.614,
    prior: 0.582,
    format: "percent",
    note: "Share of 2025 donors who have given again since.",
  },
  {
    id: "avg",
    label: "Average gift",
    value: 186,
    prior: 172,
    format: "currency",
    note: "All channels, excluding gifts over $100K.",
  },
  {
    id: "mrr",
    label: "Recurring revenue / mo.",
    value: 40_600,
    prior: 34_150,
    format: "currency",
    note: "1,876 active sustainers on monthly plans.",
  },
  {
    id: "donors",
    label: "Active donors",
    value: 9_511,
    prior: 8_954,
    format: "number",
    note: "Gave at least once in the trailing 12 months.",
  },
  {
    id: "cost",
    label: "Cost to raise $1",
    value: 0.19,
    prior: 0.22,
    format: "currency-precise",
    lowerIsBetter: true,
    note: "Blended fundraising cost ratio across all channels.",
  },
];

/* ------------------------------------------------------------------ */
/* Lapsed-donor opportunity                                            */
/* ------------------------------------------------------------------ */

export const LAPSED = {
  lybunt: {
    label: "LYBUNT",
    description: "Gave last year but not this year",
    donors: 2_847,
    value: 604_000,
  },
  sybunt: {
    label: "SYBUNT",
    description: "Gave in some prior year but not the last two",
    donors: 4_116,
    value: 391_000,
  },
  pipeline: {
    label: "Major gift pipeline",
    description: "Open proposals with a solicitation date set",
    donors: 41,
    value: 2_400_000,
  },
} as const;

/* ------------------------------------------------------------------ */
/* Serialization for the AI analyst                                    */
/* ------------------------------------------------------------------ */

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

/**
 * Compact, unambiguous text rendering of the whole dataset. This is what the
 * model reads — keep it stable so prompt caching stays warm across requests.
 */
export function dataSummaryForAI(): string {
  const lines: string[] = [];

  lines.push(`ORGANIZATION: ${ORG.name}`);
  lines.push(`MISSION: ${ORG.mission}`);
  lines.push(`FISCAL YEAR: ${ORG.fiscalYear}`);
  lines.push(`REPORTING PERIOD: ${ORG.asOfLabel} (six months closed of 2026)`);
  lines.push("");

  lines.push("HEADLINE METRICS (current vs. prior comparable period):");
  for (const k of KPIS) {
    const fmt = (v: number) =>
      k.format === "percent"
        ? pct(v)
        : k.format === "number"
          ? v.toLocaleString("en-US")
          : k.format === "currency-precise"
            ? `$${v.toFixed(2)}`
            : money(v);
    const dir = k.lowerIsBetter ? "(lower is better)" : "";
    lines.push(`- ${k.label}: ${fmt(k.value)} vs ${fmt(k.prior)} ${dir}`.trim());
  }
  lines.push("");

  lines.push("MONTHLY REVENUE (2024 / 2025 / 2026, USD):");
  for (const m of MONTHLY_REVENUE) {
    const y26 = m.y2026 === null ? "not yet closed" : money(m.y2026);
    lines.push(`- ${m.month}: 2024 ${money(m.y2024)} | 2025 ${money(m.y2025)} | 2026 ${y26}`);
  }
  lines.push("");

  lines.push("ACTIVE CAMPAIGNS (2026):");
  for (const c of CAMPAIGNS) {
    const pctToGoal = ((c.raised / c.goal) * 100).toFixed(0);
    lines.push(
      `- ${c.name} [${c.channel}]: ${money(c.raised)} of ${money(c.goal)} goal (${pctToGoal}%), ${c.donors.toLocaleString("en-US")} donors, closes ${c.closes}`,
    );
  }
  lines.push("");

  lines.push("DONOR SEGMENTS (trailing 12 months):");
  for (const s of SEGMENTS) {
    const avg = Math.round(s.revenue / s.donors);
    lines.push(
      `- ${s.name} (${s.range}): ${s.donors.toLocaleString("en-US")} donors, ${money(s.revenue)}, avg ${money(avg)}, retention ${pct(s.retention)}`,
    );
  }
  lines.push("");

  lines.push("DONOR FILE MOVEMENT (donor counts by year):");
  for (const r of DONOR_MOVEMENT) {
    lines.push(
      `- ${r.year}: retained ${r.retained.toLocaleString("en-US")}, reactivated ${r.reactivated.toLocaleString("en-US")}, newly acquired ${r.acquired.toLocaleString("en-US")}, lapsed ${r.lapsed.toLocaleString("en-US")}`,
    );
  }
  lines.push("");

  lines.push("CHANNEL MIX (trailing 12 months):");
  for (const c of CHANNELS) {
    lines.push(
      `- ${c.name}: ${money(c.revenue)} across ${c.gifts.toLocaleString("en-US")} gifts`,
    );
  }
  lines.push("");

  lines.push("TOP DONORS (year to date):");
  for (const d of TOP_DONORS) {
    lines.push(
      `- ${d.name} [${d.segment}]: ${money(d.ytd)} YTD, ${money(d.lifetime)} lifetime, donor since ${d.firstGift}, last gift ${d.lastGift}`,
    );
  }
  lines.push("");

  lines.push("LAPSED & PIPELINE:");
  for (const v of Object.values(LAPSED)) {
    lines.push(
      `- ${v.label} (${v.description}): ${v.donors.toLocaleString("en-US")} donors, ${money(v.value)}`,
    );
  }

  return lines.join("\n");
}
