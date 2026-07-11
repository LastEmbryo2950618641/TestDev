const fs = require('fs');
const path = require('path');

const root = process.cwd();
const target = path.join(root, 'docs', 'architecture', 'browser-direct-launch-boundary-2026-07-12.md');
const text = fs.readFileSync(target, 'utf8');

const requiredPhrases = [
  'web index.html ready',
  'file:// direct double-click ready',
  'http://127.0.0.1:8000/',
  'publish/prompt-templates.js',
  'publish/skill-loader.js',
  'publish/platform/keys/source.js',
  'publish/platform/body-figure/source.js',
  'file://',
  'fetch(...)',
];

const missing = requiredPhrases.filter((item) => !text.includes(item));

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'browser-direct-launch-boundary-doc',
  stage: 'browser-direct-launch-boundary-doc-verify',
  ok: missing.length === 0,
  file: 'docs/architecture/browser-direct-launch-boundary-2026-07-12.md',
  missing,
}, null, 2)}\n`);
