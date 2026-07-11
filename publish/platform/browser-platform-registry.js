import { createSharedPlatformCapabilityRegistryWithAssetsAndKeys } from './shared-capability-registry.js';
import { createSharedPlatformPreflightReport } from './platform-preflight-report.js';
import { attachBrowserPlatformCore } from './browser-core.js';
import { createBrowserSharedFilesCapabilityContract } from './browser-shared-files-contract.js';
import { createBrowserSharedAssetsCapabilityContract } from './browser-shared-assets-contract.js';
import { createBrowserSharedKeysCapabilityContract } from './browser-shared-keys-contract.js';
import { createSharedStorageRuntimeContract } from './storage/shared-runtime-contract.js';

function createMemoryStorage(initialValue = {}) {
  const state = { ...initialValue };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(state, key) ? state[key] : null;
    },
    setItem(key, value) {
      state[key] = String(value);
    },
  };
}

function createBrowserFilesRuntime() {
  return {
    async readText(file) {
      if (!file) return '';
      if (typeof file.text === 'function') return file.text();
      return '';
    },
    async readJson(file) {
      const textValue = await this.readText(file);
      return textValue ? JSON.parse(textValue) : null;
    },
    async writeText(pathValue, value) {
      return this.saveFile({ path: pathValue, content: value, mimeType: 'text/plain;charset=utf-8' });
    },
    async writeJson(pathValue, value) {
      return this.saveFile({ path: pathValue, content: JSON.stringify(value, null, 2), mimeType: 'application/json;charset=utf-8' });
    },
    async pickFile() {
      return null;
    },
    async saveFile(options = {}) {
      return {
        ok: true,
        fileName: String(options.fileName || options.path || 'download.txt'),
        mimeType: String(options.mimeType || 'application/octet-stream'),
      };
    },
  };
}

function createBrowserRegistryTarget() {
  const target = {
    localStorage: createMemoryStorage({
      'gamefy-local-settings-v1': JSON.stringify({ uiThemeId: 'custom' }),
    }),
    GameModules: {},
    navigator: { userAgent: 'Browser Platform Registry' },
  };
  target.window = target;
  attachBrowserPlatformCore(target);
  target.GameModules.platform = target.GameModules.platform || {};
  target.GameModules.platform.files = target.GameModules.platform.files || {};
  target.GameModules.platform.files.browser = target.GameModules.platform.files.browser || createBrowserFilesRuntime();
  target.GameModules.platform.core.files = target.GameModules.platform.core.files || target.GameModules.platform.files.browser;
  target.GameModules.platform.core.assets = target.GameModules.platform.core.assets || {};
  target.GameModules.platform.core.assets.bodyFigure = target.GameModules.platform.core.assets.bodyFigure || {
    async loadIndex() { return []; },
    async saveMeta() { return { ok: true }; },
    async saveImage() { return { ok: true }; },
  };
  target.GameModules.platform.core.keys = target.GameModules.platform.core.keys || {
    async readDeepseekKey() { return ''; },
    async readPixaiKey() { return ''; },
  };
  return target;
}

function createBrowserRuntimeContract() {
  return {
    runtimeFamily: 'browser-runtime-contract',
    hostKind: 'browser',
    shellLocalOnly: false,
    publishTouched: true,
    ready: true,
    renderer: {
      entry: 'publish/index.html',
      strategy: 'direct-browser-load',
    },
  };
}

function createBrowserStorageContract(target) {
  const source = target?.GameModules?.platform?.core?.storage?.localSettingsSource;
  return createSharedStorageRuntimeContract({
    hostKind: 'browser',
    shellLocalOnly: false,
    publishTouched: true,
    channel: 'localStorage',
    capabilities: {
      ready: Boolean(source),
      canReadRaw: false,
      canWriteRaw: false,
      canRemoveRaw: false,
      canReadSettings: typeof source?.read === 'function',
      canWriteSettings: typeof source?.write === 'function',
    },
    sources: {
      raw: [],
      settings: ['read', 'write'],
    },
    fallback: {
      browserCore: 'window.GameModules.platform.core.storage.localSettingsSource',
    },
    checkpoints: {
      sourceShapeReady: true,
      capabilitiesReady: Boolean(source),
      fallbackReady: true,
    },
  });
}

function createBrowserHostContract() {
  return {
    runtimeFamily: 'browser-host-capability-contract',
    hostKind: 'browser',
    shellLocalOnly: false,
    publishTouched: true,
    ready: true,
    bridge: {
      ready: true,
      preferred: 'browser-core',
      channels: {
        storage: 'localStorage',
        files: 'browser-files',
        assets: 'browser-assets',
        keys: 'browser-keys',
      },
    },
    environment: {
      isDesktop: false,
      isMobile: false,
      isDev: true,
    },
    features: {
      files: true,
      storage: true,
      windowing: true,
      webview: false,
      notifications: false,
      permissions: false,
    },
  };
}

export function createBrowserPlatformCapabilityRegistry(target = createBrowserRegistryTarget()) {
  const runtime = createBrowserRuntimeContract();
  const storage = createBrowserStorageContract(target);
  const host = createBrowserHostContract();
  const files = createBrowserSharedFilesCapabilityContract(target);
  const assets = createBrowserSharedAssetsCapabilityContract(target);
  const keys = createBrowserSharedKeysCapabilityContract(target);

  return createSharedPlatformCapabilityRegistryWithAssetsAndKeys({
    hostKind: 'browser',
    runtime,
    storage,
    host,
    files,
    assets,
    keys,
  });
}

export function createBrowserPlatformPreflightReport(target = createBrowserRegistryTarget()) {
  const registry = createBrowserPlatformCapabilityRegistry(target);
  return createSharedPlatformPreflightReport(registry);
}
