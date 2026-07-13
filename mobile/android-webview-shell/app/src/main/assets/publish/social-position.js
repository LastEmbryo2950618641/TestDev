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

  concreteReason(text, fallback) {
    const value = String(text || '').trim();
    if (value && !/^(AI演算|系统结算|系统词条调整|用户主动)$/.test(value)) return value.slice(0, 120);
    return String(fallback || '该词条由当前角色资料中的明确归属关系生成。').slice(0, 120);
  },

  item(community, role, reason = '') {
    const f = String(community || '未设定社群').trim();
    const r = String(role || '成员').trim();
    const detail = this.concreteReason(reason, `${f}来自角色当前住址、家庭、社交圈或临时群体资料，${r}是其在该社群中的社会角色。`);
    return { name: `${f} / ${r}`, type: '社群角色', faction: f, community: f, role: r, position: r, level: -1, description: `社群：${f}；角色：${r}。该词条表示角色当前所属的居住社区、家庭、社交圈或临时群体，以及其在其中承担的社会角色。`, source: 'ai', reason: detail, changeMode: detail };
  },

  membershipItem(orgName, title, reason = '', factionsOrStore = null, extra = {}) {
    const f = String(orgName || '未设定组织').trim();
    const p = String(title || '成员').trim();
    const detail = this.concreteReason(reason, `${f}是角色资料中可确认的组织归属，${p}是其在该组织中的当前人事身份。`);
    const store = factionsOrStore && factionsOrStore.factionState ? factionsOrStore : { factionState: { factions: Array.isArray(factionsOrStore) ? factionsOrStore : [] } };
    const orgId = window.GameModules.orgTerritory?.resolveOrgIdByName?.(store, f) || '';
    return {
      name: `${f} / ${p}`,
      type: '人事归属',
      orgName: f,
      orgId,
      title: p,
      department: String(extra.department || '').trim(),
      departmentFog: extra.departmentFog !== false && !String(extra.department || '').trim(),
      state: extra.state || 'sketch',
      level: -1,
      description: `组织：${f}；身份：${p}。${orgId ? `组织ID：${orgId}。` : ''}该词条表示角色在势力或社群组织架构中的部门、职位、身份或成员关系。`,
      source: 'ai',
      reason: detail,
      changeMode: detail,
      since: extra.since || '',
    };
  },

  playerItems(profile = {}) {
    const city = profile.refinedCity || profile.city || profile.faction || '';
    const community = city || '登记住址';
    return [this.item(community, '居民', `玩家资料登记的现实住址为${community}，因此玩家本人属于该居住社群并以居民身份显示。`)];
  },

  countryForceItems() {
    return [];
  },

  playerMembershipItems(profile = {}, factionsOrStore = null) {
    const role = profile.refinedRole || profile.dailyRole || profile.role || profile.job;
    const city = profile.refinedCity || profile.city || profile.faction || '';
    const workplace = profile.workplace || this.workplace(role, city);
    const position = profile.position || this.position(role);
    const reason = `玩家资料中的现实身份为${role || '现代都市居民'}，工作或学习归属确定为${workplace}，因此组织归属登记为${position || '成员'}。`;
    return workplace ? [this.membershipItem(workplace, position || '成员', reason, factionsOrStore)] : [];
  },

  membershipItems(profile = {}, factionsOrStore = null) {
    return this.playerMembershipItems(profile, factionsOrStore);
  },
};
