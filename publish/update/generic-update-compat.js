window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry = window.GameModules.updateRegistry || {};

Object.assign(window.GameModules.updateRegistry, {
  vitalKeyFromField(field = '') {
    const key = String(field || '').split('.').filter(Boolean).at(-1) || '';
    const aliases = { stamina: 'stamina_pool', 饱食度: 'satiety', 水分: 'hydration', 疲劳度: 'fatigue', 精神稳定: 'mental_stability' };
    return aliases[key] || key;
  },

  reasonObject(update = {}) {
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    return first && typeof first === 'object' ? first : { trigger: String(first || ''), evidence: String(first || '') };
  },

  deltaValue(update = {}) {
    const value = update.change?.value ?? update.value ?? 0;
    return Number(value) || 0;
  },

  genericToVitalUpdates(updates = []) {
    return (Array.isArray(updates) ? updates : []).filter((item) => item?.updateType === 'vital').map((item) => {
      const reason = this.reasonObject(item);
      return { key: this.vitalKeyFromField(item.field), delta: this.deltaValue(item), reason: reason.evidence || reason.trigger || '现实推演结算。' };
    }).filter((item) => ['stamina_pool', 'satiety', 'hydration', 'fatigue', 'mental_stability'].includes(item.key));
  },

  canonicalSubjectId(store = null, id = 'player-self') {
    const state = store?.itemSkillState?.(id) || (id === 'player-self' ? store?.playerIdentityState?.() : null);
    return state?.id || id || 'player-self';
  },

  genericToMetricUpdates(updates = [], type = 'emotion', store = null) {
    const grouped = new Map();
    const wanted = type === 'feeling' ? 'feeling' : 'emotion';
    const bucket = wanted === 'feeling' ? 'playerFeelings' : 'emotions';
    for (const item of Array.isArray(updates) ? updates : []) {
      if (item?.updateType !== wanted) continue;
      const subject = item.subject || {};
      const target = this.canonicalSubjectId(store, subject.characterId || subject.playerId || subject.id || item.target || 'player-self');
      const key = String(item.field || '').split('.').filter(Boolean).at(-1) || item.name;
      if (!key) continue;
      if (!grouped.has(target)) grouped.set(target, { target, subject: { ...subject, id: target }, emotions: [], playerFeelings: [] });
      const reason = this.reasonObject(item);
      grouped.get(target)[bucket].push({ key, delta: this.deltaValue(item), status: item.change?.status || '', reason: reason.evidence || reason.trigger || '现实推演结算。' });
    }
    return Array.from(grouped.values());
  },

  genericToItemActions(updates = []) {
    return (Array.isArray(updates) ? updates : []).filter((item) => item?.updateType === 'item').map((item) => {
      const subject = item.subject || {}, change = item.change || {}, value = change.value;
      const reason = this.reasonObject(item);
      const name = item.name || String(item.field || '').split('.').filter(Boolean).at(-1) || value?.name || '物品变化';
      return {
        action: change.mode || 'upsert', target: subject.characterId || subject.playerId || subject.id || 'player-self', from: change.fromValue, to: change.toValue,
        itemName: name, quantity: value?.quantity || 1, item: value && typeof value === 'object' ? value : { name, kind: /wearing|穿着/u.test(item.field || '') ? '穿着' : '物品', description: String(value ?? '') },
        reason: reason.evidence || reason.trigger || '现实推演结算。',
      };
    });
  },

  genericToFactionUpdates(updates = []) {
    return (Array.isArray(updates) ? updates : []).filter((item) => /^faction-/u.test(item?.updateType || '')).map((item) => {
      const subject = item.subject || {}, change = item.change || {}, value = change.value;
      const reason = this.reasonObject(item);
      const name = subject.name || subject.factionId || subject.id || item.name || '势力变化';
      return {
        action: item.updateType === 'faction-structure' ? 'updateStructure' : (change.mode || 'upsert'), factionName: name,
        name, type: value?.type || subject.type || '势力', position: value?.title || value?.position || value?.name || '', value,
        reason: reason.evidence || reason.trigger || '现实推演结算。',
      };
    });
  },

  expandGenericForLegacy(result = {}, store = null) {
    const updates = Array.isArray(result.genericUpdates) ? result.genericUpdates : [];
    if (!updates.length) return result;
    const emotions = this.genericToMetricUpdates(updates, 'emotion', store);
    const feelings = this.genericToMetricUpdates(updates, 'feeling', store);
    const byTarget = new Map();
    [...emotions, ...feelings].forEach((group) => {
      const old = byTarget.get(group.target) || { target: group.target, subject: group.subject, emotions: [], playerFeelings: [] };
      old.emotions.push(...(group.emotions || []));
      old.playerFeelings.push(...(group.playerFeelings || []));
      byTarget.set(group.target, old);
    });
    return {
      ...result,
      vitalUpdates: [...(result.vitalUpdates || []), ...this.genericToVitalUpdates(updates)],
      characterMetricUpdates: [...(result.characterMetricUpdates || []), ...Array.from(byTarget.values())],
      itemActions: [...(result.itemActions || []), ...this.genericToItemActions(updates)],
      factionUpdates: [...(result.factionUpdates || []), ...this.genericToFactionUpdates(updates)],
    };
  },
});
