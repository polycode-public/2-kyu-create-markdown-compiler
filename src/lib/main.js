#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (C) 2025-2026 Polycode Limited
// src/lib/main.js

const isNode = typeof process !== "undefined" && !!process.versions?.node;

let pkg;
if (isNode) {
  const { createRequire } = await import("module");
  const requireFn = createRequire(import.meta.url);
  pkg = requireFn("../../package.json");
} else {
  try {
    const resp = await fetch(new URL("../../package.json", import.meta.url));
    pkg = await resp.json();
  } catch {
    pkg = { name: document.title, version: "0.0.0", description: "" };
  }
}

export const name = pkg.name;
export const version = pkg.version;
export const description = pkg.description;

export function getIdentity() {
  return { name, version, description };
}

function escapeHtml(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
  return String(text).replace(/[&<>"]/g, (c) => map[c]);
}

function tokenizeInline(text) {
  const tokens = [];
  let pos = 0;

  while (pos < text.length) {
    const remaining = text.slice(pos);

    const imageMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imageMatch) {
      tokens.push({ type: "image", raw: imageMatch[0], alt: imageMatch[1], src: imageMatch[2] });
      pos += imageMatch[0].length;
      continue;
    }

    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      tokens.push({ type: "link", raw: linkMatch[0], content: linkMatch[1], url: linkMatch[2] });
      pos += linkMatch[0].length;
      continue;
    }

    const strikeMatch = remaining.match(/^~~(.+?)~~(?!\w)/);
    if (strikeMatch) {
      tokens.push({ type: "strikethrough", raw: strikeMatch[0], content: strikeMatch[1] });
      pos += strikeMatch[0].length;
      continue;
    }

    const boldMatch = remaining.match(/^\*\*(.+?)\*\*(?!\w)/);
    if (boldMatch) {
      tokens.push({ type: "bold", raw: boldMatch[0], content: boldMatch[1] });
      pos += boldMatch[0].length;
      continue;
    }

    const italicMatch = remaining.match(/^\*(.+?)\*(?!\w)/);
    if (italicMatch) {
      tokens.push({ type: "italic", raw: italicMatch[0], content: italicMatch[1] });
      pos += italicMatch[0].length;
      continue;
    }

    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push({ type: "code", raw: codeMatch[0], content: codeMatch[1] });
      pos += codeMatch[0].length;
      continue;
    }

    const textMatch = remaining.match(/^[^*`~\[\]!]+/);
    if (textMatch) {
      tokens.push({ type: "text", raw: textMatch[0], content: textMatch[0] });
      pos += textMatch[0].length;
    } else {
      tokens.push({ type: "text", raw: remaining[0], content: remaining[0] });
      pos += 1;
    }
  }

  return tokens;
}

function renderInline(text) {
  const tokens = tokenizeInline(text);
  return tokens
    .map((token) => {
      if (token.type === "text") return escapeHtml(token.content);
      if (token.type === "bold") return `<strong>${renderInline(token.content)}</strong>`;
      if (token.type === "italic") return `<em>${renderInline(token.content)}</em>`;
      if (token.type === "code") return `<code>${escapeHtml(token.content)}</code>`;
      if (token.type === "strikethrough") return `<del>${renderInline(token.content)}</del>`;
      if (token.type === "link") return `<a href="${escapeHtml(token.url)}">${renderInline(token.content)}</a>`;
      if (token.type === "image") return `<img src="${escapeHtml(token.src)}" alt="${escapeHtml(token.alt)}"/>`;
      return escapeHtml(token.raw);
    })
    .join("");
}

export function tokenize(markdown) {
  const lines = markdown.split(/\r?\n/);
  const tokens = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      tokens.push({
        type: "heading",
        level,
        raw: line,
        content,
        inlineTokens: tokenizeInline(content),
      });
      i++;
      continue;
    }

    tokens.push({
      type: "paragraph",
      raw: line,
      content: trimmed,
      inlineTokens: tokenizeInline(trimmed),
    });
    i++;
  }

  return tokens;
}

export function compile(markdown) {
  const tokens = tokenize(markdown);
  const html = tokens
    .map((token) => {
      if (token.type === "heading") {
        const tag = `h${token.level}`;
        return `<${tag}>${renderInline(token.content)}</${tag}>`;
      }
      if (token.type === "paragraph") {
        return `<p>${renderInline(token.content)}</p>`;
      }
      return "";
    })
    .join("");

  return html;
}

export function demo() {
  const markdown = "# Hello\n\n**Bold** and *italic* text with `code`, [links](https://example.com), and ![image](https://example.com/pic.png).";
  const html = compile(markdown);
  return { markdown, html };
}

export function main(args) {
  if (args?.includes("--version")) {
    console.log(version);
    return;
  }
  if (args?.includes("--identity")) {
    console.log(JSON.stringify(getIdentity(), null, 2));
    return;
  }
  console.log(`${name}@${version}`);
}

if (isNode) {
  const { fileURLToPath } = await import("url");
  if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    main(args);
  }
}
