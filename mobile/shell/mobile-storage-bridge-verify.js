import fs from 'node:fs/promises';
import path from 'node:path';
import { mobileStorageBridge } from './bridge/storage.js';
import { createMobileFileStorageBackend } from './mobile-storage-backend.js';

function createVerifyBaseDir() {
  return path.resolve(process.cwd(), 'mobile', 'shell', '.bridge-verify-storage');
}

async function createMockMobileTarget() {
  const baseDir = createVerifyBaseDir();
  await fs.rm(baseDir, { recursive: true, force: true });

  const target = {
    androidBridge: {
      storage: createMobileFileStorageBackend({ baseDir }),
    },
  };
  target.window = target;
  return target;
}

async function run() {
  const target = await createMockMobileTarget();
  const failures = [];
  const capabilities = mobileStorageBridge.capabilities(target);

  let settingsRoundTrip = false;
  let settingsMerged = false;
  let rawWriteRead = false;
  let rawRemove = false;

  try {
    const initial = await mobileStorageBridge.readSettings('gamefy-local-settings-v1', target);
    if (JSON.stringify(initial || {}) !== JSON.stringify({})) failures.push('settings:initial-read');
    await mobileStorageBridge.writeSettings('gamefy-local-settings-v1', { uiThemeId: 'custom' }, target);
    await mobileStorageBridge.writeSettings('gamefy-local-settings-v1', { uiThemeCustomColor: '#abcdef' }, target);
    const reread = await mobileStorageBridge.readSettings('gamefy-local-settings-v1', target);
    settingsRoundTrip = Boolean(reread);
    settingsMerged = reread?.uiThemeId === 'custom' && reread?.uiThemeCustomColor === '#abcdef';
    if (!settingsRoundTrip) failures.push('settings:round-trip');
    if (!settingsMerged) failures.push('settings:merge');
  } catch {
    failures.push('settings:error');
  }

  try {
    const initial = await mobileStorageBridge.readRaw('state:demo', target);
    if (initial !== null) failures.push('raw:initial-read');
    await mobileStorageBridge.writeRaw('state:demo', '{"ok":true}', target);
    const reread = await mobileStorageBridge.readRaw('state:demo', target);
    rawWriteRead = reread === '{"ok":true}';
    await mobileStorageBridge.removeRaw('state:demo', target);
    const removed = await mobileStorageBridge.readRaw('state:demo', target);
    rawRemove = removed === null;
    if (!rawWriteRead) failures.push('raw:write-read');
    if (!rawRemove) failures.push('raw:remove');
  } catch {
    failures.push('raw:error');
  }

  process.stdout.write(JSON.stringify({
    runtimeFamily: 'mobile-storage-bridge-verify',
    hostKind: 'mobile',
    channel: mobileStorageBridge.channel(target),
    bridgeReady: capabilities.ready,
    sourceShape: mobileStorageBridge.sourceShape(),
    settingsRoundTrip,
    settingsMerged,
    rawWriteRead,
    rawRemove,
    failures,
    note: 'mobile storage bridge now validates against androidBridge.storage with a host-local backend skeleton',
  }, null, 2) + '\n');
}

await run();
