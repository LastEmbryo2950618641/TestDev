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

  sexPartPrompts: {
    genital: '仅当正文明确发生对阴部的性接触、刺激、暴露检查或与性行为直接相关的处置时增加；普通视线、普通洗浴、日常衣物摩擦不计。',
    chest: '仅当正文明确发生对胸部的性接触、刺激、揉压、亲吻或与性行为直接相关的处置时增加；普通穿衣、碰撞或医疗外观检查不计。',
    lips: '仅当正文明确发生带亲密或性意味的接吻、舔吻、吮吻等唇部接触时增加；普通说话、进食、无亲密意味的触碰不计。',
    mouth: '仅当正文明确发生口腔被用于亲密、性接触、含入口腔或明显性意味的口部互动时增加；普通饮食、说话、刷牙不计。',
    oralAction: '仅当正文明确发生由口部主动参与的性行为或性服务行为时增加；单纯接吻不计入此项，可计入嘴唇次数。',
    oralSex: '仅当正文明确发生口部与对方性器官之间的性行为时增加；暗示、未完成尝试或普通亲吻不计。',
    oralInternalFinish: '仅当正文明确发生口部性行为并伴随射入口腔、吞咽或口内结束事实时增加；外部结束或模糊暗示不计。',
    genitalEntry: '仅当正文明确发生阴部被进入这一事实时增加；外部摩擦、触碰、未进入尝试不计。',
    vaginalInsertion: '仅当正文明确发生阴道插入行为时增加；外部接触、器械检查或未进入不计。',
    vaginalInternalFinish: '仅当正文明确发生阴道插入并伴随体内结束事实时增加；外部结束或模糊暗示不计。',
    anus: '仅当正文明确发生肛部性接触、刺激、扩张、检查或与性行为直接相关的处置时增加；普通如厕、清洁不计。',
    analEntry: '仅当正文明确发生肛部被进入这一事实时增加；外部接触或未进入尝试不计。',
    analSex: '仅当正文明确发生肛交行为时增加；肛部外部刺激或准备动作不计入此项。',
    analInternalFinish: '仅当正文明确发生肛交并伴随体内结束事实时增加；外部结束或模糊暗示不计。',
    legs: '仅当正文明确发生腿部参与性接触、夹压、摩擦、束缚或带性意味的抚触时增加；普通行走、跌倒、换衣不计。',
    hips: '仅当正文明确发生臀部参与性接触、拍打、揉捏、摩擦或带性意味的暴露时增加；普通坐下、碰撞不计。',
    hands: '仅当正文明确发生手部主动或被动参与性接触、抚摸、刺激、抓握等行为时增加；普通握手、拿取物品不计。',
    skin: '仅当正文明确发生大面积肌肤亲密接触、裸露贴合、性意味抚触或留下性痕迹时增加；普通擦肩、医疗清洁不计。',
    other: '仅当正文存在明确性经历事实但不属于以上分类时增加；不得用来记录模糊暗示、心理想象或未发生行为。',
  },

  bodyDescriptions: intimacyBodyDescriptions,  // 使用新描述

  valueDefaults: {
    sexualStatus: '未知', sexualStatusChanged: '非处女', sexualPartnerCount: 0, sexualPartners: [],
    sexualExperienceCount: 0, sexualExperiencePartCount: 0, updatedAt: '', intimacyReason: '尚未按上下文判定',
    bodyStatus: '稳定', bodyDescription: '身体状态稳定，当前状态待按上下文判定', bodyReason: '初始占位，待按身份与世界观判定', empty: '--',
  },

  displayTexts: {
    noPartner: '无', noRecord: '未记录', currentRecord: '当前记录。',
    publicWorld: '公共', otherPart: '其他', statusChange: '状态变化',
  },

  sexualExperiencePartDefaults: intimacyBodySexParts,
  sexualHistoryDefaults: { sexualStatus: '未知', sexualPartnerCount: 0, sexualPartners: [] },

  intimacyDefaults: {
    sexualStatus: '未知', sexualPartnerCount: 0, sexualPartners: [], sexualExperienceCount: 0,
    sexualExperienceParts: intimacyBodySexParts, updatedAt: '', reason: '尚未按身份与世界观判定当前状态',
  },

  bodyStatusDefaults: {
    overall: { partKey: 'overall', part: '整体', status: '稳定', description: intimacyBodyDescriptions.overall, reason: '初始占位身体状态', updatedAt: '' },
    mouth: { partKey: 'mouth', part: '口部', status: '稳定', description: intimacyBodyDescriptions.mouth, reason: '初始占位身体状态', updatedAt: '' },
    chest: { partKey: 'chest', part: '胸部', status: '稳定', description: intimacyBodyDescriptions.chest, reason: '初始占位身体状态', updatedAt: '' },
    genital: { partKey: 'genital', part: '阴部', status: '稳定', description: intimacyBodyDescriptions.genital, reason: '初始占位身体状态', updatedAt: '' },
    anus: { partKey: 'anus', part: '肛部', status: '稳定', description: intimacyBodyDescriptions.anus, reason: '初始占位身体状态', updatedAt: '' },
    hips: { partKey: 'hips', part: '臀部', status: '稳定', description: intimacyBodyDescriptions.hips, reason: '初始占位身体状态', updatedAt: '' },
    limbs: { partKey: 'limbs', part: '四肢', status: '稳定', description: intimacyBodyDescriptions.limbs, reason: '初始占位身体状态', updatedAt: '' },
    skin: { partKey: 'skin', part: '皮肤', status: '稳定', description: intimacyBodyDescriptions.skin, reason: '初始占位身体状态', updatedAt: '' },
    other: { partKey: 'other', part: '其他', status: '稳定', description: intimacyBodyDescriptions.other, reason: '初始占位身体状态', updatedAt: '' },
  },

  fieldMeta: {
    sexualStatus: { label: '当前状态', kind: '性经历', desc: '亲密经历当前状态（处女/处男/非处女/非处男/未知）；须按身份、世界观与正文推定，禁止一律默认处女。', reasonFallback: '尚未按上下文判定。' },
    sexualPartnerCount: { label: '经历人数', kind: '性经历', unit: '人', desc: '发生性关系的对象总数；由经历对象名单自动计算。', reasonFallback: '默认0人。' },
    sexualPartners: { label: '经历人列表', kind: '性经历', desc: '已计入经历的具体对象名字；人数由此自动派生。', reasonFallback: '默认空。' },
    sexualExperienceCount: { label: '性经验总次数', kind: '角色卡', unit: '次', desc: '各分类次数之和；由系统自动计算。', reasonFallback: '默认0次。' },
    sexualExperienceParts: { label: '性经验分类次数', kind: '性经验分类', desc: '按部位细分的性行为次数；总次数由此求和。', reasonFallback: '默认全0。' },
    bodyStatus: { label: '当前身体状态', kind: '当前身体状态', desc: '身体各部位的状态描述（应与当前状态判定一致）。', reasonFallback: '初始身体状态描述。' },
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
      sexPartPrompts: { defaultValue: this.clone(this.sexPartPrompts), meaning: '每个性经验分类的次数增加标准。' },
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
        sexualStatus: { defaultValue: f.sexualHistoryDefaults.defaultValue?.sexualStatus, meaning: '性经历当前状态；须按身份/世界观/正文推定为处女、处男、非处女、非处男或未知；禁止一律默认处女。' },
        sexualPartnerCount: { defaultValue: f.sexualHistoryDefaults.defaultValue?.sexualPartnerCount, meaning: '经历人数；由系统按经历对象名单自动计算，AI 不要单独填写。' },
        sexualPartners: { defaultValue: f.sexualHistoryDefaults.defaultValue?.sexualPartners, meaning: '经历对象名字列表；仅阴部插入确认后写入，系统据此同步经历人数。' },
        sexualExperienceCount: { defaultValue: f.intimacyDefaults.defaultValue?.sexualExperienceCount, meaning: '抽象性经验总次数；由系统按各部位分类次数求和，AI 不要单独填写。' },
        sexualExperienceParts: { defaultValue: f.sexualExperiencePartDefaults.defaultValue, meaning: '分部位抽象次数统计；每个分类默认0；只有符合 sexPartPrompts 对应次数增加标准时才能增加；总次数由此自动派生。' },
        updatedAt: { defaultValue: f.intimacyDefaults.defaultValue?.updatedAt, meaning: '初始化时间；无明确时间可留空。' },
        reason: { defaultValue: f.intimacyDefaults.defaultValue?.reason, meaning: '初始化依据；引用现实推演正文事实。' },
      } },
      bodyStatus: { meaning: '各身体部位当前状态初始化，只保存中性短状态和描述。', defaults: f.bodyStatusDefaults.defaultValue, fields: {
        partKey: { defaultValue: 'overall', meaning: '部位键；只能使用 bodyStatusDefaults 中存在的键。' },
        part: { defaultValue: f.partLabels.defaultValue?.overall, meaning: '部位中文名。' },
        status: { defaultValue: f.valueDefaults.defaultValue?.bodyStatus, meaning: '短状态。' },
        description: { defaultValue: f.valueDefaults.defaultValue?.bodyDescription, meaning: '身体部位描述；须与 sexualStatus 判定一致，已非处时禁止写处子专属描述。' },
        reason: { defaultValue: f.valueDefaults.defaultValue?.bodyReason, meaning: '初始化依据；引用身份推定、世界观或正文事实。' },
        updatedAt: { defaultValue: f.valueDefaults.defaultValue?.updatedAt, meaning: '初始化时间；无明确时间可留空。' },
      } },
    };
  },

  jsonFormat() {
    const editable = this.editableFields();
    return { initUpdates: [{ target: 'player-self 或角色id/姓名', subject: { type: 'player 或 character', id: 'player-self 或角色id', name: '玩家或角色名' }, section: '亲密与身体状态初始化', fields: { intimacy: editable.intimacy.defaults, bodyStatus: editable.bodyStatus.defaults }, reason: '正文中的初始化依据' }] };
  },

  promptText() {
    return ['### 亲密与身体状态初始化字段模板', 'sexualStatus 必须按身份、世界观与正文推定，禁止无依据填处女；没有依据的字段保持未知或缺省。', `全部默认配置与含义：${JSON.stringify(this.fields())}`, `可填写字段与含义：${JSON.stringify(this.editableFields())}`, `规范 JSON 格式：${JSON.stringify(this.jsonFormat())}`].join('\n\n');
  },
};

window.GameModules.initTemplateSources.intimacyBody = intimacyBodyTemplate;
window.GameModules.initDefaults.intimacyBody = intimacyBodyTemplate;
