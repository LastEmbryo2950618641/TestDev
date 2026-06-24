window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry = {
  types: [], prompts: {},
  operations: ['delta', 'set', 'append', 'remove', 'merge', 'upsert', 'create', 'delete', 'transfer', 'link', 'unlink'],

  registerPrompt(id, text) {
    if (id && text) this.prompts[id] = String(text);
  },

  register(type) {
    if (!type?.id) return;
    this.types = this.types.filter((item) => item.id !== type.id).concat(type);
  },

  promptText() {
    const base = this.prompts['generic-update'] || '';
    const typed = this.types.map((type) => [this.prompts[type.promptId] || '', type.extraPrompt || ''].filter(Boolean).join('\n')).filter(Boolean).join('\n\n');
    return [base, typed].filter(Boolean).join('\n\n');
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
