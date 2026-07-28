window.GameModules = window.GameModules || {};

window.GameModules.taobaoAppFlow = {
  async generateTaobaoProducts(slotId, countArg = 0) {
    this.initTaobaoApp();
    if (this.taobaoState.generatingId && this.taobaoState.requestIdActive) return;
    this.taobaoState.generatingId = '';
    this.taobaoState.selectedId = '';
    if (!slotId) this.taobaoState.slots = [];
    const count = Number(countArg || this.taobaoState.count || 5);
    const targets = this.taobaoTargetSlots(slotId, count);
    const reqId = (this.taobaoState.requestId || 0) + 1;
    Object.assign(this.taobaoState, { requestId: reqId, requestIdActive: true, error: '', message: `淘宝AI正在生成${targets.length}个商品，约30秒…` });
    try {
      targets.forEach((slot, index) => { slot.hint = this.taobaoBatchHint(index); });
      this.taobaoState.generatingId = targets[0]?.id || 'taobao-batch';
      const prompt = await this.taobaoPrompt({ ...(targets[0] || {}), batchCount: targets.length });
      const data = await window.GameModules.jsonUtils.generateJsonWithRetry({
        source: 'taobao-product',
        promptId: 'taobao-product-generate',
        model: this.modelId,
        prompt,
        maxTokens: Math.min(6000, Math.max(1200, (this.taobaoState.filterSlot === '__set' ? 1400 : 900) * targets.length)),
        timeoutMs: 60000,
        max: 2,
        jsonMode: true,
        responseFormat: { type: 'json_object' },
      });
      if (this.taobaoState.requestId !== reqId) return;
      const products = Array.isArray(data?.products) ? data.products : (Array.isArray(data) ? data : [data]);
      for (let i = 0; i < targets.length; i++) {
        const product = products[i] || products[products.length - 1] || {};
        targets[i].product = this.normalizeTaobaoProduct(product, targets[i]);
      }
      this.taobaoState.selectedId = '';
      this.taobaoState.message = `已生成${targets.length}个商品，点击商品结果查看详情。`;
      await this.save?.();
    } catch (err) {
      if (this.taobaoState.requestId === reqId) this.taobaoState.error = `生成失败：${err.message || '未知错误'}`;
      console.error('[淘宝] 商品生成失败:', err.message, err.stack);
    } finally {
      if (this.taobaoState.requestId === reqId) Object.assign(this.taobaoState, { generatingId: '', requestIdActive: false });
    }
  },

  async generateTaobaoProduct(slotId) {
    await this.generateTaobaoProducts(slotId, 1);
  },
};
