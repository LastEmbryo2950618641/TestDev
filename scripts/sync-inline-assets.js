const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

function readExistingPromptTemplates(file) {
  const context = { window: { GameModules: { promptTemplates: {} } } };
  try {
    vm.runInNewContext(readText(file), context, { filename: file });
    return context.window.GameModules.promptTemplates.inline || {};
  } catch (err) {
    console.warn(`read existing inline prompts failed: ${err.message}`);
    return {};
  }
}

function syncPromptTemplates() {
  const registryPath = path.join(publish, 'prompt-templates.js');
  const context = { window: { GameModules: {} }, document: { currentScript: { src: '' }, baseURI: '' }, location: { origin: '', href: '' } };
  context.window.GameModules.cache = { enabled: () => false };
  vm.runInNewContext(readText(registryPath), context, { filename: registryPath });
  const items = context.window.GameModules.promptTemplates?.items || [];
  const inlinePath = path.join(publish, 'prompt-templates-inline.js');
  const existing = fs.existsSync(inlinePath) ? readExistingPromptTemplates(inlinePath) : {};
  const templates = {};
  for (const item of items) {
    const full = path.join(publish, item.file || '');
    if (fs.existsSync(full)) templates[item.id] = readText(full);
    else if (existing[item.id]) templates[item.id] = existing[item.id];
    else console.warn(`missing prompt template: ${item.id} -> ${item.file}`);
  }
  writeText(inlinePath, [
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

function toCamelName(file) {
  const base = path.basename(file, path.extname(file));
  return base.replace(/[^a-zA-Z0-9]+(.)/g, (_, ch) => ch.toUpperCase()).replace(/^[^a-zA-Z_$]+/, '') || 'inlineMd';
}

function syncMdInline(file) {
  if (!fs.existsSync(file)) return;
  const name = toCamelName(file);
  const jsPath = path.join(path.dirname(file), `${path.basename(file, '.md')}.js`);
  writeText(jsPath, [
    'window.GameModules = window.GameModules || {};',
    'window.GameModules.inlineMd = window.GameModules.inlineMd || {};',
    `window.GameModules.inlineMd.${name} = ${JSON.stringify(readText(file))};`,
    'window.GameModules.inlineMdSources = window.GameModules.inlineMdSources || {};',
    `window.GameModules.inlineMdSources.${name} = ${JSON.stringify(path.basename(file))};`,
  ].join('\n'));
}

function syncDefaultProfile() {
  syncMdInline(path.join(publish, 'config', 'default-existing-profile.md'));
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
