/**
 * 人物记忆：短期/长期直接载入提示词，归档用每人物向量库检索。
 */
window.GameModules = window.GameModules || {};

window.GameModules.characterMemory = {
  async contextFor(store, action) {
    const state = store.characterRpgState;
    if (!state) return '暂无人物记忆。';
    const memory = this.ensure(state.id);
    const archive = await this.queryArchive(state.id, `${action} ${store.sceneTitle} ${store.quest} ${store.mindText}`);
    return this.format(memory, archive);
  },

  ensure(characterId) {
    const save = window.GameModules.sqliteSave;
    return save.getCharacterMemory(characterId) || {
      characterId,
      shortTerm: [],
      longTerm: [],
      updatedAt: new Date().toISOString(),
    };
  },

  async recordTurn(store, result) {
    const states = this.relatedStates(store, result);
    const text = this.eventText(store, result);
    for (const state of states) {
      const memory = this.ensure(state.id);
      memory.shortTerm.push({ turn: store.turn, scene: store.sceneTitle, text });
      if (memory.shortTerm.length > 8) memory.shortTerm.shift();
      if (this.shouldPromote(memory, result)) {
        memory.longTerm.push(this.longTermItem(store, result));
        if (memory.longTerm.length > 24) memory.longTerm.shift();
      }
      memory.updatedAt = new Date().toISOString();
      await window.GameModules.sqliteSave.saveCharacterMemory(state.id, memory);
      await window.GameModules.sqliteSave.saveMemoryArchive(state.id, this.archiveItem(state.id, text, store, result));
    }
  },

  relatedStates(store, result) {
    const names = new Set([store.character.name, ...(result.appearedCharacters || []).map((x) => x.name || x)]);
    return Object.values(store.rpgStates).filter((state) => names.has(state.name));
  },

  eventText(store, result) {
    return [
      `场景：${store.sceneTitle}`,
      `玩家行动：${store.lastAction || '无'}`,
      `旁白：${result.narration || ''}`,
      `发言：${result.speech || ''}`,
      `心理：${result.mind || ''}`,
      `目标：${result.quest || store.quest}`,
    ].filter(Boolean).join('\n');
  },

  shouldPromote(memory, result) {
    if (memory.shortTerm.length >= 6) return true;
    const text = `${result.narration || ''}${result.mind || ''}${result.quest || ''}`;
    return /受伤|死亡|秘密|契约|背叛|承诺|真相|觉醒|圣杯|战斗|告白|操控/.test(text);
  },

  longTermItem(store, result) {
    return {
      turn: store.turn,
      title: `${store.sceneTitle} / ${result.quest || store.quest}`.slice(0, 40),
      summary: `${result.narration || ''} ${result.mind || ''}`.slice(0, 180),
    };
  },

  archiveItem(characterId, text, store, result) {
    const createdAt = new Date().toISOString();
    return {
      id: `${characterId}-${createdAt}-${window.GameModules.rpgState.seed(text)}`,
      text,
      vector: this.vectorize(text),
      meta: { turn: store.turn, scene: store.sceneTitle, quest: result.quest || store.quest },
      createdAt,
    };
  },

  async queryArchive(characterId, rawQuery) {
    const query = await this.intentQuery(rawQuery);
    const qv = this.vectorize(query);
    return window.GameModules.sqliteSave.listMemoryArchives(characterId)
      .map((item) => ({ ...item, score: this.cosine(qv, item.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  },

  async intentQuery(rawQuery) {
    try {
      if (!window.dzmm?.completions) return rawQuery;
      let buffer = '';
      await window.dzmm.completions({
        model: 'nalang-turbo-0826',
        maxTokens: 240,
        messages: [{ role: 'user', content: `理解玩家意图，提取用于检索角色记忆的关键词短句。只返回一句话，不要解释：${rawQuery}` }],
      }, (chunk) => { buffer += chunk; });
      return buffer.trim() || rawQuery;
    } catch (err) {
      console.warn('记忆检索意图解析失败:', err.code, err.message);
      return rawQuery;
    }
  },

  format(memory, archive) {
    const shortText = memory.shortTerm.map((x) => `- ${x.text}`).join('\n') || '无';
    const longText = memory.longTerm.map((x) => `- ${x.title}：${x.summary}`).join('\n') || '无';
    const archiveText = archive.map((x) => `- ${x.text}`).join('\n') || '无';
    return `短期记忆：\n${shortText}\n长期记忆：\n${longText}\n记忆归档检索结果：\n${archiveText}`;
  },

  vectorize(text) {
    const vector = Array(64).fill(0);
    const tokens = String(text || '').match(/[\p{Script=Han}]|[a-zA-Z0-9_]+/gu) || [];
    for (const token of tokens) {
      const idx = window.GameModules.rpgState.seed(token) % vector.length;
      vector[idx] += Math.max(1, token.length);
    }
    return vector;
  },

  cosine(a, b) {
    let dot = 0; let an = 0; let bn = 0;
    for (let i = 0; i < a.length; i += 1) {
      dot += a[i] * (b[i] || 0);
      an += a[i] ** 2;
      bn += (b[i] || 0) ** 2;
    }
    return dot / (Math.sqrt(an) * Math.sqrt(bn) || 1);
  },
};
