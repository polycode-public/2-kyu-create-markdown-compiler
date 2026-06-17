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

    const urlMatch = remaining.match(/^https?:\/\/[^\s<>"\)]+/);
    if (urlMatch) {
      tokens.push({ type: "autolink", raw: urlMatch[0], url: urlMatch[0] });
      pos += urlMatch[0].length;
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

    const textMatch = remaining.match(/^[^*`~\[\]!h]+/);
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
      if (token.type === "autolink") return `<a href="${escapeHtml(token.url)}">${escapeHtml(token.url)}</a>`;
      if (token.type === "image") return `<img src="${escapeHtml(token.src)}" alt="${escapeHtml(token.alt)}"/>`;
      return escapeHtml(token.raw);
    })
    .join("");
}

function tokenizeListItems(lines, startIdx, baseIndent = null) {
  const items = [];
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    const indent = line.length - line.trimLeft().length;

    // If baseIndent is set and current indent is less, we're done at this level
    if (baseIndent !== null && indent < baseIndent) {
      break;
    }

    // Only process list items at the current indent level
    if (baseIndent !== null && indent !== baseIndent) {
      break;
    }

    const taskMatch = trimmed.match(/^[-*+]\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      const checked = taskMatch[1].toLowerCase() === "x";
      const content = taskMatch[2];
      const item = {
        type: "list-item",
        listType: "unordered",
        isTask: true,
        checked,
        content,
        indent,
        inlineTokens: tokenizeInline(content),
        children: [],
      };

      i++;
      const currentBaseIndent = baseIndent === null ? indent : baseIndent;

      while (i < lines.length) {
        const nextLine = lines[i];
        const nextTrimmed = nextLine.trim();
        const nextIndent = nextLine.length - nextLine.trimLeft().length;

        if (!nextTrimmed) {
          i++;
          continue;
        }

        // Check if next line is a nested list item
        if (nextIndent > currentBaseIndent) {
          const unorderedNested = nextTrimmed.match(/^[-*+]\s+(.+)$/);
          const orderedNested = nextTrimmed.match(/^\d+\.\s+(.+)$/);

          if (unorderedNested || orderedNested) {
            const nestedResult = tokenizeListItems(lines, i, nextIndent);
            item.children = nestedResult.items;
            i = nestedResult.nextIdx;
            break;
          }
        }

        break;
      }

      items.push(item);
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (unorderedMatch) {
      const content = unorderedMatch[1];
      const item = {
        type: "list-item",
        listType: "unordered",
        content,
        indent,
        inlineTokens: tokenizeInline(content),
        children: [],
      };

      i++;
      const currentBaseIndent = baseIndent === null ? indent : baseIndent;

      while (i < lines.length) {
        const nextLine = lines[i];
        const nextTrimmed = nextLine.trim();
        const nextIndent = nextLine.length - nextLine.trimLeft().length;

        if (!nextTrimmed) {
          i++;
          continue;
        }

        // Check if next line is a nested list item
        if (nextIndent > currentBaseIndent) {
          const unorderedNested = nextTrimmed.match(/^[-*+]\s+(.+)$/);
          const orderedNested = nextTrimmed.match(/^\d+\.\s+(.+)$/);

          if (unorderedNested || orderedNested) {
            const nestedResult = tokenizeListItems(lines, i, nextIndent);
            item.children = nestedResult.items;
            i = nestedResult.nextIdx;
            break;
          }
        }

        break;
      }

      items.push(item);
    } else {
      const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
      if (orderedMatch) {
        const content = orderedMatch[1];
        const item = {
          type: "list-item",
          listType: "ordered",
          content,
          indent,
          inlineTokens: tokenizeInline(content),
          children: [],
        };

        i++;
        const currentBaseIndent = baseIndent === null ? indent : baseIndent;

        while (i < lines.length) {
          const nextLine = lines[i];
          const nextTrimmed = nextLine.trim();
          const nextIndent = nextLine.length - nextLine.trimLeft().length;

          if (!nextTrimmed) {
            i++;
            continue;
          }

          // Check if next line is a nested list item
          if (nextIndent > currentBaseIndent) {
            const unorderedNested = nextTrimmed.match(/^[-*+]\s+(.+)$/);
            const orderedNested = nextTrimmed.match(/^\d+\.\s+(.+)$/);

            if (unorderedNested || orderedNested) {
              const nestedResult = tokenizeListItems(lines, i, nextIndent);
              item.children = nestedResult.items;
              i = nestedResult.nextIdx;
              break;
            }
          }

          break;
        }

        items.push(item);
      } else {
        break;
      }
    }
  }

  return { items, nextIdx: i };
}

function isHorizontalRule(line) {
  const trimmed = line.trim();
  return /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed);
}

function isTableDelimiter(line) {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;
  const cells = trimmed.split("|").map((c) => c.trim());
  return cells.every((cell) => /^:?-+:?$/.test(cell) || cell === "");
}

function parseTableAlignment(cell) {
  cell = cell.trim();
  if (cell.startsWith(":") && cell.endsWith(":")) return "center";
  if (cell.startsWith(":")) return "left";
  if (cell.endsWith(":")) return "right";
  return null;
}

function parseTableRow(line) {
  const trimmed = line.trim();
  const cells = trimmed.split("|").map((c) => c.trim());
  if (cells[0] === "") cells.shift();
  if (cells[cells.length - 1] === "") cells.pop();
  return cells;
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

    // Check for horizontal rule
    if (isHorizontalRule(line)) {
      tokens.push({
        type: "horizontal-rule",
        raw: line,
      });
      i++;
      continue;
    }

    // Check for fenced code block
    const codeBlockMatch = trimmed.match(/^```(\w*)?$/);
    if (codeBlockMatch) {
      const lang = codeBlockMatch[1] || "";
      const codeLines = [];
      i++;
      while (i < lines.length) {
        const codeLine = lines[i];
        if (codeLine.trim().match(/^```$/)) {
          break;
        }
        codeLines.push(codeLine);
        i++;
      }
      tokens.push({
        type: "code-block",
        lang,
        raw: codeLines.join("\n"),
        content: codeLines.join("\n"),
      });
      i++;
      continue;
    }

    // Check for blockquote
    const blockquoteMatch = trimmed.match(/^>\s+(.*)$/);
    if (blockquoteMatch) {
      const blockquoteLines = [];
      let j = i;
      while (j < lines.length) {
        const bqLine = lines[j];
        const bqTrimmed = bqLine.trim();
        if (!bqTrimmed) {
          j++;
          continue;
        }
        const match = bqTrimmed.match(/^(>+)\s+(.*)$/);
        if (!match) {
          break;
        }
        blockquoteLines.push(bqLine);
        j++;
      }
      const blockquoteMarkdown = blockquoteLines
        .map((bqLine) => {
          const match = bqLine.match(/^(>+)\s+(.*)$/);
          return match ? { depth: match[1].length, content: match[2] } : null;
        })
        .filter(Boolean);
      tokens.push({
        type: "blockquote",
        raw: blockquoteLines.join("\n"),
        lines: blockquoteMarkdown,
      });
      i = j;
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

    // Check for table (pipe-delimited with potential delimiter row)
    if (trimmed.includes("|")) {
      if (i + 1 < lines.length && isTableDelimiter(lines[i + 1])) {
        const headerRow = parseTableRow(line);
        const delimiterRow = parseTableRow(lines[i + 1]);
        const alignments = delimiterRow.map((cell) => parseTableAlignment(cell));

        const bodyRows = [];
        let j = i + 2;
        while (j < lines.length) {
          const bodyLine = lines[j].trim();
          if (!bodyLine || !bodyLine.includes("|")) break;
          bodyRows.push(parseTableRow(lines[j]));
          j++;
        }

        tokens.push({
          type: "table",
          raw: lines.slice(i, j).join("\n"),
          header: headerRow,
          alignments,
          rows: bodyRows,
        });
        i = j;
        continue;
      }
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (unorderedMatch) {
      const listResult = tokenizeListItems(lines, i);
      tokens.push({
        type: "list",
        listType: "unordered",
        items: listResult.items,
      });
      i = listResult.nextIdx;
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      const listResult = tokenizeListItems(lines, i);
      tokens.push({
        type: "list",
        listType: "ordered",
        items: listResult.items,
      });
      i = listResult.nextIdx;
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

function renderListItems(items) {
  return items
    .map((item) => {
      let html = "<li>";
      if (item.isTask) {
        const checked = item.checked ? " checked" : "";
        html += `<input type="checkbox"${checked} disabled/>`;
      }
      html += renderInline(item.content);
      if (item.children.length > 0) {
        const nestedListType = item.children[0].listType;
        const tag = nestedListType === "ordered" ? "ol" : "ul";
        html += `<${tag}>${renderListItems(item.children)}</${tag}>`;
      }
      html += "</li>";
      return html;
    })
    .join("");
}

function renderBlockquote(lines) {
  if (lines.length === 0) return "";

  const grouped = [];
  let currentGroup = [];
  let currentDepth = lines[0].depth;

  for (const line of lines) {
    if (line.depth === currentDepth) {
      currentGroup.push(line.content);
    } else {
      if (currentGroup.length > 0) {
        grouped.push({ depth: currentDepth, lines: currentGroup });
      }
      currentGroup = [line.content];
      currentDepth = line.depth;
    }
  }
  if (currentGroup.length > 0) {
    grouped.push({ depth: currentDepth, lines: currentGroup });
  }

  let html = `<blockquote>${renderBlockquoteContent(lines)}</blockquote>`;
  return html;
}

function renderBlockquoteContent(lines) {
  if (lines.length === 0) return "";

  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.depth === 1) {
      const content = line.content;
      const trimmed = content.trim();

      // Check if it's a list item
      const unorderedMatch = trimmed.match(/^[-*+]\s+(.+)$/);
      if (unorderedMatch) {
        const listLines = [];
        let j = i;
        while (j < lines.length && lines[j].depth === 1) {
          const bqContent = lines[j].content.trim();
          if (bqContent.match(/^[-*+]\s+/) || bqContent.match(/^\s+[-*+]\s+/)) {
            listLines.push(lines[j]);
          } else if (bqContent.match(/^\d+\.\s+/) || bqContent.match(/^\s+\d+\.\s+/)) {
            listLines.push(lines[j]);
          } else {
            break;
          }
          j++;
        }

        if (listLines.length > 0) {
          const reconstructed = listLines.map((l) => l.content).join("\n");
          const listTokens = tokenize(reconstructed);
          const listHtml = listTokens
            .map((token) => {
              if (token.type === "list") {
                const tag = token.listType === "ordered" ? "ol" : "ul";
                return `<${tag}>${renderListItems(token.items)}</${tag}>`;
              }
              return "";
            })
            .join("");
          html += listHtml;
          i = j;
          continue;
        }
      }

      const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
      if (orderedMatch) {
        const listLines = [];
        let j = i;
        while (j < lines.length && lines[j].depth === 1) {
          const bqContent = lines[j].content.trim();
          if (bqContent.match(/^[-*+]\s+/) || bqContent.match(/^\s+[-*+]\s+/)) {
            listLines.push(lines[j]);
          } else if (bqContent.match(/^\d+\.\s+/) || bqContent.match(/^\s+\d+\.\s+/)) {
            listLines.push(lines[j]);
          } else {
            break;
          }
          j++;
        }

        if (listLines.length > 0) {
          const reconstructed = listLines.map((l) => l.content).join("\n");
          const listTokens = tokenize(reconstructed);
          const listHtml = listTokens
            .map((token) => {
              if (token.type === "list") {
                const tag = token.listType === "ordered" ? "ol" : "ul";
                return `<${tag}>${renderListItems(token.items)}</${tag}>`;
              }
              return "";
            })
            .join("");
          html += listHtml;
          i = j;
          continue;
        }
      }

      // Regular paragraph or text
      if (trimmed) {
        html += `<p>${renderInline(content)}</p>`;
      }
      i++;
    } else if (line.depth > 1) {
      // Nested blockquote
      const nestedLines = [];
      let j = i;
      const minDepth = line.depth;
      while (j < lines.length && lines[j].depth >= minDepth) {
        nestedLines.push({
          ...lines[j],
          depth: lines[j].depth - 1,
        });
        j++;
      }
      html += renderBlockquote(nestedLines);
      i = j;
    } else {
      i++;
    }
  }

  return html;
}

function renderTable(token) {
  const headerCells = token.header
    .map((cell, idx) => {
      const align = token.alignments[idx];
      const alignAttr = align ? ` align="${align}"` : "";
      return `<th${alignAttr}>${renderInline(cell)}</th>`;
    })
    .join("");

  const bodyRows = token.rows
    .map((row) => {
      const cells = row
        .map((cell, idx) => {
          const align = token.alignments[idx];
          const alignAttr = align ? ` align="${align}"` : "";
          return `<td${alignAttr}>${renderInline(cell)}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
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
      if (token.type === "list") {
        const tag = token.listType === "ordered" ? "ol" : "ul";
        return `<${tag}>${renderListItems(token.items)}</${tag}>`;
      }
      if (token.type === "code-block") {
        const langClass = token.lang ? ` class="language-${escapeHtml(token.lang)}"` : "";
        return `<pre><code${langClass}>${escapeHtml(token.content)}</code></pre>`;
      }
      if (token.type === "blockquote") {
        return renderBlockquote(token.lines);
      }
      if (token.type === "horizontal-rule") {
        return "<hr/>";
      }
      if (token.type === "table") {
        return renderTable(token);
      }
      return "";
    })
    .join("");

  return html;
}

export function demo() {
  const markdown = "# Hello\n\n**Bold** and *italic* text with `code`, [links](https://example.com), and ![image](https://example.com/pic.png).\n\n## Lists\n\n- Item 1\n- Item 2\n  - Nested 2a\n  - Nested 2b\n- Item 3\n\n1. Ordered 1\n2. Ordered 2\n   - Mixed nested\n3. Ordered 3\n\n## Task Lists\n\n- [x] Completed task\n- [ ] Incomplete task\n\n## Auto-linked URLs\n\nVisit https://example.com or https://github.com/polycode-public for more.\n\n## Code Blocks\n\n```js\nconst hello = \"world\";\nconsole.log(hello);\n```\n\n## Blockquotes\n\n> This is a blockquote\n> with multiple lines\n\n> This is a nested blockquote\n> > With a second level\n> > > And even deeper\n\n---\n\n## Tables\n\n| Left | Center | Right |\n|:-----|:------:|------:|\n| A | B | C |\n| **bold** | *italic* | `code` |\n\n---";
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
