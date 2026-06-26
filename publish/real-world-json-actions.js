window.GameModules = window.GameModules || {};

window.GameModules.realWorldJsonActions = {
  async completeConfiguredUpdateJson(store, prompt, logId, config = this.realConfig()) {
    let combined = await this.completeConfiguredStep(store, prompt, logId, false, config);
    let lastErr = null;
    for (let i = 0; i < 6; i += 1) {
      try { return this.parseCompleteUpdateJson(combined); }
      catch (err) {
        lastErr = err;
        if (!this.updateJsonNeedsCompletion(combined, err) || i === 5) break;
        console.warn(`${config.label}更新 JSON 被截断，补全重试 ${i + 1}/5:`, err.message);
        const next = await this.completeConfiguredStep(store, this.updateJsonContinuationPrompt(prompt, combined, err), logId, false, config);
        combined = this.mergeUpdateJsonContinuation(combined, next);
      }
    }
    return await this.regenerateCompactUpdateJson(store, prompt, logId, config, combined, lastErr);
  },

  async regenerateCompactUpdateJson(store, prompt, logId, config, badRaw, err) {
    let nextPrompt = this.updateJsonRetryPrompt(prompt, badRaw, err);
    let combined = '';
    let lastErr = err;
    for (let i = 0; i < 3; i += 1) {
      const raw = await this.completeConfiguredStep(store, nextPrompt, logId, false, config);
      combined = combined ? this.mergeUpdateJsonContinuation(combined, raw) : raw;
      try { return this.parseCompleteUpdateJson(combined); }
      catch (e) {
        lastErr = e;
        if (!this.updateJsonNeedsCompletion(combined, e)) break;
        nextPrompt = this.updateJsonContinuationPrompt(prompt, combined, e);
      }
    }
    throw lastErr || new Error(`${config.label}更新 JSON 生成失败`);
  },

  updateJsonNeedsCompletion(raw = '', err = null) {
    const text = this.cleanUpdateJsonText(raw);
    return /截断|incomplete|Unexpected end|unterminated/i.test(String(err?.message || '')) || window.GameModules.aiRequest?.outputTailLooksTruncated?.(text);
  },

  cleanUpdateJsonText(raw = '') {
    return String(raw || '').replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  },

  mergeUpdateJsonContinuation(base = '', next = '') {
    const a = this.cleanUpdateJsonText(base);
    const b = this.cleanUpdateJsonText(next);
    if (!b) return a;
    try { this.parseCompleteUpdateJson(b); return b; }
    catch (_) {}
    if (b.startsWith('{') && b.length > a.length * 0.7) return b;
    return window.GameModules.jsonUtils?.mergeStreamText?.(a, b) || (a + b);
  },

  updateJsonContinuationPrompt(prompt, raw, err) {
    const partial = this.cleanUpdateJsonText(raw);
    return [
      '# JSON 补全任务',
      '上一次输出的 JSON 被截断。你必须只输出“从上次最后一个字符之后开始”的剩余 JSON 字符。',
      '禁止重复已经输出的前缀；禁止解释；禁止 Markdown；禁止代码块；禁止重新从 { 开始，除非上次内容完全不可续写。',
      '补全文本也必须保持紧凑 JSON：不要换行、不要缩进、不要多余空格。',
      `错误：${err?.message || 'JSON不完整'}`,
      `原始要求：${String(prompt || '').slice(0, 2200)}`,
      `已输出完整前缀：${partial.slice(0, 9000)}`,
      `已输出尾部：${partial.slice(-1200)}`,
    ].join('\n\n');
  },
};

Object.assign(window.GameModules.realWorldAgentLoop || {}, window.GameModules.realWorldJsonActions);
