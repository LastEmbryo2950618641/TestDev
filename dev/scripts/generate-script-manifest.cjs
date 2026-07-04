#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const indexPath = path.join(root, 'publish', 'index.html');
const bootDir = path.join(root, 'publish', 'boot');
const scriptsJsonPath = path.join(bootDir, 'scripts.json');
const manifestPath = path.join(bootDir, 'script-manifest.js');

function classify(url) {
  const p = String(url || '').replace(/^\.\//, '').toLowerCase();
  if (/^https?:\/\//.test(p)) return 'core';
  // 手机激活 / 身份补全 / 玩家卡生成在 core 启动后就会调用，须与 __game-core.js 一致随 core 加载
  if (/^prompt-fallback\.js$|^prompt-templates\.js$|^prompt-skills\.js$|^prompt-sections\.js$/.test(p)) return 'core';
  if (/(^|\/)wechat|player-wechat-setup|real-world-agent-wechat|prompts\/wechat|wechat-album-photo/.test(p)) return 'wechat';
  if (/^(company-|boss-|calendar-|faction-|skills-|skill-|known-profession-|taobao-|prompt-actions|token-stats|alert-log|faction-membership|role-card-json-app\/)/.test(p)) return 'apps';
  if (/^prompt\.js$|^real-world-prompt\.js$|^prompts\/materials\/|^prompts\/picture_generate\/|^inference-prompts-runtime\.js$/.test(p)) return 'prompts';
  if (/^real-world-|^org-territory|^inference\/|^story-agent-context\.js$|^assets\/data\/real-world|^game-premise\.js$|^update\/(territory|org-|membership|character-schedule|org-status)/.test(p)) return 'gameplay';
  return 'core';
}

function extractScriptUrls(html) {
  const urls = [];
  const re = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const src = match[1].trim();
    if (!src) continue;
    if (/alpinejs/i.test(src)) continue;
    if (/(^|\/)game\.js$/i.test(src)) continue;
    if (/(^|\/)boot\//i.test(src)) continue;
    urls.push(src);
  }
  return urls;
}

function buildManifest(urls) {
  const chunks = { core: [], gameplay: [], wechat: [], apps: [], prompts: [] };
  urls.forEach((url) => {
    const bucket = classify(url);
    chunks[bucket].push(url);
  });
  return chunks;
}

function writeManifest(chunks, total) {
  const body = `window.GameScriptManifest = ${JSON.stringify({ chunks, generatedAt: new Date().toISOString(), total }, null, 2)};

window.GameScriptManifest.classify = ${classify.toString()};
`;
  fs.writeFileSync(manifestPath, body, 'utf8');
}

function main() {
  if (!fs.existsSync(indexPath)) {
    console.error('[FAIL] missing', indexPath);
    process.exit(1);
  }
  fs.mkdirSync(bootDir, { recursive: true });
  const html = fs.readFileSync(indexPath, 'utf8');
  let urls = extractScriptUrls(html);
  if (urls.length < 10 && fs.existsSync(scriptsJsonPath)) {
    urls = JSON.parse(fs.readFileSync(scriptsJsonPath, 'utf8'));
    console.log('[INFO] index 已是 boot 模式，从 scripts.json 读取脚本列表');
  }
  if (!urls.length) {
    console.error('[FAIL] 未找到可打包脚本');
    process.exit(1);
  }
  const chunks = buildManifest(urls);
  fs.writeFileSync(scriptsJsonPath, `${JSON.stringify(urls, null, 2)}\n`, 'utf8');
  writeManifest(chunks, urls.length);
  console.log('[OK] scripts.json ->', scriptsJsonPath);
  console.log('[OK] script-manifest.js ->', manifestPath);
  Object.entries(chunks).forEach(([key, list]) => console.log(`  ${key}: ${list.length}`));
  console.log(`  total: ${urls.length}`);
}

main();
