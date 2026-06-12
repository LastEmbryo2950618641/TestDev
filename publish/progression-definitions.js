window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.progression, {
  hasLearnedLevel(item) {
    return ['知识', '技能', '职业'].includes(item?.type) && Number(item?.level) !== -1;
  },

  levelDescription(type, lv) {
    const map = ['无', '入门：知道基本概念或能做最简单动作。', '初学：能在低压环境稳定使用。', '熟练：能处理常见情况。', '专业：能独立应对复杂情况。', '专家：能创新、优化或指导他人。', '大师：领域内极少数高位者。', '传说：世界观顶级或规格外。'];
    return `${type || '能力'}lv${lv}｜${map[lv]}`;
  },

  levelEffect(name, type, lv) {
    const scope = lv <= 2 ? '基础场景' : lv <= 4 ? '常见与复杂场景' : lv <= 6 ? '高压或专业场景' : '世界观顶级场景';
    return `${name}达到lv${lv}后，可在${scope}中提供${type === '职业' ? '职责、身份与资源影响' : '行动判定与成长效率'}加成。`;
  },

  learnedDefinition(name, type, source = '') {
    const text = String(source || '').trim();
    if (text && !/暂无|资料|当前作用|长期身份与社会功能|角色已掌握的行动能力/.test(text)) return text;
    if (name === '世界常识') return '对整个世界的认知程度，包括国家、文化风俗、社会规则、地理环境和日常常识。';
    if (name === '手机操作') return '能够使用智能手机完成通讯、检索、拍摄、设置、应用切换和信息处理等操作。';
    if (name === '现实观察' || name === '观察') return '通过细节、环境变化和他人反应判断局势的能力。';
    if (type === '知识') return `对“${name}”这一知识领域的概念、规则、背景和应用范围的理解程度。`;
    if (type === '职业') return `以“${name}”为核心的职业身份、职责范围、专业能力和社会资源。`;
    return `执行“${name}”相关行动时所需的理解、操作熟练度和稳定发挥能力。`;
  },
});
