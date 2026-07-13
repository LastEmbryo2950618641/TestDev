// Optional Electron API adapter
// Keeps real Electron API calls behind a shell-local adapter so shared gameplay remains untouched.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLocalElectronDist } from './desktop-packaging-paths.js';

function resolveElectronInstallState() {
  const shellDir = path.dirname(fileURLToPath(import.meta.url));
  const electronDir = path.resolve(shellDir, 'node_modules', 'electron');
  const pathFile = path.resolve(electronDir, 'path.txt');
  const distDir = path.resolve(electronDir, 'dist');
  const localDist = resolveLocalElectronDist(shellDir);
  const electronExe = localDist ? path.resolve(localDist, 'electron.exe') : path.resolve(distDir, 'electron.exe');

  return {
    shellDir,
    electronDir,
    pathFile,
    distDir,
    localDist,
    electronExe,
    packagePresent: fs.existsSync(electronDir),
    pathFilePresent: fs.existsSync(pathFile),
    distPresent: fs.existsSync(distDir),
    localDistPresent: Boolean(localDist),
    electronExePresent: fs.existsSync(electronExe),
  };
}

function normalizeElectronApi(electronModule) {
  const electronApi = electronModule?.default || electronModule;
  if (
    electronApi &&
    typeof electronApi.app?.whenReady === 'function' &&
    typeof electronApi.BrowserWindow === 'function'
  ) {
    return electronApi;
  }
  return null;
}

export async function loadOptionalElectronModule() {
  const installState = resolveElectronInstallState();
  try {
    if (!installState.electronExePresent) {
      return { electronModule: null, electronApi: null, installState, reason: 'electron-runtime-missing' };
    }

    const electronModule = await import('electron');
    const electronApi = normalizeElectronApi(electronModule);
    if (!electronApi) {
      return { electronModule: null, electronApi: null, installState, reason: 'electron-api-unavailable-in-node' };
    }

    return {
      electronModule,
      electronApi,
      installState,
      reason: '',
    };
  } catch (_error) {
    return {
      electronModule: null,
      electronApi: null,
      installState,
      reason: 'electron-module-unavailable',
    };
  }
}

export async function createOptionalElectronApiAdapter() {
  const { electronApi, installState, reason } = await loadOptionalElectronModule();
  if (!electronApi) {
    return {
      available: false,
      runtime: 'electron',
      stage: 'desktop-optional-electron-api-adapter',
      reason,
      installState,
    };
  }

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
