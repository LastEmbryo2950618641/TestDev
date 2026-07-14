const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const canonicalFiles = [
  'platform/storage/sqlite/save.js',
  'platform/storage/sqlite/world.js',
  'platform/storage/sqlite/worldline.js',
  'platform/storage/sqlite/memory.js',
  'platform/storage/sqlite/real-world-log.js',
];
const legacyFiles = [
  'sqlite-save.js',
  'sqlite-world.js',
  'sqlite-worldline.js',
  'sqlite-memory.js',
  'sqlite-real-world-log.js',
];
const runtimeLists = [
  ['publish/boot/scripts.json', 'json'],
  ['publish/boot/script-manifest.js', 'manifest'],
  ['mobile/android-webview-shell/app/src/main/assets/publish/boot/scripts.json', 'json'],
  ['mobile/android-webview-shell/app/src/main/assets/publish/boot/script-manifest.js', 'manifest'],
];

function readRuntimeList(relativePath, type) {
  const absolutePath = path.join(root, relativePath);
  if (type === 'json') return { scripts: JSON.parse(fs.readFileSync(absolutePath, 'utf8')), chunks: null };
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(absolutePath, 'utf8'), sandbox, { filename: relativePath });
  const chunks = sandbox.window.GameScriptManifest.chunks;
  return { scripts: Object.values(chunks).flat(), chunks };
}

for (const base of [
  'publish',
  'mobile/android-webview-shell/app/src/main/assets/publish',
]) {
  for (const file of canonicalFiles) {
    assert.ok(fs.existsSync(path.join(root, base, file)), `${base}/${file} must exist`);
  }
  for (const file of legacyFiles) {
    assert.strictEqual(fs.existsSync(path.join(root, base, file)), false, `${base}/${file} must stay removed`);
  }
}

for (const file of canonicalFiles) {
  const web = fs.readFileSync(path.join(root, 'publish', file));
  const android = fs.readFileSync(path.join(root, 'mobile/android-webview-shell/app/src/main/assets/publish', file));
  assert.deepStrictEqual(android, web, `Android ${file} must match the authoritative Web implementation`);
}

for (const [relativePath, type] of runtimeLists) {
  const { scripts, chunks } = readRuntimeList(relativePath, type);
  const actual = scripts.filter((file) => canonicalFiles.includes(file));
  assert.deepStrictEqual(actual, canonicalFiles, `${relativePath} must preserve the SQLite decorator order`);
  if (chunks) {
    assert.strictEqual(
      JSON.stringify(chunks.core.filter((file) => canonicalFiles.includes(file))),
      JSON.stringify(canonicalFiles),
      `${relativePath} must load the complete SQLite decorator chain in the core chunk`,
    );
    for (const [chunkName, files] of Object.entries(chunks)) {
      if (chunkName === 'core') continue;
      assert.strictEqual(files.some((file) => canonicalFiles.includes(file)), false, `${relativePath} must not defer SQLite files to ${chunkName}`);
    }
  }
  for (const legacyFile of legacyFiles) {
    assert.strictEqual(scripts.includes(legacyFile), false, `${relativePath} must not load ${legacyFile}`);
  }
}

const restoreMappings = [
  ['database/sqlite-save.js', canonicalFiles[0]],
  ['database/sqlite-world.js', canonicalFiles[1]],
  ['database/sqlite-worldline.js', canonicalFiles[2]],
  ['database/sqlite-memory.js', canonicalFiles[3]],
  ['database/sqlite-real-world-log.js', canonicalFiles[4]],
];

for (const script of ['dev/scripts/restore-from-bundles.cjs', 'scripts/sync-from-bundles.mjs']) {
  const source = fs.readFileSync(path.join(root, script), 'utf8');
  for (const [bundlePath, destination] of restoreMappings) {
    const mapping = `'${bundlePath}': '${destination}'`;
    assert.ok(source.includes(mapping), `${script} must contain the exact mapping ${mapping}`);
  }
  for (const file of legacyFiles) {
    const escapedFile = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.doesNotMatch(source, new RegExp(`:\\s*['\"]${escapedFile}['\"]`, 'u'));
  }
}

console.log('PASS SQLite runtime layout and decorator order are canonical across platforms');
