window.GameModules = window.GameModules || {};
window.GameModules.entryYear = window.GameModules.entryYear || {};

Object.assign(window.GameModules.entryYear, {
  async publicAudited(store, mode, queries, base = 0) {
    if (!window.fetch) return 0;
    try {
      const sources = await fetch('./public-year-sources.json').then((r) => r.json());
      for (const source of sources) {
        let evidence = '';
        for (const query of this.limitQueries(queries)) evidence += `\n# ${source.name} / ${query}\n${await this.fetchEvidence(source, query)}`;
        const value = await this.audit(store, mode, evidence.slice(0, 4200), 0, base);
        if (value) return value;
      }
    } catch (err) {
      console.warn('公共资料推断失败:', err.message);
    }
    return 0;
  },

  limitQueries(queries) {
    return [...new Set((Array.isArray(queries) ? queries : [queries]).filter(Boolean))].slice(0, 8);
  },

  async fetchEvidence(source, query) {
    try {
      const url = source.url.replace('{query}', encodeURIComponent(query));
      const data = await fetch(url).then((r) => (r.ok ? r.json() : null));
      if (source.kind === 'mediawikiSearch') return await this.mediawikiSearchText(source, data);
      return this.publicText(source.kind, data).slice(0, 2200);
    } catch (err) {
      console.warn('公共资料源跳过:', source.name, err.message);
      return '';
    }
  },

  async mediawikiSearchText(source, data) {
    const rows = (data?.query?.search || []).slice(0, 3);
    const text = rows.map((x) => `${x.title}\n${this.stripHtml(x.snippet)}`).join('\n');
    return `${text}\n${await this.extractTitles(source, rows.map((x) => x.title))}`.slice(0, 2600);
  },

  async extractTitles(source, titles) {
    if (!source.extractUrl) return '';
    let text = '';
    for (const title of titles.slice(0, 3)) {
      const url = source.extractUrl.replace('{title}', encodeURIComponent(title));
      const data = await fetch(url).then((r) => (r.ok ? r.json() : null));
      text += `\n${this.publicText('mediawikiExtract', data)}`;
    }
    return text;
  },

  publicText(kind, data) {
    if (kind === 'jikanAnime') {
      const item = data?.data?.[0] || {};
      return `${item.title || ''}\n${item.aired?.string || ''}\n${item.synopsis || ''}`;
    }
    if (kind === 'mediawikiExtract') return Object.values(data?.query?.pages || {}).map((x) => x.extract).join('\n');
    if (kind === 'wikidataSearch') return (data?.search || []).map((x) => `${x.label} ${x.description}`).join('\n');
    return JSON.stringify(data || '');
  },
});
