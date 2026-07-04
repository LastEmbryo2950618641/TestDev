#!/usr/bin/env node
/**
 * Regenerate publish/prompts/*.js inline snapshots from matching .md files.
 * Usage: node dev/scripts/generate-prompt-inline.cjs [id ...]
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const promptsDir = path.join(root, 'publish/prompts');

function escapeJsString(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '\\n');
}

function mdToInlineJs(id, mdPath) {
  const md = fs.readFileSync(mdPath, 'utf8');
  const rel = path.relative(root, mdPath).replace(/\\/g, '/');
  return [
    `// GENERATED FROM ${rel}; DO NOT EDIT.`,
    'window.GameModules = window.GameModules || {};',
    'window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};',
    'window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};',
    `window.GameModules.promptTemplates.inline["${id}"] = "${escapeJsString(md)}";`,
    '',
  ].join('\n');
}

function defaultIds() {
  return fs.readdirSync(promptsDir)
    .filter((name) => name.startsWith('character-profile-part') && name.endsWith('.md'))
    .map((name) => name.replace(/\.md$/, ''))
    .filter((id) => {
      const md = fs.readFileSync(path.join(promptsDir, `${id}.md`), 'utf8');
      return md.includes('application/json');
    })
    .sort();
}

const ids = process.argv.slice(2).length ? process.argv.slice(2) : defaultIds();
let ok = 0;
let skip = 0;

for (const id of ids) {
  const mdPath = path.join(promptsDir, `${id}.md`);
  const jsPath = path.join(promptsDir, `${id}.js`);
  if (!fs.existsSync(mdPath)) {
    console.warn('skip (missing md):', id);
    skip += 1;
    continue;
  }
  const md = fs.readFileSync(mdPath, 'utf8');
  if (!md.includes('application/json')) {
    console.warn('skip (not JSON md):', id);
    skip += 1;
    continue;
  }
  fs.writeFileSync(jsPath, mdToInlineJs(id, mdPath), 'utf8');
  console.log('generated:', path.relative(root, jsPath));
  ok += 1;
}

console.log(`done: ${ok} generated, ${skip} skipped`);
