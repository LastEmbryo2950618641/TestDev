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
      const provider = window.GameModules.aiProvider?.currentProvider?.();
      const info = await provider?.getUserInfo?.();
      if (info?.name && !this.playerName && !this.playerProfile.name) this.playerName = info.name;
    } catch (err) {
      console.warn('读取用户信息失败:', err.code, err.message);
    }

    try {
      const result = await window.GameModules.aiProvider?.currentProvider?.()?.listTextModels?.();
      window.GameModules.tokenStats?.syncModelPrices?.(result);
      const models = this.enrichTextModelsWithThinking?.(result) || (Array.isArray(result?.models) ? result.models : []);
      const selected = this.resolvePreferredTextModel?.(models, this.modelId || this.settingsState?.textModelId || result?.defaultModel) || this.modelId || result?.defaultModel || models[0]?.internalName;
      if (this.settingsState) {
        this.settingsState.textModels = models.length ? models : this.settingsState.textModels;
        this.settingsState.textModelId = selected || this.settingsState.textModelId;
      }
      this.modelId = selected || this.modelId;
    } catch (err) {
      console.warn('读取模型列表失败:', err.code, err.message);
    }
  },

  ensureCatalogSelection() {
    if (!this.works.some((work) => work.name === this.selectedWork)) this.selectedWork = window.GameModules.catalog.firstWork();
    if (!window.GameModules.catalog.find(this.selectedCharacterId)) this.selectedCharacterId = window.GameModules.catalog.firstCharacter(this.selectedWork) || this.selectedCharacterId;
  },
};
