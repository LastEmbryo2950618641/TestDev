window.GameModules = window.GameModules || {};

window.GameModules.intimacyBodyState = {
  defaults: window.GameModules.initDefaults?.intimacyBody,
  partLabels: window.GameModules.initDefaults?.intimacyBody?.partLabels || {},
  sexPartLabels: window.GameModules.initDefaults?.intimacyBody?.sexPartLabels || {},
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
    return this.defaults?.bodyDescriptions?.[key] || '状态稳定';
  },
  defaultBodyStatus() { return this.defaults?.bodyStatus?.() || {}; },
  defaultBodyStatusEntry(key) { return this.defaults?.bodyStatusEntry?.(key) || { partKey: key, part: this.partLabels[key] || '其他', status: '稳定', description: this.defaultBodyDescription(key), reason: '初始默认状态', updatedAt: '' }; },
  defaultIntimacy() { return this.defaults?.intimacy?.() || {}; },
  defaultInitialMeeting() { return this.defaults?.initialMeeting?.() || {}; },
  defaultSexParts() { return this.defaults?.sexualExperienceParts?.() || {}; },
  text(key, fallback = '') { return this.defaults?.displayTexts?.[key] || fallback; },
  ensure(state) {
    if (!state?.values) return false;
    let changed = false;
    const values = state.values;
    if (!values.intimacy || typeof values.intimacy !== 'object') { values.intimacy = this.defaultIntimacy(); changed = true; }
    if (!values.intimacy.sexualStatus) { values.intimacy.sexualStatus = '处女'; changed = true; }
    if (!Number.isFinite(Number(values.intimacy.sexualPartnerCount))) { values.intimacy.sexualPartnerCount = 0; changed = true; }
    if (!Array.isArray(values.intimacy.sexualPartners)) { values.intimacy.sexualPartners = []; changed = true; }
    if (!Number.isFinite(Number(values.intimacy.sexualExperienceCount))) { values.intimacy.sexualExperienceCount = 0; changed = true; }
    if (!values.intimacy.sexualExperienceParts || typeof values.intimacy.sexualExperienceParts !== 'object') { values.intimacy.sexualExperienceParts = this.defaultSexParts(); changed = true; }
    for (const key of Object.keys(this.sexPartLabels)) if (!Number.isFinite(Number(values.intimacy.sexualExperienceParts[key]))) { values.intimacy.sexualExperienceParts[key] = 0; changed = true; }
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
  applySexualHistory(state, update = {}) {
    if (!this.adultConfirmed(state)) return false;
    this.ensure(state);
    const before = JSON.stringify(state.values.intimacy), raw = update.change?.value ?? update.value ?? {}, obj = raw && typeof raw === 'object' ? raw : {};
    const confirmed = obj.vaginalInsertionConfirmed === true || String(update.field || '').includes('vaginalInsertion');
    if (obj.sexualStatus || update.field === 'intimacy.sexualStatus') state.values.intimacy.sexualStatus = String(obj.sexualStatus || raw || '处女').slice(0, 12);
    if (confirmed) {
      const names = [...(Array.isArray(obj.sexualPartners) ? obj.sexualPartners : []), obj.partnerName].map((x) => String(x || '').trim()).filter(Boolean);
      state.values.intimacy.sexualPartners = [...new Set([...(state.values.intimacy.sexualPartners || []), ...names])];
      const explicitCount = Number(obj.sexualPartnerCount ?? obj.count);
      state.values.intimacy.sexualPartnerCount = state.values.intimacy.sexualPartners.length || Math.max(0, Math.round(explicitCount || 0));
      if (state.values.intimacy.sexualPartnerCount > 0 && state.values.intimacy.sexualStatus === '处女') state.values.intimacy.sexualStatus = '非处女';
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
    state.values.bodyStatus[key] = { partKey: key, part: this.partLabels[key] || value.part || '其他', status: this.safeStatus(value), description, reason: String(this.reason(update)).slice(0, 120), updatedAt: new Date().toISOString() };
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
    const initialExpRows = this.experienceRows({ sexualExperienceParts: initial.sexualExperienceParts || {} }).map((item) => `${item.name}：${item.count}次`);
    const rows = Object.values(values.bodyStatus || {}).map((item) => {
      const init = initialBody[item.partKey] || this.defaultBodyStatusEntry(item.partKey);
      return { partKey: item.partKey, part: item.part || this.partLabels[item.partKey] || '其他', status: item.status || '稳定', description: item.description || item['描述状态'] || '', reason: item.reason || '当前记录。', updatedAt: item.updatedAt || '', name: item.part || this.partLabels[item.partKey] || '其他', type: '当前身体状态', initialMeeting: `${init.part || item.part}：${init.status || '稳定'}｜${init.description || ''}` };
    });
    return [
      { key: 'sexualStatus', stateId: state.id || '', label: '当前状态', kind: '性经历', value: values.intimacy?.sexualStatus || initial.sexualStatus, raw: values.intimacy?.sexualStatus || initial.sexualStatus, initialMeeting: initial.sexualStatus, desc: '成人虚构角色的性经历当前状态，只保存中性元数据。', reason: values.intimacy?.reason || '默认未记录。', worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: true },
      { key: 'sexualPartnerCount', stateId: state.id || '', label: '经历人数', kind: '性经历', value: `${partnerCount}人`, raw: partnerCount, initialMeeting: `${initial.sexualPartnerCount}人`, desc: '仅稳定确认阴部插入时计入人数。', reason: values.intimacy?.reason || '默认未记录。', worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: true },
      { key: 'sexualPartners', stateId: state.id || '', label: '经历人列表', kind: '性经历', value: partners.length ? partners : [noPartner], raw: partners, initialMeeting: initial.sexualPartners, desc: '已确认计入经历人数的对象列表，自动去重。', reason: values.intimacy?.reason || '默认未记录。', worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: true },
      { key: 'sexualExperienceCount', stateId: state.id || '', label: '性经验总次数', kind: '角色卡', value: this.adultConfirmed(state) ? `${count}次` : adultUnconfirmed, raw: count, initialMeeting: `${initial.sexualExperienceCount}次`, desc: '成人虚构角色的抽象经历总次数；同一次经历可关联多个分类。', reason: values.intimacy?.reason || '默认未记录。', worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: true },
      { key: 'sexualExperienceParts', stateId: state.id || '', label: '性经验分类次数', kind: '性经验分类', value: expRows.map((item) => `${item.name}：${item.initialCount}(初次见面) + ${item.laterCount} (后续次数)`), raw: expRows, initialMeeting: initialExpRows, desc: '分部位的抽象次数统计与记录提示；只用于结算，不包含过程描写。', reason: values.intimacy?.reason || '默认未记录。', worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: true },
      { key: 'bodyStatus', stateId: state.id || '', label: '当前身体状态', kind: '当前身体状态', value: rows.map((item) => `${item.part}：${item.status}`), raw: rows, initialMeeting: Object.values(initialBody).map((item) => `${item.part}：${item.status}｜${item.description}`), desc: '各身体部位的中性短状态，用于现实推演判定与护理记录。', reason: '由初始默认状态与现实推演中的明确状态变化共同维护。', worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: true },
    ];
  },
};
