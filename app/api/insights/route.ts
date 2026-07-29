import Anthropic from "@anthropic-ai/sdk";
import { dataSummaryForAI, ORG } from "@/lib/data";

export const runtime = "nodejs";
// Long enough for a considered answer; Vercel Hobby caps at 60s.
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

export type InsightMode = "brief" | "risks" | "segments" | "appeal" | "ask";

const MODE_PROMPTS: Record<InsightMode, string> = {
  brief: `Write a board-ready summary of where the organization's fundraising stands at the half-year mark.

Cover, in this order:
1. The headline: are we ahead or behind, and by how much — with the actual figures.
2. What is driving the result (name the specific campaigns, channels or segments doing the work).
3. The one thing that most threatens hitting the annual number.
4. What the development director should do in the next 30 days.

Keep it to roughly 400 words. Lead with the outcome, not with methodology.`,

  risks: `Identify the risks and the unclaimed opportunities sitting in this donor file.

For each item give the dollar figure at stake and the evidence in the data that points to it. Rank by size of impact, not by ease. Be specific about which segment, campaign or channel each finding concerns.

Cover both directions: where revenue is quietly leaking, and where there is money the team has not yet gone after. End with a short prioritized list of what to act on first.`,

  segments: `Analyze the donor segments and recommend where the team should concentrate its effort for the rest of the year.

For each segment, assess: how much revenue it produces relative to the effort it takes, whether its retention is healthy for a segment of that size, and whether the team should be growing it, holding it, or letting it shrink.

Then give a concrete allocation recommendation — if the development team has a fixed amount of staff time between now and December, where should it go, and what should it come out of? Justify the trade-off with the numbers.`,

  appeal: `Draft a year-end fundraising appeal for the mid-level segment ($1,000–9,999 donors).

Write the actual appeal copy, not a description of what the appeal should say. Include a subject line, the body of the letter, and a specific ask amount with the reasoning for that amount given what this segment already gives.

Ground it in the organization's real programs and this year's actual results — use the campaign figures and the impact they represent. Warm and direct; no jargon, no manufactured urgency.

After the copy, add a short note on why you made the choices you did.`,

  ask: "", // supplied by the user
};

const SYSTEM_PROMPT = `You are a senior fundraising analyst advising the development team at ${ORG.name}, a nonprofit working on ${ORG.mission}

You have full access to the organization's fundraising data, reproduced below. Every figure you cite must come from it — never invent a number, and never estimate one when the real figure is present. If a question cannot be answered from this data, say plainly what is missing rather than guessing.

Write for a development director and a board: concrete, numerate, and free of consultant filler. Lead with the finding, then the evidence. Prefer specific dollar figures and named segments over general advice. When you recommend an action, say what it would be worth and what it would cost.

Format with Markdown — short section headings, tight paragraphs, and bulleted lists where the content is genuinely a list. Do not open with a restatement of the question.

<fundraising_data>
${dataSummaryForAI()}
</fundraising_data>`;

function errorStream(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return errorStream(
      "The AI analyst is not configured. Set ANTHROPIC_API_KEY in your environment " +
        "(locally: .env.local — on Vercel: Project Settings → Environment Variables) " +
        "and reload. Every chart on this page works without it.",
      503,
    );
  }

  let body: { mode?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return errorStream("Malformed request body.", 400);
  }

  const mode = (body.mode ?? "brief") as InsightMode;
  if (!(mode in MODE_PROMPTS)) {
    return errorStream(`Unknown analysis mode: ${mode}`, 400);
  }

  let userPrompt: string;
  if (mode === "ask") {
    const question = (body.question ?? "").trim();
    if (!question) return errorStream("Ask a question first.", 400);
    if (question.length > 2000) {
      return errorStream("That question is too long — keep it under 2,000 characters.", 400);
    }
    userPrompt = `Answer this question about the fundraising data:\n\n${question}`;
  } else {
    userPrompt = MODE_PROMPTS[mode];
  }

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const message = client.messages.stream({
          model: MODEL,
          max_tokens: 16_000,
          // The data summary is byte-stable across requests, so the whole
          // system prompt caches and repeat analyses read it at ~0.1x cost.
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userPrompt }],
        });

        for await (const event of message) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        const final = await message.finalMessage();

        if (final.stop_reason === "refusal") {
          controller.enqueue(
            encoder.encode(
              "\n\n_The model declined to complete this response. Try rephrasing the question._",
            ),
          );
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(
            encoder.encode("\n\n_(Response truncated at the token limit.)_"),
          );
        }

        controller.close();
      } catch (err) {
        const note = describeError(err);
        // The response has already started, so surface the failure inline
        // rather than as an HTTP status the client can no longer read.
        controller.enqueue(encoder.encode(`\n\n**Analysis failed.** ${note}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "The ANTHROPIC_API_KEY was rejected. Check that it is valid and has not been revoked.";
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return "That API key does not have access to this model.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Rate limited by the API. Wait a moment and run the analysis again.";
  }
  if (err instanceof Anthropic.NotFoundError) {
    return `Model "${MODEL}" was not found. Check the ANTHROPIC_MODEL environment variable.`;
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "Could not reach the Anthropic API. Check network connectivity.";
  }
  if (err instanceof Anthropic.APIError) {
    return `API error ${err.status ?? ""}: ${err.message}`.trim();
  }
  return err instanceof Error ? err.message : "Unknown error.";
}
