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
    const reason = first && typeof first === 'object' ? first : { trigger: String(first || ''), evidence: String(first || '') };
    const fallback = update.reason || update.evidence || update.trigger || update.description || update.summary || '';
    return { ...reason, trigger: reason.trigger || fallback, evidence: reason.evidence || fallback };
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

  metricGenericFromLegacy(result = {}) {
    const out = [];
    for (const group of Array.isArray(result.characterMetricUpdates) ? result.characterMetricUpdates : []) {
      if (!group || typeof group !== 'object' || (group.field && group.change)) continue;
      const rawTarget = group.target || group.targetId || group.characterId || group.character || group.name || group.subject?.characterId || group.subject?.id || group.subject?.name || 'player-self';
      const subject = { ...(group.subject || {}), type: group.subject?.type || (rawTarget === 'player-self' ? 'player' : 'character'), id: rawTarget, name: group.subject?.name || group.name || group.character || '' };
      (Array.isArray(group.emotions) ? group.emotions : []).forEach((item) => {
        if (!item?.key) return;
        out.push({ updateType: 'emotion', subject, field: `metrics.emotions.${item.key}`, change: { mode: 'delta', value: window.GameModules.metrics.metricDeltaValue?.(item) ?? item.delta ?? 0, status: item.status || '' }, reasons: [{ trigger: item.trigger || item.reason || '现实推演情绪变化', evidence: item.reason || item.evidence || item.status || '', confidence: 'confirmed' }] });
      });
      (Array.isArray(group.playerFeelings) ? group.playerFeelings : []).forEach((item) => {
        if (!item?.key) return;
        out.push({ updateType: 'feeling', subject, field: `metrics.playerFeelings.${item.key}`, change: { mode: 'delta', value: window.GameModules.metrics.metricDeltaValue?.(item) ?? item.delta ?? 0, status: item.status || '' }, reasons: [{ trigger: item.trigger || item.reason || '现实推演感觉变化', evidence: item.reason || item.evidence || item.status || '', confidence: 'confirmed' }] });
      });
    }
    return out;
  },

  genericToMetricUpdates(updates = [], type = 'emotion', store = null) {
    const grouped = new Map();
    const wanted = type === 'feeling' ? 'feeling' : 'emotion';
    const bucket = wanted === 'feeling' ? 'playerFeelings' : 'emotions';
    for (const item of Array.isArray(updates) ? updates : []) {
      if (item?.updateType !== wanted) continue;
      const subject = item.subject || {};
      const rawTarget = subject.type === 'player' ? (subject.playerId || subject.id || 'player-self') : (subject.characterId || subject.id || subject.name || item.target || item.character || item.name || 'player-self');
      const target = this.canonicalSubjectId(store, rawTarget);
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
      characterMetricUpdates: Array.from(byTarget.values()),
      itemActions: [...(result.itemActions || []), ...this.genericToItemActions(updates)],
      factionUpdates: [...(result.factionUpdates || []), ...this.genericToFactionUpdates(updates)],
    };
  },
});
