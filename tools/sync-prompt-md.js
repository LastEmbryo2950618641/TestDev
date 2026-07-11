#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function usage() {
  console.error('Usage: node tools/sync-prompt-md.js <md-file> --kind template|update|init --id <id> [--template <templateKey>] [--out <file>]');
  process.exit(1);
}

const args = process.argv.slice(2);
const source = args.shift();
if (!source) usage();
const opts = {};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i];
  const value = args[i + 1];
  if (!key || !key.startsWith('--') || value === undefined) usage();
  opts[key.slice(2)] = value;
}
if (!opts.kind || !opts.id) usage();

const root = path.resolve(__dirname, '..');
const sourcePath = path.resolve(root, source);
const text = fs.readFileSync(sourcePath, 'utf8');
const literal = JSON.stringify(text);
const rel = path.relative(root, sourcePath).replace(/\\/g, '/');
const header = `// GENERATED FROM ${rel}; DO NOT EDIT.\nwindow.GameModules = window.GameModules || {};\n`;
let output = '';
if (opts.kind === 'template') {
  output = `${header}window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};\nwindow.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};\nwindow.GameModules.promptTemplates.inline[${JSON.stringify(opts.id)}] = ${literal};\n`;
} else if (opts.kind === 'update') {
  output = `${header}window.GameModules.updateRegistry?.registerPrompt?.(${JSON.stringify(opts.id)}, ${literal});\n`;
} else if (opts.kind === 'init') {
  const templateKey = opts.template || opts.id;
  output = `${header}window.GameModules.initPromptSources = window.GameModules.initPromptSources || {};\nwindow.GameModules.initPromptSources[${JSON.stringify(opts.id)}] = { prompt: ${literal}, templateKey: ${JSON.stringify(templateKey)} };\n`;
} else {
  usage();
}
const out = opts.out ? path.resolve(root, opts.out) : sourcePath.replace(/\.md$/u, '.js');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, output, 'utf8');
console.log(path.relative(root, out).replace(/\\/g, '/'));
