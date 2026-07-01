window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry = window.GameModules.updateRegistry || {};
Object.assign(window.GameModules.updateRegistry, {
  targetState(store, update = {}) {
    const subject = update.subject || {};
    const id = this.normalizeSubjectId(store, subject.characterId || subject.playerId || subject.id || update.target || 'player-self', subject);
    return store?.itemSkillState?.(id) || (id === 'player-self' ? store?.playerIdentityState?.() : null);
  },

  normalizeSubjectId(store, rawId = 'player-self', subject = {}) {
    const id = String(rawId || '').trim() || 'player-self';
    if (store?.itemSkillState?.(id) || id === 'player-self') return id;
    const candidates = [subject.name, subject.characterName, this.stripInventedRolePrefix(id)].map((x) => String(x || '').trim()).filter(Boolean);
    for (const candidate of [...new Set(candidates)]) {
      const state = store?.itemSkillState?.(candidate) || window.GameModules.sqliteSave?.getCharacterStateByName?.(candidate);
      if (state?.id) return state.id;
      const bySuffix = this.findStateByNameSuffix(store, candidate);
      if (bySuffix?.id) return bySuffix.id;
    }
    return id;
  },

  stripInventedRolePrefix(id = '') {
    return String(id || '').replace(/^(?:role|char|character|角色|人物|r|c)[-_：:]?/iu, '').trim();
  },

  findStateByNameSuffix(store, name = '') {
    const value = String(name || '').trim();
    if (!value) return null;
    return Object.values(store?.rpgStates || {}).find((state) => {
      const label = String(state?.profile?.name || state?.name || '').trim();
      return label && (label === value || label.endsWith(value));
    }) || null;
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

  normalizeBodyStatusValue(update = {}) {
    const value = this.changeValue(update);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const partKey = value.partKey || this.leafName(update.field) || 'other';
    return {
      ...value,
      partKey,
      part: value.part || partKey,
      description: value.description || value['描述状态'] || value.desc || '',
      reason: value.reason || this.reasonText(update, '现实推演确认身体状态变化。'),
      updatedAt: value.updatedAt || new Date().toISOString(),
    };
  },

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
    if (update.updateType === 'character-schedule') return this.applyCharacterScheduleUpdate(store, update);
    if (update.updateType === 'relationship') return this.applyRelationshipUpdate(store, update);
    if (update.updateType === 'body-status') return this.applyBodyStatusUpdate(store, update);
    if (update.updateType === 'sexual-experience') return this.applySexualExperienceUpdate(store, update);
    const direct = this.targetState(store, update), generic = direct ? null : this.genericTarget(store, update);
    const state = direct || generic?.state, field = String(update.field || '').trim();
    if (!state || !field) return false;
    const root = generic?.root || (field.startsWith('metrics.') ? state : (field.startsWith('profile.') ? state : state.values));
    const path = field.startsWith('profile.') ? field.replace(/^profile\./, 'profile.') : field.replace(/^values\./, '');
    if (!root) return false;
    const current = this.get(root, path), next = this.nextValue(current, update);
    if (next === undefined || JSON.stringify(current) === JSON.stringify(next)) return false;
    this.set(root, path, next);
    const note = this.notePath(path), reason = this.reasonText(update, '现实推演确认状态变化。');
    if (note) this.set(root, note, this.noteValue(path, next, reason));
    if (/^(values\.)?wearing$/u.test(field) && state.profile) {
      state.profile.wearingItems = next;
      state.profile.wearing = next;
      state.profile.roleCardUpdatedAt = new Date().toISOString();
    }
    return true;
  },

  applyBodyStatusUpdate(store, update = {}) {
    const state = this.targetState(store, update);
    if (!state?.values) return false;
    window.GameModules.initPromptRegistry?.ensureTemplateState?.('intimacyBody', state);
    const value = this.normalizeBodyStatusValue(update);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const partKey = value.partKey || this.leafName(update.field) || 'other';
    const path = `bodyStatus.${partKey}`;
    const current = this.get(state.values, path);
    const next = { ...(current && typeof current === 'object' ? current : {}), ...value, initializedByAi: true, source: 'AI更新' };
    if (JSON.stringify(current) === JSON.stringify(next)) return false;
    this.set(state.values, path, next);
    return true;
  },

  scheduleUpdatedAt(store = {}) {
    return [store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ') || new Date().toISOString();
  },

  normalizeScheduleAvailability(value = '') {
    const clean = String(value || '').trim();
    return ['在场', '场外', '未知', '暂不可用'].includes(clean) ? clean : '未知';
  },

  applyCharacterScheduleUpdate(store, update = {}) {
    const subject = update.subject || {};
    const id = this.normalizeSubjectId(store, subject.characterId || subject.playerId || subject.id || update.target || 'player-self', subject);
    if (!store || !id) return false;
    const raw = this.changeValue(update);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const current = store.characterSchedules?.[id] || {};
    const patch = { ...raw };
    if (Object.prototype.hasOwnProperty.call(patch, 'availability')) patch.availability = this.normalizeScheduleAvailability(patch.availability);
    const next = {
      ...current,
      characterId: current.characterId || id,
      characterName: current.characterName || subject.name || subject.characterName || id,
      ...patch,
      confidence: '确认',
      source: '结算事件',
      stability: '事件锁定',
      updatedAt: this.scheduleUpdatedAt(store),
    };
    if (JSON.stringify(current) === JSON.stringify(next)) return false;
    store.characterSchedules = { ...(store.characterSchedules || {}), [id]: next };
    return true;
  },

  applySexualExperienceUpdate(store, update = {}) {
    const state = this.targetState(store, update);
    if (!state?.values) return false;
    window.GameModules.initPromptRegistry?.ensureTemplateState?.('intimacyBody', state);
    const raw = this.changeValue(update);
    const current = state.values.intimacy || {};
    const next = { ...current, sexualExperienceParts: { ...(current.sexualExperienceParts || {}) }, initializedByAi: true, source: 'AI更新' };
    if (update.change?.mode === 'set') {
      if (raw && typeof raw === 'object' && raw.parts) next.sexualExperienceParts = { ...next.sexualExperienceParts, ...raw.parts };
      else if (raw && typeof raw === 'object' && raw.partKey) next.sexualExperienceParts[raw.partKey] = Math.max(0, Math.round(Number(raw.count) || 0));
      else next.sexualExperienceCount = Math.max(0, Math.round(Number(raw) || 0));
    } else {
      const fieldPart = String(update.field || '').match(/sexualExperienceParts\.([^\.]+)/u)?.[1] || '';
      const total = raw && typeof raw === 'object' ? (raw.totalDelta ?? raw.count ?? 0) : (fieldPart ? 0 : raw);
      next.sexualExperienceCount = Math.max(0, Math.round((Number(next.sexualExperienceCount) || 0) + (Number(total) || 0)));
      const parts = raw && typeof raw === 'object' ? (raw.parts || (raw.partKey ? { [raw.partKey]: raw.count ?? 1 } : {})) : (fieldPart ? { [fieldPart]: raw } : {});
      Object.entries(parts).forEach(([key, value]) => { next.sexualExperienceParts[key] = Math.max(0, Math.round((Number(next.sexualExperienceParts[key]) || 0) + (Number(value) || 0))); });
    }
    next.reason = this.reasonText(update, '现实推演确认性经验次数变化。');
    next.updatedAt = new Date().toISOString();
    if (JSON.stringify(current) === JSON.stringify(next)) return false;
    state.values.intimacy = next;
    return true;
  },

  applyRelationshipUpdate(store, update = {}) {
    const state = this.targetState(store, update);
    if (!state?.profile) return false;
    const field = String(update.field || '').trim();
    if (field === 'profile.relationships') return this.applyRelationshipText(state, update);
    return this.applyRelationshipEntry(state, update);
  },

  applyRelationshipText(state, update = {}) {
    const next = String(this.changeValue(update) || '').trim().slice(0, 1200);
    if (!next || state.profile.relationships === next) return false;
    state.profile.relationships = next;
    state.profile.roleCardUpdatedAt = new Date().toISOString();
    return true;
  },

  applyRelationshipEntry(state, update = {}) {
    const value = this.changeValue(update), mode = update.change?.mode || 'upsert';
    const relation = String(value?.relation || this.leafName(update.field) || update.name || '关系').trim().slice(0, 60);
    const name = String(value?.name || value || '').trim().slice(0, 60);
    const detail = String(value?.detail || value?.summary || this.reasonText(update, '') || '').trim().slice(0, 500);
    if (!relation || (!name && mode !== 'remove')) return false;
    const oldText = String(state.profile.relationships || '').trim();
    const entries = this.relationshipEntriesFromText(oldText);
    const index = entries.findIndex((item) => item.relation === relation && (!name || item.name === name));
    if (mode === 'remove') {
      if (index < 0) return false;
      entries.splice(index, 1);
    } else {
      const next = { relation, name, detail };
      if (index >= 0) entries[index] = { ...entries[index], ...next, detail: detail || entries[index].detail };
      else entries.push(next);
    }
    const nextText = entries.map((item) => `${item.relation}：${item.name}${item.detail ? `（${item.detail}）` : ''}`).join('；').slice(0, 1200);
    if (!nextText || nextText === oldText) return false;
    state.profile.relationships = nextText;
    state.profile.roleCardUpdatedAt = new Date().toISOString();
    return true;
  },

  relationshipEntriesFromText(text = '') {
    return String(text || '').split(/[；;\n]+/).map((part) => {
      const raw = String(part || '').trim();
      if (!raw) return null;
      const match = raw.match(/^([^：:]+)[：:](.*?)(?:[（(]([^（）()]*)[）)])?$/u);
      if (!match) return { relation: '关系', name: raw, detail: '' };
      return { relation: match[1].trim(), name: match[2].trim().replace(/[（(][^（）()]*[）)]$/u, ''), detail: String(match[3] || '').trim() };
    }).filter(Boolean);
  },

  async applyGeneric(store, updates = []) {
    const changed = new Set();
    for (const update of Array.isArray(updates) ? updates : []) {
      if (!this.applyOne(store, update)) continue;
      if (update.updateType === 'character-schedule') continue;
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
