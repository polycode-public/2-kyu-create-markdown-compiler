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

describe("Tokenization", () => {
  test("tokenize returns an array of token objects", () => {
    const tokens = tokenize("# Heading\n\nParagraph");
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0]).toHaveProperty("type");
    expect(tokens[0]).toHaveProperty("raw");
    expect(tokens[0]).toHaveProperty("content");
  });

  test("tokenize handles empty input", () => {
    const tokens = tokenize("");
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBe(0);
  });

  test("tokenize handles whitespace-only input", () => {
    const tokens = tokenize("   \n\n   ");
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBe(0);
  });
});

describe("Headings", () => {
  test("compile h1 heading", () => {
    const html = compile("# Hi");
    expect(html).toBe("<h1>Hi</h1>");
  });

  test("compile h2 heading", () => {
    const html = compile("## Subtitle");
    expect(html).toBe("<h2>Subtitle</h2>");
  });

  test("compile h3 heading", () => {
    const html = compile("### Section");
    expect(html).toBe("<h3>Section</h3>");
  });

  test("compile h4 heading", () => {
    const html = compile("#### Subsection");
    expect(html).toBe("<h4>Subsection</h4>");
  });

  test("compile h5 heading", () => {
    const html = compile("##### Minor");
    expect(html).toBe("<h5>Minor</h5>");
  });

  test("compile h6 heading", () => {
    const html = compile("###### Tiny");
    expect(html).toBe("<h6>Tiny</h6>");
  });
});

describe("Paragraphs", () => {
  test("compile simple paragraph", () => {
    const html = compile("Hello world");
    expect(html).toBe("<p>Hello world</p>");
  });

  test("compile multiple paragraphs", () => {
    const html = compile("First\n\nSecond");
    expect(html).toBe("<p>First</p><p>Second</p>");
  });

  test("compile paragraph with single character", () => {
    const html = compile("a");
    expect(html).toBe("<p>a</p>");
  });
});

describe("Bold Formatting", () => {
  test("compile bold text", () => {
    const html = compile("**b**");
    expect(html).toMatch(/<(strong|b)>b<\/(strong|b)>/);
  });

  test("compile bold in paragraph", () => {
    const html = compile("text **bold** more");
    expect(html).toBe("<p>text <strong>bold</strong> more</p>");
  });

  test("compile multiple bold", () => {
    const html = compile("**a** and **b**");
    expect(html).toBe("<p><strong>a</strong> and <strong>b</strong></p>");
  });
});

describe("Italic Formatting", () => {
  test("compile italic text", () => {
    const html = compile("*italic*");
    expect(html).toMatch(/<(em|i)>italic<\/(em|i)>/);
  });

  test("compile italic in paragraph", () => {
    const html = compile("text *italic* more");
    expect(html).toBe("<p>text <em>italic</em> more</p>");
  });
});

describe("Code Formatting", () => {
  test("compile inline code", () => {
    const html = compile("`code`");
    expect(html).toBe("<p><code>code</code></p>");
  });

  test("compile code in paragraph", () => {
    const html = compile("text `inline code` more");
    expect(html).toBe("<p>text <code>inline code</code> more</p>");
  });
});

describe("Strikethrough Formatting", () => {
  test("compile strikethrough text", () => {
    const html = compile("~~strike~~");
    expect(html).toBe("<p><del>strike</del></p>");
  });

  test("compile strikethrough in paragraph", () => {
    const html = compile("text ~~struck~~ more");
    expect(html).toBe("<p>text <del>struck</del> more</p>");
  });
});

describe("XSS Safety", () => {
  test("escape script tags in text", () => {
    const html = compile("<script>alert('xss')</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  test("escape less-than and greater-than", () => {
    const html = compile("a < b and c > d");
    expect(html).toContain("&lt;");
    expect(html).toContain("&gt;");
    expect(html).not.toContain("a < b");
    expect(html).not.toContain("c > d");
  });

  test("escape ampersand", () => {
    const html = compile("a & b");
    expect(html).toContain("&amp;");
    expect(html).not.toContain("a & b");
  });

  test("escape quotes", () => {
    const html = compile('text with "quotes"');
    expect(html).toContain("&quot;");
  });

  test("escape in inline code", () => {
    const html = compile("`<tag>`");
    expect(html).toContain("&lt;tag&gt;");
  });

  test("no executable tags after escape", () => {
    const html = compile("<img src=x onerror=alert('xss')>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});

describe("Links", () => {
  test("compile simple link", () => {
    const html = compile("[x](https://a.b)");
    expect(html).toBe('<p><a href="https://a.b">x</a></p>');
  });

  test("compile link in paragraph", () => {
    const html = compile("text [link](https://example.com) more");
    expect(html).toBe('<p>text <a href="https://example.com">link</a> more</p>');
  });

  test("escape URL in link href", () => {
    const html = compile('[click](javascript:alert("xss"))');
    expect(html).toContain("&quot;");
    expect(html).not.toContain('alert("xss")');
  });

  test("link text with inline formatting", () => {
    const html = compile("[**bold link**](https://example.com)");
    expect(html).toContain('<a href="https://example.com">');
    expect(html).toContain("<strong>bold link</strong>");
  });

  test("multiple links", () => {
    const html = compile("[link1](https://a.com) and [link2](https://b.com)");
    expect(html).toContain('<a href="https://a.com">link1</a>');
    expect(html).toContain('<a href="https://b.com">link2</a>');
  });
});

describe("Images", () => {
  test("compile simple image", () => {
    const html = compile("![alt](/i.png)");
    expect(html).toBe('<p><img src="/i.png" alt="alt"/></p>');
  });

  test("compile image in paragraph", () => {
    const html = compile("text ![img](https://example.com/pic.png) more");
    expect(html).toBe('<p>text <img src="https://example.com/pic.png" alt="img"/> more</p>');
  });

  test("escape src and alt in image", () => {
    const html = compile('![<script>](javascript:alert("xss"))');
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;");
    expect(html).not.toContain("<script>");
  });

  test("image with empty alt", () => {
    const html = compile("![](/img.png)");
    expect(html).toBe('<p><img src="/img.png" alt=""/></p>');
  });

  test("multiple images", () => {
    const html = compile("![a](/1.png) ![b](/2.png)");
    expect(html).toContain('<img src="/1.png" alt="a"/>');
    expect(html).toContain('<img src="/2.png" alt="b"/>');
  });
});

describe("Edge Cases", () => {
  test("handle empty input", () => {
    const html = compile("");
    expect(html).toBe("");
  });

  test("handle whitespace only", () => {
    const html = compile("   \n\n   ");
    expect(html).toBe("");
  });

  test("handle single character", () => {
    const html = compile("a");
    expect(html).toBe("<p>a</p>");
  });

  test("handle mixed formatting", () => {
    const html = compile("**bold *italic* text** and `code`");
    expect(html).toContain("<strong>");
    expect(html).toContain("<em>");
    expect(html).toContain("<code>");
  });

  test("handle newlines with blank lines", () => {
    const html = compile("para1\n\npara2");
    expect(html).toBe("<p>para1</p><p>para2</p>");
  });

  test("links and images together", () => {
    const html = compile("[link](https://example.com) ![img](/pic.png)");
    expect(html).toContain('<a href="https://example.com">link</a>');
    expect(html).toContain('<img src="/pic.png" alt="img"/>');
  });
});
