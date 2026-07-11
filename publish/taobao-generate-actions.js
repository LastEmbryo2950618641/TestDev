window.GameModules = window.GameModules || {};
window.GameModules.taobaoGenerateActions = {
  async taobaoPrompt(slot = {}) {
    const p = this.playerProfile || {};
    const bodySlots = window.GameModules.progression.bodyWearSlots();
    const slots = bodySlots.join('、');
    const filter = this.taobaoState?.filterSlot;
    const query = String(this.taobaoState?.searchText || '').trim();
    const queryText = query ? `用户搜索词：${query}。这是硬性搜索条件，商品name、category、description必须明确体现“${query}”；若搜索词是JK、洛丽塔、汉服等风格，必须生成该风格商品，不允许生成无关日用品或普通服饰。` : '';
    const filterText = filter && filter !== '__set' ? `当前搜索筛选部位：${this.taobaoFilterLabel(filter)}（${filter}），必须生成可穿戴在该部位的装备商品。` : '';
    const styleSlotText = /jk/i.test(query) && ['bottom', '下衣', '下装'].includes(filter) ? '搜索为JK且筛选下装时，商品必须是JK裙、制服裙或百褶裙，不能生成上衣、鞋子或日用品。' : '';
    const setText = filter === '__set' ? `当前为“一套”模式，必须返回一整套穿搭商品，equipSlots覆盖这些槽位：${slots}。额外返回setItems数组，每项字段slot、slotLabel、name、description，逐个说明每个穿着槽位的服饰；没有对应服饰的槽位也要给出协调搭配。` : '';
    return window.GameModules.renderPrompt('taobao-product-generate', {
      playerName: p.name || '未知',
      playerAge: p.age || '',
      playerCity: p.refinedCity || p.city || '',
      playerRole: p.refinedRole || p.dailyRole || '',
      wealthTier: p.wealthTier || '流浪',
      wealthAmount: p.wealthAmount || 0,
      queryText,
      filterText,
      styleSlotText,
      setText,
      slots,
    });
  },

  normalizeTaobaoProduct(data = {}, slot = {}) {
    return window.GameModules.taobaoDomainHelpers.normalizeTaobaoProduct.call(this, data, slot);
  },

  taobaoBatchHint(index = 0) {
    return window.GameModules.taobaoDomainHelpers.taobaoBatchHint.call(this, index);
  },

  taobaoTargetSlots(slotId, count = 1) {
    return window.GameModules.taobaoDomainHelpers.taobaoTargetSlots.call(this, slotId, count);
  },

  async generateTaobaoProducts(slotId, countArg = 0) {
    return window.GameModules.taobaoAppFlow.generateTaobaoProducts.call(this, slotId, countArg);
  },

  async generateTaobaoProduct(slotId) {
    return window.GameModules.taobaoAppFlow.generateTaobaoProduct.call(this, slotId);
  },
};


