#!/usr/bin/env node
/**
 * 将导出的角色卡 JSON 写成预定义角色卡资源。
 *
 * 用法：
 *   node tools/update-predefined-from-export.js <export.json>
 *
 * 输入支持三种结构：
 *   1. { "characters": [{ "name": "刘思琪", "profile": {...}, ... }] }
 *   2. [{ "name": "刘思琪", ... }]
 *   3. { "name": "刘思琪", ... }
 *
 * 输出：
 *   publish/predefined-role-cards/<key>.json
 *   publish/predefined-role-cards/<key>.js
 *   mobile/android-webview-shell/app/src/main/assets/publish/predefined-role-cards/<key>.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLISH_OUT_DIR = path.join(ROOT, 'publish', 'predefined-role-cards');
const ANDROID_OUT_DIR = path.join(ROOT, 'mobile', 'android-webview-shell', 'app', 'src', 'main', 'assets', 'publish', 'predefined-role-cards');
const PUBLISH_MANIFEST = path.join(ROOT, 'publish', 'boot', 'script-manifest.js');
const ANDROID_MANIFEST = path.join(ROOT, 'mobile', 'android-webview-shell', 'app', 'src', 'main', 'assets', 'publish', 'boot', 'script-manifest.js');
const SUPPORT_SCRIPT_ANCHOR = 'predefined-role-card-support/triplet-essential-preference-layers.js';

const NAME_TO_KEY = {
  刘思琪: '01-刘思琪-rel-ai-247528',
  刘思怡: '02-刘思怡-rel-ai-242269',
  刘思瑶: '03-刘思瑶-rel-ai-247463',
  刘悠: '04-刘悠-player-self',
};

function stripBom(text = '') {
  return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

function readJson(file) {
  return JSON.parse(stripBom(fs.readFileSync(file, 'utf8')));
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function characterEntries(input) {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.characters)) return input.characters;
  if (input && typeof input === 'object') return [input];
  throw new Error('输入 JSON 必须是单张角色、角色数组，或包含 characters 数组。');
}

function roleRecordFromEntry(entry = {}) {
  return clone(entry);
}

function renderRoleCardJs(key, profile) {
  return [
    'window.GameModules = window.GameModules || {};',
    'window.GameModules.predefinedRoleCardData = window.GameModules.predefinedRoleCardData || {};',
    `window.GameModules.predefinedRoleCardData['${key}'] = ${JSON.stringify(profile, null, 2)};`,
    '',
  ].join('\n');
}

function writeRoleCardFiles(key, profile) {
  fs.mkdirSync(PUBLISH_OUT_DIR, { recursive: true });
  const json = `${JSON.stringify(profile, null, 2)}\n`;
  const js = renderRoleCardJs(key, profile);
  const jsonPath = path.join(PUBLISH_OUT_DIR, `${key}.json`);
  const jsPath = path.join(PUBLISH_OUT_DIR, `${key}.js`);
  fs.writeFileSync(jsonPath, json, 'utf8');
  fs.writeFileSync(jsPath, js, 'utf8');

  const written = [jsonPath, jsPath];
  if (fs.existsSync(ANDROID_OUT_DIR)) {
    const androidJsPath = path.join(ANDROID_OUT_DIR, `${key}.js`);
    fs.writeFileSync(androidJsPath, js, 'utf8');
    written.push(androidJsPath);
  }
  return written;
}

function roleCardDataScripts(dir = PUBLISH_OUT_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((file) => file.endsWith('.js'))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
    .filter((file) => fs.readFileSync(path.join(dir, file), 'utf8').includes('predefinedRoleCardData['))
    .map((file) => `predefined-role-cards/${file}`);
}

function replaceManifestRoleCardScripts(text, scripts) {
  const lines = scripts.map((file) => `      ${JSON.stringify(file)},`).join('\n');
  const escapedAnchor = SUPPORT_SCRIPT_ANCHOR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?:\\s*"predefined-role-cards/[^"]+\\.js",\\r?\\n)+(\\s*"${escapedAnchor}",)`);
  if (!pattern.test(text)) throw new Error('script-manifest.js 中未找到预定义角色卡脚本段。');
  return text.replace(pattern, `\n${lines}\n$1`);
}

function syncRoleCardManifest(manifestPath, roleCardDir) {
  if (!fs.existsSync(manifestPath)) return [];
  const scripts = roleCardDataScripts(roleCardDir);
  if (!scripts.length) return [];
  const text = fs.readFileSync(manifestPath, 'utf8');
  const next = replaceManifestRoleCardScripts(text, scripts);
  fs.writeFileSync(manifestPath, next, 'utf8');
  return [manifestPath];
}

function updatePredefinedFromExport(inputPath) {
  const resolvedInput = path.resolve(inputPath);
  const data = readJson(resolvedInput);
  const written = [];
  for (const entry of characterEntries(data)) {
    const name = entry?.name || entry?.profile?.name;
    const key = NAME_TO_KEY[name];
    if (!key) {
      console.warn(`跳过未知角色：${name || '(no name)'}`);
      continue;
    }
    const roleRecord = roleRecordFromEntry(entry);
    written.push(...writeRoleCardFiles(key, roleRecord));
    console.log(`Updated ${key} (${name})`);
  }
  if (!written.length) throw new Error('没有写入任何预定义角色卡。');
  written.push(...syncRoleCardManifest(PUBLISH_MANIFEST, PUBLISH_OUT_DIR));
  if (fs.existsSync(ANDROID_OUT_DIR)) written.push(...syncRoleCardManifest(ANDROID_MANIFEST, ANDROID_OUT_DIR));
  return written;
}

function main(argv = process.argv.slice(2)) {
  const inputPath = argv[0];
  if (!inputPath || inputPath === '-h' || inputPath === '--help') {
    console.log('用法: node tools/update-predefined-from-export.js <export.json>');
    return;
  }
  updatePredefinedFromExport(inputPath).forEach((file) => console.log(`写入 ${file}`));
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
  characterEntries,
  replaceManifestRoleCardScripts,
  renderRoleCardJs,
  roleRecordFromEntry,
  roleCardDataScripts,
  syncRoleCardManifest,
  updatePredefinedFromExport,
  writeRoleCardFiles,
};
