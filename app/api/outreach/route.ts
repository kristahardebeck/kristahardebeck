import Anthropic from "@anthropic-ai/sdk";
import { dataSummaryForAI } from "@/lib/data";
import {
  type Channel,
  channelBrief,
  findAudience,
  outreachSystemPrompt,
} from "@/lib/outreach";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

const VALID_CHANNELS: Channel[] = ["email", "letter", "call", "event", "text", "social"];

// Stable prefix — the data summary and the writing rules never vary per
// request, so the cache breakpoint covers both and repeat brainstorms are cheap.
const SYSTEM_PROMPT = `${outreachSystemPrompt()}

<fundraising_data>
${dataSummaryForAI()}
</fundraising_data>`;

function errorResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorResponse(
      "Outreach brainstorming is not configured. Set ANTHROPIC_API_KEY in your environment " +
        "(locally: .env.local — on Vercel: Project Settings → Environment Variables), then redeploy.",
      503,
    );
  }

  let body: {
    audienceId?: string;
    channel?: string;
    mode?: string;
    goal?: string;
    priorIdeas?: string;
  };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Malformed request body.", 400);
  }

  const audience = findAudience(body.audienceId ?? "");
  if (!audience) return errorResponse("Pick an audience first.", 400);

  const channel = body.channel as Channel;
  if (!VALID_CHANNELS.includes(channel)) return errorResponse("Pick a channel first.", 400);

  const mode = body.mode === "draft" ? "draft" : "brainstorm";
  const goal = (body.goal ?? "").trim().slice(0, 1000);
  const priorIdeas = (body.priorIdeas ?? "").slice(0, 12_000);

  const context = [
    `AUDIENCE: ${audience.label} (${audience.size.toLocaleString("en-US")} people)`,
    `AUDIENCE BRIEF: ${audience.brief}`,
    `CHANNEL: ${channelBrief(channel)}`,
    goal ? `WHAT THE TEAM WANTS FROM THIS: ${goal}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const instruction =
    mode === "brainstorm"
      ? `Brainstorm four genuinely different angles for reaching this audience through this channel.

They must differ in *approach*, not just wording — a gratitude-first angle and a thank-you-first angle are the same idea twice. Range across things like: impact reporting, a specific unmet need, peer or community framing, a deadline or match, asking the donor's advice rather than their money, or an honest acknowledgement of silence.

For each angle give:
- A short name for it (four words or so)
- The hook — the first line or the core move, written out
- Why it suits *this* audience, citing a number from the brief
- The main risk of it landing badly

Then close with one sentence naming which you would send and why. Do not write the full piece — that comes next.`
      : `Write the full piece, ready to send.

${priorIdeas ? "The team brainstormed angles already (below). Pick the strongest and write it out — say in one line which you chose and why, then give the copy.\n" : ""}Follow the channel format exactly. Use [bracketed placeholders] for anything you would need from the team — names, dates, links, specific beneficiary stories. Do not invent them.

After the copy, add a short note: the ask amount you used and why, and one thing to A/B test.`;

  const userContent = priorIdeas
    ? `${context}\n\n<angles_already_brainstormed>\n${priorIdeas}\n</angles_already_brainstormed>\n\n${instruction}`
    : `${context}\n\n${instruction}`;

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const message = client.messages.stream({
          model: MODEL,
          max_tokens: 12_000,
          system: [
            { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
          ],
          messages: [{ role: "user", content: userContent }],
        });

        for await (const event of message) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        const final = await message.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(
            encoder.encode("\n\n_The model declined this one. Try a different framing._"),
          );
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("\n\n_(cut off at the token limit)_"));
        }
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(`\n\n**Could not generate outreach.** ${describeError(err)}`),
        );
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
    return "The ANTHROPIC_API_KEY was rejected. Check it is valid and has not been revoked.";
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return "That API key does not have access to this model.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Rate limited by the API. Wait a moment and try again.";
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
