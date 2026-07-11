// Desktop Electron real launch attempt
// Performs the first minimal live Electron launch path only when explicitly enabled.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createOptionalElectronApiAdapter } from './electron-api-adapter.js';
import { createElectronRuntimeSkeleton, attachElectronStorageTarget } from './electron-main.js';
import { createElectronPreloadExposeExecutionPlan } from './electron-preload.js';

function resolveArtifactPath(options = {}) {
  if (options.artifactPath) {
    return path.resolve(options.artifactPath);
  }

  const shellDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(shellDir, '.artifacts', 'attempt-launch-result.json');
}

async function writeLaunchArtifact(artifactPath, result) {
  await fs.mkdir(path.dirname(artifactPath), { recursive: true });
  await fs.writeFile(artifactPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

export async function attemptDesktopElectronRealLaunch(options = {}, target = globalThis) {
  const enabled = options.enabled === true;
  const artifactPath = resolveArtifactPath(options);
  const adapter = await createOptionalElectronApiAdapter();
  const skeleton = createElectronRuntimeSkeleton(target);
  const storage = attachElectronStorageTarget(target, {
    adapter,
    shellPaths: skeleton.paths,
    appName: 'Gamefy',
  });
  const preloadPlan = createElectronPreloadExposeExecutionPlan(target, {
    adapter,
    shellPaths: skeleton.paths,
    appName: 'Gamefy',
  });

  const result = {
    runtimeFamily: 'desktop-electron-real-launch-attempt',
    stage: 'desktop-electron-real-launch-attempt',
    shellLocalOnly: true,
    enabled,
    electronAvailable: adapter.available === true,
    artifactPath,
    checks: {
      windowCreated: false,
      preloadExposed: false,
      preloadPlanReady: Boolean(preloadPlan?.namespace && preloadPlan?.payload?.storage),
      storageAttached: ['readSettings', 'writeSettings', 'readRaw', 'writeRaw', 'removeRaw'].every((key) => typeof storage?.[key] === 'function'),
      rendererLoaded: false,
    },
    evidence: {
      preloadNamespace: preloadPlan?.namespace || '',
      storageRoot: storage?.root || null,
      rendererEntry: skeleton.rendererLoad?.entry || '',
    },
    notes: [],
  };

  if (!enabled) {
    result.notes.push('launch-disabled');
    await writeLaunchArtifact(artifactPath, result);
    return result;
  }

  if (!adapter.available) {
    result.notes.push(adapter.reason || 'electron-unavailable');
    await writeLaunchArtifact(artifactPath, result);
    return result;
  }

  let browserWindow = null;

  try {
    await adapter.app.whenReady();
    browserWindow = new adapter.BrowserWindow(skeleton.browserWindowOptions || {});
    result.checks.windowCreated = true;
    result.checks.preloadExposed = Boolean(skeleton.browserWindowOptions?.webPreferences?.preload);
    await writeLaunchArtifact(artifactPath, result);

    if (browserWindow.webContents) {
      browserWindow.webContents.once('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
        result.notes.push(`did-fail-load:${errorCode}:${errorDescription}:${validatedURL}`);
      });
      browserWindow.webContents.once('render-process-gone', (_event, details) => {
        result.notes.push(`render-process-gone:${details?.reason || 'unknown'}:${details?.exitCode ?? 'na'}`);
      });
      browserWindow.webContents.on('console-message', (_event, level, message) => {
        if (level <= 2) {
          result.notes.push(`console:${level}:${message}`);
        }
      });
    }

    if (typeof browserWindow.webContents?.once === 'function') {
      await new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          result.notes.push('renderer-load-timeout');
          resolve();
        }, 4000);

        browserWindow.webContents.once('did-finish-load', () => {
          clearTimeout(timeoutId);
          result.checks.rendererLoaded = true;
          resolve();
        });

        if (typeof browserWindow.loadFile === 'function') {
          browserWindow.loadFile(skeleton.rendererLoad.entry).catch((error) => {
            clearTimeout(timeoutId);
            result.notes.push(String(error?.message || error));
            resolve();
          });
        } else {
          clearTimeout(timeoutId);
          result.notes.push('browserWindow-loadFile-unavailable');
          resolve();
        }
      });
    } else if (typeof browserWindow.loadFile === 'function') {
      await browserWindow.loadFile(skeleton.rendererLoad.entry);
      result.checks.rendererLoaded = true;
    } else {
      result.notes.push('browserWindow-loadFile-unavailable');
    }
  } catch (error) {
    result.notes.push(String(error?.message || error));
  }

  await writeLaunchArtifact(artifactPath, result);

  try {
    if (browserWindow && !browserWindow.isDestroyed()) {
      browserWindow.destroy();
    }
  } catch (_error) {
    result.notes.push('browserWindow-destroy-failed');
    await writeLaunchArtifact(artifactPath, result);
  }

  return result;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const enabled = process.argv.includes('--enabled');
  const output = await attemptDesktopElectronRealLaunch({ enabled });
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (output.electronAvailable) {
    const adapter = await createOptionalElectronApiAdapter();
    if (adapter.available && typeof adapter.app?.quit === 'function') {
      await adapter.app.quit();
    }
  }
}
