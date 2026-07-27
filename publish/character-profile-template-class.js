window.GameModules = window.GameModules || {};

window.GameModules.characterProfileTemplateClass = {
  clone(value) { return JSON.parse(JSON.stringify(value)); },
  valueReason(value, reason) { return { value, reason }; },

  levelEffects() {
    return {
      lv1: { 程度介绍: '入门', 说明: '只能完成基础动作或理解基础概念' },
      lv2: { 程度介绍: '初学', 说明: '能在熟悉场景中稳定使用' },
      lv3: { 程度介绍: '熟练', 说明: '能独立处理常见复杂情况' },
      lv4: { 程度介绍: '专业', 说明: '能在专业场景中解决高难问题' },
      lv5: { 程度介绍: '专家', 说明: '能主导领域任务并指导他人' },
      lv6: { 程度介绍: '大师', 说明: '能形成体系化方法并培养团队' },
      lv7: { 程度介绍: '传说', 说明: '表现超越常规认知并影响领域规则' },
    };
  },

  metricObject(names) {
    return Object.fromEntries(Object.entries(names).map(([key, name]) => [key, { name, value: 0, status: `${name}因为当前人物处境形成初始状态`, reason: `${name}源于当前人物经历和关系证据` }]));
  },

  part1() {
    return {
      name: '角色姓名',
      worldTag: this.valueReason('所属世界', '所属世界来自人物资料、关系事件和世界观证据。'),
      age: this.valueReason(18, '年龄由人物资料、身份阶段和世界时间推断。'),
      gender: '性别',
      learningAbility: this.valueReason(8, '学习能力由教育经历、职业背景和适应表现判断。'),
      mentalStability: this.valueReason(8, '精神稳定度由性格、压力来源和过往经历判断。'),
      growthPotential: this.valueReason(8, '成长潜力由年龄阶段、资源环境和个人动机判断。'),
      actionAbility: this.valueReason(8, '行动能力由身体状态、生活经验和训练程度判断。'),
      relationships: '与玩家或相关人物的关系',
      role: '当前身份',
      currentLocation: '当前位置；格式为“所在世界·所在势力·动态层级链·地图地点·详细位置”。',
      detail: '人物背景、生活处境和进入剧情的原因。',
      appearance: '外貌、体态和可识别特征。',
      preferences: '稳定喜好，尤其是穿着偏好、颜色偏好、审美习惯和随身物偏好。',
      personality: '性格倾向、行为习惯和面对压力时的表现。',
      factions: [{ faction: '所属社群', role: '成员身份', reason: '该社群角色由人物生活处境和关系证据确定。' }],
      memberships: [{ orgName: '所属组织', title: '人事身份', department: '', departmentFog: true, reason: '该人事归属由人物身份、职位或组织关系确定。' }],
      certificates: [{ orgName: '认证组织', field: '认证领域', level: '资格认证等级', reason: '该证书由可指认组织或势力对人物领域资格的认证确定。' }],
      titles: [{ society: '认可群体', field: '认可领域', title: '称号名', reason: '该称号由社会群体对人物成就、名望或过往功绩的认可确定。' }],
      job: '',
      jobConfirmed: false,
      rank: '普通成员',
      control_experience: { 上线次数: 0, 习惯程度: '初次操控尚不熟悉' },
    };
  },

  part2() {
    return { name: '角色姓名', feeling: {
      emotions: this.metricObject(window.GameModules.metrics.emotionEnglishKeys),
      playerFeelings: this.metricObject(window.GameModules.metrics.playerEnglishKeys),
    } };
  },

  learnedItem(name) {
    return { name, desc: `${name}的实际表现与可用范围。`, level: 2, levelEffects: this.levelEffects(), reason: `${name}来自人物经历、训练或生活环境。` };
  },

  skillItem(name) {
    return { ...this.learnedItem(name), requiredKnowledge: ['基础知识'], requiredIntrinsicBase: ['intelligence'] };
  },

  professionItem(name) {
    return { ...this.learnedItem(name), requiredSkills: ['基础能力'], requiredKnowledge: ['基础知识'], requiredIntrinsicBase: ['intelligence'], reason: `${name}由人物技能、知识和基础属性共同支持。` };
  },

  part3() {
    return { name: '角色姓名', skills: [this.skillItem('基础能力')], knowledge: [this.learnedItem('基础知识')], professions: [this.professionItem('潜在职业')] };
  },

  wearSlot(clothing_position, name = '', description = '', reason = '当前场景没有穿戴该槽位物品。') {
    return { clothing_position, name, description, reason };
  },

  wearingObject() {
    return {
      head: this.wearSlot('头部'),
      neck: this.wearSlot('颈部'),
      innerwearTop: this.wearSlot('内衣'),
      top: this.wearSlot('上衣'),
      outerwear: this.wearSlot('外套'),
      gloves: this.wearSlot('手套'),
      waist: this.wearSlot('腰部'),
      innerwearBottom: this.wearSlot('内衣'),
      bottom: this.wearSlot('下装'),
      socks: this.wearSlot('袜子'),
      shoes: this.wearSlot('鞋子'),
      wrist: this.wearSlot('手腕'),
      slot: [],
    };
  },

  rpgField() {
    const intrinsic = ['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma'];
    return {
      level: this.valueReason(3, '等级由年龄、训练程度、经验和世界观强度综合判断。'),
      intrinsicBase: Object.fromEntries(intrinsic.map((key) => [key, { value: 8, description: `${key}处于普通人到熟练者之间的表现。`, reason: `${key}由人物经历、身体状态和世界规则判断。` }])),
    };
  },

  part4() {
    return { name: '角色姓名', items: [{ name: '随身物品', description: '当前人物合理随身携带的物品。', quantity: 1, reason: '该物品由身份、场景和行动需要决定。' }], wearing: this.wearingObject() };
  },

  naturalMetaTemplate() {
    return window.GameModules.appearanceProfileTags?.naturalMetaTemplate?.()
      || { overall: ['少女'], figure: ['纤细'], height: '158cm', weight: '43kg', skinTone: ['白皙'], aura: ['可爱'] };
  },

  dressedMetaTemplate() {
    return window.GameModules.appearanceProfileTags?.dressedMetaTemplate?.()
      || { styleBase: ['休闲'], makeupBase: ['日常淡妆'], colorScheme: ['米白'], hosiery: ['裸腿'], hairstyle: ['散发'], accessoryDensity: ['极简'] };
  },

  bodyProfile() {
    return [
      { index: 1, part: '头发', tags: ['乌黑', '及腰'], description: '天然头发的色泽、蓬松度和垂落走向。' },
      { index: 2, part: '脸部', tags: ['鹅蛋脸', '可爱'], description: '素净面容的眉眼鼻唇与天然气色。' },
      { index: 3, part: '耳朵', tags: ['小巧'], description: '耳廓、耳垂与耳后肌肤的自然形态。' },
      { index: 4, part: '脖颈', tags: ['修长'], description: '颈部线条、锁骨与颈窝的自然轮廓。' },
      { index: 5, part: '胸部', tags: ['贫乳'], description: '胸部未经束缚的天然轮廓和细节。' },
      { index: 6, part: '双臂', tags: ['纤细', '双手纤细'], description: '手臂、手腕、手背和手指的自然线条。' },
      { index: 7, part: '小腹', tags: ['平坦'], description: '腹部、肚脐和呼吸起伏的自然状态。' },
      { index: 8, part: '臀部', tags: ['小巧圆润'], description: '臀部饱满度和腰臀连接处的自然弧线。' },
      { index: 9, part: '神秘花园', tags: ['无阴毛'], description: '含蓄身体美学下的天然私密轮廓。' },
      { index: 10, part: '双大腿', tags: ['纤细'], description: '大腿线条、肌肤质感和站立时的自然贴合。' },
      { index: 11, part: '双小腿', tags: ['纤细', '修长'], description: '小腿肚、跟腱、脚踝和脚背的自然弧线。' },
    ];
  },

  dressedProfile() {
    return [
      { index: 1, part: '头发', tags: ['公主切', '发饰'], description: '盛装造型后的发型、光泽和发饰效果。' },
      { index: 2, part: '脸部', tags: ['精致妆容'], description: '完整妆容修饰后的眉眼鼻唇与肤色。' },
      { index: 3, part: '耳朵', tags: ['珍珠耳钉'], description: '佩戴耳饰后耳廓、耳垂与饰物反光。' },
      { index: 4, part: '脖颈', tags: ['细链项链'], description: '颈部饰品与锁骨颈线的盛装修饰。' },
      { index: 5, part: '胸部', tags: ['蕾丝内搭'], description: '胸衣、礼服或衬衣塑造后的胸部轮廓。' },
      { index: 6, part: '双臂', tags: ['银手链'], description: '袖口、臂饰、手镯、戒指和指甲修饰。' },
      { index: 7, part: '小腹', tags: ['细腰带'], description: '束腰、腰带或紧身服饰塑形后的腰腹。' },
      { index: 8, part: '臀部', tags: ['紧身下装'], description: '裙装或裤装包裹后的臀部线条。' },
      { index: 9, part: '神秘花园', tags: ['棉质内搭'], description: '下装精心遮掩与包裹后的含蓄状态。' },
      { index: 10, part: '双大腿', tags: ['过膝袜'], description: '丝袜、裤袜、长靴或裙摆衬托的大腿状态。' },
      { index: 11, part: '双小腿', tags: ['运动鞋', '中筒袜'], description: '鞋袜与鞋履装饰修饰后的小腿线条。' },
    ];
  },

  part5() {
    return { name: '角色姓名', bodyProfileMeta: this.naturalMetaTemplate(), bodyProfile: this.bodyProfile() };
  },

  part6() {
    return { name: '角色姓名', dressedProfileMeta: this.dressedMetaTemplate(), dressedProfile: this.dressedProfile() };
  },

  part7() {
    return { name: '角色姓名', rpgField: this.rpgField() };
  },

  parts() { return { 1: this.clone(this.part1()), 2: this.clone(this.part2()), 3: this.clone(this.part3()), 4: this.clone(this.part4()), 5: this.clone(this.part5()), 6: this.clone(this.part6()), 7: this.clone(this.part7()) }; },
};
