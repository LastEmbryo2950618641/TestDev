// Desktop assets bridge draft
const ASSET_CHANNELS = ['electron', 'tauri', 'nativeBridge'];
const BODY_FIGURE_ROOT = 'assets/body-figures';

function detectAssetChannel(target = globalThis) {
  if (typeof target?.electron !== 'undefined') return 'electron';
  if (typeof target?.tauri !== 'undefined') return 'tauri';
  if (typeof target?.nativeBridge !== 'undefined') return 'nativeBridge';
  return '';
}

function notImplemented(method, channel = '') {
  const detail = channel ? ` for ${channel}` : '';
  return new Error(`desktop assets bridge ${method} not implemented${detail}`);
}

export const desktopAssetsBridge = {
  channel(target = globalThis) {
    return detectAssetChannel(target);
  },

  bodyFigureRoot() {
    return BODY_FIGURE_ROOT;
  },

  capabilities(target = globalThis) {
    const channel = this.channel(target);
    return {
      ready: Boolean(channel),
      channel,
      supportedChannels: ASSET_CHANNELS.slice(),
      bodyFigureRoot: this.bodyFigureRoot(),
      canLoadIndex: Boolean(channel),
      canSaveMeta: Boolean(channel),
      canSaveImage: Boolean(channel),
    };
  },

  assetBasePath(relative = '') {
    return `${this.bodyFigureRoot()}/${String(relative || '').replace(/^\/+/, '')}`;
  },

  async loadIndex(target = globalThis) {
    throw notImplemented('loadIndex', this.channel(target));
  },

  async saveMeta(_payload = {}, target = globalThis) {
    throw notImplemented('saveMeta', this.channel(target));
  },

  async saveImage(_payload = {}, target = globalThis) {
    throw notImplemented('saveImage', this.channel(target));
  },
};
