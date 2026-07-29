"use client";

import React from "react";

/**
 * Minimal Markdown renderer for the AI analyst's streaming output.
 *
 * Renders to React elements rather than HTML, so model output can never
 * inject markup. Covers what the model actually emits: headings, bold,
 * italics, inline code, bullet and numbered lists, and paragraphs.
 */

const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*|_[^_\n]+_)/g;

function renderInline(text: string, key: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let n = 0;
  let match: RegExpExecArray | null;

  INLINE.lastIndex = 0;
  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const token = match[0];
    const id = `${key}-i${n++}`;

    if (token.startsWith("**")) {
      nodes.push(<strong key={id}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={id}>{token.slice(1, -1)}</code>);
    } else {
      nodes.push(<em key={id}>{token.slice(1, -1)}</em>);
    }
    cursor = match.index + token.length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

type Block =
  | { kind: "h2" | "h3" | "p"; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "hr" };

function parse(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.split("\n");

  let paragraph: string[] = [];
  let list: string[] | null = null;
  let listKind: "ul" | "ol" = "ul";

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: "p", text: paragraph.join(" ").trim() });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list?.length) blocks.push({ kind: listKind, items: list });
    list = null;
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushAll();
      continue;
    }
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) {
      flushAll();
      blocks.push({ kind: "hr" });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushAll();
      blocks.push({
        kind: heading[1].length <= 2 ? "h2" : "h3",
        text: heading[2].replace(/[*_]/g, "").trim(),
      });
      continue;
    }

    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (!list || listKind !== "ul") {
        flushList();
        listKind = "ul";
        list = [];
      }
      list.push(bullet[1]);
      continue;
    }

    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      flushParagraph();
      if (!list || listKind !== "ol") {
        flushList();
        listKind = "ol";
        list = [];
      }
      list.push(numbered[1]);
      continue;
    }

    // Continuation of an existing list item wraps into that item.
    if (list && /^\s{2,}\S/.test(raw)) {
      list[list.length - 1] += ` ${line.trim()}`;
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }
  flushAll();

  return blocks;
}

export default function Markdown({ text }: { text: string }) {
  const blocks = React.useMemo(() => parse(text), [text]);

  return (
    <div className="prose-ai">
      {blocks.map((block, i) => {
        const key = `b${i}`;
        switch (block.kind) {
          case "h2":
            return <h2 key={key}>{renderInline(block.text, key)}</h2>;
          case "h3":
            return <h3 key={key}>{renderInline(block.text, key)}</h3>;
          case "p":
            return <p key={key}>{renderInline(block.text, key)}</p>;
          case "hr":
            return (
              <hr
                key={key}
                style={{
                  border: "none",
                  borderTop: "1px solid var(--grid)",
                  margin: "18px 0",
                }}
              />
            );
          case "ul":
            return (
              <ul key={key}>
                {block.items.map((item, j) => (
                  <li key={`${key}-${j}`}>{renderInline(item, `${key}-${j}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key}>
                {block.items.map((item, j) => (
                  <li key={`${key}-${j}`}>{renderInline(item, `${key}-${j}`)}</li>
                ))}
              </ol>
            );
        }
      })}
    </div>
  );
}
