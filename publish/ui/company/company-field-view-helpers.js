window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.company = window.GameModules.ui.company || {};

window.GameModules.ui.company.fieldViewHelpers = {
  companyOrganization() {
    return this.companyState?.employment?.active === false ? [] : (this.currentCompany().organization || []);
  },

  companyFields() {
    if (this.companyState?.employment?.active === false) return [];
    const c = this.currentCompany();
    const salary = c.salary || {};
    const work = c.workMode || {};
    const pay = this.monthlyPayPreview();
    const row = (key, label, value, desc) => ({ key: `unit-${key}`, label, kind: '字段展示', value: value || '未设定', raw: value || '', desc, reason: this.companyFieldReason(key, label, value), worldTag: '2026 现代都市现实世界', targetType: '单位', commonField: true });
    return [
      row('name', '单位名称', c.name, '当前任职关系绑定的单位主体；名称必须与势力名称一致。'),
      row('sourceFaction', '绑定势力', `${c.sourceFactionName || '未绑定'}｜${c.sourceFactionId || '无ID'}`, '单位信息的组织真源。'),
      row('type', '单位类型', c.type, '当前单位所属的组织类型。'),
      row('industry', '所属行业', c.industry, '当前工作环境所在行业。'),
      row('scale', '单位规模', c.scale, '当前组织的体量与规模。'),
      row('location', '办公地点', c.location, '当前通勤与日常上班地点。'),
      row('workMode', '用工制度', work.type, '玩家当前所处的工作关系类型。'),
      row('schedule', '上班制度', `${work.schedule || '未设定'} / ${work.workDays || '未设定'}`, '当前上下班与休息制度。'),
      row('workTime', '上班时间', `${work.startTime}-${work.endTime}`, '每日工作时间段。'),
      row('baseSalary', '底薪', `${salary.monthlyBase || 0}${salary.currency || 'CNY'}`, '本月固定工资基础。'),
      row('workDays', '完整上班天数', `${pay.workDays}天`, '当前月份可计算的完整工作日。'),
      row('dailySalary', '日薪', `${pay.daily} / 天`, '按底薪和工作日计算出的日薪。'),
      row('annualPerformance', '年底绩效', `${pay.performanceMonths}个月底薪 * ${Math.round(pay.rate * 100)}% = ${pay.annualPerformance}`, '年底绩效预估。'),
      row('generatedAt', '单位资料生成时间', c.generatedAt || '未生成', '由 AI 基于势力信息生成当前单位资料的时间。'),
    ];
  },
};
