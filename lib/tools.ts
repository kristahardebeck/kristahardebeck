/**
 * Tools the conversational analyst can call.
 *
 * The one-shot analyst reads a text summary and reasons over it. That is fine
 * for narrative, but bad at arithmetic: "do we hit $4M if December is soft?"
 * is a real calculation, and a model doing it in prose will drift.
 *
 * These tools do the math deterministically in TypeScript and hand back the
 * working, so the model composes and explains rather than computes. Each is a
 * pure function of lib/data.ts — no I/O, no side effects, safe to call in any
 * order and any number of times.
 */

import {
  CAMPAIGNS,
  CHANNELS,
  DONOR_MOVEMENT,
  LAPSED,
  MONTHLY_REVENUE,
  ORG,
  SEGMENTS,
} from "./data";

/* ------------------------------------------------------------------ */
/* Schemas sent to the model                                           */
/* ------------------------------------------------------------------ */

export const TOOL_DEFINITIONS = [
  {
    name: "get_campaign_detail",
    description:
      "Look up one campaign's current standing: raised, goal, remaining gap, days left before it closes, and the daily rate needed to close the gap. Use this whenever the user asks whether a campaign will make its number, or how far behind it is.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description:
            "Exact campaign name, e.g. 'Classrooms for Wakiso'. Case-insensitive; partial names match if unambiguous.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "get_segment_detail",
    description:
      "Return donor-segment figures with derived metrics: revenue, donor count, average gift, share of total revenue, retention rate, and revenue per retained donor. Omit `segment` to get every segment at once for comparison.",
    input_schema: {
      type: "object" as const,
      properties: {
        segment: {
          type: "string",
          description:
            "One of: Grassroots, Sustainer, Mid-level, Major, Principal. Omit to return all five.",
        },
      },
      required: [],
    },
  },
  {
    name: "project_year_end",
    description:
      "Project the 2026 full-year total from six months of actuals. Applies this year's growth rate to last year's remaining-month seasonality, with optional adjustments for a stronger or weaker second half and December specifically. Returns the month-by-month projection and the working. Use this for any 'will we hit X' or 'what if' question about the annual number.",
    input_schema: {
      type: "object" as const,
      properties: {
        second_half_change_pct: {
          type: "number",
          description:
            "Percent adjustment to July–November versus the growth-adjusted baseline. -10 means those months come in 10% below baseline. Defaults to 0.",
        },
        december_change_pct: {
          type: "number",
          description:
            "Percent adjustment to December alone, which carries about a quarter of the year. -15 means a 15% weaker December. Defaults to 0.",
        },
        target: {
          type: "number",
          description:
            "Optional annual target in dollars, e.g. 4000000. If given, the result states whether the projection clears it and by how much.",
        },
      },
      required: [],
    },
  },
  {
    name: "estimate_recapture",
    description:
      "Estimate the revenue from winning back lapsed donors, or from closing part of the major gift pipeline, at a given success rate. Use this to size an opportunity before recommending the team spend time on it.",
    input_schema: {
      type: "object" as const,
      properties: {
        pool: {
          type: "string",
          enum: ["lybunt", "sybunt", "pipeline"],
          description:
            "lybunt = recently lapsed (gave last year, not this year). sybunt = long lapsed (gave in an earlier year, not the last two). pipeline = open major gift proposals.",
        },
        rate_pct: {
          type: "number",
          description:
            "Assumed success rate as a percent, e.g. 15 for 15%. Typical reactivation of recently lapsed donors runs 10-20%; major gift close rates run 30-50%.",
        },
      },
      required: ["pool", "rate_pct"],
    },
  },
  {
    name: "compare_months",
    description:
      "Compare a specific month across years, or sum a range of months within a year. Use for pacing questions about a particular period rather than the whole year.",
    input_schema: {
      type: "object" as const,
      properties: {
        months: {
          type: "array",
          items: { type: "string" },
          description:
            "Three-letter month labels, e.g. ['Oct','Nov','Dec']. Must match the dataset's labels.",
        },
        years: {
          type: "array",
          items: { type: "number" },
          description: "Years to include: any of 2024, 2025, 2026.",
        },
      },
      required: ["months", "years"],
    },
  },
  {
    name: "get_channel_mix",
    description:
      "Return trailing-twelve-month revenue by fundraising channel with gift counts, average gift size and share of total. Use when the user asks where the money comes from, or which channel is most efficient.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
] as const;

/* ------------------------------------------------------------------ */
/* Executors                                                           */
/* ------------------------------------------------------------------ */

type ToolResult = Record<string, unknown>;

const round = (n: number) => Math.round(n);
const pct1 = (n: number) => Number((n * 100).toFixed(1));

/** Data close date — the point all "days remaining" figures count from. */
const AS_OF = new Date(`${ORG.asOf}T00:00:00Z`);

function getCampaignDetail(input: { name?: string }): ToolResult {
  const query = (input.name ?? "").trim().toLowerCase();
  if (!query) return { error: "No campaign name supplied." };

  let hit = CAMPAIGNS.find((c) => c.name.toLowerCase() === query);
  if (!hit) {
    const partial = CAMPAIGNS.filter((c) => c.name.toLowerCase().includes(query));
    if (partial.length === 1) hit = partial[0];
    else if (partial.length > 1) {
      return {
        error: `"${input.name}" matches more than one campaign.`,
        candidates: partial.map((c) => c.name),
      };
    }
  }
  if (!hit) {
    return {
      error: `No campaign named "${input.name}".`,
      available: CAMPAIGNS.map((c) => c.name),
    };
  }

  const gap = hit.goal - hit.raised;
  const closes = new Date(`${hit.closes}T00:00:00Z`);
  const daysRemaining = Math.round((closes.getTime() - AS_OF.getTime()) / 86_400_000);

  return {
    name: hit.name,
    channel: hit.channel,
    goal: hit.goal,
    raised: hit.raised,
    pct_to_goal: pct1(hit.raised / hit.goal),
    gap_remaining: Math.max(gap, 0),
    over_goal_by: gap < 0 ? -gap : 0,
    donors: hit.donors,
    average_gift: round(hit.raised / hit.donors),
    closes: hit.closes,
    days_remaining: daysRemaining,
    status:
      gap <= 0
        ? "goal met"
        : daysRemaining <= 0
          ? "closed short of goal"
          : "open, still short",
    required_per_day:
      gap > 0 && daysRemaining > 0 ? round(gap / daysRemaining) : null,
    gifts_needed_at_current_average:
      gap > 0 ? Math.ceil(gap / (hit.raised / hit.donors)) : 0,
  };
}

function getSegmentDetail(input: { segment?: string }): ToolResult {
  const totalRevenue = SEGMENTS.reduce((s, x) => s + x.revenue, 0);
  const totalDonors = SEGMENTS.reduce((s, x) => s + x.donors, 0);

  const shape = (s: (typeof SEGMENTS)[number]) => ({
    segment: s.name,
    gift_range: s.range,
    donors: s.donors,
    revenue: s.revenue,
    average_gift: round(s.revenue / s.donors),
    share_of_revenue_pct: pct1(s.revenue / totalRevenue),
    share_of_donors_pct: pct1(s.donors / totalDonors),
    retention_pct: pct1(s.retention),
    revenue_per_retained_donor: round(s.revenue / (s.donors * s.retention)),
  });

  const wanted = (input.segment ?? "").trim().toLowerCase();
  if (wanted) {
    const hit = SEGMENTS.find((s) => s.name.toLowerCase() === wanted);
    if (!hit) {
      return {
        error: `No segment named "${input.segment}".`,
        available: SEGMENTS.map((s) => s.name),
      };
    }
    return shape(hit);
  }

  return {
    total_revenue: totalRevenue,
    total_donors: totalDonors,
    segments: SEGMENTS.map(shape),
  };
}

function projectYearEnd(input: {
  second_half_change_pct?: number;
  december_change_pct?: number;
  target?: number;
}): ToolResult {
  const h2Adj = (input.second_half_change_pct ?? 0) / 100;
  const decAdj = (input.december_change_pct ?? 0) / 100;

  const closed = MONTHLY_REVENUE.filter((m) => m.y2026 !== null);
  const remaining = MONTHLY_REVENUE.filter((m) => m.y2026 === null);

  const ytd2026 = closed.reduce((s, m) => s + (m.y2026 ?? 0), 0);
  const ytd2025 = closed.reduce((s, m) => s + m.y2025, 0);
  const growth = ytd2026 / ytd2025;

  const projected = remaining.map((m) => {
    const adj = m.month === "Dec" ? decAdj : h2Adj;
    const value = m.y2025 * growth * (1 + adj);
    return {
      month: m.month,
      prior_year: m.y2025,
      projected: round(value),
      adjustment_applied_pct: Number((adj * 100).toFixed(1)),
    };
  });

  const remainingTotal = projected.reduce((s, m) => s + m.projected, 0);
  const total = ytd2026 + remainingTotal;
  const prior = MONTHLY_REVENUE.reduce((s, m) => s + m.y2025, 0);

  const result: ToolResult = {
    method:
      "Applied the year-to-date growth rate to last year's remaining-month seasonality, then applied the requested adjustments.",
    months_closed: closed.length,
    actual_ytd_2026: ytd2026,
    same_period_2025: ytd2025,
    ytd_growth_pct: pct1(growth - 1),
    projected_remaining: projected,
    projected_remaining_total: round(remainingTotal),
    projected_full_year_2026: round(total),
    full_year_2025: prior,
    projected_growth_vs_2025_pct: pct1(total / prior - 1),
  };

  if (typeof input.target === "number" && input.target > 0) {
    const diff = total - input.target;
    result.target = input.target;
    result.clears_target = diff >= 0;
    result.margin_vs_target = round(diff);
    result.pct_of_target = pct1(total / input.target);
  }

  return result;
}

function estimateRecapture(input: { pool?: string; rate_pct?: number }): ToolResult {
  const key = (input.pool ?? "").toLowerCase() as keyof typeof LAPSED;
  const pool = LAPSED[key];
  if (!pool) {
    return {
      error: `Unknown pool "${input.pool}".`,
      available: ["lybunt", "sybunt", "pipeline"],
    };
  }

  const rate = (input.rate_pct ?? 0) / 100;
  if (rate < 0 || rate > 1) {
    return { error: "rate_pct must be between 0 and 100." };
  }

  const recovered = pool.value * rate;
  const ytd = 1_538_000; // actual 2026 year-to-date

  return {
    pool: pool.label,
    description: pool.description,
    pool_donors: pool.donors,
    pool_value: pool.value,
    assumed_rate_pct: input.rate_pct,
    donors_recovered: Math.round(pool.donors * rate),
    revenue_recovered: round(recovered),
    as_pct_of_ytd_raised: pct1(recovered / ytd),
    note:
      key === "pipeline"
        ? "Pipeline value is committed-in-progress, not lapsed revenue — a close rate here means proposals landing, not donors returning."
        : "Recaptured donors also re-enter the retention base, so the effect compounds into next year.",
  };
}

function compareMonths(input: { months?: string[]; years?: number[] }): ToolResult {
  const months = input.months ?? [];
  const years = input.years ?? [];
  if (!months.length || !years.length) {
    return { error: "Supply at least one month and one year." };
  }

  const known = MONTHLY_REVENUE.map((m) => m.month);
  const unknown = months.filter((m) => !known.includes(m));
  if (unknown.length) {
    return { error: `Unknown month labels: ${unknown.join(", ")}.`, valid_months: known };
  }

  const rows = MONTHLY_REVENUE.filter((m) => months.includes(m.month));
  const totals: Record<string, number | null> = {};

  for (const y of years) {
    const key = `y${y}` as "y2024" | "y2025" | "y2026";
    if (!["y2024", "y2025", "y2026"].includes(key)) {
      return { error: `Unknown year ${y}.`, valid_years: [2024, 2025, 2026] };
    }
    const values = rows.map((r) => r[key]);
    totals[String(y)] = values.some((v) => v === null)
      ? null
      : values.reduce((s: number, v) => s + (v as number), 0);
  }

  return {
    months,
    monthly: rows.map((r) => ({
      month: r.month,
      2024: r.y2024,
      2025: r.y2025,
      2026: r.y2026,
    })),
    totals,
    note: "A null total means at least one of those months has not closed yet in 2026.",
  };
}

function getChannelMix(): ToolResult {
  const total = CHANNELS.reduce((s, c) => s + c.revenue, 0);
  return {
    total_revenue: total,
    channels: CHANNELS.map((c) => ({
      channel: c.name,
      revenue: c.revenue,
      gifts: c.gifts,
      average_gift: round(c.revenue / c.gifts),
      share_pct: pct1(c.revenue / total),
    })),
  };
}

/* ------------------------------------------------------------------ */

const EXECUTORS: Record<string, (input: Record<string, never>) => ToolResult> = {
  get_campaign_detail: getCampaignDetail as never,
  get_segment_detail: getSegmentDetail as never,
  project_year_end: projectYearEnd as never,
  estimate_recapture: estimateRecapture as never,
  compare_months: compareMonths as never,
  get_channel_mix: getChannelMix as never,
};

/** Human-readable label shown in the UI while a tool runs. */
export function describeToolCall(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "get_campaign_detail":
      return `Looking up ${input.name ?? "campaign"}`;
    case "get_segment_detail":
      return input.segment
        ? `Pulling ${input.segment} segment figures`
        : "Pulling all donor segments";
    case "project_year_end": {
      const bits: string[] = [];
      if (input.december_change_pct) bits.push(`December ${input.december_change_pct}%`);
      if (input.second_half_change_pct) bits.push(`H2 ${input.second_half_change_pct}%`);
      return bits.length
        ? `Projecting year end (${bits.join(", ")})`
        : "Projecting year end";
    }
    case "estimate_recapture":
      return `Sizing ${String(input.pool ?? "").toUpperCase()} at ${input.rate_pct}%`;
    case "compare_months":
      return `Comparing ${(input.months as string[])?.join(", ") ?? "months"}`;
    case "get_channel_mix":
      return "Pulling channel mix";
    default:
      return `Running ${name}`;
  }
}

export function runTool(name: string, input: unknown): ToolResult {
  const fn = EXECUTORS[name];
  if (!fn) return { error: `Unknown tool "${name}".` };
  try {
    return fn((input ?? {}) as Record<string, never>);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Tool execution failed." };
  }
}

/** Extra context the conversational analyst gets beyond the data summary. */
export function toolGuidance(): string {
  return [
    "You have tools that compute against the fundraising data directly. Use them rather than doing arithmetic yourself — projections, recapture estimates and pacing math must come from a tool call, not from your own calculation.",
    "Call several tools in one turn when a question needs them. Call a tool again with different assumptions when the user asks a follow-up 'what if'.",
    `Today's reporting date is ${ORG.asOf}; six months of 2026 are closed.`,
    `Donor file movement by year is available in the data summary (${DONOR_MOVEMENT.length} years).`,
  ].join("\n\n");
}
