/**
 * 角色心理反馈：由 AI 按当前角色设定生成内心独白和自身意图。
 */
window.GameModules = window.GameModules || {};

window.GameModules.characterFeedback = {
  async initial(store) {
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
    return `根据角色当前设定生成被操控后的内心反馈。必须只返回合法JSON，不要Markdown。角色：${store.character.name}｜${store.character.role}｜${store.character.work}。年龄：${store.characterAge || '未知'}。操控方式：${store.controlMode}。当前正在发生：${store.entryCurrentAction || '未知'}。人物资料：${profile}。核心处境：对角色本人来说，身体是突然不受控制的；她不知道是谁在控制，也不知道控制来源，只能先感到自己的身体突然自己行动。上线后她像被困在身体里旁观外界，无法控制动作和发声，但视觉、听觉、嗅觉、味觉、触觉、疼痛、疲劳等身体感觉仍然能感受到。规则：mind 必须是角色自己的第一人称内心独白，不要旁白说明，不要写角色名字；intent 是角色自己下一步想要做什么，不是玩家行动选项，必须根据角色性格、年龄、身体状态、经历和当前处境判断，不要固定模板。格式：{"mind":"60字内","intent":"${store.character.name}下一步想要……，40字内","mood":"冷静/紧张/愤怒/动摇/信任/恐惧/好奇/坚定之一","resistance":0到100整数}`;
  },

  parse(text, fallback) {
    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start < 0 || end < 0) throw new Error('反馈 JSON 缺失');
      const data = JSON.parse(text.slice(start, end + 1));
      return {
        mind: String(data.mind || fallback.mind).slice(0, 80),
        intent: String(data.intent || fallback.intent).slice(0, 80),
        mood: ['冷静', '紧张', '愤怒', '动摇', '信任', '恐惧', '好奇', '坚定'].includes(data.mood) ? data.mood : fallback.mood,
        resistance: this.clamp(data.resistance, fallback.resistance),
      };
    } catch (err) {
      console.warn('角色反馈解析失败:', err.message);
      return fallback;
    }
  },

  fallback(store) {
    const name = store.character?.name || '角色';
    return {
      mind: store.controlMode === 'possess' ? '怎、怎么回事……我的身体为什么不听我使唤了？' : '脑海里多了什么陌生的东西……它想让我怎么做？',
      intent: store.controlMode === 'possess' ? `${name}下一步想要夺回身体的主导权。` : `${name}下一步想要弄清这条操控链路。`,
      mood: '动摇',
      resistance: Math.max(store.resistance || 0, 35),
    };
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
