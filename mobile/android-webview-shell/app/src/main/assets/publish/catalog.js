/**
 * Fate 作品与可操控角色目录。
 */
window.GameModules = window.GameModules || {};

window.GameModules.catalog = {
  data: null,

  async load() {
    if (window.GameModules.cache.enabled('catalog') && this.data) return this.data;
    const data = window.GameData?.characterCatalog;
    if (data) {
      if (window.GameModules.cache.enabled('catalog')) this.data = data;
      return data;
    }
    throw new Error('角色目录未加载');
  },

  current() {
    return window.GameModules.cache.enabled('catalog') ? this.data : window.GameData?.characterCatalog;
  },

  firstWork() {
    return this.current()?.works?.[0]?.name || '';
  },

  works() {
    return this.current()?.works || [];
  },

  characters(workName) {
    return this.works().find((work) => work.name === workName)?.characters || [];
  },

  firstCharacter(workName) {
    return this.characters(workName)[0]?.id || '';
  },

  find(characterId) {
    for (const work of this.works()) {
      const found = work.characters.find((character) => character.id === characterId);
      if (found) return found;
    }
    return null;
  },
};
