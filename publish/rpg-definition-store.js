window.GameModules = window.GameModules || {};

window.GameModules.rpgDefinitionStore = {
  source() {
    return window.GameModules.platform?.storage?.rpgDefinitionSource
      || window.GameModules.platform?.core?.storage?.rpgDefinitionSource
      || null;
  },

  getAttributes(worldTag = '') {
    return this.source()?.getAttributes?.(worldTag) || null;
  },

  saveAttributes(worldTag = '', attributes = null) {
    return this.source()?.saveAttributes?.(worldTag, attributes);
  },

  getSchema(worldTag = '') {
    return this.source()?.getSchema?.(worldTag) || null;
  },

  saveSchema(worldTag = '', schema = null) {
    return this.source()?.saveSchema?.(worldTag, schema);
  },
};
