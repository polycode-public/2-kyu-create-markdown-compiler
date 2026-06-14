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

    // Horizontal rule
    if (/^(-{3,}|_{3,}|\*{3,})\s*$/.test(trimmed)) {
      tokens.push({ type: "hr" });
      i++;
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith("```")) {
      const codeToken = parseCodeBlock(lines, i);
      tokens.push(codeToken);
      i = codeToken._endIndex;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      const blockquoteToken = parseBlockquote(lines, i);
      tokens.push(blockquoteToken);
      i = blockquoteToken._endIndex;
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

    // Table detection (must have pipe and next line must be delimiter)
    if (trimmed.includes("|") && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (isTableDelimiter(nextLine)) {
        const tableToken = parseTable(lines, i);
        tokens.push(tableToken);
        i = tableToken._endIndex;
        continue;
      }
    }

    // Task list detection (- [ ] or - [x])
    const taskListMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.+)$/);
    if (taskListMatch) {
      const taskListToken = parseTaskList(lines, i);
      tokens.push(taskListToken);
      i = taskListToken._endIndex;
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

// Check if a line is a table delimiter row
function isTableDelimiter(line) {
  const cells = line.split("|").map(c => c.trim()).filter(c => c);
  if (cells.length === 0) return false;
  for (const cell of cells) {
    if (!/^:?-+:?$/.test(cell)) return false;
  }
  return true;
}

// Parse table alignment from delimiter cell (e.g., :-- for left, :-: for center, --: for right)
function parseAlignment(delimiter) {
  delimiter = delimiter.trim();
  const leftColon = delimiter.startsWith(":");
  const rightColon = delimiter.endsWith(":");

  if (leftColon && rightColon) return "center";
  if (rightColon) return "right";
  if (leftColon) return "left";
  return null;
}

// Parse a table (GFM pipe syntax)
function parseTable(lines, startIdx) {
  const headerLine = lines[startIdx].trim();
  const delimiterLine = lines[startIdx + 1].trim();

  // Parse header cells
  const headerCells = headerLine.split("|").map(c => c.trim()).filter(c => c);

  // Parse alignment from delimiter
  const delimiterCells = delimiterLine.split("|").map(c => c.trim()).filter(c => c);
  const alignments = delimiterCells.map(parseAlignment);

  // Parse body rows
  const rows = [];
  let i = startIdx + 2;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || !line.includes("|")) break;

    const cells = line.split("|").map(c => c.trim()).filter(c => c);
    if (cells.length === 0) break;

    rows.push(cells);
    i++;
  }

  return {
    type: "table",
    headers: headerCells,
    alignments,
    rows,
    _endIndex: i
  };
}

// Parse a fenced code block
function parseCodeBlock(lines, startIdx) {
  const firstLine = lines[startIdx].trim();
  const langMatch = firstLine.match(/^```(.*)$/);
  const language = langMatch ? langMatch[1].trim() : "";

  let i = startIdx + 1;
  const codeLines = [];

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      return {
        type: "code-block",
        language,
        content: codeLines.join("\n"),
        _endIndex: i + 1
      };
    }
    codeLines.push(line);
    i++;
  }

  // No closing fence found, treat as code block to end of file
  return {
    type: "code-block",
    language,
    content: codeLines.join("\n"),
    _endIndex: i
  };
}

// Parse a blockquote (including nested blockquotes)
function parseBlockquote(lines, startIdx) {
  const blockquoteLines = [];
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      // Empty line might be part of blockquote or end it
      i++;
      // Check if next line continues blockquote
      if (i < lines.length && lines[i].trim().startsWith(">")) {
        blockquoteLines.push("");
        continue;
      } else {
        break;
      }
    }

    if (trimmed.startsWith(">")) {
      // Remove the > and optional space
      const contentAfterMarker = trimmed.replace(/^>\s?/, "");
      blockquoteLines.push(contentAfterMarker);
      i++;
    } else {
      break;
    }
  }

  // Parse blockquote content recursively
  const blockquoteContent = blockquoteLines.join("\n");
  const nestedTokens = tokenize(blockquoteContent);

  return {
    type: "blockquote",
    content: blockquoteContent,
    tokens: nestedTokens,
    _endIndex: i
  };
}

// Parse a task list (- [ ] or - [x] items)
function parseTaskList(lines, startIdx) {
  const firstLine = lines[startIdx];
  const firstIndent = firstLine.match(/^(\s*)/)[1].length;

  const items = [];
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      break;
    }

    const taskMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.+)$/);
    if (!taskMatch) {
      break;
    }

    const itemIndent = taskMatch[1].length;
    const isChecked = taskMatch[2].toLowerCase() === 'x';
    const itemText = taskMatch[3];

    if (itemIndent === firstIndent) {
      const inlineTokens = parseInline(itemText);
      items.push({
        type: "task-item",
        content: itemText,
        checked: isChecked,
        inline: inlineTokens,
        children: []
      });
      i++;
    } else if (itemIndent > firstIndent) {
      if (items.length === 0) {
        i++;
        continue;
      }
      const nestedTaskList = parseTaskList(lines, i);
      items[items.length - 1].children.push(nestedTaskList);
      i = nestedTaskList._endIndex;
    } else {
      break;
    }
  }

  return {
    type: "task-list",
    items,
    _endIndex: i
  };
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

    // Auto-linked URL (https://... or http://...)
    if (text.slice(i, i + 8) === "https://" || text.slice(i, i + 7) === "http://") {
      const urlStart = i;
      let urlEnd = i;
      while (urlEnd < text.length) {
        const char = text[urlEnd];
        if (char === " " || char === "\n" || char === ")" || char === "]" || char === ">" || char === "<") break;
        urlEnd++;
      }
      const url = text.slice(urlStart, urlEnd);
      tokens.push({ type: "auto-link", url });
      i = urlEnd;
      continue;
    }

    // Regular text until next marker
    let end = i + 1;
    while (end < text.length) {
      const char = text[end];
      if (char === "*" || char === "`" || char === "~" || char === "[" || (char === "!" && text[end + 1] === "[")) break;
      // Stop at auto-link start
      if (text.slice(end, end + 8) === "https://" || text.slice(end, end + 7) === "http://") break;
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

// Render code block to HTML (content is literal, not parsed)
function renderCodeBlock(codeToken) {
  const languageClass = codeToken.language ? ` class="language-${escapeHtml(codeToken.language)}"` : "";
  return `<pre><code${languageClass}>${escapeHtml(codeToken.content)}</code></pre>`;
}

// Render blockquote to HTML
function renderBlockquote(blockquoteToken) {
  let html = "<blockquote>";
  for (const token of blockquoteToken.tokens) {
    if (token.type === "heading") {
      const tag = `h${token.level}`;
      html += `<${tag}>` + renderInline(token.content) + `</${tag}>`;
    } else if (token.type === "paragraph") {
      html += "<p>" + renderInline(token.content) + "</p>";
    } else if (token.type === "ordered-list" || token.type === "unordered-list") {
      html += renderList(token);
    } else if (token.type === "blockquote") {
      html += renderBlockquote(token);
    } else if (token.type === "code-block") {
      html += renderCodeBlock(token);
    }
  }
  html += "</blockquote>";
  return html;
}

// Render table to HTML
function renderTable(tableToken) {
  let html = "<table>";

  // Render header
  html += "<thead><tr>";
  for (let i = 0; i < tableToken.headers.length; i++) {
    const alignment = tableToken.alignments[i];
    const style = alignment ? ` style="text-align:${alignment}"` : "";
    html += `<th${style}>` + renderInline(tableToken.headers[i]) + "</th>";
  }
  html += "</tr></thead>";

  // Render body
  html += "<tbody>";
  for (const row of tableToken.rows) {
    html += "<tr>";
    for (let i = 0; i < row.length; i++) {
      const alignment = tableToken.alignments[i];
      const style = alignment ? ` style="text-align:${alignment}"` : "";
      html += `<td${style}>` + renderInline(row[i]) + "</td>";
    }
    html += "</tr>";
  }
  html += "</tbody>";

  html += "</table>";
  return html;
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
    } else if (token.type === "auto-link") {
      html += "<a href=\"" + escapeHtml(token.url) + "\">" + escapeHtml(token.url) + "</a>";
    } else if (token.type === "image") {
      html += "<img src=\"" + escapeHtml(token.src) + "\" alt=\"" + escapeHtml(token.alt) + "\"/>";
    }
  }

  return html;
}

// Render task list to HTML
function renderTaskList(taskListToken) {
  let html = "<ul>";

  for (const item of taskListToken.items) {
    const checkbox = `<input type="checkbox"${item.checked ? " checked" : ""} disabled/>`;
    html += "<li>" + checkbox + " " + renderInline(item.content);
    for (const child of item.children) {
      if (child.type === "task-list") {
        html += renderTaskList(child);
      } else {
        html += renderList(child);
      }
    }
    html += "</li>";
  }

  html += "</ul>";
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
    } else if (token.type === "task-list") {
      html += renderTaskList(token);
    } else if (token.type === "ordered-list" || token.type === "unordered-list") {
      html += renderList(token);
    } else if (token.type === "code-block") {
      html += renderCodeBlock(token);
    } else if (token.type === "blockquote") {
      html += renderBlockquote(token);
    } else if (token.type === "table") {
      html += renderTable(token);
    } else if (token.type === "hr") {
      html += "<hr/>";
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
