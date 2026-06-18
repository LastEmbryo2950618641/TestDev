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
      detail: '人物背景、生活处境和进入剧情的原因。',
      appearance: '外貌、体态、穿衣风格和可识别特征。',
      personality: '性格倾向、行为习惯和面对压力时的表现。',
      factions: [{ faction: '所属社群', role: '成员身份', reason: '该社群角色由人物生活处境和关系证据确定。' }],
      forcePositions: [{ force: '所属势力', position: '地位身份', reason: '该势力地位由人物身份、国籍或组织关系确定。' }],
      job: '',
      jobConfirmed: false,
      rank: '普通成员',
      control_experience: { 上线次数: 0, 习惯程度: '初次操控尚不熟悉' },
    };
  },

  part2() {
    return { name: '角色姓名', feeling: {
      emotions: this.metricObject({ cold: '冷静', fear: '恐惧', worry: '担忧', joy: '高兴', tension: '紧张', anger: '愤怒', shame: '羞耻', sadness: '悲伤', curiosity: '好奇', numbness: '麻木', jealousy: '嫉妒', despair: '绝望' }),
      playerFeelings: this.metricObject({ understanding: '了解', trust: '信任', resistance: '反抗', affection: '好感', friendship: '友情', familyLove: '亲情', romanticLove: '爱情', lust: '肉欲', awe: '畏惧', respect: '尊敬', admiration: '崇拜', dislike: '讨厌', dependence: '依赖', vigilance: '警惕', dominance: '支配欲', possessiveness: '占有欲', submission: '服从' }),
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

  wearSlot(bodyPart, name = '', description = '', reason = '当前场景没有穿戴该槽位物品。') {
    return { bodyPart, name, description, reason };
  },

  wearingObject() {
    return {
      head: this.wearSlot('头部'),
      neck: this.wearSlot('颈部'),
      innerwearTop: this.wearSlot('胸部', '日常内衣', '符合当前人物身份和场景的内衣。', '内衣由日常生活和身体遮蔽需要决定。'),
      top: this.wearSlot('躯干', '日常上衣', '符合当前人物身份和场景的上衣。', '上衣由当前生活场景和人物习惯决定。'),
      outerwear: this.wearSlot('躯干(外)'),
      gloves: this.wearSlot('手部'),
      waist: this.wearSlot('腰部'),
      innerwearBottom: this.wearSlot('腰臀', '日常内裤', '符合当前人物身份和场景的内裤。', '内裤由日常生活和身体遮蔽需要决定。'),
      bottom: this.wearSlot('腿部', '日常下装', '符合当前人物身份和场景的下装。', '下衣由当前生活场景和行动需要决定。'),
      socks: this.wearSlot('脚踝', '日常袜子', '适合当前鞋履和场景的袜子。', '袜子由出行方式和穿鞋需要决定。'),
      shoes: this.wearSlot('脚部', '日常鞋履', '适合当前行动环境的鞋履。', '鞋履由出行方式和行动场景决定。'),
      wrist: this.wearSlot('手腕'),
      slot: [],
    };
  },

  rpgField() {
    const intrinsic = ['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma'];
    return {
      level: this.valueReason(3, '等级由年龄、训练程度、经验和世界观强度综合判断。'),
      intrinsicBase: Object.fromEntries(intrinsic.map((key) => [key, { value: 8, description: `${key}处于普通人到熟练者之间的表现。`, reason: `${key}由人物经历、身体状态和世界规则判断。` }])),
      derived: { 攻击力: this.valueReason(8, '攻击力由力量、技能和随身物品综合推算。'), 防御力: this.valueReason(8, '防御力由体质、穿着和防护条件综合推算。') },
    };
  },

  part4() {
    return { name: '角色姓名', items: [{ name: '随身物品', description: '当前人物合理随身携带的物品。', quantity: 1, reason: '该物品由身份、场景和行动需要决定。' }], wearing: this.wearingObject() };
  },

  part5() {
    return { name: '角色姓名', rpgField: this.rpgField() };
  },

  parts() { return { 1: this.clone(this.part1()), 2: this.clone(this.part2()), 3: this.clone(this.part3()), 4: this.clone(this.part4()), 5: this.clone(this.part5()) }; },
};
