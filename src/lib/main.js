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

// HTML escape for XSS safety
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Tokenizer: converts markdown to intermediate token representation
export function tokenize(markdown) {
  if (!markdown || typeof markdown !== "string") return [];

  const lines = markdown.split("\n");
  const tokens = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      tokens.push({
        type: "heading",
        level,
        content,
      });
      i++;
      continue;
    }

    // Paragraph (default for any other line)
    tokens.push({
      type: "paragraph",
      content: trimmed,
    });
    i++;
  }

  return tokens;
}

// Parse inline formatting in text
function parseInline(text) {
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    // Bold **text**
    if (text[i] === "*" && text[i + 1] === "*") {
      const closeIdx = text.indexOf("**", i + 2);
      if (closeIdx !== -1) {
        const content = text.slice(i + 2, closeIdx);
        tokens.push({ type: "bold", content });
        i = closeIdx + 2;
        continue;
      }
    }

    // Strikethrough ~~text~~
    if (text[i] === "~" && text[i + 1] === "~") {
      const closeIdx = text.indexOf("~~", i + 2);
      if (closeIdx !== -1) {
        const content = text.slice(i + 2, closeIdx);
        tokens.push({ type: "strikethrough", content });
        i = closeIdx + 2;
        continue;
      }
    }

    // Italic *text* (but not ** or **)
    if (text[i] === "*" && text[i + 1] !== "*" && text[i - 1] !== "*") {
      const closeIdx = text.indexOf("*", i + 1);
      if (closeIdx !== -1 && text[closeIdx + 1] !== "*") {
        const content = text.slice(i + 1, closeIdx);
        tokens.push({ type: "italic", content });
        i = closeIdx + 1;
        continue;
      }
    }

    // Inline code `text`
    if (text[i] === "`") {
      const closeIdx = text.indexOf("`", i + 1);
      if (closeIdx !== -1) {
        const content = text.slice(i + 1, closeIdx);
        tokens.push({ type: "code", content });
        i = closeIdx + 1;
        continue;
      }
    }

    // Regular text until next marker
    let end = i + 1;
    while (end < text.length) {
      const char = text[end];
      if (char === "*" || char === "`" || char === "~") break;
      end++;
    }

    if (end === i + 1) {
      tokens.push({ type: "text", content: text[i] });
      i++;
    } else {
      tokens.push({ type: "text", content: text.slice(i, end) });
      i = end;
    }
  }

  return tokens;
}

// Render inline tokens to HTML
function renderInline(text) {
  const inlineTokens = parseInline(text);
  let html = "";

  for (const token of inlineTokens) {
    if (token.type === "text") {
      html += escapeHtml(token.content);
    } else if (token.type === "bold") {
      html += "<strong>" + renderInline(token.content) + "</strong>";
    } else if (token.type === "italic") {
      html += "<em>" + renderInline(token.content) + "</em>";
    } else if (token.type === "code") {
      html += "<code>" + escapeHtml(token.content) + "</code>";
    } else if (token.type === "strikethrough") {
      html += "<del>" + renderInline(token.content) + "</del>";
    }
  }

  return html;
}

// Compiler: converts markdown to HTML
export function compile(markdown) {
  const tokens = tokenize(markdown);
  let html = "";

  for (const token of tokens) {
    if (token.type === "heading") {
      const tag = `h${token.level}`;
      html += `<${tag}>` + renderInline(token.content) + `</${tag}>`;
    } else if (token.type === "paragraph") {
      html += "<p>" + renderInline(token.content) + "</p>";
    }
  }

  return html;
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
