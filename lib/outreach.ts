/**
 * Outreach audiences and channels.
 *
 * Every audience carries a brief computed from lib/data.ts — size, giving
 * history, retention, a suggested ask. That brief goes into the prompt, so
 * generated outreach cites the audience's real numbers instead of inventing
 * plausible-sounding ones. No tool round trip needed: the audience is chosen
 * before the request, so the facts can be resolved up front.
 */

import { CAMPAIGNS, LAPSED, ORG, SEGMENTS, TOP_DONORS } from "./data";

export type Channel =
  | "email"
  | "letter"
  | "call"
  | "event"
  | "text"
  | "social";

export const CHANNELS: Array<{ id: Channel; label: string; note: string }> = [
  { id: "email", label: "Email", note: "Subject line + body" },
  { id: "letter", label: "Direct mail", note: "Printed appeal letter" },
  { id: "call", label: "Phone script", note: "Talking points + objections" },
  { id: "event", label: "Event invite", note: "Invitation + the ask" },
  { id: "text", label: "Text message", note: "Under 160 characters" },
  { id: "social", label: "Social post", note: "Public, no personal data" },
];

export type Audience = {
  id: string;
  label: string;
  group: "Segment" | "Lapsed" | "Prospect";
  /** Computed facts the model must write from. */
  brief: string;
  /** Suggested ask in dollars, derived from what this audience already gives. */
  suggestedAsk: number;
  size: number;
};

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Round an ask to something a human would actually print. */
function tidyAsk(n: number): number {
  if (n >= 50_000) return Math.round(n / 5_000) * 5_000;
  if (n >= 5_000) return Math.round(n / 500) * 500;
  if (n >= 500) return Math.round(n / 50) * 50;
  if (n >= 100) return Math.round(n / 10) * 10;
  return Math.max(10, Math.round(n / 5) * 5);
}

function segmentAudiences(): Audience[] {
  return SEGMENTS.map((s) => {
    const avg = s.revenue / s.donors;
    // Upgrade ask: modest step above what they already give.
    const ask = tidyAsk(avg * 1.25);
    return {
      id: `segment:${s.name.toLowerCase()}`,
      label: `${s.name} donors`,
      group: "Segment" as const,
      size: s.donors,
      suggestedAsk: ask,
      brief: [
        `${s.donors.toLocaleString("en-US")} active donors giving ${s.range}.`,
        `They contributed ${money(s.revenue)} over the trailing twelve months, averaging ${money(avg)} per donor.`,
        `Retention is ${pct(s.retention)} — ${
          s.retention >= 0.75
            ? "this group stays, so the message can assume a relationship."
            : s.retention >= 0.5
              ? "roughly half stay year to year, so the message has to re-earn attention."
              : "most do not give again, so treat the reader as someone who gave once and drifted."
        }`,
        `A sensible upgrade ask is ${money(ask)}, a step above their ${money(avg)} average rather than a leap.`,
      ].join(" "),
    };
  });
}

function lapsedAudiences(): Audience[] {
  const { lybunt, sybunt } = LAPSED;
  const lyAvg = lybunt.value / lybunt.donors;
  const syAvg = sybunt.value / sybunt.donors;

  return [
    {
      id: "lapsed:lybunt",
      label: "Recently lapsed — gave last year",
      group: "Lapsed",
      size: lybunt.donors,
      suggestedAsk: tidyAsk(lyAvg),
      brief: [
        `${lybunt.donors.toLocaleString("en-US")} donors who gave last year and have not given this year, worth ${money(lybunt.value)} in prior giving — about ${money(lyAvg)} each.`,
        "They are not strangers: they chose this organization within the last eighteen months and simply have not been asked again.",
        `Match the ask to what they last gave (${money(tidyAsk(lyAvg))}) rather than upgrading — the goal is the return, not the increase.`,
        "Do not scold or guilt. The most common reason a donor lapses is that nobody followed up.",
      ].join(" "),
    },
    {
      id: "lapsed:sybunt",
      label: "Long lapsed — two or more years",
      group: "Lapsed",
      size: sybunt.donors,
      suggestedAsk: tidyAsk(syAvg),
      brief: [
        `${sybunt.donors.toLocaleString("en-US")} donors who gave in some earlier year but not in the last two, worth ${money(sybunt.value)} historically — about ${money(syAvg)} each.`,
        "The relationship is cold. Assume they do not remember recent programs and may not recognise current staff names.",
        `Lead with what has changed since they were last involved, and keep the ask low (${money(tidyAsk(syAvg))}) — the objective is reactivation, not revenue.`,
      ].join(" "),
    },
  ];
}

function prospectAudiences(): Audience[] {
  const { pipeline } = LAPSED;
  const pipelineAvg = pipeline.value / pipeline.donors;
  const behind = CAMPAIGNS.filter((c) => c.raised < c.goal).sort(
    (a, b) => a.raised / a.goal - b.raised / b.goal,
  )[0];
  const principals = TOP_DONORS.filter((d) => d.segment === "Principal");

  return [
    {
      id: "prospect:pipeline",
      label: "Major gift pipeline",
      group: "Prospect",
      size: pipeline.donors,
      suggestedAsk: tidyAsk(pipelineAvg),
      brief: [
        `${pipeline.donors} open major gift proposals worth ${money(pipeline.value)} in total — averaging ${money(pipelineAvg)} each.`,
        "These are cultivated relationships with a solicitation date already set, so this is a close, not an introduction.",
        `${behind.name} is the campaign furthest from goal (${money(behind.goal - behind.raised)} short), which makes a concrete place to direct a gift.`,
        "Write for one named person, not a list. Reference the specific program the gift funds.",
      ].join(" "),
    },
    {
      id: "prospect:principal",
      label: "Principal donor stewardship",
      group: "Prospect",
      size: principals.length,
      suggestedAsk: tidyAsk(
        principals.reduce((s, d) => s + d.ytd, 0) / Math.max(principals.length, 1),
      ),
      brief: [
        `${principals.length} principal donors giving ${money(principals.reduce((s, d) => s + d.ytd, 0))} between them this year — the longest-standing has been giving since ${principals.map((d) => d.firstGift).sort()[0]}.`,
        "This is stewardship, not solicitation: the purpose is to report impact and deepen the relationship before the next ask.",
        "These three donors are 59.8% of this year's revenue, so the tone should reflect genuine partnership rather than transactional thanks.",
        "Do not ask for money in this piece unless explicitly instructed to.",
      ].join(" "),
    },
  ];
}

export function allAudiences(): Audience[] {
  return [...segmentAudiences(), ...lapsedAudiences(), ...prospectAudiences()];
}

export function findAudience(id: string): Audience | undefined {
  return allAudiences().find((a) => a.id === id);
}

/** Channel-specific format constraints handed to the model. */
export function channelBrief(channel: Channel): string {
  switch (channel) {
    case "email":
      return "Format: an email. Give three subject-line options, then the body. Under 200 words of body copy — people read email on a phone. One clear link-style call to action.";
    case "letter":
      return "Format: a printed appeal letter. Salutation, body, sign-off, and a PS — the PS is the most-read line on the page, so put the ask there too. Around 300–400 words.";
    case "call":
      return "Format: a phone script. An opening that says who is calling and why in two sentences, three talking points, the ask stated plainly, and responses to the two most likely objections. Bullet points, not prose paragraphs — the caller is reading this live.";
    case "event":
      return "Format: an event invitation. What it is, when and where (leave placeholders in [brackets] for details not in the data), why this person specifically, and the ask or RSVP action. Under 200 words.";
    case "text":
      return "Format: an SMS. Under 160 characters including the link placeholder. Give three variants. No jargon, no formal salutation.";
    case "social":
      return "Format: a public social post. No donor names, no personal data, nothing that identifies an individual giver. Give one version for a short-form feed and one slightly longer. Include suggested hashtags only if they are not cringeworthy.";
  }
}

/** Shared framing for both brainstorm and draft modes. */
export function outreachSystemPrompt(): string {
  return `You are a fundraising communications strategist working with the development team at ${ORG.name}, a nonprofit whose mission is: ${ORG.mission}

You write outreach that sounds like a person wrote it. Concretely that means:
- No manufactured urgency, no "in these challenging times", no rhetorical questions as openers.
- No invented statistics, beneficiary names, or program details. The organization's real figures are supplied to you; anything else you need, mark as a [bracketed placeholder] for the team to fill in.
- Specific beats emotive. "Ten girls finish the term" lands harder than "transforming lives".
- Respect the reader's intelligence and their time.

You are given a factual brief on the audience. Every number you cite must come from that brief or from the organization's data. Do not round figures into vagueness ("thousands of donors") when you have the actual count.`;
}
