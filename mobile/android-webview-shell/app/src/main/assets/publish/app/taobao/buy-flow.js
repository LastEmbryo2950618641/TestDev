window.GameModules = window.GameModules || {};

window.GameModules.taobaoBuyFlow = Object.assign(window.GameModules.taobaoBuyFlow || {}, {
  async buyTaobaoSlot(slotId) {
    this.initTaobaoApp();
    const slot = this.taobaoState.slots.find((item) => item.id === slotId);
    await this.buyTaobaoProduct(slot?.product || null);
  },

  resolveBuyProduct(product = null) {
    this.initTaobaoApp();
    return this.taobaoSelectedProduct(product);
  },

  canStartPurchase(item) {
    this.initTaobaoApp();
    return this.taobaoCanStartPurchase(item, this.taobaoState.buyingId);
  },

  async ensureBuyInventoryState() {
    return await this.ensurePlayerRpgState?.();
  },
});
