import fs from 'node:fs/promises';
import path from 'node:path';
import { createMobileFileStorageBackend, resolveMobileStorageRoot } from './mobile-storage-backend.js';

async function run() {
  const baseDir = path.resolve(process.cwd(), 'mobile', 'shell', '.verify-storage');
  await fs.rm(baseDir, { recursive: true, force: true });

  const explicitRoot = resolveMobileStorageRoot({ baseDir });
  const hostRoot = resolveMobileStorageRoot({ hostPaths: { appStorage: 'C:/virtual-android-data/Gamefy' } });

  const backend = createMobileFileStorageBackend({ baseDir });
  const first = await backend.writeSettings('gamefy-local-settings-v1', { uiThemeId: 'custom' });
  const second = await backend.writeSettings('gamefy-local-settings-v1', { uiThemeCustomColor: '#abcdef' });
  const merged = await backend.readSettings('gamefy-local-settings-v1');

  await backend.writeRaw('state:demo', '{"ok":true}');
  const rereadRaw = await backend.readRaw('state:demo');
  await backend.removeRaw('state:demo');
  const removedRaw = await backend.readRaw('state:demo');

  process.stdout.write(`${JSON.stringify({
    runtimeFamily: 'mobile-storage-backend-verify',
    root: backend.root,
    explicitStrategy: explicitRoot.strategy,
    hostStrategy: hostRoot.strategy,
    hostBaseDir: hostRoot.baseDir,
    settingsRoundTrip: Boolean(first && second),
    settingsMerged: merged?.uiThemeId === 'custom' && merged?.uiThemeCustomColor === '#abcdef',
    rawWriteRead: rereadRaw === '{"ok":true}',
    rawRemove: removedRaw === null,
  }, null, 2)}\n`);
}

await run();
