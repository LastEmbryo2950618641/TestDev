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
    try {
      const res = await fetch('/deepseek_key.txt', { cache: 'no-store' });
      if (!res.ok) return '';
      return String(await res.text()).trim();
    } catch (_) {
      return '';
    }
  },

  ensureSettingsDefaults(store) {
    if (!store?.settingsState) return;
    const cfg = window.GameModules.config || {};
    const s = store.settingsState;
    s.textProvider = s.textProvider || cfg.textProviders?.defaultProvider || 'deepseek';
    s.deepseekBaseUrl = s.deepseekBaseUrl || cfg.textProviders?.deepseek?.baseUrl || 'https://api.deepseek.com';
    s.deepseekModel = s.deepseekModel || cfg.textProviders?.deepseek?.defaultModel || 'deepseek-v4-flash';
    s.textModelId = s.textModelId || store.modelId || cfg.defaultModelId || 'nalang-turbo-0826';
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
  },

  async prepareActivation(store) {
    if (!store) return;
    this.ensureSettingsDefaults(store);
    await this.hydrateDeepseekKey(store);
    this.ensureActivationTextModels(store);
    await this.prefetchProviderIdentity(store);
    await this.prefetchTextModels(store);
    this.ensureActivationTextModels(store);
    this.persistFromStore(store);
  },
};
