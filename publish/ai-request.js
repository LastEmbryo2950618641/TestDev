/**
 * 全局 AI 请求入口：统一串行限流、重试与日志。
 */
window.GameModules = window.GameModules || {};

window.GameModules.aiRequest = {
  queue: Promise.resolve(),
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
  minGapMs: 900,
  cooldownUntil: 0,

  wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); },

  lengths(messages) {
    return (messages || []).map((msg) => String(msg?.content || '').length);
  },

  countSource(source) {
    this.sourceCounts[source] = (this.sourceCounts[source] || 0) + 1;
    return this.sourceCounts[source];
  },

  stats() {
    return { logicalCount: this.logicalCount, actualCount: this.actualCount, completedCount: this.completedCount, failedAttemptCount: this.failedAttemptCount, retryCount: this.retryCount, queued: this.queued, active: this.active, sourceCounts: { ...this.sourceCounts } };
  },

  log(event, data = {}) {
    console.log(`[AI请求] ${event}:`, { ...data, stats: this.stats() });
  },

  isRetryable(err) {
    const message = String(err?.message || '').toLowerCase();
    return Boolean(err?.retryable || ['RATE_LIMITED', 'TIMEOUT', 'NETWORK_ERROR', 'INTERNAL_ERROR', 'SERVICE_UNAVAILABLE', 'DRAW_TIMEOUT', 'AI_TIMEOUT'].includes(err?.code)
      || message.includes('failed to fetch') || message.includes('network') || message.includes('fetch failed'));
  },

  retryDelay(err, attempt) {
    if (err?.code === 'RATE_LIMITED') return Math.min(12000, 4000 + attempt * 4000);
    if (String(err?.message || '').toLowerCase().includes('failed to fetch')) return Math.min(8000, 2500 * (attempt + 1));
    return Math.min(6000, 1200 * (2 ** attempt));
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

  async complete(options = {}) {
    if (!window.dzmm?.completions) throw new Error('dzmm.completions unavailable');
    const id = ++this.seq;
    const source = options.source || 'unknown';
    const messages = options.messages || [{ role: 'user', content: options.prompt || '' }];
    const model = options.model || 'nalang-turbo-0826';
    const maxTokens = options.maxTokens || 1000;
    const enqueueAt = Date.now();
    const sourceCount = this.countSource(source);
    this.logicalCount += 1;
    this.queued += 1;
    this.log('入队', { id, source, sourceCount, logicalNo: this.logicalCount, model, maxTokens, queued: this.queued, active: this.active, messageLengths: this.lengths(messages) });
    const run = this.queue.then(async () => {
      this.queued = Math.max(0, this.queued - 1);
      this.active += 1;
      try {
        return await this.runWithRetries({ ...options, id, source, model, maxTokens, messages, enqueueAt });
      } finally {
        this.active = Math.max(0, this.active - 1);
      }
    });
    this.queue = run.catch(() => {});
    return run;
  },

  async runWithRetries(options) {
    let lastErr = null;
    const maxAttempts = options.maxAttempts || 2;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const now = Date.now();
      const gapWait = Math.max(0, this.minGapMs - (now - this.lastStartedAt));
      const cooldownWait = Math.max(0, this.cooldownUntil - now);
      const waitMs = Math.max(gapWait, cooldownWait);
      if (waitMs) {
        this.log('等待限流', { id: options.id, source: options.source, attempt: attempt + 1, waitMs, queued: this.queued, active: this.active });
        await this.wait(waitMs);
      }
      try {
        return await this.callOnce(options, attempt);
      } catch (err) {
        lastErr = err;
        this.failedAttemptCount += 1;
        this.log('失败', { id: options.id, source: options.source, attempt: attempt + 1, code: err.code, message: err.message, retryable: this.isRetryable(err) });
        if (!this.isRetryable(err) || attempt === maxAttempts - 1) throw err;
        const delay = this.retryDelay(err, attempt);
        if (err.code === 'RATE_LIMITED' || String(err?.message || '').toLowerCase().includes('failed to fetch')) this.cooldownUntil = Date.now() + delay;
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
    let callbackChain = Promise.resolve();
    const startAt = Date.now();
    this.actualCount += 1;
    this.lastStartedAt = startAt;
    this.log('开始', { id: options.id, source: options.source, actualNo: this.actualCount, attempt: attempt + 1, queueWaitMs: startAt - options.enqueueAt, model: options.model, maxTokens: options.maxTokens, messageLengths: this.lengths(options.messages) });
    const request = window.dzmm.completions({ model: options.model, maxTokens: options.maxTokens, messages: options.messages }, (chunk, done) => {
      const text = String(chunk || '');
      if (text) {
        chunkCount += 1;
        buffer = window.GameModules.jsonUtils?.mergeStreamText?.(buffer, text) ?? (buffer + text);
        if (options.logChunks && (chunkCount === 1 || chunkCount % 20 === 0)) this.log('流式片段', { id: options.id, source: options.source, chunkCount, length: buffer.length });
      }
      if (done) doneSeen = true;
      const info = { id: options.id, source: options.source, buffer, chunkCount, done: Boolean(done), doneSeen };
      callbackChain = callbackChain.then(async () => {
        await options.onChunk?.(text, Boolean(done), info);
        if (done) await options.onDone?.(info);
      });
    });
    await this.timeout(Promise.resolve(request).then(() => callbackChain), options.timeoutMs, options.source);
    if (options.requireDone && !doneSeen) throw new Error(`${options.source}流式未完成`);
    this.completedCount += 1;
    this.log('完成', { id: options.id, source: options.source, chunkCount, length: buffer.length, doneSeen, durationMs: Date.now() - startAt });
    return buffer;
  },
};
