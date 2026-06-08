/**
 * 前端轻量 RAG：加载 Fate 索引，做别名扩展 + 关键词重排。
 */
window.GameModules = window.GameModules || {};

window.GameModules.rag = {
  index: null,

  async load() {
    if (this.index) return this.index;
    const response = await fetch('./rag-index.json');
    if (!response.ok) throw new Error('RAG 索引加载失败');
    this.index = await response.json();
    return this.index;
  },

  async search(query, options = {}) {
    const index = await this.load();
    const terms = this.expandTerms(query, index.aliases || {});
    const sourceHint = options.sourceHint || '';
    const results = [];

    for (const item of index.items || []) {
      const text = `${item.novel} ${item.title} ${item.text}`;
      let score = 0;
      for (const term of terms) {
        if (!term) continue;
        const count = this.countMatches(text, term);
        score += count * (term.length >= 3 ? 8 : 2);
      }
      if (sourceHint && item.novel.includes(sourceHint)) score += 10;
      if (score > 0) results.push({ ...item, ragScore: score + (item.score || 0) * 0.15 });
    }

    results.sort((a, b) => b.ragScore - a.ragScore);
    return results.slice(0, options.limit || 4);
  },

  expandTerms(query, aliases) {
    const base = String(query || '').split(/[\s,，。！？、：:；;]+/).filter(Boolean);
    const terms = new Set(base);
    for (const [name, list] of Object.entries(aliases)) {
      if (query.includes(name) || list.some((alias) => query.includes(alias))) {
        terms.add(name);
        list.forEach((alias) => terms.add(alias));
      }
    }
    return [...terms].slice(0, 18);
  },

  countMatches(text, term) {
    let count = 0;
    let pos = String(text).indexOf(term);
    while (pos !== -1 && count < 8) {
      count += 1;
      pos = text.indexOf(term, pos + term.length);
    }
    return count;
  },

  formatContext(results) {
    if (!results?.length) return '未检索到可用原作资料。';
    return results.map((item, index) => (
      `[资料${index + 1}] 来源=${item.novel}/${item.title} chunk=${item.chunk}\n${item.text}`
    )).join('\n\n');
  },
};
