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
    const price = Math.max(1, Math.floor(Number(data.price) || (this.playerProfile?.wealthTier === '流浪' ? 9 : 99)));
    const raw = { name: String(data.name || '淘宝商品').slice(0, 32), description: String(data.description || data.reason || '').slice(0, 180), equipSlots: Array.isArray(data.equipSlots) ? data.equipSlots : String(data.equipSlots || '').split(/[、,，/|；;\s]+/).filter(Boolean) };
    const inferred = window.GameModules.progression.inferEquipSlots(raw, data.kind || '');
    const setItems = Array.isArray(data.setItems) ? data.setItems.map((item) => ({ slot: String(item.slot || '').slice(0, 24), slotLabel: String(item.slotLabel || item.slot || '').slice(0, 24), name: String(item.name || '未命名服饰').slice(0, 32), description: String(item.description || '').slice(0, 120) })).filter((item) => item.slot || item.name) : [];
    const clothing = inferred.some((slotName) => !['装备'].includes(slotName)) || setItems.length;
    const query = String(this.taobaoState?.searchText || '').trim();
    const jkBottom = /jk/i.test(query) && ['bottom', '下衣', '下装'].includes(this.taobaoState?.filterSlot);
    const name = jkBottom && !/jk|制服|裙|百褶/i.test(raw.name) ? `JK制服百褶裙-${raw.name}`.slice(0, 32) : raw.name;
    const category = jkBottom ? 'JK下装' : String(data.category || slot.hint || '淘宝商品').slice(0, 20);
    return { id: `tbp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, category, price, shop: String(data.shop || '淘宝精选店').slice(0, 30), description: raw.description || (jkBottom ? '符合搜索词的JK制服下装商品。' : '由淘宝AI根据现实身份生成的商品。'), kind: data.kind === '物品' && !clothing ? '物品' : '装备', equipSlots: setItems.length ? [...new Set([...inferred, ...setItems.map((item) => item.slot).filter(Boolean), ...(jkBottom ? ['bottom'] : [])])] : (jkBottom && !inferred.includes('bottom') ? [...inferred, 'bottom'] : inferred), setItems, reason: String(data.reason || '淘宝购买').slice(0, 80), generatedAt: new Date().toISOString() };
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
      if (!window.dzmm?.completions) throw new Error('AI接口不可用');
      for (let i = 0; i < targets.length; i++) {
        const slot = targets[i];
        slot.hint = this.taobaoBatchHint(i);
        this.taobaoState.generatingId = slot.id;
        const prompt = await this.taobaoPrompt(slot);
        const data = await window.GameModules.jsonUtils.generateJsonWithRetry({ source: 'taobao-product', promptId: 'taobao-product-generate', model: this.modelId, prompt, maxTokens: this.taobaoState.filterSlot === '__set' ? 1400 : 900, timeoutMs: 60000, max: 2 });
        if (this.taobaoState.requestId !== reqId) return;
        slot.product = this.normalizeTaobaoProduct(data, slot);
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
