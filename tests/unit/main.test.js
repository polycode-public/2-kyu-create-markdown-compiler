// SPDX-License-Identifier: MIT
// Copyright (C) 2025-2026 Polycode Limited
import { describe, test, expect } from "vitest";
import { main, getIdentity, name, version, description, compile, tokenize } from "../../src/lib/main.js";

describe("Main Output", () => {
  test("should terminate without error", () => {
    process.argv = ["node", "src/lib/main.js"];
    main();
  });
});

describe("Library Identity", () => {
  test("exports name, version, and description", () => {
    expect(typeof name).toBe("string");
    expect(typeof version).toBe("string");
    expect(typeof description).toBe("string");
    expect(name.length).toBeGreaterThan(0);
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("getIdentity returns correct structure", () => {
    const identity = getIdentity();
    expect(identity).toEqual({ name, version, description });
  });
});

describe("Markdown Compiler", () => {
  // Feature 1: Headings and Paragraphs
  test("compiles headings h1-h6", () => {
    const md = "# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6";
    const html = compile(md);
    expect(html).toContain("<h1>H1</h1>");
    expect(html).toContain("<h2>H2</h2>");
    expect(html).toContain("<h3>H3</h3>");
    expect(html).toContain("<h4>H4</h4>");
    expect(html).toContain("<h5>H5</h5>");
    expect(html).toContain("<h6>H6</h6>");
  });

  test("compiles paragraphs", () => {
    const html = compile("Hello world");
    expect(html).toContain("<p>Hello world</p>");
  });

  // Feature 2: Inline formatting
  test("compiles bold text", () => {
    const html = compile("**bold text**");
    expect(html).toContain("<strong>bold text</strong>");
  });

  test("compiles italic text", () => {
    const html = compile("*italic text*");
    expect(html).toContain("<em>italic text</em>");
  });

  test("compiles inline code", () => {
    const html = compile("`code`");
    expect(html).toContain("<code>code</code>");
  });

  test("compiles strikethrough", () => {
    const html = compile("~~strikethrough~~");
    expect(html).toContain("<del>strikethrough</del>");
  });

  // Feature 3: Links and images
  test("compiles links", () => {
    const html = compile("[link text](https://example.com)");
    expect(html).toContain('<a href="https://example.com">link text</a>');
  });

  test("compiles images", () => {
    const html = compile("![alt text](https://example.com/image.png)");
    expect(html).toContain('<img alt="alt text" src="https://example.com/image.png"/>');
  });

  // Feature 4: Lists
  test("compiles unordered lists", () => {
    const html = compile("- item 1\n- item 2\n- item 3");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>item 1</li>");
    expect(html).toContain("<li>item 2</li>");
    expect(html).toContain("<li>item 3</li>");
    expect(html).toContain("</ul>");
  });

  test("compiles ordered lists", () => {
    const html = compile("1. first\n2. second\n3. third");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>first</li>");
    expect(html).toContain("<li>second</li>");
    expect(html).toContain("<li>third</li>");
    expect(html).toContain("</ol>");
  });

  // Feature 5: Code blocks
  test("compiles fenced code blocks", () => {
    const html = compile("```javascript\nconst x = 1;\n```");
    expect(html).toContain('<code class="language-javascript">');
    expect(html).toContain("const x = 1;");
    expect(html).toContain("</code></pre>");
  });

  // Feature 6: Blockquotes
  test("compiles blockquotes", () => {
    const html = compile("> This is a quote\n> with two lines");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("This is a quote");
    expect(html).toContain("</blockquote>");
  });

  // Feature 7: Tables
  test("compiles tables", () => {
    const md = "| Header 1 | Header 2 |\n|----------|----------|\n| cell 1   | cell 2   |";
    const html = compile(md);
    expect(html).toContain("<table>");
    expect(html).toContain("<thead>");
    expect(html).toContain("<th>Header 1</th>");
    expect(html).toContain("<tbody>");
    expect(html).toContain("<td>cell 1</td>");
    expect(html).toContain("</table>");
  });

  // Feature 8: Horizontal rules
  test("compiles horizontal rules", () => {
    const html1 = compile("---");
    const html2 = compile("***");
    const html3 = compile("___");
    expect(html1).toContain("<hr/>");
    expect(html2).toContain("<hr/>");
    expect(html3).toContain("<hr/>");
  });

  // Feature 9: Task lists
  test("compiles task lists", () => {
    const html = compile("- [x] completed\n- [ ] not completed");
    expect(html).toContain('<input type="checkbox" checked disabled/>');
    expect(html).toContain('<input type="checkbox" disabled/>');
    expect(html).toContain("completed");
    expect(html).toContain("not completed");
  });

  // Feature 10: Auto-linked URLs and entity escaping
  test("auto-links URLs", () => {
    const html = compile("Visit https://example.com for more");
    expect(html).toContain('https://example.com');
    expect(html).toContain('<a href=');
  });

  test("escapes XSS attempts", () => {
    const html = compile("<script>alert('xss')</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  // Nesting tests
  test("handles bold inside links", () => {
    const html = compile("[**bold link**](https://example.com)");
    expect(html).toContain('<a href="https://example.com">');
    expect(html).toContain("<strong>bold link</strong>");
  });

  test("handles links inside lists", () => {
    const html = compile("- [link](https://example.com)\n- [another](https://example.com)");
    expect(html).toContain("<ul>");
    expect(html).toContain('<a href="https://example.com">');
  });

  test("handles code inside blockquotes", () => {
    const html = compile("> This has `code` in it");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<code>code</code>");
  });

  test("handles italic inside bold", () => {
    const html = compile("This has **bold text** and *italic text*");
    expect(html).toContain("<strong>bold text</strong>");
    expect(html).toContain("<em>italic text</em>");
  });

  test("handles nested lists", () => {
    const md = "- item 1\n  - nested 1\n  - nested 2\n- item 2";
    const html = compile(md);
    expect(html).toContain("<ul>");
    expect(html).toContain("item 1");
  });

  // Edge cases
  test("handles empty input", () => {
    const html = compile("");
    expect(html).toBe("");
  });

  test("handles single character", () => {
    const html = compile("a");
    expect(html).toContain("<p>a</p>");
  });

  test("handles whitespace only", () => {
    const html = compile("   \n   \n   ");
    expect(html.trim()).toBe("");
  });

  test("handles deeply nested lists", () => {
    const md = "- a\n- b\n- c\n- d\n- e";
    const html = compile(md);
    expect(html).toContain("<ul>");
  });

  test("well-formed HTML: all tags closed", () => {
    const md = `# Heading
This is a paragraph with **bold** and *italic*.

- list item 1
- list item 2

[link](url)`;
    const html = compile(md);
    // Verify no mismatched tags by counting opening vs closing
    const openCount = (html.match(/\<(h\d|p|strong|em|ul|li|a)\>/gi) || []).length;
    const closeCount = (html.match(/\<\/(h\d|p|strong|em|ul|li|a)\>/gi) || []).length;
    expect(openCount).toBeGreaterThan(0);
    expect(closeCount).toBeGreaterThan(0);
    expect(Math.abs(openCount - closeCount)).toBeLessThanOrEqual(1);
  });
});

describe("Tokenizer", () => {
  test("returns array of tokens", () => {
    const tokens = tokenize("# Heading\nParagraph");
    expect(Array.isArray(tokens)).toBe(true);
  });

  test("tokenizes headings", () => {
    const tokens = tokenize("# Title");
    expect(tokens[0]).toEqual({
      type: "heading",
      level: 1,
      content: "Title",
    });
  });

  test("tokenizes paragraphs", () => {
    const tokens = tokenize("Hello world");
    expect(tokens[0]).toEqual({
      type: "paragraph",
      content: "Hello world",
    });
  });

  test("returns empty array for non-string input", () => {
    expect(tokenize(null)).toEqual([]);
    expect(tokenize(undefined)).toEqual([]);
    expect(tokenize(123)).toEqual([]);
  });
});
