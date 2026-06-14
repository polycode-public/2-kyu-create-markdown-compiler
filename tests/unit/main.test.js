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

describe("Compiler - Unordered Lists", () => {
  test("compiles simple unordered list with dash", () => {
    const html = compile("- a\n- b");
    expect(html).toBe("<ul><li>a</li><li>b</li></ul>");
  });

  test("compiles unordered list with asterisk", () => {
    const html = compile("* item1\n* item2");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>item1</li>");
    expect(html).toContain("<li>item2</li>");
    expect(html).toContain("</ul>");
  });

  test("compiles unordered list with plus", () => {
    const html = compile("+ first\n+ second");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>first</li>");
    expect(html).toContain("<li>second</li>");
    expect(html).toContain("</ul>");
  });

  test("list items can contain bold formatting", () => {
    const html = compile("- **bold** item\n- normal");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<li><strong>bold</strong> item</li>");
  });

  test("list items can contain links", () => {
    const html = compile("- [link](https://a.b)\n- text");
    expect(html).toContain('<a href="https://a.b">link</a>');
  });

  test("list items can contain italic", () => {
    const html = compile("- *italic* text\n- normal");
    expect(html).toContain("<em>italic</em>");
  });

  test("list items can contain code", () => {
    const html = compile("- `code` item\n- text");
    expect(html).toContain("<code>code</code>");
  });

  test("list items with strikethrough", () => {
    const html = compile("- ~~old~~ new\n- item");
    expect(html).toContain("<del>old</del>");
  });
});

describe("Compiler - Ordered Lists", () => {
  test("compiles simple ordered list", () => {
    const html = compile("1. a\n2. b");
    expect(html).toBe("<ol><li>a</li><li>b</li></ol>");
  });

  test("compiles ordered list with any number", () => {
    const html = compile("1. first\n1. second\n1. third");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>first</li>");
    expect(html).toContain("<li>second</li>");
    expect(html).toContain("<li>third</li>");
    expect(html).toContain("</ol>");
  });

  test("ordered list items can contain bold", () => {
    const html = compile("1. **bold** item\n2. normal");
    expect(html).toContain("<strong>bold</strong>");
  });

  test("ordered list items can contain links", () => {
    const html = compile("1. [link](https://a.b)\n2. text");
    expect(html).toContain('<a href="https://a.b">link</a>');
  });

  test("ordered list items can contain inline formatting", () => {
    const html = compile("1. `code` and *italic*\n2. ~~strike~~");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<del>strike</del>");
  });
});

describe("Compiler - Nested Lists", () => {
  test("nested unordered list inside unordered list", () => {
    const html = compile("- a\n  - nested\n- b");
    expect(html).toContain("<li>a<ul><li>nested</li></ul></li>");
    expect(html).toContain("<li>b</li>");
  });

  test("nested ordered list inside unordered list", () => {
    const html = compile("- a\n  1. nested1\n  2. nested2\n- b");
    expect(html).toContain("<li>a<ol>");
    expect(html).toContain("<li>nested1</li>");
    expect(html).toContain("<li>nested2</li>");
    expect(html).toContain("</ol></li>");
  });

  test("nested unordered list inside ordered list", () => {
    const html = compile("1. a\n   - nested\n2. b");
    expect(html).toContain("<li>a<ul><li>nested</li></ul></li>");
    expect(html).toContain("<li>b</li>");
  });

  test("deeply nested lists", () => {
    const html = compile("- a\n  - b\n    - c\n  - d");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>a");
    expect(html).toContain("<li>b");
    expect(html).toContain("<li>c</li>");
    expect(html).toContain("<li>d</li>");
  });

  test("nested list items can contain formatting", () => {
    const html = compile("- a\n  - **bold** nested\n- b");
    expect(html).toContain("<strong>bold</strong>");
  });

  test("multiple nested items", () => {
    const html = compile("- a\n  - n1\n  - n2\n  - n3\n- b");
    expect(html).toContain("<li>a<ul><li>n1</li><li>n2</li><li>n3</li></ul></li>");
  });
});

describe("Tokenizer - Lists", () => {
  test("tokenizes unordered list", () => {
    const result = tokenize("- a\n- b");
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("unordered-list");
    expect(result[0].items).toHaveLength(2);
    expect(result[0].items[0].content).toBe("a");
    expect(result[0].items[1].content).toBe("b");
  });

  test("tokenizes ordered list", () => {
    const result = tokenize("1. a\n2. b");
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("ordered-list");
    expect(result[0].items).toHaveLength(2);
    expect(result[0].items[0].content).toBe("a");
  });

  test("tokenizes nested list", () => {
    const result = tokenize("- a\n  - nested");
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("unordered-list");
    expect(result[0].items[0].children).toHaveLength(1);
    expect(result[0].items[0].children[0].type).toBe("unordered-list");
  });

  test("list items have inline tokens", () => {
    const result = tokenize("- **bold**\n- text");
    expect(result[0].items[0].inline).toBeDefined();
    expect(result[0].items[0].inline.some(t => t.type === "bold")).toBe(true);
  });
});

describe("Compiler - Lists with Multiple Paragraphs", () => {
  test("list followed by paragraph", () => {
    const html = compile("- item\nParagraph");
    expect(html).toContain("<ul><li>item</li></ul>");
    expect(html).toContain("<p>Paragraph</p>");
  });

  test("paragraph followed by list", () => {
    const html = compile("Paragraph\n- item");
    expect(html).toContain("<p>Paragraph</p>");
    expect(html).toContain("<ul><li>item</li></ul>");
  });

  test("heading followed by list", () => {
    const html = compile("# Heading\n- item");
    expect(html).toContain("<h1>Heading</h1>");
    expect(html).toContain("<ul><li>item</li></ul>");
  });
});

describe("Compiler - Mixed List Types", () => {
  test("two separate unordered lists", () => {
    const html = compile("- a\n- b\n\n- c\n- d");
    const ulMatches = html.match(/<ul>/g);
    expect(ulMatches).toHaveLength(2);
  });

  test("unordered list and ordered list are separate", () => {
    const html = compile("- a\n- b\n\n1. c\n2. d");
    expect(html).toContain("<ul>");
    expect(html).toContain("<ol>");
  });
});

describe("Compiler - Lists - XSS Safety", () => {
  test("escapes HTML in list items", () => {
    const html = compile("- <script>alert</script>\n- text");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("escapes HTML in nested list items", () => {
    const html = compile("- a\n  - <img src=x>\n- b");
    expect(html).not.toContain("<img src=x>");
    expect(html).toContain("&lt;img");
  });

  test("escapes URLs in list item links", () => {
    const html = compile('- [text](javascript:alert("xss"))');
    expect(html).toContain("&quot;");
    expect(html).not.toContain('alert("xss")');
  });
});

describe("Compiler - Code Blocks", () => {
  test("compiles fenced code block with language", () => {
    const html = compile("```js\ncode\n```");
    expect(html).toContain('<pre><code class="language-js">');
    expect(html).toContain("code");
    expect(html).toContain("</code></pre>");
  });

  test("code block content is escaped", () => {
    const html = compile("```\n<script>alert('xss')</script>\n```");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;/script&gt;");
  });

  test("code block content is NOT inline-formatted", () => {
    const html = compile("```\n**bold** *italic* `code`\n```");
    expect(html).toContain("**bold**");
    expect(html).toContain("*italic*");
    expect(html).toContain("`code`");
    expect(html).not.toContain("<strong>");
    expect(html).not.toContain("<em>");
  });

  test("code block without language", () => {
    const html = compile("```\ncode here\n```");
    expect(html).toContain("<pre><code>");
    expect(html).toContain("code here");
    expect(html).toContain("</code></pre>");
  });

  test("code block with multiple lines", () => {
    const html = compile("```js\nline1\nline2\nline3\n```");
    expect(html).toContain("line1");
    expect(html).toContain("line2");
    expect(html).toContain("line3");
  });

  test("code block with language class includes language name", () => {
    const html = compile("```python\nprint('hi')\n```");
    expect(html).toContain('class="language-python"');
  });

  test("language name is escaped", () => {
    const html = compile("```<script>\ncode\n```");
    expect(html).not.toContain('class="language-<script>');
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("Compiler - Blockquotes", () => {
  test("compiles simple blockquote", () => {
    const html = compile("> hello");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("hello");
    expect(html).toContain("</blockquote>");
  });

  test("blockquote wraps content in paragraph", () => {
    const html = compile("> hi");
    expect(html).toContain("<blockquote><p>hi</p></blockquote>");
  });

  test("blockquote with inline formatting", () => {
    const html = compile("> **bold** and *italic*");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("</blockquote>");
  });

  test("blockquote with link", () => {
    const html = compile("> [link](https://example.com)");
    expect(html).toContain("<blockquote>");
    expect(html).toContain('<a href="https://example.com">link</a>');
    expect(html).toContain("</blockquote>");
  });

  test("nested blockquote", () => {
    const html = compile("> > nested");
    expect(html).toContain("<blockquote><blockquote>");
    expect(html).toContain("nested");
    expect(html).toContain("</blockquote></blockquote>");
  });

  test("deeply nested blockquote", () => {
    const html = compile("> > > deep");
    expect(html).toContain("<blockquote>");
    const count = (html.match(/<blockquote>/g) || []).length;
    expect(count).toBe(3);
  });

  test("blockquote content is HTML-escaped", () => {
    const html = compile("> <script>alert('xss')</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("blockquote with code inside", () => {
    const html = compile("> Use `console.log()` here");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<code>console.log()</code>");
    expect(html).toContain("</blockquote>");
  });

  test("blockquote with multiple lines", () => {
    const html = compile("> line1\n> line2");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("line1");
    expect(html).toContain("line2");
    expect(html).toContain("</blockquote>");
  });

  test("blockquote followed by paragraph", () => {
    const html = compile("> quote\ntext");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("quote");
    expect(html).toContain("</blockquote>");
    expect(html).toContain("<p>text</p>");
  });
});

describe("Compiler - Code Blocks + Blockquotes", () => {
  test("code block inside blockquote", () => {
    const html = compile("> ```js\n> code\n> ```");
    expect(html).toContain("<blockquote>");
    expect(html).toContain('<pre><code class="language-js">');
    expect(html).toContain("code");
    expect(html).toContain("</blockquote>");
  });

  test("blockquote inside code block is literal", () => {
    const html = compile("```\n> blockquote\n```");
    expect(html).toContain("<pre><code>");
    expect(html).toContain("&gt; blockquote");
    expect(html).not.toContain("<blockquote>");
  });
});
