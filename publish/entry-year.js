/**
 * 通用年份推断：本地证据 AI 自审 → 公共资料 AI 自审 → 兜底。
 */
window.GameModules = window.GameModules || {};

window.GameModules.entryYear = {
  async baseYear(calendar, store) {
    const fallback = this.fallbackBaseYear(calendar, store);
    const timelineYear = this.timelineYear(store);
    if (timelineYear) return timelineYear;
    const local = await this.localEvidence(store, 'storyYear');
    const localYear = await this.audit(store, 'storyYear', local, fallback);
    if (localYear) return localYear;
    const publicYear = await this.publicAudited(store, 'storyYear', this.queriesFor(store, 'storyYear'), fallback);
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
    return await this.publicAudited(store, 'characterAge', this.queriesFor(store, 'characterAge'), base) || 0;
  },

  fallbackBaseYear(calendar, store) {
    const lore = window.GameModules.sqliteSave?.getWorldLore?.(store?.character?.work || '原创世界');
    const text = `${calendar.label || ''} ${store?.character?.work || ''} ${lore?.background || ''}`;
    const years = text.match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/g);
    if (years?.length) return Number(years[0]);
    if (/现代|公元|都市|学校|科技/.test(text) && this.isOriginalWorld(store)) return 2026;
    let hash = 0;
    for (const char of text) hash = (hash + char.charCodeAt(0)) % 900;
    return 1000 + hash;
  },

  isOriginalWorld(store) {
    const work = String(store?.character?.work || '');
    return !work || /原创|自定义|异界|原创世界/.test(work);
  },

  timelineYear(store) {
    const rows = window.GameData?.timelines?.[store?.character?.work || ''] || [];
    const years = rows.map((x) => Number((String(x.time || '').match(/(\d{3,4})年/) || [])[1])).filter((x) => x >= 1000);
    return years.length ? years[Math.min(1, years.length - 1)] : 0;
  },

  async localEvidence(store, mode) {
    const character = store?.character || {};
    const lore = window.GameModules.sqliteSave?.getWorldLore?.(character.work || '原创世界');
    const profile = store?.characterProfiles?.[character.id] || null;
    const basics = (profile?.basics || []).map((x) => `${x.label}:${x.value}`).join('\n');
    const base = `${character.name || ''} ${(character.aliases || []).join(' ')} ${character.role || ''} ${character.detail || ''}\n${lore?.background || ''}\n${profile?.summary || ''}\n${basics}`;
    try {
      const query = mode === 'storyYear' ? `${character.work} 故事 发生 年份 时间线` : `${character.name} ${(character.aliases || []).join(' ')} 年龄 出生 岁 寿命`;
      const hits = await window.GameModules.rag?.search?.(query, { limit: 4, sourceHint: character.work, strictSource: true, contextRadius: 1 });
      return `${base}\n${(hits || []).map((x) => x.text).join('\n')}`.slice(0, 2600);
    } catch (err) {
      console.warn('本地年份证据检索失败:', err.message);
      return base.slice(0, 2600);
    }
  },

  queriesFor(store, mode) {
    const c = store?.character || {};
    const works = this.termVariants([c.work || 'anime']);
    const names = this.termVariants([c.name, ...(c.aliases || [])]);
    if (mode === 'storyYear') return works.flatMap((w) => [`${w} 故事年份 时间线`, `${w} 背景年份`, `${w} setting story year`, `${w} timeline`]);
    const pairs = works.flatMap((w) => names.map((n) => `${n} ${w}`)).slice(0, 8);
    return pairs.flatMap((q) => [`${q} 年龄 出生 生日`, `${q} age birth year birthday`, `${q} profile`]);
  },

  termVariants(list) {
    const values = [];
    for (const raw of list) {
      const text = String(raw || '').trim();
      if (text) values.push(text, text.replace(/\s+/g, '/'), text.replace(/\s+/g, ''), text.replace(/[·・]/g, ' '));
    }
    return [...new Set(values)].filter(Boolean);
  },

  async audit(store, mode, evidence, fallback, base = 0) {
    if (!evidence || !window.dzmm?.completions) return 0;
    const prompt = await this.auditPrompt(store, mode, evidence, base);
    try {
      return await window.GameModules.jsonUtils.generateJsonWithRetry({
        source: 'entry-year-audit',
        model: store.modelId,
        maxTokens: 360,
        timeoutMs: 60000,
        prompt,
        format: prompt,
        validate: (raw) => this.auditValue(raw, fallback),
      });
    } catch (err) {
      console.warn('年份证据自审格式失败:', err.message);
      return this.parseAudit(err.rawOutput, fallback);
    }
  },

  auditPrompt(store, mode, evidence, base) {
    const character = store?.character || {};
    const target = mode === 'storyYear' ? `作品《${character.work}》当前剧情基准年份` : `${character.name}在${base}年这一剧情基准年时的年龄；若证据给出出生年份/生日，可用${base}-出生年份简单算术推出`;
    return window.GameModules.promptTemplates.render('entry-year-audit', { 目标: target, 证据: evidence });
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

  stripHtml(text) {
    const div = document.createElement('div');
    div.innerHTML = String(text || '');
    return div.textContent || '';
  },
};
