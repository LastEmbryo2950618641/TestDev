window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.storage = window.GameModules.platform.storage || {};

window.GameModules.platform.storage.rpgDefinitionSource = {
  getAttributes(worldTag = '') {
    return window.GameModules.sqliteSave?.getWorldAttributes?.(worldTag) || null;
  },

  saveAttributes(worldTag = '', attributes = null) {
    return window.GameModules.sqliteSave?.saveWorldAttributes?.(worldTag, attributes);
  },

  getSchema(worldTag = '') {
    return window.GameModules.sqliteSave?.getSchema?.(worldTag) || null;
  },

  saveSchema(worldTag = '', schema = null) {
    return window.GameModules.sqliteSave?.saveSchema?.(worldTag, schema);
  },
};

window.GameModules.platform.core.storage = window.GameModules.platform.core.storage || {};
window.GameModules.platform.core.storage.rpgDefinitionSource = window.GameModules.platform.storage.rpgDefinitionSource;
