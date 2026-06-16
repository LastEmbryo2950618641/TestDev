const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publish = path.join(root, 'publish');

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function writeText(file, content) {
  fs.writeFileSync(file, `${content.replace(/\s*$/, '')}\n`, 'utf8');
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function js(value) {
  return JSON.stringify(value, null, 2);
}

function compactJs(value) {
  return JSON.stringify(value);
}

function syncSkills() {
  const manifestPath = path.join(publish, 'skills', 'manifest.json');
  const manifest = readJson(manifestPath);
  const files = {};
  for (const item of manifest) {
    const rel = String(item).replace(/^skills\//, '');
    files[rel] = readText(path.join(publish, 'skills', rel));
  }
  writeText(path.join(publish, 'skill-docs-inline.js'), [
    'window.GameModules = window.GameModules || {};',
    '',
    'window.GameModules.skillDocsInline = {',
    `  manifest: ${js(manifest.map((item) => String(item).replace(/^skills\//, '')))},`,
    `  files: ${js(files)},`,
    '};',
  ].join('\n'));
}

function syncPromptTemplates() {
  const registryPath = path.join(publish, 'prompt-templates.js');
  const source = readText(registryPath);
  const itemMatches = [...source.matchAll(/\{ id: '([^']+)'[\s\S]*?file: '([^']+)'/g)];
  const templates = {};
  for (const [, id, file] of itemMatches) {
    templates[id] = readText(path.join(publish, file));
  }
  writeText(path.join(publish, 'prompt-templates-inline.js'), [
    'window.GameModules = window.GameModules || {};',
    '',
    '(function inlinePromptTemplates() {',
    `  const templates = ${js(templates)};`,
    '  const registry = window.GameModules.promptTemplates;',
    '  if (!registry) return;',
    '  registry.inline = { ...(registry.inline || {}), ...templates };',
    '})();',
  ].join('\n'));
}

function syncDefaultProfile() {
  const candidates = [
    path.join(publish, 'config', 'default-existing-profile.json'),
    path.join(publish, 'default-existing-profile.json'),
  ];
  const source = candidates.find((file) => fs.existsSync(file));
  if (!source) return;
  const data = readJson(source);
  writeText(path.join(publish, 'default-existing-profile-inline.js'), [
    'window.GameModules = window.GameModules || {};',
    '',
    `window.GameModules.defaultExistingProfile = ${js(data)};`,
  ].join('\n'));
}

function syncLoreCache() {
  const dir = path.join(publish, 'lore-cache');
  if (!fs.existsSync(dir)) return;
  const data = {};
  for (const name of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    data[name] = readJson(path.join(dir, name));
  }
  writeText(path.join(publish, 'lore-cache-data.js'), [
    'window.GameData = window.GameData || {};',
    `window.GameData.loreCache = ${compactJs(data)};`,
  ].join('\n'));
}

syncSkills();
syncPromptTemplates();
syncDefaultProfile();
syncLoreCache();
console.log('inline assets synced');
