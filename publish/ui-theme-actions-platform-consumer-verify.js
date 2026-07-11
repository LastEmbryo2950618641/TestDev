import fs from 'node:fs';
import vm from 'node:vm';

function createStorageSource(initial = {}) {
  const state = { ...initial };
  return {
    read(key = 'gamefy-local-settings-v1') {
      return state[key] || {};
    },
    write(key = 'gamefy-local-settings-v1', patch = {}) {
      state[key] = { ...(state[key] || {}), ...patch };
      return true;
    },
  };
}

const documentElementState = {
  attributes: {},
  styles: {},
};

const documentMock = {
  documentElement: {
    setAttribute(name, value) {
      documentElementState.attributes[name] = value;
    },
    removeAttribute(name) {
      delete documentElementState.attributes[name];
    },
    style: {
      setProperty(name, value) {
        documentElementState.styles[name] = value;
      },
      removeProperty(name) {
        delete documentElementState.styles[name];
      },
    },
  },
};

const localSettingsApi = {
  storage: createStorageSource({
    'gamefy-local-settings-v1': {
      uiThemeId: 'custom',
      uiThemeCustomColor: '#123456',
    },
  }),
  readStored() {
    return this.storage.read('gamefy-local-settings-v1');
  },
  writeStored(patch = {}) {
    return this.storage.write('gamefy-local-settings-v1', patch);
  },
};

const context = {
  window: {
    GameModules: {
      localSettings: localSettingsApi,
    },
  },
  document: documentMock,
  console,
};
context.window.window = context.window;
context.GameModules = context.window.GameModules;
vm.createContext(context);
vm.runInContext(fs.readFileSync('./publish/ui-theme-actions.js', 'utf8'), context);

process.stdout.write(
  JSON.stringify(
    {
      runtimeFamily: 'ui-theme-actions-platform-consumer-verify',
      dataUiTheme: documentElementState.attributes['data-ui-theme'] || null,
      dataUiDensity: documentElementState.attributes['data-ui-density'] || null,
      uiAccent: documentElementState.styles['--ui-accent'] || null,
      currentStoredTheme: context.window.GameModules.localSettings.readStored().uiThemeId || null,
    },
    null,
    2,
  ) + '\n',
);
