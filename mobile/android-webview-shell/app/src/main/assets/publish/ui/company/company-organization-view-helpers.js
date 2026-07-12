window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.company = window.GameModules.ui.company || {};

window.GameModules.ui.company.organizationViewHelpers = {
  companyOrganizationSectionView() {
    const departments = this.companyOrganization().map((dept = {}) => ({
      key: dept.name || 'unknown-dept',
      name: dept.name || '未命名部门',
      sectionTitle: `${dept.name || '未命名部门'}组织区`,
      jobRows: (Array.isArray(dept.jobs) ? dept.jobs : []).map((job = {}, index = 0) => ({
        key: `${dept.name || 'dept'}-${job.title || index}`,
        title: job.title || '未命名岗位',
        peopleText: `在岗人员：${Array.isArray(job.people) && job.people.length ? job.people.join('、') : '暂无'}`,
      })),
    }));

    return {
      emptyText: '暂无组织结构',
      departments,
    };
  },
};
