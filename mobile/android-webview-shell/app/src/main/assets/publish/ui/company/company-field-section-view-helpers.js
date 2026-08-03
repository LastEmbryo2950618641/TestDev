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
      showEmpty: !this.hasActiveCareerProfile?.(),
      emptyText: '暂无职业生涯信息，等待现实推演 Stage13 同步。',
      rows,
    };
  },
};
