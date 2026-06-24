window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry = window.GameModules.updateRegistry || {};
Object.assign(window.GameModules.updateRegistry, {
  targetState(store, update = {}) {
    const subject = update.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || update.target || 'player-self';
    return store?.itemSkillState?.(id) || (id === 'player-self' ? store?.playerIdentityState?.() : null);
  },

  genericTarget(store, update = {}) {
    const state = store?.playerIdentityState?.();
    if (!state?.values) return null;
    const card = this.cardForChange?.(update, store) || { id: `generic:${update.updateType || update.subject?.type || 'misc'}`, title: update.updateType || '通用更新', section: '通用' };
    state.values.genericUpdateStates = state.values.genericUpdateStates || {};
    state.values.genericUpdateStates[card.id] = state.values.genericUpdateStates[card.id] || { title: card.title, section: card.section };
    return { state, root: state.values.genericUpdateStates[card.id] };
  },

  get(obj, path = '', fallback = undefined) {
    return String(path || '').split('.').filter(Boolean).reduce((acc, key) => acc?.[key], obj) ?? fallback;
  },

  set(obj, path = '', value) {
    const keys = String(path || '').split('.').filter(Boolean), last = keys.pop();
    if (!last) return false;
    const target = keys.reduce((acc, key) => (acc[key] = acc[key] || {}), obj);
    target[last] = value;
    return true;
  },

  changeValue(update = {}) { return update.change?.value ?? update.value; },


  nextValue(current, update = {}) {
    const mode = update.change?.mode || 'set', raw = this.changeValue(update);
    if (mode === 'delta') {
      if (raw && typeof raw === 'object' && raw.parts && typeof raw.parts === 'object') {
        const next = { ...(current && typeof current === 'object' ? current : {}) };
        Object.entries(raw.parts).forEach(([key, value]) => { next[key] = Math.max(0, Math.round((Number(next[key]) || 0) + (Number(value) || 0))); });
        return next;
      }
      if (raw && typeof raw === 'object' && raw.totalDelta !== undefined) return Math.max(0, Math.round((Number(current) || 0) + (Number(raw.totalDelta) || 0)));
      return Math.max(0, Math.min(100, Math.round((Number(current) || 0) + (Number(raw) || 0))));
    }
    if (mode === 'append') return [...new Set([...(Array.isArray(current) ? current : []), ...(Array.isArray(raw) ? raw : [raw])].filter(Boolean))];
    if (mode === 'remove') return Array.isArray(current) ? current.filter((item) => item !== raw) : current;
    if ((mode === 'merge' || mode === 'upsert') && current && typeof current === 'object' && raw && typeof raw === 'object') return { ...current, ...raw };
    if (mode === 'upsert' && raw && typeof raw === 'object') return raw;
    return raw;
  },

  notePath(field = '') {
    const parts = String(field || '').split('.').filter(Boolean), leaf = parts.at(-1);
    if (!parts.length) return '';
    if (parts[0] === 'metrics' && parts.length >= 3) return `${parts[0]}.notes.${parts[1]}.${leaf}`;
    return `${parts.slice(0, -1).join('.')}.reason`.replace(/^\./, '');
  },

  noteValue(field = '', value, reason = '') {
    return String(field || '').startsWith('metrics.') ? { value, reason, at: new Date().toISOString() } : reason;
  },

  applyOne(store, update = {}) {
    const direct = this.targetState(store, update), generic = direct ? null : this.genericTarget(store, update);
    const state = direct || generic?.state, field = String(update.field || '').trim();
    if (!state || !field) return false;
    const root = generic?.root || (field.startsWith('metrics.') ? state : state.values);
    if (!root) return false;
    const current = this.get(root, field), next = this.nextValue(current, update);
    if (next === undefined || JSON.stringify(current) === JSON.stringify(next)) return false;
    this.set(root, field, next);
    const note = this.notePath(field), reason = this.reasonText(update, '现实推演确认状态变化。');
    if (note) this.set(root, note, this.noteValue(field, next, reason));
    return true;
  },

  async applyGeneric(store, updates = []) {
    const changed = new Set();
    for (const update of Array.isArray(updates) ? updates : []) {
      if (!this.applyOne(store, update)) continue;
      const state = this.targetState(store, update);
      if (state?.id) changed.add(state.id);
    }
    for (const id of changed) {
      const state = store.rpgStates?.[id] || window.GameModules.sqliteSave.getCharacterState?.(id);
      if (state) {
        store.rpgStates = { ...(store.rpgStates || {}), [id]: state };
        await window.GameModules.sqliteSave.saveCharacterState?.(state);
      }
    }
  },
});
