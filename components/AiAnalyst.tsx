"use client";

import React from "react";
import Markdown from "./Markdown";

type Mode = "brief" | "risks" | "segments" | "appeal" | "ask";

const MODES: Array<{ id: Exclude<Mode, "ask">; label: string; blurb: string }> = [
  { id: "brief", label: "Board brief", blurb: "Where we stand at the half-year mark" },
  { id: "risks", label: "Risks & opportunities", blurb: "What's leaking and what's unclaimed" },
  { id: "segments", label: "Segment strategy", blurb: "Where to spend the team's remaining time" },
  { id: "appeal", label: "Draft an appeal", blurb: "Year-end copy for mid-level donors" },
];

const SUGGESTED = [
  "Which campaign is most at risk of missing its goal, and what would closing the gap take?",
  "Our grassroots retention is 38%. Is that worth fixing, or should we put the money into mid-level?",
  "If December repeats last year's share of the total, do we hit $4M this year?",
  "What would you say to the board about the drop in newly acquired donors?",
];

export default function AiAnalyst() {
  const [output, setOutput] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "streaming" | "error">("idle");
  const [activeMode, setActiveMode] = React.useState<Mode | null>(null);
  const [question, setQuestion] = React.useState("");
  const abortRef = React.useRef<AbortController | null>(null);

  const run = React.useCallback(async (mode: Mode, q?: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setActiveMode(mode);
    setOutput("");
    setStatus("streaming");

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, question: q }),
        signal: controller.signal,
      });

      if (!res.ok) {
        setOutput(await res.text());
        setStatus("error");
        return;
      }
      if (!res.body) {
        setOutput("The server returned an empty response.");
        setStatus("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setOutput((prev) => prev + chunk);
      }
      setStatus("idle");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setOutput(
        `Could not reach the analysis endpoint. ${(err as Error)?.message ?? "Unknown error."}`,
      );
      setStatus("error");
    }
  }, []);

  const stop = () => {
    abortRef.current?.abort();
    setStatus("idle");
  };

  const askSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && status !== "streaming") run("ask", question.trim());
  };

  const streaming = status === "streaming";

  return (
    <section className="card" style={{ padding: 22 }}>
      <header style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: streaming ? "var(--series-1)" : "var(--good)",
              flex: "none",
            }}
            className={streaming ? "thinking-dot" : undefined}
          />
          <h2 className="card-title" style={{ fontSize: 16 }}>
            AI fundraising analyst
          </h2>
        </div>
        <p className="card-subtitle" style={{ marginTop: 5 }}>
          Reads the whole dataset on this page — every campaign, segment, channel and donor
          record — and answers from it. Powered by Claude.
        </p>
      </header>

      {/* Preset analyses */}
      <div className="mode-grid" style={{ marginBottom: 18 }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => run(m.id)}
            disabled={streaming}
            className={`btn${activeMode === m.id ? " btn--active" : ""}`}
            style={{ textAlign: "left", padding: "11px 13px", lineHeight: 1.35 }}
          >
            <span style={{ display: "block", fontWeight: 600, fontSize: 13.5 }}>{m.label}</span>
            <span
              style={{
                display: "block",
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 2,
              }}
            >
              {m.blurb}
            </span>
          </button>
        ))}
      </div>

      {/* Free-form question */}
      <form onSubmit={askSubmit} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything about this fundraising data…"
          maxLength={2000}
          aria-label="Ask a question about the fundraising data"
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
          disabled={streaming || !question.trim()}
          style={{ flex: "none" }}
        >
          Ask
        </button>
        {streaming && (
          <button type="button" className="btn" onClick={stop} style={{ flex: "none" }}>
            Stop
          </button>
        )}
      </form>

      <div className="legend" style={{ gap: "6px 8px", marginBottom: 4 }}>
        {SUGGESTED.map((s) => (
          <button
            key={s}
            type="button"
            className="btn"
            disabled={streaming}
            onClick={() => {
              setQuestion(s);
              run("ask", s);
            }}
            style={{ fontSize: 12, padding: "5px 10px", borderRadius: 999 }}
          >
            {s.length > 62 ? `${s.slice(0, 60)}…` : s}
          </button>
        ))}
      </div>

      {/* Output */}
      {(output || streaming) && (
        <div
          style={{
            marginTop: 18,
            paddingTop: 18,
            borderTop: "1px solid var(--grid)",
          }}
        >
          {status === "error" ? (
            <div
              role="alert"
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                fontSize: 14,
                color: "var(--text-secondary)",
                background: "var(--surface-sunken)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "13px 15px",
                lineHeight: 1.55,
              }}
            >
              <span aria-hidden style={{ color: "var(--serious)", fontWeight: 700 }}>
                ⚠
              </span>
              <span>{output}</span>
            </div>
          ) : (
            <>
              <Markdown text={output} />
              {streaming && (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    marginTop: output ? 10 : 0,
                  }}
                  className="thinking-dot"
                >
                  {output ? "Writing…" : "Reading the fundraising data…"}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
