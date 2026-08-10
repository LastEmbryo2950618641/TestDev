const fs = require('fs');
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

function collectDirectoryFiles(dir, prefix = '') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(prefix, entry.name);
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? collectDirectoryFiles(absolute, relative) : [relative];
  });
}

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

const publishMetadataDir = path.resolve('publish', 'work-metadata');
const mobileMetadataDir = path.resolve('mobile', 'android-webview-shell', 'app', 'src', 'main', 'assets', 'publish', 'work-metadata');
const metadataFiles = collectDirectoryFiles(publishMetadataDir);
const missingMobileMetadata = metadataFiles.filter((file) => !fs.existsSync(path.join(mobileMetadataDir, file)));
const outdatedMobileMetadata = metadataFiles.filter((file) => {
  const mobileFile = path.join(mobileMetadataDir, file);
  return fs.existsSync(mobileFile)
    && !fs.readFileSync(path.join(publishMetadataDir, file)).equals(fs.readFileSync(mobileFile));
});
const unexpectedMobileMetadata = collectDirectoryFiles(mobileMetadataDir)
  .filter((file) => !metadataFiles.includes(file));
const legacyMobileAggregates = [
  'character-catalog.json',
  'character-catalog-data.js',
  'lore-sources.js',
  'story-start-data.js',
].filter((file) => fs.existsSync(path.resolve('mobile', 'android-webview-shell', 'app', 'src', 'main', 'assets', 'publish', file)));
console.log(JSON.stringify({
  workMetadataFiles: metadataFiles.length,
  missingMobileMetadata: missingMobileMetadata.length,
  outdatedMobileMetadata: outdatedMobileMetadata.length,
  unexpectedMobileMetadata: unexpectedMobileMetadata.length,
  legacyMobileAggregates: legacyMobileAggregates.length,
}));
if (missingMobileMetadata.length || outdatedMobileMetadata.length || unexpectedMobileMetadata.length || legacyMobileAggregates.length) {
  failed = true;
  console.error('[assets] Android work metadata is not synchronized:', [
    ...missingMobileMetadata,
    ...outdatedMobileMetadata,
    ...unexpectedMobileMetadata,
    ...legacyMobileAggregates,
  ].slice(0, 80));
}

if (failed) process.exit(1);
