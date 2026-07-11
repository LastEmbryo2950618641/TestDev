const STORAGE_METHODS = ['readSettings', 'writeSettings', 'readRaw', 'writeRaw', 'removeRaw'];
const DEFAULT_SETTINGS_KEY = 'gamefy-local-settings-v1';

function resolveAndroidStorage(target = globalThis) {
  return target?.androidBridge?.storage || null;
}

function ensureAndroidMethod(method, target = globalThis) {
  const storage = resolveAndroidStorage(target);
  if (storage && typeof storage[method] === 'function') return storage[method].bind(storage);
  throw new Error(`mobile storage bridge ${method} not implemented for androidBridge`);
}

function hasAndroidMethod(method, target = globalThis) {
  const storage = resolveAndroidStorage(target);
  return typeof storage?.[method] === 'function';
}

export const mobileStorageBridge = {
  channel(target = globalThis) {
    return resolveAndroidStorage(target) ? 'androidBridge' : '';
  },

  capabilities(target = globalThis) {
    const ready = STORAGE_METHODS.every((method) => hasAndroidMethod(method, target));
    return {
      ready,
      channel: this.channel(target),
      supportedChannels: ['androidBridge'],
      canReadRaw: hasAndroidMethod('readRaw', target),
      canWriteRaw: hasAndroidMethod('writeRaw', target),
      canRemoveRaw: hasAndroidMethod('removeRaw', target),
      canReadSettings: hasAndroidMethod('readSettings', target),
      canWriteSettings: hasAndroidMethod('writeSettings', target),
    };
  },

  sourceShape() {
    return {
      raw: ['readRaw', 'writeRaw', 'removeRaw'],
      settings: ['readSettings', 'writeSettings'],
    };
  },

  async readRaw(slot, target = globalThis) {
    return ensureAndroidMethod('readRaw', target)(slot);
  },

  async writeRaw(slot, raw, target = globalThis) {
    return ensureAndroidMethod('writeRaw', target)(slot, raw);
  },

  async removeRaw(slot, target = globalThis) {
    return ensureAndroidMethod('removeRaw', target)(slot);
  },

  async readSettings(key = DEFAULT_SETTINGS_KEY, target = globalThis) {
    return ensureAndroidMethod('readSettings', target)(key);
  },

  async writeSettings(key = DEFAULT_SETTINGS_KEY, patch = {}, target = globalThis) {
    return ensureAndroidMethod('writeSettings', target)(key, patch);
  },
};
