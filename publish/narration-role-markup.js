window.GameModules = window.GameModules || {};

/**
 * Stage3 narration role tags: <role id="…">姓名</role>
 * Storage keeps tags; UI renders sanitized HTML spans.
 */
window.GameModules.narrationRoleMarkup = {
  roleTagPattern: /<role\s+id\s*=\s*(["'])([^"']+)\1\s*>([\s\S]*?)<\/role>/giu,
  placeholderPattern: /⟦R(\d+)⟧/g,

  roleTag(id = '', name = '') {
    const cleanId = String(id || '').trim();
    const cleanName = String(name || '').trim();
    if (!cleanName) return '';
    if (!cleanId) return cleanName;
    return `<role id="${cleanId}">${cleanName}</role>`;
  },

  normalizeRoleTags(raw = '') {
    return String(raw || '')
      .replace(/<\s*role\s+id\s*=\s*(['"])\s*([^'"]+?)\s*\1\s*>/giu, '<role id="$2">')
      .replace(/<\s*\/\s*role\s*>/giu, '</role>')
      .replace(/<role\s+id\s*=\s*(["'])([^"']+)\1\s*>\s*<\/role>/giu, '');
  },

  extractRoleMentions(raw = '') {
    const text = this.normalizeRoleTags(raw);
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

  stripRoleTags(raw = '') {
    return this.normalizeRoleTags(raw).replace(new RegExp(this.roleTagPattern.source, 'giu'), '$3');
  },

  stripRoleMarkup(raw = '') {
    return this.normalizeRoleTags(raw)
      .replace(/<\/?role\b[^>]*>/giu, '')
      .trim();
  },

  withProtectedRoleTags(raw = '', fn = (text) => text) {
    const tags = [];
    const protectedText = this.normalizeRoleTags(raw).replace(new RegExp(this.roleTagPattern.source, 'giu'), (full) => {
      const index = tags.length;
      tags.push(full);
      return `⟦R${index}⟧`;
    });
    const next = String(fn(protectedText) || '');
    return next.replace(this.placeholderPattern, (_, index) => tags[Number(index)] || '');
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
    const text = this.normalizeRoleTags(raw);
    if (!text) return '';
    const parts = [];
    let last = 0;
    const re = new RegExp(this.roleTagPattern.source, 'giu');
    let match;
    while ((match = re.exec(text))) {
      parts.push(this.formatPlainSegment(text.slice(last, match.index)));
      const id = this.escapeHtml(String(match[2] || '').trim());
      const name = this.escapeHtml(String(match[3] || '').trim());
      parts.push(`<span class="narration-role" data-role-id="${id}">${name}</span>`);
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

  buildRoleTagGuide(layers = {}, store = null) {
    const rows = this.roleCatalogFromLayers(layers, store);
    if (!rows.length) return '无合法角色标签清单；除“你”外不得引入未建卡角色姓名。';
    return [
      '本回合合法角色标签（除“你”外，每次写出角色姓名都必须使用对应标签；禁止裸写姓名）：',
      ...rows.map((row) => `- ${row.name} → <role id="${row.id}">${row.name}</role>`),
      '玩家第二人称继续写“你”；若写玩家姓名则用 <role id="player-self">姓名</role>。',
      '禁止自造 id；禁止输出其它 HTML/Markdown。',
    ].join('\n');
  },

  wrapMissingRoleTags(raw = '', roles = []) {
    const list = (Array.isArray(roles) ? roles : [])
      .map((row) => ({ id: String(row?.id || '').trim(), name: String(row?.name || '').trim() }))
      .filter((row) => row.id && row.name)
      .sort((a, b) => b.name.length - a.name.length);
    if (!list.length) return this.normalizeRoleTags(raw);
    return this.withProtectedRoleTags(raw, (protectedText) => {
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

  enforce(raw = '', layers = {}, store = null) {
    const catalog = this.roleCatalogFromLayers(layers, store);
    const forced = catalog.filter((row) => row.forced);
    let text = this.normalizeRoleTags(raw);
    text = this.wrapMissingRoleTags(text, forced.length ? forced : catalog);
    return text;
  },
};
