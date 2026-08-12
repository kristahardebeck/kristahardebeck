"use client";

import React from "react";
import Markdown from "./Markdown";
import { CHANNELS, type Channel, allAudiences } from "@/lib/outreach";
import { count, currency } from "@/lib/format";

const AUDIENCES = allAudiences();
const GROUPS = ["Segment", "Lapsed", "Prospect"] as const;

type Mode = "brainstorm" | "draft";

export default function OutreachStudio() {
  const [audienceId, setAudienceId] = React.useState(AUDIENCES[0].id);
  const [channel, setChannel] = React.useState<Channel>("email");
  const [goal, setGoal] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [mode, setMode] = React.useState<Mode | null>(null);
  const [status, setStatus] = React.useState<"idle" | "running" | "error">("idle");

  // Kept so "Write the full piece" can build on angles already generated.
  // The ref holds the text; the boolean drives the button label, because
  // mutating a ref does not re-render and the label would otherwise only
  // refresh by luck of an adjacent state update.
  const ideasRef = React.useRef("");
  const [hasIdeas, setHasIdeas] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  const audience = AUDIENCES.find((a) => a.id === audienceId)!;
  const running = status === "running";

  const run = React.useCallback(
    async (nextMode: Mode) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setMode(nextMode);
      setOutput("");
      setStatus("running");

      try {
        const res = await fetch("/api/outreach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audienceId,
            channel,
            mode: nextMode,
            goal,
            // Only feed the angles forward when drafting.
            priorIdeas: nextMode === "draft" ? ideasRef.current : "",
          }),
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
        let acc = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setOutput(acc);
        }

        if (nextMode === "brainstorm") {
          ideasRef.current = acc;
          setHasIdeas(Boolean(acc.trim()));
        }
        setStatus("idle");
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          setStatus("idle");
          return;
        }
        setOutput((err as Error)?.message ?? "Network error.");
        setStatus("error");
      }
    },
    [audienceId, channel, goal],
  );

  // Angles belong to the audience/channel they were generated for.
  const resetIdeas = () => {
    ideasRef.current = "";
    setHasIdeas(false);
  };

  return (
    <section className="card" style={{ padding: 22 }}>
      <header style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span
            aria-hidden
            className={running ? "thinking-dot" : undefined}
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: running ? "var(--series-1)" : "var(--good)",
              flex: "none",
            }}
          />
          <h2 className="card-title" style={{ fontSize: 16 }}>
            Brainstorm Donor Outreach
          </h2>
        </div>
        <p className="card-subtitle" style={{ marginTop: 5 }}>
          Pick who you are reaching and how. Claude works from that group&rsquo;s real giving
          history — size, average gift, retention — so the angles and the ask amount fit the
          audience rather than being generic.
        </p>
      </header>

      {/* Audience */}
      <fieldset style={{ border: "none", margin: "0 0 16px", padding: 0 }}>
        <legend
          style={{
            fontSize: 11.5,
            fontWeight: 650,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            padding: 0,
            marginBottom: 9,
          }}
        >
          Who
        </legend>

        {GROUPS.map((group) => (
          <div key={group} style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginBottom: 5,
              }}
            >
              {group}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {AUDIENCES.filter((a) => a.group === group).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  disabled={running}
                  aria-pressed={audienceId === a.id}
                  onClick={() => {
                    setAudienceId(a.id);
                    resetIdeas();
                  }}
                  className={`btn${audienceId === a.id ? " btn--active" : ""}`}
                  style={{ fontSize: 12.5, padding: "6px 11px", borderRadius: 999 }}
                >
                  {a.label}
                  <span style={{ color: "var(--text-muted)", marginLeft: 6, fontSize: 11.5 }}>
                    {count(a.size)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      {/* Channel */}
      <fieldset style={{ border: "none", margin: "0 0 16px", padding: 0 }}>
        <legend
          style={{
            fontSize: 11.5,
            fontWeight: 650,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            padding: 0,
            marginBottom: 9,
          }}
        >
          How
        </legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {CHANNELS.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={running}
              aria-pressed={channel === c.id}
              onClick={() => {
                setChannel(c.id);
                resetIdeas();
              }}
              className={`btn${channel === c.id ? " btn--active" : ""}`}
              style={{ fontSize: 12.5, padding: "6px 11px", borderRadius: 999 }}
              title={c.note}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Optional steer */}
      <label
        style={{
          display: "block",
          fontSize: 11.5,
          fontWeight: 650,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: 8,
        }}
      >
        Anything specific? (optional)
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          maxLength={1000}
          placeholder="e.g. tie it to the September classroom opening, or keep it under 100 words"
          style={{
            display: "block",
            width: "100%",
            marginTop: 7,
            font: "inherit",
            fontSize: 14,
            fontWeight: 400,
            letterSpacing: "normal",
            textTransform: "none",
            color: "var(--text-primary)",
            padding: "9px 13px",
            borderRadius: 9,
            border: "1px solid var(--border-strong)",
            background: "var(--surface-sunken)",
          }}
        />
      </label>

      {/* Context line — makes the computed ask visible before generating */}
      <p
        style={{
          fontSize: 12.5,
          color: "var(--text-secondary)",
          background: "var(--surface-sunken)",
          border: "1px solid var(--border)",
          borderRadius: 9,
          padding: "10px 13px",
          margin: "14px 0",
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: "var(--text-primary)", fontWeight: 650 }}>
          {audience.label}
        </strong>{" "}
        · {count(audience.size)} people · suggested ask{" "}
        <span className="tabular" style={{ fontWeight: 650, color: "var(--text-primary)" }}>
          {currency(audience.suggestedAsk)}
        </span>{" "}
        · via {CHANNELS.find((c) => c.id === channel)?.label.toLowerCase()}
      </p>

      {/* Actions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          className="btn btn--primary"
          disabled={running}
          onClick={() => run("brainstorm")}
        >
          Brainstorm four angles
        </button>
        <button type="button" className="btn" disabled={running} onClick={() => run("draft")}>
          {hasIdeas ? "Write the strongest one" : "Write a full draft"}
        </button>
        {running && (
          <button type="button" className="btn" onClick={() => abortRef.current?.abort()}>
            Stop
          </button>
        )}
      </div>

      {/* Output */}
      {(output || running) && (
        <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--grid)" }}>
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
              {running && (
                <p
                  className="thinking-dot"
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    marginTop: output ? 10 : 0,
                  }}
                >
                  {mode === "draft" ? "Writing the piece…" : "Working up angles…"}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
