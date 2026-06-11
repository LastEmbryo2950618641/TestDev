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
    console.log('[AI推演] 请求开始:', { requestId, action, model: store.modelId, promptLength: messages[0].content.length, ragLength: String(store.ragContext || '').length, memoryLength: String(store.memoryContext || '').length });

    try {
      await this.withRetry(() => window.dzmm.completions({
        model: store.modelId,
        messages,
        maxTokens: 2600,
      }, async (chunk, done) => {
        if (requestId !== this.latestRequestId) return;
        buffer += chunk;
        if (!done) return;
        console.log('[AI推演] 返回完成:', { requestId, length: buffer.length, preview: buffer.slice(0, 180) });
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
      const cleaned = String(content || '').replace(/```(?:json)?|```/g, '').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('AI 没有返回 JSON');
      const data = JSON.parse(cleaned.slice(start, end + 1));
      console.log('[AI推演] JSON解析成功:', Object.keys(data));
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
      elapsedSeconds: this.clampElapsed(data.elapsedSeconds, fallback.elapsedSeconds),
      narration: String(data.narration || fallback.narration),
      speech: String(data.speech || fallback.speech),
      mind: String(data.mind || fallback.mind),
      mood: ['冷静', '紧张', '愤怒', '动摇', '信任', '恐惧', '好奇', '坚定'].includes(data.mood) ? data.mood : fallback.mood,
      trust: this.clampNumber(data.trust, fallback.trust),
      resistance: this.clampNumber(data.resistance, fallback.resistance),
      quest: String(data.quest || fallback.quest).slice(0, 24),
      characterIntent: String(data.characterIntent || fallback.characterIntent || '').slice(0, 80),
      controlFeeling: String(data.controlFeeling || fallback.controlFeeling || '疑惑').slice(0, 40),
      controlAdaptation: this.clampNumber(data.controlAdaptation, fallback.controlAdaptation || 0),
      controlExperienceSummary: String(data.controlExperienceSummary || fallback.controlExperienceSummary || '').slice(0, 80),
      metricUpdates: this.normalizeMetricUpdates(data.metricUpdates, fallback.metricUpdates, store),
      choices: this.normalizeChoices(data.choices, fallback.choices),
      appearedCharacters: Array.isArray(data.appearedCharacters) ? data.appearedCharacters.slice(0, 6).map((x) => this.normalizeCharacter(x, store)).filter(Boolean) : fallback.appearedCharacters,
      statChanges: {
        health: this.clampVitalDelta(changes.health),
        stamina: this.clampVitalDelta(changes.stamina),
        mental_stability: this.clampVitalDelta(changes.mental_stability),
      },
      combatEvent: this.normalizeCombatEvent(data.combatEvent),
    };
  },

  normalizeMetricUpdates(value, fallback, store) {
    const emotions = this.normalizeMetricGroup(value?.emotions, fallback?.emotions, window.GameModules.metrics.emotionKeys);
    const feelings = this.normalizeMetricGroup(value?.playerFeelings, fallback?.playerFeelings, window.GameModules.metrics.playerKeys);
    return {
      emotions: this.completeMetricGroup(emotions, window.GameModules.metrics.emotionKeys, store?.emotions, window.GameModules.metrics.defaults.emotions),
      playerFeelings: this.completeMetricGroup(feelings, window.GameModules.metrics.playerKeys, store?.playerFeelings, window.GameModules.metrics.defaults.playerFeelings),
    };
  },

  normalizeInitialMetricUpdates(value, fallback, store) {
    return {
      emotions: this.normalizeInitialGroup(value?.emotions, fallback?.emotions, window.GameModules.metrics.emotionKeys, store, 'emotion'),
      playerFeelings: this.normalizeInitialGroup(value?.playerFeelings, fallback?.playerFeelings, window.GameModules.metrics.playerKeys, store, 'player'),
    };
  },

  completeMetricGroup(items, keys, current, defaults) {
    const map = new Map(items.map((item) => [item.key, item]));
    return keys.map((key) => {
      if (map.get(key)) return map.get(key);
      const value = window.GameModules.metrics.clamp(current?.[key] ?? defaults[key]);
      const stage = window.GameModules.metrics.stageFor(key, value);
      return {
        key,
        delta: 0,
        status: window.GameModules.metrics.stageStatus(key, stage),
        reason: '本回合没有直接触发变化，保持原值。',
      };
    });
  },

  normalizeMetricGroup(value, fallback, keys) {
    const list = Array.isArray(value) ? value : (Array.isArray(fallback) ? fallback : []);
    return list.filter((item) => keys.includes(item?.key)).slice(0, 16).map((item) => ({
      key: item.key,
      delta: window.GameModules.metrics.clampDelta(item.delta),
      status: String(item.status || '').slice(0, 80),
      reason: String(item.reason || '').slice(0, 80),
    }));
  },

  normalizeInitialGroup(value, fallback, keys, store, type) {
    const list = Array.isArray(value) ? value : (Array.isArray(fallback) ? fallback : []);
    const c = store?.character || {};
    const actor = /男性|男人|少年|青年|父亲|哥哥|弟弟|叔叔|丈夫|王子|皇帝/.test(`${c.name || ''} ${c.role || ''} ${c.detail || ''}`) ? '他' : '她';
    const map = new Map(list.filter((item) => keys.includes(item?.key)).map((item) => [item.key, item]));
    return keys.map((key) => {
      const item = map.get(key) || {};
      const value = window.GameModules.metrics.clamp(item.value ?? window.GameModules.metrics.defaults.emotions[key] ?? window.GameModules.metrics.defaults.playerFeelings[key]);
      const stage = window.GameModules.metrics.stageFor(key, value);
      return {
        key,
        value,
        status: String(item.status || (key === '爱情' ? `${actor}看着你时还没有恋爱意义上的心动。` : (key === '了解' ? `${actor}对你的了解处于“${stage}”：${window.GameModules.metrics.stageStatus(key, stage)}` : `${actor}对你或当前处境的${key}处于“${stage}”状态。`))).slice(0, 80),
        reason: String(item.reason || this.metricReason(actor, key, type)).slice(0, 80),
      };
    });
  },

  metricReason(actor, key, type) {
    if (type === 'emotion') return `你突然介入${actor}的处境，让${actor}的${key}随之波动。`;
    if (key === '了解') return `${actor}只知道你能介入这具身体，却不知道你的身份、来历和真正意图。`;
    if (key === '信任') return `你第一次出现就影响了${actor}的身体，所以${actor}暂时无法信任你。`;
    return key === '警惕' ? `${actor}不知道你接下来会做什么，只能继续戒备。` : `你刚介入${actor}的处境，${actor}还没有形成更深的${key}。`;
  },

  normalizeChoices(value, fallback) {
    const base = Array.isArray(fallback) ? fallback : [];
    const list = Array.isArray(value) ? value : [];
    const merged = list.concat(base).map((item) => String(item || '').trim().slice(0, 14)).filter(Boolean);
    return [...new Set(merged)].slice(0, 4);
  },

  normalizeCombatEvent(value) {
    if (!value || typeof value !== 'object') return null;
    if (!Number.isFinite(value.effectiveDamage) && !Number.isFinite(value.attackPower) && !value.summary) return null;
    return {
      summary: String(value.summary || '战斗命中，按攻防差结算。').slice(0, 80),
      attackPower: Number.isFinite(value.attackPower) ? Math.round(value.attackPower) : undefined,
      defensePower: Number.isFinite(value.defensePower) ? Math.round(value.defensePower) : undefined,
      effectiveDamage: Number.isFinite(value.effectiveDamage) ? Math.max(0, Math.round(value.effectiveDamage)) : undefined,
    };
  },

  normalizeCharacter(value, store) {
    if (typeof value === 'string') return { name: value.slice(0, 16), work: store.character.work, isMinor: false, importance: 'support' };
    if (!value?.name) return null;
    return {
      name: String(value.name).slice(0, 16),
      role: String(value.role || (value.isMinor ? '路人' : '出场人物')).slice(0, 18),
      detail: String(value.detail || value.desc || '').slice(0, 120),
      personality: String(value.personality || '').slice(0, 80),
      work: String(value.work || store.character.work || '原创世界').slice(0, 24),
      isMinor: Boolean(value.isMinor),
      importance: ['minor', 'support', 'main'].includes(value.importance) ? value.importance : (value.isMinor ? 'minor' : 'support'),
    };
  },

  clampNumber(value, fallback) { return Math.max(0, Math.min(100, Number.isFinite(value) ? Math.round(value) : fallback)); },

  clampElapsed(value, fallback = 60) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(1, Math.min(2592000, Math.round(n))) : fallback;
  },

  clampVitalDelta(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(-8, Math.min(8, Math.round(value)));
  },
};
