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
      const inlineTokens = parseInline(content);
      tokens.push({
        type: "heading",
        level,
        content,
        inline: inlineTokens,
      });
      i++;
      continue;
    }

    // List detection
    const listMatch = line.match(/^(\s*)([*\-+]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const listToken = parseList(lines, i);
      tokens.push(listToken);
      i = listToken._endIndex;
      continue;
    }

    // Paragraph (default for any other line)
    const inlineTokens = parseInline(trimmed);
    tokens.push({
      type: "paragraph",
      content: trimmed,
      inline: inlineTokens,
    });
    i++;
  }

  return tokens;
}

// Parse a list and return a list token with items
function parseList(lines, startIdx) {
  const firstLine = lines[startIdx];
  const firstIndent = firstLine.match(/^(\s*)/)[1].length;
  const firstListMatch = firstLine.match(/^(\s*)([*\-+]|\d+\.)\s+(.+)$/);
  const isOrdered = /^\d+\./.test(firstListMatch[2]);

  const items = [];
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      // Empty line stops the list
      i++;
      break;
    }

    const itemMatch = line.match(/^(\s*)([*\-+]|\d+\.)\s+(.+)$/);
    if (!itemMatch) {
      break;
    }

    const itemIndent = itemMatch[1].length;
    const marker = itemMatch[2];
    const itemIsOrdered = /^\d+\./.test(marker);

    // At same indent level as parent
    if (itemIndent === firstIndent && itemIsOrdered === isOrdered) {
      const itemText = itemMatch[3];
      const inlineTokens = parseInline(itemText);
      items.push({
        type: "list-item",
        content: itemText,
        inline: inlineTokens,
        children: []
      });
      i++;
    } else if (itemIndent > firstIndent) {
      // Nested list
      if (items.length === 0) {
        i++;
        continue;
      }
      const nestedList = parseList(lines, i);
      items[items.length - 1].children.push(nestedList);
      i = nestedList._endIndex;
    } else {
      // Different list or less indented, stop
      break;
    }
  }

  return {
    type: isOrdered ? "ordered-list" : "unordered-list",
    items,
    _endIndex: i
  };
}

// Parse inline formatting in text
function parseInline(text) {
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    // Image ![alt](src)
    if (text[i] === "!" && text[i + 1] === "[") {
      const closeIdx = text.indexOf("]", i + 2);
      if (closeIdx !== -1 && text[closeIdx + 1] === "(") {
        const parenClose = text.indexOf(")", closeIdx + 2);
        if (parenClose !== -1) {
          const alt = text.slice(i + 2, closeIdx);
          const src = text.slice(closeIdx + 2, parenClose);
          tokens.push({ type: "image", alt, src });
          i = parenClose + 1;
          continue;
        }
      }
    }

    // Link [text](url)
    if (text[i] === "[") {
      const closeIdx = text.indexOf("]", i + 1);
      if (closeIdx !== -1 && text[closeIdx + 1] === "(") {
        const parenClose = text.indexOf(")", closeIdx + 2);
        if (parenClose !== -1) {
          const linkText = text.slice(i + 1, closeIdx);
          const url = text.slice(closeIdx + 2, parenClose);
          tokens.push({ type: "link", content: linkText, url });
          i = parenClose + 1;
          continue;
        }
      }
    }

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
      if (char === "*" || char === "`" || char === "~" || char === "[" || (char === "!" && text[end + 1] === "[")) break;
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
    } else if (token.type === "link") {
      html += "<a href=\"" + escapeHtml(token.url) + "\">" + renderInline(token.content) + "</a>";
    } else if (token.type === "image") {
      html += "<img src=\"" + escapeHtml(token.src) + "\" alt=\"" + escapeHtml(token.alt) + "\"/>";
    }
  }

  return html;
}

// Compile list to HTML
function renderList(listToken) {
  const tag = listToken.type === "ordered-list" ? "ol" : "ul";
  let html = `<${tag}>`;

  for (const item of listToken.items) {
    html += "<li>" + renderInline(item.content);
    for (const child of item.children) {
      html += renderList(child);
    }
    html += "</li>";
  }

  html += `</${tag}>`;
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
    } else if (token.type === "ordered-list" || token.type === "unordered-list") {
      html += renderList(token);
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
