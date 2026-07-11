window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.assets = window.GameModules.platform.assets || {};

window.GameModules.platform.assets.bodyFigure = {
  assetBasePath(relative = '') {
    return `assets/body-figures/${String(relative || '').replace(/^\/+/, '')}`;
  },

  loadIndex() {
    return fetch('/__dev/body-figure-index', { cache: 'no-cache' });
  },

  saveMeta(payload = {}) {
    return fetch('/__dev/body-figure-meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
  },

  saveImage(payload = {}) {
    return fetch('/__dev/body-figure-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
  },
};

window.GameModules.platform.core.assets = window.GameModules.platform.core.assets || {};
window.GameModules.platform.core.assets.bodyFigure = window.GameModules.platform.assets.bodyFigure;
window.GameModules.platform.bodyFigureSource = window.GameModules.platform.assets.bodyFigure;
