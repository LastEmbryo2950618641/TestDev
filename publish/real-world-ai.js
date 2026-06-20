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
      if (requestId !== this.latestRequestId) return this.fallback(store, action);
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
      return this.fallback(store, action);
    }
  },

  parse(content, store, action) {
    try {
      const data = content && typeof content === 'object' ? content : window.GameModules.jsonUtils.parseLoose(content);
      return {
        sceneTitle: String(data.sceneTitle || '现实世界').slice(0, 14),
        locationName: this.normalizeLocationName(data.locationName || store.realWorldLocationName),
        parentLocationName: String(data.parentLocationName || data.parentLocation || '').slice(0, 28),
        locationDescription: String(data.locationDescription || data.locationSummary || '').slice(0, 160),
        mapNodes: Array.isArray(data.mapNodes) ? data.mapNodes.slice(0, 8) : [],
        mapLinks: Array.isArray(data.mapLinks) ? data.mapLinks.slice(0, 4) : [],
        newLocations: Array.isArray(data.newLocations) ? data.newLocations.slice(0, 8) : [],
        locationDescriptionUpdates: Array.isArray(data.locationDescriptionUpdates) ? data.locationDescriptionUpdates.slice(0, 12) : [],
        thinking: this.normalizeThinking(data.thinking, store, action),
        narration: this.formatNarration(data.narration || this.fallback(store, action).narration),
        status: String(data.status || '现实推演继续中').slice(0, 40),
        quest: String(data.quest || '确认现实处境').slice(0, 24),
        choices: this.normalizeChoices(data.choices),
        elapsedSeconds: window.GameModules.ai.clampElapsed?.(data.elapsedSeconds, 300) || 300,
        metricUpdates: window.GameModules.ai.normalizeMetricUpdates?.(data.metricUpdates) || {},
        lexiconUpdates: window.GameModules.ai.normalizeLexiconUpdates?.(data.lexiconUpdates, store) || [],
      };
    } catch (err) {
      console.warn('现实世界返回解析失败，使用兜底:', err.message);
      return this.fallback(store, action);
    }
  },

  normalizeLocationName(value) {
    const name = String(value || '').trim().slice(0, 28);
    return /^(玩家住处|住处|现实地点|当前位置|未知地点|现实起点)$/u.test(name) || /现实起点$/u.test(name) ? '' : name;
  },

  formatNarration(value, limit = 100) {
    const text = String(value || '').replace(/\n+/g, '').trim();
    if (!text) return '';
    const sentences = text.match(/[^。！？!?；;]+[。！？!?；;]?/g) || [text];
    const parts = [];
    let current = '';
    for (const sentence of sentences.map((item) => item.trim()).filter(Boolean)) {
      if (!current) { current = sentence; continue; }
      if ((current + sentence).length > limit) {
        parts.push(current);
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current) parts.push(current);
    return parts.join('\n\n');
  },

  normalizeThinking(value, store, action) {
    const text = String(value || '').trim();
    if (text) return text.slice(0, 180);
    if (!store.realWorldThinkMode) return '';
    return `依据玩家行动「${String(action || '继续观察现实世界').slice(0, 40)}」、现实状态、已载入资料与相关人物记忆，优先按现实因果推进本次结果。`;
  },

  normalizeChoices(value) {
    const list = Array.isArray(value) ? value : [];
    return [...new Set(list.map((x) => String(x || '').trim().slice(0, 14)).filter(Boolean).concat(['观察手机异常', '处理现实事务', '联系熟人', '暂时休息']))].slice(0, 4);
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
      thinking: store.realWorldThinkMode ? `依据玩家行动「${text}」与本人资料，现实推演先保持日常逻辑，并保留手机异常带来的不安。` : '',
      narration: `你暂时把《我要狠狠操控》的界面收起，现实里的光线、空气和细碎声响重新占据感官。你按照“${text}”开始行动，先确认周围没有立刻失控的变化，再把注意力落回自己的住处、身份与眼前必须处理的事务上。那台手机安静地躺在一旁，像是什么都没有发生，却又让现实边缘多出一层无法忽视的裂痕。`,
      status: '现实稳定，手机异常仍在',
      quest: '确认手机异常与现实处境',
      choices: ['检查手机记录', '观察居住环境', '联系熟人确认', '暂时休息'],
      elapsedSeconds: 300,
    };
  },
};
