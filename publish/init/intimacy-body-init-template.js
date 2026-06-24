window.GameModules = window.GameModules || {};
window.GameModules.initDefaults = window.GameModules.initDefaults || {};
window.GameModules.initTemplateSources = window.GameModules.initTemplateSources || {};

const sexParts = {
  genital: 0, chest: 0, lips: 0, mouth: 0, oralAction: 0, oralSex: 0, oralInternalFinish: 0,
  genitalEntry: 0, vaginalInsertion: 0, vaginalInternalFinish: 0, anus: 0, analEntry: 0,
  analSex: 0, analInternalFinish: 0, legs: 0, hips: 0, hands: 0, skin: 0, other: 0,
};

const bodyDescriptions = {
  overall: '整体稳定，无明显异常',
  mouth: '口部清洁，状态稳定',
  chest: '胸部状态稳定，无明显不适',
  genital: '阴部状态稳定，无明显不适',
  anus: '肛部状态稳定，无明显不适',
  hips: '臀部状态稳定，无明显不适',
  limbs: '肢体活动正常，状态稳定',
  skin: '皮肤状态稳定，无明显异常',
  other: '其他部位暂无异常',
};

const template = {
  id: 'intimacy-body',
  title: '亲密与身体状态初始化模板',

  partLabels: { overall: '整体', mouth: '口部', chest: '胸部', genital: '阴部', anus: '肛部', hips: '臀部', limbs: '四肢', skin: '皮肤', other: '其他' },

  sexPartLabels: {
    genital: '阴部次数', chest: '胸部次数', lips: '嘴唇次数', mouth: '口部次数', oralAction: '口部行为次数',
    oralSex: '口交次数', oralInternalFinish: '口交中出次数', genitalEntry: '阴部进入次数', vaginalInsertion: '阴部插入次数',
    vaginalInternalFinish: '阴部中出次数', anus: '肛门次数', analEntry: '肛部进入次数', analSex: '肛交次数',
    analInternalFinish: '肛交中出次数', legs: '腿部次数', hips: '臀部次数', hands: '手部次数', skin: '皮肤接触次数', other: '其他次数',
  },

  bodyDescriptions,

  valueDefaults: {
    sexualStatus: '处女', sexualStatusChanged: '非处女', sexualPartnerCount: 0, sexualPartners: [],
    sexualExperienceCount: 0, sexualExperiencePartCount: 0, updatedAt: '', intimacyReason: '默认未记录',
    bodyStatus: '稳定', bodyDescription: '状态稳定', bodyReason: '初始默认状态',
  },

  displayTexts: {
    adultUnconfirmed: '未确认成人，不自动更新', noPartner: '无', noRecord: '未记录', currentRecord: '当前记录。',
    publicWorld: '公共', otherPart: '其他', statusChange: '状态变化',
  },

  sexualExperiencePartDefaults: sexParts,

  sexualHistoryDefaults: { sexualStatus: '处女', sexualPartnerCount: 0, sexualPartners: [] },

  intimacyDefaults: {
    sexualStatus: '处女', sexualPartnerCount: 0, sexualPartners: [], sexualExperienceCount: 0,
    sexualExperienceParts: sexParts, updatedAt: '', reason: '默认未记录',
  },

  bodyStatusDefaults: {
    overall: { partKey: 'overall', part: '整体', status: '稳定', description: bodyDescriptions.overall, reason: '初始默认状态', updatedAt: '' },
    mouth: { partKey: 'mouth', part: '口部', status: '稳定', description: bodyDescriptions.mouth, reason: '初始默认状态', updatedAt: '' },
    chest: { partKey: 'chest', part: '胸部', status: '稳定', description: bodyDescriptions.chest, reason: '初始默认状态', updatedAt: '' },
    genital: { partKey: 'genital', part: '阴部', status: '稳定', description: bodyDescriptions.genital, reason: '初始默认状态', updatedAt: '' },
    anus: { partKey: 'anus', part: '肛部', status: '稳定', description: bodyDescriptions.anus, reason: '初始默认状态', updatedAt: '' },
    hips: { partKey: 'hips', part: '臀部', status: '稳定', description: bodyDescriptions.hips, reason: '初始默认状态', updatedAt: '' },
    limbs: { partKey: 'limbs', part: '四肢', status: '稳定', description: bodyDescriptions.limbs, reason: '初始默认状态', updatedAt: '' },
    skin: { partKey: 'skin', part: '皮肤', status: '稳定', description: bodyDescriptions.skin, reason: '初始默认状态', updatedAt: '' },
    other: { partKey: 'other', part: '其他', status: '稳定', description: bodyDescriptions.other, reason: '初始默认状态', updatedAt: '' },
  },

  fieldMeta: {
    sexualStatus: { label: '当前状态', kind: '性经历', desc: '成人虚构角色的性经历当前状态，只保存中性元数据。', reasonFallback: '默认未记录。' },
    sexualPartnerCount: { label: '经历人数', kind: '性经历', unit: '人', desc: '仅稳定确认阴部插入时计入人数。', reasonFallback: '默认未记录。' },
    sexualPartners: { label: '经历人列表', kind: '性经历', desc: '已确认计入经历人数的对象列表，自动去重。', reasonFallback: '默认未记录。' },
    sexualExperienceCount: { label: '性经验总次数', kind: '角色卡', unit: '次', desc: '成人虚构角色的抽象经历总次数；同一次经历可关联多个分类。', reasonFallback: '默认未记录。', limit: '仅成人虚构角色可由现实推演更新；只保存抽象总次数。' },
    sexualExperienceParts: { label: '性经验分类次数', kind: '性经验分类', desc: '分部位的抽象次数统计与记录提示；只用于结算，不包含过程描写。', reasonFallback: '默认未记录。', limit: '分类次数只作为合规抽象统计；同一次经历可关联多个分类，但总次数不要重复增加。' },
    bodyStatus: { label: '当前身体状态', kind: '当前身体状态', desc: '各身体部位的中性短状态，用于现实推演判定与护理记录。', reasonFallback: '由初始默认状态与现实推演中的明确状态变化共同维护。', limit: '只保存中性短状态，不保存露骨过程描写。' },
  },

  formatPartnerCount(value) { return `${value}${this.fieldMeta.sexualPartnerCount.unit}`; },
  formatExperienceCount(value) { return `${value}${this.fieldMeta.sexualExperienceCount.unit}`; },
  formatExperienceSplit(item) { return `${item.name}：${item.initialCount}(初次见面) + ${item.laterCount} (后续次数)`; },
  formatInitialExperience(item) { return `${item.name}：${item.count}${this.fieldMeta.sexualExperienceCount.unit}`; },
  formatBodyStatus(item) { return `${item.part}：${item.status}`; },
  formatInitialBody(item) { return `${item.part}：${item.status}｜${item.description}`; },
  clone(value) { return JSON.parse(JSON.stringify(value ?? null)); },
  bodyStatusEntry(key) { return this.clone(this.bodyStatusDefaults[key] || this.bodyStatusDefaults.other); },
  bodyStatus() { return this.clone(this.bodyStatusDefaults); },
  sexualExperienceParts() { return this.clone(this.sexualExperiencePartDefaults); },
  intimacy() { return this.clone(this.intimacyDefaults); },
  initialMeeting() {
    const intimacy = this.intimacy();
    return {
      sexualStatus: intimacy.sexualStatus,
      sexualPartnerCount: intimacy.sexualPartnerCount,
      sexualPartners: this.displayTexts.noPartner,
      sexualExperienceCount: intimacy.sexualExperienceCount,
      sexualExperienceParts: this.sexualExperienceParts(),
      bodyStatus: this.bodyStatus(),
    };
  },

  defaults() { return this; },
  partKey(raw = '') { const text = String(raw || '').trim(), map = { overall: 'overall', mouth: 'mouth', chest: 'chest', genital: 'genital', anus: 'anus', hips: 'hips', limbs: 'limbs', skin: 'skin', other: 'other', 口部: 'mouth', 胸部: 'chest', 阴部: 'genital', 私处: 'genital', 肛部: 'anus', 臀部: 'hips', 四肢: 'limbs', 皮肤: 'skin', 整体: 'overall' }; if (map[text]) return map[text]; if (/口|嘴/.test(text)) return 'mouth'; if (/胸/.test(text)) return 'chest'; if (/阴|私处|生殖/.test(text)) return 'genital'; if (/肛/.test(text)) return 'anus'; if (/臀/.test(text)) return 'hips'; if (/皮肤/.test(text)) return 'skin'; return 'other'; },
  sexPartKey(raw = '') { const text = String(raw || '').trim(), map = { ...Object.fromEntries(Object.keys(this.sexPartLabels).map((key) => [key, key])), 阴部: 'genital', 胸部: 'chest', 嘴唇: 'lips', 唇部: 'lips', 口部: 'mouth', 口部行为: 'oralAction', 口交: 'oralSex', 口交中出: 'oralInternalFinish', 阴部进入: 'genitalEntry', 阴部插入: 'vaginalInsertion', 阴部中出: 'vaginalInternalFinish', 肛门: 'anus', 肛部: 'anus', 肛部进入: 'analEntry', 肛交: 'analSex', 肛交中出: 'analInternalFinish', 腿部: 'legs', 臀部: 'hips', 手部: 'hands', 皮肤: 'skin' }; if (map[text]) return map[text]; if (/嘴|唇|吻/.test(text)) return 'lips'; if (/口/.test(text)) return 'mouth'; if (/胸/.test(text)) return 'chest'; if (/阴|私处|生殖/.test(text)) return 'genital'; if (/肛/.test(text)) return 'anus'; if (/腿/.test(text)) return 'legs'; if (/臀/.test(text)) return 'hips'; if (/手/.test(text)) return 'hands'; if (/皮肤/.test(text)) return 'skin'; return 'other'; },
  ensure(state = {}) { if (!state?.values) return false; const v = state.values; let changed = false; if (!v.intimacy || typeof v.intimacy !== 'object') { v.intimacy = this.intimacy(); changed = true; } if (!v.intimacy.sexualStatus) { v.intimacy.sexualStatus = this.sexualHistoryDefaults.sexualStatus; changed = true; } if (!Number.isFinite(Number(v.intimacy.sexualPartnerCount))) { v.intimacy.sexualPartnerCount = this.sexualHistoryDefaults.sexualPartnerCount; changed = true; } if (!Array.isArray(v.intimacy.sexualPartners)) { v.intimacy.sexualPartners = [...this.sexualHistoryDefaults.sexualPartners]; changed = true; } if (!Number.isFinite(Number(v.intimacy.sexualExperienceCount))) { v.intimacy.sexualExperienceCount = this.intimacyDefaults.sexualExperienceCount; changed = true; } if (!v.intimacy.sexualExperienceParts || typeof v.intimacy.sexualExperienceParts !== 'object') { v.intimacy.sexualExperienceParts = this.sexualExperienceParts(); changed = true; } Object.keys(this.sexPartLabels).forEach((key) => { if (!Number.isFinite(Number(v.intimacy.sexualExperienceParts[key]))) { v.intimacy.sexualExperienceParts[key] = this.sexualExperiencePartDefaults[key]; changed = true; } }); if (!v.bodyStatus || typeof v.bodyStatus !== 'object' || Array.isArray(v.bodyStatus)) { v.bodyStatus = this.bodyStatus(); changed = true; } Object.keys(this.partLabels).forEach((key) => { if (!v.bodyStatus[key]) { v.bodyStatus[key] = this.bodyStatusEntry(key); changed = true; } else if (!v.bodyStatus[key].description && !v.bodyStatus[key]['描述状态']) { v.bodyStatus[key].description = this.bodyDescriptions[key] || this.valueDefaults.bodyDescription; changed = true; } }); return changed; },
  adultConfirmed(state) { const age = Number(state?.values?.age ?? state?.profile?.age); return Number.isFinite(age) && age >= 18; },
  reason(update = {}) { const reasons = Array.isArray(update.reasons) ? update.reasons : []; return reasons.map((item) => item.evidence || item.trigger || item.reason).filter(Boolean).join('；') || update.reason || '现实推演确认状态变化。'; },
  safeStatus(value = '') { const text = String(value?.status || value || '').trim(); if (/疼|痛/.test(text)) return '疼痛'; if (/伤|破|裂|出血/.test(text)) return '受伤'; if (/疲|酸|累/.test(text)) return '疲劳'; if (/清洁|干净|护理/.test(text)) return text.includes('护理') ? '需要护理' : '清洁'; if (/不适|异常|炎|病/.test(text)) return '不适'; if (/稳定|正常|无异常/.test(text)) return this.valueDefaults.bodyStatus; return text && text.length <= 8 && !/[插入性交性爱做爱射精高潮]/u.test(text) ? text : this.displayTexts.statusChange; },
  setSexPart(state, part, value, mode) { const key = this.sexPartKey(part), current = Math.max(0, Math.round(Number(state.values.intimacy.sexualExperienceParts[key]) || 0)), next = Math.max(0, Math.round(Number(value) || 0)); state.values.intimacy.sexualExperienceParts[key] = mode === 'delta' ? current + next : next; },
  setSexTotal(state, value, mode) { const current = Math.max(0, Math.round(Number(state.values.intimacy.sexualExperienceCount) || 0)), next = Math.max(0, Math.round(Number(value) || 0)); state.values.intimacy.sexualExperienceCount = mode === 'delta' ? current + next : next; },
  applySexual(state, update = {}) { if (!this.adultConfirmed(state)) return false; this.ensure(state); const mode = update.change?.mode || 'set', raw = update.change?.value ?? update.value ?? 0, before = JSON.stringify(state.values.intimacy), obj = raw && typeof raw === 'object' ? raw : null, fieldPart = String(update.field || '').includes('sexualExperienceParts.') ? update.field.split('.').pop() : ''; if (obj?.parts && typeof obj.parts === 'object') Object.entries(obj.parts).forEach(([part, count]) => this.setSexPart(state, part, count, mode)); if (obj?.partKey || obj?.part || fieldPart) this.setSexPart(state, obj?.partKey || obj?.part || fieldPart, obj?.count ?? obj?.value ?? raw, mode); const total = obj ? (obj.totalDelta ?? obj.total ?? obj.count ?? null) : raw; if (total !== null && total !== undefined && !fieldPart) this.setSexTotal(state, total, mode); state.values.intimacy.updatedAt = new Date().toISOString(); state.values.intimacy.reason = String(this.reason(update)).slice(0, 120); return before !== JSON.stringify(state.values.intimacy); },
  applySexualHistory(state, update = {}) { if (!this.adultConfirmed(state)) return false; this.ensure(state); const before = JSON.stringify(state.values.intimacy), raw = update.change?.value ?? update.value ?? {}, obj = raw && typeof raw === 'object' ? raw : {}, confirmed = obj.vaginalInsertionConfirmed === true || String(update.field || '').includes('vaginalInsertion'); if (obj.sexualStatus || update.field === 'intimacy.sexualStatus') state.values.intimacy.sexualStatus = String(obj.sexualStatus || raw || this.valueDefaults.sexualStatus).slice(0, 12); if (confirmed) { const names = [...(Array.isArray(obj.sexualPartners) ? obj.sexualPartners : []), obj.partnerName].map((x) => String(x || '').trim()).filter(Boolean); state.values.intimacy.sexualPartners = [...new Set([...(state.values.intimacy.sexualPartners || []), ...names])]; const explicitCount = Number(obj.sexualPartnerCount ?? obj.count); state.values.intimacy.sexualPartnerCount = state.values.intimacy.sexualPartners.length || Math.max(0, Math.round(explicitCount || 0)); if (state.values.intimacy.sexualPartnerCount > 0 && state.values.intimacy.sexualStatus === this.valueDefaults.sexualStatus) state.values.intimacy.sexualStatus = this.valueDefaults.sexualStatusChanged; } state.values.intimacy.updatedAt = new Date().toISOString(); state.values.intimacy.reason = String(this.reason(update)).slice(0, 120); return before !== JSON.stringify(state.values.intimacy); },
  bodyPartFromUpdate(update = {}, value = {}) { const field = String(update.field || ''), direct = value.partKey || value.part || update.partKey || update.part; if (direct) return this.partKey(direct); const parts = field.split('.').map((item) => item.trim()).filter(Boolean), bodyAt = parts.findIndex((item) => item === 'bodyStatus' || item === '当前身体状态'); if (bodyAt >= 0 && parts[bodyAt + 1]) return this.partKey(parts[bodyAt + 1]); return this.partKey(parts.find((item) => this.partLabels[this.partKey(item)]) || parts[0] || 'other'); },
  applyBody(state, update = {}) { this.ensure(state); const raw = update.change?.value ?? update.value ?? {}, value = raw && typeof raw === 'object' ? raw : {}, key = this.bodyPartFromUpdate(update, value), before = JSON.stringify(state.values.bodyStatus[key] || {}), leaf = String(update.field || '').split('.').pop(), rawText = raw && typeof raw === 'object' ? '' : String(raw || '').trim(), current = state.values.bodyStatus[key] || this.bodyStatusEntry(key), description = String(value['描述状态'] || value.description || value.desc || value.detail || (/描述|description|desc|detail/.test(leaf) ? rawText : current.description || '')).trim().slice(0, 80), statusSource = value.status || value.state || (/status|状态/.test(leaf) ? rawText : value); state.values.bodyStatus[key] = { partKey: key, part: this.partLabels[key] || value.part || current.part || this.displayTexts.otherPart, status: this.safeStatus(statusSource), description, reason: String(this.reason(update)).slice(0, 120), updatedAt: new Date().toISOString() }; return before !== JSON.stringify(state.values.bodyStatus[key]); },
  applyUpdate(state, update = {}) { const type = String(update.updateType || ''); return type === 'sexual-experience' ? this.applySexual(state, update) : (type === 'sexual-history' ? this.applySexualHistory(state, update) : (type === 'body-status' ? this.applyBody(state, update) : false)); },
  experienceRows(intimacy = {}) { const parts = intimacy.sexualExperienceParts || {}, initialParts = intimacy.sexualExperienceInitialParts || {}; return Object.entries(this.sexPartLabels).map(([key, label]) => { const total = Math.max(0, Math.round(Number(parts[key]) || 0)), initial = Math.max(0, Math.round(Number(initialParts[key]) || 0)); return { partKey: key, name: label, count: total, initialCount: initial, laterCount: Math.max(0, total - initial), prompt: window.GameModules.updateRules?.sexualExperience?.partPrompts?.[key], type: '性经验分类' }; }); },
  uiFields(state = {}) { this.ensure(state); const p = state.profile || {}, v = state.values || {}, worldTag = p.work || state.worldTag || '原创世界', count = Math.max(0, Math.round(Number(v.intimacy?.sexualExperienceCount) || 0)), partnerCount = Math.max(0, Math.round(Number(v.intimacy?.sexualPartnerCount) || 0)), partners = Array.isArray(v.intimacy?.sexualPartners) ? v.intimacy.sexualPartners : [], initial = this.initialMeeting(), expRows = this.experienceRows(v.intimacy), initialExpRows = this.experienceRows({ sexualExperienceParts: initial.sexualExperienceParts || {} }).map((item) => this.formatInitialExperience(item)), rows = Object.values(v.bodyStatus || {}).map((item) => { const init = initial.bodyStatus[item.partKey] || this.bodyStatusEntry(item.partKey), part = item.part || this.partLabels[item.partKey] || this.displayTexts.otherPart; return { partKey: item.partKey, part, status: item.status || this.valueDefaults.bodyStatus, description: item.description || item['描述状态'] || '', reason: item.reason || this.displayTexts.currentRecord, updatedAt: item.updatedAt || '', name: part, type: this.fieldMeta.bodyStatus.kind, initialMeeting: this.formatInitialBody({ part: init.part || part, status: init.status || this.valueDefaults.bodyStatus, description: init.description || '' }) }; }), reason = v.intimacy?.reason, base = { stateId: state.id || '', worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: true }; return [{ key: 'sexualStatus', ...this.fieldMeta.sexualStatus, ...base, value: v.intimacy?.sexualStatus || initial.sexualStatus, raw: v.intimacy?.sexualStatus || initial.sexualStatus, initialMeeting: initial.sexualStatus, reason: reason || this.fieldMeta.sexualStatus.reasonFallback }, { key: 'sexualPartnerCount', ...this.fieldMeta.sexualPartnerCount, ...base, value: this.formatPartnerCount(partnerCount), raw: partnerCount, initialMeeting: this.formatPartnerCount(initial.sexualPartnerCount), reason: reason || this.fieldMeta.sexualPartnerCount.reasonFallback }, { key: 'sexualPartners', ...this.fieldMeta.sexualPartners, ...base, value: partners.length ? partners : [this.displayTexts.noPartner], raw: partners, initialMeeting: initial.sexualPartners, reason: reason || this.fieldMeta.sexualPartners.reasonFallback }, { key: 'sexualExperienceCount', ...this.fieldMeta.sexualExperienceCount, ...base, value: this.adultConfirmed(state) ? this.formatExperienceCount(count) : this.displayTexts.adultUnconfirmed, raw: count, initialMeeting: this.formatExperienceCount(initial.sexualExperienceCount), reason: reason || this.fieldMeta.sexualExperienceCount.reasonFallback }, { key: 'sexualExperienceParts', ...this.fieldMeta.sexualExperienceParts, ...base, value: expRows.map((item) => this.formatExperienceSplit(item)), raw: expRows, initialMeeting: initialExpRows, reason: reason || this.fieldMeta.sexualExperienceParts.reasonFallback }, { key: 'bodyStatus', ...this.fieldMeta.bodyStatus, ...base, value: rows.map((item) => this.formatBodyStatus(item)), raw: rows, initialMeeting: Object.values(initial.bodyStatus).map((item) => this.formatInitialBody(item)), reason: this.fieldMeta.bodyStatus.reasonFallback }]; },

  fields(state = null) {
    if (state?.values) return this.uiFields(state);
    return {
      partLabels: { defaultValue: this.clone(this.partLabels), meaning: '身体状态部位键与中文显示名。' },
      sexPartLabels: { defaultValue: this.clone(this.sexPartLabels), meaning: '性经验分类键与中文显示名。' },
      bodyDescriptions: { defaultValue: this.clone(this.bodyDescriptions), meaning: '每个身体部位的默认中性状态描述。' },
      valueDefaults: { defaultValue: this.clone(this.valueDefaults), meaning: '亲密与身体状态通用缺省值。' },
      displayTexts: { defaultValue: this.clone(this.displayTexts), meaning: 'UI 展示和无记录状态的缺省文案。' },
      sexualExperiencePartDefaults: { defaultValue: this.clone(this.sexualExperiencePartDefaults), meaning: '每个性经验分类的默认次数。' },
      sexualHistoryDefaults: { defaultValue: this.clone(this.sexualHistoryDefaults), meaning: '性经历当前状态、经历人数和经历人列表的默认值。' },
      intimacyDefaults: { defaultValue: this.clone(this.intimacyDefaults), meaning: '完整亲密经历初始化对象。' },
      bodyStatusDefaults: { defaultValue: this.clone(this.bodyStatusDefaults), meaning: '完整身体各部位状态初始化对象。' },
      fieldMeta: { defaultValue: this.clone(this.fieldMeta), meaning: '每个 UI 字段的名称、类型、说明、限制和缺省原因。' },
    };
  },

  editableFields() {
    const f = this.fields();
    return {
      intimacy: {
        meaning: '玩家或角色的亲密经历初始化，只保存中性元数据。',
        defaults: f.intimacyDefaults.defaultValue,
        fields: {
          sexualStatus: { defaultValue: f.sexualHistoryDefaults.defaultValue?.sexualStatus, meaning: '性经历当前状态；只写稳定状态值。' },
          sexualPartnerCount: { defaultValue: f.sexualHistoryDefaults.defaultValue?.sexualPartnerCount, meaning: '经历人数；仅稳定确认阴部插入时计入。' },
          sexualPartners: { defaultValue: f.sexualHistoryDefaults.defaultValue?.sexualPartners, meaning: '经历对象列表；只写已确认计入人数的对象。' },
          sexualExperienceCount: { defaultValue: f.intimacyDefaults.defaultValue?.sexualExperienceCount, meaning: '抽象性经验总次数；只做计数。' },
          sexualExperienceParts: { defaultValue: f.sexualExperiencePartDefaults.defaultValue, meaning: '分部位抽象次数统计；每个分类默认 0。' },
          updatedAt: { defaultValue: f.intimacyDefaults.defaultValue?.updatedAt, meaning: '初始化时间；无明确时间可留空。' },
          reason: { defaultValue: f.intimacyDefaults.defaultValue?.reason, meaning: '初始化依据；引用现实推演正文事实。' },
        },
      },
      bodyStatus: {
        meaning: '各身体部位当前状态初始化，只保存中性短状态和描述。',
        defaults: f.bodyStatusDefaults.defaultValue,
        fields: {
          partKey: { defaultValue: 'overall', meaning: '部位键；只能使用 bodyStatusDefaults 中存在的键。' },
          part: { defaultValue: f.partLabels.defaultValue?.overall, meaning: '部位中文名。' },
          status: { defaultValue: f.valueDefaults.defaultValue?.bodyStatus, meaning: '短状态，如稳定、疲劳、不适、受伤、清洁、需要护理。' },
          description: { defaultValue: f.valueDefaults.defaultValue?.bodyDescription, meaning: '中性状态描述；不要写过程描写。' },
          reason: { defaultValue: f.valueDefaults.defaultValue?.bodyReason, meaning: '初始化依据；引用现实推演正文事实。' },
          updatedAt: { defaultValue: f.valueDefaults.defaultValue?.updatedAt, meaning: '初始化时间；无明确时间可留空。' },
        },
      },
    };
  },

  jsonFormat() {
    const editable = this.editableFields();
    return { initUpdates: [{ target: 'player-self 或角色id/姓名', subject: { type: 'player 或 character', id: 'player-self 或角色id', name: '玩家或角色名' }, section: '亲密与身体状态初始化', fields: { intimacy: editable.intimacy.defaults, bodyStatus: editable.bodyStatus.defaults }, reason: '正文中的初始化依据' }] };
  },

  promptText() {
    return [
      '### 亲密与身体状态初始化字段模板',
      '只在现实推演正文明确支持初始化时填写；没有依据的字段保持缺省值或不返回。',
      `全部默认配置与含义：${JSON.stringify(this.fields())}`,
      `可填写字段与含义：${JSON.stringify(this.editableFields())}`,
      `规范 JSON 格式：${JSON.stringify(this.jsonFormat())}`,
    ].join('\n\n');
  },
};

window.GameModules.initTemplateSources.intimacyBody = template;
window.GameModules.initDefaults.intimacyBody = template;
