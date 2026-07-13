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

function syncPenStyles() {
  const dir = path.join(publish, 'prompts', 'pen_style');
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
    syncMdInline(path.join(dir, name));
  }
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

function syncPromptTemplateScripts() {
  const context = { window: { GameModules: {} }, document: { currentScript: { src: '' }, baseURI: '' }, location: { origin: '', href: '' } };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(readText(path.join(publish, 'prompt-templates.js')), context, { filename: 'publish/prompt-templates.js' });
  const templates = context.window.GameModules.promptTemplates?.items || [];
  templates.forEach((item) => {
    const rel = String(item.file || '');
    if (!rel.endsWith('.md')) return;
    const mdPath = path.join(publish, rel);
    if (!fs.existsSync(mdPath)) return;
    const jsPath = mdPath.replace(/\.md$/u, '.js');
    const sourceRel = path.relative(root, mdPath).replace(/\\/g, '/');
    writeText(jsPath, [
      `// GENERATED FROM ${sourceRel}; DO NOT EDIT.`,
      'window.GameModules = window.GameModules || {};',
      'window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};',
      'window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};',
      `window.GameModules.promptTemplates.inline[${JSON.stringify(item.id)}] = ${JSON.stringify(readText(mdPath))};`,
    ].join('\n'));
  });
}

function syncInferencePromptRuntime() {
  const files = [
    'prompts/推演引擎/stage1-guided-query.js',
    'prompts/推演引擎/stage2-scene-anchor.js',
    'prompts/推演引擎/stage3-narration.js',
    'prompts/推演引擎/stage4-settlement-window.js',
    'prompts/推演引擎/stage5-profile-gate.js',
    'prompts/推演引擎/stage5-body-profile-patch.js',
    'prompts/推演引擎/stage5-dressed-profile-patch.js',
    'prompts/推演引擎/init/intimacy-body-init-prompt.js',
    'prompts/推演引擎/update/generic-update-prompt.js',
    'prompts/推演引擎/update/emotion-update-prompt.js',
    'prompts/推演引擎/update/feeling-update-prompt.js',
    'prompts/推演引擎/update/vital-update-prompt.js',
    'prompts/推演引擎/update/role-card-update-prompt.js',
    'prompts/推演引擎/update/relationship-update-prompt.js',
    'prompts/推演引擎/update/sexual-experience-update-prompt.js',
    'prompts/推演引擎/update/sexual-history-update-prompt.js',
    'prompts/推演引擎/update/body-status-update-prompt.js',
    'prompts/推演引擎/update/wearing-state-update-prompt.js',
    'prompts/推演引擎/update/item-update-prompt.js',
    'prompts/推演引擎/update/faction-structure-update-prompt.js',
    'prompts/推演引擎/update/faction-overview-update-prompt.js',
    'prompts/推演引擎/update/map-update-prompt.js',
    'prompts/推演引擎/update/system-update-prompt.js',
  ];
  const parts = files.map((rel) => {
    const file = path.join(publish, rel);
    if (!fs.existsSync(file)) throw new Error(`Missing inference prompt script: ${rel}`);
    return `// ${rel}\n${readText(file)}`;
  });
  writeText(path.join(publish, 'inference-prompts-runtime.js'), [
    '// GENERATED FROM publish/prompts/推演引擎/**/*.js; DO NOT EDIT.',
    ...parts,
  ].join('\n\n'));
}

syncSkills();
syncDefaultProfile();
syncPenStyles();
syncLoreCache();
syncPromptTemplateScripts();
syncInferencePromptRuntime();
console.log('inline assets synced');
