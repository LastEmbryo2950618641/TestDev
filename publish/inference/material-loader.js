window.GameModules = window.GameModules || {};
window.GameModules.realWorldAgentContextParts = window.GameModules.realWorldAgentContextParts || {};

window.GameModules.realWorldAgentContextParts.materialLoader = {
  async autoLoadForStep(store, action = '', loadedKeys = new Set(), materialSession = null, materials = window.GameModules.realWorldMaterials, memoryIds = new Set(), step = 1, loaded = [], current = []) {
    if (step !== 1) return [];
    const ctx = window.GameModules.realWorldAgentContext || window.GameModules.realWorldAgentContextParts?.core || {};
    const out = [];

    // Default: all faction names/IDs + internal structure for Stage1 context.
    store?.initFactionSystem?.();
    const factionReq = { skill: 'faction.query', method: 'listFactions', params: { world: window.GameModules.realWorld2026?.label || '2026 现代都市现实世界', auto: true } };
    const factionKey = this.materialRequestKey(factionReq.skill, factionReq.method, factionReq.params, materials);
    if (!loadedKeys.has(factionKey)) {
      loadedKeys.add(factionKey);
      const factionText = ctx.factionList?.(store) || ctx.faction?.(store, 'listFactions', {}) || '暂无势力。';
      materials?.record?.(materialSession, factionReq, '自动资料：全部势力名/ID与组织架构', factionText);
      out.push({ title: '自动资料：全部势力名/ID与组织架构', text: factionText, max: 3200 });
    }

    const actionText = String(action || '');
    const lastGuidance = ctx.lastRoundStage1GuidanceFromStore?.(store) || null;
    const priorParticipantNames = ['forcedParticipants', 'priorityCandidates'].flatMap((key) => (Array.isArray(lastGuidance?.[key]) ? lastGuidance[key] : []))
      .map((item) => (typeof item === 'string' ? item : (item?.name || item?.idOrName || item?.characterName || '')).trim())
      .filter(Boolean);
    const states = [...Object.values(store?.rpgStates || {}), ...(window.GameModules.characterStateStore?.list?.() || [])];
    const playerState = store?.playerIdentityState?.() || store?.rpgStates?.['player-self'] || null;
    const seen = new Set();
    const worldOk = (state) => window.GameModules.characterQuery?.worldMatches?.(window.GameModules.realWorld2026?.label || '2026 现代都市现实世界', state.worldTag || state.profile?.work);
    const nameHit = (name) => actionText.includes(name) || priorParticipantNames.includes(name);
    const candidates = playerState ? [playerState, ...states] : states;
    const hits = candidates.filter((state) => {
      const name = String(state?.profile?.name || state?.name || '').trim();
      const id = String(state?.id || '').trim();
      const key = id || name;
      const isPlayer = id === 'player-self';
      if (!name || seen.has(key) || (!isPlayer && !nameHit(name)) || !worldOk(state)) return false;
      seen.add(key);
      return true;
    }).slice(0, 3);
    for (const state of hits) {
      const name = state.profile?.name || state.name;
      const req = { skill: 'character.query', method: 'searchCharacterProfile', params: { name, world: window.GameModules.realWorld2026?.label || '2026 现代都市现实世界', auto: true } };
      const key = this.materialRequestKey(req.skill, req.method, req.params, materials);
      if (loadedKeys.has(key)) continue;
      loadedKeys.add(key);
      const text = window.GameModules.characterQuery?.stateText?.(state, req.params.world, 0) || '';
      if (!text) continue;
      materials?.record?.(materialSession, req, `自动资料：${name}角色卡`, text);
      out.push({ title: `自动资料：${name}角色卡`, text, max: 0, unlimited: true, participants: [{ type: 'character', id: state.id || name, name, role: 'loaded-role-card' }] });
    }
    return out;
  },


  async skillText() {
    const ids = ['emotion.feeling.wearing.assess', 'memory.query', 'character.query', 'past.event.query', 'company.query', 'faction.query', 'realworld.location.query', 'realworld.history.query', 'lexicon.query', 'item.query', 'wechat.query', 'wechat.message.incoming', 'realworld.vitals.adjust'];
    const texts = await Promise.all(ids.map((id) => window.GameModules.skillLoader?.instruction?.(id) || ''));
    const crossWorld = ['# 跨世界资料查询', '每个 request.params 可写 world/worldTag 指定资料所属世界；默认现实世界。需要作品/异世界资料时写作品名，并用 worklore.query 查询。', window.GameModules.workLoreMaterials?.skillText?.() || ''].filter(Boolean).join('\n');
    return [crossWorld, ...texts.filter(Boolean)].join('\n\n');
  },


  stage1BlockedMaterialText(skill = '', method = '', policy = 'deny', step = 1) {
    const pair = `${skill}.${method}`;
    if (policy === 'deny') {
      return [
        `资料请求未执行：${pair} 属于 Stage1 禁止的写库/结算/侧效应 skill。`,
        '势力字段补丁请走正文后 Stage9（patchFactionField）；势力首建请走正文后 Stage9-1，不要在 Stage1 请求 createFaction。其它变更走 Stage4 结算。',
      ].join('\n');
    }
    if (policy === 'deep') {
      return [
        `资料请求未执行：${pair} 属于 Stage1 深读 skill，仅 step≥3 且 brief/Index 不足时可用（当前 step=${step}）。`,
        '请优先使用控势摘要 resolveTerritoryBrief 或势力列表/档案搜索等浅读 skill。',
      ].join('\n');
    }
    return `资料请求未执行：${pair} 不符合当前 Step${step} 资料策略。`;
  },


  async loadRequests(store, action, requests = [], loadedKeys = new Set(), materialSession = null, materials = window.GameModules.realWorldMaterials, memoryIds = new Set(), loaded = [], current = [], options = {}) {
    const step = Number(options?.step || 1);
    const out = [];
    for (const req of requests.slice(0, options.limit || 3)) {
      const skill = String(req?.skill || '').trim();
      const method = String(req?.method || '').trim();
      const params = req?.params && typeof req.params === 'object' ? req.params : {};
      if (!skill || !method) continue;
      if (window.GameModules.realWorldAgentLoop?.shouldSkipMaterialDueToWechatContext?.(store, { skill, method, params }, options.mode || 'real')) {
        const title = `skipped:${skill}.${method}`;
        const text = '已跳过：对应微信原文已在持久推演对话链中，无需再查记忆/世界线/微信会话。';
        materials?.record?.(materialSession, { skill, method, params, skipped: 'wechat-context' }, title, text);
        out.push({ title, text, max: 220 });
        continue;
      }
      if (materials?.isStage1Eligible && !materials.isStage1Eligible({ skill, method }, step)) {
        const policy = materials.stage1PolicyFor?.({ skill, method }) || 'deny';
        materials.recordStage1Block?.(materialSession, store, { skill, method, params }, policy, step);
        out.push({
          title: `blocked:${skill}.${method}`,
          text: this.stage1BlockedMaterialText(skill, method, policy, step),
          max: 260,
        });
        continue;
      }
      const key = this.materialRequestKey(skill, method, params, materials);
      if (loadedKeys.has(key)) continue;
      loadedKeys.add(key);
      const material = materials?.optionFor?.({ skill, method, params });
      const configuredMax = material && Object.prototype.hasOwnProperty.call(material, 'maxChars')
        ? Number(material.maxChars)
        : this.maxFor(skill);
      const max = Number.isFinite(configuredMax) ? configuredMax : this.maxFor(skill);
      const unlimitedRoleCard = skill === 'character.query' && method === 'searchCharacterProfile' && !(max > 0);
      const text = await this.dispatch(store, action, skill, method, { ...params, maxChars: unlimitedRoleCard ? 0 : max }, options);
      if (text) {
        const title = `${skill}.${method}`;
        const ref = this.materialReferenceFor(text, this.materialReferenceCandidates(store, loaded, [...current, ...out]));
        const finalText = ref ? this.materialReferenceText(ref) : text;
        materials?.record?.(materialSession, { skill, method, params }, title, finalText);
        out.push({
          title,
          text: finalText,
          max: ref ? 260 : (unlimitedRoleCard ? 0 : max),
          unlimited: !ref && unlimitedRoleCard,
          referenceId: ref?.id,
        });
      }
    }
    return out;
  },


  maxFor(skill) {
    if (skill === 'past.event.query') return 5200;
    if (skill === 'character.query') return 0;
    if (skill === 'realworld.location.query') return 1500;
    if (String(skill || '').startsWith('realworld.property.')) return 1800;
    if (skill === 'memory.query') return 1600;
    if (skill === 'realworld.history.query') return 1800;
    if (skill === 'news.query') return 1800;
    if (skill === 'company.query') return 1400;
    if (skill === 'faction.query') return 1600;
    if (skill === 'worklore.query') return 1800;
    if (skill === 'lexicon.query') return 1200;
    return 1000;
  },


  unsupportedMaterialText(skill = '', method = '') {
    const allowed = ['company.query', 'faction.query', 'realworld.location.query', 'realworld.history.query', 'news.query', 'memory.query', 'character.query', 'past.event.query', 'lexicon.query', 'item.query', 'wechat.query', 'worklore.query'];
    return [
      `资料请求未执行：${skill || '未知 skill'}.${method || '未知 method'} 不是当前资料阶段可用 skill。`,
      `可用 skill：${allowed.join('、')}。`,
      '请基于已载入资料判断是否足够；只有缺口会直接改变本次行动结果时，才改用当前资料清单中的可用 skill 重新请求。',
    ].join('\n');
  },


  async dispatch(store, action, skill, method, params, options = {}) {
    const realContext = window.GameModules.realWorldAgentContext;
    if (skill === 'company.query') {
      if (typeof realContext?.company === 'function') return realContext.company(store, method, params);
      return this.company(store, method, params);
    }
    if (skill === 'faction.query') {
      if (typeof realContext?.faction === 'function') return realContext.faction(store, method, params);
      return '势力查询模块未加载。';
    }
    if (skill === 'realworld.location.query') {
      const locationOptions = { phase: 'stage1', guidedStep: options.step || 1, label: options.label || '现实', queryOnly: true, noAudit: true, returnJsonOnMiss: true };
      if (typeof realContext?.location === 'function') return await realContext.location(store, method, params, action, locationOptions);
      return this.location(store, method, params, action, locationOptions);
    }
    if (String(skill || '').startsWith('realworld.property.')) return this.property(store, skill, method, params);
    if (skill === 'realworld.history.query') {
      if (typeof realContext?.history === 'function') return realContext.history(store, method, params);
      return '现实历史查询模块未加载。';
    }
    if (skill === 'news.query') return this.news(store, method, params, action);
    if (skill === 'memory.query') return await this.memory(store, action, method, params);
    if (skill === 'character.query') return window.GameModules.characterQuery?.query?.(store, method, params) || '';
    if (skill === 'past.event.query') return window.GameModules.pastEventQuery?.query?.(store, method, { question: action, ...params }) || '';
    if (skill === 'lexicon.query') {
      if (typeof realContext?.lexicon === 'function') return await realContext.lexicon(store, method, params);
      return '词条查询模块未加载。';
    }
    if (skill === 'item.query') {
      if (typeof realContext?.itemQuery === 'function') return await realContext.itemQuery(store, method, params);
      return '物品查询模块未加载。';
    }
    if (skill === 'wechat.query') return window.GameModules.realWorldAgentWechat?.wechat?.(store, method, params) || '';
    if (skill === 'worklore.query') return await window.GameModules.workLoreQuery?.dispatch?.(store, action, method, params) || '';
    return this.unsupportedMaterialText(skill, method);
  },


  news(store, method, params = {}, action = '') {
    if (method !== 'getLatestHotlist') return `新闻查询不支持的方法：${method || '未知'}`;
    store?.initNewsDriver?.();
    const text = store?.newsNarrationPromptContext?.(action)
      || window.GameModules.newsDriverSystem?.formatPromptContext?.(store?.newsDriverState || {}, { action, limit: 18 })
      || '';
    return text || '暂无新闻热榜资料。';
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
    return [`单位：${company.name || '未生成单位资料'}`, `绑定势力：${company.sourceFactionName || company.name || '无'}｜ID：${company.sourceFactionId || company.factionId || '无'}`, `类型/行业：${company.type || '未知'}｜${company.industry || '未知'}`, `地点：${company.location || '未知'}`, `规模：${company.scale || '未知'}`, `制度：${work.type || '未设定'}｜${work.workDays || ''}｜${work.startTime || ''}-${work.endTime || ''}`, `薪资：${salary.monthlyBase || 0}${salary.currency || 'CNY'}｜绩效${salary.performanceMonths || 0}个月`, `组织：\n${org || '暂无组织架构。'}`, `规则：${(company.rules || []).join('；') || '暂无规则。'}`].join('\n');
  },


  workContext(store, company = {}) {
    const stats = typeof store.normalizeCompanyWorkStats === 'function' ? store.normalizeCompanyWorkStats() : (store.companyState?.workStats || {});
    const pay = store.monthlyPayPreview?.() || {};
    const attendance = stats.attendanceStatus || {};
    const leader = stats.leaderReview || {};
    const employee = stats.employeeReview || {};
    const contributions = (Array.isArray(stats.contributionItems) ? stats.contributionItems : []).slice(0, 6).map((item, index) => `${index + 1}. ${(item.title || item.type || '贡献')}｜${item.valueText || item.detail || '未填写'}`).join('；') || '暂无贡献价值记录';
    return [
      this.companySummary(store, company),
      `本月状态：迟到${stats.lateCount || 0}次｜旷班${stats.absentCount || 0}次｜绩效${stats.performance ?? 100}/100`,
      `当前上班状态：${attendance.status || '未更新'}｜${attendance.detail || '无'}`,
      `下一次评绩效日期：${stats.nextPerformanceReviewAt || '未设置'}`,
      `领导评价：${leader.summary || '暂无'}｜评分${leader.score ?? 0}`,
      `员工评价：${employee.summary || '暂无'}`,
      `贡献价值：${contributions}`,
      `收入预估：底薪${pay.base || 0}｜日薪${pay.daily || 0}｜本月完整上班${pay.workDays || 0}天`,
    ].join('\n');
  },


  location(store, method, params = {}) {
    const map = window.GameModules.realWorldMap.ensure(store, window.GameModules.currentLocationField?.roleProfile?.(store) || {});
    const keyword = String(params.keyword || params.locationName || params.name || '').trim();
    if (method === 'getCurrentLocationContext') return this.locationDetail(map, map.current || store.realWorldLocationName);
    if (method === 'getNearbyLocations') return this.nearby(map, keyword || map.current);
    if (method === 'listTopLocations') return this.topLocations(map);
    if (method === 'searchLocation') return this.searchLocation(map, keyword);
    return this.locationDetail(map, keyword || map.current);
  },


  property(store, skill = '', method = '', params = {}) {
    const suffix = String(skill || '').replace(/^realworld\.property\./, '');
    const actualMethod = method && method !== skill ? method : suffix;
    const normalizedMethod = suffix === 'node.ensure' || actualMethod === 'node.ensure' || actualMethod === 'nodeEnsure'
      ? 'nodeEnsureAsync'
      : actualMethod;
    return window.GameModules.realWorldLocationGraphSkills?.query?.(store, normalizedMethod, params) || '现实地点图查询模块未加载。';
  },


  locationDetail(map, name = '') {
    const node = (map.nodes || []).find((item) => item.name === name || item.id === name) || (map.nodes || [])[0];
    if (!node) return '暂无地点资料。';
    const parent = (map.nodes || []).find((item) => item.id === node.parentId)?.name || '无';
    const children = (map.nodes || []).filter((item) => item.parentId === node.id).map((item) => item.name).join('、') || '无';
    const infoFacts = window.GameModules.realWorldMapFacts?.normalizeFacts?.(node, node.description, '') || [];
    const facts = infoFacts.map((fact, index) => window.GameModules.ui.realWorld.mapInfoViewHelpers.factText.call(this, fact, index)).filter(Boolean).join('') || node.description || '暂无说明。';
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
