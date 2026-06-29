window.GameModules = window.GameModules || {};

window.GameModules.settingsActions = {
  async openSettingsApp() {
    this.closeDesktopApps?.();
    this.settingsState.open = true;
    this.desktopUnlocked = true;
    await this.loadSettingsModels?.();
  },

  closeSettingsApp() {
    if (this.settingsState) this.settingsState.open = false;
    this.closeAppToDesktop?.();
  },

  async loadSettingsModels(force = false) {
    const s = this.settingsState;
    if (!s || (s.loaded && !force)) return;
    s.loading = true;
    s.error = '';
    try {
      const [textResult, drawResult] = await Promise.all([
        window.dzmm?.models?.list?.(),
        window.dzmm?.draw?.generateModels?.(),
      ]);
      s.textModels = this.enrichTextModelsWithThinking(textResult);
      s.drawModels = Array.isArray(drawResult?.models) && drawResult.models.length ? drawResult.models : this.fallbackDrawModels();
      window.GameModules.tokenStats?.syncModelPrices?.(textResult);
      this.modelId = this.resolvePreferredTextModel(s.textModels, this.modelId || s.textModelId || textResult?.defaultModel);
      s.textModelId = this.modelId;
      s.drawModelId = s.drawModelId || drawResult?.defaultModel || s.drawModels[0]?.id || 'anime';
      s.loaded = true;
    } catch (err) {
      console.warn('[设置] 模型列表加载失败:', err.code, err.message, err.stack);
      s.error = err?.message || '模型列表加载失败，请稍后重试。';
      if (!s.textModels.length) s.textModels = this.fallbackTextModels();
      if (!s.drawModels.length) s.drawModels = this.fallbackDrawModels();
      s.textModelId = this.resolvePreferredTextModel(s.textModels, this.modelId || s.textModelId);
      s.drawModelId = s.drawModelId || 'anime';
    } finally {
      s.loading = false;
    }
  },

  resolvePreferredTextModel(models = [], current = '') {
    const ids = (Array.isArray(models) ? models : []).map((model) => model?.internalName).filter(Boolean);
    const currentId = String(current || '');
    const config = window.GameModules.config || {};
    if (currentId && !currentId.startsWith('nalang-medium-') && ids.includes(currentId)) return currentId;
    return (config.preferredTextModelIds || []).find((id) => ids.includes(id)) || currentId || config.defaultModelId || 'nalang-turbo-0826';
  },

  enrichTextModelsWithThinking(result = {}) {
    const models = Array.isArray(result?.models) && result.models.length ? result.models : this.fallbackTextModels();
    const thinkingByModel = new Map();
    (Array.isArray(result?.categories) ? result.categories : []).forEach((category) => {
      (Array.isArray(category?.modelGroups) ? category.modelGroups : []).forEach((group) => {
        const supported = group?.thinkingSupported === true;
        (Array.isArray(group?.contexts) ? group.contexts : []).forEach((context) => {
          if (context?.internalName) thinkingByModel.set(context.internalName, supported);
        });
      });
    });
    return models.map((model) => ({ ...model, thinkingSupported: thinkingByModel.get(model.internalName) === true }));
  },

  fallbackTextModels() {
    return [
      { internalName: 'nalang-turbo-0826', displayName: '快速经济 0826', description: '默认备用文本模型', thinkingSupported: false },
      { internalName: 'nalang-medium-0826', displayName: '均衡性能', description: '默认备用文本模型', thinkingSupported: false },
    ];
  },

  fallbackDrawModels() {
    return [
      { id: 'anime', displayName: 'anime', description: '二次元风格' },
      { id: 'vivid', displayName: 'vivid', description: '写实/鲜明风格' },
    ];
  },

  async selectTextModel(id) {
    if (!id) return;
    this.modelId = id;
    if (this.settingsState) this.settingsState.textModelId = id;
    await this.save?.();
  },

  async selectDrawModel(id) {
    if (!id || !this.settingsState) return;
    this.settingsState.drawModelId = id;
    await this.save?.();
  },

  selectedDrawModelId() {
    return this.settingsState?.drawModelId || 'anime';
  },
};
