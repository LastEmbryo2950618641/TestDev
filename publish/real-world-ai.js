/**
 * 现实世界 AI 推演请求。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldAi = {
  latestRequestId: 0,

  async generate(store, prompt, action, logId = null) {
    const requestId = ++this.latestRequestId;
    try {
      const loop = await window.GameModules.realWorldAgentLoop.run(store, action, logId);
      if (requestId !== this.latestRequestId) throw new Error('现实推演请求已被新请求取代');
      const result = this.parse(loop.result, store, action);
      result.promptPack = {
        systemPrompt: loop.prompt || prompt || '',
        userPrompt: action,
        model: store.modelId,
        promptTokens: Math.ceil(String(loop.prompt || prompt || '').length / 2),
        loadedContext: loop.loaded || [],
      };
      result.agentTrace = loop.trace || [];
      return result;
    } catch (err) {
      console.error('现实世界推演失败:', err.code, err.message, err.stack);
      throw err;
    }
  },

  parse(content, store, action) {
    try {
      const data = content && typeof content === 'object' ? content : window.GameModules.jsonUtils.parseLoose(content);
      if (!data.narration) throw new Error('现实推演缺少正文结果');
      return {
        sceneTitle: String(data.sceneTitle || '现实世界').slice(0, 14),
        locationName: this.normalizeLocationName(data.locationName || store.realWorldLocationName),
        parentLocationName: String(data.parentLocationName || data.parentLocation || '').slice(0, 28),
        locationDescription: String(data.locationDescription || data.locationSummary || '').slice(0, 160),
        mapNodes: Array.isArray(data.mapNodes) ? data.mapNodes.slice(0, 8) : [],
        mapLinks: Array.isArray(data.mapLinks) ? data.mapLinks.slice(0, 4) : [],
        newLocations: Array.isArray(data.newLocations) ? data.newLocations.slice(0, 8) : [],
        locationDescriptionUpdates: Array.isArray(data.locationDescriptionUpdates) ? data.locationDescriptionUpdates.slice(0, 12) : [],
        thinking: '',
        narration: this.formatNarration(data.narration),
        status: String(data.status || '现实推演继续中').slice(0, 40),
        quest: String(data.quest || '确认现实处境').slice(0, 24),
        choices: this.normalizeChoices(data.choices),
        elapsedSeconds: window.GameModules.ai.clampElapsed?.(data.elapsedSeconds, 300) || 300,
        vitalUpdates: this.normalizeVitalUpdates(data.vitalUpdates, data.elapsedSeconds, action),
        metricUpdates: window.GameModules.ai.normalizeMetricUpdates?.(data.metricUpdates, store.playerIdentityState?.()) || {},
        appearedCharacters: this.normalizeRealCharacters(data.appearedCharacters, store),
        solidifiableCharacters: this.normalizeRealSolidifiableCharacters(data.solidifiableCharacters, data.appearedCharacters, store),
        factionUpdates: Array.isArray(data.factionUpdates) ? data.factionUpdates.slice(0, 8) : [],
        itemActions: Array.isArray(data.itemActions) ? data.itemActions.slice(0, 8) : [],
        wechatActions: this.normalizeWechatActions(data.wechatActions),
        lexiconUpdates: window.GameModules.ai.normalizeLexiconUpdates?.(data.lexiconUpdates, store) || [],
        genericUpdates: window.GameModules.updateRegistry?.normalizeUpdates?.(data, store) || (Array.isArray(data.genericUpdates) ? data.genericUpdates.slice(0, 80) : []),
        initUpdates: Array.isArray(data.initUpdates) ? data.initUpdates.slice(0, 20) : [],
      };
    } catch (err) {
      console.warn('现实世界返回解析失败:', err.message);
      throw err;
    }
  },

  normalizeLocationName(value) {
    const name = String(value || '').trim().slice(0, 28);
    return /^(玩家住处|住处|现实地点|当前位置|未知地点|现实起点)$/u.test(name) || /现实起点$/u.test(name) ? '' : name;
  },

  realCharacterWorld() {
    return window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
  },

  normalizeRealCharacters(items = [], store) {
    return (Array.isArray(items) ? items : []).slice(0, 8).map((item) => window.GameModules.ai.normalizeCharacter(item, store, this.realCharacterWorld())).filter(Boolean);
  },

  normalizeRealSolidifiableCharacters(items = [], appeared = [], store) {
    const appearedByName = new Map(this.normalizeRealCharacters(appeared, store).map((item) => [item.name, item]));
    return (Array.isArray(items) ? items : []).slice(0, 8).map((item) => {
      if (typeof item === 'string') return appearedByName.get(item.slice(0, 16)) || window.GameModules.ai.normalizeCharacter(item, store, this.realCharacterWorld());
      return window.GameModules.ai.normalizeCharacter(item, store, this.realCharacterWorld());
    }).filter(Boolean);
  },

  normalizeCharacterMetricUpdates(value, store) {
    return (Array.isArray(value) ? value : []).map((item) => {
      const target = String(item?.target || item?.targetId || item?.characterId || item?.character || item?.name || item?.subject?.characterId || item?.subject?.id || item?.subject?.name || '').trim();
      const state = store?.itemSkillState?.(target);
      if (!target) return null;
      const legacyEmotions = (Array.isArray(item.emotions) ? item.emotions : []).filter((entry) => entry?.key || entry?.delta !== undefined || entry?.status || entry?.reason);
      const legacyFeelings = (Array.isArray(item.playerFeelings) ? item.playerFeelings : []).filter((entry) => entry?.key || entry?.delta !== undefined || entry?.status || entry?.reason);
      if (!legacyEmotions.length && !legacyFeelings.length) return null;
      return { target: state?.id || target, emotions: window.GameModules.ai.normalizeMetricGroup(legacyEmotions, window.GameModules.metrics.emotionKeys, state?.metrics?.emotions), playerFeelings: window.GameModules.ai.normalizeMetricGroup(legacyFeelings, window.GameModules.metrics.playerKeys, state?.metrics?.playerFeelings) };
    }).filter(Boolean);
  },

  formatNarration(value, limit = 100) {
    const text = String(value || '').replace(/\s*\n+\s*/g, '').trim();
    if (!text) return '';
    const sentences = this.splitNarrationSentences(text);
    const parts = [];
    let current = '';
    for (const sentence of sentences) {
      if (!current) { current = sentence; continue; }
      if ((current + sentence).length > limit && !/^[”’"』」）】》〕〉〗,，]/u.test(sentence)) {
        parts.push(current);
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current) parts.push(current);
    return parts.join('\n\n');
  },

  splitNarrationSentences(text) {
    const sentences = [];
    const closingMarks = /[”’"』」）】》〕〉〗]/u;
    let current = '';
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      current += char;
      if (!/[。！？!?；;]/u.test(char)) continue;

      let next = i + 1;
      while (closingMarks.test(text[next] || '')) {
        current += text[next];
        next += 1;
      }
      if (/\s/u.test(text[next] || '')) {
        while (/\s/u.test(text[next] || '')) next += 1;
      }
      if (/[,，]/u.test(text[next] || '')) continue;
      sentences.push(current.trim());
      current = '';
      i = next - 1;
    }
    if (current.trim()) sentences.push(current.trim());
    return sentences.filter(Boolean);
  },

  normalizeChoices(value) {
    const list = Array.isArray(value) ? value : [];
    return [...new Set(list.map((x) => String(x || '').trim().slice(0, 14)).filter(Boolean).concat(['观察手机异常', '处理现实事务', '联系熟人', '暂时休息']))].slice(0, 4);
  },

  normalizeWechatActions(value) {
    return (Array.isArray(value) ? value : []).map((item) => {
      const action = String(item?.action || item?.method || '').trim();
      if (!['sendIncomingNow', 'sendIncomingPast'].includes(action)) return null;
      const contactId = String(item.contactId || item.characterId || item.target || item.name || '').trim().slice(0, 40);
      const text = String(item.text || item.message || '').trim().slice(0, 180);
      if (!contactId || !text) return null;
      return { action, contactId, text, timeIso: String(item.timeIso || item.time || '').trim(), reason: String(item.reason || '').slice(0, 120) };
    }).filter(Boolean).slice(0, 6);
  },

  normalizeVitalUpdates(value, elapsedSeconds = 300, action = '') {
    const keys = ['stamina_pool', 'satiety', 'hydration', 'fatigue', 'mental_stability'];
    const labels = { stamina_pool: '精力', satiety: '饱食度', hydration: '水分', fatigue: '疲劳度', mental_stability: '精神稳定' };
    const list = Array.isArray(value) ? value : [];
    const byKey = new Map(list.map((item) => [String(item?.key || ''), item]));
    return keys.map((key) => {
      const item = byKey.get(key) || this.fallbackVitalUpdate(key, elapsedSeconds, action);
      const delta = Math.max(-60, Math.min(60, Math.round(Number(item.delta) || 0)));
      const reason = String(item.reason || `${labels[key]}本次基本不变。`).slice(0, 120);
      return { key, delta, reason };
    });
  },

  fallbackVitalUpdate(key, elapsedSeconds = 300, action = '') {
    const hours = Math.max(0, Number(elapsedSeconds) || 0) / 3600;
    const text = String(action || '现实行动');
    if (/睡|休息|躺|补觉/.test(text)) {
      const rest = Math.max(1, Math.round(hours * 18));
      if (key === 'stamina_pool') return { key, delta: Math.min(45, rest), reason: '休息让体能逐步恢复。' };
      if (key === 'fatigue') return { key, delta: -Math.min(45, rest), reason: '休息降低了累积疲劳。' };
      if (key === 'mental_stability') return { key, delta: Math.min(12, Math.ceil(rest / 4)), reason: '休息让精神状态稍微稳定。' };
    }
    if (/吃|饭|餐|外卖|食物/.test(text) && key === 'satiety') return { key, delta: 20, reason: '进食直接提高了饱食度。' };
    if (/喝|水|饮料|咖啡|奶茶/.test(text) && key === 'hydration') return { key, delta: 18, reason: '补充饮品提高了水分。' };
    if (key === 'stamina_pool') return { key, delta: hours >= 0.5 ? -Math.min(12, Math.ceil(hours * 6)) : -1, reason: '现实行动和时间流逝消耗了精力。' };
    if (key === 'satiety') return { key, delta: hours >= 0.5 ? -Math.min(10, Math.ceil(hours * 3)) : 0, reason: '时间较短，饱食度变化有限。' };
    if (key === 'hydration') return { key, delta: hours >= 0.5 ? -Math.min(12, Math.ceil(hours * 4)) : 0, reason: '时间流逝带来少量水分消耗。' };
    if (key === 'fatigue') return { key, delta: hours >= 0.5 ? Math.min(14, Math.ceil(hours * 5)) : 1, reason: '持续行动带来疲劳累积。' };
    return { key, delta: /异常|害怕|恐惧|冲突|压力|慌/.test(text) ? -3 : 0, reason: '本次行动对精神稳定没有明显额外冲击。' };
  },

  fallback(store, action) {
    const text = action || '继续观察现实世界';
    return {
      sceneTitle: store.realWorldSceneTitle || '现实世界',
      locationName: this.normalizeLocationName(store.realWorldLocationName || store.realWorldMap?.current),
      parentLocationName: '',
      locationDescription: '现实推演暂时无法生成新地点说明，保留当前位置。',
      mapNodes: [],
      mapLinks: [],
      newLocations: [],
      locationDescriptionUpdates: [],
      thinking: '',
      narration: `你暂时把《我要狠狠操控》的界面收起，现实里的光线、空气和细碎声响重新占据感官。你按照“${text}”开始行动，先确认周围没有立刻失控的变化，再把注意力落回自己的住处、身份与眼前必须处理的事务上。那台手机安静地躺在一旁，像是什么都没有发生，却又让现实边缘多出一层无法忽视的裂痕。`,
      status: '现实稳定，手机异常仍在',
      quest: '确认手机异常与现实处境',
      choices: ['检查手机记录', '观察居住环境', '联系熟人确认', '暂时休息'],
      elapsedSeconds: 300,
      vitalUpdates: this.normalizeVitalUpdates([], 300, text),
      itemActions: [],
    };
  },
};
