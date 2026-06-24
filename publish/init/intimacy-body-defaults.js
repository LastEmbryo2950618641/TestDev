window.GameModules = window.GameModules || {};
window.GameModules.initDefaults = window.GameModules.initDefaults || {};

window.GameModules.initDefaults.intimacyBody = {
  partLabels: {
    overall: '整体',
    mouth: '口部',
    chest: '胸部',
    genital: '阴部',
    anus: '肛部',
    hips: '臀部',
    limbs: '四肢',
    skin: '皮肤',
    other: '其他',
  },

  sexPartLabels: {
    genital: '阴部次数',
    chest: '胸部次数',
    lips: '嘴唇次数',
    mouth: '口部次数',
    oralAction: '口部行为次数',
    oralSex: '口交次数',
    oralInternalFinish: '口交中出次数',
    genitalEntry: '阴部进入次数',
    vaginalInsertion: '阴部插入次数',
    vaginalInternalFinish: '阴部中出次数',
    anus: '肛门次数',
    analEntry: '肛部进入次数',
    analSex: '肛交次数',
    analInternalFinish: '肛交中出次数',
    legs: '腿部次数',
    hips: '臀部次数',
    hands: '手部次数',
    skin: '皮肤接触次数',
    other: '其他次数',
  },

  bodyDescriptions: {
    overall: '整体稳定，无明显异常',
    mouth: '口部清洁，状态稳定',
    chest: '胸部状态稳定，无明显不适',
    genital: '阴部状态稳定，无明显不适',
    anus: '肛部状态稳定，无明显不适',
    hips: '臀部状态稳定，无明显不适',
    limbs: '肢体活动正常，状态稳定',
    skin: '皮肤状态稳定，无明显异常',
    other: '其他部位暂无异常',
  },

  valueDefaults: {
    sexualStatus: '处女',
    sexualStatusChanged: '非处女',
    sexualPartnerCount: 0,
    sexualPartners: [],
    sexualExperienceCount: 0,
    sexualExperiencePartCount: 0,
    updatedAt: '',
    intimacyReason: '默认未记录',
    bodyStatus: '稳定',
    bodyDescription: '状态稳定',
    bodyReason: '初始默认状态',
  },

  displayTexts: {
    adultUnconfirmed: '未确认成人，不自动更新',
    noPartner: '无',
    noRecord: '未记录',
    currentRecord: '当前记录。',
    publicWorld: '公共',
    otherPart: '其他',
    statusChange: '状态变化',
  },

  sexualExperiencePartDefaults: {
    genital: 0,
    chest: 0,
    lips: 0,
    mouth: 0,
    oralAction: 0,
    oralSex: 0,
    oralInternalFinish: 0,
    genitalEntry: 0,
    vaginalInsertion: 0,
    vaginalInternalFinish: 0,
    anus: 0,
    analEntry: 0,
    analSex: 0,
    analInternalFinish: 0,
    legs: 0,
    hips: 0,
    hands: 0,
    skin: 0,
    other: 0,
  },

  sexualHistoryDefaults: {
    sexualStatus: '处女',
    sexualPartnerCount: 0,
    sexualPartners: [],
  },

  intimacyDefaults: {
    sexualStatus: '处女',
    sexualPartnerCount: 0,
    sexualPartners: [],
    sexualExperienceCount: 0,
    sexualExperienceParts: { genital: 0, chest: 0, lips: 0, mouth: 0, oralAction: 0, oralSex: 0, oralInternalFinish: 0, genitalEntry: 0, vaginalInsertion: 0, vaginalInternalFinish: 0, anus: 0, analEntry: 0, analSex: 0, analInternalFinish: 0, legs: 0, hips: 0, hands: 0, skin: 0, other: 0 },
    updatedAt: '',
    reason: '默认未记录',
  },

  bodyStatusDefaults: {
    overall: { partKey: 'overall', part: '整体', status: '稳定', description: '整体稳定，无明显异常', reason: '初始默认状态', updatedAt: '' },
    mouth: { partKey: 'mouth', part: '口部', status: '稳定', description: '口部清洁，状态稳定', reason: '初始默认状态', updatedAt: '' },
    chest: { partKey: 'chest', part: '胸部', status: '稳定', description: '胸部状态稳定，无明显不适', reason: '初始默认状态', updatedAt: '' },
    genital: { partKey: 'genital', part: '阴部', status: '稳定', description: '阴部状态稳定，无明显不适', reason: '初始默认状态', updatedAt: '' },
    anus: { partKey: 'anus', part: '肛部', status: '稳定', description: '肛部状态稳定，无明显不适', reason: '初始默认状态', updatedAt: '' },
    hips: { partKey: 'hips', part: '臀部', status: '稳定', description: '臀部状态稳定，无明显不适', reason: '初始默认状态', updatedAt: '' },
    limbs: { partKey: 'limbs', part: '四肢', status: '稳定', description: '肢体活动正常，状态稳定', reason: '初始默认状态', updatedAt: '' },
    skin: { partKey: 'skin', part: '皮肤', status: '稳定', description: '皮肤状态稳定，无明显异常', reason: '初始默认状态', updatedAt: '' },
    other: { partKey: 'other', part: '其他', status: '稳定', description: '其他部位暂无异常', reason: '初始默认状态', updatedAt: '' },
  },

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
    hands: '记录手部相关次数，只作统计。',
    skin: '记录皮肤接触相关抽象次数，避免感官化描述。',
    other: '其他无法归类但合规的成人抽象经历次数。',
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

  clone(value) {
    return JSON.parse(JSON.stringify(value));
  },

  bodyStatusEntry(key) {
    return this.clone(this.bodyStatusDefaults[key] || this.bodyStatusDefaults.other);
  },

  bodyStatus() {
    return this.clone(this.bodyStatusDefaults);
  },

  sexualExperienceParts() {
    return this.clone(this.sexualExperiencePartDefaults);
  },

  intimacy() {
    return this.clone(this.intimacyDefaults);
  },

  initialMeeting() {
    const intimacy = this.intimacy();
    const bodyStatus = this.bodyStatus();
    return {
      sexualStatus: intimacy.sexualStatus,
      sexualPartnerCount: intimacy.sexualPartnerCount,
      sexualPartners: this.displayTexts.noPartner,
      sexualExperienceCount: intimacy.sexualExperienceCount,
      sexualExperienceParts: this.sexualExperienceParts(),
      bodyStatus,
    };
  },
};
