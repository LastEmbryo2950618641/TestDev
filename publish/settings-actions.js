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
      s.textModels = Array.isArray(textResult?.models) && textResult.models.length ? textResult.models : this.fallbackTextModels();
      s.drawModels = Array.isArray(drawResult?.models) && drawResult.models.length ? drawResult.models : this.fallbackDrawModels();
      window.GameModules.tokenStats?.syncModelPrices?.(textResult);
      this.modelId = this.modelId || textResult?.defaultModel || s.textModels[0]?.internalName || 'nalang-medium-0826';
      s.textModelId = this.modelId;
      s.drawModelId = s.drawModelId || drawResult?.defaultModel || s.drawModels[0]?.id || 'anime';
      s.loaded = true;
    } catch (err) {
      console.warn('[设置] 模型列表加载失败:', err.code, err.message, err.stack);
      s.error = err?.message || '模型列表加载失败，请稍后重试。';
      if (!s.textModels.length) s.textModels = this.fallbackTextModels();
      if (!s.drawModels.length) s.drawModels = this.fallbackDrawModels();
      s.textModelId = this.modelId || s.textModelId || 'nalang-medium-0826';
      s.drawModelId = s.drawModelId || 'anime';
    } finally {
      s.loading = false;
    }
  },

  fallbackTextModels() {
    return [
      { internalName: 'nalang-turbo-0826', displayName: '快速经济', description: '默认备用文本模型' },
      { internalName: 'nalang-medium-0826', displayName: '均衡性能', description: '默认备用文本模型' },
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
