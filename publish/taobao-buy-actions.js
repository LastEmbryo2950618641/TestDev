window.GameModules = window.GameModules || {};
window.GameModules.taobaoBuyActions = {
  async buyTaobaoProduct(product = null) {
    this.initTaobaoApp();
    const item = product || this.selectedTaobaoSlot()?.product;
    if (!item || this.taobaoState.generatingId || item.purchased || this.taobaoState.buyingId) return;
    this.taobaoState.buyingId = item.id || item.name || 'buying';
    this.taobaoState.error = '';
    this.taobaoState.message = `正在购买${item.name}…`;
    try {
      const money = Number(this.playerProfile?.wealthAmount || 0);
      if (money < item.price) {
        this.taobaoState.error = `余额不足：当前财富${money.toLocaleString('zh-CN')}元，商品需${item.price.toLocaleString('zh-CN')}元。`;
        this.taobaoState.message = '';
        return;
      }
      const state = await this.ensurePlayerRpgState?.();
      if (!state) {
        this.taobaoState.error = '玩家背包尚未初始化，无法购买。';
        this.taobaoState.message = '';
        return;
      }
      const updates = this.taobaoInventoryUpdates(item);
      await this.applyInventoryUpdatesToState(state, updates);
      this.playerProfile.wealthAmount = money - item.price;
      item.purchased = true;
      this.taobaoState.message = `已购买${item.name}，${updates.length}件商品加入背包并扣除${item.price.toLocaleString('zh-CN')}元。`;
      this.taobaoState.error = '';
      this.taobaoState.buyingId = '';
      await this.save?.();
    } catch (err) {
      this.taobaoState.error = `购买失败：${err.message || '未知错误'}`;
      console.error('[淘宝] 购买失败:', err.message, err.stack);
    } finally {
      this.taobaoState.buyingId = '';
    }
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
};
