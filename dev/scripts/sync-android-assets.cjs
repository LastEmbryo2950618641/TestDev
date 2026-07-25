const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  collectManifestFiles,
  manifestBaseDir,
  readScriptManifest,
} = require('./manifest-utils.cjs');

const sourceManifestPath = 'publish/boot/script-manifest.js';
const mobileManifestPath = 'mobile/android-webview-shell/app/src/main/assets/publish/boot/script-manifest.js';
const webBaseDir = manifestBaseDir(sourceManifestPath);
const mobileBaseDir = manifestBaseDir(mobileManifestPath);
const checkOnly = process.argv.includes('--check');
const alwaysSyncFiles = [
  'index.html',
  'game.js',
  'boot/scripts.json',
  'boot/script-manifest.js',
  'phone-desktop.css',
  'skills-app.css',
  'ui-theme-overrides.css',
];

function sha1(filePath) {
  return crypto.createHash('sha1').update(fs.readFileSync(filePath)).digest('hex');
}

function sameFile(left, right) {
  return fs.existsSync(left) && fs.existsSync(right) && sha1(left) === sha1(right);
}

const manifest = readScriptManifest(sourceManifestPath);
const files = [...new Set([
  ...collectManifestFiles(manifest).map((row) => row.file),
  ...alwaysSyncFiles,
])];
const missingSource = [];
const missingTarget = [];
const outdated = [];
const copied = [];

for (const file of files) {
  const src = path.join(webBaseDir, file);
  const dst = path.join(mobileBaseDir, file);
  if (!fs.existsSync(src)) {
    missingSource.push(file);
    continue;
  }
  if (!fs.existsSync(dst)) {
    missingTarget.push(file);
  } else if (!sameFile(src, dst)) {
    outdated.push(file);
  }
  if (!checkOnly && (!fs.existsSync(dst) || !sameFile(src, dst))) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    copied.push(file);
  }
}

const summary = {
  mode: checkOnly ? 'check' : 'sync',
  manifest: path.normalize(sourceManifestPath),
  total: files.length,
  missingSource: missingSource.length,
  missingTarget: missingTarget.length,
  outdated: outdated.length,
  copied: copied.length,
};

console.log(JSON.stringify(summary, null, 2));

if (missingSource.length) {
  console.error('[android-assets] Missing source files in publish/:');
  for (const file of missingSource.slice(0, 80)) console.error(`- ${file}`);
  if (missingSource.length > 80) console.error(`...and ${missingSource.length - 80} more`);
}

if (missingTarget.length) {
  console.error('[android-assets] Missing target files in Android assets:');
  for (const file of missingTarget.slice(0, 80)) console.error(`- ${file}`);
  if (missingTarget.length > 80) console.error(`...and ${missingTarget.length - 80} more`);
}

if (outdated.length) {
  console.error('[android-assets] Outdated target files in Android assets:');
  for (const file of outdated.slice(0, 80)) console.error(`- ${file}`);
  if (outdated.length > 80) console.error(`...and ${outdated.length - 80} more`);
}

if (checkOnly && (missingSource.length || missingTarget.length || outdated.length)) {
  process.exit(1);
}

if (missingSource.length) process.exit(1);
