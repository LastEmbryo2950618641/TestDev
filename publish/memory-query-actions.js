window.GameModules = window.GameModules || {};
window.GameModules.memoryQueryActions = {
  memoryQueryContext(characterId = '', keyword = '') {
    const id = characterId || 'player-self';
    const query = String(keyword || '').trim();
    const all = this.getCharacterMemory?.(id) || '';
    const hits = this.searchCharacterMemory?.(id, query) || '';
    return [`## 全部短期与长期记忆\n${all}`, query ? `## 关键词记忆条\n${hits}` : ''].filter(Boolean).join('\n\n');
  },

  getCharacterMemory(characterId = '') {
    const memory = window.GameModules.characterMemory?.ensure?.(characterId);
    if (!memory) return '暂无人物记忆。';
    return window.GameModules.characterMemory.format(memory, []);
  },

  searchCharacterMemory(characterId = '', keyword = '') {
    const raw = String(keyword || '').trim();
    if (!raw) return '无关键词。';
    const memory = window.GameModules.characterMemory?.ensure?.(characterId);
    if (!memory) return '暂无人物记忆。';
    const keys = raw.split(/[\s,，。！？；、]+/).map((x) => x.trim()).filter(Boolean).slice(0, 12);
    const pools = [
      ['刚发生记忆', memory.shortTerm?.recent], ['归纳总结区', memory.shortTerm?.summaryBuffer],
      ['近发生记忆', memory.shortTerm?.summarized], ['遗忘区', memory.shortTerm?.forgotten],
      ['难以忘记的记忆', memory.longTerm?.vivid], ['不可忘记的记忆', memory.longTerm?.permanent],
    ];
    const hits = [];
    pools.forEach(([name, list]) => (list || []).forEach((item) => {
      const text = `${window.GameModules.characterMemory.itemText(item)} ${item.text || ''}`;
      if (keys.some((key) => text.includes(key))) hits.push(`- ${name}｜${window.GameModules.characterMemory.itemText(item)}`);
    }));
    return hits.slice(0, 12).join('\n') || '未命中相关记忆条。';
  },

  async searchMemoryArchive(characterId = '', keyword = '') {
    const raw = String(keyword || '').trim();
    if (!raw) return '无关键词。';
    const hits = await window.GameModules.characterMemory?.queryArchive?.(characterId, raw) || [];
    return window.GameModules.characterMemory?.archiveSection?.(hits) || '未命中记忆归档。';
  },
};
