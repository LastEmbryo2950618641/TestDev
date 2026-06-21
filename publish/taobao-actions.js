window.GameModules = window.GameModules || {};
window.GameModules.taobaoActions = {
  taobaoDefaultSlots() {
    return [];
  },

  taobaoWearFilters() {
    const p = window.GameModules.progression;
    const body = p?.bodyWearSlots?.() || [];
    const labels = { head: '头部', neck: '颈部', innerwearTop: '内衣', top: '上衣', outerwear: '外套', gloves: '手套', waist: '腰部', innerwearBottom: '内裤', bottom: '下装', socks: '袜子', shoes: '鞋子', wrist: '手腕' };
    const filters = body.map((slot) => ({ slot, label: labels[slot] || p?.clothingPositionForSlot?.(slot) || slot }));
    return [{ slot: '', label: '全部' }, { slot: '__set', label: '一套' }, ...filters, { slot: '包具', label: '包具' }, { slot: '饰品', label: '饰品' }, { slot: '装备', label: '装备' }];
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
    const text = String(this.taobaoState?.searchText || '').trim();
    return text ? `搜索：${text}` : '可输入关键词，例如 JK装';
  },

  taobaoFilterLabel(slot = this.taobaoState?.filterSlot) {
    return this.taobaoWearFilters().find((item) => item.slot === slot)?.label || slot || '全部';
  },

  taobaoFilteredSlots() {
    this.initTaobaoApp();
    const filter = this.taobaoState.filterSlot;
    const slots = this.taobaoState.slots.filter((slot) => slot.product);
    if (!filter || filter === '__set') return slots;
    return slots.filter((slot) => !slot.product || this.taobaoProductMatchesFilter(slot.product, filter));
  },

  taobaoProductMatchesFilter(product = {}, filter = '') {
    if (!filter) return true;
    const p = window.GameModules.progression;
    const targets = (Array.isArray(product.equipSlots) ? product.equipSlots : []).map((slot) => p?.canonicalWearSlot?.(slot) || slot);
    const canonical = p?.canonicalWearSlot?.(filter) || filter;
    return targets.includes(filter) || targets.includes(canonical) || targets.some((slot) => p?.slotBase?.(slot) === filter || p?.slotBase?.(slot) === canonical);
  },

  toggleTaobaoWallet() {
    this.initTaobaoApp();
    this.taobaoState.walletOpen = !this.taobaoState.walletOpen;
  },

  taobaoWalletRows() {
    const p = this.playerProfile || {};
    const rows = [{ label: '当前余额', value: `${Number(p.wealthAmount || 0).toLocaleString('zh-CN')}元` }, { label: '财富等级', value: p.wealthTier || '流浪' }];
    const source = String(p.wealthSource || '').trim();
    const matches = [...source.matchAll(/([^，,；;]+?)\((-?\d+)\)/g)];
    if (matches.length) matches.forEach((m) => rows.push({ label: m[1].trim(), value: `${Number(m[2] || 0).toLocaleString('zh-CN')}元` }));
    else if (source) rows.push({ label: '财富来源', value: source });
    if (p.wealthFixedIncome) rows.push({ label: '固定收入', value: p.wealthFixedIncome });
    return rows;
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
    const p = slot.product;
    if (!p) return '';
    const set = Array.isArray(p.setItems) && p.setItems.length ? `｜${p.setItems.length}件套` : '';
    return `${p.name}｜${Number(p.price || 0).toLocaleString('zh-CN')}元｜${p.category || '淘宝商品'}${set}`;
  },

  taobaoProductDetail(product = null) {
    if (!product) return '暂无商品信息。点击空商品位后，淘宝会按玩家现实处境生成对应商品。';
    const slots = Array.isArray(product.equipSlots) && product.equipSlots.length ? `｜可穿戴部位：${product.equipSlots.join('、')}` : '';
    return `${product.shop || '淘宝店铺'}｜${product.description || '暂无详情'}${slots}`;
  },

  taobaoSetItems(product = null) {
    return Array.isArray(product?.setItems) ? product.setItems : [];
  },

  async selectTaobaoSlot(slotId) {
    this.initTaobaoApp();
    const slot = this.taobaoState.slots.find((item) => item.id === slotId);
    if (!slot) return;
    this.taobaoState.selectedId = slot.id;
    if (!slot.product) await this.generateTaobaoProduct(slot.id);
  },
};
