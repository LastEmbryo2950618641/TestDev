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
      const state = store?.itemSkillState?.(candidate) || window.GameModules.characterStateStore?.getByName?.(candidate);
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
    const card = this.cardForChange?.(update, store) || { id: 'generic:' + (update.updateType || update.subject?.type || 'misc'), title: update.updateType || '通用更新', section: '通用' };
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
    const status = temporary && !rawStatus ? (String(key) + '：短期状态。') : rawStatus;
    window.GameModules.metrics.writeMetric(target, metrics.notes || (metrics.notes = {}), group, { key, delta, status, reason, temporary }, next, '现实推演结算。');
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
      description: value.description || value['描述状态'] || value.desc || '',
      reason: value.reason || this.reasonText(update, '现实推演确认了身体状态变化。'),
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
    if (mode === 'append') {
      const values = [...(Array.isArray(current) ? current : []), ...(Array.isArray(raw) ? raw : [raw])].filter(Boolean);
      const keyAliases = {
        'profile.factions': [['faction', 'community', 'name'], ['role', 'position']],
        'profile.certificates': [['orgName', 'organization', 'org', 'name'], ['field', 'domain', 'major'], ['level', 'qualification', 'grade', 'title']],
        'profile.titles': [['society', 'group', 'community', 'orgName', 'name'], ['field', 'domain'], ['title', 'level']],
      }[String(update.field || '')];
      if (!keyAliases) return [...new Set(values)];
      const seen = new Set();
      return values.filter((item) => {
        const stringParts = typeof item === 'string'
          ? item.split(/[/／]/).map((part) => String(part || '').trim().toLowerCase())
          : [];
        const source = item && typeof item === 'object' && !Array.isArray(item) ? item : {};
        const parts = stringParts.length
          ? stringParts
          : keyAliases.map((aliases) => {
            const key = aliases.find((alias) => source[alias] !== undefined && source[alias] !== null && String(source[alias]).trim());
            return key ? String(source[key]).trim().toLowerCase() : '';
          });
        const businessKey = parts.length === keyAliases.length && parts.every(Boolean) ? parts.join('/') : '';
        const fallbackKey = `raw:${typeof item}:${typeof item === 'string' ? item.trim().toLowerCase() : JSON.stringify(item)}`;
        const key = businessKey ? `business:${businessKey}` : fallbackKey;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    if (mode === 'remove') return Array.isArray(current) ? current.filter((item) => item !== raw) : current;
    if ((mode === 'merge' || mode === 'upsert') && current && typeof current === 'object' && raw && typeof raw === 'object') return { ...current, ...raw };
    if (mode === 'upsert' && raw && typeof raw === 'object') return raw;
    return raw;
  },

  notePath(field = '') {
    const parts = String(field || '').split('.').filter(Boolean), leaf = parts.at(-1);
    if (!parts.length) return '';
    if (parts[0] === 'metrics' && parts.length >= 3) return parts[0] + '.notes.' + parts[1] + '.' + leaf;
    return (parts.slice(0, -1).join('.') + '.reason').replace(/^\./, '');
  },

  noteValue(field = '', value, reason = '') {
    return String(field || '').startsWith('metrics.') ? { value, reason, at: new Date().toISOString() } : reason;
  },

  applyOne(store, update = {}) {
    if (update.updateType === 'character-schedule') return this.applyCharacterScheduleUpdate(store, update);
    if (update.updateType === 'character-goal') return this.applyCharacterGoalUpdate(store, update);
    if (update.updateType === 'system') return this.applySystemUpdate(store, update);
    if (update.updateType === 'relationship') return this.applyRelationshipUpdate(store, update);
    if (update.updateType === 'body-status') return this.applyBodyStatusUpdate(store, update);
    if (update.updateType === 'sexual-experience') return this.applySexualExperienceUpdate(store, update);
    if (update.updateType === 'sexual-history') return this.applySexualHistoryUpdate(store, update);
    if (update.updateType === 'control-experience') return this.applyControlExperienceUpdate(store, update);
    if (update.updateType === 'inventory-operation') return this.applyInventoryOperation(store, update);
    if (update.updateType === 'wearing-state') return this.applyWearingStateUpdate(store, update);
    if (update.updateType === 'emotion' || update.updateType === 'feeling') return this.applyMetricUpdate(store, update);
    const direct = this.targetState(store, update), generic = direct ? null : this.genericTarget(store, update);
    const state = direct || generic?.state, rawField = String(update.field || '').trim();
    const profileFieldMap = {
      'values.factions': 'profile.factions',
      'values.memberships': 'profile.memberships',
      'values.wearing': 'profile.wearingItems',
      'values.items': 'profile.items',
      'values.knowledge': 'profile.knowledge',
      'values.skills': 'profile.skills',
      'values.professions': 'profile.professions',
      'values.control_experience': 'profile.control_experience',
    };
    const field = profileFieldMap[rawField] || rawField;
    if (!state || !field) return false;
    // 经历人数由经历对象名单自动派生，忽略单独写入。
    if (/(?:^|\.)sexualPartnerCount$/u.test(field)) {
      return this.syncSexualPartnerCountFromList(state);
    }
    const root = generic?.root || (field.startsWith('metrics.') ? state : (field.startsWith('profile.') ? state : state.values));
    const path = field.startsWith('profile.') ? field.replace(/^profile\./, 'profile.') : field.replace(/^values\./, '');
    if (!root) return false;
    const current = this.get(root, path), next = this.nextValue(current, update);
    if (next === undefined || JSON.stringify(current) === JSON.stringify(next)) return false;
    this.set(root, path, next);
    const note = this.notePath(path), reason = this.reasonText(update, '现实推演确认了状态变化。');
    if (note) this.set(root, note, this.noteValue(path, next, reason));
    if (field.startsWith('profile.') && state.profile) state.profile.roleCardUpdatedAt = new Date().toISOString();
    if (/^profile\.wearingItems$/u.test(field) && state.profile) {
      state.profile.wearingItems = next;
      state.profile.wearing = next;
      state.profile.roleCardUpdatedAt = new Date().toISOString();
    }
    if (/^profile\.(?:factions|memberships)$/u.test(field)) {
      window.GameModules.rpgState?.syncSocialFields?.(state, 'profile', store);
    }
    window.GameModules.rpgState?.stripProfileOwnedValues?.(state);
    if (/(?:^|\.)sexualPartners$/u.test(path) || /(?:^|\.)intimacy\.sexualPartners$/u.test(field)) {
      this.syncSexualPartnerCountFromList(state);
    }
    return true;
  },

  normalizeWearingSlot(raw = {}) {
    const part = String(raw.part || raw.slot || '').trim();
    const slot = String(raw.slot || '').trim();
    if (/^(?:全身|整体|整身|全体|全套|全身衣物|全身穿着|整体穿着)$/u.test(part)) return 'outerwear';
    if (['bra', 'top', 'outerwear', 'bottom', 'legwear', 'shoes', 'panties', '楗板搧'].includes(slot)) return slot;
    if (/胸部|胸口|乳房|胸罩|内衣/u.test(part)) return 'bra';
    if (/上身|上衣|衬衫|睡衣/u.test(part)) return 'top';
    if (/外套|罩衫|连衣裙|睡袍|裙装/u.test(part)) return 'outerwear';
    if (/下身|裙子|裤子|短裤/u.test(part)) return 'bottom';
    if (/腿部|大腿|丝袜|裤袜|袜裤/u.test(part)) return 'legwear';
    if (/足部|脚部|鞋|靴/u.test(part)) return 'shoes';
    if (/内裤|底裤/u.test(part)) return 'panties';
    if (/楗板搧|棣栭グ|閰嶉グ/u.test(part)) return '楗板搧';
    return slot || '楗板搧';
  },

  applyWearingStateUpdate(store, update = {}) {
    const state = this.targetState(store, update);
    if (!state) return false;
    state.profile = state.profile || {};
    const raw = this.changeValue(update);
    let next;
    const current = Array.isArray(state.profile.wearingItems) ? state.profile.wearingItems : (Array.isArray(state.profile.wearing) ? state.profile.wearing : []);
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
    state.profile.wearingItems = next;
    state.profile.wearing = next;
    state.profile.roleCardUpdatedAt = new Date().toISOString();
    window.GameModules.rpgState?.stripProfileOwnedValues?.(state);
    return true;
  },

  inventoryOperationState(store, subject = {}) {
    const id = this.normalizeSubjectId(store, subject.characterId || subject.playerId || subject.id || 'player-self', subject);
    return store?.itemSkillState?.(id) || (id === 'player-self' ? store?.playerIdentityState?.() : null);
  },

  inventoryOperationItemName(item = {}) {
    return String(item?.name || item || '').trim();
  },

  applyInventoryOperation(store, update = {}) {
    const source = this.inventoryOperationState(store, update.subject || {});
    if (!source?.profile) return false;
    const payload = this.changeValue(update) || {};
    const action = String(payload.action || '').trim();
    const sourceItems = Array.isArray(source.profile.items) ? source.profile.items : (source.profile.items = []);
    const wearing = Array.isArray(source.profile.wearingItems) ? source.profile.wearingItems : (source.profile.wearingItems = []);
    const itemName = String(payload.itemName || payload.item?.name || '').trim();
    const findItem = (list, name) => list.findIndex((item) => this.inventoryOperationItemName(item) === name);
    const normalize = (raw = {}, fallbackName = '') => {
      const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...raw } : { name: fallbackName };
      value.name = String(value.name || fallbackName).trim();
      value.quantity = Math.max(1, Math.floor(Number(value.quantity) || 1));
      value.description = String(value.description || value.detail || '').trim();
      value.reason = String(value.reason || payload.reason || '').trim();
      value.changeMode = String(value.changeMode || `Stage4-9 ${action}`).trim();
      value.type = value.type || value.kind || 'item';
      value.kind = value.kind || value.type;
      return value;
    };
    let changed = false;
    const mark = (state) => {
      if (!state?.id) return;
      update._changedStateIds = [...new Set([...(update._changedStateIds || []), state.id])];
      state.profile.roleCardUpdatedAt = new Date().toISOString();
    };
    if (action === 'replace') {
      if (!Array.isArray(payload.replaceItems)) return false;
      source.profile.items = payload.replaceItems.map((item) => normalize(item));
      changed = true;
    } else if (action === 'add') {
      const item = normalize(payload.item, itemName);
      if (!item.name) return false;
      const index = findItem(sourceItems, item.name);
      if (index >= 0) sourceItems[index] = { ...sourceItems[index], ...item, quantity: (Number(sourceItems[index].quantity) || 1) + (Number(payload.quantity) || item.quantity || 1) };
      else sourceItems.push(item);
      changed = true;
    } else if (action === 'update') {
      const index = findItem(sourceItems, itemName);
      if (index < 0) return false;
      sourceItems[index] = { ...sourceItems[index], ...normalize(payload.item, itemName), name: itemName };
      changed = true;
    } else if (action === 'remove' || action === 'consume') {
      const index = findItem(sourceItems, itemName);
      if (index < 0) return false;
      const count = Math.max(1, Math.floor(Number(payload.quantity) || 1));
      const current = Math.max(1, Math.floor(Number(sourceItems[index].quantity) || 1));
      if (current > count) sourceItems[index] = { ...sourceItems[index], quantity: current - count };
      else sourceItems.splice(index, 1);
      changed = true;
    } else if (action === 'equip') {
      const index = findItem(sourceItems, itemName);
      const slot = String(payload.slot || '').trim();
      if (index < 0 || !slot) return false;
      const old = wearing.findIndex((item) => String(item?.slot || '').trim() === slot);
      if (old >= 0 && wearing[old]?.name && wearing[old].name !== 'empty-slot') sourceItems.push({ ...wearing[old], type: 'equipment', kind: 'equipment' });
      const equipped = { ...sourceItems[index], slot, type: 'wearing', kind: 'wearing' };
      sourceItems.splice(index, 1);
      if (old >= 0) wearing[old] = equipped;
      else wearing.push(equipped);
      changed = true;
    } else if (action === 'unequip') {
      const slot = String(payload.slot || '').trim();
      const index = wearing.findIndex((item) => String(item?.slot || '').trim() === slot && item?.name && item.name !== 'empty-slot');
      if (index < 0 || !slot) return false;
      sourceItems.push({ ...wearing[index], type: 'equipment', kind: 'equipment', slot: '' });
      wearing[index] = { ...wearing[index], name: 'empty-slot', type: 'wearing', kind: 'wearing', description: '装备槽已空', quantity: 1, level: -1 };
      changed = true;
    } else if (action === 'transfer') {
      const target = this.inventoryOperationState(store, payload.target || {});
      const index = findItem(sourceItems, itemName);
      if (!target?.profile || index < 0) return false;
      const count = Math.max(1, Math.floor(Number(payload.quantity) || 1));
      const sourceItem = sourceItems[index];
      const current = Math.max(1, Math.floor(Number(sourceItem.quantity) || 1));
      const moved = { ...sourceItem, quantity: Math.min(count, current) };
      if (current > count) sourceItems[index] = { ...sourceItem, quantity: current - count };
      else sourceItems.splice(index, 1);
      const targetItems = Array.isArray(target.profile.items) ? target.profile.items : (target.profile.items = []);
      const targetIndex = findItem(targetItems, itemName);
      if (targetIndex >= 0) targetItems[targetIndex] = { ...targetItems[targetIndex], quantity: (Number(targetItems[targetIndex].quantity) || 1) + moved.quantity };
      else targetItems.push(moved);
      mark(target);
      changed = true;
    } else return false;
    if (!changed) return false;
    mark(source);
    window.GameModules.rpgState?.stripProfileOwnedValues?.(source);
    return true;
  },

  applyBodyStatusUpdate(store, update = {}) {
    const state = this.targetState(store, update);
    if (!state?.values) return false;
    window.GameModules.initPromptRegistry?.ensureTemplateState?.('intimacyBody', state);
    const value = this.normalizeBodyStatusValue(update);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const partKey = value.partKey || this.leafName(update.field) || 'other';
    const path = 'bodyStatus.' + partKey;
    const current = this.get(state.values, path);
    const next = {
      ...(current && typeof current === 'object' ? current : {}),
      ...value,
      pendingAiInit: false,
      initializedByAi: true,
      source: 'AI更新',
    };
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
      const knownNode = window.GameModules.realWorldLocationGraph?.getNode?.(store, next.currentNodeId || next.currentLocationIdentityKey || nextLoc);
      if (knownNode?.id) window.GameModules.realWorldLocationGraph?.setCharacterCurrentNode?.(store, id, knownNode.id, { characterName: next.characterName, reason: next.reason || '人事安排更新当前位置。', time: updatedAt });
      window.GameModules.orgTerritory?.bumpOrgExposureOnScheduleLocation?.(store, nextLoc);
    }
    update.settlementAt = updatedAt;
    if (update.change?.value && typeof update.change.value === 'object' && !Array.isArray(update.change.value)) {
      update.change.value = { ...update.change.value, updatedAt };
    }
    return true;
  },

  applyCharacterGoalUpdate(store, update = {}) {
    const subject = update.subject || {};
    const id = this.normalizeSubjectId(store, subject.characterId || subject.playerId || subject.id || update.target || 'player-self', subject);
    if (!store || !id) return false;
    const state = store.rpgStates?.[id] || window.GameModules.characterStateStore?.get?.(id, store);
    if (!state?.profile) return false;
    const raw = this.changeValue(update);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const api = window.GameModules.characterGoalSystem;
    if (!api?.applyToProfile) return false;
    const patch = { ...raw };
    const tierFromEntry = api.resolveTierFromEntry?.(raw) || {};
    Object.assign(patch, tierFromEntry);
    const changed = api.applyToProfile(state.profile, patch);
    if (!changed) return false;
    store.rpgStates = { ...(store.rpgStates || {}), [id]: state };
    window.GameModules.characterStateStore?.mergeOntoLive?.(state, store);
    if (id === 'player-self' && store.playerAspiration) {
      const goals = api.ensureOnProfile(state.profile);
      store.playerAspiration = {
        ...(store.playerAspiration || {}),
        goals: {
          ...(store.playerAspiration.goals || {}),
          short: goals.short?.content || store.playerAspiration.goals?.short || '',
          medium: goals.medium?.content || store.playerAspiration.goals?.medium || '',
          long: goals.long?.content || store.playerAspiration.goals?.long || '',
          summary: store.playerAspiration.goals?.summary || '',
          achievements: goals.achievements || [],
        },
        goalSystem: goals,
      };
    }
    return true;
  },

  parseAdaptationDelta(raw) {
    if (raw === undefined || raw === null || raw === '') return 0;
    if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw);
    const text = String(raw).trim().replace(/^\+/, '');
    const numeric = Number(text);
    return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
  },

  applyControlExperienceUpdate(store, update = {}) {
    const state = this.targetState(store, update)
      || store?.sharedControlState?.()
      || store?.rpgStates?.[update?.subject?.id]
      || null;
    if (!state?.values) return false;
    const raw = this.changeValue(update);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const needUpdate = raw.needUpdate === true || raw.needUpdate === 'true' || raw['需要更新'] === true;
    if (!needUpdate) return false;

    const stage = window.GameModules.controlExperienceStage;
    const current = state.profile.control_experience && typeof state.profile.control_experience === 'object'
      ? { ...state.profile.control_experience }
      : {
        onlineCount: 0,
        feeling: '未知',
        adaptation: 0,
        summary: '尚未经历上线操控。',
        controllerAwarenessLevel: 'unknown',
        controllerAwareness: '尚不知晓控制者是谁',
        lastUpdated: '',
      };

    const allowed = new Set(['feeling', 'adaptation', 'summary', 'controllerAwarenessLevel', 'controllerAwareness']);
    const fieldAliases = {
      feeling: 'feeling',
      操控感觉: 'feeling',
      感觉: 'feeling',
      adaptation: 'adaptation',
      适应度: 'adaptation',
      summary: 'summary',
      体验摘要: 'summary',
      摘要: 'summary',
      controllerAwarenessLevel: 'controllerAwarenessLevel',
      对控制者了解等级: 'controllerAwarenessLevel',
      controllerAwareness: 'controllerAwareness',
      对控制者了解: 'controllerAwareness',
    };
    const requested = Array.isArray(raw.updateFields) ? raw.updateFields
      : (Array.isArray(raw['更新字段']) ? raw['更新字段'] : []);
    const fields = [...new Set(
      (requested.length ? requested : Object.keys(raw))
        .map((key) => fieldAliases[String(key || '').trim()] || String(key || '').trim())
        .filter((key) => allowed.has(key)),
    )];
    if (!fields.length) return false;

    let changed = false;
    current.onlineCount = Math.max(0, Math.floor(Number(current.onlineCount) || 0) + 1);
    changed = true;

    if (fields.includes('feeling') && raw.feeling !== undefined) {
      const nextFeeling = String(raw.feeling ?? raw['操控感觉'] ?? '').trim().slice(0, 40);
      if (nextFeeling && nextFeeling !== current.feeling) {
        current.feeling = nextFeeling;
        changed = true;
      } else if (nextFeeling) current.feeling = nextFeeling;
    }
    if (fields.includes('adaptation') && (raw.adaptation !== undefined || raw['适应度'] !== undefined)) {
      const delta = this.parseAdaptationDelta(raw.adaptation ?? raw['适应度']);
      const nextAdaptation = stage?.normalizeAdaptation?.(Number(current.adaptation || 0) + delta)
        ?? Math.max(0, Math.min(100, Math.floor(Number(current.adaptation) || 0) + delta));
      if (nextAdaptation !== current.adaptation) changed = true;
      current.adaptation = nextAdaptation;
    }
    if (fields.includes('summary') && (raw.summary !== undefined || raw['体验摘要'] !== undefined)) {
      const nextSummary = String(raw.summary ?? raw['体验摘要'] ?? '').trim().slice(0, 200);
      if (nextSummary) {
        current.summary = nextSummary;
        changed = true;
      }
    }
    if (fields.includes('controllerAwarenessLevel') || fields.includes('controllerAwareness')) {
      const awareness = stage?.normalizeControllerAwareness?.({
        controllerAwarenessLevel: fields.includes('controllerAwarenessLevel')
          ? (raw.controllerAwarenessLevel ?? raw['对控制者了解等级'] ?? current.controllerAwarenessLevel)
          : current.controllerAwarenessLevel,
        controllerAwareness: fields.includes('controllerAwareness')
          ? (raw.controllerAwareness ?? raw['对控制者了解'] ?? current.controllerAwareness)
          : current.controllerAwareness,
      }, current) || {
        controllerAwarenessLevel: current.controllerAwarenessLevel || 'unknown',
        controllerAwareness: String(current.controllerAwareness || '尚不知晓控制者是谁').slice(0, 20),
      };
      if (
        awareness.controllerAwarenessLevel !== current.controllerAwarenessLevel
        || awareness.controllerAwareness !== current.controllerAwareness
      ) changed = true;
      current.controllerAwarenessLevel = awareness.controllerAwarenessLevel;
      current.controllerAwareness = awareness.controllerAwareness;
    }

    current.lastUpdated = new Date().toISOString();
    state.profile.control_experience = current;
    window.GameModules.rpgState?.stripProfileOwnedValues?.(state);
    return changed;
  },

  applySexualExperienceUpdate(store, update = {}) {
    const state = this.targetState(store, update);
    if (!state?.values) return false;
    window.GameModules.initPromptRegistry?.ensureTemplateState?.('intimacyBody', state);
    const field = String(update.field || '').trim();
    const raw = this.changeValue(update);
    const current = state.values.intimacy || {};
    const next = { ...current, sexualExperienceParts: { ...(current.sexualExperienceParts || {}) }, initializedByAi: true, source: 'AI更新', pendingAiInit: false };

    // 总次数由各部位次数求和派生，忽略 AI 单独写入总次数。
    if (/(?:^|\.)sexualExperienceCount$/u.test(field) && !(raw && typeof raw === 'object' && (raw.parts || raw.partKey))) {
      state.values.intimacy = next;
      this.syncSexualExperienceCountFromParts(state);
      this.syncSexualPartnerCountFromList(state);
      return true;
    }

    if (update.change?.mode === 'set') {
      if (raw && typeof raw === 'object' && raw.parts) {
        Object.entries(raw.parts).forEach(([key, value]) => {
          next.sexualExperienceParts[key] = Math.max(0, Math.round(Number(value) || 0));
        });
      } else if (raw && typeof raw === 'object' && raw.partKey) {
        next.sexualExperienceParts[raw.partKey] = Math.max(0, Math.round(Number(raw.count) || 0));
      } else {
        state.values.intimacy = next;
        this.syncSexualExperienceCountFromParts(state);
        this.syncSexualPartnerCountFromList(state);
        return true;
      }
    } else {
      const fieldPart = String(field).match(/sexualExperienceParts\.([^\.]+)/u)?.[1] || '';
      const parts = raw && typeof raw === 'object'
        ? (raw.parts || (raw.partKey ? { [raw.partKey]: raw.count ?? 1 } : {}))
        : (fieldPart ? { [fieldPart]: raw } : {});
      Object.entries(parts).forEach(([key, value]) => {
        next.sexualExperienceParts[key] = Math.max(0, Math.round((Number(next.sexualExperienceParts[key]) || 0) + (Number(value) || 0)));
      });
    }
    next.reason = this.reasonText(update, '现实推演确认了性经历次数变化。');
    next.updatedAt = new Date().toISOString();
    state.values.intimacy = next;
    this.syncSexualExperienceCountFromParts(state);
    this.syncSexualPartnerCountFromList(state);
    return true;
  },

  syncSexualExperienceCountFromParts(state = null) {
    if (!state?.values) return false;
    const intimacy = state.values.intimacy && typeof state.values.intimacy === 'object' ? { ...state.values.intimacy } : {};
    const parts = intimacy.sexualExperienceParts && typeof intimacy.sexualExperienceParts === 'object'
      ? intimacy.sexualExperienceParts
      : {};
    let sum = 0;
    Object.values(parts).forEach((value) => {
      if (typeof value === 'number' || typeof value === 'string') sum += Math.max(0, Math.round(Number(value) || 0));
      else if (value && typeof value === 'object') sum += Math.max(0, Math.round(Number(value.count ?? value.total ?? 0) || 0));
    });
    if (Number(intimacy.sexualExperienceCount) === sum) {
      state.values.intimacy = intimacy;
      return false;
    }
    intimacy.sexualExperienceCount = sum;
    state.values.intimacy = intimacy;
    return true;
  },

  sexualPartnerName(item = null) {
    if (item == null) return '';
    if (typeof item === 'string' || typeof item === 'number') return String(item).trim();
    if (typeof item !== 'object') return '';
    return String(item.name || item.id || item.partner || item.characterName || '').trim();
  },

  normalizeSexualPartners(list = []) {
    const seen = new Set();
    const out = [];
    for (const item of Array.isArray(list) ? list : []) {
      const name = this.sexualPartnerName(item);
      if (!name || /^(?:无|未知|--|none)$/iu.test(name)) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(typeof item === 'string' || typeof item === 'number' ? name : { ...item, name: item.name || name });
    }
    return out;
  },

  syncSexualPartnerCountFromList(state = null) {
    if (!state?.values) return false;
    const intimacy = state.values.intimacy && typeof state.values.intimacy === 'object' ? { ...state.values.intimacy } : {};
    const partners = this.normalizeSexualPartners(intimacy.sexualPartners);
    const count = partners.length;
    const prevCount = Number(intimacy.sexualPartnerCount);
    const prevPartners = intimacy.sexualPartners;
    intimacy.sexualPartners = partners;
    intimacy.sexualPartnerCount = count;
    if (JSON.stringify(prevPartners) === JSON.stringify(partners) && prevCount === count) return false;
    state.values.intimacy = intimacy;
    return true;
  },

  resolveSexualStatusFromHistory(value = {}) {
    const direct = String(value.virginityStatus || value.sexualStatus || value.status || '').trim();
    if (/^(?:处女|处男|非处女|非处男|未知)$/u.test(direct)) return direct;
    const transition = String(value.transition || value.historyText || '').trim();
    const arrow = transition.match(/(处女|处男|非处女|非处男|未知)\s*(?:→|->|➜|⇒)\s*(处女|处男|非处女|非处男|未知)/u);
    if (arrow?.[2]) return arrow[2];
    if (/非处女|非处男|破处/u.test(transition)) return /男|处男/u.test(transition) && !/非处男/u.test(transition) ? '非处男' : '非处女';
    if (/处女|处男/u.test(transition)) return /处男/u.test(transition) ? '处男' : '处女';
    return '';
  },

  applySexualHistoryUpdate(store, update = {}) {
    const state = this.targetState(store, update);
    if (!state?.values) return false;
    window.GameModules.initPromptRegistry?.ensureTemplateState?.('intimacyBody', state);
    const field = String(update.field || '').trim();
    const raw = this.changeValue(update);
    const intimacy = { ...(state.values.intimacy || {}) };
    let changed = false;

    // 经历人数只读派生，忽略单独 set。
    if (/(?:^|\.)sexualPartnerCount$/u.test(field)) {
      return this.syncSexualPartnerCountFromList(state);
    }

    if (/(?:^|\.)sexualPartners$/u.test(field)) {
      const current = this.normalizeSexualPartners(intimacy.sexualPartners);
      const next = this.normalizeSexualPartners(this.nextValue(current, update));
      if (JSON.stringify(current) !== JSON.stringify(next)) {
        intimacy.sexualPartners = next;
        changed = true;
      }
    } else if (/(?:^|\.)sexualStatus$/u.test(field)) {
      const nextStatus = String(typeof raw === 'object' ? (raw.sexualStatus || raw.status || raw.value || '') : raw || '').trim();
      if (nextStatus && intimacy.sexualStatus !== nextStatus) {
        intimacy.sexualStatus = nextStatus;
        changed = true;
      }
    } else {
      const path = field.replace(/^values\./u, '');
      const historyPath = path.startsWith('intimacy.') ? path.slice('intimacy.'.length) : path;
      const currentHistory = historyPath === 'sexualHistory'
        ? (intimacy.sexualHistory && typeof intimacy.sexualHistory === 'object' ? intimacy.sexualHistory : {})
        : this.get(intimacy, historyPath);
      const nextHistory = this.nextValue(currentHistory, update);
      if (nextHistory !== undefined && JSON.stringify(currentHistory) !== JSON.stringify(nextHistory)) {
        if (historyPath === 'sexualHistory') intimacy.sexualHistory = nextHistory;
        else this.set(intimacy, historyPath, nextHistory);
        changed = true;
      }

      const historyValue = historyPath === 'sexualHistory'
        ? (intimacy.sexualHistory || {})
        : (raw && typeof raw === 'object' ? raw : {});
      const status = this.resolveSexualStatusFromHistory({
        ...(historyValue && typeof historyValue === 'object' ? historyValue : {}),
        ...(raw && typeof raw === 'object' ? raw : {}),
      });
      if (status && intimacy.sexualStatus !== status) {
        intimacy.sexualStatus = status;
        changed = true;
      }

      const partnerRaw = (raw && typeof raw === 'object' ? (raw.partner || raw.firstVaginalPartner) : null)
        || (historyValue && typeof historyValue === 'object' ? (historyValue.partner || historyValue.firstVaginalPartner) : null);
      const partnerName = this.sexualPartnerName(partnerRaw);
      if (partnerName && !/^(?:无|未知|--|none|配偶)$/iu.test(partnerName)) {
        const partners = this.normalizeSexualPartners([...(intimacy.sexualPartners || []), partnerRaw || partnerName]);
        if (JSON.stringify(partners) !== JSON.stringify(this.normalizeSexualPartners(intimacy.sexualPartners))) {
          intimacy.sexualPartners = partners;
          changed = true;
        }
      }
    }

    intimacy.initializedByAi = true;
    intimacy.source = 'AI更新';
    intimacy.pendingAiInit = false;
    intimacy.reason = this.reasonText(update, intimacy.reason || '现实推演确认了性历史变化。');
    intimacy.updatedAt = new Date().toISOString();
    state.values.intimacy = intimacy;
    const synced = this.syncSexualPartnerCountFromList(state);
    return changed || synced;
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
    const nextText = entries.map((item) => { const head = String(item.relation || '') + '：' + String(item.name || ''); return item.detail ? (head + '（' + String(item.detail) + '）') : head; }).join('；').slice(0, 1200);
    if (!nextText || nextText === oldText) return false;
    state.profile.relationships = nextText;
    state.profile.roleCardUpdatedAt = new Date().toISOString();
    return true;
  },

  relationshipEntriesFromText(text = '') {
    return String(text || '').split(/[；\n]+/).map((part) => {
      const raw = String(part || '').trim();
      if (!raw) return null;
      const match = raw.match(/^([^：]+)：(.*?)(?:（([^（）()]*)）)?$/u);
      if (!match) return { relation: '关系', name: raw, detail: '' };
      return { relation: match[1].trim(), name: match[2].trim(), detail: String(match[3] || '').trim() };
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
      (update._changedStateIds || []).forEach((id) => { if (id) changed.add(id); });
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
