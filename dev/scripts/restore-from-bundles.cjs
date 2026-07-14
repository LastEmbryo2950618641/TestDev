#!/usr/bin/env node
/**
 * 全量从 publish/__*.js 恢复源文件，不做关键字筛选。
 * - 所有 ;// ---- path ---- 模块段
 * - 所有内嵌 SKILL.md（含 skills/ 与 prompts/）
 * - promptTemplates.inline 对应 .md
 * - 同步 flat 启动路径别名（config.js 等）
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const publishDir = path.join(root, 'publish');
const reportPath = path.join(root, 'dev', 'restore-from-bundles-report.json');

const BUNDLE_ORDER = [
  '__chunk-onboarding.js',
  '__chunk-core.js',
  '__chunk-wechat.js',
  '__chunk-prompts.js',
  '__chunk-gameplay.js',
  '__chunk-apps.js',
  '__game-core.js',
];

const FLAT_ALIASES = {
  'core/config.js': 'config.js',
  'ai/ai-provider.js': 'ai-provider.js',
  'ai/ai-provider-dzmm.js': 'ai-provider-dzmm.js',
  'ai/ai-provider-deepseek.js': 'ai-provider-deepseek.js',
  'ai/ai-request.js': 'ai-request.js',
  'core/metrics.js': 'metrics.js',
  'database/sqlite-save.js': 'platform/storage/sqlite/save.js',
  'database/sqlite-world.js': 'platform/storage/sqlite/world.js',
  'database/sqlite-worldline.js': 'platform/storage/sqlite/worldline.js',
  'database/sqlite-memory.js': 'platform/storage/sqlite/memory.js',
  'core/json-utils.js': 'json-utils.js',
  'core/storage.js': 'storage.js',
  'ai/ai.js': 'ai.js',
  'ai/ai-lexicon.js': 'ai-lexicon.js',
  'core/debug.js': 'debug.js',
  'features/settings/settings-actions.js': 'settings-actions.js',
  'database/sqlite-real-world-log.js': 'platform/storage/sqlite/real-world-log.js',
  'core/token-stats.js': 'token-stats.js',
};

function unescapeJsString(raw) {
  return String(raw || '')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function readBundles() {
  const found = fs.readdirSync(publishDir).filter((f) => /^__/.test(f) && f.endsWith('.js'));
  const ordered = BUNDLE_ORDER.filter((f) => found.includes(f));
  const rest = found.filter((f) => !ordered.includes(f)).sort();
  return [...ordered, ...rest];
}

function extractSegments(source, bundleName) {
  const segments = new Map();
  const marks = [...source.matchAll(/^;\/\/ ---- (.+?) ----\r?$/gm)];
  for (let i = 0; i < marks.length; i += 1) {
    const rel = marks[i][1];
    const start = marks[i].index;
    const end = i + 1 < marks.length ? marks[i + 1].index : source.length;
    const body = source.slice(start, end).replace(/^;\/\/ ---- .+? ----\r?\n?/, '').trimEnd();
    segments.set(rel, { body: body ? `${body}\n` : '', bundle: bundleName });
  }
  return segments;
}

function extractSkillMdMaps(source) {
  const map = new Map();
  const re = /"([^"]+\/SKILL\.md)": "((?:\\.|[^"\\])*)"/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    map.set(match[1], unescapeJsString(match[2]));
  }
  return map;
}

function extractInlinePrompts(source) {
  const map = new Map();
  const re = /promptTemplates\.inline\["([^"]+)"\]\s*=\s*"((?:\\.|[^"\\])*)"/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    map.set(match[1], unescapeJsString(match[2]));
  }
  return map;
}

function parseTemplateFileMap(itemsSource) {
  const map = new Map();
  const re = /\{\s*id:\s*'([^']+)'[\s\S]*?file:\s*'([^']+)'/g;
  let match;
  while ((match = re.exec(itemsSource)) !== null) {
    map.set(match[1], match[2]);
  }
  return map;
}

function extractTemplateFromSkill(skillMd) {
  const m = String(skillMd || '').match(/````md\n([\s\S]*?)````/);
  return m ? `${m[1].trimEnd()}\n` : '';
}

function parseSkillFrontmatter(skillMd) {
  const m = String(skillMd || '').match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const meta = {};
  m[1].split('\n').forEach((line) => {
    const idx = line.indexOf(':');
    if (idx <= 0) return;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  });
  return meta;
}

function skillTargetPath(relSkillPath) {
  const normalized = relSkillPath.replace(/\\/g, '/');
  if (normalized.startsWith('prompts/')) return path.join(publishDir, normalized);
  return path.join(publishDir, 'skills', normalized);
}

function writeFile(relPath, content, stats, kind) {
  const full = path.join(publishDir, relPath.replace(/\//g, path.sep));
  const existed = fs.existsSync(full);
  const prev = existed ? fs.readFileSync(full, 'utf8') : null;
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  if (!existed) stats.created += 1;
  else if (prev !== content) stats.updated += 1;
  else stats.unchanged += 1;
  stats.items.push({ kind, path: relPath, action: !existed ? 'created' : prev !== content ? 'updated' : 'unchanged' });
}

function writeSkillFile(relSkillPath, skillMd, stats) {
  const full = skillTargetPath(relSkillPath);
  const rel = path.relative(publishDir, full).replace(/\\/g, '/');
  const existed = fs.existsSync(full);
  const prev = existed ? fs.readFileSync(full, 'utf8') : null;
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, skillMd, 'utf8');
  if (!existed) stats.created += 1;
  else if (prev !== skillMd) stats.updated += 1;
  else stats.unchanged += 1;
  stats.items.push({ kind: 'skill', path: rel, action: !existed ? 'created' : prev !== skillMd ? 'updated' : 'unchanged' });

  const meta = parseSkillFrontmatter(skillMd);
  const templateBody = extractTemplateFromSkill(skillMd);
  if (meta.templateFile && templateBody) {
    writeFile(meta.templateFile, templateBody, stats, 'template-from-skill');
  }
}

function main() {
  const bundles = readBundles();
  if (!bundles.length) {
    console.error('[FAIL] 未找到 publish/__*.js');
    process.exit(1);
  }

  const segments = new Map();
  const skillMaps = new Map();
  const inlinePrompts = new Map();

  bundles.forEach((bundleName) => {
    const source = fs.readFileSync(path.join(publishDir, bundleName), 'utf8');
    extractSegments(source, bundleName).forEach((value, key) => segments.set(key, value));
    extractSkillMdMaps(source).forEach((value, key) => skillMaps.set(key, value));
    extractInlinePrompts(source).forEach((value, key) => inlinePrompts.set(key, value));
  });

  const stats = { created: 0, updated: 0, unchanged: 0, items: [] };

  // 1) 全量模块段
  segments.forEach((entry, rel) => {
    writeFile(rel, entry.body, stats, 'module');
  });

  // 2) 全量 SKILL.md
  skillMaps.forEach((skillMd, rel) => {
    writeSkillFile(rel, skillMd, stats);
  });

  // 3) inline prompt -> .md
  const templateItems = segments.get('prompt-templates.js')?.body || '';
  const templateFileMap = parseTemplateFileMap(templateItems);
  inlinePrompts.forEach((body, id) => {
    const file = templateFileMap.get(id);
    if (file) writeFile(file, `${body.trimEnd()}\n`, stats, 'template-inline');
  });

  // 4) flat 别名同步（boot/scripts.json 仍用扁平路径）
  Object.entries(FLAT_ALIASES).forEach(([organized, flat]) => {
    const entry = segments.get(organized);
    if (entry) writeFile(flat, entry.body, stats, 'flat-alias');
  });

  // 5) skills/manifest.json（来自 skillDocsInline manifest）
  const skillDocsSeg = segments.get('skill-docs-inline.js')?.body || '';
  const manifestMatch = skillDocsSeg.match(/manifest:\s*\[([\s\S]*?)\]/);
  if (manifestMatch) {
    const files = [...manifestMatch[1].matchAll(/"([^"]+\/SKILL\.md)"/g)].map((m) => m[1]);
    const skillsOnly = files.filter((f) => !f.startsWith('prompts/'));
    if (skillsOnly.length) {
      writeFile('skills/manifest.json', `${JSON.stringify(skillsOnly, null, 2)}\n`, stats, 'skills-manifest');
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    bundlesScanned: bundles,
    totals: {
      moduleSegments: segments.size,
      skillFiles: skillMaps.size,
      inlinePrompts: inlinePrompts.size,
      flatAliases: Object.keys(FLAT_ALIASES).length,
      created: stats.created,
      updated: stats.updated,
      unchanged: stats.unchanged,
    },
    missingBeforeRestore: [...segments.keys()].filter((rel) => {
      const full = path.join(publishDir, rel.replace(/\//g, path.sep));
      return !fs.existsSync(full);
    }),
    items: stats.items,
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('[OK] bundles scanned:', bundles.join(', '));
  console.log('[OK] module segments:', segments.size);
  console.log('[OK] SKILL.md entries:', skillMaps.size);
  console.log('[OK] inline prompts:', inlinePrompts.size);
  console.log(`[OK] files: created=${stats.created} updated=${stats.updated} unchanged=${stats.unchanged}`);
  console.log('[OK] report ->', reportPath);
}

main();
