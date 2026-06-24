window.GameModules = window.GameModules || {};

window.GameModules.intimacyBodyState = {
  defaults: window.GameModules.initDefaults?.intimacyBody,
  partLabels: window.GameModules.initDefaults?.intimacyBody?.partLabels || {},
  sexPartLabels: window.GameModules.initDefaults?.intimacyBody?.sexPartLabels || {},
  sexPartPrompts: window.GameModules.initDefaults?.intimacyBody?.sexPartPrompts || {},
  fieldMeta: window.GameModules.initDefaults?.intimacyBody?.fieldMeta || {},
  valueDefaults: window.GameModules.initDefaults?.intimacyBody?.valueDefaults || {},
  sexPartDefaults: window.GameModules.initDefaults?.intimacyBody?.sexualExperiencePartDefaults || {},
  bodyStatusDefaults: window.GameModules.initDefaults?.intimacyBody?.bodyStatusDefaults || {},
  intimacyDefaults: window.GameModules.initDefaults?.intimacyBody?.intimacyDefaults || {},
  sexualHistoryDefaults: window.GameModules.initDefaults?.intimacyBody?.sexualHistoryDefaults || {},
  partKey(raw = '') {
    const text = String(raw || '').trim();
    const map = { overall: 'overall', mouth: 'mouth', chest: 'chest', genital: 'genital', anus: 'anus', hips: 'hips', limbs: 'limbs', skin: 'skin', other: 'other', 口部: 'mouth', 胸部: 'chest', 阴部: 'genital', 私处: 'genital', 肛部: 'anus', 臀部: 'hips', 四肢: 'limbs', 皮肤: 'skin', 整体: 'overall' };
    if (map[text]) return map[text];
    if (/口|嘴/.test(text)) return 'mouth';
    if (/胸/.test(text)) return 'chest';
    if (/阴|私处|生殖/.test(text)) return 'genital';
    if (/肛/.test(text)) return 'anus';
    if (/臀/.test(text)) return 'hips';
    if (/皮肤/.test(text)) return 'skin';
    return 'other';
  },
  sexPartKey(raw = '') {
    const text = String(raw || '').trim();
    const map = { genital: 'genital', chest: 'chest', lips: 'lips', mouth: 'mouth', oralAction: 'oralAction', oralSex: 'oralSex', oralInternalFinish: 'oralInternalFinish', genitalEntry: 'genitalEntry', vaginalInsertion: 'vaginalInsertion', vaginalInternalFinish: 'vaginalInternalFinish', anus: 'anus', analEntry: 'analEntry', analSex: 'analSex', analInternalFinish: 'analInternalFinish', legs: 'legs', hips: 'hips', hands: 'hands', skin: 'skin', other: 'other', 阴部: 'genital', 胸部: 'chest', 嘴唇: 'lips', 唇部: 'lips', 口部: 'mouth', 口部行为: 'oralAction', 口交: 'oralSex', 口交中出: 'oralInternalFinish', 阴部进入: 'genitalEntry', 阴部插入: 'vaginalInsertion', 阴部中出: 'vaginalInternalFinish', 肛门: 'anus', 肛部: 'anus', 肛部进入: 'analEntry', 肛交: 'analSex', 肛交中出: 'analInternalFinish', 腿部: 'legs', 臀部: 'hips', 手部: 'hands', 皮肤: 'skin' };
    if (map[text]) return map[text];
    if (/嘴|唇|吻/.test(text)) return 'lips';
    if (/口/.test(text)) return 'mouth';
    if (/胸/.test(text)) return 'chest';
    if (/阴|私处|生殖/.test(text)) return 'genital';
    if (/肛/.test(text)) return 'anus';
    if (/腿/.test(text)) return 'legs';
    if (/臀/.test(text)) return 'hips';
    if (/手/.test(text)) return 'hands';
    if (/皮肤/.test(text)) return 'skin';
    return 'other';
  },
  defaultBodyDescription(key) {
    return this.bodyStatusDefaults[key]?.description || this.valueDefaults.bodyDescription || '';
  },
  defaultBodyStatus() { return this.defaults?.bodyStatus?.() || {}; },
  defaultBodyStatusEntry(key) { return this.defaults?.bodyStatusEntry?.(key) || {}; },
  defaultIntimacy() { return this.defaults?.intimacy?.() || {}; },
  defaultInitialMeeting() { return this.defaults?.initialMeeting?.() || {}; },
  defaultSexParts() { return this.defaults?.sexualExperienceParts?.() || {}; },
  meta(key) { return this.fieldMeta?.[key] || {}; },
  text(key, fallback = '') { return this.defaults?.displayTexts?.[key] || fallback; },
  format(name, value, fallback = '') { return this.defaults?.[name]?.(value) || fallback; },
  ensure(state) {
    if (!state?.values) return false;
    let changed = false;
    const values = state.values;
    if (!values.intimacy || typeof values.intimacy !== 'object') { values.intimacy = this.defaultIntimacy(); changed = true; }
    if (!values.intimacy.sexualStatus) { values.intimacy.sexualStatus = this.sexualHistoryDefaults.sexualStatus; changed = true; }
    if (!Number.isFinite(Number(values.intimacy.sexualPartnerCount))) { values.intimacy.sexualPartnerCount = this.sexualHistoryDefaults.sexualPartnerCount; changed = true; }
    if (!Array.isArray(values.intimacy.sexualPartners)) { values.intimacy.sexualPartners = [...(this.sexualHistoryDefaults.sexualPartners || [])]; changed = true; }
    if (!Number.isFinite(Number(values.intimacy.sexualExperienceCount))) { values.intimacy.sexualExperienceCount = this.intimacyDefaults.sexualExperienceCount; changed = true; }
    if (!values.intimacy.sexualExperienceParts || typeof values.intimacy.sexualExperienceParts !== 'object') { values.intimacy.sexualExperienceParts = this.defaultSexParts(); changed = true; }
    for (const key of Object.keys(this.sexPartLabels)) if (!Number.isFinite(Number(values.intimacy.sexualExperienceParts[key]))) { values.intimacy.sexualExperienceParts[key] = this.sexPartDefaults[key]; changed = true; }
    if (!values.bodyStatus || typeof values.bodyStatus !== 'object' || Array.isArray(values.bodyStatus)) { values.bodyStatus = this.defaultBodyStatus(); changed = true; }
    for (const [key, label] of Object.entries(this.partLabels)) {
      if (!values.bodyStatus[key]) { values.bodyStatus[key] = this.defaultBodyStatusEntry(key); changed = true; }
      else if (!values.bodyStatus[key].description && !values.bodyStatus[key]['描述状态']) { values.bodyStatus[key].description = this.defaultBodyDescription(key); changed = true; }
    }
    return changed;
  },
  adultConfirmed(state) { const age = Number(state?.values?.age ?? state?.profile?.age); return Number.isFinite(age) && age >= 18; },
  targetState(store, update = {}) { const subject = update.subject || {}; const id = subject.characterId || subject.playerId || subject.id || update.target || 'player-self'; return store?.itemSkillState?.(id) || (id === 'player-self' ? store?.playerIdentityState?.() : null); },
  safeStatus(value = '') {
    const text = String(value?.status || value || '').trim();
    if (/疼|痛/.test(text)) return '疼痛';
    if (/伤|破|裂|出血/.test(text)) return '受伤';
    if (/疲|酸|累/.test(text)) return '疲劳';
    if (/清洁|干净|护理/.test(text)) return text.includes('护理') ? '需要护理' : '清洁';
    if (/不适|异常|炎|病/.test(text)) return '不适';
    if (/稳定|正常|无异常/.test(text)) return this.valueDefaults.bodyStatus;
    return text && text.length <= 8 && !/[插入性交性爱做爱射精高潮]/u.test(text) ? text : this.text('statusChange');
  },
  reason(update = {}) { const reasons = Array.isArray(update.reasons) ? update.reasons : []; return reasons.map((item) => item.evidence || item.trigger || item.reason).filter(Boolean).join('；') || update.reason || '现实推演确认状态变化。'; },
  applySexual(state, update = {}) {
    if (!this.adultConfirmed(state)) return false;
    this.ensure(state);
    const mode = update.change?.mode || 'set', raw = update.change?.value ?? update.value ?? 0;
    const before = JSON.stringify(state.values.intimacy);
    const obj = raw && typeof raw === 'object' ? raw : null;
    const fieldPart = String(update.field || '').includes('sexualExperienceParts.') ? update.field.split('.').pop() : '';
    if (obj?.parts && typeof obj.parts === 'object') Object.entries(obj.parts).forEach(([part, count]) => this.setSexPart(state, part, count, mode));
    if (obj?.partKey || obj?.part || fieldPart) this.setSexPart(state, obj?.partKey || obj?.part || fieldPart, obj?.count ?? obj?.value ?? raw, mode);
    const totalValue = obj ? (obj.totalDelta ?? obj.total ?? obj.count ?? null) : raw;
    if (totalValue !== null && totalValue !== undefined && !fieldPart) this.setSexTotal(state, totalValue, mode);
    state.values.intimacy.updatedAt = new Date().toISOString();
    state.values.intimacy.reason = String(this.reason(update)).slice(0, 120);
    return before !== JSON.stringify(state.values.intimacy);
  },
  setSexTotal(state, value, mode) {
    const current = Math.max(0, Math.round(Number(state.values.intimacy.sexualExperienceCount) || 0));
    const next = Math.max(0, Math.round(Number(value) || 0));
    state.values.intimacy.sexualExperienceCount = mode === 'delta' ? current + next : next;
  },
  setSexPart(state, part, value, mode) {
    const key = this.sexPartKey(part);
    const current = Math.max(0, Math.round(Number(state.values.intimacy.sexualExperienceParts[key]) || 0));
    const next = Math.max(0, Math.round(Number(value) || 0));
    state.values.intimacy.sexualExperienceParts[key] = mode === 'delta' ? current + next : next;
  },
  applySexualHistory(state, update = {}) {
    if (!this.adultConfirmed(state)) return false;
    this.ensure(state);
    const before = JSON.stringify(state.values.intimacy), raw = update.change?.value ?? update.value ?? {}, obj = raw && typeof raw === 'object' ? raw : {};
    const confirmed = obj.vaginalInsertionConfirmed === true || String(update.field || '').includes('vaginalInsertion');
    if (obj.sexualStatus || update.field === 'intimacy.sexualStatus') state.values.intimacy.sexualStatus = String(obj.sexualStatus || raw || this.valueDefaults.sexualStatus).slice(0, 12);
    if (confirmed) {
      const names = [...(Array.isArray(obj.sexualPartners) ? obj.sexualPartners : []), obj.partnerName].map((x) => String(x || '').trim()).filter(Boolean);
      state.values.intimacy.sexualPartners = [...new Set([...(state.values.intimacy.sexualPartners || []), ...names])];
      const explicitCount = Number(obj.sexualPartnerCount ?? obj.count);
      state.values.intimacy.sexualPartnerCount = state.values.intimacy.sexualPartners.length || Math.max(0, Math.round(explicitCount || 0));
      if (state.values.intimacy.sexualPartnerCount > 0 && state.values.intimacy.sexualStatus === this.valueDefaults.sexualStatus) state.values.intimacy.sexualStatus = this.valueDefaults.sexualStatusChanged;
    }
    state.values.intimacy.updatedAt = new Date().toISOString();
    state.values.intimacy.reason = String(this.reason(update)).slice(0, 120);
    return before !== JSON.stringify(state.values.intimacy);
  },
  applyBody(state, update = {}) {
    this.ensure(state);
    const value = update.change?.value ?? update.value ?? {}, key = this.partKey(value.partKey || value.part || update.field?.split('.')?.pop());
    const before = JSON.stringify(state.values.bodyStatus[key] || {});
    const description = String(value['描述状态'] || value.description || value.desc || value.detail || '').trim().slice(0, 80);
    state.values.bodyStatus[key] = { partKey: key, part: this.partLabels[key] || value.part || this.text('otherPart'), status: this.safeStatus(value), description, reason: String(this.reason(update)).slice(0, 120), updatedAt: new Date().toISOString() };
    return before !== JSON.stringify(state.values.bodyStatus[key]);
  },
  async applyGeneric(store, updates = []) {
    const changed = new Set();
    for (const update of Array.isArray(updates) ? updates : []) {
      const state = this.targetState(store, update);
      if (!state?.values) continue;
      const type = String(update.updateType || '');
      const ok = type === 'sexual-experience' ? this.applySexual(state, update) : (type === 'sexual-history' ? this.applySexualHistory(state, update) : (type === 'body-status' ? this.applyBody(state, update) : false));
      if (ok) changed.add(state.id);
    }
    for (const id of changed) { const state = store.rpgStates?.[id] || window.GameModules.sqliteSave.getCharacterState?.(id); if (!state) continue; store.rpgStates = { ...(store.rpgStates || {}), [id]: state }; await window.GameModules.sqliteSave.saveCharacterState(state); }
  },
  experienceRows(intimacy = {}) {
    const parts = intimacy.sexualExperienceParts || {}, initialParts = intimacy.sexualExperienceInitialParts || {};
    return Object.entries(this.sexPartLabels).map(([key, label]) => {
      const total = Math.max(0, Math.round(Number(parts[key]) || 0));
      const initial = Math.max(0, Math.round(Number(initialParts[key]) || 0));
      const later = Math.max(0, total - initial);
      return { partKey: key, name: label, count: total, initialCount: initial, laterCount: later, prompt: this.sexPartPrompts[key], type: '性经验分类' };
    });
  },
  fields(state = {}) {
    state = state || {};
    this.ensure(state);
    const p = state.profile || {}, values = state.values || {}, worldTag = p.work || state.worldTag || '原创世界';
    const count = Math.max(0, Math.round(Number(values.intimacy?.sexualExperienceCount) || 0));
    const partnerCount = Math.max(0, Math.round(Number(values.intimacy?.sexualPartnerCount) || 0));
    const partners = Array.isArray(values.intimacy?.sexualPartners) ? values.intimacy.sexualPartners : [];
    const noPartner = this.text('noPartner'), adultUnconfirmed = this.text('adultUnconfirmed');
    const initial = this.defaultInitialMeeting(), initialBody = initial.bodyStatus || {};
    const expRows = this.experienceRows(values.intimacy);
    const initialExpRows = this.experienceRows({ sexualExperienceParts: initial.sexualExperienceParts || {} }).map((item) => this.format('formatInitialExperience', item));
    const rows = Object.values(values.bodyStatus || {}).map((item) => {
      const init = initialBody[item.partKey] || this.defaultBodyStatusEntry(item.partKey);
      const part = item.part || this.partLabels[item.partKey] || this.text('otherPart');
      return { partKey: item.partKey, part, status: item.status || this.valueDefaults.bodyStatus, description: item.description || item['描述状态'] || '', reason: item.reason || this.text('currentRecord'), updatedAt: item.updatedAt || '', name: part, type: this.meta('bodyStatus').kind, initialMeeting: this.format('formatInitialBody', { part: init.part || part, status: init.status || this.valueDefaults.bodyStatus, description: init.description || '' }) };
    });
    const intimacyReason = values.intimacy?.reason;
    return [
      { key: 'sexualStatus', stateId: state.id || '', ...this.meta('sexualStatus'), value: values.intimacy?.sexualStatus || initial.sexualStatus, raw: values.intimacy?.sexualStatus || initial.sexualStatus, initialMeeting: initial.sexualStatus, reason: intimacyReason || this.meta('sexualStatus').reasonFallback, worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: true },
      { key: 'sexualPartnerCount', stateId: state.id || '', ...this.meta('sexualPartnerCount'), value: this.format('formatPartnerCount', partnerCount), raw: partnerCount, initialMeeting: this.format('formatPartnerCount', initial.sexualPartnerCount), reason: intimacyReason || this.meta('sexualPartnerCount').reasonFallback, worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: true },
      { key: 'sexualPartners', stateId: state.id || '', ...this.meta('sexualPartners'), value: partners.length ? partners : [noPartner], raw: partners, initialMeeting: initial.sexualPartners, reason: intimacyReason || this.meta('sexualPartners').reasonFallback, worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: true },
      { key: 'sexualExperienceCount', stateId: state.id || '', ...this.meta('sexualExperienceCount'), value: this.adultConfirmed(state) ? this.format('formatExperienceCount', count) : adultUnconfirmed, raw: count, initialMeeting: this.format('formatExperienceCount', initial.sexualExperienceCount), reason: intimacyReason || this.meta('sexualExperienceCount').reasonFallback, worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: true },
      { key: 'sexualExperienceParts', stateId: state.id || '', ...this.meta('sexualExperienceParts'), value: expRows.map((item) => this.format('formatExperienceSplit', item)), raw: expRows, initialMeeting: initialExpRows, reason: intimacyReason || this.meta('sexualExperienceParts').reasonFallback, worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: true },
      { key: 'bodyStatus', stateId: state.id || '', ...this.meta('bodyStatus'), value: rows.map((item) => this.format('formatBodyStatus', item)), raw: rows, initialMeeting: Object.values(initialBody).map((item) => this.format('formatInitialBody', item)), reason: this.meta('bodyStatus').reasonFallback, worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: true },
    ];
  },
};
