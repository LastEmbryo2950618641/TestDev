/**
 * AI 剧情请求与结果解析。
 */
window.GameModules = window.GameModules || {};

window.GameModules.ai = {
  latestRequestId: 0,

  async withRetry(fn, max = 3) {
    for (let i = 0; i < max; i += 1) {
      try {
        return await fn();
      } catch (err) {
        const retryable = window.dzmm?.errors?.isDzmmError?.(err) && err.retryable;
        if (!retryable || i === max - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** i));
      }
    }
  },

  async generate(store, action) {
    const requestId = ++this.latestRequestId;
    let buffer = '';
    const messages = [{ role: 'user', content: window.GameModules.createSystemPrompt(store, action) }];

    try {
      await this.withRetry(() => window.dzmm.completions({
        model: store.modelId,
        messages,
        maxTokens: 1200,
      }, async (chunk, done) => {
        if (requestId !== this.latestRequestId) return;
        buffer += chunk;
        if (!done) return;
        await store.applyResult(this.parse(buffer, store, action));
      }));
    } catch (err) {
      console.error('AI 推演失败:', err.code, err.message, err.stack);
      if (requestId === this.latestRequestId) {
        await store.applyResult(window.GameModules.createFallbackResult(store, action));
      }
    }
  },

  parse(content, store, action) {
    try {
      const start = content.indexOf('{');
      const end = content.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('AI 没有返回 JSON');
      const data = JSON.parse(content.slice(start, end + 1));
      return this.normalize(data, store, action);
    } catch (err) {
      console.warn('AI 返回解析失败:', err.message);
      return window.GameModules.createFallbackResult(store, action);
    }
  },

  normalize(data, store, action) {
    const fallback = window.GameModules.createFallbackResult(store, action);
    const changes = data.statChanges || {};
    return {
      sceneTitle: String(data.sceneTitle || fallback.sceneTitle).slice(0, 12),
      narration: String(data.narration || fallback.narration),
      speech: String(data.speech || fallback.speech),
      mind: String(data.mind || fallback.mind),
      mood: ['冷静', '紧张', '愤怒', '动摇', '信任', '恐惧', '好奇', '坚定'].includes(data.mood) ? data.mood : fallback.mood,
      trust: this.clampNumber(data.trust, fallback.trust),
      resistance: this.clampNumber(data.resistance, fallback.resistance),
      quest: String(data.quest || fallback.quest).slice(0, 24),
      choices: Array.isArray(data.choices) && data.choices.length ? data.choices.slice(0, 4).map((x) => String(x).slice(0, 14)) : fallback.choices.slice(0, 4),
      appearedCharacters: Array.isArray(data.appearedCharacters) ? data.appearedCharacters.slice(0, 3).map((x) => String(x).slice(0, 16)) : fallback.appearedCharacters,
      statChanges: {
        health: this.clampVitalDelta(changes.health),
        stamina: this.clampVitalDelta(changes.stamina),
        mana: this.clampVitalDelta(changes.mana),
      },
    };
  },

  clampNumber(value, fallback) {
    return Math.max(0, Math.min(100, Number.isFinite(value) ? Math.round(value) : fallback));
  },

  clampVitalDelta(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(-8, Math.min(8, Math.round(value)));
  },
};
