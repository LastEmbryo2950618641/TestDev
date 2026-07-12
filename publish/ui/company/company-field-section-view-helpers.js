window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.company = window.GameModules.ui.company || {};

window.GameModules.ui.company.fieldSectionViewHelpers = {
  companyFieldSectionView() {
    const rows = this.companyFields().map((field) => ({
      key: field.key,
      field,
      summary: this.rpgFieldSummary(field),
      detail: this.rpgFieldDetail(field),
      isOpen: this.isRpgFieldOpen(field),
    }));

    return {
      showEmpty: this.companyState?.employment?.active === false,
      emptyText: '暂无在职公司信息',
      rows,
    };
  },
};
