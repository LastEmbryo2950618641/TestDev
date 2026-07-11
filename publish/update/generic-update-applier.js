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
    return String(id || '').replace(/^(?:role|char|character|瑙掕壊|浜虹墿|r|c)[-_锛?]?/iu, '').trim();
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
    const card = this.cardForChange?.(update, store) || { id: `generic:${update.updateType || update.subject?.type || 'misc'}`, title: update.updateType || '閫氱敤鏇存柊', section: '閫氱敤' };
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

  leafName(field = '') {
    return String(field || '').split('.').filter(Boolean).at(-1) || '';
  },

  metricKeyFromUpdate(update = {}) {
    return String(update.key || update.name || this.leafName(update.field)).trim();
  },

  isTemporaryMetricUpdate(update = {}) {
    return update.temporary === true || /(^|\.)temporary(?:Emotions|PlayerFeelings|\.|$)/u.test(String(update.field || ''));
  },

  applyMetricUpdate(store, update = {}) {
    const state = this.targetState(store, update);
    if (!state?.id) return false;
    const metrics = store.ensureStateMetrics?.(state) || state.metrics;
    if (!metrics) return false;
    const key = this.metricKeyFromUpdate(update);
    if (!key) return false;
    const group = update.updateType === 'feeling' ? 'player' : 'emotion';
    const fixedTarget = group === 'player' ? metrics.playerFeelings : metrics.emotions;
    const tempTarget = group === 'player' ? metrics.temporaryPlayerFeelings : metrics.temporaryEmotions;
    const temporary = this.isTemporaryMetricUpdate(update) || !Object.prototype.hasOwnProperty.call(fixedTarget || {}, key);
    const target = temporary ? tempTarget : fixedTarget;
    if (!target) return false;
    const before = window.GameModules.metrics.clamp(target[key] || 0);
    const rawDelta = window.GameModules.metrics.clampDelta(this.deltaValue(update));
    const delta = group === 'player' && !temporary ? window.GameModules.metrics.lockedPlayerDelta(key, rawDelta, before) : rawDelta;
    const next = window.GameModules.metrics.clamp(before + delta);
    const reason = this.metricReasonText(update);
    const rawStatus = String(update.change?.status ?? update.status ?? update.绋嬪害 ?? update.瑙ｉ噴 ?? '').trim();
    const status = temporary && !rawStatus ? `${key}锛氱煭鏈熺姸鎬併€俙 : rawStatus;
    window.GameModules.metrics.writeMetric(target, metrics.notes || (metrics.notes = {}), group, { key, delta, status, reason, temporary }, next, '鐜板疄鎺ㄦ紨缁撶畻銆?);
    return next !== before || Boolean(reason);
  },

  normalizeBodyStatusValue(update = {}) {
    const value = this.changeValue(update);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const partKey = value.partKey || this.leafName(update.field) || 'other';
    return {
      ...value,
      partKey,
      part: value.part || partKey,
      description: value.description || value['鎻忚堪鐘舵€?] || value.desc || '',
      reason: value.reason || this.reasonText(update, '鐜板疄鎺ㄦ紨纭韬綋鐘舵€佸彉鍖栥€?),
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
    if (update.updateType === 'system') return this.applySystemUpdate(store, update);
    if (update.updateType === 'relationship') return this.applyRelationshipUpdate(store, update);
    if (update.updateType === 'body-status') return this.applyBodyStatusUpdate(store, update);
    if (update.updateType === 'sexual-experience') return this.applySexualExperienceUpdate(store, update);
    if (update.updateType === 'wearing-state') return this.applyWearingStateUpdate(store, update);
    if (update.updateType === 'emotion' || update.updateType === 'feeling') return this.applyMetricUpdate(store, update);
    const direct = this.targetState(store, update), generic = direct ? null : this.genericTarget(store, update);
    const state = direct || generic?.state, field = String(update.field || '').trim();
    if (!state || !field) return false;
    const root = generic?.root || (field.startsWith('metrics.') ? state : (field.startsWith('profile.') ? state : state.values));
    const path = field.startsWith('profile.') ? field.replace(/^profile\./, 'profile.') : field.replace(/^values\./, '');
    if (!root) return false;
    const current = this.get(root, path), next = this.nextValue(current, update);
    if (next === undefined || JSON.stringify(current) === JSON.stringify(next)) return false;
    this.set(root, path, next);
    const note = this.notePath(path), reason = this.reasonText(update, '鐜板疄鎺ㄦ紨纭鐘舵€佸彉鍖栥€?);
    if (note) this.set(root, note, this.noteValue(path, next, reason));
    if (/^(values\.)?wearing$/u.test(field) && state.profile) {
      state.profile.wearingItems = next;
      state.profile.wearing = next;
      state.profile.roleCardUpdatedAt = new Date().toISOString();
    }
    return true;
  },

  normalizeWearingSlot(raw = {}) {
    const part = String(raw.part || raw.slot || '').trim();
    const slot = String(raw.slot || '').trim();
    if (/^(?:鍏ㄨ韩|鏁翠綋|鏁磋韩|鍏ㄤ綋|鍏ㄥ|鍏ㄨ韩琛ｇ墿|鍏ㄨ韩绌跨潃|鏁翠綋绌跨潃)$/u.test(part)) return 'outerwear';
    if (['bra', 'top', 'outerwear', 'bottom', 'legwear', 'shoes', 'panties', '楗板搧'].includes(slot)) return slot;
    if (/鑳搁儴|鑳稿彛|涔虫埧|鑳哥僵|鍐呰。涓?u.test(part)) return 'bra';
    if (/涓婅韩|涓婅。|琛～|鐫¤。涓?u.test(part)) return 'top';
    if (/澶栧|缃╄～|杩炶。瑁檤鐫¤|瑁欒/u.test(part)) return 'outerwear';
    if (/涓嬭韩|瑁欏瓙|瑁ゅ瓙|鐭￥/u.test(part)) return 'bottom';
    if (/鑵块儴|澶ц吙|涓濊|琚滆￥|瑁よ/u.test(part)) return 'legwear';
    if (/瓒抽儴|鑴氶儴|闉媩琚?u.test(part)) return 'shoes';
    if (/鍐呰￥|搴曡￥/u.test(part)) return 'panties';
    if (/楗板搧|棣栭グ|閰嶉グ/u.test(part)) return '楗板搧';
    return slot || '楗板搧';
  },

  applyWearingStateUpdate(store, update = {}) {
    const state = this.targetState(store, update);
    if (!state?.values) return false;
    const raw = this.changeValue(update);
    let next;
    const current = Array.isArray(state.values.wearing) ? state.values.wearing : [];
    if (Array.isArray(raw)) next = raw;
    else if (raw && typeof raw === 'object') {
      const slot = this.normalizeWearingSlot(raw);
      next = raw.fullBody
        ? current.filter((item) => String(item?.slot || '').trim() === '楗板搧')
        : current.slice();
      const index = next.findIndex((item) => String(item?.slot || '').trim() === slot && (slot !== '楗板搧' || String(item?.name || '').trim() === String(raw.name || '').trim()));
      const item = { ...(index >= 0 ? next[index] : {}), ...raw, slot };
      if (index >= 0) next[index] = item;
      else next.push(item);
    } else return false;
    if (JSON.stringify(current) === JSON.stringify(next)) return false;
    state.values.wearing = next;
    if (state.profile) {
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
    const next = { ...(current && typeof current === 'object' ? current : {}), ...value, initializedByAi: true, source: 'AI鏇存柊' };
    if (JSON.stringify(current) === JSON.stringify(next)) return false;
    this.set(state.values, path, next);
    return true;
  },

  scheduleUpdatedAt(store = {}) {
    return [store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ') || new Date().toISOString();
  },

  normalizeScheduleAvailability(value = '') {
    const clean = String(value || '').trim();
    return ['鍦ㄥ満', '鍦哄', '鏈煡', '鏆備笉鍙敤'].includes(clean) ? clean : '鏈煡';
  },

  systemRecordPayload(raw = {}) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return {
        key: String(raw.key || '').trim(),
        value: String(raw.value ?? '').trim(),
        reason: String(raw.reason || '').trim(),
      };
    }
    return { key: '', value: String(raw || '').trim(), reason: '' };
  },

  isNarrativeSystemEvent(key = '', value = '') {
    if (key !== '浜嬩欢') return false;
    const text = String(value || '').trim();
    if (!text || text.length < 24) return false;
    return /(?:杩涘叆|鎴块棿|鎶变綇|鎻墊鎽竱浜瞸鎺▅榛樿|棰ゆ姈|闅旂潃|琛ｆ湇|韬綋|鍙嶅簲|琛屽姩|鍦扮偣|褰撳墠)/u.test(text);
  },

  legacySystemRecords(store = {}) {
    const buckets = store?.playerIdentityState?.()?.values?.genericUpdateStates || {};
    return Object.values(buckets).flatMap((bucket) => {
      const events = bucket?.events;
      if (!events || typeof events !== 'object') return [];
      return Object.entries(events).flatMap(([key, list]) => (Array.isArray(list) ? list : [list]).filter(Boolean).map((item) => {
        const payload = this.systemRecordPayload(item);
        return {
          key: payload.key || key,
          value: payload.value || String(item?.value || item || ''),
          reason: payload.reason || String(item?.reason || ''),
          at: String(item?.updatedAt || item?.at || ''),
          legacy: true,
        };
      }));
    });
  },

  applySystemUpdate(store, update = {}) {
    if (!store) return false;
    const raw = this.changeValue(update);
    const payload = this.systemRecordPayload(raw);
    const fieldKey = payload.key || this.leafName(update.field) || '璁板綍';
    const text = payload.value || (typeof raw === 'string' ? raw : '');
    if (!text) return false;
    if (this.isNarrativeSystemEvent(fieldKey, text)) return false;
    const updatedAt = this.scheduleUpdatedAt(store);
    const reason = payload.reason || this.reasonText(update, '');
    const entry = { key: fieldKey, value: text.slice(0, 500), reason: reason.slice(0, 240), at: updatedAt };
    store.realWorldSystemRecords = Array.isArray(store.realWorldSystemRecords) ? store.realWorldSystemRecords : [];
    const dup = store.realWorldSystemRecords.some((item) => item.key === entry.key && item.value === entry.value && item.at === entry.at);
    if (dup) return false;
    store.realWorldSystemRecords = [...store.realWorldSystemRecords, entry].slice(-60);
    update.settlementAt = updatedAt;
    if (update.change?.value && typeof update.change.value === 'object' && !Array.isArray(update.change.value)) {
      update.change.value = { ...update.change.value, key: fieldKey, value: text, reason, updatedAt };
    }
    return true;
  },

  applyCharacterScheduleUpdate(store, update = {}) {
    const subject = update.subject || {};
    const id = this.normalizeSubjectId(store, subject.characterId || subject.playerId || subject.id || update.target || 'player-self', subject);
    if (!store || !id) return false;
    const raw = this.changeValue(update);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const current = store.characterSchedules?.[id] || {};
    const patch = { ...raw };
    const updatedAt = this.scheduleUpdatedAt(store);
    const next = {
      ...current,
      ...patch,
      characterId: id,
      characterName: current.characterName || subject.name || subject.characterName || id,
      availability: this.normalizeScheduleAvailability(patch.availability ?? current.availability),
      confidence: '纭',
      source: '缁撶畻浜嬩欢',
      stability: '浜嬩欢閿佸畾',
      updatedAt,
    };
    if (JSON.stringify(current) === JSON.stringify(next)) return false;
    const prevLoc = String(current.currentLocation || '').trim();
    const nextLoc = String(next.currentLocation || '').trim();
    store.characterSchedules = { ...(store.characterSchedules || {}), [id]: next };
    if (nextLoc && nextLoc !== prevLoc) {
      window.GameModules.orgTerritory?.bumpOrgExposureOnScheduleLocation?.(store, nextLoc);
    }
    update.settlementAt = updatedAt;
    if (update.change?.value && typeof update.change.value === 'object' && !Array.isArray(update.change.value)) {
      update.change.value = { ...update.change.value, updatedAt };
    }
    return true;
  },

  applySexualExperienceUpdate(store, update = {}) {
    const state = this.targetState(store, update);
    if (!state?.values) return false;
    window.GameModules.initPromptRegistry?.ensureTemplateState?.('intimacyBody', state);
    const raw = this.changeValue(update);
    const current = state.values.intimacy || {};
    const next = { ...current, sexualExperienceParts: { ...(current.sexualExperienceParts || {}) }, initializedByAi: true, source: 'AI鏇存柊' };
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
    next.reason = this.reasonText(update, '鐜板疄鎺ㄦ紨纭鎬х粡楠屾鏁板彉鍖栥€?);
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
    const relation = String(value?.relation || this.leafName(update.field) || update.name || '鍏崇郴').trim().slice(0, 60);
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
    const nextText = entries.map((item) => `${item.relation}锛?{item.name}${item.detail ? `锛?{item.detail}锛塦 : ''}`).join('锛?).slice(0, 1200);
    if (!nextText || nextText === oldText) return false;
    state.profile.relationships = nextText;
    state.profile.roleCardUpdatedAt = new Date().toISOString();
    return true;
  },

  relationshipEntriesFromText(text = '') {
    return String(text || '').split(/[锛?\n]+/).map((part) => {
      const raw = String(part || '').trim();
      if (!raw) return null;
      const match = raw.match(/^([^锛?]+)[锛?](.*?)(?:[锛?]([^锛堬級()]*)[锛?])?$/u);
      if (!match) return { relation: '鍏崇郴', name: raw, detail: '' };
      return { relation: match[1].trim(), name: match[2].trim().replace(/[锛?][^锛堬級()]*[锛?]$/u, ''), detail: String(match[3] || '').trim() };
    }).filter(Boolean);
  },

  async applyGeneric(store, updates = []) {
    const changed = new Set();
    const ordered = (Array.isArray(updates) ? updates : []).slice().sort((a, b) => {
      const aFull = a?.updateType === 'wearing-state' && this.changeValue(a)?.fullBody;
      const bFull = b?.updateType === 'wearing-state' && this.changeValue(b)?.fullBody;
      return aFull === bFull ? 0 : (aFull ? -1 : 1);
    });
    for (const update of ordered) {
      if (!this.applyOne(store, update)) continue;
      if (update.updateType === 'character-schedule') continue;
      if (update.updateType === 'system') continue;
      const state = this.targetState(store, update);
      if (state?.id) changed.add(state.id);
    }
    for (const id of changed) {
      const state = store.rpgStates?.[id] || window.GameModules.characterStateStore?.get?.(id);
      if (state) {
        store.rpgStates = { ...(store.rpgStates || {}), [id]: state };
        await window.GameModules.characterStateStore?.save?.(state);
      }
    }
  },
});


