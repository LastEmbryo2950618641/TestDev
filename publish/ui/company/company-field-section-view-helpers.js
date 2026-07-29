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
      emptyText: this.companyState?.generating ? '单位资料生成中…' : (this.companyState?.generationError || '暂无在职单位信息'),
      rows,
    };
  },
};
