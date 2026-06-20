window.GameModules = window.GameModules || {};

window.GameModules.realWorldAgentContext = {
  limit(text, max = 1200) {
    return String(text || '').trim().slice(0, max);
  },

  baseSnapshot(store, action = '') {
    const realWorld = window.GameModules.realWorld2026 || {};
    const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
    const companies = this.companyNames(store);
    const recent = this.recentLog(store, 3);
    const worldline = this.worldlineBrief(store);
    return [
      `世界：${realWorld.label || '2026 现代都市现实世界'}`,
      `背景：${realWorld.summary || '玩家生活在现代都市，个人信息由玩家自行设定。'}`,
      `关系边界：${realWorld.relationHint || '玩家相关人际关系只以玩家填写为准，未填写不要擅自补完。'}`,
      `手机时间：${store.phoneDateText?.() || '未知'} ${store.phoneTimeText?.() || ''}`,
      `玩家资料：${store.playerSetupSummary?.() || store.playerName || '玩家'}`,
      `玩家属性：${this.limit(store.playerIdentitySummary?.() || '玩家本人属性尚未生成。', 1000)}`,
      `当前场景：${store.realWorldSceneTitle || '现实世界'}`,
      `当前地点：${store.realWorldLocationName || map.current || '尚未生成具体地点'}`,
      `当前目标：${store.realWorldQuest || '确认手机异常与现实处境'}`,
      `当前组织名称：${companies || '暂无公司名称'}`,
      `现实世界线：\n${worldline}`,
      `最近记录摘要：\n${recent}`,
      `本次行动：${action || '继续观察现实世界'}`,
    ].join('\n');
  },

  companyNames(store) {
    const list = store.companyState?.companies || [];
    if (!list.length) return store.currentCompany?.()?.name || '';
    return list.map((item) => `${item.name}${item.id === store.companyState?.currentCompanyId ? '（当前）' : ''}`).join('、');
  },

  recentLog(store, limit = 3) {
    const rows = (store.realWorldLog || []).filter((entry) => entry.type !== 'system').slice(-limit);
    return rows.map((entry) => entry.type === 'user'
      ? `玩家行动：${entry.text}`
      : `地点：${entry.locationName || store.realWorldLocationName || '未知'}｜结果：${this.limit(entry.narration || entry.text || '', 260)}`).join('\n') || '暂无现实世界推演记录。';
  },

  worldlineBrief(store) {
    const line = store.realWorldline?.() || { events: [], plots: [], pendingPlot: null };
    const pendingIds = line.pendingPlot?.recordIds || [];
    const pendingEvents = this.eventsByIds?.(line, pendingIds) || (line.events || []).filter((event) => pendingIds.includes(event.eventId) || pendingIds.includes(event.id));
    const pending = pendingEvents.length
      ? pendingEvents.map((event) => this.eventLine?.(event) || `${event.eventId || event.id || '未知记录'}｜${event.time || ''}｜${event.name || '现实事件'}｜${this.limit(event.detail || event.summary || '', 360)}`).join('\n')
      : '暂无待归纳记录。';
    const plots = (line.plots || []).slice(-8).map((plot) => {
      const id = plot.情节编号 || plot.id || '未编号';
      const name = plot.情节名称 || plot.name || plot.摘要 || '未命名情节';
      const records = plot.重要记录编号 || plot.recordIds || '';
      return `- ${id}｜${name}｜关联记录：${records || '需动态查询'}`;
    }).join('\n') || '已归纳情节：暂无。';
    return `正在记录全文：\n${pending}\n已归纳情节目录：\n${plots}\n说明：正在记录的现实时间线已全文载入；已归纳情节只提供索引，需要细节时再动态请求 realworld.history.query。`;
  },

  buildLoadedText(items = []) {
    if (!items.length) return '本轮尚未动态载入额外资料。';
    return items.map((item, index) => `### 资料${index + 1}｜${item.title}\n${this.limit(item.text, item.max || 1600)}`).join('\n\n');
  },

  async skillText() {
    const ids = ['emotion.feeling.wearing.assess', 'memory.query', 'company.query', 'realworld.location.query', 'realworld.history.query'];
    const texts = await Promise.all(ids.map((id) => window.GameModules.skillLoader?.instruction?.(id) || ''));
    return texts.filter(Boolean).join('\n\n');
  },

  async loadRequests(store, action, requests = [], loadedKeys = new Set(), materialSession = null) {
    const out = [];
    for (const req of requests.slice(0, 3)) {
      const skill = String(req?.skill || '').trim();
      const method = String(req?.method || '').trim();
      const params = req?.params && typeof req.params === 'object' ? req.params : {};
      const key = `${skill}:${method}:${JSON.stringify(params)}`;
      if (!skill || !method || loadedKeys.has(key)) continue;
      loadedKeys.add(key);
      const text = await this.dispatch(store, action, skill, method, params);
      if (text) {
        const title = `${skill}.${method}`;
        const material = window.GameModules.realWorldMaterials?.optionFor?.({ skill, method, params });
        window.GameModules.realWorldMaterials?.record?.(materialSession, { skill, method, params }, title, text);
        out.push({ title, text, max: material?.maxChars || this.maxFor(skill) });
      }
    }
    return out;
  },

  maxFor(skill) {
    if (skill === 'realworld.location.query') return 1500;
    if (skill === 'memory.query') return 1600;
    if (skill === 'realworld.history.query') return 1800;
    if (skill === 'company.query') return 1400;
    return 1000;
  },

  async dispatch(store, action, skill, method, params) {
    if (skill === 'company.query') return this.company(store, method, params);
    if (skill === 'realworld.location.query') return this.location(store, method, params, action);
    if (skill === 'realworld.history.query') return this.history(store, method, params);
    if (skill === 'memory.query') return await this.memory(store, action, method, params);
    return '';
  },

  company(store, method, params = {}) {
    const current = store.currentCompany?.();
    const list = store.companyState?.companies || (current ? [current] : []);
    const keyword = String(params.keyword || params.companyName || params.name || '').trim();
    if (method === 'listPlayerCompanies') return list.map((c) => `- ${c.name}：${c.type || '组织'}｜${c.industry || '行业未知'}｜${c.location || '地点未知'}`).join('\n') || '暂无公司。';
    const company = list.find((c) => !keyword || c.name.includes(keyword)) || current || list[0];
    if (!company) return '暂无公司资料。';
    if (method === 'searchCompany' && keyword && !JSON.stringify(company).includes(keyword)) return '未命中公司资料。';
    if (method === 'getWorkContext') return this.workContext(store, company);
    return this.companySummary(store, company);
  },

  companySummary(store, company = {}) {
    const work = company.workMode || {};
    const salary = company.salary || {};
    const org = (company.organization || []).slice(0, 4).map((d) => `${d.name}：${(d.jobs || []).map((j) => `${j.title}(${(j.people || []).join('、')})`).join('；')}`).join('\n');
    return [`公司：${company.name}`, `类型/行业：${company.type || '未知'}｜${company.industry || '未知'}`, `地点：${company.location || '未知'}`, `规模：${company.scale || '未知'}`, `制度：${work.type || '员工'}｜${work.workDays || ''}｜${work.startTime || ''}-${work.endTime || ''}`, `薪资：${salary.monthlyBase || 0}${salary.currency || 'CNY'}｜绩效${salary.performanceMonths || 0}个月`, `组织：\n${org || '暂无组织架构。'}`, `规则：${(company.rules || []).join('；') || '暂无规则。'}`].join('\n');
  },

  workContext(store, company = {}) {
    const stats = store.companyState?.workStats || {};
    const pay = store.monthlyPayPreview?.() || {};
    return [this.companySummary(store, company), `本月状态：迟到${stats.lateCount || 0}次｜旷班${stats.absentCount || 0}次｜绩效${stats.performance ?? 100}/100`, `收入预估：底薪${pay.base || 0}｜日薪${pay.daily || 0}｜本月完整上班${pay.workDays || 0}天`].join('\n');
  },

  location(store, method, params = {}) {
    const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
    const keyword = String(params.keyword || params.locationName || params.name || '').trim();
    if (method === 'getCurrentLocationContext') return this.locationDetail(map, map.current || store.realWorldLocationName);
    if (method === 'getNearbyLocations') return this.nearby(map, keyword || map.current);
    if (method === 'listTopLocations') return this.topLocations(map);
    if (method === 'searchLocation') return this.searchLocation(map, keyword);
    return this.locationDetail(map, keyword || map.current);
  },

  locationDetail(map, name = '') {
    const node = (map.nodes || []).find((item) => item.name === name || item.id === name) || (map.nodes || [])[0];
    if (!node) return '暂无地点资料。';
    const parent = (map.nodes || []).find((item) => item.id === node.parentId)?.name || '无';
    const children = (map.nodes || []).filter((item) => item.parentId === node.id).map((item) => item.name).join('、') || '无';
    const facts = (node.descriptionFacts || []).map((fact, i) => window.GameModules.realWorldMapFacts.formatFact(fact, i)).join('') || node.description || '暂无说明。';
    return `地点：${node.name}\n上级地点：${parent}\n子地点：${children}\n说明：${facts}`;
  },

  searchLocation(map, keyword = '') {
    if (!keyword) return this.topLocations(map);
    const hits = (map.nodes || []).filter((node) => `${node.name} ${node.description || ''} ${JSON.stringify(node.descriptionFacts || [])}`.includes(keyword)).slice(0, 8);
    return hits.map((node) => this.locationDetail(map, node.name)).join('\n\n') || '未命中地点。';
  },

  nearby(map, name = '') {
    const node = (map.nodes || []).find((item) => item.name === name) || (map.nodes || [])[0];
    if (!node) return '暂无附近地点。';
    const rows = (map.nodes || []).filter((item) => item.parentId === node.parentId || item.parentId === node.id || item.id === node.parentId).slice(0, 10);
    return rows.map((item) => `- ${item.name}${item.id === node.id ? '（当前）' : ''}`).join('\n') || '暂无附近地点。';
  },

  topLocations(map) {
    return (map.nodes || []).filter((node) => !node.parentId).slice(0, 12).map((node) => `- ${node.name}`).join('\n') || '暂无顶层地点。';
  },

  async memory(store, action, method, params = {}) {
    const keyword = String(params.keyword || action || '').trim();
    if (method === 'searchMemoryArchive') return await store.searchMemoryArchive?.('player-self', keyword) || '未命中记忆归档。';
    if (method === 'getCharacterMemory') return this.limit(store.getCharacterMemory?.('player-self') || '', 1600);
    return store.searchCharacterMemory?.('player-self', keyword) || store.memoryQueryContext?.('player-self', keyword) || '未命中相关记忆。';
  },
};
