window.GameModules = window.GameModules || {};
window.GameModules.taobaoActions = {
  taobaoDefaultSlots() {
    return [];
  },

  taobaoWearFilters() {
    return window.GameModules.taobaoViewHelpers.taobaoWearFilters.call(this);
  },

  initTaobaoApp() {
    if (!this.taobaoState) this.taobaoState = { open: false, slots: [], selectedId: '', filterSlot: '', searchText: '', count: 5, generatingId: '', requestId: 0, message: '', error: '', walletOpen: false };
    if (!Array.isArray(this.taobaoState.slots)) this.taobaoState.slots = this.taobaoDefaultSlots();
    if (typeof this.taobaoState.filterSlot !== 'string') this.taobaoState.filterSlot = '';
    if (typeof this.taobaoState.searchText !== 'string') this.taobaoState.searchText = '';
    if (!Number(this.taobaoState.count)) this.taobaoState.count = 5;
    if (!this.taobaoState.requestIdActive) this.taobaoState.generatingId = '';
    if (typeof this.taobaoState.walletOpen !== 'boolean') this.taobaoState.walletOpen = false;
    if (typeof this.taobaoState.buyingId !== 'string') this.taobaoState.buyingId = '';
  },

  setTaobaoFilter(slot = '') {
    this.initTaobaoApp();
    this.taobaoState.filterSlot = slot;
    this.taobaoState.message = slot ? `已筛选${this.taobaoFilterLabel(slot)}商品。` : '已显示全部商品位。';
  },

  setTaobaoCount(value) {
    this.initTaobaoApp();
    this.taobaoState.count = Math.max(1, Math.min(12, Number(value) || 5));
  },

  taobaoSearchHint() {
    return window.GameModules.taobaoViewHelpers.taobaoSearchHint.call(this);
  },

  taobaoFilterLabel(slot = this.taobaoState?.filterSlot) {
    return window.GameModules.taobaoViewHelpers.taobaoFilterLabel.call(this, slot);
  },

  taobaoFilteredSlots() {
    return window.GameModules.taobaoDomainHelpers.taobaoFilteredSlots.call(this);
  },

  taobaoProductMatchesFilter(product = {}, filter = '') {
    return window.GameModules.taobaoDomainHelpers.taobaoProductMatchesFilter.call(this, product, filter);
  },

  toggleTaobaoWallet() {
    this.initTaobaoApp();
    this.taobaoState.walletOpen = !this.taobaoState.walletOpen;
  },

  taobaoWalletRows() {
    return window.GameModules.taobaoViewHelpers.taobaoWalletRows.call(this);
  },

  openTaobaoApp() {
    this.closeDesktopApps();
    this.initTaobaoApp();
    this.taobaoState.generatingId = '';
    this.taobaoState.open = true;
    this.desktopUnlocked = true;
  },

  closeTaobaoApp() {
    if (this.taobaoState) this.taobaoState.open = false;
    this.closeAppToDesktop();
  },

  selectedTaobaoSlot() {
    this.initTaobaoApp();
    return this.taobaoState.slots.find((slot) => slot.id === this.taobaoState.selectedId) || null;
  },

  backToTaobaoResults() {
    this.initTaobaoApp();
    this.taobaoState.selectedId = '';
  },

  taobaoSlotSummary(slot = {}) {
    return window.GameModules.taobaoViewHelpers.taobaoSlotSummary.call(this, slot);
  },

  taobaoProductDetail(product = null) {
    return window.GameModules.taobaoViewHelpers.taobaoProductDetail.call(this, product);
  },

  taobaoSetItems(product = null) {
    return window.GameModules.taobaoViewHelpers.taobaoSetItems.call(this, product);
  },

  async selectTaobaoSlot(slotId) {
    this.initTaobaoApp();
    const slot = this.taobaoState.slots.find((item) => item.id === slotId);
    if (!slot) return;
    this.taobaoState.selectedId = slot.id;
    if (!slot.product) await this.generateTaobaoProduct(slot.id);
  },
};
