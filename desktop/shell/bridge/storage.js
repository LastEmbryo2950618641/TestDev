// Desktop storage bridge
const STORAGE_CHANNELS = ['electron', 'tauri', 'nativeBridge'];
const DEFAULT_SETTINGS_KEY = 'gamefy-local-settings-v1';

function detectStorageChannel(target = globalThis) {
  if (typeof target?.electron !== 'undefined') return 'electron';
  if (typeof target?.tauri !== 'undefined') return 'tauri';
  if (typeof target?.nativeBridge !== 'undefined') return 'nativeBridge';
  return '';
}

function notImplemented(method, channel = '') {
  const detail = channel ? ` for ${channel}` : '';
  return new Error(`desktop storage bridge ${method} not implemented${detail}`);
}

function resolveElectronStorage(target = globalThis) {
  return target?.electron?.storage || null;
}

function ensureElectronMethod(method, target = globalThis) {
  const storage = resolveElectronStorage(target);
  if (storage && typeof storage[method] === 'function') return storage[method].bind(storage);
  throw notImplemented(method, 'electron');
}

function hasElectronMethod(method, target = globalThis) {
  const storage = resolveElectronStorage(target);
  return typeof storage?.[method] === 'function';
}

export const desktopStorageBridge = {
  channel(target = globalThis) {
    return detectStorageChannel(target);
  },

  capabilities(target = globalThis) {
    const channel = this.channel(target);
    const isElectron = channel === 'electron';
    return {
      ready: isElectron
        ? ['readRaw', 'writeRaw', 'removeRaw', 'readSettings', 'writeSettings'].every((method) => hasElectronMethod(method, target))
        : Boolean(channel),
      channel,
      supportedChannels: STORAGE_CHANNELS.slice(),
      canReadRaw: isElectron ? hasElectronMethod('readRaw', target) : Boolean(channel),
      canWriteRaw: isElectron ? hasElectronMethod('writeRaw', target) : Boolean(channel),
      canRemoveRaw: isElectron ? hasElectronMethod('removeRaw', target) : Boolean(channel),
      canReadSettings: isElectron ? hasElectronMethod('readSettings', target) : Boolean(channel),
      canWriteSettings: isElectron ? hasElectronMethod('writeSettings', target) : Boolean(channel),
    };
  },

  sourceShape() {
    return {
      raw: ['readRaw', 'writeRaw', 'removeRaw'],
      settings: ['readSettings', 'writeSettings'],
    };
  },

  async readRaw(slot, target = globalThis) {
    const channel = this.channel(target);
    if (channel === 'electron') {
      return ensureElectronMethod('readRaw', target)(slot);
    }
    throw notImplemented('readRaw', channel);
  },

  async writeRaw(slot, raw, target = globalThis) {
    const channel = this.channel(target);
    if (channel === 'electron') {
      return ensureElectronMethod('writeRaw', target)(slot, raw);
    }
    throw notImplemented('writeRaw', channel);
  },

  async removeRaw(slot, target = globalThis) {
    const channel = this.channel(target);
    if (channel === 'electron') {
      return ensureElectronMethod('removeRaw', target)(slot);
    }
    throw notImplemented('removeRaw', channel);
  },

  async readSettings(key = DEFAULT_SETTINGS_KEY, target = globalThis) {
    const channel = this.channel(target);
    if (channel === 'electron') {
      return ensureElectronMethod('readSettings', target)(key);
    }
    throw notImplemented('readSettings', channel);
  },

  async writeSettings(key = DEFAULT_SETTINGS_KEY, patch = {}, target = globalThis) {
    const channel = this.channel(target);
    if (channel === 'electron') {
      return ensureElectronMethod('writeSettings', target)(key, patch);
    }
    throw notImplemented('writeSettings', channel);
  },
};
