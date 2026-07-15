const fs = require('fs');
const path = require('path');

const targets = [
  path.join('publish', 'assets', 'body-figures'),
  path.join('mobile', 'android-webview-shell', 'app', 'src', 'main', 'assets', 'publish', 'assets', 'body-figures'),
];

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function normalizeSlash(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
}

function collectMeta(root, relative = '', out = {}) {
  const dir = path.join(root, relative);
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const childRelative = normalizeSlash(path.join(relative, entry.name));
    const metaFile = path.join(root, childRelative, 'meta.json');
    if (fs.existsSync(metaFile)) {
      out[childRelative] = readJson(metaFile, {});
    }
    collectMeta(root, childRelative, out);
  }
  return out;
}

function writeStaticIndex(root) {
  const index = readJson(path.join(root, 'index.json'), { figures: [] });
  const metas = collectMeta(root);
  const body = [
    'window.GameModules = window.GameModules || {};',
    'window.GameModules.bodyFigureStatic = {',
    `  index: ${JSON.stringify(index, null, 2)},`,
    `  metas: ${JSON.stringify(metas, null, 2)}`,
    '};',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(root, 'index.js'), body, 'utf8');
  return { root, figureCount: Array.isArray(index.figures) ? index.figures.length : 0, metaCount: Object.keys(metas).length };
}

for (const target of targets) {
  const result = writeStaticIndex(target);
  console.log(`[body-figure-static] ${result.root}: ${result.figureCount} figures, ${result.metaCount} metas`);
}
