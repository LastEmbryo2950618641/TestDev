import { desktopStorageBridge } from './bridge/storage.js';

function createMockDesktopTarget() {
  const settingsState = new Map();
  const rawState = new Map();

  return {
    electron: {
      storage: {
        async readSettings(key = 'gamefy-local-settings-v1') {
          return { ...(settingsState.get(key) || {}) };
        },
        async writeSettings(key = 'gamefy-local-settings-v1', patch = {}) {
          const nextValue = {
            ...(settingsState.get(key) || {}),
            ...(patch || {}),
          };
          settingsState.set(key, nextValue);
          return { ...nextValue };
        },
        async readRaw(slot) {
          return rawState.has(slot) ? rawState.get(slot) : null;
        },
        async writeRaw(slot, raw) {
          rawState.set(slot, raw);
          return raw;
        },
        async removeRaw(slot) {
          rawState.delete(slot);
          return true;
        },
      },
    },
  };
}

async function run() {
  const target = createMockDesktopTarget();
  const channel = desktopStorageBridge.channel(target);
  const sourceShape = desktopStorageBridge.sourceShape();
  const bridgeCapabilities = desktopStorageBridge.capabilities(target);
  const failures = [];

  let settingsRoundTrip = false;
  let settingsMerged = false;
  let rawWriteRead = false;
  let rawRemove = false;

  try {
    const initial = await desktopStorageBridge.readSettings('gamefy-local-settings-v1', target);
    if (JSON.stringify(initial || {}) !== JSON.stringify({})) failures.push('settings:initial-read');
    const first = await desktopStorageBridge.writeSettings('gamefy-local-settings-v1', { uiThemeId: 'custom' }, target);
    const second = await desktopStorageBridge.writeSettings('gamefy-local-settings-v1', { uiThemeCustomColor: '#abcdef' }, target);
    const reread = await desktopStorageBridge.readSettings('gamefy-local-settings-v1', target);
    settingsRoundTrip = Boolean(first && second && reread);
    settingsMerged = reread?.uiThemeId === 'custom' && reread?.uiThemeCustomColor === '#abcdef';
    if (!settingsRoundTrip) failures.push('settings:round-trip');
    if (!settingsMerged) failures.push('settings:merge');
  } catch {
    failures.push('settings:error');
  }

  try {
    const initial = await desktopStorageBridge.readRaw('state:demo', target);
    if (initial !== null) failures.push('raw:initial-read');
    await desktopStorageBridge.writeRaw('state:demo', '{"ok":true}', target);
    const reread = await desktopStorageBridge.readRaw('state:demo', target);
    rawWriteRead = reread === '{"ok":true}';
    await desktopStorageBridge.removeRaw('state:demo', target);
    const removed = await desktopStorageBridge.readRaw('state:demo', target);
    rawRemove = removed === null;
    if (!rawWriteRead) failures.push('raw:write-read');
    if (!rawRemove) failures.push('raw:remove');
  } catch {
    failures.push('raw:error');
  }

  process.stdout.write(JSON.stringify({
    runtimeFamily: 'desktop-storage-bridge-verify',
    channel,
    bridgeReady: bridgeCapabilities.ready,
    sourceShape,
    settingsRoundTrip,
    settingsMerged,
    rawWriteRead,
    rawRemove,
    failures,
    note: 'bridge now validates desktopStorageBridge against the electron.storage contract; real host backend is still pending',
  }, null, 2) + '\n');
}

await run();

