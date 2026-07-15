window.GameModules = window.GameModules || {};

window.GameModules.rootKeyAutofill = {
  applyGeneratedKeys(store) {
    if (!store?.settingsState) return false;
    const generated = window.GameModules.generatedKeys || {};
    if (!String(store.settingsState.deepseekApiKey || '').trim()) {
      store.settingsState.deepseekApiKey = String(generated.deepseekKey || '').trim();
    }
    if (!String(store.settingsState.pixaiApiKey || '').trim()) {
      store.settingsState.pixaiApiKey = String(generated.pixaiKey || '').trim();
    }
    return Boolean(String(generated.deepseekKey || '').trim() || String(generated.pixaiKey || '').trim());
  },

  async readFromDesktopBridge(store) {
    const bridge = window.electron?.keys || window.GameModules.platformBridge?.keys || window.GameModules.platform?.keys || null;
    if (!bridge) return false;
    if (store?.settingsState) {
      if (!String(store.settingsState.deepseekApiKey || '').trim() && typeof bridge.readDeepseekKey === 'function') {
        store.settingsState.deepseekApiKey = String(await bridge.readDeepseekKey(window)).trim();
      }
      if (!String(store.settingsState.pixaiApiKey || '').trim() && typeof bridge.readPixaiKey === 'function') {
        store.settingsState.pixaiApiKey = String(await bridge.readPixaiKey(window)).trim();
      }
    }
    return true;
  },

  async readTextFileCandidates(paths = []) {
    for (const path of paths) {
      const normalized = String(path || '').trim();
      if (!normalized) continue;
      try {
        const response = await fetch(normalized, { cache: 'no-cache' });
        if (!response.ok) continue;
        const text = String(await response.text());
        return text.replace(/^\uFEFF/, '').trim();
      } catch (_) {}
    }
    return '';
  },

  rootDir() {
    try {
      const href = String(window.location?.href || '');
      if (!href) return '';
      const url = new URL(href);
      if (url.protocol !== 'file:') return '';
      const pathname = decodeURIComponent(url.pathname || '').replace(/^\/+/, '');
      const normalized = pathname.replace(/\\/g, '/');
      const marker = '/publish/index.html';
      const index = normalized.lastIndexOf(marker);
      if (index < 0) return '';
      return normalized.slice(0, index);
    } catch (_) {
      return '';
    }
  },

  async applyToStore(store) {
    if (!store?.settingsState) return;
    if (this.applyGeneratedKeys(store)) return;
    const usedBridge = await this.readFromDesktopBridge(store);
    if (usedBridge) return;
    const settings = store.settingsState;
    if (!String(settings.deepseekApiKey || '').trim()) {
      settings.deepseekApiKey = await this.readTextFileCandidates([
        `file:///${this.rootDir()}/deepseek_key.txt`,
        '../deepseek_key.txt',
      ]);
    }
    if (!String(settings.pixaiApiKey || '').trim()) {
      settings.pixaiApiKey = await this.readTextFileCandidates([
        `file:///${this.rootDir()}/pixatart_key.txt`,
        `file:///${this.rootDir()}/pixai_key.txt`,
        '../pixatart_key.txt',
        '../pixai_key.txt',
      ]);
    }
  },

  scheduleApply(store) {
    Promise.resolve().then(() => this.applyToStore(store)).catch(() => {});
  },
};