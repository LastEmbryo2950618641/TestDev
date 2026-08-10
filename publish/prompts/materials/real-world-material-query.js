window.GameModules = window.GameModules || {};

(() => {
  function installMaterialQuery(target = window.GameModules.realWorldAgentContext) {
    if (!target) return false;
    if (target.materialQueryInstalled && typeof target.company === 'function' && typeof target.history === 'function') return true;
    const baseLocation = target.location?.bind(target);

    Object.assign(target, {
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
        const map = window.GameModules.realWorldMap.ensure(store, window.GameModules.currentLocationField?.roleProfile?.(store) || {});
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
      if (method === 'listWorldlineIndex') return this.worldlineIndex(store);
      if (method === 'searchWorldlineByKeyword') return this.searchWorldline(store, keyword, 'keyword');
      if (method === 'searchWorldlineByTime') return this.searchWorldlineByTime(store, params);
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

    worldlineIndex(store) {
      const line = store.realWorldline?.() || { events: [], plots: [], pendingPlot: null };
      const pending = line.pendingPlot ? `记录中｜${line.pendingPlot.startedAt || ''}-${line.pendingPlot.endedAt || ''}｜记录数:${(line.pendingPlot.recordIds || []).length}` : '记录中｜暂无';
      const recentEvents = (line.events || []).slice(-12).map((event) => `事件｜${event.eventId || event.id || '未知'}｜${event.time || ''}｜${event.name || '现实事件'}｜情节:${event.plotId || event.summary || '未归纳'}｜${this.limit(event.detail || '', 80)}`);
      const plots = (line.plots || []).slice(-12).map((plot) => `情节｜${plot.情节编号 || plot.id || '未编号'}｜${plot.情节标题 || plot.情节名称 || plot.摘要 || '未命名'}｜${plot.情节时间段 || ''}｜${this.limit(plot.短摘要 || plot.情节总结 || '', 120)}｜标签:${(plot.检索标签 || []).join('、')}｜记录:${plot.重要记录编号 || plot.recordIds || ''}`);
      return [`世界线清单`, pending, ...plots, ...recentEvents].join('\n') || '暂无世界线资料。';
    },

    searchWorldline(store, query = '', mode = 'keyword') {
      const key = String(query || '').trim();
      if (!key) return this.worldlineIndex(store);
      const line = store.realWorldline?.() || { events: [], plots: [] };
      const events = (line.events || []).filter((event) => this.worldlineEventText(event).includes(key)).slice(-8);
      const plots = (line.plots || []).filter((plot) => this.worldlinePlotText(plot).includes(key)).slice(-6);
      const eventText = events.map((event) => this.eventLine?.(event) || this.worldlineEventText(event)).join('\n');
      const plotText = plots.map((plot) => this.worldlinePlotDetail(line, plot)).join('\n\n');
      const label = mode === 'time' ? '时间' : '关键词';
      return this.limit([`${label}查询：${key}`, plotText ? `命中情节：\n${plotText}` : '', eventText ? `命中事件：\n${eventText}` : ''].filter(Boolean).join('\n\n') || '未命中世界线资料。', 1800);
    },

    searchWorldlineByTime(store, params = {}) {
      const start = this.parseHistoryTime(params.startTime || params.start || params.minTime || params.from);
      const end = this.parseHistoryTime(params.endTime || params.end || params.maxTime || params.to);
      const keyword = String(params.keyword || '').trim();
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return this.searchWorldline(store, String(params.time || params.keyword || '').trim(), 'time');
      const line = store.realWorldline?.() || { events: [], plots: [] };
      const keywordHit = (text) => !keyword || text.includes(keyword);
      const inRange = (value) => {
        const at = this.parseHistoryTime(value);
        return Number.isFinite(at) && at >= start && at <= end;
      };
      const events = (line.events || []).filter((event) => inRange(event.time) && keywordHit(this.worldlineEventText(event))).slice(-8);
      const plots = (line.plots || []).filter((plot) => this.plotOverlapsRange(plot, start, end) && keywordHit(this.worldlinePlotText(plot))).slice(-6);
      const eventText = events.map((event) => this.eventLine?.(event) || this.worldlineEventText(event)).join('\n');
      const plotText = plots.map((plot) => this.worldlinePlotDetail(line, plot)).join('\n\n');
      const title = `时间段查询：${params.startTime || params.start || ''} - ${params.endTime || params.end || ''}${keyword ? `｜关键词：${keyword}` : ''}`;
      return this.limit([title, plotText ? `命中情节：\n${plotText}` : '', eventText ? `命中事件：\n${eventText}` : '未命中该时间段世界线资料。'].filter(Boolean).join('\n\n'), 1800);
    },

    parseHistoryTime(value = '') {
      const text = String(value || '').trim();
      const match = text.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?(?:[ T]+(\d{1,2})[:：](\d{1,2})(?::(\d{1,2}))?)?/u);
      if (!match) return NaN;
      const [, y, m, d, hh = '0', mm = '0', ss = '0'] = match;
      return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)).getTime();
    },

    plotOverlapsRange(plot = {}, start, end) {
      const times = String(plot.情节时间段 || plot.timeRange || plot.time || '').match(/\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}日?(?:[ T]+\d{1,2}[:：]\d{1,2}(?::\d{1,2})?)?/gu) || [];
      const parsed = times.map((item) => this.parseHistoryTime(item)).filter(Number.isFinite);
      if (!parsed.length) return false;
      const min = Math.min(...parsed), max = Math.max(...parsed);
      return max >= start && min <= end;
    },

    worldlinePlotDetail(line = {}, plot = {}) {
      const ids = String(plot.重要记录编号 || plot.recordIds || '').split(/[、,，\s]+/).filter(Boolean);
      const events = this.eventsByIds?.(line, ids) || [];
      return [`情节：${plot.情节编号 || plot.id || ''}｜${plot.情节标题 || plot.情节名称 || plot.摘要 || ''}`, `时间：${plot.情节时间段 || ''}`, `短摘要：${plot.短摘要 || plot.情节总结 || plot.摘要 || plot.情节摘要 || ''}`, `关键事实：${(plot.关键事实 || []).join('；') || '无'}`, `检索标签：${(plot.检索标签 || []).join('、') || '无'}`, `关键片段：${plot.重要片段 || ''}`, `关联记录：\n${events.map((event) => this.eventLine?.(event) || this.worldlineEventText(event)).join('\n') || ids.join('、') || '无'}`].join('\n');
    },

    worldlineEventText(event = {}) {
      return `${event.eventId || event.id || ''}\n${event.time || ''}\n${event.name || ''}\n${event.summary || ''}\n${event.plotId || ''}\n${event.detail || ''}\n${JSON.stringify(event)}`;
    },

    worldlinePlotText(plot = {}) {
      return `${plot.情节编号 || plot.id || ''}\n${plot.情节标题 || ''}\n${plot.情节名称 || ''}\n${plot.情节时间段 || ''}\n${plot.短摘要 || ''}\n${plot.情节总结 || ''}\n${(plot.关键事实 || []).join('\n')}\n${(plot.检索标签 || []).join('\n')}\n${plot.摘要 || ''}\n${plot.重要片段 || ''}\n${plot.重要记录编号 || plot.recordIds || ''}\n${JSON.stringify(plot)}`;
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

    async itemQuery(store, method, params = {}) {
      const target = params.target || params.characterId || 'player-self';
      if (method === 'listCharacterItems') return store.listCharacterItems?.(target) || '物品系统不可用。';
      if (method === 'searchKnownItem') return store.searchKnownItem?.(params.keyword || params.name || '') || '物品系统不可用。';
      if (method === 'generateItemSkill') {
        const r = await store.generateItemSkill?.(params.item || params);
        return r?.message ? `${r.message}\n${JSON.stringify(r.item || {}, null, 2)}` : '生成物品失败。';
      }
      if (method === 'addItemToTarget') return (await store.addItemToTarget?.(target, params.item || params))?.message || '新增物品失败。';
      if (method === 'transferItemSkill') return (await store.transferItemSkill?.(params.from || 'player-self', params.to || params.target || '', params.itemName || params.name || params.item?.name, params.quantity, params.reason))?.message || '转移物品失败。';
      if (method === 'deleteItemSkill') return (await store.deleteItemSkill?.(target, params.itemName || params.name || params.item?.name, params.quantity, params.reason))?.message || '删除物品失败。';
      if (method === 'purchaseItemSkill') return (await store.purchaseItemSkill?.(target, params.item || params))?.message || '购买物品失败。';
      return '未知物品查询方法。';
    },

    lexicon(store, method, params = {}) {
      const keyword = String(params.keyword || params.name || '').trim();
      if (method === 'addSpecialTerm') return this.addSpecialTerm(store, params);
      const entries = this.specialTermEntries(store, params);
      if (method === 'searchTermWindow') {
        const hit = this.findSpecialTerm(entries, keyword);
        return hit ? (this.sliceAround(this.specialTermRawText(hit), keyword, params.beforeChars, params.afterChars) || this.specialTermText(hit)) : '未命中专用术语。';
      }
      if (method === 'searchTermOne') {
        const hit = this.findSpecialTerm(entries, keyword);
        return hit ? this.limit(this.specialTermText(hit), 900) : '未命中专用术语。';
      }
      return entries.slice(0, 12).map((entry) => this.specialTermLine(entry)).join('\n') || '暂无专用术语。';
    },

    resolveWorldTag(store, params = {}) {
      return String(params.world || params.worldTag || window.GameModules.realWorld2026?.label || store.character?.work || '2026 现代都市现实世界').trim();
    },

    specialTermEntries(store, params = {}) {
      const worldTag = this.resolveWorldTag(store, params);
      const rows = window.GameModules.lexiconStore?.list?.(worldTag, '专用术语') || [];
      return rows.concat(window.GameModules.lexiconStore?.list?.('', '专用术语') || []).filter((entry, index, arr) => arr.findIndex((item) => `${item.worldTag}:${item.kind}:${item.name}` === `${entry.worldTag}:${entry.kind}:${entry.name}`) === index);
    },

    findSpecialTerm(entries = [], keyword = '') {
      const key = String(keyword || '').trim();
      if (!key) return entries[0] || null;
      return entries.find((entry) => this.specialTermRawText(entry).includes(key) || String(entry.name || '').includes(key) || (entry.aliases || []).some((alias) => String(alias).includes(key))) || null;
    },

    specialTermRawText(entry = {}) {
      return `${entry.name || ''}\n${(entry.aliases || []).join('、')}\n${entry.summary || ''}\n${entry.description || ''}\n${entry.promptInstruction || ''}\n${JSON.stringify(entry.value || {})}\n${JSON.stringify(entry.meta || {})}`;
    },

    specialTermLine(entry = {}) {
      return `- ${entry.name || '未命名术语'}：${entry.summary || entry.description || '暂无定义'}`;
    },

    specialTermText(entry = {}) {
      return [`术语：${entry.name || '未命名术语'}`, `别名：${(entry.aliases || []).join('、') || '无'}`, `摘要：${entry.summary || '暂无摘要'}`, `定义：${entry.description || '暂无定义'}`, `使用规则：${entry.promptInstruction || '按词条定义理解。'}`].join('\n');
    },

    async addSpecialTerm(store, params = {}) {
      const name = String(params.name || params.keyword || '').trim().slice(0, 32);
      if (!name) return '新增专用术语失败：缺少术语名。';
      const worldTag = this.resolveWorldTag(store, params);
      const summary = String(params.summary || params.description || '根据当前世界推演上下文补充的专用术语。').trim().slice(0, 80);
      const description = String(params.description || params.summary || '该术语由 AI 根据当前已知现实资料克制推断，后续可由剧情事实修正。').trim().slice(0, 240);
      const aliases = Array.isArray(params.aliases) ? params.aliases.slice(0, 6).map(String) : [];
      await window.GameModules.rpgLexicon.saveMany?.([{ worldTag, kind: '专用术语', name, summary, description, aliases, value: { definition: description }, promptInstruction: `遇到“${name}”时按此专用术语定义理解：${description}`.slice(0, 260), reason: String(params.reason || 'AI查询术语库未命中后，根据已有上下文克制推断并新增术语。').slice(0, 120), source: 'ai', aiGenerated: true, meta: { scope: 'cross-world', termType: 'special-term' } }]);
      return `已新增专用术语：${name}\n摘要：${summary}\n定义：${description}`;
    },

    entity(store, method, params = {}) {
      const keyword = String(params.keyword || params.name || params.entityName || '').trim();
      const includeHistory = method === 'searchEntityHistory' || method === 'getEntityDetail';
      if (method === 'listEntities') return window.GameModules.entityStateStore?.searchText?.(store, params, { includeHistory: false, limit: Number(params.limit) || 12 }) || '实体状态系统不可用。';
      if (method === 'searchEntityOne') {
        const hit = window.GameModules.entityStateStore?.search?.(store, params)?.[0];
        return hit ? window.GameModules.entityStateStore.entityDetail(hit, { includeHistory: false }) : '未命中实体状态。';
      }
      if (method === 'searchEntityHistory' || method === 'getEntityDetail') {
        const hit = window.GameModules.entityStateStore?.search?.(store, params)?.[0];
        return hit ? window.GameModules.entityStateStore.entityDetail(hit, { includeHistory: true, maxHistory: Number(params.historyLimit) || 8 }) : '未命中实体历史。';
      }
      if (method === 'searchEntityWindow') {
        const hit = window.GameModules.entityStateStore?.search?.(store, params)?.[0];
        const raw = hit ? window.GameModules.entityStateStore.entityRawText(hit) : '';
        return hit ? (this.sliceAround(raw, keyword, params.beforeChars, params.afterChars) || window.GameModules.entityStateStore.entityDetail(hit, { includeHistory })) : '未命中实体状态。';
      }
      return window.GameModules.entityStateStore?.searchText?.(store, params, { includeHistory, limit: Number(params.limit) || 8 }) || '实体状态系统不可用。';
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
    return true;
  }

  window.GameModules.installMaterialQuery = installMaterialQuery;
  installMaterialQuery();
})();
