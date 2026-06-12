window.GameModules = window.GameModules || {};

window.GameModules.socialPosition = {
  splitRole(role) {
    return String(role || '').split(/[，,、；;]/).map((x) => x.trim()).filter(Boolean);
  },

  cleanLevel(text) {
    return String(text || '').replace(/lv\.?\d+/ig, '').trim();
  },

  mainProfession(role) {
    return this.cleanLevel(this.splitRole(role)[0] || role || '现代都市居民');
  },

  workplace(role, city = '') {
    const job = this.mainProfession(role);
    if (/程序|软件|开发|计算机|工程师/.test(job)) return '成都星河云栈科技有限公司';
    if (/医生|护士|医疗/.test(job)) return '成都市第三人民医院';
    if (/教师|老师|教授/.test(job)) return '成都市第七中学';
    if (/律师|法务/.test(job)) return '锦城联合律师事务所';
    if (/学生|高中|初中|小学|大学/.test(job)) return `${String(city || '本地').slice(0, 8)}第一中学`;
    return '成都青羊综合服务有限公司';
  },

  position(role) {
    const job = this.mainProfession(role);
    if (/程序|软件|开发|计算机|工程师/.test(job)) return /硕士|专家|lv\.?[5-7]/i.test(role) ? '高级后端工程师' : '软件工程师';
    if (/医生/.test(job)) return '主治医师';
    if (/护士/.test(job)) return '护士';
    if (/教师|老师|教授/.test(job)) return '任课教师';
    if (/学生|高中|初中|小学|大学/.test(job)) return '在读学生';
    return job && !/居民/.test(job) ? job : '居民';
  },

  item(faction, position, source = 'AI演算') {
    const f = String(faction || '未设定阵营').trim();
    const p = String(position || '成员').trim();
    return { name: `${f} / ${p}`, type: '阵营', faction: f, position: p, level: -1, description: `阵营：${f}；地位：${p}。该词条表示角色当前隶属或活动的组织、地点、群体，以及其在其中承担的身份层级。`, source, changeMode: source };
  },

  playerItems(profile = {}) {
    const role = profile.refinedRole || profile.dailyRole || profile.role || profile.job;
    const city = profile.refinedCity || profile.city || profile.faction || '';
    const workplace = profile.workplace || this.workplace(role, city);
    const position = profile.position || this.position(role);
    const community = city.replace(/\d.*$/, '') || city || '登记住址';
    return [this.item(workplace, position), this.item(community, '居民')];
  },
};
