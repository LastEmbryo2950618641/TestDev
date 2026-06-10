/**
 * 角色心理反馈：由 AI 按当前角色设定生成内心独白和自身意图。
 */
window.GameModules = window.GameModules || {};

window.GameModules.characterFeedback = {
  feelingOptions: ['极度惊恐', '非常害怕', '恐惧', '疑惑', '警惕', '愤怒', '屈辱', '麻木', '担忧', '习惯', '冷静分析'],

  async initial(store) {
    this.ensureExperience(store);
    const fallback = this.fallback(store);
    if (!window.dzmm?.completions) return fallback;
    let buffer = '';
    try {
      await window.dzmm.completions({
        model: store.modelId,
        maxTokens: 360,
        messages: [{ role: 'user', content: this.prompt(store) }],
      }, (chunk) => {
        buffer = this.merge(buffer, chunk);
      });
      return this.parse(buffer, fallback);
    } catch (err) {
      console.warn('角色反馈生成失败:', err.code, err.message, err.stack);
      return fallback;
    }
  },

  prompt(store) {
    const profile = store.characterProfiles[store.character.id]?.summary || store.character.detail || store.character.personality || '';
    const experience = this.experience(store);
    return `根据角色当前设定生成被操控后的内心反馈，并更新该角色对“被上线”的感觉。必须只返回合法JSON，不要Markdown。角色：${store.character.name}｜${store.character.role}｜${store.character.work}。年龄：${store.characterAge || '未知'}。操控方式：${store.controlMode}。当前正在发生：${store.entryCurrentAction || '未知'}。人物资料：${profile}。已有上线体验：上线次数=${experience.onlineCount}；当前被上线感觉=${experience.feeling}；适应度=${experience.adaptation}/100；体验摘要=${experience.summary}。核心处境：对角色本人来说，身体是突然不受控制的；她不知道是谁在控制，也不知道控制来源，只能先感到自己的身体突然自己行动。上线后她像被困在身体里旁观外界，无法控制动作和发声，但视觉、听觉、嗅觉、味觉、触觉、疼痛、疲劳等身体感觉仍然能感受到。规则：mind 必须是角色自己的第一人称内心独白，不要旁白说明，不要写角色名字；intent 是角色自己下一步想要做什么，不是玩家行动选项；controlFeeling 必须从这些状态中选择：${this.feelingOptions.join('、')}。请根据角色性格、年龄、身体状态、经历、记忆、当前处境、上线次数和适应度综合判断：上线次数多可能逐渐适应，但不是必然；有些角色会疑惑、警惕或冷静分析，有些会害怕、屈辱或愤怒，不要固定模板。格式：{"mind":"60字内","intent":"${store.character.name}下一步想要……，40字内","mood":"冷静/紧张/愤怒/动摇/信任/恐惧/好奇/坚定之一","resistance":0到100整数,"controlFeeling":"从候选状态中选一个","adaptation":0到100整数,"experienceSummary":"40字内，概括她这次对被上线的感受变化"}`;
  },

  parse(text, fallback) {
    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start < 0 || end < 0) throw new Error('反馈 JSON 缺失');
      const data = JSON.parse(text.slice(start, end + 1));
      const feeling = this.feelingOptions.includes(data.controlFeeling) ? data.controlFeeling : fallback.controlFeeling;
      return {
        mind: String(data.mind || fallback.mind).slice(0, 80),
        intent: String(data.intent || fallback.intent).slice(0, 80),
        mood: ['冷静', '紧张', '愤怒', '动摇', '信任', '恐惧', '好奇', '坚定'].includes(data.mood) ? data.mood : fallback.mood,
        resistance: this.clamp(data.resistance, fallback.resistance),
        controlFeeling: feeling,
        adaptation: this.clamp(data.adaptation, fallback.adaptation),
        experienceSummary: String(data.experienceSummary || fallback.experienceSummary).slice(0, 80),
      };
    } catch (err) {
      console.warn('角色反馈解析失败:', err.message);
      return fallback;
    }
  },

  fallback(store) {
    const name = store.character?.name || '角色';
    const experience = this.experience(store);
    return {
      mind: store.controlMode === 'possess' ? '怎、怎么回事……我的身体为什么不听我使唤了？' : '脑海里多了什么陌生的东西……它想让我怎么做？',
      intent: store.controlMode === 'possess' ? `${name}下一步想要夺回身体的主导权。` : `${name}下一步想要弄清这条操控链路。`,
      mood: '动摇',
      resistance: Math.max(store.resistance || 0, 35),
      controlFeeling: experience.onlineCount > 0 ? experience.feeling : '疑惑',
      adaptation: experience.adaptation,
      experienceSummary: '身体突然失控，来源仍然未知。',
    };
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
