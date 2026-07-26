/**
 * 现实世界 AI 推演请求。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldAi = {
  latestRequestId: 0,

  async generate(store, prompt, action, logId = null) {
    const requestId = ++this.latestRequestId;
    try {
      const agentLoop = await window.GameModules.realWorldAgentLoader?.ensure?.() || window.GameModules.realWorldAgentLoop;
      if (!agentLoop?.run) throw new Error('现实推演 Loop Agent 未加载');
      const loop = await agentLoop.run(store, action, logId);
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
      result.deepseekCache = loop.deepseekCache || null;
      return result;
    } catch (err) {
      console.error('现实世界推演失败:', err.code, err.message, err.stack);
      throw err;
    }
  },


  parse(content, store, action) {
    try {
      const raw = content && typeof content === 'object' ? content : window.GameModules.jsonUtils.parseLoose(content);
      const genericUpdates = window.GameModules.updateRegistry?.ensureNormalizedUpdates?.(raw, store)
        || (Array.isArray(raw.genericUpdates) ? raw.genericUpdates : []);
      const data = window.GameModules.updateRegistry?.migrateLegacyFactionUpdates?.({ ...raw, genericUpdates }) || { ...raw, genericUpdates };
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
        vitalUpdates: window.GameModules.realWorldVitals.normalize(data.vitalUpdates, data.elapsedSeconds, action),
        metricUpdates: window.GameModules.ai.normalizeMetricUpdates?.(data.metricUpdates, store.playerIdentityState?.()) || {},
        appearedCharacters: this.normalizeRealCharacters(data.appearedCharacters, store),
        solidifiableCharacters: this.normalizeRealSolidifiableCharacters(data.solidifiableCharacters, data.appearedCharacters, store),
        itemActions: Array.isArray(data.itemActions) ? data.itemActions.slice(0, 8) : [],
        wechatActions: this.normalizeWechatActions(data.wechatActions),
        events: this.normalizeSettlementEvents(data.events),
        lexiconUpdates: window.GameModules.ai.normalizeLexiconUpdates?.(data.lexiconUpdates, store) || [],
        genericUpdates: data.genericUpdates || [],
        profilePatches: Array.isArray(data.profilePatches) ? data.profilePatches.slice(0, 4) : [],
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
    const markup = window.GameModules.narrationRoleMarkup;
    const run = (source) => {
      const text = String(source || '').replace(/\s*\n+\s*/g, '').trim();
      if (!text) return '';
      const sentences = this.splitNarrationSentences(text);
      const grouped = [];
      let current = '';
      for (const sentence of sentences) {
        if (!current) { current = sentence; continue; }
        if ((current + sentence).length > limit && !/^[”’"』」）】》〕〉〗,，]/u.test(sentence)) {
          grouped.push(current);
          current = sentence;
        } else {
          current += sentence;
        }
      }
      if (current) grouped.push(current);
      const parts = [];
      for (const chunk of grouped) parts.push(...this.wrapNarrationChunk(chunk, limit));
      return parts.join('\n\n');
    };
    if (markup?.withProtectedRoleTags) return markup.withProtectedRoleTags(value, run);
    return run(value);
  },

  wrapNarrationChunk(text = '', limit = 100) {
    const chunk = String(text || '').trim();
    if (!chunk) return [];
    if (chunk.length <= limit) return [chunk];
    const parts = [];
    let rest = chunk;
    const softBreak = /[。！？!?；;，、,.]/u;
    const minBreak = Math.max(24, Math.floor(limit * 0.35));
    while (rest.length > limit) {
      let breakAt = limit;
      const head = rest.slice(0, limit);
      for (let i = head.length - 1; i >= minBreak; i -= 1) {
        if (softBreak.test(head[i])) {
          breakAt = i + 1;
          break;
        }
      }
      parts.push(rest.slice(0, breakAt).trim());
      rest = rest.slice(breakAt).trim();
    }
    if (rest) parts.push(rest);
    return parts.filter(Boolean);
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

  normalizeSettlementEvents(value) {
    const list = Array.isArray(value) ? value : [];
    const eventSystem = window.GameModules.eventSystem;
    return list.slice(0, 12).map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const type = eventSystem?.normalizeType?.(raw.type || raw.eventType || raw['事件类型']) || String(raw.type || '').trim();
      if (eventSystem?.isWritableType && !eventSystem.isWritableType(type)) return null;
      return {
        ...raw,
        type,
        title: String(raw.title || raw.name || raw['标题'] || '').trim().slice(0, 40),
        content: String(raw.content || raw.detail || raw['内容'] || '').trim().slice(0, 400),
        startDate: String(raw.startDate || raw.start || '').trim().slice(0, 16),
        endDate: String(raw.endDate || raw.end || '').trim().slice(0, 16),
        location: String(raw.location || '').trim().slice(0, 40),
        people: Array.isArray(raw.people) ? raw.people.slice(0, 8) : [],
        tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 8) : [],
      };
    }).filter(Boolean);
  },

  normalizeWechatActions(value) {
    const outreach = window.GameModules.wechatOutreachContext;
    return (Array.isArray(value) ? value : []).map((item) => {
      const action = String(item?.action || item?.method || '').trim();
      const rawChain = item?.intentChain || item?.意图链;
      const intentChain = outreach?.normalizeIntentChain?.(rawChain && typeof rawChain === 'object' ? rawChain : null)
        || outreach?.intentChainFromReason?.(item.reason || item.text || item.message || '');
      const sourceRecordId = String(item.sourceRecordId || item.recordId || item.logId || '').trim().slice(0, 120);
      if (action === 'requestWechatFriend' || action === 'requestFriend') {
        const fromName = String(item.name || item.fromName || item.contactId || item.characterId || '').trim().slice(0, 24);
        if (!fromName) return null;
        return {
          action: 'requestWechatFriend',
          name: fromName,
          fromName,
          characterId: String(item.characterId || item.fromCharacterId || item.contactId || '').trim().slice(0, 80),
          contactId: String(item.contactId || item.characterId || '').trim().slice(0, 40),
          relation: String(item.relation || item.relationToPlayer || '').trim().slice(0, 40),
          reason: String(item.reason || item.text || item.message || intentChain?.whyPlayer || '希望添加你为微信好友').trim().slice(0, 160),
          source: String(item.source || 'narration').slice(0, 32),
          inboxId: String(item.inboxId || '').slice(0, 80),
          sourceRecordId,
          intentChain,
        };
      }
      if (!['sendIncomingNow', 'sendIncomingPast'].includes(action)) return null;
      const contactId = String(item.contactId || item.characterId || item.target || item.name || '').trim().slice(0, 40);
      const text = String(item.text || item.message || '').trim().slice(0, 180);
      if (!contactId || !text) return null;
      return {
        action,
        contactId,
        text,
        timeIso: String(item.timeIso || item.time || '').trim(),
        reason: String(item.reason || intentChain?.whyPlayer || '').slice(0, 120),
        sourceRecordId,
        intentChain,
      };
    }).filter(Boolean).slice(0, 8);
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
      narration: `你暂时把「${window.GameModules.gamePremise?.appName || '我要狠狠操控的'}」的界面收起，现实里的光线、空气和细碎声响重新占据感官。你按照“${text}”开始行动，先确认周围没有立刻失控的变化，再把注意力落回自己的住处、身份与眼前必须处理的事务上。那台刚同步完的新手机安静地躺在一旁，像是什么都没有发生，却又让现实边缘多出一层无法忽视的裂痕。`,
      status: '现实稳定，手机异常仍在',
      quest: '确认手机异常与现实处境',
      choices: ['检查手机记录', '观察居住环境', '联系熟人确认', '暂时休息'],
      elapsedSeconds: 300,
      vitalUpdates: window.GameModules.realWorldVitals.normalize([], 300, text),
      itemActions: [],
    };
  },
};
