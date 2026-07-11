import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function resolveShellDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function exists(target) {
  return fs.existsSync(target);
}

function listTopLevel(dirPath) {
  if (!exists(dirPath)) return [];
  return fs.readdirSync(dirPath).sort();
}

function resolveExePath(winUnpacked, candidates = []) {
  for (const name of candidates) {
    const candidatePath = path.resolve(winUnpacked, name);
    if (exists(candidatePath)) return candidatePath;
  }
  return path.resolve(winUnpacked, candidates[0] || 'Gamefy.exe');
}

function buildVariant(rootDir, exeCandidates = ['Gamefy.exe']) {
  const winUnpacked = path.resolve(rootDir, 'win-unpacked');
  const resourcesDir = path.resolve(winUnpacked, 'resources');
  const appDir = path.resolve(resourcesDir, 'app');
  const publishDir = path.resolve(appDir, 'publish');
  const exePath = resolveExePath(winUnpacked, exeCandidates);
  const bootstrapPath = path.resolve(appDir, 'electron-main-bootstrap.cjs');
  const preloadPath = path.resolve(appDir, 'electron-preload.js');
  const packageJsonPath = path.resolve(appDir, 'package.json');
  const defaultAsarPath = path.resolve(resourcesDir, 'default_app.asar');

  return {
    rootDir,
    exeCandidates,
    checks: {
      rootPresent: exists(rootDir),
      winUnpackedPresent: exists(winUnpacked),
      exePresent: exists(exePath),
      resourcesPresent: exists(resourcesDir),
      appPresent: exists(appDir),
      publishPresent: exists(publishDir),
      bootstrapPresent: exists(bootstrapPath),
      preloadPresent: exists(preloadPath),
      packageJsonPresent: exists(packageJsonPath),
      defaultAsarPresent: exists(defaultAsarPath),
    },
    paths: {
      winUnpacked,
      exePath,
      resourcesDir,
      appDir,
      publishDir,
      bootstrapPath,
      preloadPath,
      packageJsonPath,
      defaultAsarPath,
    },
    topLevel: listTopLevel(rootDir),
    appTopLevel: listTopLevel(appDir),
  };
}

const shellDir = resolveShellDir();
const mainVariant = buildVariant(path.resolve(shellDir, 'dist'), ['Gamefy.exe']);
const minimalVariant = buildVariant(path.resolve(shellDir, 'dist-minimal'), ['GamefyMinimal.exe', 'Gamefy.exe']);

const report = {
  runtimeFamily: 'desktop-packaging-artifact-structure-report',
  stage: 'desktop-packaging-artifact-structure-report',
  variants: {
    main: mainVariant,
    minimal: minimalVariant,
  },
};

report.ok = Object.values(mainVariant.checks).every(Boolean)
  && Object.values(minimalVariant.checks).every(Boolean);

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
