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
    const key = String(update.field || '').split('.').filter(Boolean).at(-1) || update.name || '';
    return window.GameModules.metrics?.cleanMetricReason?.(this.reasonText(update, fallback), key) || this.reasonText(update, fallback);
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
        out.push({ updateType: 'emotion', subject, field: `metrics.emotions.${item.key}`, change: { mode: 'delta', value: window.GameModules.metrics.metricDeltaValue?.(item) ?? item.delta ?? 0, status: String(item.status || '').slice(0, 180) }, reasons: [{ trigger: item.trigger || item.reason || '现实推演情绪变化', evidence: item.reason || item.evidence || '', confidence: 'confirmed' }] });
      });
      (Array.isArray(group.playerFeelings) ? group.playerFeelings : []).forEach((item) => {
        if (!item?.key) return;
        out.push({ updateType: 'feeling', subject, field: `metrics.playerFeelings.${item.key}`, change: { mode: 'delta', value: window.GameModules.metrics.metricDeltaValue?.(item) ?? item.delta ?? 0, status: String(item.status || '').slice(0, 180) }, reasons: [{ trigger: item.trigger || item.reason || '现实推演感觉变化', evidence: item.reason || item.evidence || '', confidence: 'confirmed' }] });
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
      const temporary = item.temporary === true || /(^|\.)temporary(?:Emotions|PlayerFeelings|\.|$)/u.test(String(item.field || ''));
      grouped.get(target)[bucket].push({ key, delta: this.deltaValue(item), status: String(item.change?.status ?? item.status ?? item.程度 ?? item.解释 ?? '').slice(0, 180), reason: this.metricReasonText(item), temporary });
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

  legacyFactionUpdateToGeneric(item = {}) {
    const action = String(item?.action || item?.method || 'upsert').trim();
    const name = String(item.factionName || item.name || '势力变化').trim();
    const reason = this.reasonText(item, String(item.reason || 'legacy factionUpdates 迁移'));
    const reasons = [{ trigger: reason, evidence: reason, confidence: 'confirmed' }];
    if (action === 'updateStructure') {
      return {
        updateType: 'faction-structure',
        subject: { type: 'faction', name, factionId: name },
        field: 'structure',
        change: { mode: 'upsert', value: item.value || item.structure || item },
        reasons,
      };
    }
    if (action === 'addFactionPosition') {
      return {
        updateType: 'membership',
        subject: { type: 'character', characterName: item.characterName || item.character || '未知', name: item.characterName || item.character },
        field: 'values.memberships',
        change: {
          mode: 'upsert',
          value: {
            orgName: name,
            factionName: name,
            title: item.position || item.title || '成员',
            department: item.department || '',
          },
        },
        reasons,
      };
    }
    return {
      updateType: 'faction-overview',
      subject: { type: 'faction', name, factionId: name },
      field: 'overview',
      change: { mode: action === 'upsert' ? 'upsert' : 'set', value: item.value || item },
      reasons,
    };
  },

  migrateLegacyFactionUpdates(result = {}) {
    const legacy = Array.isArray(result.factionUpdates) ? result.factionUpdates.filter(Boolean) : [];
    if (!legacy.length) return result;
    console.warn('[orgTerritory] factionUpdates 已废弃，已自动迁移为 genericUpdates：', legacy.length, '条');
    const generic = Array.isArray(result.genericUpdates) ? result.genericUpdates.slice() : [];
    const keys = new Set(generic.map((item) => `${item.updateType}:${JSON.stringify(item.subject || {})}:${item.field || ''}`));
    legacy.forEach((item) => {
      const converted = this.legacyFactionUpdateToGeneric(item);
      const key = `${converted.updateType}:${JSON.stringify(converted.subject || {})}:${converted.field || ''}`;
      if (keys.has(key)) return;
      generic.push(converted);
      keys.add(key);
    });
    return { ...result, genericUpdates: generic, factionUpdates: [] };
  },

  orgNamesFromGenericUpdates(updates = [], store = null) {
    const names = [];
    const ot = window.GameModules.orgTerritory;
    (Array.isArray(updates) ? updates : []).forEach((item) => {
      const type = String(item?.updateType || '');
      const subject = item.subject || {};
      const value = item.change?.value || {};
      if (/^faction-|org-status|membership|territory-control/u.test(type)) {
        [subject.name, subject.factionName, subject.factionId, subject.orgId, value.name, value.factionName].filter(Boolean).forEach((n) => names.push(String(n)));
      }
      if (type === 'territory-control') {
        const eff = ot?.orgNameById?.(store, value.effectiveOrgId || value.effective);
        const claim = ot?.orgNameById?.(store, value.claimOrgId || value.claim);
        if (eff) names.push(eff);
        if (claim && claim !== eff) names.push(claim);
      }
      if (type === 'membership') {
        [value.orgName, value.factionName, ot?.orgNameById?.(store, value.orgId)].filter(Boolean).forEach((n) => names.push(String(n)));
      }
    });
    return [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  },

  expandGenericForLegacy(result = {}, store = null) {
    const updates = Array.isArray(result.genericUpdates) ? result.genericUpdates : [];
    if (!updates.length && !(result.factionUpdates || []).length) return result;
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
      factionUpdates: [],
    };
  },
});
