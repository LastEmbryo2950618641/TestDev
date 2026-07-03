window.GameModules = window.GameModules || {};

window.GameModules.aiProvider.register('deepseek', {
  id: 'deepseek',

  settings() {
    return window.GameModules.aiProvider.storeSettings();
  },

  baseUrl() {
    const settings = this.settings();
    const configured = String(settings.deepseekBaseUrl || window.GameModules.aiProvider.providerConfig('deepseek').baseUrl || 'https://api.deepseek.com').trim();
    return configured.replace(/\/+$/, '');
  },

  apiKey() {
    return String(this.settings().deepseekApiKey || '').trim();
  },

  ensureApiKey() {
    const key = this.apiKey();
    if (!key) {
      throw window.GameModules.aiProvider.createError('DeepSeek API Key 未配置', 'AUTH_REQUIRED', { retryable: false });
    }
    return key;
  },

  normalizeModel(model = '') {
    const chosen = String(model || this.settings().deepseekModel || window.GameModules.aiProvider.providerDefaultModel('deepseek') || 'deepseek-v4-flash').trim();
    return chosen || 'deepseek-v4-flash';
  },

  async listTextModels() {
    const data = await window.GameModules.aiProvider.fetchJson(`${this.baseUrl()}/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...window.GameModules.aiProvider.authHeader(this.ensureApiKey()),
      },
    });
    const models = (Array.isArray(data?.data) ? data.data : [])
      .map((item) => item?.id)
      .filter(Boolean)
      .map((id) => ({
        internalName: id,
        displayName: id,
        description: id === 'deepseek-v4-flash' ? 'DeepSeek 推荐快速文本模型' : (id === 'deepseek-v4-pro' ? 'DeepSeek 推荐高质量文本模型' : 'DeepSeek 文本模型'),
        thinkingSupported: /reasoner|v4-pro/i.test(id),
      }));
    const defaultModel = models.find((item) => item.internalName === this.normalizeModel())?.internalName
      || models.find((item) => item.internalName === 'deepseek-v4-flash')?.internalName
      || models[0]?.internalName
      || 'deepseek-v4-flash';
    return { models, defaultModel };
  },

  async complete(options = {}) {
    const payload = {
      model: this.normalizeModel(options.model),
      messages: options.messages || [],
      max_tokens: options.maxTokens,
      stream: false,
    };
    const data = await window.GameModules.aiProvider.fetchJson(`${this.baseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...window.GameModules.aiProvider.authHeader(this.ensureApiKey()),
      },
      body: JSON.stringify(payload),
    });
    const content = data?.choices?.[0]?.message?.content;
    const text = Array.isArray(content) ? content.map((item) => item?.text || item?.content || '').join('') : String(content || '');
    const info = { buffer: text, chunkCount: text ? 1 : 0, done: true, doneSeen: true };
    await options.onChunk?.(text, true, info);
    await options.onDone?.(info);
    return text;
  },
});
