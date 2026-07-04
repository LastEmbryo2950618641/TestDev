window.GameModules = window.GameModules || {};

window.GameModules.catalogActions = {
  async loadCatalog() {
    try {
      await window.GameModules.catalog.load();
      this.works = window.GameModules.catalog.works();
      this.selectedWork = this.selectedWork || window.GameModules.catalog.firstWork();
      this.selectedCharacterId = window.GameModules.catalog.firstCharacter(this.selectedWork) || this.selectedCharacterId;
      window.GameModules.characterBrief.ensure(this);
    } catch (err) {
      console.error('角色目录加载失败:', err.message, err.stack);
    }
  },

  async loadStartupPlayerConfig() {
    await window.GameModules.localSettings?.prepareActivation?.(this);
  },

  ensureCatalogSelection() {
    const catalog = window.GameModules.catalog;
    if (!catalog) return;
    try {
      const works = catalog.works?.() || this.works || [];
      if (!this.selectedWork) this.selectedWork = works[0]?.name || '';
      if (!this.selectedCharacterId && this.selectedWork) {
        this.selectedCharacterId = catalog.firstCharacter?.(this.selectedWork) || '';
      }
      const found = this.selectedCharacterId ? catalog.find?.(this.selectedCharacterId) : null;
      if (found) this.character = found;
    } catch (err) {
      console.warn('[角色目录] 恢复目录选择失败:', err?.message || err);
    }
  },
};
