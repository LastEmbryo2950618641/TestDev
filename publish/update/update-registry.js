window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry = {
  types: [], prompts: {}, skills: {},
  operations: ['delta', 'set', 'append', 'remove', 'merge', 'upsert', 'create', 'delete', 'transfer', 'link', 'unlink'],

  parseSkill(text = '') {
    const raw = String(text || '');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    const meta = {};
    if (match) match[1].split(/\n+/).forEach((line) => {
      const at = line.indexOf(':');
      if (at > 0) meta[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    });
    return { name: meta.name || '', description: meta.description || '', body: match ? match[2].trim() : raw.trim(), raw };
  },

  registerPrompt(id, text) {
    if (!id || !text) return;
    const skill = this.parseSkill(text);
    this.prompts[id] = skill.body || String(text);
    this.skills[id] = { id, ...skill };
  },

  register(type) {
    if (!type?.id) return;
    this.types = this.types.filter((item) => item.id !== type.id).concat(type);
  },

  skillSummaries() {
    return this.types.map((type) => {
      const skill = this.skills[type.promptId] || {};
      const name = skill.name || type.id;
      const description = skill.description || type.description || type.section || '';
      return `- ${name}：${description}`;
    }).join('\n');
  },

  promptText() {
    const base = this.prompts['generic-update'] || '';
    const summaries = this.skillSummaries();
    return [base, summaries ? `## 可用更新 Skills 摘要\n\n${summaries}` : ''].filter(Boolean).join('\n\n');
  },

  skillText(ids = null) {
    const list = Array.isArray(ids) ? ids : [];
    const wanted = new Set(list.filter(Boolean));
    const selected = Array.isArray(ids) ? this.types.filter((type) => wanted.has(type.id) || wanted.has(type.promptId) || wanted.has(this.skills[type.promptId]?.name)) : this.types;
    return selected.map((type) => {
      const skill = this.skills[type.promptId] || {};
      const title = skill.name || type.id;
      const body = skill.body || this.prompts[type.promptId] || type.extraPrompt || '';
      return `## ${title}\n\n${body}`;
    }).filter(Boolean).join('\n\n');
  },

  selectByNames(names = []) {
    const wanted = new Set((names || []).map((name) => String(name || '').trim()).filter(Boolean));
    return this.types.filter((type) => wanted.has(type.id) || wanted.has(type.promptId) || wanted.has(this.skills[type.promptId]?.name));
  },

  schemaFor(ids = null) {
    const selected = Array.isArray(ids) ? this.selectByNames(ids) : this.types;
    return { genericUpdates: selected.flatMap((type) => type.examples || []) };
  },

  schema() {
    return { genericUpdates: this.types.flatMap((type) => type.examples || []) };
  },

  typeForChange(change = {}) {
    const text = `${change.updateType || ''} ${change.field || ''} ${change.section || ''} ${change.subject?.type || ''} ${change.group || ''}`;
    return this.types.find((type) => type.match?.(change, text)) || null;
  },

  cardForChange(change = {}, store = null) {
    const type = this.typeForChange(change);
    if (type?.card) return type.card(change, store);
    return this.defaultCard(change, store);
  },

  defaultCard(change = {}, store = null) {
    const subject = change.subject || {};
    const label = subject.name || subject.id || change.group || change.target || '';
    const playerName = store?.realWorldPlayerSettlementName?.() || '玩家';
    if (!label || label === 'player-self' || label === '玩家' || label === playerName) return { id: 'role:player-self', title: playerName, section: '角色卡' };
    return { id: `misc:${label}`, title: label, section: '其他' };
  },

  rowFromGeneric(update = {}, store = null) {
    const card = this.cardForChange(update, store);
    const change = update.change || {};
    const reasons = Array.isArray(update.reasons) ? update.reasons : [];
    const rawValue = change.value ?? change.toValue ?? change.mode ?? '';
    return {
      at: new Date().toISOString(), cardId: card.id, cardTitle: card.title, section: card.section,
      field: update.field || update.updateType || '通用更新', name: update.name || change.name || change.mode || '',
      value: rawValue && typeof rawValue === 'object' ? JSON.stringify(rawValue) : rawValue,
      reason: reasons.map((item) => item.evidence || item.trigger || item.reason).filter(Boolean).join('；') || update.reason || '现实推演结算。',
      applied: true,
    };
  },
};
