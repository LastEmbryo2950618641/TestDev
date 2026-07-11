window.GameModules = window.GameModules || {};
window.GameModules.taobaoBuyActions = {
  taobaoPurchaseFailureMessage(err) {
    return window.GameModules.taobaoDomainHelpers.taobaoPurchaseFailureMessage.call(this, err);
  },

  taobaoCanStartPurchase(item, buyingId = '') {
    return window.GameModules.taobaoDomainHelpers.taobaoCanStartPurchase.call(this, item, buyingId);
  },

  taobaoHasEnoughFunds(money = 0, price = 0) {
    return window.GameModules.taobaoDomainHelpers.taobaoHasEnoughFunds.call(this, money, price);
  },
  taobaoSelectedProduct(product = null) {
    return window.GameModules.taobaoDomainHelpers.taobaoSelectedProduct.call(this, product);
  },

  taobaoNormalizedPrice(item = {}) {
    return window.GameModules.taobaoDomainHelpers.taobaoNormalizedPrice.call(this, item);
  },

  taobaoInsufficientFundsMessage(money = 0, price = 0) {
    return window.GameModules.taobaoDomainHelpers.taobaoInsufficientFundsMessage.call(this, money, price);
  },

  taobaoMissingInventoryStateMessage() {
    return window.GameModules.taobaoDomainHelpers.taobaoMissingInventoryStateMessage.call(this);
  },

  taobaoPurchaseSuccessMessage(item = {}, updates = [], price = 0) {
    return window.GameModules.taobaoDomainHelpers.taobaoPurchaseSuccessMessage.call(this, item, updates, price);
  },
  taobaoProductBusyKey(item = {}) {
    return window.GameModules.taobaoDomainHelpers.taobaoProductBusyKey.call(this, item);
  },

  async buyTaobaoSlot(slotId) {
    return window.GameModules.taobaoBuyFlow.buyTaobaoSlot.call(this, slotId);
  },

  async buyTaobaoProduct(product = null) {
    this.initTaobaoApp();
    const item = window.GameModules.taobaoBuyFlow.resolveBuyProduct.call(this, product);
    if (!window.GameModules.taobaoBuyFlow.canStartPurchase.call(this, item)) return;
    const price = this.taobaoNormalizedPrice(item);
    item.price = price;
    const buyKey = this.taobaoProductBusyKey(item);
    this.taobaoState.buyingId = buyKey;
    this.taobaoState.error = '';
    this.taobaoState.message = `正在购买${item.name}…`;
    try {
      const money = Number(this.playerProfile?.wealthAmount || 0);
      if (!this.taobaoHasEnoughFunds(money, price)) {
        this.taobaoState.error = this.taobaoInsufficientFundsMessage(money, price);
        this.taobaoState.message = '';
        return;
      }
      const state = await window.GameModules.taobaoBuyFlow.ensureBuyInventoryState.call(this);
      if (!state) {
        this.taobaoState.error = this.taobaoMissingInventoryStateMessage();
        this.taobaoState.message = '';
        return;
      }
      const updates = this.taobaoInventoryUpdates(item);
      await this.applyInventoryUpdatesToState(state, updates);
      this.playerProfile.wealthAmount = money - price;
      window.GameModules.orgTerritoryActions?.syncPlayerWealthAsset?.(this);
      item.purchased = true;
      this.taobaoState.message = this.taobaoPurchaseSuccessMessage(item, updates, price);
      this.taobaoState.error = '';
      this.taobaoState.buyingId = '';
      await this.save?.();
    } catch (err) {
      this.taobaoState.error = this.taobaoPurchaseFailureMessage(err);
      console.error('[淘宝] 购买失败:', err.message, err.stack);
    } finally {
      this.taobaoState.buyingId = '';
    }
  },

  taobaoInventoryUpdates(item) {
    return window.GameModules.taobaoDomainHelpers.taobaoInventoryUpdates.call(this, item);
  },
};







