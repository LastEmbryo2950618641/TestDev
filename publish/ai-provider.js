window.GameModules = window.GameModules || {};

window.GameModules.aiProvider = {
  providers: {},

  wrapComplete(id, provider) {
    if (typeof provider.complete !== 'function' || provider.__tokenStatsWrapped) return provider;
    const original = provider.complete;
    provider.complete = async function wrappedProviderComplete(options = {}) {
      if (options?.suppressTokenStats === true || options?.tokenRecordId) {
        return original.call(this, options);
      }
      const messages = Array.isArray(options.messages)
        ? options.messages
        : [{ role: 'user', content: options.prompt || '' }];
      const promptText = messages.map((msg) => String(msg?.content || '')).join('\n');
      const source = String(options.source || options.promptId || `provider-${id}` || 'provider-complete');
      const model = options.model || window.GameModules.aiProvider?.selectedTextModel?.() || '';
      const recordId = window.GameModules.tokenStats?.record?.(source, promptText, {
        ...(options.tokenMeta || {}),
        model,
        maxTokens: options.maxTokens,
        title: options.tokenMeta?.title || options.sourceTitle || source,
      });
      const startedAt = Date.now();
      let responseText = '';
      let responseMeta = {};
      let chunkCount = 0;
      const userOnChunk = options.onChunk;
      const userOnDone = options.onDone;
      try {
        const output = await original.call(this, {
          ...options,
          onChunk: async (chunk, done, info = {}) => {
            const text = String(chunk || '');
            if (text) {
              chunkCount += 1;
              responseText = info.buffer || (window.GameModules.jsonUtils?.mergeStreamText?.(responseText, text) ?? (responseText + text));
            }
            responseMeta = { ...responseMeta, ...info };
            window.GameModules.tokenStats?.recordProgress?.(recordId, {
              status: done ? 'completed' : (responseText ? 'streaming' : 'running'),
              responseText,
              chunkCount,
              durationMs: Date.now() - startedAt,
              ...responseMeta,
            });
            await userOnChunk?.(chunk, done, info);
          },
          onDone: async (info = {}) => {
            responseMeta = { ...responseMeta, ...info };
            await userOnDone?.(info);
          },
        });
        const completedAt = Date.now();
        window.GameModules.tokenStats?.recordResponse?.(recordId, responseText || output || '', [], {
          ...responseMeta,
          chunkCount,
          startedAt,
          completedAt,
          durationMs: completedAt - startedAt,
        });
        return output;
      } catch (err) {
        window.GameModules.tokenStats?.recordError?.(recordId, err, {
          ...responseMeta,
          chunkCount,
          startedAt,
          completedAt: Date.now(),
          durationMs: Date.now() - startedAt,
          responseText,
        });
        throw err;
      }
    };
    provider.__tokenStatsWrapped = true;
    return provider;
  },

  register(id, provider) {
    if (!id || !provider) return;
    this.providers[id] = this.wrapComplete(id, provider);
  },

  get(id) {
    return this.providers[String(id || '').trim()] || null;
  },

  currentProviderId() {
    const store = window.Alpine?.store?.('game');
    const fromStore = store?.settingsState?.textProvider;
    const fromConfig = window.GameModules.config?.textProviders?.defaultProvider;
    return String(fromStore || fromConfig || 'deepseek').trim();
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
