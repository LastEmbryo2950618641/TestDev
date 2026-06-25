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

  source(store) {
    const hint = store?.character?.work || store?.selectedWork || '';
    const sources = window.GameData?.loreSources || [];
    return window.GameModules.rag.pickSource(sources, hint, hint) || sources[0] || null;
  },

  async dispatch(store, action, method, params = {}) {
    const source = this.source(store);
    if (!source) return '未配置作品设定库。';
    if (method === 'getReadme') return await this.file(source, 'README.md', 1200);
    if (method === 'getDefaultLoad') return await this.defaultLoad(source);
    return await this.search(source, method, this.keyword(store, action, params), params);
  },

  keyword(store, action, params = {}) {
    return [params.keyword, params.name, params.time, params.phase, store?.entryTimeLabel?.(), store?.character?.name, action].filter(Boolean).join(' ');
  },

  async defaultLoad(source) {
    const readme = await window.GameModules.rag.fetchText(`${source.base}/README.md`);
    const paths = window.GameModules.rag.extractPaths(readme).filter((path) => path.startsWith('00_常驻加载/')).slice(0, 6);
    const rows = [];
    for (const path of paths) rows.push(await this.file(source, path, 420));
    return rows.filter(Boolean).join('\n\n') || this.slice(readme, 2200);
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
    return scored.slice(0, 4).map((item, i) => `[作品资料${i + 1}] ${source.name}/${item.path}\n${this.excerpt(item.text, keyword, item.path)}`).join('\n\n') || '未命中作品设定资料。';
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

  excerpt(text = '', keyword = '', path = '') {
    const terms = window.GameModules.rag.expandTerms(`${keyword} ${path}`);
    const lines = String(text || '').replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
    const hits = lines.filter((line) => terms.some((term) => line.includes(term))).slice(0, 10);
    return this.slice((hits.length ? hits : lines.slice(0, 12)).join('\n'), 1800);
  },

  slice(text = '', max = 1600) { return String(text || '').trim().slice(0, max); },
};

Object.assign(window.GameModules.realWorldAgentContext || {}, {
  async worklore(store, action, method, params = {}) {
    return await window.GameModules.workLoreQuery.dispatch(store, action, method, params);
  },
});
