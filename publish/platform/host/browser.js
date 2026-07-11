window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.host = window.GameModules.platform.host || {};

window.GameModules.platform.host.browser = {
  kind() {
    const ua = String(navigator?.userAgent || '').toLowerCase();
    const hasDzmm = typeof window.dzmm !== 'undefined';
    const isMobileUa = /android|iphone|ipad|ipod|mobile/i.test(ua);
    if (hasDzmm) return 'desktop';
    if (isMobileUa) return 'mobile-web';
    return 'web';
  },

  isDesktop() {
    return this.kind() === 'desktop';
  },

  isMobile() {
    return this.kind() === 'mobile-web';
  },

  isDev() {
    const host = String(location?.hostname || '').toLowerCase();
    return host === '127.0.0.1' || host === 'localhost' || host.endsWith('.local');
  },

  capabilities() {
    return {
      kind: this.kind(),
      isDesktop: this.isDesktop(),
      isMobile: this.isMobile(),
      isDev: this.isDev(),
      hasDzmm: typeof window.dzmm !== 'undefined',
      hasLocalStorage: typeof localStorage !== 'undefined',
      hasFetch: typeof fetch === 'function',
      hasFileApi: typeof File !== 'undefined',
      hasClipboard: !!navigator?.clipboard,
    };
  },

  async ready() {
    return true;
  },
};

window.GameModules.platform.core.host = window.GameModules.platform.host.browser;
