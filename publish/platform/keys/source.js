window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};

window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.keys = window.GameModules.platform.keys || {};

window.GameModules.platform.keys.source = {
  async fetchText(path = '') {
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) return '';
      return String(await res.text()).trim();
    } catch (_) {
      return '';
    }
  },

  async readDeepseekKey() {
    return this.fetchText('/deepseek_key.txt');
  },

  async readPixaiKey() {
    for (const path of ['/pixai_key.txt', '/pixatart_key.txt']) {
      const key = await this.fetchText(path);
      if (key) return key;
    }
    return '';
  },
};

window.GameModules.platform.core.keys = window.GameModules.platform.keys.source;
window.GameModules.platform.keySource = window.GameModules.platform.keys.source;
