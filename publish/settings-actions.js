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
      const [textResult, drawResult] = await Promise.all([
        this.withTimeout(provider?.listTextModels?.(), 12000, '模型列表'),
        this.withTimeout(window.dzmm?.draw?.generateModels?.(), 12000, '绘图模型').catch(() => null),
      ]);
      s.textModels = this.enrichTextModelsWithThinking(textResult);
      s.drawModels = Array.isArray(drawResult?.models) && drawResult.models.length ? drawResult.models : this.fallbackDrawModels();
      window.GameModules.tokenStats?.syncModelPrices?.(textResult);
      this.modelId = this.resolvePreferredTextModel(s.textModels, this.modelId || s.textModelId || textResult?.defaultModel);
      s.textModelId = this.modelId;
      s.drawModelId = s.drawModelId || drawResult?.defaultModel || s.drawModels[0]?.id || 'anime';
      s.loaded = true;
      s.modelTestOk = null;
      s.modelTestMessage = '';
    } catch (err) {
      console.warn('[设置] 模型列表加载失败:', err.code, err.message, err.stack);
      const missingKey = err?.code === 'AUTH_REQUIRED' && providerId === 'deepseek';
      s.error = missingKey ? '请先填写 DeepSeek API Key，再获取模型列表。' : (err?.message || '模型列表加载失败，请稍后重试。');
      if (!s.textModels.length) s.textModels = this.fallbackTextModels();
      if (!s.drawModels.length) s.drawModels = this.fallbackDrawModels();
      s.textModelId = this.resolvePreferredTextModel(s.textModels, this.modelId || s.textModelId);
      s.drawModelId = s.drawModelId || 'anime';
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

  fallbackDrawModels() {
    return [
      { id: 'anime', displayName: 'anime', description: '二次元风格' },
      { id: 'vivid', displayName: 'vivid', description: '写实/鲜明风格' },
    ];
  },

  applyStartupTextModels() {
    const fallbacks = this.fallbackTextModels();
    if (!this.settingsState) return;
    this.settingsState.textModels = fallbacks;
    if (!Array.isArray(this.settingsState.drawModels) || !this.settingsState.drawModels.length) {
      this.settingsState.drawModels = this.fallbackDrawModels();
    }
    this.modelId = this.resolvePreferredTextModel(fallbacks, this.modelId || this.settingsState.textModelId);
    this.settingsState.textModelId = this.modelId;
    this.settingsState.drawModelId = this.settingsState.drawModelId || this.settingsState.drawModels[0]?.id || 'anime';
    this.settingsState.loaded = false;
    this.settingsState.error = '';
  },

  textModelOptionLabel(model = {}) {
    const name = model.displayName || model.internalName || '未知模型';
    const price = model.price || '未知';
    const thinking = model.thinkingSupported === true ? 'true' : 'false';
    const description = String(model.description || '').trim();
    return `${name}｜系数 ${price}｜支持思考: ${thinking}${description ? `｜${description}` : ''}`;
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
    this.settingsState.drawModelId = id;
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
    return [
      { kind: 'global', title: '统一配置', desc: '作为各阶段“跟随统一”时的默认输出限制。' },
      { kind: 'stage1', title: 'Stage1 资料路由', desc: '资料请求规划、人物/地点/记忆加载路由。' },
      { kind: 'stage2', title: 'Stage2 场景锚定', desc: '场景锚定报告 JSON。' },
      { kind: 'stage3', title: 'Stage3 正文阶段', desc: '最终正文生成与正文补全。默认限制 3000。' },
      { kind: 'stage4', title: 'Stage4 结算', desc: '状态更新、滑动结算与更新 JSON。' },
      { kind: 'other', title: '其他 AI 响应', desc: '微信、角色资料、BOSS、势力、标签等未显式归类请求。' },
    ];
  },

  aiOutputLimitPrefix(kind = 'other') {
    return {
      global: 'aiOutputLimitGlobal',
      stage1: 'aiOutputLimitStage1',
      stage2: 'aiOutputLimitStage2',
      stage3: 'aiOutputLimitStage3',
      stage4: 'aiOutputLimitStage4',
      other: 'aiOutputLimitOther',
    }[kind] || 'aiOutputLimitOther';
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
    const mode = this.aiOutputLimitMode(kind);
    if (mode === 'unlimited') return '无限制';
    if (mode === 'limited') return `限制 ${this.aiOutputLimitMax(kind)} tokens`;
    const globalMode = this.aiOutputLimitMode('global');
    return globalMode === 'limited' ? `跟随统一：限制 ${this.aiOutputLimitMax('global')} tokens` : '跟随统一：无限制';
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
    return this.settingsState?.drawModelId || 'anime';
  },

  stage1MaterialMaxIterations() {
    return Math.max(1, Math.min(8, Math.round(Number(this.settingsState?.stage1MaterialMaxIterations) || 2)));
  },

  stage1MaterialIterationLimitText() {
    return this.settingsState?.stage1MaterialIterationLimited ? `${this.stage1MaterialMaxIterations()} 次` : '不限制';
  },
};
