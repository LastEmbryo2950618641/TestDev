// Desktop host bridge draft
const DEFAULT_CHANNELS = ['electron', 'tauri', 'nativeBridge'];

function hasChannel(target, key) {
  return typeof target?.[key] !== 'undefined';
}

export const desktopHostBridge = {
  kind() {
    return 'desktop';
  },

  isDesktop() {
    return true;
  },

  isMobile() {
    return false;
  },

  isDev(target = globalThis) {
    const host = String(target?.location?.hostname || '').toLowerCase();
    return host === '127.0.0.1' || host === 'localhost' || host.endsWith('.local') || host === '';
  },

  bridgeStatus(target = globalThis) {
    const channelState = {};
    DEFAULT_CHANNELS.forEach((key) => {
      channelState[key] = hasChannel(target, key);
    });
    const ready = Object.values(channelState).some(Boolean);
    return {
      ready,
      channels: channelState,
      preferred: channelState.electron ? 'electron' : channelState.tauri ? 'tauri' : channelState.nativeBridge ? 'nativeBridge' : '',
    };
  },

  capabilities(target = globalThis) {
    const bridge = this.bridgeStatus(target);
    return {
      kind: this.kind(),
      isDesktop: this.isDesktop(),
      isMobile: this.isMobile(),
      isDev: this.isDev(target),
      bridgeReady: bridge.ready,
      bridgeChannels: bridge.channels,
      preferredBridge: bridge.preferred,
      files: true,
      storage: true,
      windowing: true,
      notifications: false,
    };
  },

  async ready(target = globalThis) {
    return this.bridgeStatus(target).ready;
  },
};
