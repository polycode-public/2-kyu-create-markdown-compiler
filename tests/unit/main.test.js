// SPDX-License-Identifier: MIT
// Copyright (C) 2025-2026 Polycode Limited
import { describe, test, expect } from "vitest";
import { main, getIdentity, name, version, description, tokenize, compile } from "../../src/lib/main.js";

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

describe("Tokenizer", () => {
  test("returns array of token objects", () => {
    const result = tokenize("# Hello");
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("type");
  });

  test("handles empty input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize(null)).toEqual([]);
  });

  test("handles whitespace-only input", () => {
    expect(tokenize("   ")).toEqual([]);
    expect(tokenize("\n\n")).toEqual([]);
  });

  test("tokenizes headings", () => {
    const result = tokenize("# H1\n## H2");
    expect(result).toEqual([
      { type: "heading", level: 1, content: "H1" },
      { type: "heading", level: 2, content: "H2" },
    ]);
  });

  test("tokenizes paragraphs", () => {
    const result = tokenize("Hello world");
    expect(result[0]).toEqual({ type: "paragraph", content: "Hello world" });
  });
});

describe("Compiler - Headings", () => {
  test("compiles h1", () => {
    expect(compile("# Hi")).toBe("<h1>Hi</h1>");
  });

  test("compiles h2-h6", () => {
    expect(compile("## H2")).toBe("<h2>H2</h2>");
    expect(compile("### H3")).toBe("<h3>H3</h3>");
    expect(compile("#### H4")).toBe("<h4>H4</h4>");
    expect(compile("##### H5")).toBe("<h5>H5</h5>");
    expect(compile("###### H6")).toBe("<h6>H6</h6>");
  });

  test("strips extra whitespace from headings", () => {
    expect(compile("#   Heading   ")).toContain("<h1>Heading</h1>");
  });
});

describe("Compiler - Paragraphs", () => {
  test("compiles simple paragraph", () => {
    expect(compile("Hello world")).toBe("<p>Hello world</p>");
  });

  test("wraps multiple paragraphs", () => {
    const html = compile("First\nSecond");
    expect(html).toContain("<p>First</p>");
    expect(html).toContain("<p>Second</p>");
  });

  test("handles empty input", () => {
    expect(compile("")).toBe("");
  });

  test("handles whitespace-only input", () => {
    expect(compile("   \n\n  ")).toBe("");
  });
});

describe("Compiler - Inline Bold", () => {
  test("compiles bold text", () => {
    const html = compile("**bold**");
    expect(html).toContain("<strong>bold</strong>");
  });

  test("escapes bold content", () => {
    const html = compile("**<script>**");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("bold in paragraph", () => {
    const html = compile("This is **bold** text");
    expect(html).toContain("<p>This is <strong>bold</strong> text</p>");
  });
});

describe("Compiler - Inline Italic", () => {
  test("compiles italic text", () => {
    const html = compile("*italic*");
    expect(html).toContain("<em>italic</em>");
  });

  test("italic in paragraph", () => {
    const html = compile("This is *italic* text");
    expect(html).toContain("<p>This is <em>italic</em> text</p>");
  });
});

describe("Compiler - Inline Code", () => {
  test("compiles inline code", () => {
    const html = compile("`code`");
    expect(html).toContain("<code>code</code>");
  });

  test("escapes code content", () => {
    const html = compile("`<tag>`");
    expect(html).toContain("&lt;tag&gt;");
  });

  test("code in paragraph", () => {
    const html = compile("Use `console.log()` in JS");
    expect(html).toContain("<code>console.log()</code>");
  });
});

describe("Compiler - Inline Strikethrough", () => {
  test("compiles strikethrough text", () => {
    const html = compile("~~deleted~~");
    expect(html).toContain("<del>deleted</del>");
  });

  test("strikethrough in paragraph", () => {
    const html = compile("This is ~~old~~ new");
    expect(html).toContain("<del>old</del>");
  });
});

describe("Compiler - XSS Safety", () => {
  test("escapes script tags", () => {
    const html = compile("<script>alert('xss')</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;/script&gt;");
  });

  test("escapes HTML entities", () => {
    const html = compile("<div class=\"test\">");
    expect(html).toContain("&lt;div");
    expect(html).toContain("&quot;");
    expect(html).toContain("&gt;");
  });

  test("escapes ampersand", () => {
    const html = compile("AT&T");
    expect(html).toContain("AT&amp;T");
  });

  test("escapes in headings", () => {
    const html = compile("# <script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("escapes in bold", () => {
    const html = compile("**<img>**");
    expect(html).not.toContain("<img>");
    expect(html).toContain("&lt;img&gt;");
  });
});

describe("Compiler - Mixed Inline Formatting", () => {
  test("bold and italic together", () => {
    const html = compile("**bold** and *italic*");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
  });

  test("code and bold together", () => {
    const html = compile("`code` and **bold**");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain("<strong>bold</strong>");
  });

  test("multiple formatting types in one paragraph", () => {
    const html = compile("**bold** `code` *italic* ~~strike~~");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<del>strike</del>");
  });
});

describe("Compiler - Well-Formed HTML", () => {
  test("all opening tags have closing tags", () => {
    const html = compile("# Heading\n**bold** *italic* `code` ~~strike~~\nParagraph");
    const openTags = (html.match(/<[^/][^>]*>/g) || []).length;
    const closeTags = (html.match(/<\/[^>]*>/g) || []).length;
    expect(openTags).toBe(closeTags);
  });

  test("self-closing tags handled correctly", () => {
    const html = compile("# Test");
    expect(html).not.toContain("/>");
  });
});
