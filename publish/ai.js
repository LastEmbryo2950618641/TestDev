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

  async generate(store, action, logId = null) {
    const requestId = ++this.latestRequestId;
    let buffer = '';
    const messages = [{ role: 'user', content: window.GameModules.createSystemPrompt(store, action) }];
    console.log('[AI推演] 请求开始:', { requestId, action, model: store.modelId, promptLength: messages[0].content.length, ragLength: String(store.ragContext || '').length, memoryLength: String(store.memoryContext || '').length });

    try {
      await this.withRetry(() => window.dzmm.completions({
        model: store.modelId,
        messages,
        maxTokens: 3000,
      }, async (chunk, done) => {
        if (requestId !== this.latestRequestId) return;
        buffer = window.GameModules.jsonUtils.mergeStreamText(buffer, chunk);
        if (!done) {
          if (logId && store.updateNovelStream) store.updateNovelStream(logId, buffer);
          return;
        }
        console.log('[AI推演] 返回完成:', { requestId, length: buffer.length, preview: buffer.slice(0, 180) });
        await store.applyResult(this.parse(buffer, store, action), logId);
      }));
    } catch (err) {
      console.error('AI 推演失败:', err.code, err.message, err.stack);
      if (requestId === this.latestRequestId) {
        await store.applyResult({ ...window.GameModules.createFallbackResult(store, action), source: 'fallback' }, logId);
      }
    }
  },

  parse(content, store, action) {
    try {
      const data = window.GameModules.jsonUtils.parseLoose(content);
      console.log('[AI推演] JSON解析成功:', Object.keys(data));
      return { ...this.normalize(data, store, action), source: 'ai' };
    } catch (err) {
      console.warn('AI 返回解析失败:', err.message);
      return { ...window.GameModules.createFallbackResult(store, action), source: 'fallback' };
    }
  },

  normalize(data, store, action) {
    const fallback = { ...window.GameModules.createFallbackResult(store, action), source: 'fallback' };
    const changes = data.statChanges || {};
    return {
      sceneTitle: String(data.sceneTitle || fallback.sceneTitle).slice(0, 12),
      elapsedSeconds: this.clampElapsed(data.elapsedSeconds, fallback.elapsedSeconds),
      thinking: store.thinkingMode ? String(data.thinking || fallback.thinking || '').slice(0, 220) : '',
      narration: String(data.narration || fallback.narration),
      speech: String(data.speech || fallback.speech),
      mind: String(data.mind || ''),
      mood: ['冷静', '紧张', '愤怒', '动摇', '信任', '恐惧', '好奇', '坚定'].includes(data.mood) ? data.mood : fallback.mood,
      trust: this.clampNumber(data.trust, fallback.trust),
      resistance: this.clampNumber(data.resistance, fallback.resistance),
      quest: String(data.quest || fallback.quest).slice(0, 24),
      characterIntent: String(data.characterIntent || '').slice(0, 80),
      controlFeeling: String(data.controlFeeling || fallback.controlFeeling || '疑惑').slice(0, 40),
      controlAdaptation: this.clampNumber(data.controlAdaptation, fallback.controlAdaptation || 0),
      controlExperienceSummary: String(data.controlExperienceSummary || fallback.controlExperienceSummary || '').slice(0, 80),
      metricUpdates: this.normalizeMetricUpdates(data.metricUpdates),
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

  normalizeMetricUpdates(value) {
    const source = value || {};
    return { emotions: this.normalizeMetricGroup(source.emotions, window.GameModules.metrics.emotionKeys), playerFeelings: this.normalizeMetricGroup(source.playerFeelings, window.GameModules.metrics.playerKeys) };
  },

  normalizeInitialMetricUpdates(value, fallback, store) {
    const source = value || fallback || {};
    return { emotions: this.normalizeInitialGroup(source.emotions, null, window.GameModules.metrics.emotionKeys, store, 'emotion'), playerFeelings: this.normalizeInitialGroup(source.playerFeelings, null, window.GameModules.metrics.playerKeys, store, 'player') };
  },

  normalizeMetricGroup(value, keys) {
    const main = Array.isArray(value) ? value : [];
    return keys.map((key) => {
      const item = main.find((x) => x?.key === key);
      if (!item) return null;
      return {
        key,
        delta: window.GameModules.metrics.clampDelta(item.delta),
        status: String(item.status || '').slice(0, 80),
        reason: String(item.reason || '').slice(0, 80),
      };
    }).filter(Boolean);
  },

  normalizeInitialGroup(value, fallback, keys, store, type) {
    const list = Array.isArray(value) ? value : (Array.isArray(fallback) ? fallback : []);
    const actor = this.actorPronoun(store);
    return list.filter((item) => keys.includes(item?.key)).map((item) => {
      const metricValue = window.GameModules.metrics.clamp(item.value);
      const stage = window.GameModules.metrics.stageFor(item.key, metricValue);
      return {
        key: item.key,
        value: metricValue,
        status: String(item.status || this.fallbackMetricStatus(actor, item.key, stage, type)).slice(0, 80),
        reason: String(item.reason || this.fallbackMetricReason(actor, item.key, type)).slice(0, 80),
      };
    });
  },

  actorPronoun(store) {
    const c = store?.character || {};
    return /男性|男人|少年|青年|父亲|哥哥|弟弟|叔叔|丈夫|王子|皇帝/.test(`${c.name || ''} ${c.role || ''} ${c.detail || ''}`) ? '他' : '她';
  },

  fallbackMetricStatus(actor, key, stage, type) {
    if (type === 'emotion') return `${actor}的${key}处于“${stage}”：这项情绪正在影响${actor}对当前处境的反应。`;
    if (key === '爱情') return stage === '无感' ? `${actor}看着你时没有恋爱意义上的心动。` : `${actor}看到你时心里扑通扑通，似乎是${stage}了。`;
    if (key === '了解') return `${actor}对你的了解处于“${stage}”：${actor}只掌握你显露出的少量线索，还无法确认你的身份、来历和真正意图。`;
    return `${actor}对你的${key}处于“${stage}”：这项感觉正在影响${actor}如何看待你。`;
  },

  fallbackMetricReason(actor, key, type) {
    if (type === 'emotion') return `你介入了${actor}的行动与处境，使${actor}的${key}随当前剧情发生波动。`;
    if (key === '了解') return `${actor}只知道你能影响这具身体，还没有从你这里得到足以确认身份、来历或意图的信息。`;
    if (key === '信任') return `你曾直接影响${actor}的身体与行动权，所以${actor}暂时难以完全信任你。`;
    if (key === '警惕') return `${actor}不知道你下一步会如何使用这具身体，所以仍然对你保持戒备。`;
    return `你与${actor}的关系还没有出现足以明显改变${key}的具体事件。`;
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
