#!/usr/bin/env node
/**
 * 从 __chunk-*.js 按模块标记全量还原 publish/ 源码。
 * 不依赖关键字搜索，按 bundle 内 `;// ---- path ----` 边界逐块提取。
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publishDir = path.join(root, 'publish');
const chunkFiles = [
  'publish/__chunk-core.js',
  'publish/__chunk-onboarding.js',
  'publish/__chunk-gameplay.js',
  'publish/__chunk-wechat.js',
  'publish/__chunk-apps.js',
  'publish/__chunk-prompts.js',
].map((p) => path.join(root, p));

const MARKER_RE = /^;\/\/ ---- ([\w./-]+\.js) ----$/gm;

function loadIndexScriptAllowlist() {
  const indexPath = path.join(publishDir, 'index.html');
  if (!fs.existsSync(indexPath)) return new Set();
  const html = fs.readFileSync(indexPath, 'utf8');
  const allow = new Set();
  for (const m of html.matchAll(/<script\s+src="([^"]+\.js)"/g)) {
    const src = m[1];
    if (!src.startsWith('http')) allow.add(src.replace(/^\.\//, ''));
  }
  return allow;
}

function isSafePublishPath(publishPath) {
  if (!publishPath.endsWith('.js')) return false;
  if (publishPath.includes('..')) return false;
  if (/[\u4e00-\u9fff]/.test(publishPath)) return false;
  return true;
}

/** bundle 内路径 -> publish/ 实际路径 */
function bundlePathToPublish(relPath) {
  const explicit = {
    'core/config.js': 'config.js',
    'core/metrics.js': 'metrics.js',
    'core/storage.js': 'storage.js',
    'core/debug.js': 'debug.js',
    'core/json-utils.js': 'json-utils.js',
    'core/token-stats.js': 'token-stats.js',
    'core/alert-log.js': 'alert-log.js',
    'ai/ai.js': 'ai.js',
    'ai/ai-provider.js': 'ai-provider.js',
    'ai/ai-provider-dzmm.js': 'ai-provider-dzmm.js',
    'ai/ai-provider-deepseek.js': 'ai-provider-deepseek.js',
    'ai/ai-request.js': 'ai-request.js',
    'ai/ai-lexicon.js': 'ai-lexicon.js',
    'database/sqlite-save.js': 'sqlite-save.js',
    'database/sqlite-world.js': 'sqlite-world.js',
    'database/sqlite-worldline.js': 'sqlite-worldline.js',
    'database/sqlite-memory.js': 'sqlite-memory.js',
    'database/sqlite-real-world-log.js': 'sqlite-real-world-log.js',
    'features/settings/settings-actions.js': 'settings-actions.js',
  };
  if (explicit[relPath]) return explicit[relPath];
  if (relPath.startsWith('core/')) return relPath.slice('core/'.length);
  if (relPath.startsWith('ai/')) return relPath.slice('ai/'.length);
  if (relPath.startsWith('database/')) return relPath.slice('database/'.length);
  if (relPath.startsWith('features/settings/')) return relPath.slice('features/settings/'.length);
  return relPath;
}

function hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function parseChunkModules(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const markers = [];
  let m;
  MARKER_RE.lastIndex = 0;
  while ((m = MARKER_RE.exec(text)) !== null) {
    markers.push({ relPath: m[1], index: m.index, headerEnd: m.index + m[0].length });
  }
  const modules = [];
  for (let i = 0; i < markers.length; i += 1) {
    const start = markers[i].headerEnd;
    const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
    let body = text.slice(start, end);
    body = body.replace(/^\r?\n/, '').replace(/\s+$/, '');
    if (body.endsWith('\n;')) body = body.slice(0, -2);
    modules.push({ relPath: markers[i].relPath, body, source: path.basename(filePath) });
  }
  return modules;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

const allModules = new Map();
const sources = new Map();

for (const chunkPath of chunkFiles) {
  if (!fs.existsSync(chunkPath)) {
    console.warn(`[SKIP] missing chunk: ${chunkPath}`);
    continue;
  }
  for (const mod of parseChunkModules(chunkPath)) {
    const publishPath = bundlePathToPublish(mod.relPath);
    const prev = allModules.get(publishPath);
    if (prev && prev.hash !== hash(mod.body)) {
      console.warn(`[CONFLICT] ${publishPath}: ${prev.source} vs ${mod.source} (using ${mod.source})`);
    }
    allModules.set(publishPath, { ...mod, publishPath, hash: hash(mod.body) });
    sources.set(publishPath, mod.source);
  }
}

const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const backupDir = path.join(root, '_backup', `bundle-sync-${stamp}`);
ensureDir(backupDir);

const indexAllowlist = loadIndexScriptAllowlist();

const report = {
  timestamp: new Date().toISOString(),
  backupDir,
  written: [],
  unchanged: [],
  newFiles: [],
  skipped: [],
  conflicts: [],
  totalModules: allModules.size,
};

for (const [publishPath, mod] of allModules.entries()) {
  if (!isSafePublishPath(publishPath)) {
    report.skipped.push({ path: publishPath, reason: 'unsafe-path', from: mod.source });
    continue;
  }
  const outPath = path.join(publishDir, publishPath);
  const prevExists = fs.existsSync(outPath);
  const allowed = prevExists || indexAllowlist.has(publishPath) || process.argv.includes('--all-missing');
  if (!allowed) {
    report.skipped.push({ path: publishPath, reason: 'not-in-index-and-missing', from: mod.source });
    continue;
  }
  ensureDir(path.dirname(outPath));
  const next = `${mod.body}\n`;
  const prev = prevExists ? fs.readFileSync(outPath, 'utf8') : null;
  if (prev === next) {
    report.unchanged.push(publishPath);
    continue;
  }
  if (prevExists) {
    const bakPath = path.join(backupDir, publishPath);
    ensureDir(path.dirname(bakPath));
    fs.copyFileSync(outPath, bakPath);
    report.written.push({ path: publishPath, from: mod.source, chars: mod.body.length });
  } else {
    report.newFiles.push({ path: publishPath, from: mod.source, chars: mod.body.length });
  }
  fs.writeFileSync(outPath, next, 'utf8');
}

const reportPath = path.join(backupDir, 'sync-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log(`\n=== Bundle 全量同步完成 ===`);
console.log(`模块总数: ${report.totalModules}`);
console.log(`已写入: ${report.written.length}`);
console.log(`新增: ${report.newFiles.length}`);
console.log(`未变化: ${report.unchanged.length}`);
console.log(`跳过: ${report.skipped.length}`);
console.log(`备份目录: ${backupDir}`);
console.log(`报告: ${reportPath}`);

if (report.written.length) {
  console.log('\n已更新文件（前 30）:');
  report.written.slice(0, 30).forEach((item) => console.log(`  - ${item.path} (${item.from})`));
  if (report.written.length > 30) console.log(`  ... 另有 ${report.written.length - 30} 个`);
}
