// Desktop keys bridge draft
const KEY_CHANNELS = ['electron', 'tauri', 'nativeBridge'];

function detectKeyChannel(target = globalThis) {
  if (typeof target?.electron !== 'undefined') return 'electron';
  if (typeof target?.tauri !== 'undefined') return 'tauri';
  if (typeof target?.nativeBridge !== 'undefined') return 'nativeBridge';
  return '';
}

function notImplemented(method, channel = '') {
  const detail = channel ? ` for ${channel}` : '';
  return new Error(`desktop keys bridge ${method} not implemented${detail}`);
}

export const desktopKeysBridge = {
  channel(target = globalThis) {
    return detectKeyChannel(target);
  },

  providerSources() {
    return {
      deepseek: ['secureStore', 'env', 'desktopFile'],
      pixai: ['secureStore', 'env', 'desktopFile'],
    };
  },

  capabilities(target = globalThis) {
    const channel = this.channel(target);
    return {
      ready: Boolean(channel),
      channel,
      supportedChannels: KEY_CHANNELS.slice(),
      providerSources: this.providerSources(),
      canReadDeepseekKey: Boolean(channel),
      canReadPixaiKey: Boolean(channel),
    };
  },

  async readDeepseekKey(target = globalThis) {
    throw notImplemented('readDeepseekKey', this.channel(target));
  },

  async readPixaiKey(target = globalThis) {
    throw notImplemented('readPixaiKey', this.channel(target));
  },
};
