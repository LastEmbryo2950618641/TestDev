window.GameModules = window.GameModules || {};

window.GameModules.taobaoDomainHelpers = Object.assign(window.GameModules.taobaoDomainHelpers || {}, {
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

  taobaoBatchHint(index = 0) {
    const parts = [String(this.taobaoState?.searchText || '').trim(), this.taobaoState?.filterSlot ? this.taobaoFilterLabel() : ''];
    return parts.filter(Boolean).join(' + ') || '';
  },

  taobaoTargetSlots(slotId, count = 1) {
    this.initTaobaoApp();
    const start = slotId ? Math.max(0, this.taobaoState.slots.findIndex((item) => item.id === slotId)) : this.taobaoState.slots.length;
    const targets = [];
    for (let i = 0; i < count; i++) {
      const index = start + i;
      let slot = this.taobaoState.slots[index];
      if (!slot) {
        slot = { id: `tb-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`, hint: '', product: null };
        this.taobaoState.slots.push(slot);
      }
      targets.push(slot);
    }
    return targets;
  },

  normalizeTaobaoProduct(data = {}, slot = {}) {
    const price = Math.max(1, Math.floor(Number(data.price) || (this.playerProfile?.wealthTier === '流浪' ? 9 : 99)));
    const raw = {
      name: String(data.name || '淘宝商品').slice(0, 32),
      description: String(data.description || data.reason || '').slice(0, 180),
      equipSlots: Array.isArray(data.equipSlots) ? data.equipSlots : String(data.equipSlots || '').split(/[、,，/|；;\s]+/).filter(Boolean),
    };
    const inferred = window.GameModules.progression.inferEquipSlots(raw, data.kind || '');
    const setItems = Array.isArray(data.setItems)
      ? data.setItems
          .map((item) => ({
            slot: String(item.slot || '').slice(0, 24),
            slotLabel: String(item.slotLabel || item.slot || '').slice(0, 24),
            name: String(item.name || '未命名服饰').slice(0, 32),
            description: String(item.description || '').slice(0, 120),
          }))
          .filter((item) => item.slot || item.name)
      : [];
    const clothing = inferred.some((slotName) => !['装备'].includes(slotName)) || setItems.length;
    const query = String(this.taobaoState?.searchText || '').trim();
    const jkBottom = /jk/i.test(query) && ['bottom', '下衣', '下装'].includes(this.taobaoState?.filterSlot);
    const name = jkBottom && !/jk|制服|裙|百褶/i.test(raw.name) ? `JK制服百褶裙-${raw.name}`.slice(0, 32) : raw.name;
    const category = jkBottom ? 'JK下装' : String(data.category || slot.hint || '淘宝商品').slice(0, 20);
    return {
      id: `tbp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      category,
      price,
      shop: String(data.shop || '淘宝精选店').slice(0, 30),
      description: raw.description || (jkBottom ? '符合搜索词的JK制服下装商品。' : '由淘宝AI根据现实身份生成的商品。'),
      kind: data.kind === '物品' && !clothing ? '物品' : '装备',
      equipSlots: setItems.length
        ? [...new Set([...inferred, ...setItems.map((item) => item.slot).filter(Boolean), ...(jkBottom ? ['bottom'] : [])])]
        : jkBottom && !inferred.includes('bottom')
          ? [...inferred, 'bottom']
          : inferred,
      setItems,
      reason: String(data.reason || '淘宝购买').slice(0, 80),
      generatedAt: new Date().toISOString(),
    };
  },

  taobaoProductBusyKey(item = {}) {
    return item?.id || item?.name || 'buying';
  },

  taobaoInventoryUpdates(item) {
    const setItems = this.taobaoSetItems(item);
    if (setItems.length) {
      return setItems.map((part) => ({
        kind: '装备',
        name: part.name,
        value: {
          name: part.name,
          description: `${part.description || item.description}（${item.name}套装，淘宝购入，店铺：${item.shop}）`,
          equipSlots: [part.slot],
          slot: part.slot,
          price: Math.max(1, Math.floor(item.price / setItems.length)),
        },
        reason: '淘宝套装购买',
      }));
    }
    return [{
      kind: item.kind || '物品',
      name: item.name,
      value: {
        name: item.name,
        description: `${item.description}（淘宝购入，店铺：${item.shop}，价格：${item.price}元）`,
        equipSlots: item.equipSlots,
        slot: item.equipSlots?.[0] || '',
        price: item.price,
      },
      reason: '淘宝购买',
    }];
  },

  taobaoSelectedProduct(product = null) {
    return product?.product || product || this.selectedTaobaoSlot()?.product || null;
  },

  taobaoNormalizedPrice(item = {}) {
    return Math.max(1, Math.floor(Number(item?.price) || 1));
  },

  taobaoInsufficientFundsMessage(money = 0, price = 0) {
    return `余额不足：当前财富${Number(money || 0).toLocaleString('zh-CN')}元，商品需${Number(price || 0).toLocaleString('zh-CN')}元。`;
  },

  taobaoMissingInventoryStateMessage() {
    return '玩家背包尚未初始化，无法购买。';
  },

  taobaoPurchaseSuccessMessage(item = {}, updates = [], price = 0) {
    return `已购买${item.name}，${updates.length}件商品加入背包并扣除${Number(price || 0).toLocaleString('zh-CN')}元。`;
  },
});
window.GameModules = window.GameModules || {};

window.GameModules.taobaoDomainHelpers = Object.assign(window.GameModules.taobaoDomainHelpers || {}, {
  taobaoPurchaseFailureMessage(err) {
    return `购买失败：${err?.message || '未知错误'}`;
  },

  taobaoCanStartPurchase(item, buyingId = '') {
    return !!item && !item.purchased && !buyingId;
  },

  taobaoHasEnoughFunds(money = 0, price = 0) {
    return Number(money || 0) >= Number(price || 0);
  },
});
