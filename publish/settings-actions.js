window.GameModules = window.GameModules || {};

window.GameModules.settingsActions = {
  async openSettingsApp() {
    this.closeDesktopApps?.();
    this.ensureAiOutputLimitSettings?.();
    this.settingsState.open = true;
    this.desktopUnlocked = true;
    this.prepareActivationModelSetup?.();
  },

  closeSettingsApp() {
    if (this.settingsState) this.settingsState.open = false;
    this.closeAppToDesktop?.();
  },

  withTimeout(promise, ms = 12000, label = '请求') {
    const task = Promise.resolve(promise);
    return Promise.race([
      task,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`${label}超时（${Math.round(ms / 1000)}s）`)), ms);
      }),
    ]);
  },

  prepareActivationModelSetup() {
    window.GameModules.uiThemeActions?.initFromStore?.(this);
    void window.GameModules.localSettings?.prepareActivation?.(this).then(() => {
      this.ensureAiOutputLimitSettings?.();
      if (!Array.isArray(this.settingsState?.textModels) || !this.settingsState.textModels.length) {
        this.applyStartupTextModels();
      }
      const s = this.settingsState;
      if (!s || s.loading) return;
      const providerId = s.textProvider || window.GameModules.aiProvider?.currentProviderId?.() || 'dzmm';
      const canPrefetch = providerId === 'dzmm' || (providerId === 'deepseek' && String(s.deepseekApiKey || '').trim());
      if (!canPrefetch || s.loaded || this._activationModelPrefetched) return;
      this._activationModelPrefetched = true;
      this.loadSettingsModels().catch((err) => {
        console.warn('[设置] 激活页预加载模型失败:', err?.message || err);
        this._activationModelPrefetched = false;
      });
    });
  },

  async fetchTextModelCatalog() {
    await this.loadSettingsModels(true);
  },

  async testTextModelConnection() {
    const s = this.settingsState;
    if (!s) return;
    s.modelTestLoading = true;
    s.modelTestMessage = '';
    s.modelTestOk = null;
    const providerId = s.textProvider || window.GameModules.aiProvider?.currentProviderId?.() || 'deepseek';
    try {
      if (providerId === 'deepseek' && !String(s.deepseekApiKey || '').trim()) {
        throw new Error('请先填写 DeepSeek API Key');
      }
      const provider = window.GameModules.aiProvider?.get?.(providerId);
      if (!provider?.complete) throw new Error('当前提供方不支持连接测试');
      const model = this.modelId || s.textModelId || provider.normalizeModel?.() || window.GameModules.aiProvider?.providerDefaultModel?.(providerId);
      await this.withTimeout(
        provider.complete({
          model,
          messages: [{ role: 'user', content: 'ping' }],
          maxTokens: 8,
        }),
        15000,
        '连接测试',
      );
      s.modelTestOk = true;
      s.modelTestMessage = '连接正常，模型可响应。';
    } catch (err) {
      console.warn('[设置] 模型连接测试失败:', err?.message || err);
      s.modelTestOk = false;
      s.modelTestMessage = err?.message || '连接测试失败，请检查 API Key 与网络。';
    } finally {
      s.modelTestLoading = false;
    }
  },

  async loadSettingsModels(force = false) {
    const s = this.settingsState;
    if (!s || (s.loaded && !force)) return;
    this.ensureAiOutputLimitSettings?.();
    const providerId = s.textProvider || window.GameModules.aiProvider?.currentProviderId?.() || 'deepseek';
    if (providerId === 'deepseek' && !String(s.deepseekApiKey || '').trim()) {
      if (!force) {
        if (!Array.isArray(s.textModels) || !s.textModels.length) this.applyStartupTextModels();
        return;
      }
      s.error = '请先填写 DeepSeek API Key，再获取模型列表。';
      return;
    }
    s.loading = true;
    s.error = '';
    try {
      const provider = window.GameModules.aiProvider?.get?.(providerId);
      const drawProviderId = s.drawProvider || window.GameModules.drawProvider?.currentProviderId?.() || 'pixai';
      const drawProvider = window.GameModules.drawProvider?.get?.(drawProviderId);
      const [textResult, drawResult] = await Promise.all([
        this.withTimeout(provider?.listTextModels?.(), 12000, '模型列表'),
        this.withTimeout(drawProvider?.listModels?.(), 12000, '绘图模型').catch(() => null),
      ]);
      s.textModels = this.enrichTextModelsWithThinking(textResult);
      s.drawModels = this.drawModelsForProvider(drawProviderId, drawResult);
      window.GameModules.tokenStats?.syncModelPrices?.(textResult);
      this.modelId = this.resolvePreferredTextModel(s.textModels, this.modelId || s.textModelId || textResult?.defaultModel);
      s.textModelId = this.modelId;
      this.ensureSelectedDrawModel(drawProviderId, drawResult?.defaultModel);
      s.loaded = true;
      s.modelTestOk = null;
      s.modelTestMessage = '';
    } catch (err) {
      console.warn('[设置] 模型列表加载失败:', err.code, err.message, err.stack);
      const missingKey = err?.code === 'AUTH_REQUIRED' && providerId === 'deepseek';
      s.error = missingKey ? '请先填写 DeepSeek API Key，再获取模型列表。' : (err?.message || '模型列表加载失败，请稍后重试。');
      if (!s.textModels.length) s.textModels = this.fallbackTextModels();
      if (!s.drawModels.length) s.drawModels = this.fallbackDrawModels(s.drawProvider);
      s.textModelId = this.resolvePreferredTextModel(s.textModels, this.modelId || s.textModelId);
      this.ensureSelectedDrawModel(s.drawProvider);
      s.loaded = false;
    } finally {
      s.loading = false;
    }
  },

  resolvePreferredTextModel(models = [], current = '') {
    const ids = (Array.isArray(models) ? models : []).map((model) => model?.internalName).filter(Boolean);
    const currentId = String(current || '');
    const config = window.GameModules.config || {};
    const providerId = this.settingsState?.textProvider || window.GameModules.aiProvider?.currentProviderId?.() || 'deepseek';
    const providerPreferred = config.textProviders?.[providerId]?.preferredModelIds || [];
    if (currentId && ids.includes(currentId)) return currentId;
    return providerPreferred.find((id) => ids.includes(id))
      || (config.preferredTextModelIds || []).find((id) => ids.includes(id))
      || window.GameModules.aiProvider?.providerDefaultModel?.(providerId)
      || (providerId === 'deepseek' ? 'deepseek-v4-flash' : config.defaultModelId || 'nalang-turbo-0826');
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
    const providerId = this.settingsState?.textProvider || window.GameModules.aiProvider?.currentProviderId?.() || 'deepseek';
    if (providerId === 'deepseek') {
      return [
        { internalName: 'deepseek-v4-flash', displayName: 'DeepSeek V4 Flash', description: 'DeepSeek 默认备用文本模型', thinkingSupported: false },
        { internalName: 'deepseek-v4-pro', displayName: 'DeepSeek V4 Pro', description: 'DeepSeek 高质量文本模型', thinkingSupported: true },
      ];
    }
    return [
      { internalName: 'nalang-turbo-0826', displayName: '快速经济 0826', description: '默认备用文本模型', thinkingSupported: false },
      { internalName: 'nalang-medium-0826', displayName: '均衡性能', description: '默认备用文本模型', thinkingSupported: false },
    ];
  },

  fallbackDrawModels(providerId = this.settingsState?.drawProvider || 'pixai') {
    if (providerId === 'pixai') {
      const recommended = this.pixaiRecommendedModels();
      const current = String(this.settingsState?.pixaiModelVersionId || '').trim();
      const hasCurrent = current && recommended.some((model) => model.id === current);
      return [
        ...recommended,
        ...(current ? [{ id: current, displayName: PixAI , description: '当前填写的 modelVersionId' }] : []),
        { id: 'custom', displayName: '自定义 PixAI modelVersionId', description: '填写模型页面 URL 的最后一段' },
      ];
    }
    return [
      { id: 'anime', displayName: 'anime', description: '二次元风格' },
      { id: 'vivid', displayName: 'vivid', description: '写实/鲜明风格' },
    ];
  },

  pixaiRecommendedModels() {
    const cfg = window.GameModules.config?.drawProviders?.pixai || {};
    return (Array.isArray(cfg.recommendedModels) ? cfg.recommendedModels : []).map((model) => ({
      id: String(model.id || '').trim(),
      displayName: model.displayName || model.name || String(model.id || '').trim(),
      description: model.description || '',
    })).filter((model) => model.id);
  },

  drawModelsForProvider(providerId = this.settingsState?.drawProvider || 'pixai', result = null) {
    const sourceModels = Array.isArray(result?.models) && result.models.length ? result.models : this.fallbackDrawModels(providerId);
    const models = [];
    const seen = new Set();
    sourceModels.forEach((model) => {
      const id = String(model?.id || '').trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      models.push(model);
    });
    if (providerId !== 'pixai') return models;
    const current = String(this.settingsState?.pixaiModelVersionId || '').trim();
    if (!current || models.some((model) => model?.id === current)) return models;
    return [{ id: current, displayName: `PixAI ${current}`, description: '褰撳墠濉啓鐨?modelVersionId' }, ...models];
  },

  ensureSelectedDrawModel(providerId = this.settingsState?.drawProvider || 'pixai', defaultModel = '') {
    if (!this.settingsState) return;
    if (providerId === 'pixai') {
      const fallbackModel = window.GameModules.config?.drawProviders?.pixai?.defaultModel || this.pixaiRecommendedModels()[0]?.id || '';
      this.settingsState.pixaiModelVersionId = String(this.settingsState.pixaiModelVersionId || defaultModel || fallbackModel || '').trim();
      this.settingsState.drawModels = this.drawModelsForProvider(providerId);
      return;
    }
    this.settingsState.drawModelId = this.settingsState.drawModelId || defaultModel || this.settingsState.drawModels?.[0]?.id || 'anime';
  },

  applyStartupTextModels() {
    const fallbacks = this.fallbackTextModels();
    if (!this.settingsState) return;
    this.settingsState.textModels = fallbacks;
    if (!Array.isArray(this.settingsState.drawModels) || !this.settingsState.drawModels.length) {
      this.settingsState.drawModels = this.fallbackDrawModels(this.settingsState.drawProvider);
    }
    this.modelId = this.resolvePreferredTextModel(fallbacks, this.modelId || this.settingsState.textModelId);
    this.settingsState.textModelId = this.modelId;
    this.ensureSelectedDrawModel(this.settingsState.drawProvider);
    this.settingsState.loaded = false;
    this.settingsState.error = '';
  },
  textModelOptionLabel(model = {}) {
    return window.GameModules.ui.settings.viewHelpers.textModelOptionLabel.call(this, model);
  },

  currentTextModelRows() {
    return window.GameModules.ui.settings.viewHelpers.currentTextModelRows.call(this);
  },

  async selectTextModel(id) {
    if (!id) return;
    this.modelId = id;
    if (this.settingsState) this.settingsState.textModelId = id;
    if (this.settingsState?.textProvider === 'deepseek') this.settingsState.deepseekModel = id;
    await this.save?.();
  },

  async selectTextProvider(id) {
    if (!id || !this.settingsState) return;
    this.settingsState.textProvider = id;
    this.settingsState.loaded = false;
    this.settingsState.textModels = this.fallbackTextModels();
    this.settingsState.error = '';
    this.settingsState.modelTestOk = null;
    this.settingsState.modelTestMessage = '';
    this.modelId = this.resolvePreferredTextModel(this.settingsState.textModels, this.modelId);
    this.settingsState.textModelId = this.modelId;
    await this.save?.();
  },

  async setDeepseekApiKey(value) {
    if (!this.settingsState) return;
    this.settingsState.deepseekApiKey = String(value || '').trim();
    this.settingsState.loaded = false;
    this.settingsState.modelTestOk = null;
    this.settingsState.modelTestMessage = '';
    await this.save?.();
  },

  async setDeepseekBaseUrl(value) {
    if (!this.settingsState) return;
    this.settingsState.deepseekBaseUrl = String(value || '').trim();
    await this.save?.();
  },

  async selectDrawModel(id) {
    if (!id || !this.settingsState) return;
    if (this.settingsState.drawProvider === 'pixai') {
      if (id !== 'custom') this.settingsState.pixaiModelVersionId = id;
      this.settingsState.drawModels = this.drawModelsForProvider('pixai');
    } else {
      this.settingsState.drawModelId = id;
    }
    await this.save?.();
  },

  async selectDrawProvider(id) {
    if (!id || !this.settingsState) return;
    this.settingsState.drawProvider = id;
    this.settingsState.drawProviderExplicit = true;
    this.settingsState.drawModels = this.fallbackDrawModels(id);
    this.ensureSelectedDrawModel(id);
    await this.save?.();
  },

  async setPixaiApiKey(value) {
    if (!this.settingsState) return;
    this.settingsState.pixaiApiKey = String(value || '').trim();
    window.GameModules.localSettings?.persistFromStore?.(this);
    await this.save?.();
  },

  async setPixaiBaseUrl(value) {
    if (!this.settingsState) return;
    this.settingsState.pixaiBaseUrl = String(value || '').trim() || 'https://api.pixai.art';
    await this.save?.();
  },

  async setPixaiModelVersionId(value) {
    if (!this.settingsState) return;
    this.settingsState.pixaiModelVersionId = String(value || '').trim();
    this.settingsState.drawModels = this.drawModelsForProvider('pixai');
    await this.save?.();
  },

  async setPixaiMode(value) {
    if (!this.settingsState) return;
    const allowed = ['lite', 'standard', 'pro', 'ultra'];
    this.settingsState.pixaiMode = allowed.includes(value) ? value : 'standard';
    await this.save?.();
  },

  async setStage1MaterialMaxIterations(value) {
    if (!this.settingsState) return;
    const next = Math.max(1, Math.min(8, Math.round(Number(value) || 2)));
    this.settingsState.stage1MaterialMaxIterations = next;
    await this.save?.();
  },

  async setStage1MaterialIterationLimited(value) {
    if (!this.settingsState) return;
    this.settingsState.stage1MaterialIterationLimited = Boolean(value);
    await this.save?.();
  },

  ensureAiOutputLimitSettings() {
    const s = this.settingsState;
    if (!s) return;
    const defaults = {
      aiOutputLimitGlobalMode: 'unlimited',
      aiOutputLimitGlobalMaxTokens: 3000,
      aiOutputLimitStage1Mode: 'global',
      aiOutputLimitStage1MaxTokens: 3000,
      aiOutputLimitStage2Mode: 'global',
      aiOutputLimitStage2MaxTokens: 3000,
      aiOutputLimitStage3Mode: 'limited',
      aiOutputLimitStage3MaxTokens: 3000,
      aiOutputLimitStage4Mode: 'global',
      aiOutputLimitStage4MaxTokens: 3000,
      aiOutputLimitOtherMode: 'global',
      aiOutputLimitOtherMaxTokens: 3000,
    };
    Object.entries(defaults).forEach(([key, value]) => {
      if (s[key] === undefined || s[key] === null || s[key] === '') s[key] = value;
    });
  },

  aiOutputLimitKinds() {
    return window.GameModules.ui.settings.viewHelpers.aiOutputLimitKinds.call(this);
  },

  aiOutputLimitRows() {
    return window.GameModules.ui.settings.viewHelpers.aiOutputLimitRows.call(this);
  },

  aiOutputLimitPrefix(kind = 'other') {
    return window.GameModules.ui.settings.viewHelpers.aiOutputLimitPrefix.call(this, kind);
  },

  aiOutputLimitMode(kind = 'other') {
    this.ensureAiOutputLimitSettings?.();
    const prefix = this.aiOutputLimitPrefix(kind);
    return this.settingsState?.[`${prefix}Mode`] || (kind === 'global' ? 'unlimited' : 'global');
  },

  aiOutputLimitMax(kind = 'other') {
    this.ensureAiOutputLimitSettings?.();
    const prefix = this.aiOutputLimitPrefix(kind);
    return Math.max(16, Math.min(64000, Math.round(Number(this.settingsState?.[`${prefix}MaxTokens`]) || 3000)));
  },

  aiOutputLimitEffectiveText(kind = 'other') {
    return window.GameModules.ui.settings.viewHelpers.aiOutputLimitEffectiveText.call(this, kind);
  },

  async setAiOutputLimitMode(kind = 'other', mode = 'global') {
    if (!this.settingsState) return;
    this.ensureAiOutputLimitSettings?.();
    const prefix = this.aiOutputLimitPrefix(kind);
    const allowed = kind === 'global' ? ['unlimited', 'limited'] : ['global', 'unlimited', 'limited'];
    this.settingsState[`${prefix}Mode`] = allowed.includes(mode) ? mode : allowed[0];
    await this.save?.();
  },

  async setAiOutputLimitMax(kind = 'other', value = 3000) {
    if (!this.settingsState) return;
    this.ensureAiOutputLimitSettings?.();
    const prefix = this.aiOutputLimitPrefix(kind);
    this.settingsState[`${prefix}MaxTokens`] = Math.max(16, Math.min(64000, Math.round(Number(value) || 3000)));
    await this.save?.();
  },

  selectedDrawModelId() {
    return window.GameModules.ui.settings.viewHelpers.selectedDrawModelId.call(this);
  },

  selectedDrawProviderId() {
    return window.GameModules.ui.settings.viewHelpers.selectedDrawProviderId.call(this);
  },

  currentDrawModels() {
    return window.GameModules.ui.settings.viewHelpers.currentDrawModels.call(this);
  },

  currentDrawModelRows() {
    return window.GameModules.ui.settings.viewHelpers.currentDrawModelRows.call(this);
  },

  textModelSectionView() {
    return window.GameModules.ui.settings.viewHelpers.textModelSectionView.call(this);
  },

  drawModelSectionView() {
    return window.GameModules.ui.settings.viewHelpers.drawModelSectionView.call(this);
  },

  textProviderSectionView() {
    return window.GameModules.ui.settings.viewHelpers.textProviderSectionView.call(this);
  },

  drawProviderSectionView() {
    return window.GameModules.ui.settings.viewHelpers.drawProviderSectionView.call(this);
  },

  currentSettingsSummaryRows() {
    return window.GameModules.ui.settings.viewHelpers.currentSettingsSummaryRows.call(this);
  },

  currentModelSummaryView() {
    return window.GameModules.ui.settings.viewHelpers.currentModelSummaryView.call(this);
  },

  stage1MaterialSettingView() {
    return window.GameModules.ui.settings.viewHelpers.stage1MaterialSettingView.call(this);
  },

  aiOutputLimitSectionView() {
    return window.GameModules.ui.settings.viewHelpers.aiOutputLimitSectionView.call(this);
  },

  drawModelOptionLabel(model = {}) {
    return window.GameModules.ui.settings.viewHelpers.drawModelOptionLabel.call(this, model);
  },

  stage1MaterialMaxIterations() {
    return window.GameModules.ui.settings.viewHelpers.stage1MaterialMaxIterations.call(this);
  },

  stage1MaterialIterationLimitText() {
    return window.GameModules.ui.settings.viewHelpers.stage1MaterialIterationLimitText.call(this);
  },

  settingsSummaryView() {
    return window.GameModules.ui.settings.viewHelpers.settingsSummaryView.call(this);
  },
};



