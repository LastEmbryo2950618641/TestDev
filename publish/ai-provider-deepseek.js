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
    return String(
      this.settings().deepseekApiKey
      || window.GameModules.localSettings?.readGeneratedDeepseekKey?.()
      || window.GameModules.generatedKeys?.deepseekKey
      || '',
    ).trim();
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

  requestModel(options = {}) {
    return this.normalizeModel(options.model);
  },

  thinkingPayload(options = {}) {
    if (options.thinking && typeof options.thinking === 'object') return options.thinking;
    if (options.deepThinking === true) return { type: 'enabled' };
    if (options.deepThinking === false) return { type: 'disabled' };
    return null;
  },

  jsonModeEnabled(options = {}) {
    const format = options.responseFormat || options.response_format;
    return Boolean(options.jsonMode || options.forceJson || format?.type === 'json_object');
  },

  jsonResponseFormat(options = {}) {
    if (!this.jsonModeEnabled(options)) return null;
    const format = options.responseFormat || options.response_format;
    return format && typeof format === 'object' ? format : { type: 'json_object' };
  },

  jsonMessages(messages = [], options = {}) {
    const list = (Array.isArray(messages) ? messages : []).map((msg) => ({ role: msg?.role || 'user', content: String(msg?.content || '') }));
    if (!this.jsonModeEnabled(options)) return list;
    const hasJsonHint = list.some((msg) => /json/i.test(String(msg.content || '')));
    if (hasJsonHint) return list;
    return [
      {
        role: 'system',
        content: 'You must return valid JSON only. Output a single JSON object. Do not include Markdown, code fences, comments, or explanatory text. The response must parse with JSON.parse.',
      },
      ...list,
    ];
  },

  responseInfo({ text = '', usage = {}, reasoningText = '', done = true } = {}) {
    return {
      buffer: text,
      chunkCount: text ? 1 : 0,
      done,
      doneSeen: done,
      usage,
      deepseekReasoning: reasoningText ? { text: reasoningText } : undefined,
      deepseekCache: {
        promptCacheHitTokens: Number(usage.prompt_cache_hit_tokens) || 0,
        promptCacheMissTokens: Number(usage.prompt_cache_miss_tokens) || 0,
      },
    };
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
        thinkingSupported: /reasoner|v4-pro|v4-flash/i.test(id),
      }));
    const defaultModel = models.find((item) => item.internalName === this.normalizeModel())?.internalName
      || models.find((item) => item.internalName === 'deepseek-v4-flash')?.internalName
      || models[0]?.internalName
      || 'deepseek-v4-flash';
    return { models, defaultModel };
  },

  async complete(options = {}) {
    const responseFormat = this.jsonResponseFormat(options);
    const thinking = this.thinkingPayload(options);
    const payload = {
      model: this.requestModel(options),
      messages: this.jsonMessages(options.messages || [], options),
      max_tokens: options.maxTokens,
      stream: Boolean(options.stream),
    };
    if (payload.stream) payload.stream_options = { include_usage: true };
    if (responseFormat) payload.response_format = responseFormat;
    if (thinking) {
      payload.thinking = thinking;
      if (thinking.type === 'enabled') payload.reasoning_effort = options.reasoningEffort || options.deepThinkingEffort || 'high';
    }
    const url = `${this.baseUrl()}/chat/completions`;
    const request = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...window.GameModules.aiProvider.authHeader(this.ensureApiKey()),
      },
      body: JSON.stringify(payload),
    };
    if (payload.stream) return await this.completeStream(url, request, options);
    const data = await window.GameModules.aiProvider.fetchJson(url, request);
    const message = data?.choices?.[0]?.message || {};
    const content = message.content;
    const text = Array.isArray(content) ? content.map((item) => item?.text || item?.content || '').join('') : String(content || '');
    const reasoningText = String(message.reasoning_content || message.reasoning || '');
    const usage = data?.usage || {};
    const info = this.responseInfo({ text, usage, reasoningText, done: true });
    await options.onChunk?.(text, true, info);
    await options.onDone?.(info);
    return text;
  },

  async completeStream(url, request, options = {}) {
    let response;
    try {
      response = await fetch(url, request);
    } catch (err) {
      throw window.GameModules.aiProvider.createError(err?.message || 'Network request failed', 'NETWORK_ERROR', { retryable: true, cause: err });
    }
    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch (_) { detail = ''; }
      throw window.GameModules.aiProvider.normalizeHttpError(response, detail);
    }
    if (!response.body?.getReader) {
      throw window.GameModules.aiProvider.createError('DeepSeek stream response is not readable', 'NETWORK_ERROR', { retryable: true });
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    let text = '';
    let reasoningText = '';
    let usage = {};
    let doneSeen = false;
    const emit = async (chunk = '', done = false) => {
      const info = this.responseInfo({ text, usage, reasoningText, done });
      info.doneSeen = doneSeen || done;
      await options.onChunk?.(chunk, done, info);
      if (done) await options.onDone?.(info);
    };
    const handleData = async (raw = '') => {
      const line = String(raw || '').trim();
      if (!line) return;
      if (line === '[DONE]') {
        doneSeen = true;
        return;
      }
      let data = null;
      try { data = JSON.parse(line); } catch (_) { return; }
      if (data.usage) usage = data.usage;
      const delta = data.choices?.[0]?.delta || data.choices?.[0]?.message || {};
      const reasoningDelta = String(delta.reasoning_content || delta.reasoning || '');
      if (reasoningDelta) {
        reasoningText += reasoningDelta;
        await emit('', false);
      }
      const content = delta.content;
      const chunk = Array.isArray(content) ? content.map((item) => item?.text || item?.content || '').join('') : String(content || '');
      if (chunk) {
        text += chunk;
        await emit(chunk, false);
      }
    };
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const blocks = pending.split(/\r?\n\r?\n/);
      pending = blocks.pop() || '';
      for (const block of blocks) {
        const lines = block.split(/\r?\n/).filter((line) => line.startsWith('data:'));
        for (const line of lines) await handleData(line.replace(/^data:\s*/u, ''));
      }
    }
    pending += decoder.decode();
    for (const line of pending.split(/\r?\n/).filter((item) => item.startsWith('data:'))) await handleData(line.replace(/^data:\s*/u, ''));
    doneSeen = true;
    await emit('', true);
    return text;
  },
});

