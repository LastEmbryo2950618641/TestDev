window.GameModules = window.GameModules || {};
window.GameModules.taobaoActions = {
  taobaoDefaultSlots() {
    return ['上衣', '下衣', '鞋子', '袜子', '包具', '数码', '日用品', '随机'].map((hint, index) => ({ id: `tb-${index + 1}`, hint, product: null }));
  },

  initTaobaoApp() {
    if (!this.taobaoState) this.taobaoState = { open: false, slots: [], selectedId: '', generatingId: '', requestId: 0, message: '', error: '' };
    if (!Array.isArray(this.taobaoState.slots) || !this.taobaoState.slots.length) this.taobaoState.slots = this.taobaoDefaultSlots();
  },

  openTaobaoApp() {
    this.closeDesktopApps();
    this.initTaobaoApp();
    this.taobaoState.open = true;
    this.desktopUnlocked = true;
  },

  closeTaobaoApp() {
    if (this.taobaoState) this.taobaoState.open = false;
    this.closeAppToDesktop();
  },

  selectedTaobaoSlot() {
    this.initTaobaoApp();
    return this.taobaoState.slots.find((slot) => slot.id === this.taobaoState.selectedId) || this.taobaoState.slots[0];
  },

  taobaoSlotSummary(slot = {}) {
    const p = slot.product;
    if (!p) return `${slot.hint}商品位｜点击后由AI生成商品信息`;
    return `${p.name}｜${Number(p.price || 0).toLocaleString('zh-CN')}元｜${p.category || slot.hint}`;
  },

  taobaoProductDetail(product = null) {
    if (!product) return '暂无商品信息。点击空商品位后，淘宝会按玩家现实处境生成对应商品。';
    const slots = Array.isArray(product.equipSlots) && product.equipSlots.length ? `｜可穿戴部位：${product.equipSlots.join('、')}` : '';
    return `${product.shop || '淘宝店铺'}｜${product.description || '暂无详情'}${slots}`;
  },

  async selectTaobaoSlot(slotId) {
    this.initTaobaoApp();
    const slot = this.taobaoState.slots.find((item) => item.id === slotId);
    if (!slot) return;
    this.taobaoState.selectedId = slot.id;
    if (!slot.product) await this.generateTaobaoProduct(slot.id);
  },

  taobaoPrompt(slot = {}) {
    const p = this.playerProfile || {};
    const slots = window.GameModules.progression.bodyWearSlots().join('、');
    return `你是2026现代都市淘宝商品结构化生成器。仅输出紧凑JSON，不要Markdown。根据玩家身份生成一个真实可购买商品。玩家：姓名${p.name || '未知'}，年龄${p.age || ''}，地址${p.refinedCity || p.city || ''}，身份${p.refinedRole || p.dailyRole || ''}，财富${p.wealthTier || '流浪'}，现金${p.wealthAmount || 0}元。商品位提示：${slot.hint || '随机'}。若是衣服、裤子、袜子、鞋、包、饰品等可装备商品，kind必须为"装备"，equipSlots必须按已有穿戴部位分类，可用部位：${slots}，也可用中文部位：上衣、下衣、内衣、内裤、袜子、鞋子、外套、包具、头部、颈部、腰部、手套、饰品。非可装备商品kind为"物品"。字段：name、category、price、shop、description、kind、equipSlots、reason。price为整数且符合财富档位，不要超过玩家现金。`;
  },

  normalizeTaobaoProduct(data = {}, slot = {}) {
    const price = Math.max(1, Math.floor(Number(data.price) || (this.playerProfile?.wealthTier === '流浪' ? 9 : 99)));
    const raw = { name: String(data.name || `${slot.hint || '淘宝'}商品`).slice(0, 32), description: String(data.description || data.reason || '').slice(0, 180), equipSlots: Array.isArray(data.equipSlots) ? data.equipSlots : String(data.equipSlots || '').split(/[、,，/|；;\s]+/).filter(Boolean) };
    const inferred = window.GameModules.progression.inferEquipSlots(raw, data.kind || '');
    const clothing = inferred.some((slotName) => !['装备'].includes(slotName));
    return { id: `tbp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: raw.name, category: String(data.category || slot.hint || '淘宝商品').slice(0, 20), price, shop: String(data.shop || '淘宝精选店').slice(0, 30), description: raw.description || '由淘宝AI根据现实身份生成的商品。', kind: data.kind === '物品' && !clothing ? '物品' : '装备', equipSlots: inferred, reason: String(data.reason || '淘宝购买').slice(0, 80), generatedAt: new Date().toISOString() };
  },

  async generateTaobaoProduct(slotId) {
    const slot = this.taobaoState.slots.find((item) => item.id === slotId);
    if (!slot || this.taobaoState.generatingId) return;
    const reqId = (this.taobaoState.requestId || 0) + 1;
    Object.assign(this.taobaoState, { requestId: reqId, generatingId: slot.id, error: '', message: '淘宝AI正在生成商品信息，约30秒…' });
    try {
      if (!window.dzmm?.completions) throw new Error('AI接口不可用');
      const data = await window.GameModules.jsonUtils.generateJsonWithRetry({ source: 'taobao-product', model: this.modelId, prompt: this.taobaoPrompt(slot), maxTokens: 900, timeoutMs: 60000, max: 2 });
      if (this.taobaoState.requestId !== reqId) return;
      slot.product = this.normalizeTaobaoProduct(data, slot);
      this.taobaoState.message = '商品信息已生成，可购买加入背包。';
      await this.save?.();
    } catch (err) {
      if (this.taobaoState.requestId === reqId) this.taobaoState.error = `生成失败：${err.message || '未知错误'}`;
      console.error('[淘宝] 商品生成失败:', err.message, err.stack);
    } finally {
      if (this.taobaoState.requestId === reqId) this.taobaoState.generatingId = '';
    }
  },

  async buyTaobaoProduct(product = null) {
    const item = product || this.selectedTaobaoSlot()?.product;
    if (!item || this.taobaoState.generatingId) return;
    const money = Number(this.playerProfile?.wealthAmount || 0);
    if (money < item.price) { this.taobaoState.error = `余额不足：当前财富${money.toLocaleString('zh-CN')}元，商品需${item.price.toLocaleString('zh-CN')}元。`; return; }
    const state = await this.ensurePlayerRpgState?.();
    if (!state) { this.taobaoState.error = '玩家背包尚未初始化，无法购买。'; return; }
    await this.applyInventoryUpdatesToState(state, [{ kind: item.kind || '物品', name: item.name, value: { name: item.name, description: `${item.description}（淘宝购入，店铺：${item.shop}，价格：${item.price}元）`, equipSlots: item.equipSlots, slot: item.equipSlots?.[0] || '', price: item.price }, reason: '淘宝购买' }]);
    this.playerProfile.wealthAmount = money - item.price;
    this.taobaoState.message = `已购买${item.name}，加入背包并扣除${item.price.toLocaleString('zh-CN')}元。`;
    this.taobaoState.error = '';
    await this.save?.();
  },
};
