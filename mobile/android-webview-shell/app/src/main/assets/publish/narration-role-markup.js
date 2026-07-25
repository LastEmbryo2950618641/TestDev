window.GameModules = window.GameModules || {};

/**
 * Stage3 narration entity tags:
 *   <role id="…">姓名</role>
 *   <force id="…">势力名</force>
 * Storage keeps tags; UI renders sanitized HTML spans.
 */
window.GameModules.narrationRoleMarkup = {
  roleTagPattern: /<role\s+id\s*=\s*(["'])([^"']+)\1\s*>([\s\S]*?)<\/role>/giu,
  forceTagPattern: /<force\s+id\s*=\s*(["'])([^"']+)\1\s*>([\s\S]*?)<\/force>/giu,
  entityTagPattern: /<(role|force)\s+id\s*=\s*(["'])([^"']+)\2\s*>([\s\S]*?)<\/\1>/giu,
  placeholderPattern: /⟦E(\d+)⟧/g,

  roleTag(id = '', name = '') {
    const cleanId = String(id || '').trim();
    const cleanName = String(name || '').trim();
    if (!cleanName) return '';
    if (!cleanId) return cleanName;
    return `<role id="${cleanId}">${cleanName}</role>`;
  },

  forceTag(id = '', name = '') {
    const cleanId = String(id || '').trim();
    const cleanName = String(name || '').trim();
    if (!cleanName) return '';
    if (!cleanId) return cleanName;
    return `<force id="${cleanId}">${cleanName}</force>`;
  },

  normalizeEntityTags(raw = '') {
    return String(raw || '')
      .replace(/<\s*role\s+id\s*=\s*(['"])\s*([^'"]+?)\s*\1\s*>/giu, '<role id="$2">')
      .replace(/<\s*\/\s*role\s*>/giu, '</role>')
      .replace(/<role\s+id\s*=\s*(["'])([^"']+)\1\s*>\s*<\/role>/giu, '')
      .replace(/<\s*force\s+id\s*=\s*(['"])\s*([^'"]+?)\s*\1\s*>/giu, '<force id="$2">')
      .replace(/<\s*\/\s*force\s*>/giu, '</force>')
      .replace(/<force\s+id\s*=\s*(["'])([^"']+)\1\s*>\s*<\/force>/giu, '');
  },

  normalizeRoleTags(raw = '') {
    return this.normalizeEntityTags(raw);
  },

  extractRoleMentions(raw = '') {
    const text = this.normalizeEntityTags(raw);
    const out = [];
    const seen = new Set();
    const re = new RegExp(this.roleTagPattern.source, 'giu');
    let match;
    while ((match = re.exec(text))) {
      const id = String(match[2] || '').trim();
      const name = String(match[3] || '').trim();
      if (!id || !name) continue;
      const key = `${id}::${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ id, name });
    }
    return out;
  },

  extractForceMentions(raw = '') {
    const text = this.normalizeEntityTags(raw);
    const out = [];
    const seen = new Set();
    const re = new RegExp(this.forceTagPattern.source, 'giu');
    let match;
    while ((match = re.exec(text))) {
      const id = String(match[2] || '').trim();
      const name = String(match[3] || '').trim();
      if (!id || !name) continue;
      const key = `${id}::${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ id, name });
    }
    return out;
  },

  stripRoleTags(raw = '') {
    return this.normalizeEntityTags(raw).replace(new RegExp(this.roleTagPattern.source, 'giu'), '$3');
  },

  stripRoleMarkup(raw = '') {
    return this.normalizeEntityTags(raw)
      .replace(/<\/?(?:role|force)\b[^>]*>/giu, '')
      .trim();
  },

  withProtectedEntityTags(raw = '', fn = (text) => text) {
    const tags = [];
    const protectedText = this.normalizeEntityTags(raw).replace(new RegExp(this.entityTagPattern.source, 'giu'), (full) => {
      const index = tags.length;
      tags.push(full);
      return `⟦E${index}⟧`;
    });
    const next = String(fn(protectedText) || '');
    return next.replace(this.placeholderPattern, (_, index) => tags[Number(index)] || '');
  },

  withProtectedRoleTags(raw = '', fn = (text) => text) {
    return this.withProtectedEntityTags(raw, fn);
  },

  escapeHtml(value = '') {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  toSafeHtml(raw = '') {
    const text = this.normalizeEntityTags(raw);
    if (!text) return '';
    const parts = [];
    let last = 0;
    const re = new RegExp(this.entityTagPattern.source, 'giu');
    let match;
    while ((match = re.exec(text))) {
      parts.push(this.formatPlainSegment(text.slice(last, match.index)));
      const kind = String(match[1] || 'role').toLowerCase();
      const id = this.escapeHtml(String(match[3] || '').trim());
      const name = this.escapeHtml(String(match[4] || '').trim());
      if (kind === 'force') {
        parts.push(`<span class="narration-force" data-force-id="${id}">${name}</span>`);
      } else {
        parts.push(`<span class="narration-role" data-role-id="${id}">${name}</span>`);
      }
      last = match.index + match[0].length;
    }
    parts.push(this.formatPlainSegment(text.slice(last)));
    return parts.join('');
  },

  formatPlainSegment(segment = '') {
    return this.escapeHtml(segment)
      .replace(/\r\n|\r|\n/g, '\n')
      .replace(/\n{2,}/g, '<br><br>')
      .replace(/\n/g, '<br>');
  },

  roleCatalogFromLayers(layers = {}, store = null) {
    const keys = ['forcedParticipants', 'priorityCandidates', 'dramaCandidates'];
    const rows = [];
    const seen = new Set();
    const push = (id = '', name = '', forced = false) => {
      const nextId = String(id || '').trim();
      const nextName = String(name || '').trim();
      if (!nextId || !nextName || seen.has(nextId)) return;
      if (window.GameModules.characterIdEnsure?.isPendingId?.(nextId)) return;
      seen.add(nextId);
      rows.push({ id: nextId, name: nextName, forced: Boolean(forced) });
    };
    keys.forEach((key) => {
      (Array.isArray(layers?.[key]) ? layers[key] : []).forEach((item) => {
        push(item?.id || item?.idOrName, item?.name || item?.characterName, key === 'forcedParticipants');
      });
    });
    const playerName = String(store?.playerName || store?.playerProfile?.name || '').trim();
    push('player-self', playerName || '玩家', true);
    return rows;
  },

  forceCatalogFromStore(store = null) {
    store?.initFactionSystem?.();
    const rows = [];
    const seen = new Set();
    (Array.isArray(store?.factionState?.factions) ? store.factionState.factions : []).forEach((faction) => {
      const id = String(faction?.id || '').trim();
      const name = String(faction?.name || '').trim();
      if (!id || !name || seen.has(id)) return;
      seen.add(id);
      rows.push({ id, name });
    });
    return rows.sort((a, b) => b.name.length - a.name.length);
  },

  buildRoleTagGuide(layers = {}, store = null) {
    const rows = this.roleCatalogFromLayers(layers, store);
    const roleLines = rows.length
      ? [
        '本回合合法角色标签（除“你”外，每次写出角色姓名都必须使用对应标签；禁止裸写姓名）：',
        ...rows.map((row) => `- ${row.name} → <role id="${row.id}">${row.name}</role>`),
        '玩家第二人称继续写“你”；若写玩家姓名则用 <role id="player-self">姓名</role>。',
      ]
      : ['无合法角色标签清单；除“你”外不得引入未建卡角色姓名。'];
    const forceGuide = this.buildForceTagGuide(store);
    return [...roleLines, '禁止自造 id；禁止输出其它 HTML/Markdown。', forceGuide].filter(Boolean).join('\n');
  },

  buildForceTagGuide(store = null) {
    const rows = this.forceCatalogFromStore(store);
    if (!rows.length) {
      return '本回合势力标签：暂无已入库势力。正文若需写组织/公司正式名，应先在 Stage1 创建势力后再用 <force id="…">势力名</force>。';
    }
    return [
      '本回合合法势力标签（每一次写出势力/组织/公司正式名称都必须使用对应标签；禁止裸写势力名）：',
      ...rows.slice(0, 40).map((row) => `- ${row.name} → <force id="${row.id}">${row.name}</force>`),
      rows.length > 40 ? `…另有 ${rows.length - 40} 个势力已入库，id 必须来自势力列表。` : '',
    ].filter(Boolean).join('\n');
  },

  wrapMissingRoleTags(raw = '', roles = []) {
    const list = (Array.isArray(roles) ? roles : [])
      .map((row) => ({ id: String(row?.id || '').trim(), name: String(row?.name || '').trim() }))
      .filter((row) => row.id && row.name)
      .sort((a, b) => b.name.length - a.name.length);
    if (!list.length) return this.normalizeEntityTags(raw);
    return this.withProtectedEntityTags(raw, (protectedText) => {
      let text = protectedText;
      list.forEach((row) => {
        if (!text.includes(row.name)) return;
        const escaped = row.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(escaped, 'gu');
        text = text.replace(re, `<role id="${row.id}">${row.name}</role>`);
      });
      return text;
    });
  },

  wrapMissingForceTags(raw = '', forces = []) {
    const list = (Array.isArray(forces) ? forces : [])
      .map((row) => ({ id: String(row?.id || '').trim(), name: String(row?.name || '').trim() }))
      .filter((row) => row.id && row.name && row.name.length >= 2)
      .sort((a, b) => b.name.length - a.name.length);
    if (!list.length) return this.normalizeEntityTags(raw);
    return this.withProtectedEntityTags(raw, (protectedText) => {
      let text = protectedText;
      list.forEach((row) => {
        if (!text.includes(row.name)) return;
        const escaped = row.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(escaped, 'gu');
        text = text.replace(re, `<force id="${row.id}">${row.name}</force>`);
      });
      return text;
    });
  },

  enforce(raw = '', layers = {}, store = null) {
    const catalog = this.roleCatalogFromLayers(layers, store);
    const forced = catalog.filter((row) => row.forced);
    let text = this.normalizeEntityTags(raw);
    text = this.wrapMissingRoleTags(text, forced.length ? forced : catalog);
    text = this.wrapMissingForceTags(text, this.forceCatalogFromStore(store));
    return text;
  },
};
