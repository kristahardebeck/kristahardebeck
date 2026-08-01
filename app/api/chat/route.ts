import Anthropic from "@anthropic-ai/sdk";
import { dataSummaryForAI, ORG } from "@/lib/data";
import { TOOL_DEFINITIONS, describeToolCall, runTool, toolGuidance } from "@/lib/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

/** Safety rail on the agentic loop — a runaway would burn the function budget. */
const MAX_TOOL_ROUNDS = 6;
const MAX_HISTORY_MESSAGES = 40;

const SYSTEM_PROMPT = `You are a senior fundraising analyst in conversation with the development team at ${ORG.name}, a nonprofit whose mission is: ${ORG.mission}

This is a back-and-forth, not a report. Answer what was actually asked, at the length it deserves — a factual question gets a couple of sentences, not a memo with headings. Assume the user has been reading along: don't restate the whole picture every turn, and don't reintroduce figures you already gave unless they changed.

${toolGuidance()}

Every figure you cite must come from the data below or from a tool result. Never invent or estimate a number that a tool can compute. If a question cannot be answered from what you have, say what's missing.

When you make a recommendation, say what it is worth and what it would cost. Push back when the data does not support the premise of a question.

Use Markdown sparingly — bold for figures that matter, lists only when the content is genuinely a list. Do not open with a restatement of the question.

<fundraising_data>
${dataSummaryForAI()}
</fundraising_data>`;

type WireMessage = { role: "user" | "assistant"; content: unknown };

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorResponse(
      "The analyst chat is not configured. Set ANTHROPIC_API_KEY in your environment " +
        "(locally: .env.local — on Vercel: Project Settings → Environment Variables), then redeploy.",
      503,
    );
  }

  let body: { messages?: WireMessage[] };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Malformed request body.", 400);
  }

  const history = Array.isArray(body.messages) ? body.messages : [];
  if (!history.length) return errorResponse("No messages supplied.", 400);
  if (history.length > MAX_HISTORY_MESSAGES) {
    return errorResponse(
      "This conversation has gotten long. Start a new one to keep responses fast.",
      400,
    );
  }
  if (JSON.stringify(history).length > 200_000) {
    return errorResponse("Conversation payload too large.", 413);
  }

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Newline-delimited JSON: one event per line, so the client can render
      // text, tool activity and the final history from a single response.
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      // Grows as the loop runs; returned to the client so the next turn keeps
      // the tool calls and their results in context.
      const messages = [...history] as Anthropic.MessageParam[];

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const turn = client.messages.stream({
            model: MODEL,
            max_tokens: 12_000,
            // Tools render before system, so this breakpoint caches both.
            system: [
              {
                type: "text",
                text: SYSTEM_PROMPT,
                cache_control: { type: "ephemeral" },
              },
            ],
            tools: TOOL_DEFINITIONS as unknown as Anthropic.Tool[],
            messages,
          });

          for await (const event of turn) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              send({ t: "text", v: event.delta.text });
            }
          }

          const reply = await turn.finalMessage();
          messages.push({ role: "assistant", content: reply.content });

          if (reply.stop_reason === "refusal") {
            send({
              t: "text",
              v: "\n\n_I can't answer that one. Try rephrasing._",
            });
            break;
          }

          if (reply.stop_reason !== "tool_use") {
            if (reply.stop_reason === "max_tokens") {
              send({ t: "text", v: "\n\n_(cut off at the token limit)_" });
            }
            break;
          }

          // Execute every requested tool, then feed all results back in one
          // user turn — splitting them teaches the model to stop parallelising.
          const toolUses = reply.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
          );

          const results: Anthropic.ToolResultBlockParam[] = [];
          for (const call of toolUses) {
            const input = (call.input ?? {}) as Record<string, unknown>;
            send({ t: "tool", name: call.name, label: describeToolCall(call.name, input) });

            const output = runTool(call.name, input);
            results.push({
              type: "tool_result",
              tool_use_id: call.id,
              content: JSON.stringify(output),
              is_error: Boolean((output as { error?: string }).error),
            });
          }

          messages.push({ role: "user", content: results });

          if (round === MAX_TOOL_ROUNDS - 1) {
            send({
              t: "text",
              v: "\n\n_Stopped after the maximum number of tool rounds._",
            });
          }
        }

        // Hand the full transcript back so follow-ups keep tool context.
        send({ t: "history", messages: messages.slice(history.length) });
        send({ t: "done" });
        controller.close();
      } catch (err) {
        send({ t: "error", v: describeError(err) });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
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
    return "Rate limited by the API. Wait a moment and ask again.";
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
