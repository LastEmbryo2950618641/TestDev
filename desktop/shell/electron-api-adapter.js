// Optional Electron API adapter
// Keeps real Electron API calls behind a shell-local adapter so shared gameplay remains untouched.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function resolveElectronInstallState() {
  const shellDir = path.dirname(fileURLToPath(import.meta.url));
  const electronDir = path.resolve(shellDir, 'node_modules', 'electron');
  const pathFile = path.resolve(electronDir, 'path.txt');
  const distDir = path.resolve(electronDir, 'dist');

  return {
    electronDir,
    pathFile,
    distDir,
    packagePresent: fs.existsSync(electronDir),
    pathFilePresent: fs.existsSync(pathFile),
    distPresent: fs.existsSync(distDir),
  };
}

export async function loadOptionalElectronModule() {
  try {
    const installState = resolveElectronInstallState();
    if (!installState.packagePresent) {
      return { electronModule: null, installState, reason: 'electron-package-missing' };
    }
    if (!installState.pathFilePresent || !installState.distPresent) {
      return { electronModule: null, installState, reason: 'electron-install-incomplete' };
    }

    return {
      electronModule: await import('electron'),
      installState,
      reason: '',
    };
  } catch (_error) {
    return {
      electronModule: null,
      installState: resolveElectronInstallState(),
      reason: 'electron-module-unavailable',
    };
  }
}

export async function createOptionalElectronApiAdapter() {
  const { electronModule, installState, reason } = await loadOptionalElectronModule();
  if (!electronModule) {
    return {
      available: false,
      runtime: 'electron',
      stage: 'desktop-optional-electron-api-adapter',
      reason,
      installState,
    };
  }

  const electronApi = electronModule.default || electronModule;
  const { app, BrowserWindow, contextBridge } = electronApi;
  return {
    available: true,
    runtime: 'electron',
    stage: 'desktop-optional-electron-api-adapter',
    app,
    BrowserWindow,
    contextBridge,
    installState,
  };
}
