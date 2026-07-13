const path = require('path');
const {
  collectManifestFiles,
  fileExists,
  findDuplicateChunkEntries,
  manifestBaseDir,
  readScriptManifest,
} = require('./manifest-utils.cjs');

const manifests = [
  'publish/boot/script-manifest.js',
  'mobile/android-webview-shell/app/src/main/assets/publish/boot/script-manifest.js',
];

let failed = false;

for (const manifestPath of manifests) {
  const manifest = readScriptManifest(manifestPath);
  const rows = collectManifestFiles(manifest);
  const baseDir = manifestBaseDir(manifestPath);
  const missing = rows.filter((row) => !fileExists(baseDir, row.file));
  const duplicates = findDuplicateChunkEntries(rows);

  const summary = {
    manifest: path.normalize(manifestPath),
    files: rows.length,
    missing: missing.length,
    duplicates: duplicates.length,
  };
  console.log(JSON.stringify(summary));

  if (missing.length) {
    failed = true;
    console.error(`[assets] Missing files for ${manifestPath}:`);
    for (const row of missing.slice(0, 80)) {
      console.error(`- ${row.chunk}: ${row.file}`);
    }
    if (missing.length > 80) console.error(`...and ${missing.length - 80} more`);
  }

  if (duplicates.length) {
    console.warn(`[assets] Duplicate chunk entries in ${manifestPath}:`);
    for (const row of duplicates.slice(0, 20)) {
      console.warn(`- ${row.chunk}: ${row.file}`);
    }
    if (duplicates.length > 20) console.warn(`...and ${duplicates.length - 20} more`);
  }
}

if (failed) process.exit(1);
