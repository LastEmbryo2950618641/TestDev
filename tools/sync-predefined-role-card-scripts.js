#!/usr/bin/env node
/**
 * 扫描预设角色卡目录，自动同步 boot/scripts.json 并重建 script-manifest.js。
 *
 * 用法：
 *   node tools/sync-predefined-role-card-scripts.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  roleCardDataScripts,
} = require('./update-predefined-from-export');

const ROOT = path.resolve(__dirname, '..');
const PUBLISH_SCRIPTS_JSON = path.join(ROOT, 'publish', 'boot', 'scripts.json');
const GENERATE_MANIFEST = path.join(ROOT, 'dev', 'scripts', 'generate-script-manifest.cjs');
const SYNC_ANDROID_ASSETS = path.join(ROOT, 'dev', 'scripts', 'sync-android-assets.cjs');
const ROLE_CARD_ANCHOR = 'predefined-role-card-support/triplet-essential-preference-layers.js';

function stripBom(text = '') {
  return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

function readJson(file) {
  return JSON.parse(stripBom(fs.readFileSync(file, 'utf8')));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function isRoleCardScript(file = '') {
  return /^predefined-role-cards\/.+\.js$/.test(String(file || '').trim());
}

function syncScriptsJson(scriptsJsonPath, roleCardScripts) {
  const entries = readJson(scriptsJsonPath);
  const filtered = entries.filter((entry) => !isRoleCardScript(entry));
  const anchorIndex = filtered.indexOf(ROLE_CARD_ANCHOR);
  if (anchorIndex < 0) {
    throw new Error(`未在 ${scriptsJsonPath} 中找到 ${ROLE_CARD_ANCHOR}。`);
  }
  const next = [
    ...filtered.slice(0, anchorIndex),
    ...roleCardScripts,
    ...filtered.slice(anchorIndex),
  ];
  writeJson(scriptsJsonPath, next);
  return next;
}

function syncPredefinedRoleCardScripts() {
  const roleCardScripts = roleCardDataScripts(path.join(ROOT, 'publish', 'predefined-role-cards'));
  if (!roleCardScripts.length) {
    throw new Error('未扫描到任何预设角色卡脚本。');
  }
  const scripts = syncScriptsJson(PUBLISH_SCRIPTS_JSON, roleCardScripts);
  execFileSync(process.execPath, [GENERATE_MANIFEST], { cwd: ROOT, stdio: 'inherit' });
  execFileSync(process.execPath, [SYNC_ANDROID_ASSETS], { cwd: ROOT, stdio: 'inherit' });
  return scripts;
}

function main() {
  syncPredefinedRoleCardScripts();
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err?.message || err);
    process.exit(1);
  }
}

module.exports = {
  isRoleCardScript,
  syncPredefinedRoleCardScripts,
  syncScriptsJson,
};
