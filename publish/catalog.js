/**
 * Fate 作品与可操控角色目录。
 */
window.GameModules = window.GameModules || {};

window.GameModules.catalog = {
  data: null,

  async load() {
    if (this.data) return this.data;
    if (window.GameData?.characterCatalog) {
      this.data = window.GameData.characterCatalog;
      return this.data;
    }
    throw new Error('角色目录未加载');
  },

  firstWork() {
    return this.data?.works?.[0]?.name || '';
  },

  works() {
    return this.data?.works || [];
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
