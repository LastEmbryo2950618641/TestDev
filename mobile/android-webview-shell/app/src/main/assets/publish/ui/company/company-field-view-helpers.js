window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.company = window.GameModules.ui.company || {};

window.GameModules.ui.company.fieldViewHelpers = {
  companyOrganization() {
    return !this.hasActiveCareerProfile?.() ? [] : (this.currentCompany().promotionRoutes || []);
  },

  companyFields() {
    if (!this.hasActiveCareerProfile?.()) return [];
    const c = this.currentCompany();
    const salary = c.salary || {};
    const work = c.workMode || {};
    const isFreelance = work.type === '自由职业';
    const pay = this.monthlyPayPreview();
    const projectsText = (Array.isArray(c.currentProjects) ? c.currentProjects : [])
      .map((item) => `${item.role || '参与角色'}：${item.description || '未填写项目说明'}`)
      .join('；');
    const row = (key, label, value, desc) => ({ key: `career-${key}`, label, kind: '字段展示', value: value || '未设定', raw: value || '', desc, reason: this.companyFieldReason(key, label, value), worldTag: '2026 现代都市现实世界', targetType: '职业生涯', commonField: true });
    const baseRows = [
      row('name', '职业主体', c.name, '当前职业生涯的工作单位、雇主、客户方或自由职业主体。'),
      row('positionTitle', '职位/职业', c.positionTitle, '玩家当前职业身份或承担岗位。'),
      row('department', '部门/团队', c.department, '当前职业所在部门、团队或项目组。'),
      row('sourceFaction', '参考势力', `${c.sourceFactionName || '未绑定'}｜${c.sourceFactionId || '无ID'}`, '职业生涯可参考已知势力，但不强制绑定。'),
      row('currentProjects', '当前参与项目', projectsText, '当前参与项目、承担角色与项目说明。'),
      row('type', '主体类型', c.type, '当前职业载体或组织类型。'),
      row('industry', '所属行业', c.industry, '当前工作环境所在行业。'),
      row('scale', '单位规模', c.scale, '当前组织的体量与规模。'),
      row('location', '办公地点', c.location, '当前通勤与日常上班地点。'),
      row('workMode', '用工制度', work.type, '玩家当前所处的工作关系类型。'),
    ];
    const modeRows = isFreelance ? [
      row('orderMode', '接单模式', work.orderMode || work.schedule, '自由职业的接单、交付与合作方式。'),
      row('availability', '可接单时间', work.availability || work.workDays, '自由职业可用于接单与交付的时间安排。'),
      row('orderIncome', '接单收入', salary.orderIncomeText || `${salary.monthlyExpectedIncome || pay.total || 0}${salary.currency || 'CNY'} / 月`, '按项目、稿件、外包或订单估算的收入。'),
      row('monthlyExpectedIncome', '本月预计收入', `${pay.total || 0}${salary.currency || 'CNY'}`, '根据当前接单情况估算的本月收入。'),
    ] : [
      row('schedule', '上班制度', `${work.schedule || '未设定'} / ${work.workDays || '未设定'}`, '当前上下班与休息制度。'),
      row('workTime', '上班时间', `${work.startTime}-${work.endTime}`, '每日工作时间段。'),
      row('baseSalary', '底薪', `${salary.monthlyBase || 0}${salary.currency || 'CNY'}`, '本月固定工资基础。'),
      row('workDays', '完整上班天数', `${pay.workDays}天`, '当前月份可计算的完整工作日。'),
      row('dailySalary', '日薪', `${pay.daily} / 天`, '按底薪和工作日计算出的日薪。'),
      row('annualPerformance', '年底绩效', `年收入总包${pay.annualPackage} * 当前绩效${pay.performance}/100 = ${pay.annualPerformance}`, '年底绩效由代码按年收入总包与当前绩效百分制计算。'),
    ];
    return [
      ...baseRows,
      ...modeRows,
      row('currentTasks', '当前任务', (c.currentTasks || []).join('；'), '当前正在推进的工作或职责。'),
      row('risks', '职业风险', (c.risks || []).join('；'), '当前职业压力与风险来源。'),
      row('generatedAt', '职业档案更新时间', c.generatedAt || '未生成', '由 AI 基于上下文生成或更新职业生涯的时间。'),
    ];
  },
};
