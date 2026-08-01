"use client";

import React from "react";
import Markdown from "./Markdown";

/** What the user sees. The API transcript is kept separately in `wireRef`. */
type Turn =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string; tools: string[] }
  | { kind: "error"; text: string };

const OPENERS = [
  "Do we hit $4M this year if December comes in 15% soft?",
  "Is Classrooms for Wakiso going to make its goal?",
  "What's 15% of the LYBUNT file worth, and is chasing it better than acquisition?",
  "Which segment earns the most per hour of staff time?",
];

export default function AnalystChat() {
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [activeTools, setActiveTools] = React.useState<string[]>([]);

  // The real message history sent to the API — includes tool_use and
  // tool_result blocks, which never appear in the visible transcript but are
  // what let follow-up questions build on earlier calculations.
  const wireRef = React.useRef<Array<{ role: "user" | "assistant"; content: unknown }>>([]);
  const abortRef = React.useRef<AbortController | null>(null);
  const endRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, activeTools]);

  const send = React.useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || busy) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setDraft("");
      setBusy(true);
      setActiveTools([]);
      setTurns((t) => [...t, { kind: "user", text: trimmed }]);

      const outbound = [...wireRef.current, { role: "user" as const, content: trimmed }];

      // Placeholder the stream fills in.
      setTurns((t) => [...t, { kind: "assistant", text: "", tools: [] }]);

      const updateLast = (fn: (turn: Turn) => Turn) =>
        setTurns((t) => {
          const next = [...t];
          next[next.length - 1] = fn(next[next.length - 1]);
          return next;
        });

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: outbound }),
          signal: controller.signal,
        });

        if (!res.ok) {
          let message = `Request failed (${res.status}).`;
          try {
            message = (await res.json()).error ?? message;
          } catch {
            /* keep the status-code fallback */
          }
          setTurns((t) => [...t.slice(0, -1), { kind: "error", text: message }]);
          return;
        }
        if (!res.body) {
          setTurns((t) => [...t.slice(0, -1), { kind: "error", text: "Empty response." }]);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let failed = false;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // NDJSON: complete lines only; the tail may be a partial object.
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            let event: Record<string, unknown>;
            try {
              event = JSON.parse(line);
            } catch {
              continue;
            }

            if (event.t === "text") {
              updateLast((turn) =>
                turn.kind === "assistant"
                  ? { ...turn, text: turn.text + String(event.v) }
                  : turn,
              );
            } else if (event.t === "tool") {
              const label = String(event.label);
              setActiveTools((a) => [...a, label]);
              updateLast((turn) => {
                if (turn.kind !== "assistant") return turn;
                // A tool call ends the current round. Close the paragraph so
                // the model's pre-tool preamble doesn't run into the answer
                // it writes after the results come back.
                const text =
                  turn.text && !turn.text.endsWith("\n\n")
                    ? `${turn.text.replace(/\s+$/, "")}\n\n`
                    : turn.text;
                return { ...turn, text, tools: [...turn.tools, label] };
              });
            } else if (event.t === "history") {
              wireRef.current = [
                ...outbound,
                ...(event.messages as Array<{ role: "user" | "assistant"; content: unknown }>),
              ];
            } else if (event.t === "error") {
              failed = true;
              setTurns((t) => [...t.slice(0, -1), { kind: "error", text: String(event.v) }]);
            }
          }
        }

        // Only commit history when the exchange actually completed, so a
        // failed turn doesn't poison the next one.
        if (failed) wireRef.current = wireRef.current.slice(0, outbound.length - 1);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          setTurns((t) => t.filter((x) => !(x.kind === "assistant" && !x.text)));
          return;
        }
        setTurns((t) => [
          ...t.slice(0, -1),
          { kind: "error", text: (err as Error)?.message ?? "Network error." },
        ]);
      } finally {
        setBusy(false);
        setActiveTools([]);
      }
    },
    [busy],
  );

  const reset = () => {
    abortRef.current?.abort();
    wireRef.current = [];
    setTurns([]);
    setActiveTools([]);
    setBusy(false);
  };

  return (
    <section className="card" style={{ padding: 22 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span
              aria-hidden
              className={busy ? "thinking-dot" : undefined}
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: busy ? "var(--series-1)" : "var(--good)",
                flex: "none",
              }}
            />
            <h2 className="card-title" style={{ fontSize: 16 }}>
              Ask the analyst
            </h2>
          </div>
          <p className="card-subtitle" style={{ marginTop: 5 }}>
            A running conversation. Claude runs real calculations against the donor file —
            projections, pacing, recapture math — and remembers them, so follow-ups build on
            what it already worked out.
          </p>
        </div>

        {turns.length > 0 && (
          <button type="button" className="btn" onClick={reset} style={{ flex: "none" }}>
            New conversation
          </button>
        )}
      </header>

      {/* Transcript */}
      {turns.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--border-strong)",
            borderRadius: 12,
            padding: "18px 18px 16px",
            marginBottom: 14,
          }}
        >
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 13.5,
              color: "var(--text-secondary)",
            }}
          >
            Try one of these, then keep asking follow-ups:
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {OPENERS.map((q) => (
              <button
                key={q}
                type="button"
                className="btn"
                onClick={() => send(q)}
                style={{ fontSize: 12.5, padding: "6px 11px", borderRadius: 999 }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxHeight: 560,
            overflowY: "auto",
            paddingRight: 4,
            marginBottom: 14,
          }}
        >
          {turns.map((turn, i) => {
            if (turn.kind === "user") {
              return (
                <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      background: "var(--accent-wash)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px 12px 3px 12px",
                      padding: "9px 13px",
                      fontSize: 14,
                      maxWidth: "82%",
                      color: "var(--text-primary)",
                    }}
                  >
                    {turn.text}
                  </div>
                </div>
              );
            }

            if (turn.kind === "error") {
              return (
                <div
                  key={i}
                  role="alert"
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    fontSize: 13.5,
                    color: "var(--text-secondary)",
                    background: "var(--surface-sunken)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    lineHeight: 1.55,
                  }}
                >
                  <span aria-hidden style={{ color: "var(--serious)", fontWeight: 700 }}>
                    ⚠
                  </span>
                  <span>{turn.text}</span>
                </div>
              );
            }

            const isLast = i === turns.length - 1;
            return (
              <div key={i}>
                {turn.tools.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginBottom: turn.text ? 10 : 0,
                    }}
                  >
                    {turn.tools.map((label, j) => (
                      <span
                        key={`${label}-${j}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11.5,
                          fontWeight: 500,
                          color: "var(--text-secondary)",
                          background: "var(--surface-sunken)",
                          border: "1px solid var(--border)",
                          borderRadius: 999,
                          padding: "3px 10px",
                        }}
                      >
                        <span aria-hidden style={{ color: "var(--series-1)" }}>
                          ⟐
                        </span>
                        {label}
                      </span>
                    ))}
                  </div>
                )}

                {turn.text ? (
                  <Markdown text={turn.text} />
                ) : (
                  isLast &&
                  busy && (
                    <p
                      className="thinking-dot"
                      style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}
                    >
                      {activeTools.length ? "Running the numbers…" : "Thinking…"}
                    </p>
                  )
                )}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        style={{ display: "flex", gap: 8 }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            turns.length ? "Ask a follow-up…" : "Ask anything about the fundraising data…"
          }
          maxLength={2000}
          aria-label="Message the fundraising analyst"
          style={{
            flex: 1,
            minWidth: 0,
            font: "inherit",
            fontSize: 14,
            padding: "9px 13px",
            borderRadius: 9,
            border: "1px solid var(--border-strong)",
            background: "var(--surface-sunken)",
            color: "var(--text-primary)",
          }}
        />
        <button
          type="submit"
          className="btn btn--primary"
          disabled={busy || !draft.trim()}
          style={{ flex: "none" }}
        >
          Send
        </button>
        {busy && (
          <button
            type="button"
            className="btn"
            onClick={() => abortRef.current?.abort()}
            style={{ flex: "none" }}
          >
            Stop
          </button>
        )}
      </form>
    </section>
  );
}
