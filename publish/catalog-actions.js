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

  async loadModelAndUser() {
    try {
      const info = await window.dzmm?.user?.info?.();
      if (info?.name && !this.playerName && !this.playerProfile.name) this.playerName = info.name;
    } catch (err) {
      console.warn('读取用户信息失败:', err.code, err.message);
    }

    try {
      const result = await window.dzmm?.models?.list?.();
      window.GameModules.tokenStats?.syncModelPrices?.(result);
      if (this.settingsState) {
        this.settingsState.textModels = Array.isArray(result?.models) ? result.models : this.settingsState.textModels;
        this.settingsState.textModelId = this.modelId || result?.defaultModel || result?.models?.[0]?.internalName || this.settingsState.textModelId;
      }
      this.modelId = this.settingsState?.textModelId || result?.defaultModel || result?.models?.[0]?.internalName || this.modelId;
    } catch (err) {
      console.warn('读取模型列表失败:', err.code, err.message);
    }
  },

  ensureCatalogSelection() {
    if (!this.works.some((work) => work.name === this.selectedWork)) this.selectedWork = window.GameModules.catalog.firstWork();
    if (!window.GameModules.catalog.find(this.selectedCharacterId)) this.selectedCharacterId = window.GameModules.catalog.firstCharacter(this.selectedWork) || this.selectedCharacterId;
  },
};
