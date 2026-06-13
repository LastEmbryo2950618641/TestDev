window.GameModules = window.GameModules || {};

window.GameModules.companySystem = {
  defaultState(profile = {}) {
    const companyName = profile.workplace || '成都星河云栈科技有限公司';
    return {
      open: false,
      panelTab: 'profile',
      workPromptOpen: false,
      pendingWork: null,
      currentCompanyId: 'main-company',
      workStats: { month: '2026-06', lateCount: 0, absentCount: 0, performance: 100, commissionRate: 0, lastDecisionAt: '' },
      companies: [this.defaultCompany(companyName, profile)],
      contracts: [],
      submissions: [],
    };
  },

  defaultCompany(name, profile = {}) {
    const role = profile.refinedRole || profile.dailyRole || '现代都市员工';
    return {
      id: 'main-company', name, type: this.companyType(name, role), industry: this.industry(role),
      scale: '中小型公司', location: profile.refinedCity || profile.city || '现实城市未登记',
      workMode: { type: '员工', schedule: '双休制', workDays: '周一至周五', startTime: '09:00', endTime: '18:00', lateGraceMinutes: 10 },
      salary: { monthlyBase: this.baseSalary(role), performanceMonths: 2, minRate: 0, maxRate: 0.3, payday: '月底', currency: 'CNY' },
      rules: ['以底薪为每月收入核心', '休息日为每月周六和周日', '日薪=底薪÷当月完整上班天数', '年底绩效=公司绩效月数×底薪×绩效提成'],
      openings: [
        { id: 'employee', name: '员工制岗位', type: '员工', desc: '双休制，月收入为底薪，年底按绩效月数×底薪×绩效提成结算。' },
        { id: 'timed-task', name: '定时工任务', type: '定时工', desc: '规定时间内完成单项工作，按完成度给钱，不合格无报酬，超预期额外奖励。' },
        { id: 'creator', name: '创作者征稿', type: '创作者模式', desc: '向公司投稿方案、小说、作品，通过后可签稳定低分成或低保高分成合同。' },
      ],
      organization: this.defaultOrganization(profile),
      lexicon: [],
      updatedAt: new Date().toISOString(),
    };
  },

  companyType(name, role) {
    if (/工作室|studio/i.test(name)) return '工作室';
    if (/个体|自由|独立/.test(role)) return '个体户';
    if (/学校|学院|大学|中学/.test(name)) return '学校/机构';
    return '公司';
  },

  industry(role) {
    if (/程序|软件|计算机|后端|前端|AI|算法/.test(role)) return '互联网软件';
    if (/学生|学校/.test(role)) return '教育';
    if (/写作|小说|创作|画师|设计/.test(role)) return '内容创作';
    return '现代服务业';
  },

  defaultOrganization(profile = {}) {
    const player = profile.name || '玩家本人';
    return [
      { name: '管理层', jobs: [{ title: '总经理', people: ['林墨'] }, { title: '行政主管', people: ['周澜'] }] },
      { name: '产品研发部', jobs: [{ title: '产品经理', people: ['许青'] }, { title: '前端开发', people: [player] }, { title: '测试工程师', people: ['陈雨'] }] },
      { name: '内容创作部', jobs: [{ title: '签约编辑', people: ['沈鸢'] }, { title: '签约创作者', people: ['外部作者A', '外部作者B'] }] },
      { name: '运营支持部', jobs: [{ title: '内容运营', people: ['唐可'] }, { title: '定时工', people: ['临时工池'] }] },
    ];
  },

  baseSalary(role) {
    if (/高级|硕士|lv\.5|架构/.test(role)) return 18000;
    if (/程序|软件|设计|运营/.test(role)) return 9000;
    if (/学生/.test(role)) return 0;
    return 6000;
  },
};
