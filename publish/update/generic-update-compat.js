window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry = window.GameModules.updateRegistry || {};

Object.assign(window.GameModules.updateRegistry, {
  vitalKeyFromField(field = '') {
    const key = String(field || '').split('.').filter(Boolean).at(-1) || '';
    const aliases = { vitality: 'vitality', 生命力: 'vitality', 生命值: 'vitality', 健康: 'vitality', health: 'vitality', stamina: 'stamina_pool', 精力: 'stamina_pool', 精力池: 'stamina_pool', 体力: 'stamina_pool', 饱食度: 'satiety', 饱食: 'satiety', satiety: 'satiety', 水分: 'hydration', 口渴: 'hydration', 水合: 'hydration', hydration: 'hydration', 疲劳: 'fatigue', 疲劳度: 'fatigue', fatigue: 'fatigue', 精神稳定: 'mental_stability', 精神稳定度: 'mental_stability', mental_stability: 'mental_stability' };
    return aliases[key] || key;
  },

  cleanReasonText(value = '') {
    return String(value || '').trim().replace(/^(?:证据|evidence)[:：]\s*/iu, '');
  },

  reasonTexts(update = {}) {
    const list = Array.isArray(update.reasons) ? update.reasons : [];
    const texts = list.flatMap((item) => {
      if (!item) return [];
      if (typeof item === 'object') return [item.trigger, item.evidence];
      return [item];
    });
    texts.push(update.reason, update.trigger, update.evidence, update.description, update.summary);
    return [...new Set(texts.map((item) => this.cleanReasonText(item)).filter(Boolean))];
  },

  reasonObject(update = {}) {
    const texts = this.reasonTexts(update);
    return { trigger: texts[0] || '', evidence: texts.slice(1).join('，') || texts[0] || '' };
  },

  reasonText(update = {}, fallback = '现实推演结算。') {
    return this.reasonTexts(update).join('，').slice(0, 180) || fallback;
  },

  metricReasonText(update = {}, fallback = '现实推演结算。') {
    return this.reasonText(update, fallback);
  },

  deltaValue(update = {}) {
    const value = update.change?.value ?? update.value ?? 0;
    return Number(value) || 0;
  },

  genericToVitalUpdates(updates = [], store = null) {
    return (Array.isArray(updates) ? updates : []).filter((item) => item?.updateType === 'vital').map((item) => {
      const subject = item.subject || {};
      const rawTarget = subject.type === 'player' ? (subject.playerId || subject.id || 'player-self') : (subject.characterId || subject.id || subject.name || item.target || 'player-self');
      const target = this.canonicalSubjectId(store, rawTarget);
      return { key: this.vitalKeyFromField(item.field), delta: this.deltaValue(item), reason: this.reasonText(item), target, subject: { ...subject, id: target } };
    }).filter((item) => ['vitality', 'stamina_pool', 'satiety', 'hydration', 'fatigue', 'mental_stability'].includes(item.key));
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
      grouped.get(target)[bucket].push({ key, delta: this.deltaValue(item), status: item.change?.status || '', reason: this.metricReasonText(item) });
    }
    return Array.from(grouped.values());
  },

  genericToItemActions(updates = []) {
    return (Array.isArray(updates) ? updates : []).filter((item) => item?.updateType === 'item').map((item) => {
      const subject = item.subject || {}, change = item.change || {}, value = change.value;
      const name = item.name || String(item.field || '').split('.').filter(Boolean).at(-1) || value?.name || '物品变化';
      return {
        action: change.mode || 'upsert', target: subject.characterId || subject.playerId || subject.id || 'player-self', from: change.fromValue, to: change.toValue,
        itemName: name, quantity: value?.quantity || 1, item: value && typeof value === 'object' ? value : { name, kind: /wearing|穿着/u.test(item.field || '') ? '穿着' : '物品', description: String(value ?? '') },
        reason: this.reasonText(item),
      };
    });
  },

  genericToFactionUpdates(updates = []) {
    return (Array.isArray(updates) ? updates : []).filter((item) => /^faction-/u.test(item?.updateType || '')).map((item) => {
      const subject = item.subject || {}, change = item.change || {}, value = change.value;
      const name = subject.name || subject.factionId || subject.id || item.name || '势力变化';
      return {
        action: item.updateType === 'faction-structure' ? 'updateStructure' : (change.mode || 'upsert'), factionName: name,
        name, type: value?.type || subject.type || '势力', position: value?.title || value?.position || value?.name || '', value,
        reason: this.reasonText(item),
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
      vitalUpdates: [...(result.vitalUpdates || []), ...this.genericToVitalUpdates(updates, store)],
      characterMetricUpdates: Array.from(byTarget.values()),
      itemActions: [...(result.itemActions || []), ...this.genericToItemActions(updates)],
      factionUpdates: [...(result.factionUpdates || []), ...this.genericToFactionUpdates(updates)],
    };
  },
});
