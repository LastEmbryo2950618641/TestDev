#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const id = process.argv[2] || 'wechat-chat-reply';
const mdPath = path.join(root, 'publish/prompts', `${id}.md`);
const jsPath = path.join(root, 'publish/prompts', `${id}.js`);
const md = fs.readFileSync(mdPath, 'utf8');
function escapeJsString(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '\\n');
}
const out = [
  `// GENERATED FROM publish/prompts/${id}.md; DO NOT EDIT.`,
  'window.GameModules = window.GameModules || {};',
  'window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};',
  'window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};',
  `window.GameModules.promptTemplates.inline["${id}"] = "${escapeJsString(md)}";`,
  '',
].join('\n');
fs.writeFileSync(jsPath, out);
console.log('generated', path.relative(root, jsPath));
