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

  taobaoPrompt(slot = {}) {
    const p = this.playerProfile || {};
    const bodySlots = window.GameModules.progression.bodyWearSlots();
    const slots = bodySlots.join('、');
    const filter = this.taobaoState?.filterSlot;
    const query = String(this.taobaoState?.searchText || '').trim();
    const queryText = query ? `用户搜索词：${query}。这是硬性搜索条件，商品name、category、description必须明确体现“${query}”；若搜索词是JK、洛丽塔、汉服等风格，必须生成该风格商品，不允许生成无关日用品或普通服饰。` : '';
    const filterText = filter && filter !== '__set' ? `当前搜索筛选部位：${this.taobaoFilterLabel(filter)}（${filter}），必须生成可穿戴在该部位的装备商品。` : '';
    const styleSlotText = /jk/i.test(query) && ['bottom', '下衣', '下装'].includes(filter) ? '搜索为JK且筛选下装时，商品必须是JK裙、制服裙或百褶裙，不能生成上衣、鞋子或日用品。' : '';
    const setText = filter === '__set' ? `当前为“一套”模式，必须返回一整套穿搭商品，equipSlots覆盖这些槽位：${slots}。额外返回setItems数组，每项字段slot、slotLabel、name、description，逐个说明每个穿着槽位的服饰；没有对应服饰的槽位也要给出协调搭配。` : '';
    return `你是2026现代都市淘宝商品结构化生成器。仅输出紧凑JSON，不要Markdown。根据玩家身份生成一个真实可购买商品。玩家：姓名${p.name || '未知'}，年龄${p.age || ''}，地址${p.refinedCity || p.city || ''}，身份${p.refinedRole || p.dailyRole || ''}，财富${p.wealthTier || '流浪'}，现金${p.wealthAmount || 0}元。${queryText}${filterText}${styleSlotText}${setText}若是衣服、裤子、袜子、鞋、包、饰品等可装备商品，kind必须为"装备"，equipSlots必须按已有穿戴部位分类，可用部位：${slots}，也可用中文部位：上衣、下衣、内衣、内裤、袜子、鞋子、外套、包具、头部、颈部、腰部、手套、手腕、饰品。非可装备商品kind为"物品"。字段：name、category、price、shop、description、kind、equipSlots、setItems、reason。price为整数且符合财富档位，不要超过玩家现金。`;
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
        const data = await window.GameModules.jsonUtils.generateJsonWithRetry({ source: 'taobao-product', model: this.modelId, prompt: this.taobaoPrompt(slot), maxTokens: this.taobaoState.filterSlot === '__set' ? 1400 : 900, timeoutMs: 60000, max: 2 });
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

  async buyTaobaoProduct(product = null) {
    const item = product || this.selectedTaobaoSlot()?.product;
    if (!item || this.taobaoState.generatingId || item.purchased) return;
    const money = Number(this.playerProfile?.wealthAmount || 0);
    if (money < item.price) { this.taobaoState.error = `余额不足：当前财富${money.toLocaleString('zh-CN')}元，商品需${item.price.toLocaleString('zh-CN')}元。`; return; }
    const state = await this.ensurePlayerRpgState?.();
    if (!state) { this.taobaoState.error = '玩家背包尚未初始化，无法购买。'; return; }
    const setItems = this.taobaoSetItems(item);
    const updates = setItems.length ? setItems.map((part) => ({ kind: '装备', name: part.name, value: { name: part.name, description: `${part.description || item.description}（${item.name}套装，淘宝购入，店铺：${item.shop}）`, equipSlots: [part.slot], slot: part.slot, price: Math.max(1, Math.floor(item.price / setItems.length)) }, reason: '淘宝套装购买' })) : [{ kind: item.kind || '物品', name: item.name, value: { name: item.name, description: `${item.description}（淘宝购入，店铺：${item.shop}，价格：${item.price}元）`, equipSlots: item.equipSlots, slot: item.equipSlots?.[0] || '', price: item.price }, reason: '淘宝购买' }];
    await this.applyInventoryUpdatesToState(state, updates);
    this.playerProfile.wealthAmount = money - item.price;
    item.purchased = true;
    this.taobaoState.message = `已购买${item.name}，${updates.length}件商品加入背包并扣除${item.price.toLocaleString('zh-CN')}元。`;
    this.taobaoState.error = '';
    await this.save?.();
  },
};
