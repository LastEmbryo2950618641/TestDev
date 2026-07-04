window.GameModules = window.GameModules || {};

window.GameModules.realWorldLayoutCatalogActions = {
  realWorldLayoutCatalogTemplateId: '',

  layoutTemplatesApi() {
    return window.GameModules.realWorldMapInteriorTemplates;
  },

  realWorldLayoutCatalogItems() {
    return this.layoutTemplatesApi()?.list?.() || [];
  },

  realWorldLayoutCatalogBasicItems() {
    return this.realWorldLayoutCatalogItems().filter((item) => !item.category || item.category !== 'luxury');
  },

  realWorldLayoutCatalogLuxuryItems() {
    return this.realWorldLayoutCatalogItems().filter((item) => item.category === 'luxury');
  },

  realWorldLayoutCatalogSelected() {
    const id = String(this.realWorldLayoutCatalogTemplateId || '');
    if (!id) return null;
    return this.realWorldLayoutCatalogItems().find((item) => item.id === id) || null;
  },

  realWorldLayoutCatalogCategoryLabel(item = {}) {
    return item.category === 'luxury' ? '豪宅/高端' : '普通住宅';
  },

  realWorldLayoutCatalogSlotsText(item = {}) {
    return (item.slots || []).join('、') || '—';
  },

  openRealWorldLayoutCatalog(templateId = '') {
    this.realWorldLayoutCatalogTemplateId = String(templateId || '');
    requestAnimationFrame(() => this.renderRealWorldLayoutCatalogCanvas());
  },

  backRealWorldLayoutCatalogList() {
    this.realWorldLayoutCatalogTemplateId = '';
  },

  demoLayoutForTemplate(templateId = '') {
    const tpl = this.layoutTemplatesApi();
    const item = this.realWorldLayoutCatalogItems().find((row) => row.id === templateId);
    if (!item) return null;
    const demoResidents = (item.slots || [])
      .filter((slot) => /^(bed_\d+|master|suite_\d+)$/u.test(slot))
      .map((slot, index) => `示例${index + 1}`);
    return tpl?.build?.(templateId, {
      residents: demoResidents,
      slotAssignments: {},
    });
  },

  renderRealWorldLayoutCatalogCanvas() {
    const id = String(this.realWorldLayoutCatalogTemplateId || '');
    const canvas = document.querySelector('.real-world-layout-catalog-canvas');
    if (!id || !canvas) return;
    const layout = this.demoLayoutForTemplate(id)
      || window.GameModules.realWorldMapInteriorTemplates?.materialize?.(id, {});
    if (!layout) return;
    window.GameModules.realWorldMapInterior?.drawRoomLayout?.(canvas, layout);
  },
};
