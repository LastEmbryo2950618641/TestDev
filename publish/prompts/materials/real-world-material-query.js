window.GameModules = window.GameModules || {};

(() => {
  const ctx = window.GameModules.realWorldAgentContext;
  if (!ctx || ctx.materialQueryInstalled) return;
  const baseLocation = ctx.location?.bind(ctx);

  Object.assign(ctx, {
    materialQueryInstalled: true,

    sliceAround(text = '', keyword = '', before = 400, after = 800) {
      const raw = String(text || '');
      const key = String(keyword || '').trim();
      if (!key) return raw.slice(0, before + after);
      const index = raw.indexOf(key);
      if (index < 0) return '';
      const start = Math.max(0, index - Math.max(0, Number(before) || 0));
      const end = Math.min(raw.length, index + key.length + Math.max(0, Number(after) || 0));
      return raw.slice(start, end);
    },

    companyRawText(store, company = {}) {
      return JSON.stringify(company || {}, null, 2);
    },

    company(store, method, params = {}) {
      const current = store.currentCompany?.();
      const list = store.companyState?.companies || (current ? [current] : []);
      const keyword = String(params.keyword || params.companyName || params.name || '').trim();
      if (method === 'listPlayerCompanies') return list.map((c) => `- ${c.name}：${c.type || '组织'}｜${c.industry || '行业未知'}｜${c.location || '地点未知'}`).join('\n') || '暂无公司。';
      const company = list.find((c) => !keyword || this.companyRawText(store, c).includes(keyword) || String(c.name || '').includes(keyword)) || current || list[0];
      if (!company) return '暂无公司资料。';
      if (method === 'searchCompanyOne') return keyword && !this.companyRawText(store, company).includes(keyword) ? '未命中公司资料。' : this.limit(this.companySummary(store, company), 900);
      if (method === 'searchCompanyWindow') return this.sliceAround(this.companyRawText(store, company), keyword, params.beforeChars, params.afterChars) || '未命中公司资料。';
      if (method === 'searchCompany' && keyword && !this.companyRawText(store, company).includes(keyword)) return '未命中公司资料。';
      if (method === 'getWorkContext') return this.workContext(store, company);
      return this.companySummary(store, company);
    },

    location(store, method, params = {}, action = '') {
      const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
      const keyword = String(params.keyword || params.locationName || params.name || '').trim();
      if (method === 'searchLocationOne') {
        const hit = this.findLocationHit?.(map, keyword) || (map.nodes || []).find((node) => this.locationNodeText(node).includes(keyword));
        return hit ? this.limit(this.locationDetail(map, hit.name), 900) : '未命中地点。';
      }
      if (method === 'searchLocationWindow') {
        const hit = this.findLocationHit?.(map, keyword) || (map.nodes || []).find((node) => this.locationNodeText(node).includes(keyword));
        return hit ? (this.sliceAround(this.locationNodeText(hit), keyword, params.beforeChars, params.afterChars) || this.limit(this.locationDetail(map, hit.name), 1400)) : '未命中地点。';
      }
      return baseLocation ? baseLocation(store, method, params, action) : '';
    },

    locationNodeText(node = {}) {
      return `${node.name || ''}\n${node.description || ''}\n${JSON.stringify(node.descriptionFacts || [])}`;
    },

    history(store, method, params = {}) {
      const keyword = String(params.keyword || '').trim();
      if (method === 'getWorldlinePending') return this.worldlinePending(store);
      if (method === 'listWorldlinePlots') return this.worldlinePlots(store);
      if (method === 'getWorldlinePlotRecords') return this.worldlinePlotRecords(store, params);
      const rows = this.allRealWorldRows(store);
      if (method === 'getRecentRealWorldLog') return this.historyRowsText(rows.slice(-(Number(params.count) || 5)));
      if (method === 'searchRealWorldLogOne') {
        const row = rows.find((entry) => this.historyRowRaw(entry).includes(keyword));
        return row ? this.historyRowsText([row], 900) : '未命中现实记录。';
      }
      if (method === 'searchRealWorldLogWindow') {
        const row = rows.find((entry) => this.historyRowRaw(entry).includes(keyword));
        return row ? (this.sliceAround(this.historyRowRaw(row), keyword, params.beforeChars, params.afterChars) || this.historyRowsText([row], 1200)) : '未命中现实记录。';
      }
      const picked = method === 'searchRealWorldLog' && keyword ? rows.filter((entry) => this.historyRowRaw(entry).includes(keyword)).slice(-8) : rows.slice(-5);
      return this.historyRowsText(picked);
    },

    historyRowRaw(entry = {}) {
      return `${entry.text || ''}\n${entry.narration || ''}\n${entry.locationName || ''}\n${JSON.stringify(entry)}`;
    },

    historyRowsText(rows = [], max = 1800) {
      const text = rows.map((entry) => entry.type === 'user' ? `玩家：${entry.text}` : `现实：${entry.locationName || '未知地点'}｜${this.limit(entry.narration || entry.text || '', 360)}`).join('\n');
      return this.limit(text || '未命中现实记录。', max);
    },

    async memory(store, action, method, params = {}) {
      const keyword = String(params.keyword || action || '').trim();
      const characterId = String(params.characterId || params.id || 'player-self').trim();
      if (method === 'getRecentCharacterMemories') return this.recentCharacterMemoriesText(characterId, Number(params.count) || 5);
      if (method === 'searchCharacterMemoryOne') return this.memoryHitText(store, characterId, keyword, 900);
      if (method === 'searchCharacterMemoryWindow') return this.sliceAround(this.memoryRawText(characterId), keyword, params.beforeChars, params.afterChars) || '未命中相关记忆。';
      if (method === 'getAllCharacterMemories') return this.peopleMemoryBrief(store, keyword, 3600);
      if (method === 'searchMemoryArchive') return await store.searchMemoryArchive?.(characterId, keyword) || '未命中记忆归档。';
      if (method === 'getCharacterMemory') return characterId === 'all' ? this.peopleMemoryBrief(store, keyword, 3600) : (this.limit(store.getCharacterMemory?.(characterId) || '', 1800) || '暂无人物记忆。');
      if (method === 'searchCharacterMemory') return characterId === 'all' ? this.searchAllPeopleMemory(store, keyword) : (store.searchCharacterMemory?.(characterId, keyword) || '未命中相关记忆。');
      return store.searchCharacterMemory?.('player-self', keyword) || store.memoryQueryContext?.('player-self', keyword) || '未命中相关记忆。';
    },

    memoryRawText(characterId = 'player-self') {
      const memory = window.GameModules.characterMemory?.ensure?.(characterId);
      return JSON.stringify(memory || {}, null, 2);
    },

    memoryHitText(store, characterId = 'player-self', keyword = '', max = 900) {
      const text = store.searchCharacterMemory?.(characterId, keyword) || this.sliceAround(this.memoryRawText(characterId), keyword, 300, 600);
      return this.limit(text || '未命中相关记忆。', max);
    },

    recentCharacterMemoriesText(characterId = 'player-self', count = 5) {
      const memory = window.GameModules.characterMemory?.ensure?.(characterId) || {};
      const rows = [].concat(memory.shortTerm?.recent || [], memory.shortTerm?.summaryBuffer || [], memory.shortTerm?.summarized || [], memory.longTerm?.vivid || [], memory.longTerm?.permanent || []).slice(-Math.max(1, count));
      const m = window.GameModules.characterMemory;
      return rows.map((item) => `- ${m?.itemText?.(item) || item.summary || item.text || JSON.stringify(item)}`).join('\n') || '暂无人物记忆。';
    },
  });
})();
