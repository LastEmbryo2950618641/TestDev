/**
 * 本地 dev / 激活阶段设置：DeepSeek Key、默认模型与提供方同步。
 */
window.GameModules = window.GameModules || {};

window.GameModules.localSettings = {
  STORAGE_KEY: 'gamefy-local-settings-v1',

  readStored() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  },

  writeStored(patch = {}) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ ...this.readStored(), ...patch }));
    } catch (_) { /* ignore quota / privacy mode */ }
  },

  async fetchDeepseekKeyFromDevFile() {
    return window.GameModules.platformKeySource?.readDeepseekKey?.() || '';
  },

  async fetchPixaiKeyFromDevFile() {
    return window.GameModules.platformKeySource?.readPixaiKey?.() || '';
  },

  ensureSettingsDefaults(store) {
    if (!store?.settingsState) return;
    const cfg = window.GameModules.config || {};
    const s = store.settingsState;
    const defaultDrawProvider = cfg.drawProviders?.defaultProvider || 'pixai';
    s.textProvider = s.textProvider || cfg.textProviders?.defaultProvider || 'deepseek';
    s.deepseekBaseUrl = s.deepseekBaseUrl || cfg.textProviders?.deepseek?.baseUrl || 'https://api.deepseek.com';
    s.deepseekModel = s.deepseekModel || cfg.textProviders?.deepseek?.defaultModel || 'deepseek-v4-flash';
    s.textModelId = s.textModelId || store.modelId || cfg.defaultModelId || 'nalang-turbo-0826';
    if (!s.drawProvider || (!s.drawProviderExplicit && s.drawProvider === 'dzmm' && defaultDrawProvider === 'pixai')) {
      s.drawProvider = defaultDrawProvider;
    }
    s.drawModelId = s.drawModelId || cfg.drawProviders?.dzmm?.defaultModel || 'anime';
    s.pixaiBaseUrl = s.pixaiBaseUrl || cfg.drawProviders?.pixai?.baseUrl || 'https://api.pixai.art';
    s.pixaiModelVersionId = s.pixaiModelVersionId || cfg.drawProviders?.pixai?.defaultModel || '';
    s.pixaiMode = s.pixaiMode || cfg.drawProviders?.pixai?.defaultMode || 'standard';
    store.ensureAiOutputLimitSettings?.();
  },

  async hydrateDeepseekKey(store) {
    if (!store?.settingsState) return;
    if (String(store.settingsState.deepseekApiKey || '').trim()) return;
    const stored = String(this.readStored().deepseekApiKey || '').trim();
    if (stored) {
      store.settingsState.deepseekApiKey = stored;
      return;
    }
    const fromFile = await this.fetchDeepseekKeyFromDevFile();
    if (fromFile) {
      store.settingsState.deepseekApiKey = fromFile;
      this.writeStored({ deepseekApiKey: fromFile });
    }
  },

  async hydratePixaiKey(store) {
    if (!store?.settingsState) return;
    if (String(store.settingsState.pixaiApiKey || '').trim()) return;
    const stored = String(this.readStored().pixaiApiKey || '').trim();
    if (stored) {
      store.settingsState.pixaiApiKey = stored;
      return;
    }
    const fromFile = await this.fetchPixaiKeyFromDevFile();
    if (fromFile) {
      store.settingsState.pixaiApiKey = fromFile;
      this.writeStored({ pixaiApiKey: fromFile });
    }
  },

  ensureActivationTextModels(store) {
    if (!store?.settingsState) return;
    this.ensureSettingsDefaults(store);
    if (!Array.isArray(store.settingsState.textModels) || !store.settingsState.textModels.length) {
      store.applyStartupTextModels?.();
    }
    const providerId = store.settingsState.textProvider || 'deepseek';
    if (providerId === 'deepseek') {
      store.settingsState.deepseekModel = store.settingsState.deepseekModel
        || store.settingsState.textModelId
        || store.modelId
        || window.GameModules.config?.textProviders?.deepseek?.defaultModel
        || 'deepseek-v4-flash';
    }
    const selected = store.resolvePreferredTextModel?.(
      store.settingsState.textModels,
      store.modelId || store.settingsState.textModelId || store.settingsState.deepseekModel,
    ) || store.modelId || store.settingsState.textModelId;
    if (selected) {
      store.modelId = selected;
      store.settingsState.textModelId = selected;
      if (providerId === 'deepseek') store.settingsState.deepseekModel = selected;
    }
  },

  async prefetchProviderIdentity(store) {
    try {
      const provider = window.GameModules.aiProvider?.currentProvider?.();
      const info = await provider?.getUserInfo?.();
      if (info?.name && !store.playerName && !store.playerProfile?.name) store.playerName = info.name;
    } catch (err) {
      console.warn('[本地设置] 读取用户信息失败:', err?.code, err?.message || err);
    }
  },

  async prefetchTextModels(store) {
    const s = store?.settingsState;
    if (!s) return;
    const providerId = s.textProvider || window.GameModules.aiProvider?.currentProviderId?.() || 'deepseek';
    if (providerId === 'deepseek' && !String(s.deepseekApiKey || '').trim()) {
      store.applyStartupTextModels?.();
      return;
    }
    try {
      const result = await window.GameModules.aiProvider?.currentProvider?.()?.listTextModels?.();
      window.GameModules.tokenStats?.syncModelPrices?.(result);
      const models = store.enrichTextModelsWithThinking?.(result)
        || (Array.isArray(result?.models) ? result.models : []);
      if (models.length) s.textModels = models;
      const selected = store.resolvePreferredTextModel?.(
        models,
        store.modelId || s.textModelId || result?.defaultModel,
      ) || store.modelId || result?.defaultModel || models[0]?.internalName;
      if (selected) {
        s.textModelId = selected;
        store.modelId = selected;
        if (providerId === 'deepseek') s.deepseekModel = selected;
      }
      s.loaded = Boolean(models.length);
    } catch (err) {
      console.warn('[本地设置] 读取模型列表失败:', err?.code, err?.message || err);
      store.applyStartupTextModels?.();
    }
  },

  persistFromStore(store) {
    const key = String(store?.settingsState?.deepseekApiKey || '').trim();
    if (key) this.writeStored({ deepseekApiKey: key });
    const pixaiKey = String(store?.settingsState?.pixaiApiKey || '').trim();
    if (pixaiKey) this.writeStored({ pixaiApiKey: pixaiKey });
  },

  async prepareActivation(store) {
    if (!store) return;
    this.ensureSettingsDefaults(store);
    await this.hydrateDeepseekKey(store);
    await this.hydratePixaiKey(store);
    this.ensureActivationTextModels(store);
    await this.prefetchProviderIdentity(store);
    await this.prefetchTextModels(store);
    this.ensureActivationTextModels(store);
    this.persistFromStore(store);
  },
};
