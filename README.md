# Meridian Hope Foundation — Fundraising Dashboard

A deployable nonprofit fundraising dashboard: donor segments, campaign progress,
retention, channel mix, and lapsed-donor opportunity — plus an AI analyst that
reads the whole dataset and answers questions about it in plain English.

Built with Next.js (App Router), Recharts, and the Anthropic API.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # paste your Anthropic API key into it
npm run dev                    # http://localhost:3000
```

The charts render without any API key. The **AI analyst** panel needs one — without
it that panel shows a short "not configured" message and everything else works
normally.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project** and import the repo. Framework preset is
   detected as Next.js; no build settings need changing.
3. Under **Settings → Environment Variables**, add:

   | Name | Value | Environments |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | your key from [console.anthropic.com](https://console.anthropic.com/settings/keys) | Production, Preview, Development |

4. Deploy.

The key is read only inside `app/api/chat/route.ts` and `app/api/insights/route.ts`, both
of which run server-side. It is never bundled into the browser. Do **not** rename it to `NEXT_PUBLIC_*` —
that would expose it to every visitor.

> **Note on function duration.** Both analyst routes set `maxDuration = 60`. Vercel's
> Hobby plan caps serverless functions at 60s, which is enough for these analyses.
> If you extend the prompts and hit a timeout, raise `maxDuration` (Pro allows more)
> or lower the analysis scope.

---

## What's on the page

| Section | Contents |
|---|---|
| **Headline metrics** | Six KPIs — YTD raised, retention, average gift, recurring revenue, active donors, cost to raise $1 — each against the prior comparable period |
| **Analysis** | *Understanding your Data* — conversational analyst with tool calling — plus four one-shot standing analyses |
| **Risk** | Computed risk register: six standing checks with severity, dollar exposure and the triggering threshold |
| **Revenue** | Monthly revenue across three years; progress-to-goal meters for six live campaigns |
| **Donors** | Revenue by segment, donor file movement (retained / acquired / reactivated), revenue by channel |
| **Opportunity** | Major gift pipeline, LYBUNT and SYBUNT totals, top donors table |

Every chart has a **Chart / Table** toggle — the same numbers as an accessible table.

## Understanding your Data (conversational, with tools)

`POST /api/chat` takes `{ messages }` and streams **NDJSON** back — one JSON event per line.

This is a multi-turn conversation, and Claude answers by *calling tools* rather than doing
arithmetic in prose. Ask "do we hit $4M if December is 15% soft?" and it calls
`project_year_end`, gets $3,909,379 computed in TypeScript, and explains the $90,621 gap.
Follow up with "what if it's only 5%?" and it re-runs the tool with new assumptions,
keeping everything it already worked out.

**Tools** (`lib/tools.ts` — pure functions over `lib/data.ts`, no I/O):

| Tool | What it computes |
|---|---|
| `project_year_end` | Full-year projection from six months of actuals, with second-half and December adjustments, against an optional target |
| `get_campaign_detail` | Gap to goal, days left, required daily rate, gifts needed at the current average |
| `get_segment_detail` | Average gift, revenue share, retention, revenue per retained donor |
| `estimate_recapture` | Value of winning back LYBUNT/SYBUNT, or closing pipeline, at a given rate |
| `compare_months` | Month-over-month or range totals across years |
| `get_channel_mix` | Revenue, gift count, average gift and share per channel |

**Event types on the wire:**

| Event | Meaning |
|---|---|
| `{t:"text", v}` | A text delta — append it |
| `{t:"tool", name, label}` | Claude called a tool; `label` is the human-readable chip shown in the UI |
| `{t:"history", messages}` | The turn's full transcript (including `tool_use`/`tool_result` blocks) to send back next turn |
| `{t:"error", v}` | Failure mid-stream |
| `{t:"done"}` | Finished |

The client stores `history` verbatim and returns it on the next message, so follow-ups keep
the tool results in context. The agentic loop is capped at 6 rounds and 40 messages.

Why tools instead of letting the model do the math: a projection stated in prose drifts, and
a fundraising number that is subtly wrong is worse than no number. The tools do the
arithmetic deterministically and hand back the working; the model composes and explains it.

## The standing analyses (one-shot)

`POST /api/insights` takes `{ mode, question? }` and streams Markdown back as
plain text.

| Mode | What it does |
|---|---|
| `brief` | Board-ready summary of the half-year position |
| `risks` | Revenue leaking out, and money not yet claimed |
| `segments` | Where to spend the team's remaining time this year |
| `appeal` | Drafts actual year-end appeal copy for mid-level donors |
| `ask` | Answers a free-form question from `question` |

Implementation notes:

- Uses **`claude-opus-5`**. Override with the `ANTHROPIC_MODEL` env var.
- The full dataset is serialized by `dataSummaryForAI()` into the system prompt,
  marked with `cache_control: ephemeral`. Because that text is byte-stable across
  requests, repeat analyses read the prompt from cache at roughly a tenth of the
  input cost.
- Responses **stream** — the panel renders tokens as they arrive, and the Stop
  button aborts the request.
- Failure modes are handled explicitly: a missing key returns a 503 with
  instructions, and auth / rate-limit / model-not-found errors are translated into
  readable messages instead of a stack trace.

## The risk register

`lib/risks.ts` runs six checks over the data and assigns a severity to each. Nothing is
hand-written: swap in real numbers and a healthy item can turn critical on its own. Each
item publishes the threshold that produced its severity, so the rule can be argued with
rather than taken on trust.

| Check | Severity rule |
|---|---|
| Revenue concentration | Critical above 50% of YTD in the top three donors; serious above 35% |
| Single-month dependency | Serious when one month carries ≥25% of annual revenue |
| Largest-segment churn | Serious when the biggest segment by donor count retains under 45% |
| Unworked lapsed file | Serious when LYBUNT exceeds 25% of YTD revenue |
| Campaigns behind pace | Flagged under 75% of goal with ≤190 days left |
| Acquisition pace | Compared against seasonally-adjusted expectation, not a flat half-year |

The register renders with **no API key** — it is deterministic, like the charts. It is also
injected into both AI prompts, so the chat cannot contradict what the dashboard shows.

There is deliberately **no combined "total exposure" figure**: the items are different units
over different horizons (one donor's renewal, one month's miss, a year of churn, a standing
file, campaign gaps). Adding them would produce a confident-looking meaningless number.

## Running it on your own data

`lib/data.ts` is the only file that knows what the numbers are. Everything else —
charts, tables, and the AI prompt — reads from its exports. Replace it with an
adapter for your CRM (Blackbaud, Bloomerang, DonorPerfect, Salesforce NPSP,
Stripe) keeping the same exported shapes:

```
MONTHLY_REVENUE   MonthlyPoint[]     month, y2024, y2025, y2026
CAMPAIGNS         Campaign[]         name, goal, raised, donors, channel, closes
SEGMENTS          Segment[]          name, range, donors, revenue, retention
DONOR_MOVEMENT    RetentionYear[]    year, retained, reactivated, acquired, lapsed
CHANNELS          Channel[]          name, revenue, gifts
TOP_DONORS        TopDonor[]         name, lifetime, ytd, segment, firstGift, lastGift
KPIS              Kpi[]              label, value, prior, format, note
LAPSED            { lybunt, sybunt, pipeline }
```

Also update `dataSummaryForAI()` so the analyst sees the same figures the charts do
— it is the single source the model reads from.

> The included data is fictional. The organization, donors, and campaigns do not
> exist; the figures are internally consistent so that any cross-check the AI makes
> between two tables agrees.

## Design notes

Chart colors are not chosen by eye. The categorical palette (slots 1–3) was checked
with a colorblind-safety validator in both light and dark mode, across all pairs:

| Mode | Worst CVD ΔE | Worst normal-vision ΔE |
|---|---|---|
| Light — `#2a78d6` `#eb6834` `#1baf7a` | 9.2 | 24.0 |
| Dark — `#3987e5` `#d95926` `#199e70` | 9.4 | 20.9 |

Both clear the ≥8 CVD target and the ≥15 normal-vision floor. Consequences baked
into the code:

- **Adding a fourth categorical series requires re-validating the palette.** Don't
  add one on vibes; the fourth default slot puts yellow beside orange and fails.
- One light-mode step sits below 3:1 contrast on the light surface, so every chart
  ships **direct labels and a table view** rather than relying on color alone.
- Ordered scales (segments, channels) use a single-hue ramp, not categorical hues,
  and stay inside the ordinal contrast floor at both ends.
- Series identity is never color-only: legends are always present, and stacked
  segments are separated by a 2px surface gap.

Dark mode is a selected set of steps validated against the dark surface — not an
inverted light palette. The theme follows the OS by default and can be toggled;
the choice persists in `localStorage`.

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm run start       # serve the production build
npm run typecheck   # tsc --noEmit
```
