/**
 * 前端资料查询：以 assets/作品名/AI设定库/README.md 为入口，按索引精确加载本地设定卡。
 */
window.GameModules = window.GameModules || {};

window.GameModules.rag = {
  sources: null, fileCache: {},

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
    const terms = this.expandTerms(`${query} ${options.sourceHint || ''}`);
    const candidates = await this.candidateFiles(source, terms);
    const results = [];
    for (const path of candidates.slice(0, 18)) {
      const text = await this.fetchText(`${source.base}/${path}`);
      const score = this.score(`${path}\n${text}`, terms) + (path === 'README.md' ? 2 : 0);
      if (score > 0 || path === 'README.md') results.push(this.result(source, path, text, score));
    }
    results.sort((a, b) => b.ragScore - a.ragScore);
    return results.slice(0, options.limit || 4);
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
    const readme = await this.fetchText(`${source.base}/README.md`);
    const files = ['README.md', ...this.extractPaths(readme)];
    for (const indexPath of files.filter((p) => /索引\.md$/.test(p)).slice(0, 10)) {
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
    let text = '';
    try {
      const res = await fetch(encodeURI(url));
      text = res.ok ? await res.text() : '';
    } catch (err) {
      console.warn('资料文件读取失败:', url, err.message);
    }
    if (useCache) this.fileCache[url] = text;
    return text;
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
};
