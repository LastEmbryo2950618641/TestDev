/**
 * 前端轻量 RAG：加载 Fate 索引，做别名扩展 + 关键词重排。
 */
window.GameModules = window.GameModules || {};

window.GameModules.rag = {
  index: null,

  async load() {
    if (this.index) return this.index;
    if (window.GameData?.ragIndex) {
      this.index = window.GameData.ragIndex;
      return this.index;
    }
    throw new Error('RAG 索引未加载');
  },

  async search(query, options = {}) {
    const index = await this.load();
    const terms = this.expandTerms(query, index.aliases || {});
    const sourceHint = options.sourceHint || '';
    const allItems = index.items || [];
    const sourceItems = sourceHint ? allItems.filter((item) => this.sameSource(item.novel, sourceHint)) : [];
    if (options.strictSource && sourceHint && !sourceItems.length) return [];
    const items = options.strictSource && sourceItems.length ? sourceItems : allItems;
    const results = [];

    for (const item of items) {
      const text = `${item.novel} ${item.title} ${item.text}`;
      let score = 0;
      for (const term of terms) {
        if (!term) continue;
        const count = this.countMatches(text, term);
        score += count * (term.length >= 3 ? 8 : 2);
      }
      if (options.requiredTerms && !this.hasAny(text, options.requiredTerms)) continue;
      if (sourceHint && this.sameSource(item.novel, sourceHint)) score += 10;
      if (score > 0) results.push({ ...item, ragScore: score + (item.score || 0) * 0.15 });
    }

    results.sort((a, b) => b.ragScore - a.ragScore);
    const limited = results.slice(0, options.limit || 4);
    return options.contextRadius ? this.expandContext(limited, items, options.contextRadius) : limited;
  },

  expandContext(results, items, radius) {
    const output = [];
    const seen = new Set();
    for (const hit of results) {
      const chunk = Number(hit.chunk);
      if (!Number.isFinite(chunk)) { output.push(hit); continue; }
      const start = Math.max(0, chunk - radius);
      const end = chunk + radius;
      const key = `${hit.novel}|${hit.title}|${start}-${end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const parts = items.filter((x) => x.novel === hit.novel && x.title === hit.title && Number(x.chunk) >= start && Number(x.chunk) <= end)
        .sort((a, b) => Number(a.chunk) - Number(b.chunk));
      output.push({ ...hit, chunk: `${start}-${end}`, text: parts.map((x) => x.text).join('\n') || hit.text });
    }
    return output;
  },

  async expandKnownRefs(refs, options = {}) {
    const index = await this.load();
    const sourceHint = options.sourceHint || '';
    const items = (index.items || []).filter((item) => !sourceHint || this.sameSource(item.novel, sourceHint));
    return this.expandContext(refs.filter((ref) => items.some((item) => item.novel === ref.novel && item.title === ref.title && Number(item.chunk) === Number(ref.chunk))), items, options.contextRadius || 1);
  },

  sameSource(novel, sourceHint) {
    return String(novel || '').replace(/\s+/g, '').toLowerCase() === String(sourceHint || '').replace(/\s+/g, '').toLowerCase();
  },

  hasAny(text, terms) {
    return terms.some((term) => term && text.includes(term));
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
