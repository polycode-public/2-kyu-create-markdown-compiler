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
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("heading");
    expect(result[0].level).toBe(1);
    expect(result[0].content).toBe("H1");
    expect(result[1].type).toBe("heading");
    expect(result[1].level).toBe(2);
    expect(result[1].content).toBe("H2");
  });

  test("tokenizes paragraphs", () => {
    const result = tokenize("Hello world");
    expect(result[0].type).toBe("paragraph");
    expect(result[0].content).toBe("Hello world");
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

describe("Compiler - Links", () => {
  test("compiles basic link", () => {
    const html = compile("[text](https://a.b)");
    expect(html).toContain('<a href="https://a.b">text</a>');
  });

  test("escapes URL in href attribute", () => {
    const html = compile('[text](javascript:alert("xss"))');
    expect(html).toContain("&quot;");
    expect(html).not.toContain('alert("xss")');
  });

  test("escapes quote injection in URL", () => {
    const html = compile('[text](https://a.b" onclick="alert)');
    expect(html).toContain("&quot;");
  });

  test("link text can contain bold", () => {
    const html = compile("[**bold link**](https://a.b)");
    expect(html).toContain("<strong>bold link</strong>");
  });

  test("link text can contain italic", () => {
    const html = compile("[*italic link*](https://a.b)");
    expect(html).toContain("<em>italic link</em>");
  });

  test("link in paragraph", () => {
    const html = compile("Check [this](https://example.com) out");
    expect(html).toContain('<p>Check <a href="https://example.com">this</a> out</p>');
  });

  test("multiple links in one paragraph", () => {
    const html = compile("[first](https://a.b) and [second](https://c.d)");
    expect(html).toContain('<a href="https://a.b">first</a>');
    expect(html).toContain('<a href="https://c.d">second</a>');
  });

  test("link with empty text", () => {
    const html = compile("[](https://a.b)");
    expect(html).toContain('<a href="https://a.b"></a>');
  });
});

describe("Compiler - Images", () => {
  test("compiles basic image", () => {
    const html = compile("![alt](/i.png)");
    expect(html).toContain('<img src="/i.png" alt="alt"/>');
  });

  test("escapes alt text", () => {
    const html = compile('![<img src="x">](/i.png)');
    expect(html).toContain("&lt;img");
    expect(html).not.toContain('<img src="x">');
  });

  test("escapes src URL", () => {
    const html = compile('![alt](javascript:alert("xss"))');
    expect(html).toContain("&quot;");
    expect(html).not.toContain('alert("xss")');
  });

  test("image with quote in alt", () => {
    const html = compile('![quote "test"](/i.png)');
    expect(html).toContain("&quot;");
  });

  test("self-closing image tag", () => {
    const html = compile("![alt](/i.png)");
    expect(html).toContain("/>");
  });

  test("image in paragraph", () => {
    const html = compile("An image: ![alt](/i.png)");
    expect(html).toContain('<p>An image: <img src="/i.png" alt="alt"/></p>');
  });

  test("multiple images in one paragraph", () => {
    const html = compile("![alt1](/i1.png) ![alt2](/i2.png)");
    expect(html).toContain('<img src="/i1.png" alt="alt1"/>');
    expect(html).toContain('<img src="/i2.png" alt="alt2"/>');
  });

  test("image with empty alt", () => {
    const html = compile("![](/i.png)");
    expect(html).toContain('<img src="/i.png" alt=""/>');
  });
});

describe("Compiler - Links + Images XSS", () => {
  test("javascript: protocol in link href is present but quote-escaped", () => {
    const html = compile("[click](javascript:alert)");
    expect(html).toContain("javascript:alert");
    expect(html).toContain('<a href="javascript:alert">');
  });

  test("javascript: protocol in image src is present but quote-escaped", () => {
    const html = compile("![x](javascript:alert)");
    expect(html).toContain("javascript:alert");
    expect(html).toContain('<img src="javascript:alert"');
  });

  test("attribute breakout in link URL is prevented by quote escaping", () => {
    const html = compile('[text](https://a.b" data-xss="1)');
    expect(html).toContain("&quot;");
  });

  test("attribute breakout in image src is prevented by quote escaping", () => {
    const html = compile('![text](https://a.b" onerror="alert)');
    expect(html).toContain("&quot;");
  });
});

describe("Compiler - Nested Formatting in Links", () => {
  test("bold and italic inside link", () => {
    const html = compile("[**bold** *italic*](https://a.b)");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
  });

  test("code inside link text", () => {
    const html = compile("[`code` link](https://a.b)");
    expect(html).toContain("<code>code</code>");
  });

  test("strikethrough inside link", () => {
    const html = compile("[~~old~~ new](https://a.b)");
    expect(html).toContain("<del>old</del>");
  });
});

describe("Tokenizer - Links and Images", () => {
  test("tokenizes link in paragraph", () => {
    const result = tokenize("[text](https://a.b)");
    expect(result[0].type).toBe("paragraph");
    expect(result[0].inline).toBeDefined();
    const linkToken = result[0].inline.find(t => t.type === "link");
    expect(linkToken).toBeDefined();
    expect(linkToken.url).toBe("https://a.b");
  });

  test("tokenizes image in paragraph", () => {
    const result = tokenize("![alt](/i.png)");
    expect(result[0].type).toBe("paragraph");
    expect(result[0].inline).toBeDefined();
    const imageToken = result[0].inline.find(t => t.type === "image");
    expect(imageToken).toBeDefined();
    expect(imageToken.src).toBe("/i.png");
  });

  test("tokenizes link with formatting in heading", () => {
    const result = tokenize("# [**bold**](url)");
    expect(result[0].type).toBe("heading");
    expect(result[0].inline).toBeDefined();
  });
});
