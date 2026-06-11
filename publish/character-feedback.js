/**
 * 角色心理反馈：由 AI 按当前角色设定生成内心独白和自身意图。
 */
window.GameModules = window.GameModules || {};

window.GameModules.characterFeedback = {
  feelingExamples: ['极度惊恐', '非常害怕', '恐惧', '疑惑', '警惕', '愤怒', '屈辱', '麻木', '担忧', '习惯', '冷静分析'],

  pronoun(store) {
    const text = `${store.character?.name || ''} ${store.character?.role || ''} ${store.character?.detail || ''}`;
    return /男性|男人|少年|青年|父亲|哥哥|弟弟|叔叔|丈夫|王子|皇帝/.test(text) ? '他' : '她';
  },

  async initial(store) {
    this.ensureExperience(store);
    const fallback = this.fallback(store);
    if (!window.dzmm?.completions) return fallback;
    let buffer = '';
    try {
      const request = window.dzmm.completions({
        model: 'nalang-turbo-0826',
        maxTokens: 600,
        messages: [{ role: 'user', content: this.prompt(store) }],
      }, (chunk) => {
        buffer = this.merge(buffer, chunk);
      });
      await Promise.race([request, new Promise((_, reject) => setTimeout(() => reject(new Error('角色反馈生成超时')), 12000))]);
      console.log('[角色反馈] AI返回完成:', { length: buffer.length, preview: buffer.slice(0, 120) });
      return this.parse(buffer, fallback, store);
    } catch (err) {
      console.warn('角色反馈生成失败:', err.code, err.message, err.stack);
      return fallback;
    }
  },

  prompt(store) {
    const profile = store.characterProfiles[store.character.id]?.summary || store.character.detail || store.character.personality || '';
    const experience = this.experience(store);
    const outputJson = JSON.stringify({ mind: '角色第一人称内心，40到70字', intent: `${store.character.name}自己下一步想做什么，30到50字`, mood: '冷静', resistance: 0, controlFeeling: '疑惑/恐惧/愤怒等短语', adaptation: 0, experienceSummary: '40字内', choices: ['4个行动选项，每个12字内'] });
    return `只生成角色反馈，不生成数值表。必须只返回合法 JSON，不要 Markdown。
角色：${store.character.name}｜${store.character.role}｜${store.character.work}。年龄：${store.characterAge || '未知'}。操控方式：${store.controlMode}。当前场景：${store.entryCurrentAction || '未知'}。人物资料：${String(profile).slice(0, 260)}。已有上线体验：次数=${experience.onlineCount}；感觉=${experience.feeling}；适应=${experience.adaptation}/100；摘要=${experience.summary}。
处境：角色突然失去身体控制权，只能在身体里旁观；不知道操控者是谁，但仍能感到疼痛、疲劳、气味、触觉和恐惧。
要求：mind 必须是角色自己的第一人称内心独白，不写角色名，不写旁白；intent 是角色本人想做什么，不是玩家选项；choices 是玩家可执行行动，不能包含“放开控制”；不要返回 metricUpdates。
格式示例：${outputJson}`;
  },

  parse(text, fallback, store) {
    try {
      const data = window.GameModules.jsonUtils.parseLoose(text);
      const completeMetrics = this.hasCompleteInitialMetrics(data.metricUpdates);
      if (!data.mind && !data.intent) throw new Error('角色反馈缺少 mind/intent');
      const feeling = String(data.controlFeeling || fallback.controlFeeling || '疑惑').slice(0, 40);
      const result = {
        mind: String(data.mind || fallback.mind).slice(0, 80),
        intent: String(data.intent || fallback.intent).slice(0, 80),
        mood: ['冷静', '紧张', '愤怒', '动摇', '信任', '恐惧', '好奇', '坚定'].includes(data.mood) ? data.mood : fallback.mood,
        resistance: this.clamp(data.resistance, fallback.resistance),
        controlFeeling: feeling,
        adaptation: this.clamp(data.adaptation, fallback.adaptation),
        experienceSummary: String(data.experienceSummary || fallback.experienceSummary).slice(0, 80),
        metricUpdates: completeMetrics ? window.GameModules.ai.normalizeInitialMetricUpdates(data.metricUpdates, null, store) : fallback.metricUpdates,
        choices: this.normalizeChoices(data.choices, fallback.choices),
        source: 'ai',
      };
      console.log('[角色反馈] AI解析成功:', { mindLength: result.mind.length, intentLength: result.intent.length, metrics: completeMetrics ? 'ai' : 'fallback' });
      return result;
    } catch (err) {
      console.warn('角色反馈解析失败:', err.message);
      return fallback;
    }
  },

  hasCompleteInitialMetrics(updates) {
    const hasAll = (items, keys) => Array.isArray(items) && keys.every((key) => items.some((item) => item?.key === key && Number.isFinite(Number(item.value))));
    return hasAll(updates?.emotions, window.GameModules.metrics.emotionKeys) && hasAll(updates?.playerFeelings, window.GameModules.metrics.playerKeys);
  },

  fallback(store) {
    const experience = this.experience(store);
    const metrics = this.fallbackMetrics(store);
    return {
      mind: '--',
      intent: '--',
      mood: metrics.emotions.sort((a, b) => b.value - a.value)[0]?.key || '动摇',
      resistance: metrics.playerFeelings.find((x) => x.key === '反抗')?.value || 35,
      controlFeeling: experience.onlineCount > 0 ? experience.feeling : '疑惑',
      adaptation: experience.adaptation,
      experienceSummary: '身体突然失控，她/他还无法确认你会做什么。',
      metricUpdates: metrics,
      choices: ['确认周围状况', '尝试移动身体', '寻找安全位置', '接近关键人物'],
      source: 'fallback',
    };
  },

  fallbackMetrics(store) {
    const text = `${store.character?.name || ''} ${store.character?.role || ''} ${store.character?.personality || ''} ${store.character?.detail || ''} ${store.entryCurrentAction || ''}`;
    const vulnerable = /幼|小|弱|病|囚|虐|恐|孤|樱|间桐|虫|牺牲|受害/.test(text);
    const proud = /王|骑士|强|冷静|自信|支配|高傲|魔术师/.test(text);
    const possess = store.controlMode === 'possess';
    const emotionBase = vulnerable
      ? { 冷静: 12, 恐惧: 72, 担忧: 68, 高兴: 0, 紧张: 76, 愤怒: 18, 羞耻: 34, 悲伤: 58, 好奇: 8, 麻木: 44, 嫉妒: 0, 绝望: 48 }
      : { 冷静: proud ? 54 : 32, 恐惧: possess ? 34 : 16, 担忧: 28, 高兴: 2, 紧张: possess ? 46 : 24, 愤怒: proud ? 30 : 12, 羞耻: 10, 悲伤: 8, 好奇: 22, 麻木: 4, 嫉妒: 0, 绝望: 6 };
    const feelingBase = vulnerable
      ? { 了解: 1, 信任: 6, 反抗: 18, 好感: 2, 友情: 0, 亲情: 0, 爱情: 0, 肉欲: 0, 畏惧: 72, 尊敬: 0, 崇拜: 0, 讨厌: 22, 依赖: 16, 警惕: 82, 支配欲: 0, 占有欲: 0, 服从: 28 }
      : { 了解: 1, 信任: 18, 反抗: proud ? 48 : 34, 好感: 4, 友情: 0, 亲情: 0, 爱情: 0, 肉欲: 0, 畏惧: possess ? 38 : 18, 尊敬: 0, 崇拜: 0, 讨厌: 16, 依赖: 0, 警惕: 60, 支配欲: proud ? 28 : 6, 占有欲: 0, 服从: possess ? 8 : 2 };
    const actor = this.pronoun(store);
    return {
      emotions: this.metricList(emotionBase, actor, 'emotion', vulnerable, possess),
      playerFeelings: this.metricList(feelingBase, actor, 'player', vulnerable, possess),
    };
  },

  metricList(values, actor, type, vulnerable, possess) {
    return Object.entries(values).map(([key, value]) => {
      const stage = window.GameModules.metrics.stageFor(key, value);
      return { key, value, status: this.metricStatus(actor, key, stage), reason: this.metricReason(actor, key, type, vulnerable, possess) };
    });
  },

  metricStatus(actor, key, stage) {
    if (key === '爱情') return stage === '无感' ? `${actor}看着你时没有恋爱意义上的心动。` : `${actor}看到你时心里扑通扑通，似乎是${stage}了。`;
    if (key === '了解') return `${actor}对你的了解处于“${stage}”：${actor}只掌握你显露出的少量线索，还无法确认你的身份、来历和真正意图。`;
    return `${actor}对你或当前处境的${key}处于“${stage}”状态。`;
  },

  metricReason(actor, key, type, vulnerable, possess) {
    if (type === 'emotion') return vulnerable ? `${actor}曾经受过伤害，身体又突然失控，所以${key}被明显牵动。` : `${actor}突然面对身体失控和陌生干预，所以${key}随之变化。`;
    const base = {
      了解: `${actor}第一次接触你，只知道你能介入这具身体，却不知道你的身份、来历和真正意图。`,
      信任: `你第一次出现就${possess ? '控制了' : '影响了'}${actor}的身体，所以${actor}暂时无法信任你。`,
      反抗: `${actor}发现自己的行动权被你夺走，本能地想把身体夺回来。`,
      好感: `你还没有做出足以让${actor}安心或亲近的事。`,
      爱情: `你与${actor}才刚接触，还没有产生恋爱意义上的心动。`,
      畏惧: `你能越过${actor}的意愿控制身体，让${actor}害怕你的力量。`,
      警惕: `${actor}不知道你会如何使用这具身体，只能高度戒备。`,
      服从: `${actor}身体被你接管，只能被迫跟随你的动作。`,
      依赖: vulnerable ? `${actor}处境脆弱，可能把你的干预误认为唯一能依靠的出口。` : `你还没有证明自己值得${actor}依靠。`,
    };
    return base[key] || `你刚介入${actor}的处境，${actor}还没有形成更深的${key}。`;
  },

  ensureExperience(store) {
    const state = store.characterRpgState;
    if (!state?.values) return null;
    if (!state.values.control_experience) {
      state.values.control_experience = { onlineCount: 0, feeling: '未知', adaptation: 0, summary: '尚未经历上线操控。', lastUpdated: '' };
    }
    return state.values.control_experience;
  },

  experience(store) {
    return this.ensureExperience(store) || { onlineCount: 0, feeling: '未知', adaptation: 0, summary: '尚未经历上线操控。', lastUpdated: '' };
  },

  async applyExperience(store, feedback) {
    const state = store.characterRpgState;
    const exp = this.ensureExperience(store);
    if (!state || !exp) return;
    exp.onlineCount = Math.max(0, Number(exp.onlineCount) || 0) + 1;
    exp.feeling = feedback.controlFeeling || exp.feeling || '疑惑';
    exp.adaptation = this.clamp(feedback.adaptation, exp.adaptation || 0);
    exp.summary = feedback.experienceSummary || exp.summary || '';
    exp.lastUpdated = new Date().toISOString();
    store.rpgStates = { ...store.rpgStates, [state.id]: state };
    await window.GameModules.sqliteSave.saveCharacterState(state);
  },

  normalizeChoices(value, fallback) {
    const base = Array.isArray(fallback) ? fallback : [];
    const list = Array.isArray(value) ? value : [];
    const merged = list.concat(base).map((item) => String(item || '').trim().slice(0, 14)).filter(Boolean);
    return [...new Set(merged)].slice(0, 4);
  },

  merge(buffer, chunk) {
    const text = String(chunk || '');
    if (!text) return buffer;
    if (!buffer || text.startsWith(buffer)) return text;
    if (buffer.endsWith(text)) return buffer;
    const overlap = Math.min(buffer.length, text.length);
    for (let size = overlap; size > 0; size -= 1) {
      if (buffer.endsWith(text.slice(0, size))) return buffer + text.slice(size);
    }
    return buffer + text;
  },

  clamp(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? Math.max(0, Math.min(100, Math.round(num))) : fallback;
  },
};
