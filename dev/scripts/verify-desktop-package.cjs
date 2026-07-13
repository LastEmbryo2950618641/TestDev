const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..', '..');
const sourcePublish = path.join(root, 'publish');
const packageRoot = path.join(root, 'desktop', 'shell', 'dist', 'win-unpacked');
const packagedApp = path.join(packageRoot, 'resources', 'app');
const packagedPublish = path.join(packagedApp, 'publish');
const executable = path.join(packageRoot, 'Gamefy.exe');
const artifactPath = path.join(packagedApp, '.artifacts', 'attempt-launch-result.json');

function collectFiles(baseDir) {
  const files = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  };
  visit(baseDir);
  return files;
}

function digest(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

if (!fs.existsSync(executable) || !fs.existsSync(packagedPublish)) {
  throw new Error('Windows unpacked package is missing; run the desktop build first.');
}

const sourceFiles = collectFiles(sourcePublish);
const missingPublishFiles = [];
const mismatchedPublishFiles = [];
for (const sourceFile of sourceFiles) {
  const relative = path.relative(sourcePublish, sourceFile);
  const packagedFile = path.join(packagedPublish, relative);
  if (!fs.existsSync(packagedFile)) missingPublishFiles.push(relative);
  else if (digest(sourceFile) !== digest(packagedFile)) mismatchedPublishFiles.push(relative);
}

fs.rmSync(artifactPath, { force: true });
const launch = spawnSync(executable, ['--codex-electron-launch'], {
  cwd: packageRoot,
  encoding: 'utf8',
  timeout: 30_000,
});
const artifact = fs.existsSync(artifactPath)
  ? JSON.parse(fs.readFileSync(artifactPath, 'utf8'))
  : null;
const expectedRendererEntry = path.join(packagedPublish, 'index.html');
const launchChecks = artifact?.checks || {};
const launchReady = [
  'windowCreated',
  'preloadExposed',
  'preloadPlanReady',
  'storageAttached',
  'rendererLoaded',
].every((key) => launchChecks[key] === true);
const rendererEntryMatches = path.resolve(artifact?.evidence?.rendererEntry || '')
  === path.resolve(expectedRendererEntry);

const summary = {
  executable: path.relative(root, executable).replace(/\\/gu, '/'),
  sourcePublishFiles: sourceFiles.length,
  missingPublishFiles: missingPublishFiles.length,
  mismatchedPublishFiles: mismatchedPublishFiles.length,
  launchStatus: launch.status,
  launchError: launch.error?.message || '',
  artifactPresent: Boolean(artifact),
  launchReady,
  rendererEntryMatches,
};
console.log(JSON.stringify(summary, null, 2));

if (missingPublishFiles.length) console.error('Missing packaged publish files:', missingPublishFiles);
if (mismatchedPublishFiles.length) console.error('Mismatched packaged publish files:', mismatchedPublishFiles);
if (!artifact) console.error('Packaged launch artifact was not created.');
if (artifact && !launchReady) console.error('Packaged launch checks failed:', launchChecks);
if (artifact && !rendererEntryMatches) {
  console.error('Packaged renderer entry mismatch:', {
    expected: expectedRendererEntry,
    actual: artifact?.evidence?.rendererEntry || '',
  });
}

if (
  missingPublishFiles.length
  || mismatchedPublishFiles.length
  || launch.status !== 0
  || launch.error
  || !artifact
  || !launchReady
  || !rendererEntryMatches
) {
  process.exit(1);
}
