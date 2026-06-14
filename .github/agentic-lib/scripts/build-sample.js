#!/usr/bin/env node
// Build the sample.html from sample.md
import { compile } from '../../../src/lib/main.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const markdown = readFileSync('docs/examples/sample.md', 'utf8');
const html = compile(markdown);
mkdirSync(dirname('docs/examples/sample.html'), { recursive: true });
writeFileSync('docs/examples/sample.html', html);
console.log('Generated docs/examples/sample.html');
