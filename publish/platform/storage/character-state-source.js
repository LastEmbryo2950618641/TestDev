window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.storage = window.GameModules.platform.storage || {};

window.GameModules.platform.storage.characterStateSource = {
  get(id = '') {
    return window.GameModules.sqliteSave?.getCharacterState?.(id) || null;
  },

  getByName(name = '') {
    return window.GameModules.sqliteSave?.getCharacterStateByName?.(name) || null;
  },

  resolve(target = '') {
    const key = String(target || '').trim();
    if (!key) return null;
    return this.get(key) || this.getByName(key) || null;
  },

  list() {
    return window.GameModules.sqliteSave?.listCharacterStates?.() || [];
  },

  save(state = null) {
    return window.GameModules.sqliteSave?.saveCharacterState?.(state);
  },
};

window.GameModules.platform.core.storage = window.GameModules.platform.core.storage || {};
window.GameModules.platform.core.storage.characterStateSource = window.GameModules.platform.storage.characterStateSource;
