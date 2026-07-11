// Desktop files bridge draft
const FILE_CHANNELS = ['electron', 'tauri', 'nativeBridge'];

function detectFileChannel(target = globalThis) {
  if (typeof target?.electron !== 'undefined') return 'electron';
  if (typeof target?.tauri !== 'undefined') return 'tauri';
  if (typeof target?.nativeBridge !== 'undefined') return 'nativeBridge';
  return '';
}

function notImplemented(method, channel = '') {
  const detail = channel ? ` for ${channel}` : '';
  return new Error(`desktop files bridge ${method} not implemented${detail}`);
}

export const desktopFilesBridge = {
  channel(target = globalThis) {
    return detectFileChannel(target);
  },

  capabilities(target = globalThis) {
    const channel = this.channel(target);
    return {
      ready: Boolean(channel),
      channel,
      supportedChannels: FILE_CHANNELS.slice(),
      canPickFile: Boolean(channel),
      canSaveFile: Boolean(channel),
      canReadText: Boolean(channel),
      canWriteText: Boolean(channel),
      canReadJson: Boolean(channel),
      canWriteJson: Boolean(channel),
    };
  },

  async readText(_pathValue, target = globalThis) {
    throw notImplemented('readText', this.channel(target));
  },

  async writeText(_pathValue, _value, target = globalThis) {
    throw notImplemented('writeText', this.channel(target));
  },

  async readJson(pathValue, target = globalThis) {
    const textValue = await this.readText(pathValue, target);
    return textValue ? JSON.parse(textValue) : null;
  },

  async writeJson(pathValue, value, target = globalThis) {
    return this.writeText(pathValue, JSON.stringify(value, null, 2), target);
  },

  async pickFile(_options = {}, target = globalThis) {
    throw notImplemented('pickFile', this.channel(target));
  },

  async saveFile(_options = {}, target = globalThis) {
    throw notImplemented('saveFile', this.channel(target));
  },
};
