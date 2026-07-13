window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.storage = window.GameModules.platform.storage || {};

window.GameModules.platform.storage.characterIntroSource = {
  get(name = '', worldTag = '') {
    return window.GameModules.sqliteSave?.getCharacterIntro?.(name, worldTag) || null;
  },

  list() {
    return window.GameModules.sqliteSave?.listCharacterIntros?.() || [];
  },

  save(card = null) {
    return window.GameModules.sqliteSave?.saveCharacterIntro?.(card);
  },
};

window.GameModules.platform.core.storage = window.GameModules.platform.core.storage || {};
window.GameModules.platform.core.storage.characterIntroSource = window.GameModules.platform.storage.characterIntroSource;
