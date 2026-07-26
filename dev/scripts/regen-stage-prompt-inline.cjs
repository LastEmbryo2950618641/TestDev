#!/usr/bin/env node
/**
 * Regenerate Stage1–4 prompt inline .js from matching .md files.
 * Usage: node dev/scripts/regen-stage-prompt-inline.cjs
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const dir = path.join(root, 'publish/prompts/推演引擎');
const ids = [
  ['stage1-guided-query', 'inference-stage1-guided-query'],
  ['stage2-scene-anchor', 'inference-stage2-scene-anchor'],
  ['stage3-narration', 'inference-stage3-narration'],
  ['stage4-settlement-window', 'inference-stage4-settlement-window'],
];

function escapeJsString(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '\\n');
}

for (const [file, inlineId] of ids) {
  const mdPath = path.join(dir, `${file}.md`);
  const jsPath = path.join(dir, `${file}.js`);
  const md = fs.readFileSync(mdPath, 'utf8');
  const out = [
    `// GENERATED FROM publish/prompts/推演引擎/${file}.md; DO NOT EDIT.`,
    'window.GameModules = window.GameModules || {};',
    'window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};',
    'window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};',
    `window.GameModules.promptTemplates.inline["${inlineId}"] = "${escapeJsString(md)}";`,
    '',
  ].join('\n');
  fs.writeFileSync(jsPath, out, 'utf8');
  console.log('generated', path.relative(root, jsPath), `mdChars=${md.length}`);
}
