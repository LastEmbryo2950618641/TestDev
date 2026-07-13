const fs = require('fs');
const path = require('path');
const vm = require('vm');

function readScriptManifest(manifestPath) {
  const abs = path.resolve(manifestPath);
  const code = fs.readFileSync(abs, 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox, { filename: abs });
  const manifest = sandbox.window.GameScriptManifest;
  if (!manifest || !manifest.chunks) {
    throw new Error(`Missing GameScriptManifest.chunks in ${manifestPath}`);
  }
  return manifest;
}

function manifestBaseDir(manifestPath) {
  return path.dirname(path.dirname(path.resolve(manifestPath)));
}

function collectManifestFiles(manifest) {
  const rows = [];
  for (const [chunk, files] of Object.entries(manifest.chunks || {})) {
    for (const file of files || []) {
      if (!file || /^https?:\/\//i.test(file)) continue;
      rows.push({ chunk, file });
    }
  }
  return rows;
}

function uniqueFiles(rows) {
  return [...new Set(rows.map((row) => row.file))];
}

function findDuplicateChunkEntries(rows) {
  const seen = new Set();
  const duplicates = [];
  for (const row of rows) {
    const key = `${row.chunk}:${row.file}`;
    if (seen.has(key)) duplicates.push(row);
    seen.add(key);
  }
  return duplicates;
}

function fileExists(baseDir, file) {
  return fs.existsSync(path.join(baseDir, file));
}

module.exports = {
  collectManifestFiles,
  fileExists,
  findDuplicateChunkEntries,
  manifestBaseDir,
  readScriptManifest,
  uniqueFiles,
};
