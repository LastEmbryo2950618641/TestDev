window.GameModules = window.GameModules || {};

window.GameModules.aiProvider = {
  providers: {},

  register(id, provider) {
    if (!id || !provider) return;
    this.providers[id] = provider;
  },

  get(id) {
    return this.providers[String(id || '').trim()] || null;
  },

  currentProviderId() {
    const store = window.Alpine?.store?.('game');
    const fromStore = store?.settingsState?.textProvider;
    const fromConfig = window.GameModules.config?.textProviders?.defaultProvider;
    return String(fromStore || fromConfig || 'dzmm').trim();
  },

  currentProvider() {
    return this.get(this.currentProviderId());
  },

  providerConfig(id = '') {
    const key = String(id || this.currentProviderId() || '').trim();
    return window.GameModules.config?.textProviders?.[key] || {};
  },

  storeSettings() {
    return window.Alpine?.store?.('game')?.settingsState || {};
  },

  selectedTextModel() {
    const store = window.Alpine?.store?.('game');
    const settings = store?.settingsState || {};
    const providerId = this.currentProviderId();
    if (providerId === 'deepseek') {
      return settings.deepseekModel || store?.modelId || settings.textModelId || this.providerDefaultModel(providerId) || 'deepseek-v4-flash';
    }
    return store?.modelId || settings.textModelId || this.providerDefaultModel(providerId) || window.GameModules.config?.defaultModelId || 'nalang-turbo-0826';
  },

  providerDefaultModel(id = '') {
    const key = String(id || this.currentProviderId() || '').trim();
    const config = this.providerConfig(key);
    return config.defaultModel || '';
  },

  capabilities(id = '') {
    const provider = this.get(id || this.currentProviderId());
    return {
      hasProvider: Boolean(provider),
      canListTextModels: typeof provider?.listTextModels === 'function',
      canComplete: typeof provider?.complete === 'function',
      canGetUserInfo: typeof provider?.getUserInfo === 'function',
    };
  },

  createError(message, code = 'AI_PROVIDER_ERROR', extra = {}) {
    const err = new Error(message || 'AI provider error');
    err.code = code;
    Object.assign(err, extra);
    return err;
  },

  normalizeHttpError(response, detail = '', extra = {}) {
    const status = Number(response?.status || 0);
    const retryable = status === 429 || status === 408 || (status >= 500 && status < 600);
    return this.createError(
      `HTTP ${status || 'ERROR'}${detail ? `: ${detail}` : ''}`,
      status === 429 ? 'RATE_LIMITED' : (status >= 500 ? 'SERVICE_UNAVAILABLE' : 'HTTP_ERROR'),
      { retryable, status, ...extra },
    );
  },

  authHeader(token = '') {
    const value = String(token || '').trim();
    return value ? { Authorization: `Bearer ${value}` } : {};
  },

  async fetchJson(url, options = {}) {
    let response;
    try {
      response = await fetch(url, options);
    } catch (err) {
      throw this.createError(err?.message || 'Network request failed', 'NETWORK_ERROR', { retryable: true, cause: err });
    }
    let data = null;
    let text = '';
    try {
      data = await response.json();
    } catch (_) {
      try { text = await response.text(); } catch (_) { text = ''; }
    }
    if (!response.ok) {
      const detail = data?.error?.message || data?.message || text || '';
      throw this.normalizeHttpError(response, detail, { body: data || text });
    }
    return data;
  },
};
