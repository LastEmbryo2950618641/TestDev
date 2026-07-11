import { attachBrowserPlatformCore, readBrowserUiSettings } from './browser-core.js';

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

function createMockWindow(initialSettings = {}) {
  const storage = createMemoryStorage({
    'gamefy-local-settings-v1': JSON.stringify(initialSettings),
  });

  return {
    localStorage: storage,
    GameModules: {},
  };
}

const mockWindow = createMockWindow({
  uiThemeId: 'custom',
  uiThemeCustomColor: '#abcdef',
});

const core = attachBrowserPlatformCore(mockWindow);
const settings = readBrowserUiSettings(mockWindow);

process.stdout.write(
  JSON.stringify(
    {
      runtimeFamily: 'browser-platform-core-verify',
      attachments: mockWindow.GameModules?.platform?.browser?.attachments || null,
      hasStorageCore: Boolean(core?.storage?.localSettingsSource),
      uiThemeId: settings.uiThemeId || null,
      uiThemeCustomColor: settings.uiThemeCustomColor || null,
    },
    null,
    2,
  ) + '\n',
);
