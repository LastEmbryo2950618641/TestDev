const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  collectManifestFiles,
  readScriptManifest,
} = require('./manifest-utils.cjs');

const root = path.resolve(__dirname, '..', '..');
const apkPath = path.join(
  root,
  'mobile',
  'android-webview-shell',
  'app',
  'build',
  'outputs',
  'apk',
  'debug',
  'app-debug.apk',
);
const manifestPath = path.join(root, 'publish', 'boot', 'script-manifest.js');

if (!fs.existsSync(apkPath)) {
  throw new Error(`Android debug APK is missing: ${apkPath}`);
}

const runtimeFiles = collectManifestFiles(readScriptManifest(manifestPath))
  .map((row) => row.file);
const managedFiles = [...new Set([
  ...runtimeFiles,
  'index.html',
  'game.js',
  'boot/scripts.json',
  'boot/script-manifest.js',
])];
const duplicateRuntimePaths = runtimeFiles.filter(
  (file, index) => runtimeFiles.indexOf(file) !== index,
);
const nonAsciiRuntimePaths = runtimeFiles.filter((file) => /[^\x00-\x7f]/u.test(file));
const inferenceRuntime = fs.readFileSync(
  path.join(root, 'publish', 'inference-prompts-runtime.js'),
  'utf8',
);
const missingStage5Registrations = [
  'inference-stage5-profile-gate',
  'inference-stage5-body-profile-patch',
  'inference-stage5-dressed-profile-patch',
].filter((id) => !inferenceRuntime.includes(`inline["${id}"]`));

const archiveEntries = execFileSync('tar', ['-tf', apkPath], {
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
}).split(/\r?\n/u).filter(Boolean);
const archiveEntrySet = new Set(archiveEntries);
const missingRuntimeFiles = runtimeFiles.filter(
  (file) => !archiveEntrySet.has(`assets/publish/${file}`),
);
const nonAsciiArchiveEntries = archiveEntries.filter(
  (entry) => entry.startsWith('assets/publish/') && /[^\x00-\x7f]/u.test(entry),
);
const extractionRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gamefy-apk-assets-'));
const mismatchedManagedFiles = [];
try {
  execFileSync('tar', ['-xf', apkPath, '-C', extractionRoot, 'assets/publish'], {
    maxBuffer: 16 * 1024 * 1024,
  });
  for (const file of managedFiles) {
    const source = path.join(root, 'publish', file);
    const packaged = path.join(extractionRoot, 'assets', 'publish', file);
    if (
      !fs.existsSync(packaged)
      || !fs.readFileSync(source).equals(fs.readFileSync(packaged))
    ) {
      mismatchedManagedFiles.push(file);
    }
  }
} finally {
  fs.rmSync(extractionRoot, { recursive: true, force: true });
}

const summary = {
  apk: path.relative(root, apkPath).replace(/\\/gu, '/'),
  runtimeFiles: runtimeFiles.length,
  duplicateRuntimePaths: duplicateRuntimePaths.length,
  missingRuntimeFiles: missingRuntimeFiles.length,
  mismatchedManagedFiles: mismatchedManagedFiles.length,
  missingStage5Registrations: missingStage5Registrations.length,
  nonAsciiRuntimePaths: nonAsciiRuntimePaths.length,
  nonAsciiArchiveEntries: nonAsciiArchiveEntries.length,
};

console.log(JSON.stringify(summary, null, 2));

if (missingRuntimeFiles.length) {
  console.error('Missing runtime files in APK:', missingRuntimeFiles);
}
if (mismatchedManagedFiles.length) {
  console.error('Managed APK assets differ from publish/:', mismatchedManagedFiles);
}
if (duplicateRuntimePaths.length) {
  console.error('Runtime manifest paths must be unique:', duplicateRuntimePaths);
}
if (missingStage5Registrations.length) {
  console.error('Stage5 prompts must be in the shared runtime:', missingStage5Registrations);
}
if (nonAsciiRuntimePaths.length) {
  console.error('Runtime manifest paths must be ASCII-safe:', nonAsciiRuntimePaths);
}
if (nonAsciiArchiveEntries.length) {
  console.error('APK publish entries must be ASCII-safe:', nonAsciiArchiveEntries);
}

if (
  missingRuntimeFiles.length
  || mismatchedManagedFiles.length
  || duplicateRuntimePaths.length
  || missingStage5Registrations.length
  || nonAsciiRuntimePaths.length
  || nonAsciiArchiveEntries.length
) {
  process.exit(1);
}
