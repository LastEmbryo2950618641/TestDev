window.GameModules = window.GameModules || {};
window.GameModules.initDefaults = window.GameModules.initDefaults || {};
window.GameModules.initTemplateSources = window.GameModules.initTemplateSources || {};

const intimacyBodySexParts = {
  genital: 0, chest: 0, lips: 0, mouth: 0, oralAction: 0, oralSex: 0, oralInternalFinish: 0,
  genitalEntry: 0, vaginalInsertion: 0, vaginalInternalFinish: 0, anus: 0, analEntry: 0,
  analSex: 0, analInternalFinish: 0, legs: 0, hips: 0, hands: 0, skin: 0, other: 0,
};

// ---- 色情化、露骨化描述（完全符合处女初始状态） ----
const intimacyBodyDescriptions = {
  overall: '整体娇躯柔嫩，肌肤光洁如脂，散发着处子特有的幽香，曲线玲珑，未经人事的痕迹一览无余。',
  mouth: '双唇柔软丰润，口腔内壁温热潮红，舌苔洁净，未有异物深入过的青涩感。',
  chest: '双乳挺拔饱满，乳晕粉嫩如樱，乳头小巧微翘，从未被吮吸或揉捏，敏感而稚嫩。',
  genital: '阴部闭合完美，大阴唇紧致合拢，小阴唇粉嫩隐蔽，处女膜完整无缺，未经任何阴茎或器物侵入，颜色呈淡粉，褶皱细密，未经开发的圣洁之域。',
  anus: '肛口紧致收缩，周围肌肤平滑浅粉，无任何扩张或摩擦痕迹，从未被进入。',
  hips: '臀部圆润挺翘，臀瓣紧实，肌肤细腻，无任何抓痕或拍打印记。',
  limbs: '四肢修长匀称，关节柔韧，皮肤光滑，未因性事留下任何青紫或疲劳。',
  skin: '全身皮肤白嫩如脂，触感丝滑，无吻痕、齿印或精斑，尽显处女之洁净。',
  other: '身体其他部位均保持天然状态，无性爱留下的任何印记。',
};

const intimacyBodyTemplate = {
  id: 'intimacy-body',
  title: '亲密与身体状态初始化模板（色情化版）',

  partLabels: { overall: '整体', mouth: '口部', chest: '胸部', genital: '阴部', anus: '肛部', hips: '臀部', limbs: '四肢', skin: '皮肤', other: '其他' },

  sexPartLabels: {
    genital: '阴部次数', chest: '胸部次数', lips: '嘴唇次数', mouth: '口部次数', oralAction: '口部行为次数',
    oralSex: '口交次数', oralInternalFinish: '口交中出次数', genitalEntry: '阴部进入次数', vaginalInsertion: '阴部插入次数',
    vaginalInternalFinish: '阴部中出次数', anus: '肛门次数', analEntry: '肛部进入次数', analSex: '肛交次数',
    analInternalFinish: '肛交中出次数', legs: '腿部次数', hips: '臀部次数', hands: '手部次数', skin: '皮肤接触次数', other: '其他次数',
  },

  bodyDescriptions: intimacyBodyDescriptions,  // 使用新描述

  valueDefaults: {
    sexualStatus: '处女', sexualStatusChanged: '非处女', sexualPartnerCount: 0, sexualPartners: [],
    sexualExperienceCount: 0, sexualExperiencePartCount: 0, updatedAt: '', intimacyReason: '默认未记录',
    bodyStatus: '稳定', bodyDescription: '身体状态稳定，无性经历痕迹', bodyReason: '初始处女状态', empty: '--',
  },

  displayTexts: {
    noPartner: '无', noRecord: '未记录', currentRecord: '当前记录。',
    publicWorld: '公共', otherPart: '其他', statusChange: '状态变化',
  },

  sexualExperiencePartDefaults: intimacyBodySexParts,
  sexualHistoryDefaults: { sexualStatus: '处女', sexualPartnerCount: 0, sexualPartners: [] },

  intimacyDefaults: {
    sexualStatus: '处女', sexualPartnerCount: 0, sexualPartners: [], sexualExperienceCount: 0,
    sexualExperienceParts: intimacyBodySexParts, updatedAt: '', reason: '默认处女状态，未经任何性行为',
  },

  bodyStatusDefaults: {
    overall: { partKey: 'overall', part: '整体', status: '稳定', description: intimacyBodyDescriptions.overall, reason: '初始处女身体状态', updatedAt: '' },
    mouth: { partKey: 'mouth', part: '口部', status: '稳定', description: intimacyBodyDescriptions.mouth, reason: '初始处女身体状态', updatedAt: '' },
    chest: { partKey: 'chest', part: '胸部', status: '稳定', description: intimacyBodyDescriptions.chest, reason: '初始处女身体状态', updatedAt: '' },
    genital: { partKey: 'genital', part: '阴部', status: '稳定', description: intimacyBodyDescriptions.genital, reason: '初始处女身体状态', updatedAt: '' },
    anus: { partKey: 'anus', part: '肛部', status: '稳定', description: intimacyBodyDescriptions.anus, reason: '初始处女身体状态', updatedAt: '' },
    hips: { partKey: 'hips', part: '臀部', status: '稳定', description: intimacyBodyDescriptions.hips, reason: '初始处女身体状态', updatedAt: '' },
    limbs: { partKey: 'limbs', part: '四肢', status: '稳定', description: intimacyBodyDescriptions.limbs, reason: '初始处女身体状态', updatedAt: '' },
    skin: { partKey: 'skin', part: '皮肤', status: '稳定', description: intimacyBodyDescriptions.skin, reason: '初始处女身体状态', updatedAt: '' },
    other: { partKey: 'other', part: '其他', status: '稳定', description: intimacyBodyDescriptions.other, reason: '初始处女身体状态', updatedAt: '' },
  },

  fieldMeta: {
    sexualStatus: { label: '当前状态', kind: '性经历', desc: '亲密经历当前状态（初始为处女）。', reasonFallback: '默认处女。' },
    sexualPartnerCount: { label: '经历人数', kind: '性经历', unit: '人', desc: '发生性关系的对象总数。', reasonFallback: '默认0人。' },
    sexualPartners: { label: '经历人列表', kind: '性经历', desc: '已计入经历的具体对象。', reasonFallback: '默认空。' },
    sexualExperienceCount: { label: '性经验总次数', kind: '角色卡', unit: '次', desc: '所有类型性行为的总次数。', reasonFallback: '默认0次。' },
    sexualExperienceParts: { label: '性经验分类次数', kind: '性经验分类', desc: '按部位细分的性行为次数。', reasonFallback: '默认全0。' },
    bodyStatus: { label: '当前身体状态', kind: '当前身体状态', desc: '身体各部位的状态描述（色情化）。', reasonFallback: '初始处女状态描述。' },
  },

  stateDefaults: [
    { key: 'intimacy', path: 'intimacy', factory: 'intimacy' },
    { key: 'bodyStatus', path: 'bodyStatus', factory: 'bodyStatus' },
  ],

  uiFieldDefs: [
    { key: 'sexualStatus', meta: 'sexualStatus', path: 'intimacy.sexualStatus', initialPath: 'sexualStatus' },
    { key: 'sexualPartnerCount', meta: 'sexualPartnerCount', path: 'intimacy.sexualPartnerCount', initialPath: 'sexualPartnerCount', display: 'count', unit: '人' },
    { key: 'sexualPartners', meta: 'sexualPartners', path: 'intimacy.sexualPartners', initialPath: 'sexualPartners', display: 'list', emptyText: 'noPartner' },
    { key: 'sexualExperienceCount', meta: 'sexualExperienceCount', path: 'intimacy.sexualExperienceCount', initialPath: 'sexualExperienceCount', display: 'count', unit: '次' },
    { key: 'sexualExperienceParts', meta: 'sexualExperienceParts', path: 'intimacy.sexualExperienceParts', initialPath: 'sexualExperienceParts', display: 'sexPartRows', labels: 'sexPartLabels' },
    { key: 'bodyStatus', meta: 'bodyStatus', path: 'bodyStatus', initialPath: 'bodyStatus', display: 'bodyStatusRows', labels: 'partLabels' },
  ],

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
    return { sexualStatus: intimacy.sexualStatus, sexualPartnerCount: intimacy.sexualPartnerCount, sexualPartners: this.displayTexts.noPartner, sexualExperienceCount: intimacy.sexualExperienceCount, sexualExperienceParts: this.sexualExperienceParts(), bodyStatus: this.bodyStatus() };
  },

  defaults() { return this; },
  fields() {
    return {
      partLabels: { defaultValue: this.clone(this.partLabels), meaning: '身体状态部位键与中文显示名。' },
      sexPartLabels: { defaultValue: this.clone(this.sexPartLabels), meaning: '性经验分类键与中文显示名。' },
      bodyDescriptions: { defaultValue: this.clone(this.bodyDescriptions), meaning: '每个身体部位的色情化处女状态描述。' },
      valueDefaults: { defaultValue: this.clone(this.valueDefaults), meaning: '亲密与身体状态通用缺省值。' },
      displayTexts: { defaultValue: this.clone(this.displayTexts), meaning: 'UI 展示和无记录状态的缺省文案。' },
      sexualExperiencePartDefaults: { defaultValue: this.clone(this.sexualExperiencePartDefaults), meaning: '每个性经验分类的默认次数。' },
      sexualHistoryDefaults: { defaultValue: this.clone(this.sexualHistoryDefaults), meaning: '性经历当前状态、经历人数和经历人列表的默认值。' },
      intimacyDefaults: { defaultValue: this.clone(this.intimacyDefaults), meaning: '完整亲密经历初始化对象。' },
      bodyStatusDefaults: { defaultValue: this.clone(this.bodyStatusDefaults), meaning: '完整身体各部位状态初始化对象。' },
      fieldMeta: { defaultValue: this.clone(this.fieldMeta), meaning: '每个 UI 字段的名称、类型、说明和缺省原因。' },
    };
  },

  editableFields() {
    const f = this.fields();
    return {
      intimacy: { meaning: '玩家或角色的亲密经历初始化，只保存中性元数据。', defaults: f.intimacyDefaults.defaultValue, fields: {
        sexualStatus: { defaultValue: f.sexualHistoryDefaults.defaultValue?.sexualStatus, meaning: '性经历当前状态；初始为处女。' },
        sexualPartnerCount: { defaultValue: f.sexualHistoryDefaults.defaultValue?.sexualPartnerCount, meaning: '经历人数。' },
        sexualPartners: { defaultValue: f.sexualHistoryDefaults.defaultValue?.sexualPartners, meaning: '经历对象列表。' },
        sexualExperienceCount: { defaultValue: f.intimacyDefaults.defaultValue?.sexualExperienceCount, meaning: '抽象性经验总次数；初始0。' },
        sexualExperienceParts: { defaultValue: f.sexualExperiencePartDefaults.defaultValue, meaning: '分部位抽象次数统计；每个分类默认0。' },
        updatedAt: { defaultValue: f.intimacyDefaults.defaultValue?.updatedAt, meaning: '初始化时间；无明确时间可留空。' },
        reason: { defaultValue: f.intimacyDefaults.defaultValue?.reason, meaning: '初始化依据；引用现实推演正文事实。' },
      } },
      bodyStatus: { meaning: '各身体部位当前状态初始化，只保存中性短状态和描述。', defaults: f.bodyStatusDefaults.defaultValue, fields: {
        partKey: { defaultValue: 'overall', meaning: '部位键；只能使用 bodyStatusDefaults 中存在的键。' },
        part: { defaultValue: f.partLabels.defaultValue?.overall, meaning: '部位中文名。' },
        status: { defaultValue: f.valueDefaults.defaultValue?.bodyStatus, meaning: '短状态。' },
        description: { defaultValue: f.valueDefaults.defaultValue?.bodyDescription, meaning: '色情化处女状态描述。' },
        reason: { defaultValue: f.valueDefaults.defaultValue?.bodyReason, meaning: '初始化依据；引用现实推演正文事实。' },
        updatedAt: { defaultValue: f.valueDefaults.defaultValue?.updatedAt, meaning: '初始化时间；无明确时间可留空。' },
      } },
    };
  },

  jsonFormat() {
    const editable = this.editableFields();
    return { initUpdates: [{ target: 'player-self 或角色id/姓名', subject: { type: 'player 或 character', id: 'player-self 或角色id', name: '玩家或角色名' }, section: '亲密与身体状态初始化', fields: { intimacy: editable.intimacy.defaults, bodyStatus: editable.bodyStatus.defaults }, reason: '正文中的初始化依据' }] };
  },

  promptText() {
    return ['### 亲密与身体状态初始化字段模板（色情化）', '只在现实推演正文明确支持初始化时填写；没有依据的字段保持缺省值或不返回。', `全部默认配置与含义：${JSON.stringify(this.fields())}`, `可填写字段与含义：${JSON.stringify(this.editableFields())}`, `规范 JSON 格式：${JSON.stringify(this.jsonFormat())}`].join('\n\n');
  },
};

window.GameModules.initTemplateSources.intimacyBody = intimacyBodyTemplate;
window.GameModules.initDefaults.intimacyBody = intimacyBodyTemplate;
