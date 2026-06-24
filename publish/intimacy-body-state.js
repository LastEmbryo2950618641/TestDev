window.GameModules = window.GameModules || {};

window.GameModules.intimacyBodyState = {
  partLabels: { overall: '整体', mouth: '口部', chest: '胸部', genital: '阴部', anus: '肛部', hips: '臀部', limbs: '四肢', skin: '皮肤', other: '其他' },
  sexPartLabels: { genital: '阴部次数', chest: '胸部次数', lips: '嘴唇次数', mouth: '口部次数', oralAction: '口部行为次数', oralSex: '口交次数', oralInternalFinish: '口交中出次数', genitalEntry: '阴部进入次数', vaginalInsertion: '阴部插入次数', vaginalInternalFinish: '阴部中出次数', anus: '肛门次数', analEntry: '肛部进入次数', analSex: '肛交次数', analInternalFinish: '肛交中出次数', legs: '腿部次数', hips: '臀部次数', hands: '手部次数', skin: '皮肤接触次数', other: '其他次数' },
  sexPartPrompts: {
    genital: '仅在成人身份且明确稳定事实确认该部位相关经历时计数；禁止过程描写。',
    chest: '仅记录成人抽象经历中胸部相关次数，不记录触碰细节或感官描写。',
    lips: '仅记录接吻或唇部相关抽象次数，不展开亲密过程。',
    mouth: '仅记录口部相关抽象次数；如会变成露骨过程，必须跳过。',
    oralAction: '仅记录成人抽象口部行为次数，不描述动作、过程或感官细节。',
    oralSex: '仅记录成人抽象口交次数，不描述动作、过程或感官细节。',
    oralInternalFinish: '仅记录成人抽象口交中出次数，只作计数，不写过程、体液或感官描写。',
    genitalEntry: '仅记录成人抽象阴部进入次数，不描述进入过程、姿势或感官细节。',
    vaginalInsertion: '仅记录成人抽象阴部插入次数，不描述插入过程、姿势或感官细节。',
    vaginalInternalFinish: '仅记录成人抽象阴部中出次数，只作计数，不写过程、体液或感官描写。',
    anus: '仅在成人身份且明确事实确认时记录肛门相关次数，不写具体行为。',
    analEntry: '仅记录成人抽象肛部进入次数，不描述进入过程、姿势或感官细节。',
    analSex: '仅记录成人抽象肛交次数，不描述动作、过程或感官细节。',
    analInternalFinish: '仅记录成人抽象肛交中出次数，只作计数，不写过程、体液或感官描写。',
    legs: '记录腿部相关亲密接触的抽象次数，保持中性统计。',
    hips: '记录臀部相关抽象次数，避免任何露骨描述。',
    hands: '记录手部相关抽象次数，只作统计。',
    skin: '记录皮肤接触相关抽象次数，避免感官化描述。',
    other: '其他无法归类但合规的成人抽象经历次数。',
  },
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
    return { overall: '整体稳定，无明显异常', mouth: '口部清洁，状态稳定', chest: '胸部状态稳定，无明显不适', genital: '阴部状态稳定，无明显不适', anus: '肛部状态稳定，无明显不适', hips: '臀部状态稳定，无明显不适', limbs: '肢体活动正常，状态稳定', skin: '皮肤状态稳定，无明显异常', other: '其他部位暂无异常' }[key] || '状态稳定';
  },
  defaultBodyStatus() { return Object.fromEntries(Object.keys(this.partLabels).map((key) => [key, { partKey: key, part: this.partLabels[key], status: '稳定', description: this.defaultBodyDescription(key), reason: '初始默认状态', updatedAt: '' }])); },
  defaultSexParts() { return Object.fromEntries(Object.keys(this.sexPartLabels).map((key) => [key, 0])); },
  ensure(state) {
    if (!state?.values) return false;
    let changed = false;
    const values = state.values;
    if (!values.intimacy || typeof values.intimacy !== 'object') { values.intimacy = { sexualExperienceCount: 0, sexualExperienceParts: this.defaultSexParts(), updatedAt: '', reason: '默认未记录' }; changed = true; }
    if (!Number.isFinite(Number(values.intimacy.sexualExperienceCount))) { values.intimacy.sexualExperienceCount = 0; changed = true; }
    if (!values.intimacy.sexualExperienceParts || typeof values.intimacy.sexualExperienceParts !== 'object') { values.intimacy.sexualExperienceParts = this.defaultSexParts(); changed = true; }
    for (const key of Object.keys(this.sexPartLabels)) if (!Number.isFinite(Number(values.intimacy.sexualExperienceParts[key]))) { values.intimacy.sexualExperienceParts[key] = 0; changed = true; }
    if (!values.bodyStatus || typeof values.bodyStatus !== 'object' || Array.isArray(values.bodyStatus)) { values.bodyStatus = this.defaultBodyStatus(); changed = true; }
    for (const [key, label] of Object.entries(this.partLabels)) {
      if (!values.bodyStatus[key]) { values.bodyStatus[key] = { partKey: key, part: label, status: '稳定', description: this.defaultBodyDescription(key), reason: '初始默认状态', updatedAt: '' }; changed = true; }
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
    if (/稳定|正常|无异常/.test(text)) return '稳定';
    return text && text.length <= 8 && !/[插入性交性爱做爱射精高潮]/u.test(text) ? text : '状态变化';
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
  applyBody(state, update = {}) {
    this.ensure(state);
    const value = update.change?.value ?? update.value ?? {}, key = this.partKey(value.partKey || value.part || update.field?.split('.')?.pop());
    const before = JSON.stringify(state.values.bodyStatus[key] || {});
    const description = String(value['描述状态'] || value.description || value.desc || value.detail || '').trim().slice(0, 80);
    state.values.bodyStatus[key] = { partKey: key, part: this.partLabels[key] || value.part || '其他', status: this.safeStatus(value), description, reason: String(this.reason(update)).slice(0, 120), updatedAt: new Date().toISOString() };
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
    for (const id of changed) { const state = store.rpgStates?.[id] || window.GameModules.sqliteSave.getCharacterState?.(id); if (!state) continue; store.rpgStates = { ...(store.rpgStates || {}), [id]: state }; await window.GameModules.sqliteSave.saveCharacterState(state); }
  },
  experienceRows(intimacy = {}) {
    const parts = intimacy.sexualExperienceParts || {};
    return Object.entries(this.sexPartLabels).map(([key, label]) => ({ partKey: key, name: label, count: Math.max(0, Math.round(Number(parts[key]) || 0)), prompt: this.sexPartPrompts[key], type: '性经验分类' }));
  },
  fields(state = {}) {
    state = state || {};
    this.ensure(state);
    const p = state.profile || {}, values = state.values || {}, worldTag = p.work || state.worldTag || '原创世界';
    const count = Math.max(0, Math.round(Number(values.intimacy?.sexualExperienceCount) || 0));
    const expRows = this.experienceRows(values.intimacy);
    const rows = Object.values(values.bodyStatus || {}).map((item) => ({ partKey: item.partKey, part: item.part || this.partLabels[item.partKey] || '其他', status: item.status || '稳定', description: item.description || item['描述状态'] || '', reason: item.reason || '当前记录。', updatedAt: item.updatedAt || '', name: item.part || this.partLabels[item.partKey] || '其他', type: '当前身体状态' }));
    return [
      { key: 'sexualExperienceCount', stateId: state.id || '', label: '性经验总次数', kind: '角色卡', value: this.adultConfirmed(state) ? `${count}次` : '未确认成人，不自动更新', raw: count, desc: '成人虚构角色的抽象经历总次数；同一次经历可关联多个分类。', reason: values.intimacy?.reason || '默认未记录。', worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: true },
      { key: 'sexualExperienceParts', stateId: state.id || '', label: '性经验分类次数', kind: '性经验分类', value: expRows.map((item) => `${item.name}：${item.count}次`), raw: expRows, desc: '分部位的抽象次数统计与记录提示；只用于结算，不包含过程描写。', reason: values.intimacy?.reason || '默认未记录。', worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: true },
      { key: 'bodyStatus', stateId: state.id || '', label: '当前身体状态', kind: '当前身体状态', value: rows.map((item) => `${item.part}：${item.status}`), raw: rows, desc: '各身体部位的中性短状态，用于现实推演判定与护理记录。', reason: '由初始默认状态与现实推演中的明确状态变化共同维护。', worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: true },
    ];
  },
};
