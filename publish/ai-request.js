/**
 * 全局 AI 请求入口：统一受控并行、限流、重试与日志。
 */
window.GameModules = window.GameModules || {};

window.GameModules.aiRequest = {
  pending: [],
  maxConcurrent: window.GameModules.config?.aiRequest?.maxConcurrent || 4,
  startGate: Promise.resolve(),
  seq: 0,
  queued: 0,
  active: 0,
  logicalCount: 0,
  actualCount: 0,
  completedCount: 0,
  failedAttemptCount: 0,
  retryCount: 0,
  sourceCounts: {},
  lastStartedAt: 0,
  minGapMs: 1600,
  cooldownUntil: 0,
  activationBurstDepth: 0,
  _savedThrottle: null,

  beginActivationBurst() {
    this.activationBurstDepth = (this.activationBurstDepth || 0) + 1;
    if (this.activationBurstDepth > 1) return;
    this._savedThrottle = { maxConcurrent: this.maxConcurrent, minGapMs: this.minGapMs };
    const burst = window.GameModules.config?.aiRequest?.activationBurst || {};
    this.maxConcurrent = Math.max(this.maxConcurrent, Number(burst.maxConcurrent) || 8);
    this.minGapMs = Math.min(this.minGapMs, Number.isFinite(Number(burst.minGapMs)) ? Number(burst.minGapMs) : 400);
    this.log('激活加速', { maxConcurrent: this.maxConcurrent, minGapMs: this.minGapMs });
  },

  endActivationBurst() {
    if (!this.activationBurstDepth) return;
    this.activationBurstDepth -= 1;
    if (this.activationBurstDepth > 0) return;
    if (this._savedThrottle) {
      this.maxConcurrent = this._savedThrottle.maxConcurrent;
      this.minGapMs = this._savedThrottle.minGapMs;
      this._savedThrottle = null;
      this.log('激活加速结束', { maxConcurrent: this.maxConcurrent, minGapMs: this.minGapMs });
    }
  },

  wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); },

  lengths(messages) {
    return (messages || []).map((msg) => String(msg?.content || '').length);
  },

  providerMessages(messages = []) {
    return (Array.isArray(messages) ? messages : []).map((msg) => ({
      role: String(msg?.role || 'user'),
      content: String(msg?.content || ''),
    }));
  },

  outputLengthThreshold(options = {}) {
    return Number(options.outputLengthThreshold || 2400);
  },

  outputLimitSetting(options = {}) {
    const store = window.Alpine?.store?.('game');
    const settings = store?.settingsState || {};
    const kind = String(options.outputLimitKind || 'other');
    const prefixes = {
      stage1: 'aiOutputLimitStage1',
      stage2: 'aiOutputLimitStage2',
      stage3: 'aiOutputLimitStage3',
      stage4: 'aiOutputLimitStage4',
      other: 'aiOutputLimitOther',
    };
    const prefix = prefixes[kind] || prefixes.other;
    const defaultModes = { global: 'unlimited', stage1: 'global', stage2: 'global', stage3: 'limited', stage4: 'global', other: 'global' };
    const stageMode = String(settings[`${prefix}Mode`] || defaultModes[kind] || 'global');
    const mode = stageMode === 'global' ? String(settings.aiOutputLimitGlobalMode || defaultModes.global) : stageMode;
    if (mode !== 'limited') return null;
    const value = stageMode === 'global' ? (settings.aiOutputLimitGlobalMaxTokens ?? 3000) : (settings[`${prefix}MaxTokens`] ?? 3000);
    const limit = Math.floor(Number(value) || 0);
    return limit > 0 ? limit : null;
  },

  configuredMaxTokens(options = {}) {
    const limit = this.outputLimitSetting(options);
    if (!limit) return options.maxTokens;
    if (options.maxTokens === undefined || options.maxTokens === null || options.maxTokens === '') return limit;
    const requested = Math.floor(Number(options.maxTokens));
    return Number.isFinite(requested) ? Math.min(requested, limit) : limit;
  },

  outputTailLooksTruncated(text) {
    const raw = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/g, '').trim();
    if (!raw) return false;
    let inString = false;
    let escaped = false;
    let openBraces = 0;
    let openBrackets = 0;
    for (const char of raw) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = inString; continue; }
      if (char === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (char === '{') openBraces += 1;
      if (char === '}') openBraces -= 1;
      if (char === '[') openBrackets += 1;
      if (char === ']') openBrackets -= 1;
    }
    const tail = raw.slice(-80);
    return inString || openBraces > 0 || openBrackets > 0 || /[:,{[]\s*$/.test(tail);
  },

  outputLengthRisk(buffer, options = {}) {
    const length = String(buffer || '').length;
    const threshold = this.outputLengthThreshold(options);
    return { length, threshold, overThreshold: length >= threshold, tailLooksTruncated: this.outputTailLooksTruncated(buffer) };
  },

  clampMaxTokens(value, fallback = undefined) {
    const raw = value === undefined || value === null ? fallback : value;
    if (raw === undefined || raw === null) return undefined;
    const tokens = Math.floor(Number(raw));
    if (!Number.isFinite(tokens)) return undefined;
    return Math.max(16, Math.min(64000, tokens));
  },

  countSource(source) {
    this.sourceCounts[source] = (this.sourceCounts[source] || 0) + 1;
    return this.sourceCounts[source];
  },

  stats() {
    return { logicalCount: this.logicalCount, actualCount: this.actualCount, completedCount: this.completedCount, failedAttemptCount: this.failedAttemptCount, retryCount: this.retryCount, queued: this.queued, active: this.active, maxConcurrent: this.maxConcurrent, sourceCounts: { ...this.sourceCounts } };
  },

  log(event, data = {}) {
    if (!window.GameModules.config?.aiRequest?.logLifecycle) return;
    console.debug(`[AI请求] ${event}:`, { ...data, stats: this.stats() });
  },

  logRawRequest(options, payload, meta = {}) {
    if (window.GameModules.config?.aiRequest?.logRawRequest === false) return;
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const prompt = options.prompt !== undefined
      ? String(options.prompt || '')
      : messages.map((msg, index) => `--- message ${index + 1} role=${msg?.role || 'unknown'} ---\n${String(msg?.content || '')}`).join('\n\n');
    console.log('[AI请求参数]', {
      id: options.id,
      source: options.source,
      model: options.model,
      maxTokens: options.maxTokens,
      timeoutMs: options.timeoutMs,
      prompt,
      messageCount: messages.length,
      roles: messages.map((msg) => msg?.role || 'unknown'),
      messageLengths: messages.map((msg) => String(msg?.content || '').length),
      messages: messages.map((msg, index) => ({ index, role: msg?.role || 'unknown', length: String(msg?.content || '').length, preview: String(msg?.content || '').slice(0, 160) })),
      ...meta,
    });
  },

  logRawResponse(options, buffer, meta = {}) {
    if (window.GameModules.config?.aiRequest?.logRawResponse === false) return;
    console.log('[AI返回]', {
      id: options.id,
      source: options.source,
      model: options.model,
      length: String(buffer || '').length,
      ...meta,
      value: buffer,
    });
  },

  selectedTextModel(fallback = '') {
    return fallback || window.GameModules.aiProvider?.selectedTextModel?.() || window.GameModules.config?.defaultModelId || 'nalang-turbo-0826';
  },

  isRetryable(err) {
    const message = String(err?.message || '').toLowerCase();
    return Boolean(err?.retryable || ['RATE_LIMITED', 'TIMEOUT', 'NETWORK_ERROR', 'INTERNAL_ERROR', 'SERVICE_UNAVAILABLE', 'DRAW_TIMEOUT', 'AI_TIMEOUT'].includes(err?.code)
      || /http\s*(502|503|504)/i.test(message) || message.includes('failed to fetch') || message.includes('network') || message.includes('fetch failed'));
  },

  retryDelay(err, attempt) {
    const message = String(err?.message || '').toLowerCase();
    if (err?.code === 'RATE_LIMITED') return Math.min(16000, 5000 + attempt * 5000);
    if (/http\s*(502|503|504)/i.test(message)) return Math.min(18000, 4500 * (2 ** attempt));
    if (message.includes('failed to fetch')) return Math.min(12000, 3500 * (attempt + 1));
    return Math.min(9000, 1800 * (2 ** attempt));
  },

  applyCooldown(err, delay) {
    const message = String(err?.message || '').toLowerCase();
    if (err?.code === 'RATE_LIMITED' || /http\s*(502|503|504)/i.test(message) || message.includes('failed to fetch')) {
      this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + delay);
    }
  },

  timeout(promise, ms, source) {
    if (!ms) return promise;
    return Promise.race([promise, new Promise((_, reject) => setTimeout(() => {
      const err = new Error(`${source || 'AI请求'}超时`);
      err.code = 'AI_TIMEOUT';
      err.retryable = true;
      reject(err);
    }, ms))]);
  },

  isNarrationThinkingRequest(options = {}) {
    const responseFormat = options.responseFormat || options.response_format;
    return String(options.outputLimitKind || '') === 'stage3'
      && options.jsonMode !== true
      && responseFormat?.type !== 'json_object';
  },

  applyThinkingPolicy(options = {}) {
    const enabled = this.isNarrationThinkingRequest(options) && options.deepThinking !== false;
    return {
      ...options,
      deepThinking: enabled,
      thinking: { type: enabled ? 'enabled' : 'disabled' },
    };
  },

  async complete(options = {}) {
    options = this.applyThinkingPolicy(options);
    const providerId = window.GameModules.aiProvider?.currentProviderId?.() || 'deepseek';
    const provider = window.GameModules.aiProvider?.currentProvider?.();
    if (typeof provider?.complete !== 'function') {
      throw new Error(`text AI provider ${providerId} unavailable: complete`);
    }
    const id = ++this.seq;
    const source = options.source || 'unknown';
    const messages = options.messages || [{ role: 'user', content: options.prompt || '' }];
    const model = this.selectedTextModel(options.model);
    const maxTokens = this.clampMaxTokens(this.configuredMaxTokens(options), undefined);
    const enqueueAt = Date.now();
    const tokenRecordId = window.GameModules.tokenStats?.record?.(source, messages.map((msg) => String(msg?.content || '')).join('\n'), { ...(options.tokenMeta || {}), model, maxTokens });
    try { options.onTokenRecord?.(tokenRecordId, { id, source, model, maxTokens, enqueueAt, messages }); } catch (err) { console.warn('[AI请求] onTokenRecord failed:', err?.message || err); }
    const sourceCount = this.countSource(source);
    this.logicalCount += 1;
    this.queued += 1;
    this.log('入队', { id, source, sourceCount, logicalNo: this.logicalCount, model, maxTokens: maxTokens || 'sdk-default', queued: this.queued, active: this.active, maxConcurrent: this.maxConcurrent, messageLengths: this.lengths(messages) });
    return new Promise((resolve, reject) => {
      this.pending.push({ options: { ...options, id, source, model, maxTokens, messages, enqueueAt, tokenRecordId }, resolve, reject });
      this.pump();
    });
  },

  pump() {
    while (this.active < this.maxConcurrent && this.pending.length) {
      const task = this.pending.shift();
      this.queued = Math.max(0, this.queued - 1);
      this.active += 1;
      this.log('出队', { id: task.options.id, source: task.options.source, queued: this.queued, active: this.active, maxConcurrent: this.maxConcurrent });
      Promise.resolve()
        .then(() => this.runWithRetries(task.options))
        .then(task.resolve, task.reject)
        .finally(() => {
          this.active = Math.max(0, this.active - 1);
          this.pump();
        });
    }
  },

  async enterStartGate(options, attempt) {
    const previous = this.startGate;
    let release;
    this.startGate = new Promise((resolve) => { release = resolve; });
    await previous.catch(() => {});
    const now = Date.now();
    const gapWait = Math.max(0, this.minGapMs - (now - this.lastStartedAt));
    const cooldownWait = Math.max(0, this.cooldownUntil - now);
    const waitMs = Math.max(gapWait, cooldownWait);
    if (waitMs) {
      this.log('等待限流', { id: options.id, source: options.source, attempt: attempt + 1, waitMs, queued: this.queued, active: this.active });
      await this.wait(waitMs);
    }
    this.lastStartedAt = Date.now();
    release();
  },

  async runWithRetries(options) {
    let lastErr = null;
    const maxAttempts = options.maxAttempts || 3;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await this.enterStartGate(options, attempt);
      try {
        return await this.callOnce(options, attempt);
      } catch (err) {
        lastErr = err;
        this.failedAttemptCount += 1;
        this.log('失败', { id: options.id, source: options.source, attempt: attempt + 1, code: err.code, message: err.message, retryable: this.isRetryable(err) });
        if (!this.isRetryable(err) || attempt === maxAttempts - 1) throw err;
        const delay = this.retryDelay(err, attempt);
        this.applyCooldown(err, delay);
        this.retryCount += 1;
        this.log('重试等待', { id: options.id, source: options.source, nextAttempt: attempt + 2, delay });
        await this.wait(delay);
      }
    }
    throw lastErr;
  },

  async callOnce(options, attempt) {
    let buffer = '';
    let chunkCount = 0;
    let doneSeen = false;
    let responseMeta = {};
    const mergeResponseMeta = (meta = {}) => {
      if (!meta || typeof meta !== 'object') return;
      if (meta.usage) responseMeta.usage = meta.usage;
      if (meta.deepseekCache) responseMeta.deepseekCache = meta.deepseekCache;
      if (meta.deepseekReasoning) responseMeta.deepseekReasoning = meta.deepseekReasoning;
      if (meta.provider) responseMeta.provider = meta.provider;
    };
    let callbackChain = Promise.resolve();
    const startAt = Date.now();
    this.actualCount += 1;
    this.log('开始', { id: options.id, source: options.source, actualNo: this.actualCount, attempt: attempt + 1, queueWaitMs: startAt - options.enqueueAt, model: options.model, maxTokens: options.maxTokens || 'sdk-default', messageLengths: this.lengths(options.messages) });
    const providerMessages = this.providerMessages(options.messages);
    const payload = { model: options.model, messages: providerMessages };
    if (options.maxTokens !== undefined && options.maxTokens !== null) payload.maxTokens = options.maxTokens;
    this.logRawRequest(options, payload, { attempt: attempt + 1, queueWaitMs: startAt - options.enqueueAt });
    const progressRecord = (status = 'running') => {
      window.GameModules.tokenStats?.recordProgress?.(options.tokenRecordId, {
        status,
        chunkCount,
        doneSeen,
        durationMs: Date.now() - startAt,
        queueWaitMs: startAt - options.enqueueAt,
        ...responseMeta,
        responseText: buffer,
      });
    };
    const progressTimer = options.tokenRecordId ? setInterval(() => progressRecord(buffer ? 'streaming' : 'running'), 2000) : 0;
    try {
    const provider = window.GameModules.aiProvider?.currentProvider?.();
    const request = provider.complete({
      ...options,
      suppressTokenStats: true,
      messages: providerMessages,
      payload,
      onChunk: async (chunk, done, providerInfo = {}) => {
        mergeResponseMeta(providerInfo);
        const text = String(chunk || '');
        if (text) {
          chunkCount += 1;
          buffer = window.GameModules.jsonUtils?.mergeStreamText?.(buffer, text) ?? (buffer + text);
          if (options.logChunks && (chunkCount === 1 || chunkCount % 20 === 0)) this.log('流式片段', { id: options.id, source: options.source, chunkCount, length: buffer.length });
        }
        if (done) doneSeen = true;
        const info = { id: options.id, source: options.source, buffer, chunkCount, done: Boolean(done), doneSeen, ...responseMeta };
        callbackChain = callbackChain.then(async () => {
          await options.onChunk?.(text, Boolean(done), info);
          if (done) await options.onDone?.(info);
        });
        if (options.tokenRecordId && (done || chunkCount <= 2 || chunkCount % 5 === 0)) {
          progressRecord(done ? 'completed' : (buffer ? 'streaming' : 'running'));
        }
      },
      onDone: async (providerInfo = {}) => { mergeResponseMeta(providerInfo); },
    });
    await this.timeout(Promise.resolve(request).then(() => callbackChain), options.timeoutMs, options.source);
    if (options.requireDone && !doneSeen) throw new Error(`${options.source}流式未完成`);
    this.completedCount += 1;
    const completedAt = Date.now();
    const durationMs = completedAt - startAt;
    const queueWaitMs = startAt - options.enqueueAt;
    const risk = this.outputLengthRisk(buffer, options);
    this.log('完成', { id: options.id, source: options.source, chunkCount, length: risk.length, outputThreshold: risk.threshold, overThreshold: risk.overThreshold, tailLooksTruncated: risk.tailLooksTruncated, possibleTruncated: risk.overThreshold || risk.tailLooksTruncated, doneSeen, durationMs });
    this.logRawResponse(options, buffer, { chunkCount, doneSeen, durationMs, queueWaitMs, ...responseMeta });
    window.GameModules.tokenStats?.recordResponse?.(options.tokenRecordId, buffer, [], { chunkCount, doneSeen, durationMs, queueWaitMs, startedAt: startAt, completedAt, ...responseMeta });
    if (risk.overThreshold || risk.tailLooksTruncated) {
      console.debug('[AI请求] 返回长度可能被截断:', { id: options.id, source: options.source, length: risk.length, threshold: risk.threshold, overThreshold: risk.overThreshold, tailLooksTruncated: risk.tailLooksTruncated, doneSeen, tailPreview: buffer.slice(-180) });
    }
    return buffer;
    } catch (err) {
      if (options.tokenRecordId) {
        window.GameModules.tokenStats?.recordError?.(options.tokenRecordId, err, {
          chunkCount,
          doneSeen,
          startedAt: startAt,
          completedAt: Date.now(),
          durationMs: Date.now() - startAt,
          queueWaitMs: startAt - options.enqueueAt,
          ...responseMeta,
          responseText: buffer,
        });
      }
      throw err;
    } finally {
      if (progressTimer) clearInterval(progressTimer);
    }
  },
};
