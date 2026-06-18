window.GameModules = window.GameModules || {};

window.GameModules.characterProfileTemplateClass = {
  clone(value) {
    return JSON.parse(JSON.stringify(value));
  },

  valueReason(value, reason) {
    return { value, reason };
  },

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

  metricItems(keys) {
    return keys.map((key) => ({ key, value: 0, status: `${key}因为当前人物处境形成初始状态`, reason: `${key}源于当前人物经历和关系证据` }));
  },

  part1(metrics) {
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
      feeling: { emotions: this.metricItems(metrics.emotionKeys), playerFeelings: this.metricItems(metrics.playerKeys) },
      factions: [{ faction: '所属社群', role: '成员身份', reason: '该社群角色由人物生活处境和关系证据确定。' }],
      force_positions: [{ force: '所属势力', position: '地位身份', reason: '该势力地位由人物身份、国籍或组织关系确定。' }],
      job: '',
      jobConfirmed: false,
      rank: '普通成员',
      control_experience: { 上线次数: 0, 习惯程度: '初次操控尚不熟悉' },
    };
  },

  learnedItem(name) {
    return { name, desc: `${name}的实际表现与可用范围。`, level: 2, levelEffects: this.levelEffects(), reason: `${name}来自人物经历、训练或生活环境。` };
  },

  professionItem(name) {
    return { ...this.learnedItem(name), 所需skills: ['基础能力'], 所需knowledge: ['基础知识'], 所需intrinsicBase: ['intelligence'], reason: `${name}由人物技能、知识和基础属性共同支持。` };
  },

  part2() {
    return {
      name: '角色姓名',
      skills: [this.learnedItem('基础能力')],
      knowledge: [this.learnedItem('基础知识')],
      professions: [this.professionItem('潜在职业')],
    };
  },

  wearingItems() {
    return [
      { slot: '上衣', name: '日常上衣', description: '符合当前人物身份和场景的上衣。', reason: '上衣由当前生活场景和人物习惯决定。' },
      { slot: '下衣', name: '日常下装', description: '符合当前人物身份和场景的下装。', reason: '下衣由当前生活场景和行动需要决定。' },
      { slot: '鞋子', name: '日常鞋履', description: '适合当前行动环境的鞋履。', reason: '鞋履由出行方式和行动场景决定。' },
    ];
  },

  rpgField() {
    const intrinsic = ['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma'];
    return {
      level: this.valueReason(3, '等级由年龄、训练程度、经验和世界观强度综合判断。'),
      intrinsicBase: Object.fromEntries(intrinsic.map((key) => [key, { value: 8, description: `${key}处于普通人到熟练者之间的表现。`, reason: `${key}由人物经历、身体状态和世界规则判断。` }])),
      derived: { 攻击力: this.valueReason(8, '攻击力由力量、技能和随身物品综合推算。'), 防御力: this.valueReason(8, '防御力由体质、穿着和防护条件综合推算。') },
    };
  },

  part3() {
    return {
      name: '角色姓名',
      items: [{ name: '随身物品', description: '当前人物合理随身携带的物品。', quantity: 1, reason: '该物品由身份、场景和行动需要决定。' }],
      wearing: this.wearingItems(),
      rpgField: this.rpgField(),
    };
  },

  parts(metrics = window.GameModules.metrics || { emotionKeys: [], playerKeys: [] }) {
    return { 1: this.clone(this.part1(metrics)), 2: this.clone(this.part2()), 3: this.clone(this.part3()) };
  },
};
