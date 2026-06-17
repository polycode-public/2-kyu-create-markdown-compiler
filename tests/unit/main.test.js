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

describe("Unordered Lists", () => {
  test("compile simple unordered list", () => {
    const html = compile("- a\n- b");
    expect(html).toBe("<ul><li>a</li><li>b</li></ul>");
  });

  test("compile unordered list with asterisk", () => {
    const html = compile("* a\n* b");
    expect(html).toBe("<ul><li>a</li><li>b</li></ul>");
  });

  test("compile unordered list with plus", () => {
    const html = compile("+ a\n+ b");
    expect(html).toBe("<ul><li>a</li><li>b</li></ul>");
  });

  test("unordered list items with inline formatting", () => {
    const html = compile("- **bold**\n- *italic*");
    expect(html).toContain("<ul>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
  });

  test("unordered list items with links", () => {
    const html = compile("- [link](https://example.com)\n- text");
    expect(html).toContain('<a href="https://example.com">link</a>');
  });
});

describe("Ordered Lists", () => {
  test("compile simple ordered list", () => {
    const html = compile("1. a\n2. b");
    expect(html).toBe("<ol><li>a</li><li>b</li></ol>");
  });

  test("ordered list with various numbers", () => {
    const html = compile("1. first\n2. second\n3. third");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>first</li>");
    expect(html).toContain("<li>second</li>");
    expect(html).toContain("<li>third</li>");
    expect(html).toContain("</ol>");
  });

  test("ordered list items with inline formatting", () => {
    const html = compile("1. **bold**\n2. `code`");
    expect(html).toContain("<ol>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<code>code</code>");
  });
});

describe("Nested Lists", () => {
  test("nested unordered in unordered", () => {
    const html = compile("- a\n  - b\n  - c\n- d");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>a<ul><li>b</li><li>c</li></ul></li>");
    expect(html).toContain("<li>d</li>");
  });

  test("nested ordered in unordered", () => {
    const html = compile("- a\n  1. b\n  2. c\n- d");
    expect(html).toContain("<ul>");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>a<ol>");
    expect(html).toContain("<li>b</li>");
    expect(html).toContain("<li>c</li>");
  });

  test("nested unordered in ordered", () => {
    const html = compile("1. a\n   - b\n   - c\n2. d");
    expect(html).toContain("<ol>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>a<ul>");
  });

  test("deeply nested lists", () => {
    const html = compile("- a\n  - b\n    - c\n  - d");
    expect(html).toContain("<li>a<ul>");
    expect(html).toContain("<li>b<ul>");
    expect(html).toContain("<li>c</li>");
  });
});

describe("Code Blocks", () => {
  test("compile fenced code block without language", () => {
    const html = compile("```\ncode\n```");
    expect(html).toBe("<pre><code>code</code></pre>");
  });

  test("compile fenced code block with language", () => {
    const html = compile("```js\nconst x = 1;\n```");
    expect(html).toBe('<pre><code class="language-js">const x = 1;</code></pre>');
  });

  test("code block escapes HTML", () => {
    const html = compile("```\n<script>alert('xss')</script>\n```");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  test("code block preserves whitespace", () => {
    const html = compile("```\n  indented\n    more\n```");
    expect(html).toContain("  indented");
    expect(html).toContain("    more");
  });

  test("code block with multiple lines", () => {
    const html = compile("```js\nline1\nline2\nline3\n```");
    expect(html).toBe('<pre><code class="language-js">line1\nline2\nline3</code></pre>');
  });
});

describe("Blockquotes", () => {
  test("compile simple blockquote", () => {
    const html = compile("> hi");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("hi");
    expect(html).toContain("</blockquote>");
  });

  test("compile blockquote with multiple lines", () => {
    const html = compile("> line 1\n> line 2");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("line 1");
    expect(html).toContain("line 2");
  });

  test("compile nested blockquote", () => {
    const html = compile("> outer\n> > inner");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("outer");
    expect(html).toContain("inner");
  });

  test("blockquote with triple nesting", () => {
    const html = compile("> level1\n> > level2\n> > > level3");
    expect(html).toContain("level1");
    expect(html).toContain("level2");
    expect(html).toContain("level3");
  });

  test("blockquote escapes HTML", () => {
    const html = compile("> <script>alert('xss')</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});

describe("Horizontal Rules", () => {
  test("compile horizontal rule with dashes", () => {
    const html = compile("---");
    expect(html).toBe("<hr/>");
  });

  test("compile horizontal rule with asterisks", () => {
    const html = compile("***");
    expect(html).toBe("<hr/>");
  });

  test("compile horizontal rule with underscores", () => {
    const html = compile("___");
    expect(html).toBe("<hr/>");
  });

  test("horizontal rule with more than 3 characters", () => {
    const html = compile("-----");
    expect(html).toBe("<hr/>");
  });

  test("horizontal rule between paragraphs", () => {
    const html = compile("Para 1\n\n---\n\nPara 2");
    expect(html).toBe("<p>Para 1</p><hr/><p>Para 2</p>");
  });

  test("horizontal rule with spaces around dashes", () => {
    const html = compile("  ---  ");
    expect(html).toBe("<hr/>");
  });
});

describe("Tables", () => {
  test("compile simple table with left and right alignment", () => {
    const html = compile("| Left | Right |\n|:-----|-----:|\n| A | B |");
    expect(html).toContain("<table>");
    expect(html).toContain("<thead>");
    expect(html).toContain("<tbody>");
    expect(html).toContain("</table>");
    expect(html).toContain('<th align="left">Left</th>');
    expect(html).toContain('<th align="right">Right</th>');
    expect(html).toContain('<td align="left">A</td>');
    expect(html).toContain('<td align="right">B</td>');
  });

  test("compile table with center alignment", () => {
    const html = compile("| Center |\n|:------:|\n| Value |");
    expect(html).toContain('<th align="center">Center</th>');
    expect(html).toContain('<td align="center">Value</td>');
  });

  test("compile table with multiple rows", () => {
    const html = compile("| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |");
    expect(html).toContain("<td>1</td>");
    expect(html).toContain("<td>2</td>");
    expect(html).toContain("<td>3</td>");
    expect(html).toContain("<td>4</td>");
  });

  test("table with inline formatting in cells", () => {
    const html = compile("| Format |\n|--------|\n| **bold** |\n| *italic* |");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
  });

  test("table with code in cells", () => {
    const html = compile("| Code |\n|------|\n| `x` |");
    expect(html).toContain("<code>x</code>");
  });

  test("table with links in cells", () => {
    const html = compile("| Link |\n|------|\n| [url](https://example.com) |");
    expect(html).toContain('<a href="https://example.com">url</a>');
  });

  test("table with no alignment specified", () => {
    const html = compile("| No | Alignment |\n|---|---|\n| A | B |");
    expect(html).toContain("<th>No</th>");
    expect(html).toContain("<th>Alignment</th>");
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

  test("code in blockquote", () => {
    const html = compile("> `code` in blockquote");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<code>code</code>");
  });

  test("blockquote with links", () => {
    const html = compile("> [link](https://example.com)");
    expect(html).toContain("<blockquote>");
    expect(html).toContain('<a href="https://example.com">link</a>');
  });
});
