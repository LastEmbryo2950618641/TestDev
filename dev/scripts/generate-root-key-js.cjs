const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const pairs = [
  {
    txt: path.join(root, 'deepseek_key.txt'),
    js: path.join(root, 'deepseek_key.js'),
    getter: 'deepseekKey',
  },
  {
    txt: path.join(root, 'pixatart_key.txt'),
    js: path.join(root, 'pixatart_key.js'),
    getter: 'pixaiKey',
  },
];

function escapeJsString(value = '') {
  return JSON.stringify(String(value).replace(/^\uFEFF/, '').trim());
}

function buildModuleBody(keyName, value) {
  return [
    'window.GameModules = window.GameModules || {};',
    'window.GameModules.generatedKeys = window.GameModules.generatedKeys || {};',
    `window.GameModules.generatedKeys.${keyName} = ${escapeJsString(value)};`,
    '',
  ].join('\n');
}

function main() {
  for (const pair of pairs) {
    const value = fs.existsSync(pair.txt) ? fs.readFileSync(pair.txt, 'utf8') : '';
    fs.writeFileSync(pair.js, buildModuleBody(pair.getter, value), 'utf8');
    console.log(`[OK] ${path.relative(root, pair.txt)} -> ${path.relative(root, pair.js)}`);
  }
}

main();
