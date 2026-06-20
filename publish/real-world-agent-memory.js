window.GameModules = window.GameModules || {};

(() => {
  const ctx = window.GameModules.realWorldAgentContext;
  if (!ctx || ctx.memoryInstalled) return;

  function clean(text) {
    return String(text || '').replace(/\s+/g, '').slice(0, 220);
  }

  Object.assign(ctx, {
    memoryInstalled: true,

    allCharacterMemoryIds(store) {
      const ids = new Set(['player-self']);
      Object.keys(store.rpgStates || {}).forEach((id) => id && ids.add(String(id)));
      (window.GameModules.sqliteSave.listCharacterStates?.() || []).forEach((state) => state?.id && ids.add(String(state.id)));
      return [...ids];
    },

    characterState(store, id) {
      return store.rpgStates?.[id] || window.GameModules.sqliteSave.getCharacterState?.(id) || null;
    },

    characterMemoryName(store, id) {
      if (id === 'player-self') return store.playerDisplayCharacter?.().name || store.playerName || '玩家本人';
      const state = this.characterState(store, id) || {};
      return state.name || state.profile?.name || id;
    },

    resolveMemoryIds(store, characters = []) {
      const ids = new Set(['player-self']);
      const allIds = this.allCharacterMemoryIds(store);
      const states = (window.GameModules.sqliteSave.listCharacterStates?.() || []).concat(Object.values(store.rpgStates || {}));
      characters.forEach((item) => {
        const rawId = String(item?.id || item?.characterId || '').trim();
        const rawName = String(item?.name || (typeof item === 'string' ? item : '')).trim();
        if (rawId === 'all' || rawName === 'all') allIds.forEach((id) => ids.add(id));
        if (rawId && allIds.includes(rawId)) ids.add(rawId);
        const hit = states.find((state) => state?.id === rawId || state?.name === rawName || state?.profile?.name === rawName);
        if (hit?.id) ids.add(String(hit.id));
      });
      return [...ids];
    },

    timelineMemoryIndex(store, loaded = []) {
      const line = store.realWorldline?.() || {};
      const pendingIds = line.pendingPlot?.recordIds || [];
      const pending = (line.events || []).filter((event) => pendingIds.includes(event.eventId) || pendingIds.includes(event.id));
      const loadedHistory = loaded.filter((item) => String(item.title || '').includes('realworld.history.query'));
      const texts = [
        ...pending.map((event) => `${event.detail || ''}${event.summary || ''}`),
        ...loadedHistory.map((item) => item.text || ''),
      ];
      return {
        ids: new Set(pending.flatMap((event) => [event.eventId, event.id]).filter(Boolean)),
        texts: texts.map(clean).filter((text) => text.length > 30),
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

    characterMemoriesForStep(store, action = '', characters = [], loaded = [], alreadyLoaded = new Set(), forcePlayer = false) {
      const ids = this.resolveMemoryIds(store, characters).filter((id) => forcePlayer || !alreadyLoaded.has(id));
      if (!ids.length) return null;
      const index = this.timelineMemoryIndex(store, loaded);
      const sections = [];
      let skippedTotal = 0;
      const loadedIds = [];
      ids.forEach((id) => {
        const memory = window.GameModules.characterMemory?.ensure?.(id);
        if (!memory) return;
        const picked = this.collectMemoryLines(memory, index, id === 'player-self' ? 10 : 7);
        skippedTotal += picked.skipped;
        loadedIds.push(id);
        if (picked.lines.length) sections.push(`### ${this.characterMemoryName(store, id)}（${id}）\n${picked.lines.join('\n')}`);
      });
      const note = skippedTotal ? `\n（已去重 ${skippedTotal} 条：与已载入现实时间线记录或短/长期记忆重复的同源记录只保留一份。）` : '';
      const text = this.limit((sections.join('\n\n') || '相关角色暂无可用短期/长期记忆。') + note, 3200);
      return { title: 'memory.query.characterMemoriesForStep', text, max: 3200, ids: loadedIds };
    },

    peopleMemoryBrief(store, action = '', maxChars = 2800) {
      const item = this.characterMemoriesForStep(store, action, [{ id: 'all' }], [], new Set(), true);
      return this.limit(item?.text || '暂无人物短期/长期记忆。', maxChars);
    },

    searchAllPeopleMemory(store, keyword = '') {
      return this.limit(this.allCharacterMemoryIds(store).map((id) => {
        const text = store.searchCharacterMemory?.(id, keyword) || '';
        if (!text || text.includes('未命中') || text.includes('无关键词')) return '';
        return `### ${this.characterMemoryName(store, id)}（${id}）\n${text}`;
      }).filter(Boolean).join('\n\n') || '未命中任何人物记忆。', 2600);
    },
  });

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
