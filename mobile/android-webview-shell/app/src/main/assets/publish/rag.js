/**
 * 前端资料查询：以 assets/作品名/AI设定库/README.md 为入口，按索引精确加载本地设定卡。
 */
window.GameModules = window.GameModules || {};

window.GameModules.rag = {
  sources: null, fileCache: {}, sourceCache: {},

  async load() {
    if (window.GameModules.cache.enabled('files') && this.sources) return this.sources;
    const sources = window.GameData?.loreSources || [];
    if (window.GameModules.cache.enabled('files')) this.sources = sources;
    if (!sources.length) throw new Error('资料入口未配置');
    return sources;
  },

  async search(query, options = {}) {
    const sources = await this.load();
    const source = this.pickSource(sources, query, options.sourceHint);
    if (!source) return [];
    const cfg = window.GameModules.config.rag || {};
    const terms = this.expandTerms(`${query} ${options.sourceHint || ''}`);
    const candidates = await this.candidateFiles(source, terms);
    const maxFiles = options.maxFiles || cfg.maxCandidateFiles || 8;
    const results = [];
    this.log('候选资料文件', source.name, candidates.slice(0, maxFiles));
    for (const path of candidates.slice(0, maxFiles)) {
      const text = await this.fetchText(`${source.base}/${path}`);
      const score = this.score(`${path}\n${text}`, terms) + (path === 'README.md' ? 2 : 0);
      if (score > 0 || path === 'README.md') results.push(this.result(source, path, text, score));
    }
    results.sort((a, b) => b.ragScore - a.ragScore);
    return results.slice(0, options.limit || cfg.defaultResultLimit || 3);
  },

  async expandKnownRefs(refs, options = {}) {
    if (!refs?.length) return [];
    return this.search(refs.map((ref) => `${ref.title || ''} ${ref.text || ''}`).join(' '), options);
  },

  pickSource(sources, query, sourceHint = '') {
    const text = this.normalize(`${sourceHint} ${query}`);
    return sources.find((source) => [source.name, ...(source.aliases || [])].some((name) => text.includes(this.normalize(name))))
      || (sourceHint ? null : sources[0]);
  },

  async candidateFiles(source, terms) {
    const cfg = window.GameModules.config.rag || {};
    const readme = await this.fetchText(`${source.base}/README.md`);
    const files = ['README.md', ...this.extractPaths(readme)];
    const indexes = files.filter((p) => /索引\.md$/.test(p))
      .sort((a, b) => this.score(b, terms) - this.score(a, terms))
      .slice(0, cfg.maxIndexFiles || 3);
    this.log('读取资料索引', source.name, indexes);
    for (const indexPath of indexes) {
      const text = await this.fetchText(`${source.base}/${indexPath}`);
      files.push(...this.extractPaths(text, indexPath));
    }
    return this.unique(files).sort((a, b) => this.score(b, terms) - this.score(a, terms));
  },

  extractPaths(text, from = '') {
    const paths = [];
    const re = /`([^`]+\.md)`|(?:^|[\s|：:])([^\s|`]+\.md)/gm;
    let match;
    while ((match = re.exec(String(text || '')))) {
      const raw = (match[1] || match[2] || '').trim();
      const path = this.resolvePath(raw, from);
      if (path && !path.includes('..')) paths.push(path);
    }
    return paths;
  },

  resolvePath(raw, from) {
    let path = raw.replace(/^AI设定库\//, '').replace(/^\.\//, '');
    if (!path.endsWith('.md')) return '';
    if (path.startsWith('../')) return '';
    if (!path.includes('/') && from.includes('/')) path = `${from.split('/').slice(0, -1).join('/')}/${path}`;
    const stack = [];
    for (const part of path.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') stack.pop(); else stack.push(part);
    }
    return stack.join('/');
  },

  async fetchText(url) {
    const useCache = window.GameModules.cache.enabled('files');
    if (useCache && this.fileCache[url] !== undefined) return this.fileCache[url];
    const cached = await this.fetchCachedText(url);
    if (cached !== null) {
      if (useCache) this.fileCache[url] = cached;
      return cached;
    }
    let text = '';
    for (const candidate of this.urlCandidates(url)) {
      try {
        this.log('读取资料文件', candidate);
        const res = await fetch(encodeURI(candidate));
        if (res.ok) {
          text = await res.text();
          break;
        }
        console.warn('资料文件读取失败:', candidate, res.status);
      } catch (err) {
        console.warn('资料文件读取失败:', candidate, err.message);
      }
    }
    if (useCache) this.fileCache[url] = text;
    return text;
  },

  roots(type) {
    const cfg = window.GameModules.config || {};
    const env = cfg.assetEnv || 'dev';
    const roots = cfg.assetRoots?.[env]?.[type] || cfg.assetRoots?.dev?.[type] || [''];
    return Array.isArray(roots) && roots.length ? roots : [''];
  },

  joinRoot(root, value) {
    if (!root) return value;
    return `${String(root).replace(/\/$/, '')}/${String(value).replace(/^\.\//, '').replace(/^\//, '')}`;
  },

  urlCandidates(url) {
    const values = [url];
    const rel = url.replace(/^\.\.\//, '').replace(/^\//, '');
    if (rel.startsWith('assets/')) {
      const withoutAssets = rel.replace(/^assets\//, '');
      for (const root of this.roots('sourceRoots')) {
        values.push(this.joinRoot(root, withoutAssets));
      }
      values.push(rel);
    }
    if (url.startsWith('../assets/')) {
      values.push(url.replace(/^\.\.\//, ''));
      values.push(url.replace(/^\.\./, ''));
    }
    return this.unique(values);
  },

  result(source, path, text, score) {
    return { novel: source.name, title: path, path, chunk: 'file', text: this.paragraphExcerpt(text), ragScore: score };
  },

  paragraphExcerpt(text, fallback = '') {
    const lines = this.cleanLines(text);
    const picked = lines.slice(0, 8).join('\n');
    return picked || this.sentenceExcerpt(text) || this.cleanLines(fallback).slice(0, 8).join('\n') || this.sentenceExcerpt(fallback);
  },

  cleanLines(text) {
    return String(text || '').replace(/\r/g, '').split('\n')
      .map((x) => x.trim()).filter((x) => x.length >= 8 && this.isCleanStart(x) && this.isCleanEnd(x));
  },

  sentenceExcerpt(text) {
    const sentences = String(text || '').replace(/\s+/g, ' ').match(/[^。！？]+[。！？]/g) || [];
    return sentences.map((x) => x.trim()).filter((x) => x.length >= 8 && this.isCleanStart(x) && this.isCleanEnd(x)).slice(0, 6).join('\n');
  },

  isCleanStart(text) { return !/^[，。！？、；：」”）\]】]|^(的|了|的话|但是|而且|因为|所以|这种|那人|她|他|我|不|总之|因此)[^。！？]{0,18}[，。]/.test(text); },
  isCleanEnd(text) { return /[。！？」”）\]】]$/.test(text) && !/[，、：；]$/.test(text); },
  sameSource(novel, sourceHint) { return this.normalize(novel) === this.normalize(sourceHint); },
  hasAny(text, terms) { return terms.some((term) => term && text.includes(term)); },

  expandTerms(query) {
    return this.unique(String(query || '').split(/[\s,，。！？、：:；;《》「」『』（）()\[\]]+/).filter((x) => x.length >= 2)).slice(0, 18);
  },

  score(text, terms) {
    const raw = String(text || '');
    return terms.reduce((sum, term) => sum + this.countMatches(raw, term) * (term.length >= 3 ? 8 : 2), 0);
  },

  countMatches(text, term) {
    let count = 0, pos = String(text).indexOf(term);
    while (pos !== -1 && count < 8) { count += 1; pos = text.indexOf(term, pos + term.length); }
    return count;
  },

  formatContext(results) {
    if (!results?.length) return '未检索到可用原作资料。';
    return results.map((item, index) => `[资料${index + 1}] 来源=${item.novel}/${item.title}\n${item.text}`).join('\n\n');
  },

  normalize(text) { return String(text || '').replace(/[\s·・／/【】\[\]（）()「」『』:：-]+/g, '').toLowerCase(); },
  unique(list) { return [...new Set(list.filter(Boolean))]; },

  log(message, ...args) {
    if (window.GameModules.config.rag?.logFiles) console.log(`[资料读取] ${message}:`, ...args);
  },
};
