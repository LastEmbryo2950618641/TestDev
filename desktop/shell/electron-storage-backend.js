import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_SETTINGS_KEY = 'gamefy-local-settings-v1';
const SETTINGS_DIR = 'settings';
const RAW_DIR = 'raw';
const DEFAULT_APP_NAMESPACE = 'Gamefy';

function sanitizeSegment(value, fallback = 'default') {
  return String(value || fallback)
    .replace(/[^a-zA-Z0-9._:-]+/g, '_')
    .replace(/^_+|_+$/g, '') || fallback;
}

function resolvePreferredBaseDir(options = {}) {
  if (options.baseDir) {
    return path.resolve(options.baseDir);
  }

  if (options.hostPaths?.userData) {
    return path.resolve(options.hostPaths.userData, 'storage');
  }

  if (options.electronApp && typeof options.electronApp.getPath === 'function') {
    try {
      const userData = options.electronApp.getPath('userData');
      if (userData) {
        return path.resolve(userData, 'storage');
      }
    } catch (_error) {
      // Fall through to the desktop shell default.
    }
  }

  if (options.appName) {
    return path.resolve(os.homedir(), 'AppData', 'Roaming', sanitizeSegment(options.appName), 'storage');
  }

  return path.resolve(process.cwd(), 'desktop', 'shell', '.local-storage');
}

export function resolveDesktopStorageRoot(options = {}) {
  const baseDir = resolvePreferredBaseDir({
    ...options,
    appName: options.appName || DEFAULT_APP_NAMESPACE,
  });

  return {
    baseDir,
    settingsDir: path.resolve(baseDir, SETTINGS_DIR),
    rawDir: path.resolve(baseDir, RAW_DIR),
    strategy: options.baseDir
      ? 'explicit-base-dir'
      : options.hostPaths?.userData
        ? 'host-user-data'
        : options.electronApp && typeof options.electronApp.getPath === 'function'
          ? 'electron-app-user-data'
          : options.appName
            ? 'app-name-user-data-fallback'
            : 'workspace-dev-fallback',
  };
}

async function ensureStorageDirs(root) {
  await fs.mkdir(root.settingsDir, { recursive: true });
  await fs.mkdir(root.rawDir, { recursive: true });
}

function resolveSettingsFile(root, key = DEFAULT_SETTINGS_KEY) {
  return path.resolve(root.settingsDir, `${sanitizeSegment(key)}.json`);
}

function resolveRawFile(root, slot) {
  return path.resolve(root.rawDir, `${sanitizeSegment(slot, 'slot')}.txt`);
}

async function readJsonFile(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === 'ENOENT') return fallbackValue;
    throw error;
  }
}

export function createDesktopFileStorageBackend(options = {}) {
  const root = resolveDesktopStorageRoot(options);

  return {
    runtime: 'desktop-file-storage-backend',
    stage: 'desktop-file-storage-backend',
    root,

    async readSettings(key = DEFAULT_SETTINGS_KEY) {
      await ensureStorageDirs(root);
      const filePath = resolveSettingsFile(root, key);
      const value = await readJsonFile(filePath, {});
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    },

    async writeSettings(key = DEFAULT_SETTINGS_KEY, patch = {}) {
      await ensureStorageDirs(root);
      const filePath = resolveSettingsFile(root, key);
      const previous = await this.readSettings(key);
      const nextValue = {
        ...(previous || {}),
        ...(patch && typeof patch === 'object' ? patch : {}),
      };
      await fs.writeFile(filePath, `${JSON.stringify(nextValue, null, 2)}\n`, 'utf8');
      return nextValue;
    },

    async readRaw(slot) {
      await ensureStorageDirs(root);
      const filePath = resolveRawFile(root, slot);
      try {
        return await fs.readFile(filePath, 'utf8');
      } catch (error) {
        if (error && error.code === 'ENOENT') return null;
        throw error;
      }
    },

    async writeRaw(slot, raw) {
      await ensureStorageDirs(root);
      const filePath = resolveRawFile(root, slot);
      await fs.writeFile(filePath, String(raw ?? ''), 'utf8');
      return String(raw ?? '');
    },

    async removeRaw(slot) {
      await ensureStorageDirs(root);
      const filePath = resolveRawFile(root, slot);
      try {
        await fs.rm(filePath, { force: true });
      } catch (error) {
        if (!(error && error.code === 'ENOENT')) throw error;
      }
      return true;
    },
  };
}
