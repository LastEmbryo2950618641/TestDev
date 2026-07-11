import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDesktopFileStorageBackend, resolveDesktopStorageRoot } from './electron-storage-backend.js';

async function run() {
  const baseDir = path.resolve(process.cwd(), 'desktop', 'shell', '.verify-storage');
  await fs.rm(baseDir, { recursive: true, force: true });

  const explicitRoot = resolveDesktopStorageRoot({ baseDir });
  const hostUserDataRoot = resolveDesktopStorageRoot({ hostPaths: { userData: 'C:/virtual-user-data/Gamefy' } });
  const appFallbackRoot = resolveDesktopStorageRoot({ appName: 'GamefyDesktop' });

  const backend = createDesktopFileStorageBackend({ baseDir });
  const first = await backend.writeSettings('gamefy-local-settings-v1', { uiThemeId: 'custom' });
  const second = await backend.writeSettings('gamefy-local-settings-v1', { uiThemeCustomColor: '#abcdef' });
  const merged = await backend.readSettings('gamefy-local-settings-v1');

  await backend.writeRaw('state:demo', '{"ok":true}');
  const rereadRaw = await backend.readRaw('state:demo');
  await backend.removeRaw('state:demo');
  const removedRaw = await backend.readRaw('state:demo');

  process.stdout.write(`${JSON.stringify({
    runtimeFamily: 'desktop-electron-storage-backend-verify',
    root: backend.root,
    explicitStrategy: explicitRoot.strategy,
    hostUserDataStrategy: hostUserDataRoot.strategy,
    hostUserDataBaseDir: hostUserDataRoot.baseDir,
    appFallbackStrategy: appFallbackRoot.strategy,
    appFallbackBaseDir: appFallbackRoot.baseDir,
    expectedAppFallbackBaseDir: path.resolve(os.homedir(), 'AppData', 'Roaming', 'GamefyDesktop', 'storage'),
    settingsRoundTrip: Boolean(first && second),
    settingsMerged: merged?.uiThemeId === 'custom' && merged?.uiThemeCustomColor === '#abcdef',
    rawWriteRead: rereadRaw === '{"ok":true}',
    rawRemove: removedRaw === null,
  }, null, 2)}\n`);
}

await run();
