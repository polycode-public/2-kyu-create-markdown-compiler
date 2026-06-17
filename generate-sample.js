#!/usr/bin/env node
import { compile } from './src/lib/main.js';

const markdown = `# Markdown Compiler Demo

This is a **bold** statement with *italic* text and \`code\`.

## Links and Images

Check out [GitHub](https://github.com) for more information.

![Sample Image](https://example.com/image.png)

## Mixed Formatting

You can have [**bold links**](https://example.com) and ~~strikethrough~~ text.

Multiple paragraphs work too.

And this is another paragraph with \`inline code\` examples.`;

const html = compile(markdown);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Compiler Sample</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
    }
    h1 { font-size: 2em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    p {
      margin: 0 0 16px 0;
    }
    code {
      background: #f6f8fa;
      padding: 0.2em 0.4em;
      margin: 0;
      font-size: 85%;
      border-radius: 3px;
      font-family: 'Courier New', Courier, monospace;
    }
    strong {
      font-weight: 600;
    }
    em {
      font-style: italic;
    }
    a {
      color: #0366d6;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    del {
      color: #6a737d;
      text-decoration: line-through;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      margin: 16px 0;
    }
  </style>
</head>
<body>
${html}
</body>
</html>`;

console.log(fullHtml);
