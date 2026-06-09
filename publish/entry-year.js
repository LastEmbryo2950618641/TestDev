/**
 * 通用年份推断：本地证据 AI 自审 → 公共资料 AI 自审 → 兜底。
 */
window.GameModules = window.GameModules || {};

window.GameModules.entryYear = {
  async baseYear(calendar, store) {
    const fallback = this.fallbackBaseYear(calendar, store);
    const local = await this.localEvidence(store, 'storyYear');
    const localYear = await this.audit(store, 'storyYear', local, fallback);
    if (localYear) return localYear;
    const publicYear = await this.publicAudited(store, 'storyYear', this.workQuery(store), fallback);
    return publicYear || fallback;
  },

  async targetYear(calendar, store, base) {
    const targetAge = Math.max(1, Math.min(9999, parseInt(store?.characterAge, 10) || 16));
    const currentAge = await this.currentAge(store, base);
    const year = currentAge ? base - (currentAge - targetAge) : base;
    return `${year}${calendar.units.year || '年'}`;
  },

  async currentAge(store, base) {
    const local = await this.localEvidence(store, 'characterAge');
    const localAge = await this.audit(store, 'characterAge', local, 0, base);
    if (localAge) return localAge;
    return await this.publicAudited(store, 'characterAge', this.characterQuery(store), base) || 0;
  },

  fallbackBaseYear(calendar, store) {
    const lore = window.GameModules.sqliteSave?.getWorldLore?.(store?.character?.work || '原创世界');
    const text = `${calendar.label || ''} ${store?.character?.work || ''} ${lore?.background || ''}`;
    const years = text.match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/g);
    if (years?.length) return Number(years[0]);
    if (/现代|公元|都市|学校|科技/.test(text)) return 2026;
    let hash = 0;
    for (const char of text) hash = (hash + char.charCodeAt(0)) % 900;
    return 1000 + hash;
  },

  async localEvidence(store, mode) {
    const character = store?.character || {};
    const lore = window.GameModules.sqliteSave?.getWorldLore?.(character.work || '原创世界');
    const refs = (store?.characterLoreRefs?.[character.id] || []).map((x) => x.text).join('\n');
    const base = `${character.name || ''} ${character.role || ''} ${character.detail || ''}\n${lore?.background || ''}\n${refs}`;
    try {
      const query = mode === 'storyYear' ? `${character.work} 故事 发生 年份 时间线` : `${character.name} 年龄 出生 岁 寿命`;
      const hits = await window.GameModules.rag?.search?.(query, { limit: 4, sourceHint: character.work, strictSource: true, contextRadius: 1 });
      return `${base}\n${(hits || []).map((x) => x.text).join('\n')}`.slice(0, 2600);
    } catch (err) {
      console.warn('本地年份证据检索失败:', err.message);
      return base.slice(0, 2600);
    }
  },

  async publicAudited(store, mode, query, base = 0) {
    if (!window.fetch) return 0;
    try {
      const sources = await fetch('./public-year-sources.json').then((r) => r.json());
      for (const source of sources) {
        const evidence = await this.fetchEvidence(source, query);
        const value = await this.audit(store, mode, evidence, 0, base);
        if (value) return value;
      }
    } catch (err) {
      console.warn('公共资料推断失败:', err.message);
    }
    return 0;
  },

  async fetchEvidence(source, query) {
    try {
      const url = source.url.replace('{query}', encodeURIComponent(query));
      const data = await fetch(url).then((r) => (r.ok ? r.json() : null));
      return this.publicText(source.kind, data).slice(0, 2200);
    } catch (err) {
      console.warn('公共资料源跳过:', source.name, err.message);
      return '';
    }
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

  async audit(store, mode, evidence, fallback, base = 0) {
    if (!evidence || !window.dzmm?.completions) return 0;
    let buffer = '';
    await window.dzmm.completions({ model: store.modelId, maxTokens: 360, messages: [{ role: 'user', content: this.auditPrompt(store, mode, evidence, base) }] }, (chunk) => {
      const text = String(chunk || '');
      buffer = text.startsWith(buffer) ? text : buffer + text;
    });
    return this.parseAudit(buffer, fallback);
  },

  auditPrompt(store, mode, evidence, base) {
    const character = store?.character || {};
    const target = mode === 'storyYear' ? `作品《${character.work}》当前剧情基准年份` : `${character.name}在${base}年这一剧情基准年时的年龄`;
    return `请只根据证据推断${target}。必须自审：只有证据直接说明，或可由证据中的明确年份/年龄做简单算术推出，pass 才能为 true；出版年份、动画播出年份、无关年份不能用。只返回JSON：{"pass":true|false,"value":数字,"reason":"引用证据"}。证据：${evidence}`;
  },

  parseAudit(text, fallback) {
    const raw = String(text || '');
    const json = this.parseAuditJson(raw);
    if (json) return this.auditValue(json, fallback);
    const pass = /pass\s*[:：=]\s*(true|是|通过)/i.test(raw) || /通过/.test(raw);
    const value = Number((raw.match(/value\s*[:：=]\s*(\d{1,4})/i) || raw.match(/(?:年份|年龄|value|结果)[^\d]{0,8}(\d{1,4})/) || [])[1]);
    if (pass && Number.isFinite(value) && value > 0) return Math.round(value);
    return 0;
  },

  parseAuditJson(raw) {
    try {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start === -1 || end === -1 || end <= start) return null;
      let body = raw.slice(start, end + 1)
        .replace(/[“”]/g, '"')
        .replace(/([{,]\s*)([a-zA-Z_][\w-]*|[\u4e00-\u9fa5]+)(\s*:)/g, '$1"$2"$3')
        .replace(/:\s*是([,}])/g, ':true$1')
        .replace(/:\s*否([,}])/g, ':false$1');
      return JSON.parse(body);
    } catch (_) {
      return null;
    }
  },

  auditValue(json, fallback) {
    const value = Number(json.value ?? json.值 ?? json.年份 ?? json.年龄);
    const pass = json.pass === true || json.pass === 'true' || json.pass === '是' || json.pass === '通过';
    return pass && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  },

  workQuery(store) {
    return store?.character?.work || 'anime story year';
  },

  characterQuery(store) {
    const c = store?.character || {};
    return `${c.name || ''} ${c.work || ''} age`;
  },
};
