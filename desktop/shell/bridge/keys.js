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

  async readTextFile(filePath, target = globalThis) {
    const channel = this.channel(target);
    if (!channel) throw notImplemented('readTextFile', channel);
    const bridge = target?.electron?.storage || target?.nativeBridge?.storage || target?.tauri?.storage || null;
    if (typeof bridge?.readRaw === 'function') {
      const raw = await bridge.readRaw(filePath);
      return raw == null ? '' : String(raw);
    }
    if (typeof bridge?.readText === 'function') {
      const text = await bridge.readText(filePath);
      return text == null ? '' : String(text);
    }
    throw notImplemented('readTextFile', channel);
  },

  async readDeepseekKey(target = globalThis) {
    const value = await this.readTextFile('deepseek_key.txt', target);
    return String(value || '').trim();
  },

  async readPixaiKey(target = globalThis) {
    const candidates = ['pixatart_key.txt', 'pixai_key.txt'];
    for (const candidate of candidates) {
      const value = String(await this.readTextFile(candidate, target) || '').trim();
      if (value) return value;
    }
    return '';
  },
};
