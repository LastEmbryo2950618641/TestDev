window.GameModules = window.GameModules || {};

window.GameModules.drawProvider = {
  providers: {},

  register(id, provider) {
    const key = String(id || '').trim();
    if (!key || !provider) return;
    this.providers[key] = provider;
  },

  get(id = '') {
    return this.providers[String(id || '').trim()] || null;
  },

  storeSettings() {
    return window.Alpine?.store?.('game')?.settingsState || {};
  },

  currentProviderId() {
    return String(this.storeSettings().drawProvider || 'pixai').trim() || 'pixai';
  },

  currentProvider() {
    return this.get(this.currentProviderId());
  },

  config(id = '') {
    return window.GameModules.config?.drawProviders?.[String(id || '').trim()] || {};
  },

  createError(message = '绘图接口请求失败', code = 'DRAW_PROVIDER_ERROR', extra = {}) {
    const err = new Error(message);
    err.code = code;
    Object.assign(err, extra);
    return err;
  },

  sleep(ms = 1500) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  normalizeHttpError(response, detail = '') {
    let message = detail;
    try {
      const data = JSON.parse(detail);
      message = data?.message || data?.error?.message || data?.error || detail;
    } catch (_) { /* keep raw detail */ }
    const code = response.status === 401 || response.status === 403 ? 'AUTH_REQUIRED' : 'HTTP_ERROR';
    return this.createError(message || `绘图接口 HTTP ${response.status}`, code, { status: response.status, retryable: response.status >= 500 });
  },

  async fetchJson(url, options = {}) {
    let response;
    try {
      response = await fetch(url, options);
    } catch (err) {
      throw this.createError(err?.message || '绘图接口网络请求失败', 'NETWORK_ERROR', { retryable: true, cause: err });
    }
    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch (_) { detail = ''; }
      throw this.normalizeHttpError(response, detail);
    }
    if (response.status === 204) return null;
    return response.json();
  },

  async generate(options = {}) {
    const providerId = this.currentProviderId();
    const provider = this.get(providerId);
    if (!provider?.generate) throw this.createError(`绘图平台 ${providerId} 不支持生成图片`, 'DRAW_PROVIDER_UNAVAILABLE');
    return provider.generate(options);
  },

  async edit(options = {}) {
    const providerId = this.currentProviderId();
    const provider = this.get(providerId);
    if (!provider?.edit) throw this.createError(`绘图平台 ${providerId} 不支持图片编辑`, 'DRAW_PROVIDER_UNAVAILABLE');
    return provider.edit(options);
  },
};

window.GameModules.drawProvider.register('dzmm', {
  id: 'dzmm',

  async listModels() {
    const result = await window.dzmm?.draw?.generateModels?.();
    return Array.isArray(result?.models) && result.models.length
      ? result
      : { models: [], defaultModel: 'anime' };
  },

  async generate(options = {}) {
    if (!window.dzmm?.draw?.generate) {
      throw window.GameModules.drawProvider.createError('dzmm.draw.generate 不可用', 'DRAW_PROVIDER_UNAVAILABLE');
    }
    return window.dzmm.draw.generate(options);
  },

  async edit(options = {}) {
    if (!window.dzmm?.draw?.edit) {
      throw window.GameModules.drawProvider.createError('dzmm.draw.edit 不可用', 'DRAW_PROVIDER_UNAVAILABLE');
    }
    return window.dzmm.draw.edit(options);
  },
});

window.GameModules.drawProvider.register('pixai', {
  id: 'pixai',

  async listModels() {
    const cfg = window.GameModules.drawProvider.config('pixai');
    return {
      models: (Array.isArray(cfg.recommendedModels) ? cfg.recommendedModels : []).map((model) => ({
        id: String(model.id || '').trim(),
        displayName: model.displayName || model.name || String(model.id || '').trim(),
        description: model.description || '',
      })).filter((model) => model.id),
      defaultModel: cfg.defaultModel || '1983308862240288769',
    };
  },

  settings() {
    return window.GameModules.drawProvider.storeSettings();
  },

  apiRoot() {
    const configured = String(this.settings().pixaiBaseUrl || window.GameModules.drawProvider.config('pixai').baseUrl || 'https://api.pixai.art').trim();
    return (configured || 'https://api.pixai.art').replace(/\/+$/, '').replace(/\/v[12]$/i, '');
  },

  apiKey() {
    return String(
      this.settings().pixaiApiKey
      || window.GameModules.localSettings?.readGeneratedPixaiKey?.()
      || window.GameModules.generatedKeys?.pixaiKey
      || '',
    ).trim();
  },

  ensureApiKey() {
    const key = this.apiKey();
    if (!key) throw window.GameModules.drawProvider.createError('PixAI API Key 未配置', 'AUTH_REQUIRED', { retryable: false });
    return key;
  },

  modelVersionId(model = '') {
    const s = this.settings();
    const id = String(model || s.pixaiModelVersionId || '').trim();
    if (!id || id === 'custom') {
      throw window.GameModules.drawProvider.createError('请先填写 PixAI modelVersionId（模型页面 URL 的最后一段）', 'MODEL_REQUIRED');
    }
    return id;
  },

  headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.ensureApiKey()}`,
    };
  },

  buildPayload(options = {}) {
    const s = this.settings();
    const payload = {
      modelVersionId: this.modelVersionId(options.model),
      prompt: String(options.prompt || '').trim(),
      aspectRatio: String(options.dimension || options.aspectRatio || '2:3').trim() || '2:3',
      mode: String(options.mode || s.pixaiMode || 'standard').trim() || 'standard',
    };
    const negativePrompt = String(options.negativePrompt || '').trim();
    if (negativePrompt) payload.negativePrompt = negativePrompt;
    const size = String(options.size || s.pixaiSize || '').trim();
    if (size) payload.size = size;
    const style = String(options.style || s.pixaiStyle || '').trim();
    if (style) payload.style = style;
    if (s.pixaiPromptHelper === false) payload.promptHelper = 'disable';
    return payload;
  },

  async generate(options = {}) {
    const payload = this.buildPayload(options);
    if (!payload.prompt) throw window.GameModules.drawProvider.createError('PixAI 绘图提示词为空', 'PROMPT_REQUIRED');
    const create = await window.GameModules.drawProvider.fetchJson(`${this.apiRoot()}/v2/image/create`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    const taskId = create?.id || create?.taskId;
    if (!taskId) throw window.GameModules.drawProvider.createError('PixAI 未返回 task id', 'TASK_ID_MISSING', { response: create });
    const task = await this.pollTask(taskId);
    const images = (Array.isArray(task?.outputs?.mediaUrls) ? task.outputs.mediaUrls : []).filter(Boolean);
    return { images, taskId, provider: 'pixai', raw: task };
  },

  async pollTask(taskId = '') {
    const maxAttempts = 80;
    for (let i = 0; i < maxAttempts; i += 1) {
      const task = await window.GameModules.drawProvider.fetchJson(`${this.apiRoot()}/v1/task/${encodeURIComponent(taskId)}`, {
        method: 'GET',
        headers: this.headers(),
      });
      const status = String(task?.status || '').toLowerCase();
      if (status === 'completed') return task;
      if (status === 'failed' || status === 'cancelled') {
        throw window.GameModules.drawProvider.createError(`PixAI 图片生成${status === 'failed' ? '失败' : '已取消'}`, 'TASK_FAILED', { task, retryable: false });
      }
      await window.GameModules.drawProvider.sleep(Math.min(8000, 1500 + (i * 250)));
    }
    throw window.GameModules.drawProvider.createError('PixAI 图片生成超时，请稍后到任务记录中确认结果', 'TASK_TIMEOUT', { retryable: true });
  },

  async edit() {
    throw window.GameModules.drawProvider.createError('PixAI 当前接入的是 v2 文生图接口，不兼容 dzmm.draw.edit 图片编辑；需要编辑图片时请切回 dzmm。', 'DRAW_EDIT_UNSUPPORTED', { retryable: false });
  },
});
