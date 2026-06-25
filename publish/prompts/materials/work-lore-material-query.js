window.GameModules = window.GameModules || {};

window.GameModules.workLoreQuery = {
  indexPaths: {
    searchPeople: ['01_按需加载_人物/人物索引.md'],
    searchPlot: ['02_按需加载_剧情/剧情索引.md'],
    searchAbility: ['03_按需加载_能力技能资源/能力技能资源索引.md'],
    searchRelationship: ['04_按需加载_关系/关系索引.md'],
    searchProfession: ['05_按需加载_职业身份/职业身份索引.md'],
    searchLocation: ['06_按需加载_地点/地点索引.md'],
    searchItem: ['07_按需加载_物品/物品索引.md'],
    searchTimeline: ['90_检索索引/时间线索引.md'],
  },

  worldHint(store, params = {}) {
    return String(params.world || params.worldTag || store?.character?.work || store?.selectedWork || '').trim();
  },

  source(store, params = {}) {
    const hint = this.worldHint(store, params);
    const sources = window.GameData?.loreSources || [];
    return window.GameModules.rag.pickSource(sources, hint, hint) || sources[0] || null;
  },

  async dispatch(store, action, method, params = {}) {
    const source = this.source(store, params);
    if (!source) return '未配置作品设定库。';
    if (method === 'getReadme') return params.auto ? await this.readmeStructure(source, params.maxChars || 700) : await this.file(source, 'README.md', params.maxChars || 1200);
    if (method === 'getDefaultLoad') return await this.defaultLoad(source);
    return await this.search(source, method, this.keyword(store, action, method, params), params);
  },

  keyword(store, action, method = '', params = {}) {
    const c = store?.character || {};
    const base = [params.world, params.worldTag, params.keyword, params.name, params.time, params.phase, store?.entryTimeLabel?.(), c.name, c.work || store?.selectedWork, action];
    if (method === 'searchPeople') base.push(c.role, c.detail);
    if (method === 'searchRelationship') base.push(c.name, params.target, params.characterName);
    if (method === 'searchAbility') base.push(c.role, ...(Array.isArray(c.skills) ? c.skills.map((s) => `${s.name || ''} ${s.desc || s.description || ''}`) : []));
    if (method === 'searchProfession') base.push(c.role, '职业 职阶 身份 职位 阶层 组织');
    if (method === 'searchLocation') base.push(store?.sceneTitle, store?.quest);
    if (method === 'searchTimeline') base.push(store?.sceneTitle, store?.quest, '时间 阶段');
    return base.filter(Boolean).join(' ');
  },

  async defaultLoad(source) {
    const readme = await window.GameModules.rag.fetchText(`${source.base}/README.md`);
    const paths = window.GameModules.rag.extractPaths(readme).filter((path) => path.startsWith('00_常驻加载/')).slice(0, 6);
    const rows = [];
    for (const path of paths) rows.push(await this.file(source, path, 420));
    return rows.filter(Boolean).join('\n\n') || this.slice(readme, 2200);
  },

  async readmeStructure(source, max = 700) {
    const readme = await window.GameModules.rag.fetchText(`${source.base}/README.md`);
    const lines = String(readme || '').replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
    const picked = lines.filter((line) => /^#{1,4}\s|README|目录|索引|常驻|按需|时间线|人物|剧情|能力|关系|职业|地点|物品|\.md/.test(line)).slice(0, 24);
    const paths = window.GameModules.rag.extractPaths(readme).slice(0, 16);
    const body = [`[自动资料｜README结构｜来源:${source.name}/README.md]`, picked.join('\n'), paths.length ? `资料路径：${paths.join('、')}` : ''].filter(Boolean).join('\n');
    return this.slice(body || `[自动资料｜README结构｜来源:${source.name}/README.md]\n${readme}`, max);
  },

  async search(source, method, keyword = '', params = {}) {
    const indexes = this.indexPaths[method] || [];
    const terms = window.GameModules.rag.expandTerms(keyword);
    const files = ['README.md'];
    for (const indexPath of indexes) {
      const indexText = await window.GameModules.rag.fetchText(`${source.base}/${indexPath}`);
      files.push(indexPath, ...this.pickPaths(indexText, indexPath, terms, params.limit || 5));
    }
    if (!indexes.length) {
      const results = await window.GameModules.rag.search(keyword, { sourceHint: source.name, strictSource: true, limit: 4, maxFiles: 8 });
      return window.GameModules.rag.formatContext(results);
    }
    const scored = [];
    for (const path of window.GameModules.rag.unique(files).slice(0, 10)) {
      const text = await window.GameModules.rag.fetchText(`${source.base}/${path}`);
      const score = window.GameModules.rag.score(`${path}\n${text}`, terms) + (path.endsWith('索引.md') ? 4 : 0);
      if (score > 0 || path.endsWith('索引.md')) scored.push({ path, text, score });
    }
    scored.sort((a, b) => b.score - a.score);
    const picked = scored.slice(0, 4);
    const perItemMax = Math.max(360, Math.floor((Number(params.maxChars) || 1800) / Math.max(1, picked.length)));
    return picked.map((item, i) => `[作品资料${i + 1}｜${this.hitLevel(item.score)}命中] ${source.name}/${item.path}\n命中依据：${this.hitTerms(item.text, terms).join('、') || '索引/结构匹配'}\n${this.excerpt(item.text, keyword, item.path, perItemMax)}`).join('\n\n') || '未命中作品设定资料。';
  },

  hitLevel(score = 0) {
    if (score >= 12) return '高';
    if (score >= 6) return '中';
    return '低';
  },

  hitTerms(text = '', terms = []) {
    return terms.filter((term) => term && String(text || '').includes(term)).slice(0, 8);
  },

  pickPaths(text = '', from = '', terms = [], limit = 5) {
    const rows = String(text || '').split('\n').map((line) => ({ line, score: window.GameModules.rag.score(line, terms) })).filter((row) => row.score > 0).sort((a, b) => b.score - a.score);
    const selected = rows.flatMap((row) => window.GameModules.rag.extractPaths(row.line, from));
    return window.GameModules.rag.unique(selected).slice(0, limit);
  },

  async file(source, path, max = 1200) {
    const text = await window.GameModules.rag.fetchText(`${source.base}/${path}`);
    return text ? `[作品资料] ${source.name}/${path}\n${this.slice(text, max)}` : '';
  },

  excerpt(text = '', keyword = '', path = '', max = 1800) {
    const terms = window.GameModules.rag.expandTerms(`${keyword} ${path}`);
    const lines = String(text || '').replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
    const head = lines.slice(0, 5);
    const hits = lines.filter((line) => terms.some((term) => line.includes(term))).slice(0, 10);
    return this.slice(window.GameModules.rag.unique([...head, ...hits]).join('\n'), max || 1800);
  },

  slice(text = '', max = 1600) { return String(text || '').trim().slice(0, max); },
};

Object.assign(window.GameModules.realWorldAgentContext || {}, {
  async worklore(store, action, method, params = {}) {
    return await window.GameModules.workLoreQuery.dispatch(store, action, method, params);
  },
});
