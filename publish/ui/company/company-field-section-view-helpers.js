window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.company = window.GameModules.ui.company || {};

window.GameModules.ui.company.fieldSectionViewHelpers = {
  companyFieldSectionView() {
    const rows = this.companyFields().map((field) => ({
      key: field.key,
      field,
    }));

    return {
      emptyText: '暂无在职公司信息',
      rows,
    };
  },
};
