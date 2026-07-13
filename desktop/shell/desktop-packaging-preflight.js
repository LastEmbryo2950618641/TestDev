import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLocalElectronDist } from './desktop-packaging-paths.js';

function resolveShellDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

export function createDesktopPackagingPreflight() {
  const shellDir = resolveShellDir();
  const attemptArtifactPath = path.resolve(shellDir, '.artifacts', 'attempt-launch-result.json');
  const packageJsonPath = path.resolve(shellDir, 'package.json');
  const electronDist = resolveLocalElectronDist(shellDir);
  const electronExePath = electronDist ? path.resolve(electronDist, 'electron.exe') : path.resolve(shellDir, 'node_modules', 'electron', 'dist', 'electron.exe');
  const bootstrapPath = path.resolve(shellDir, 'electron-main-bootstrap.cjs');
  const preloadPath = path.resolve(shellDir, 'electron-preload.js');
  const rendererEntryPath = path.resolve(shellDir, '..', '..', 'publish', 'index.html');
  const launcherPath = path.resolve(shellDir, 'run-electron-attempt-launcher.ps1');

  const packageJson = readJson(packageJsonPath) || {};
  const attemptArtifact = readJson(attemptArtifactPath) || {};
  const checks = attemptArtifact?.checks || {};
  const evidence = attemptArtifact?.evidence || {};

  return {
    runtimeFamily: 'desktop-packaging-preflight',
    stage: 'desktop-packaging-preflight',
    shellLocalOnly: true,
    packageJsonPath,
    attemptArtifactPath,
    electronDist,
    electronExePath,
    bootstrapPath,
    preloadPath,
    rendererEntryPath,
    launcherPath,
    checks: {
      packageJsonPresent: fs.existsSync(packageJsonPath),
      electronExePresent: fs.existsSync(electronExePath),
      bootstrapPresent: fs.existsSync(bootstrapPath),
      preloadPresent: fs.existsSync(preloadPath),
      rendererEntryPresent: fs.existsSync(rendererEntryPath),
      launcherPresent: fs.existsSync(launcherPath),
      packageMainIsBootstrap: packageJson.main === 'electron-main-bootstrap.cjs',
      attemptLaunchScriptPresent: typeof packageJson.scripts?.['attempt:launch'] === 'string' && packageJson.scripts['attempt:launch'].length > 0,
      smokeBootstrapReady: checks.preloadPlanReady === true && checks.storageAttached === true && Boolean(evidence?.storageRoot?.baseDir),
      smokeLiveRunPassed: attemptArtifact?.enabled === true && checks.windowCreated === true && checks.preloadExposed === true && checks.rendererLoaded === true,
    },
    notes: [],
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  process.stdout.write(`${JSON.stringify(createDesktopPackagingPreflight(), null, 2)}\n`);
}


