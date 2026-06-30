#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const registryPath = path.join(root, 'publish/prompt-templates.js');
const outPath = path.join(root, 'publish/prompt-templates-inline.js');
const registryText = fs.readFileSync(registryPath, 'utf8');
const itemPattern = /\{\s*id:\s*'([^']+)'[\s\S]*?file:\s*'([^']+)'[\s\S]*?\}/g;
const templates = {};
let match;

while ((match = itemPattern.exec(registryText))) {
  const [, id, file] = match;
  const fullPath = path.join(root, 'publish', file);
  if (!fs.existsSync(fullPath)) continue;
  templates[id] = fs.readFileSync(fullPath, 'utf8');
}

const content = `window.GameModules = window.GameModules || {};

(function inlinePromptTemplates() {
  const templates = ${JSON.stringify(templates, null, 2)};
  const registry = window.GameModules.promptTemplates;
  if (!registry) return;
  registry.inline = { ...(registry.inline || {}), ...templates };
})();
`;

fs.writeFileSync(outPath, content, 'utf8');
console.log(path.relative(root, outPath).replace(/\\/g, '/'));
