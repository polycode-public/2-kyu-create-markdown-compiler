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

// HTML escaping for XSS safety
function escapeHtml(str) {
  if (typeof str !== "string") return str;
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

// Tokenizer: converts markdown into token stream
export function tokenize(markdown) {
  if (typeof markdown !== "string") {
    return [];
  }

  const lines = markdown.split("\n");
  const tokens = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      tokens.push({ type: "blank", content: "" });
      i++;
      continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      tokens.push({ type: "heading", level, content });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(---+|___+|\*\*\*+)$/.test(trimmed)) {
      tokens.push({ type: "hr" });
      i++;
      continue;
    }

    // Code fence
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      tokens.push({ type: "code_block", lang, content: codeLines.join("\n") });
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().slice(1).trim());
        i++;
      }
      tokens.push({ type: "blockquote", content: quoteLines.join("\n") });
      continue;
    }

    // Table
    if (trimmed.includes("|")) {
      const tableLines = [line];
      const isTableSeparator = (l) =>
        /^\|[\s\-:| ]+\|$/.test(l.trim());
      let j = i + 1;
      if (j < lines.length && isTableSeparator(lines[j])) {
        tableLines.push(lines[j]);
        j++;
        while (j < lines.length && lines[j].trim().includes("|")) {
          tableLines.push(lines[j]);
          j++;
        }
        const rows = tableLines.map((l) =>
          l
            .trim()
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim())
        );
        tokens.push({ type: "table", rows });
        i = j;
        continue;
      }
    }

    // Unordered list
    if (/^[-*+]\s+/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^[-*+]\s+/, "");
        const taskMatch = itemText.match(/^\[(.)\]\s+(.*)$/);
        if (taskMatch) {
          listItems.push({
            type: "task",
            checked: taskMatch[1] === "x",
            content: taskMatch[2],
          });
        } else {
          listItems.push({ type: "item", content: itemText });
        }
        i++;
      }
      tokens.push({ type: "ul", items: listItems });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+\.\s+/, "");
        listItems.push({ type: "item", content: itemText });
        i++;
      }
      tokens.push({ type: "ol", items: listItems });
      continue;
    }

    // Paragraph
    tokens.push({ type: "paragraph", content: line });
    i++;
  }

  return tokens;
}

// Inline parser: handles bold, italic, code, strikethrough, links, images
function parseInline(text) {
  if (!text) return [];

  const tokens = [];
  let pos = 0;

  while (pos < text.length) {
    // Image: ![alt](src)
    const imgMatch = text.slice(pos).match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      tokens.push({
        type: "image",
        alt: escapeHtml(imgMatch[1]),
        src: imgMatch[2],
      });
      pos += imgMatch[0].length;
      continue;
    }

    // Link: [text](url)
    const linkMatch = text.slice(pos).match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      tokens.push({
        type: "link",
        text: linkMatch[1],
        url: linkMatch[2],
      });
      pos += linkMatch[0].length;
      continue;
    }

    // Strikethrough: ~~text~~
    const strikeMatch = text.slice(pos).match(/^~~([^~]+?)~~/);
    if (strikeMatch) {
      tokens.push({ type: "strikethrough", content: strikeMatch[1] });
      pos += strikeMatch[0].length;
      continue;
    }

    // Bold: **text** or __text__
    const boldMatch = text.slice(pos).match(/^\*\*([^\*]+?)\*\*|^__([^_]+?)__/);
    if (boldMatch) {
      tokens.push({ type: "bold", content: boldMatch[1] || boldMatch[2] });
      pos += boldMatch[0].length;
      continue;
    }

    // Italic: *text* or _text_ (but not if preceded/followed by same marker)
    const italicMatch = text.slice(pos).match(/^\*([^\*\n]+?)\*(?!\*)|^_([^_\n]+?)_(?!_)/);
    if (italicMatch) {
      tokens.push({ type: "italic", content: italicMatch[1] || italicMatch[2] });
      pos += italicMatch[0].length;
      continue;
    }

    // Code: `text`
    const codeMatch = text.slice(pos).match(/^`([^`]+?)`/);
    if (codeMatch) {
      tokens.push({ type: "code", content: codeMatch[1] });
      pos += codeMatch[0].length;
      continue;
    }

    // Auto-linked URL
    const urlMatch = text.slice(pos).match(/^(https?:\/\/[^\s)>\]]+)/);
    if (urlMatch) {
      tokens.push({ type: "autolink", url: urlMatch[1] });
      pos += urlMatch[0].length;
      continue;
    }

    // Plain text
    const nextInline = text
      .slice(pos + 1)
      .search(/[*_`!\[\]<>h]/);
    const chunkSize = nextInline === -1 ? text.length - pos : nextInline + 1;
    const plainText = text.slice(pos, pos + chunkSize);
    if (plainText) {
      tokens.push({ type: "text", content: escapeHtml(plainText) });
    }
    pos += chunkSize;
  }

  return tokens;
}

// Render inline tokens to HTML
function renderInline(text) {
  const inlineTokens = parseInline(text);
  return inlineTokens
    .map((token) => {
      switch (token.type) {
        case "text":
          return token.content;
        case "bold":
          return `<strong>${renderInline(token.content)}</strong>`;
        case "italic":
          return `<em>${renderInline(token.content)}</em>`;
        case "code":
          return `<code>${escapeHtml(token.content)}</code>`;
        case "strikethrough":
          return `<del>${renderInline(token.content)}</del>`;
        case "link":
          return `<a href="${escapeHtml(token.url)}">${renderInline(token.text)}</a>`;
        case "image":
          return `<img alt="${token.alt}" src="${escapeHtml(token.src)}"/>`;
        case "autolink":
          return `<a href="${escapeHtml(token.url)}">${escapeHtml(token.url)}</a>`;
        default:
          return "";
      }
    })
    .join("");
}

// Compile markdown to HTML
export function compile(markdown) {
  if (typeof markdown !== "string") {
    return "";
  }

  const tokens = tokenize(markdown);
  const html = [];

  for (const token of tokens) {
    switch (token.type) {
      case "blank":
        break;

      case "heading":
        html.push(
          `<h${token.level}>${renderInline(token.content)}</h${token.level}>`
        );
        break;

      case "hr":
        html.push("<hr/>");
        break;

      case "code_block":
        const lang = token.lang ? ` class="language-${escapeHtml(token.lang)}"` : "";
        html.push(
          `<pre><code${lang}>${escapeHtml(token.content)}</code></pre>`
        );
        break;

      case "blockquote":
        const quoteHtml = renderInline(token.content);
        html.push(`<blockquote>${quoteHtml}</blockquote>`);
        break;

      case "table":
        const tableHtml = ['<table>'];
        if (token.rows.length > 0) {
          tableHtml.push('<thead><tr>');
          token.rows[0].forEach((cell) => {
            tableHtml.push(`<th>${renderInline(cell)}</th>`);
          });
          tableHtml.push('</tr></thead>');
        }
        if (token.rows.length > 2) {
          tableHtml.push('<tbody>');
          for (let i = 2; i < token.rows.length; i++) {
            tableHtml.push('<tr>');
            token.rows[i].forEach((cell) => {
              tableHtml.push(`<td>${renderInline(cell)}</td>`);
            });
            tableHtml.push('</tr>');
          }
          tableHtml.push('</tbody>');
        }
        tableHtml.push('</table>');
        html.push(tableHtml.join(''));
        break;

      case "ul":
        const ulHtml = ['<ul>'];
        token.items.forEach((item) => {
          if (item.type === "task") {
            ulHtml.push(
              `<li><input type="checkbox"${item.checked ? ' checked' : ''} disabled/> ${renderInline(item.content)}</li>`
            );
          } else {
            ulHtml.push(`<li>${renderInline(item.content)}</li>`);
          }
        });
        ulHtml.push('</ul>');
        html.push(ulHtml.join(''));
        break;

      case "ol":
        const olHtml = ['<ol>'];
        token.items.forEach((item) => {
          olHtml.push(`<li>${renderInline(item.content)}</li>`);
        });
        olHtml.push('</ol>');
        html.push(olHtml.join(''));
        break;

      case "paragraph":
        html.push(`<p>${renderInline(token.content)}</p>`);
        break;
    }
  }

  return html.join("\n");
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
