window.GameModules = window.GameModules || {};

window.GameModules.intimacyBodyState = {
  partLabels: { overall: '整体', mouth: '口部', chest: '胸部', genital: '阴部', anus: '肛部', hips: '臀部', limbs: '四肢', skin: '皮肤', other: '其他' },
  partKey(raw = '') {
    const text = String(raw || '').trim();
    const map = { overall: 'overall', mouth: 'mouth', chest: 'chest', genital: 'genital', anus: 'anus', hips: 'hips', limbs: 'limbs', skin: 'skin', other: 'other', 口部: 'mouth', 胸部: 'chest', 阴部: 'genital', 私处: 'genital', 肛部: 'anus', 臀部: 'hips', 四肢: 'limbs', 皮肤: 'skin', 整体: 'overall' };
    if (map[text]) return map[text];
    if (/口/.test(text)) return 'mouth';
    if (/胸/.test(text)) return 'chest';
    if (/阴|私处|生殖/.test(text)) return 'genital';
    if (/肛/.test(text)) return 'anus';
    if (/臀/.test(text)) return 'hips';
    if (/皮肤/.test(text)) return 'skin';
    return 'other';
  },
  defaultBodyStatus() {
    return Object.fromEntries(['overall', 'mouth', 'chest', 'genital', 'anus', 'hips'].map((key) => [key, { partKey: key, part: this.partLabels[key], status: '稳定', reason: '初始默认状态', updatedAt: '' }]));
  },
  ensure(state) {
    if (!state?.values) return false;
    let changed = false;
    const values = state.values;
    if (!values.intimacy || typeof values.intimacy !== 'object') { values.intimacy = { sexualExperienceCount: 0, updatedAt: '', reason: '默认未记录' }; changed = true; }
    if (!Number.isFinite(Number(values.intimacy.sexualExperienceCount))) { values.intimacy.sexualExperienceCount = 0; changed = true; }
    if (!values.bodyStatus || typeof values.bodyStatus !== 'object' || Array.isArray(values.bodyStatus)) { values.bodyStatus = this.defaultBodyStatus(); changed = true; }
    for (const [key, label] of Object.entries(this.partLabels)) {
      if (!values.bodyStatus[key] && ['overall', 'mouth', 'chest', 'genital', 'anus', 'hips'].includes(key)) { values.bodyStatus[key] = { partKey: key, part: label, status: '稳定', reason: '初始默认状态', updatedAt: '' }; changed = true; }
    }
    return changed;
  },
  adultConfirmed(state) {
    const age = Number(state?.values?.age ?? state?.profile?.age);
    return Number.isFinite(age) && age >= 18;
  },
  targetState(store, update = {}) {
    const subject = update.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || update.target || 'player-self';
    return store?.itemSkillState?.(id) || (id === 'player-self' ? store?.playerIdentityState?.() : null);
  },
  safeStatus(value = '') {
    const text = String(value?.status || value || '').trim();
    if (/疼|痛/.test(text)) return '疼痛';
    if (/伤|破|裂|出血/.test(text)) return '受伤';
    if (/疲|酸|累/.test(text)) return '疲劳';
    if (/清洁|干净|护理/.test(text)) return text.includes('护理') ? '需要护理' : '清洁';
    if (/不适|异常|炎|病/.test(text)) return '不适';
    if (/稳定|正常|无异常/.test(text)) return '稳定';
    return text && text.length <= 8 && !/[插入性交性爱做爱射精高潮]/u.test(text) ? text : '状态变化';
  },
  reason(update = {}) {
    const reasons = Array.isArray(update.reasons) ? update.reasons : [];
    return reasons.map((item) => item.evidence || item.trigger || item.reason).filter(Boolean).join('；') || update.reason || '现实推演确认状态变化。';
  },
  applySexual(state, update = {}) {
    if (!this.adultConfirmed(state)) return false;
    this.ensure(state);
    const mode = update.change?.mode || 'set';
    const value = Math.max(0, Math.round(Number(update.change?.value ?? update.value) || 0));
    const before = Math.max(0, Math.round(Number(state.values.intimacy.sexualExperienceCount) || 0));
    state.values.intimacy.sexualExperienceCount = mode === 'delta' ? Math.max(0, before + value) : value;
    state.values.intimacy.updatedAt = new Date().toISOString();
    state.values.intimacy.reason = String(this.reason(update)).slice(0, 120);
    return state.values.intimacy.sexualExperienceCount !== before;
  },
  applyBody(state, update = {}) {
    this.ensure(state);
    const value = update.change?.value ?? update.value ?? {};
    const key = this.partKey(value.partKey || value.part || update.field?.split('.')?.pop());
    const before = JSON.stringify(state.values.bodyStatus[key] || {});
    state.values.bodyStatus[key] = { partKey: key, part: this.partLabels[key] || value.part || '其他', status: this.safeStatus(value), reason: String(this.reason(update)).slice(0, 120), updatedAt: new Date().toISOString() };
    return before !== JSON.stringify(state.values.bodyStatus[key]);
  },
  async applyGeneric(store, updates = []) {
    const changed = new Set();
    for (const update of Array.isArray(updates) ? updates : []) {
      const state = this.targetState(store, update);
      if (!state?.values) continue;
      const type = String(update.updateType || '');
      const ok = type === 'sexual-experience' ? this.applySexual(state, update) : (type === 'body-status' ? this.applyBody(state, update) : false);
      if (ok) changed.add(state.id);
    }
    for (const id of changed) {
      const state = store.rpgStates?.[id] || window.GameModules.sqliteSave.getCharacterState?.(id);
      if (!state) continue;
      store.rpgStates = { ...(store.rpgStates || {}), [id]: state };
      await window.GameModules.sqliteSave.saveCharacterState(state);
    }
  },
  fields(state = {}) {
    state = state || {};
    this.ensure(state);
    const p = state.profile || {}, values = state.values || {}, worldTag = p.work || state.worldTag || '原创世界';
    const count = Math.max(0, Math.round(Number(values.intimacy?.sexualExperienceCount) || 0));
    const rows = Object.values(values.bodyStatus || {}).map((item) => ({ partKey: item.partKey, part: item.part || this.partLabels[item.partKey] || '其他', status: item.status || '稳定', reason: item.reason || '当前记录。', updatedAt: item.updatedAt || '', name: item.part || this.partLabels[item.partKey] || '其他', type: '当前身体状态' }));
    return [
      { key: 'sexualExperienceCount', stateId: state.id || '', label: '性经验次数', kind: '角色卡', value: this.adultConfirmed(state) ? `${count}次` : '未确认成人，不自动更新', raw: count, desc: '成人虚构角色的抽象经历次数，只记录数值，不记录过程。', reason: values.intimacy?.reason || '默认未记录。', worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: true },
      { key: 'bodyStatus', stateId: state.id || '', label: '当前身体状态', kind: '当前身体状态', value: rows.map((item) => `${item.part}：${item.status}`), raw: rows, desc: '各身体部位的中性短状态，用于现实推演判定与护理记录。', reason: '由初始默认状态与现实推演中的明确状态变化共同维护。', worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: true },
    ];
  },
};
