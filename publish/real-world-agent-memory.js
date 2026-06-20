window.GameModules = window.GameModules || {};

(() => {
  const ctx = window.GameModules.realWorldAgentContext;
  if (!ctx || ctx.memoryInstalled) return;

  function clean(text) {
    return String(text || '').replace(/\s+/g, '').slice(0, 180);
  }

  Object.assign(ctx, {
    memoryInstalled: true,

    allCharacterMemoryIds(store) {
      const ids = new Set(['player-self']);
      Object.keys(store.rpgStates || {}).forEach((id) => id && ids.add(String(id)));
      (window.GameModules.sqliteSave.listCharacterStates?.() || []).forEach((state) => state?.id && ids.add(String(state.id)));
      return [...ids];
    },

    characterMemoryName(store, id) {
      if (id === 'player-self') return store.playerDisplayCharacter?.().name || store.playerName || '玩家本人';
      const state = store.rpgStates?.[id] || window.GameModules.sqliteSave.getCharacterState?.(id) || {};
      return state.name || state.profile?.name || id;
    },

    timelineMemoryIndex(store) {
      const line = store.realWorldline?.() || {};
      const events = line.events || [];
      return {
        ids: new Set(events.flatMap((event) => [event.eventId, event.id]).filter(Boolean)),
        texts: events.map((event) => clean(`${event.detail || ''}${event.summary || ''}`)).filter((text) => text.length > 30),
      };
    },

    memoryDuplicatesTimeline(item, index) {
      const ids = [item.id, item.linkedLongTermId, ...(item.sourceIds || [])].filter(Boolean);
      if (ids.some((id) => index.ids.has(id))) return true;
      const text = clean(`${item.summary || ''}${item.text || ''}`);
      return text.length > 30 && index.texts.some((eventText) => eventText.includes(text.slice(0, 60)) || text.includes(eventText.slice(0, 60)));
    },

    collectMemoryLines(memory, timelineIndex, limit = 8) {
      const m = window.GameModules.characterMemory;
      const pools = [
        ['短期-刚发生', memory.shortTerm?.recent],
        ['短期-归纳中', memory.shortTerm?.summaryBuffer],
        ['短期-近发生', memory.shortTerm?.summarized],
        ['长期-难忘', memory.longTerm?.vivid],
        ['长期-不可忘记', memory.longTerm?.permanent],
      ];
      const seen = new Set();
      const lines = [];
      let skipped = 0;
      pools.forEach(([name, items]) => (items || []).forEach((item) => {
        const key = item.id || item.linkedLongTermId || clean(item.summary || item.text);
        if (!key || seen.has(key)) { skipped += 1; return; }
        seen.add(key);
        if (this.memoryDuplicatesTimeline(item, timelineIndex)) { skipped += 1; return; }
        if (lines.length < limit) lines.push(`- ${name}｜${m.itemText(item)}`);
      }));
      return { lines, skipped };
    },

    peopleMemoryBrief(store, action = '', maxChars = 2800) {
      const index = this.timelineMemoryIndex(store);
      const sections = [];
      let skippedTotal = 0;
      this.allCharacterMemoryIds(store).forEach((id) => {
        const memory = window.GameModules.characterMemory?.ensure?.(id);
        if (!memory) return;
        const picked = this.collectMemoryLines(memory, index, id === 'player-self' ? 10 : 6);
        skippedTotal += picked.skipped;
        if (picked.lines.length) sections.push(`### ${this.characterMemoryName(store, id)}（${id}）\n${picked.lines.join('\n')}`);
      });
      const note = skippedTotal ? `\n（已去重 ${skippedTotal} 条：与现实时间线记录或短/长期记忆重复的同源记录只保留一份。）` : '';
      return this.limit((sections.join('\n\n') || '暂无人物短期/长期记忆。') + note, maxChars);
    },

    searchAllPeopleMemory(store, keyword = '') {
      return this.limit(this.allCharacterMemoryIds(store).map((id) => {
        const text = store.searchCharacterMemory?.(id, keyword) || '';
        if (!text || text.includes('未命中') || text.includes('无关键词')) return '';
        return `### ${this.characterMemoryName(store, id)}（${id}）\n${text}`;
      }).filter(Boolean).join('\n\n') || '未命中任何人物记忆。', 2600);
    },
  });

  const baseSnapshot = ctx.baseSnapshot.bind(ctx);
  ctx.baseSnapshot = function wrappedBaseSnapshot(store, action = '') {
    return [baseSnapshot(store, action), `相关人物短期/长期记忆：\n${this.peopleMemoryBrief(store, action)}`].join('\n');
  };

  ctx.memory = async function memory(store, action, method, params = {}) {
    const keyword = String(params.keyword || action || '').trim();
    const characterId = String(params.characterId || params.id || 'player-self').trim();
    if (method === 'getAllCharacterMemories') return this.peopleMemoryBrief(store, keyword, 3600);
    if (method === 'searchMemoryArchive') return await store.searchMemoryArchive?.(characterId, keyword) || '未命中记忆归档。';
    if (method === 'getCharacterMemory') return characterId === 'all' ? this.peopleMemoryBrief(store, keyword, 3600) : (this.limit(store.getCharacterMemory?.(characterId) || '', 1800) || '暂无人物记忆。');
    if (method === 'searchCharacterMemory') return characterId === 'all' ? this.searchAllPeopleMemory(store, keyword) : (store.searchCharacterMemory?.(characterId, keyword) || '未命中相关记忆。');
    return store.searchCharacterMemory?.('player-self', keyword) || store.memoryQueryContext?.('player-self', keyword) || '未命中相关记忆。';
  };
})();
