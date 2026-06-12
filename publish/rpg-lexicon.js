window.GameModules = window.GameModules || {};

window.GameModules.rpgLexicon = {
  normalizeName(name) {
    return String(name || '').trim().slice(0, 32);
  },

  entry(worldTag, kind, name, data = {}) {
    const clean = this.normalizeName(name);
    if (!clean) return null;
    return {
      worldTag: worldTag || '原创世界',
      kind,
      name: clean,
      summary: String(data.summary || data.desc || data.description || '').slice(0, 80),
      description: String(data.description || data.desc || data.summary || '').slice(0, 240),
      value: Object.prototype.hasOwnProperty.call(data, 'value') ? data.value : null,
      nameAiGenerated: Boolean(data.nameAiGenerated ?? data.aiGenerated),
      valueAiGenerated: Boolean(data.valueAiGenerated),
      changeMode: String(data.changeMode || this.defaultChangeMode(data.source)).slice(0, 80),
      promptInstruction: String(data.promptInstruction || this.defaultPromptInstruction(kind, clean)).slice(0, 260),
      aliases: Array.isArray(data.aliases) ? data.aliases.slice(0, 6).map(String) : [],
      related: Array.isArray(data.related) ? data.related.slice(0, 12).map(String) : [],
      meta: data.meta || {},
      source: data.source || 'runtime',
    };
  },

  defaultChangeMode(source) {
    if (source === 'schema' || source === 'system') return '代码计算';
    if (source === 'player') return '用户主动';
    return 'AI演算';
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
      魅力: ['表达、吸引、说服和社会印象能力', '升级、自由分配、社交成果、名誉或外观状态变化时才可改变。'],
    };
    const hit = map[name];
    return hit ? this.compactPrompt(hit[0], hit[1]) : this.compactPrompt(`${name}的当前值、阶段与来源拆分`, '对应公式、状态事件、等级成长或玩家分配完成结算时才可改变。');
  },

  defaultPromptInstruction(kind, name) {
    if (kind === '玩家设定') return this.playerPromptInstruction(name);
    if (kind === '属性') return this.attributePromptInstruction(name);
    if (kind === '职业') return this.compactPrompt('真实职业、训练身份或社会功能，含等级、经验、职责与当前作用', '获得/失去职位、训练认证、长期实践、剧情判定升级或身份被撤销时才可改变。');
    if (kind === '知识') return this.compactPrompt('具体知识领域，含等级、经验、来源与当前可用范围', '学习、调查、阅读、授课、记忆恢复或遗忘事件明确结算时才可改变。');
    if (kind === '技能') return this.compactPrompt('可执行行动能力，含等级、经验、熟练度与当前效果', '训练、实战使用、教学、失败复盘、伤病限制或升级结算时才可改变。');
    if (kind === '装备') return this.compactPrompt('当前持有或可调用的重要物品，含效果、状态与持有者', '获得、消耗、损坏、丢失、转让、维修或升级改造时才可改变。');
    if (kind === '阵营') return this.compactPrompt('所属组织、社会位置、权限、声望与关系状态', '加入、退出、背叛、任命、处罚、声望结算或组织关系变化时才可改变。');
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
    const clean = this.normalizeName(name);
    const old = this.get(worldTag, kind, clean);
    const promptInstruction = this.shouldRefreshPromptInstruction(old?.promptInstruction) ? (data?.promptInstruction || this.defaultPromptInstruction(kind, clean)) : old?.promptInstruction;
    const entry = this.entry(worldTag, kind, clean, { ...data, nameAiGenerated: old?.nameAiGenerated ?? old?.aiGenerated ?? data?.nameAiGenerated ?? data?.aiGenerated, valueAiGenerated: old?.valueAiGenerated ?? data?.valueAiGenerated, changeMode: old?.changeMode || data?.changeMode, promptInstruction });
    if (!entry) return null;
    await window.GameModules.sqliteSave.saveLexiconEntry?.(entry);
    return entry;
  },

  async saveMany(entries) {
    const save = window.GameModules.sqliteSave;
    if (!save.db || !entries.length) return;
    const now = new Date().toISOString();
    for (const raw of entries) {
      const old = this.get(raw.worldTag, raw.kind, raw.name);
      const promptInstruction = this.shouldRefreshPromptInstruction(old?.promptInstruction) ? (raw.promptInstruction || this.defaultPromptInstruction(raw.kind, this.normalizeName(raw.name))) : old?.promptInstruction;
      const entry = this.entry(raw.worldTag, raw.kind, raw.name, { ...raw, nameAiGenerated: old?.nameAiGenerated ?? old?.aiGenerated ?? raw.nameAiGenerated ?? raw.aiGenerated, valueAiGenerated: old?.valueAiGenerated ?? raw.valueAiGenerated, changeMode: old?.changeMode || raw.changeMode, promptInstruction });
      if (!entry) continue;
      save.db.run(
        'INSERT OR REPLACE INTO lexicon_entries(world_tag,kind,name,entry_json,source,created_at,updated_at) VALUES (?,?,?,?,?,COALESCE((SELECT created_at FROM lexicon_entries WHERE world_tag=? AND kind=? AND name=?),?),?)',
        [entry.worldTag, entry.kind, entry.name, JSON.stringify(entry), entry.source, entry.worldTag, entry.kind, entry.name, now, now],
      );
    }
    await save.persist();
  },
};
