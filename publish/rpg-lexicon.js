window.GameModules = window.GameModules || {};

window.GameModules.rpgLexicon = {
  normalizeName(name) {
    return String(name || '').trim().slice(0, 32);
  },

  entry(worldTag, kind, name, data = {}) {
    const clean = this.normalizeName(name);
    if (!clean) return null;
    const ai = this.aiFlags(kind, data);
    return {
      worldTag: worldTag || '原创世界',
      kind,
      name: clean,
      summary: String(data.summary || data.desc || data.description || '').slice(0, 80),
      description: String(data.description || data.desc || data.summary || '').slice(0, 240),
      value: Object.prototype.hasOwnProperty.call(data, 'value') ? data.value : null,
      nameAiGenerated: ai.name,
      valueAiGenerated: ai.value,
      changeMode: String(data.changeMode || this.defaultChangeMode(data.source)).slice(0, 80),
      hierarchy: ['tree', 'leaf'].includes(data.hierarchy) ? data.hierarchy : this.defaultHierarchy(kind),
      promptInstruction: String(data.promptInstruction || this.defaultPromptInstruction(kind, clean)).slice(0, 260),
      aliases: Array.isArray(data.aliases) ? data.aliases.slice(0, 6).map(String) : [],
      related: Array.isArray(data.related) ? data.related.slice(0, 12).map(String) : [],
      meta: data.meta || {},
      source: data.source || 'runtime',
    };
  },

  aiFlags(kind, data = {}) {
    const source = String(data.source || '');
    const mode = String(data.changeMode || '');
    const nameFlag = data.nameAiGenerated ?? data.aiGenerated ?? (source === 'ai' && kind !== '玩家设定');
    const valueFlag = data.valueAiGenerated ?? data.aiGenerated ?? (source === 'ai' || mode.includes('AI'));
    return { name: Boolean(nameFlag), value: Boolean(valueFlag) };
  },

  defaultChangeMode(source) {
    if (source === 'schema' || source === 'system') return '代码计算';
    if (source === 'player') return '用户主动';
    return 'AI演算';
  },

  defaultHierarchy(kind) {
    return ['知识树', '技能树', '职业树'].includes(kind) ? 'tree' : 'leaf';
  },

  compactPrompt(content, change) {
    return `${content}，${change}`.slice(0, 260);
  },

  playerPromptInstruction(name) {
    const map = {
      姓名: ['玩家登记姓名或代号', '玩家主动改名或登记资料被明确修正时才可改变。'],
      生日: ['玩家登记的公历生日', '仅玩家主动修正生日时可改变。'],
      年龄: ['按生日与当前日期计算的周岁', '日期推进跨生日或生日被修正时才可改变。'],
      具体地址: ['精确到省/市州/区县/镇街道/社区或小区/楼栋/门牌', '玩家明确搬家、主动改址或剧情确认住址变更时才可改变。'],
      现实身份: ['2026现实世界中的学校年级、职业或日常社会身份', '年龄、学业、工作、地址或玩家设定发生明确变化时才可改变。'],
      居住状态: ['独居、同住、寄宿、租住等当前生活状态', '搬家、同住者变化、经济条件变化或玩家主动设定时才可改变。'],
      父母状态: ['父母存活、已故、失踪或其他可判定状态', '玩家设定、调查证据或剧情事实改写亲属状态时才可改变。'],
      父母去世原因: ['父母已故时的具体、克制、现实死因', '仅父母状态为已故且玩家设定或调查证据给出新事实时可改变。'],
      人际关系: ['玩家明确填写或剧情固化的亲友、同学、同事等关系', '玩家主动补充、互动结果或关系断裂/建立时才可改变。'],
      世界观补全: ['围绕玩家资料补齐的现实背景与社会处境', '核心资料、地点、身份或关键关系变化后才可重算。'],
      备注: ['玩家补充的个人设定备注', '仅玩家主动修改备注时可改变。'],
    };
    const hit = map[name];
    return hit ? this.compactPrompt(hit[0], hit[1]) : this.compactPrompt(`玩家设定“${name}”的准确可落库内容`, '玩家主动设定或资料事实变化时才可改变。');
  },

  attributePromptInstruction(name) {
    const map = {
      个人等级: ['角色总体成长等级与经验进度', '获得足够经验并通过升级公式结算时才可改变。'],
      自由属性点: ['升级获得且尚未分配的属性点余额', '升级增加或玩家分配消耗时才可改变。'],
      升级成长记录: ['每次升级的自动加点、自由点与来源记录', '个人等级实际提升并完成成长结算时追加。'],
      生命力: ['当前承伤、生存与身体完整状态', '受伤、治疗、休息、疾病或恢复效果结算时才可改变。'],
      精力池: ['体能耐力与持续行动余量', '剧烈行动、休息、进食、技能消耗或恢复效果结算时才可改变。'],
      饱食度: ['进食状态对体力与恢复的影响', '进食、饥饿时间流逝或消耗效果结算时才可改变。'],
      水分: ['补水状态对体力与判断的影响', '饮水、脱水、流汗或时间流逝结算时才可改变。'],
      疲劳度: ['累积疲惫、伤痛和行动消耗', '行动消耗、休息、睡眠或异常状态结算时才可改变。'],
      学习能力: ['理解、模仿和掌握新知识技能的效率', '等级成长、长期训练、状态惩罚或特殊事件结算时才可改变。'],
      力量: ['肌肉输出、负重、破坏和近身爆发基础值', '升级、自由分配、训练成果或伤病惩罚结算时才可改变。'],
      敏捷: ['移动、反应、闪避和精细动作基础值', '升级、自由分配、训练成果或束缚伤病结算时才可改变。'],
      体质: ['抗伤、耐受、恢复和身体基础强度', '升级、自由分配、训练成果或疾病伤势结算时才可改变。'],
      智力: ['理解、推理、知识运用和分析能力', '升级、自由分配、学习成果或精神影响结算时才可改变。'],
      感知: ['观察、直觉、索敌和异常察觉能力', '升级、自由分配、训练成果或感官状态变化时才可改变。'],
      意志: ['抗压、专注、抵抗诱导和坚持行动能力', '升级、自由分配、心理冲击或坚定事件结算时才可改变。'],
      魅力: ['容貌与长相印象（漂亮、可爱、清秀、英俊等）、气质仪态，以及表达、吸引、说服和社会印象能力', '升级、自由分配、社交成果、名誉、外貌变化或造型打扮结算时才可改变；叙事若明确长相出众，魅力不应长期明显偏低。'],
    };
    const hit = map[name];
    return hit ? this.compactPrompt(hit[0], hit[1]) : this.compactPrompt(`${name}的当前值、阶段与来源拆分`, '对应公式、状态事件、等级成长或玩家分配完成结算时才可改变。');
  },

  defaultPromptInstruction(kind, name) {
    if (kind === '玩家设定') return this.playerPromptInstruction(name);
    if (kind === '属性') return this.attributePromptInstruction(name);
    if (kind === '职业树') return this.compactPrompt('职业等级父词条，汇总角色内化的长期能力、经验与胜任资格', '获得长期训练、遗忘失能、升级或修正任一职业子词条时才可改变。');
    if (kind === '知识树') return this.compactPrompt('知识储备父词条，汇总角色已掌握知识领域及其等级子词条', '新增、遗忘、升级或修正任一知识子词条时才可改变。');
    if (kind === '技能树') return this.compactPrompt('技能等级父词条，汇总角色经过训练或实践获得的技能子词条', '新增、遗忘、升级、伤病限制或修正任一技能子词条时才可改变。');
    if (kind === '职业') return this.compactPrompt('内化职业能力、经验与胜任资格，含等级、经验和可胜任范围，不等同当前岗位', '获得长期训练、遗忘失能、职业升级或设定修正时才可改变。');
    if (kind === '知识') return this.compactPrompt('具体知识领域，含等级、经验、来源与当前可用范围', '学习、调查、阅读、授课、记忆恢复或遗忘事件明确结算时才可改变。');
    if (kind === '技能') return this.compactPrompt('可执行行动能力，含等级、经验、熟练度与当前效果', '训练、实战使用、教学、失败复盘、伤病限制或升级结算时才可改变。');
    if (kind === '装备') return this.compactPrompt('当前持有或可调用的重要装备，含效果、状态、持有者与是否可穿戴', '获得、损坏、丢失、转让、维修、升级改造或穿戴状态变化时才可改变。');
    if (kind === '物品') return this.compactPrompt('当前持有、可消耗、可转让或可用于现实行动的普通物品，含数量、用途与位置', '获得、消耗、丢失、转让、使用、拆封或位置变化时才可改变。');
    if (kind === '穿着') return this.compactPrompt('当前穿戴在人体着装部位和随身位置的衣物、鞋帽、饰品与包具，必须写明槽位', '更衣、脱下、穿上、损坏、清洗、替换或外观状态变化时才可改变。');
    if (kind === '社群角色' || kind === '阵营') return this.compactPrompt('社群角色叶子词条，名称与定义都必须写明社群和角色两个字段', '加入退出居住社区、家庭、社交圈或临时群体，或社会角色变化时才可改变。');
    if (kind === '势力地位') return this.compactPrompt('势力地位叶子词条，名称与定义都必须写明势力和地位两个字段，地位必须体现组织层级、职级、年级或职位', '加入退出势力、任免岗位、升降级、转部门或职级变化时才可改变。');
    if (kind === '状态') return this.compactPrompt('当前处境、身份标签或异常状态，含触发原因与持续条件', '触发条件出现、强度变化、持续时间结束或解除条件达成时才可改变。');
    return this.compactPrompt(`${kind || '词条'}“${name}”的准确、可落库、可判定内容`, '同类词条对应的数值、归属、状态或规则来源完成结算时才可改变。');
  },

  shouldRefreshPromptInstruction(value) {
    const text = String(value || '');
    return !text || /生成内容：|改变要求：|只有剧情事实明确改变该词条时才可改变/.test(text);
  },

  get(worldTag, kind, name) {
    return window.GameModules.sqliteSave.getLexiconEntry?.(worldTag || '原创世界', kind, this.normalizeName(name));
  },

  async save(worldTag, kind, name, data) {
    const changed = await this.applyLexiconSkill?.([{ worldTag, kind, name, ...(data || {}) }]);
    return changed?.[0] || null;
  },

  async saveMany(entries) {
    return this.applyLexiconSkill?.(entries) || [];
  },
};
