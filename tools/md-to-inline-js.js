#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function usage() {
  console.error('Usage: node tools/md-to-inline-js.js <path/to/file.md>');
  process.exit(1);
}

function toCamelName(file) {
  const base = path.basename(file, path.extname(file));
  return base.replace(/[^a-zA-Z0-9]+(.)/g, (_, ch) => ch.toUpperCase()).replace(/^[^a-zA-Z_$]+/, '') || 'inlineMd';
}

const input = process.argv[2];
if (!input) usage();

const mdPath = path.resolve(process.cwd(), input);
if (!fs.existsSync(mdPath)) throw new Error(`Markdown file not found: ${mdPath}`);
if (path.extname(mdPath).toLowerCase() !== '.md') throw new Error(`Only .md files are supported: ${mdPath}`);

const text = fs.readFileSync(mdPath, 'utf8');
const name = toCamelName(mdPath);
const jsPath = path.join(path.dirname(mdPath), `${path.basename(mdPath, '.md')}.js`);
const relMd = path.basename(mdPath);
const content = `window.GameModules = window.GameModules || {};
window.GameModules.inlineMd = window.GameModules.inlineMd || {};
window.GameModules.inlineMd.${name} = ${JSON.stringify(text)};
window.GameModules.inlineMdSources = window.GameModules.inlineMdSources || {};
window.GameModules.inlineMdSources.${name} = ${JSON.stringify(relMd)};
`;

fs.writeFileSync(jsPath, content, 'utf8');
console.log(`Generated ${jsPath}`);
