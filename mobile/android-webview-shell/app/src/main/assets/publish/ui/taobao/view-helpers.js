window.GameModules = window.GameModules || {};

window.GameModules.taobaoViewHelpers = {
  taobaoWearFilters() {
    const p = window.GameModules.progression;
    const body = p?.bodyWearSlots?.() || [];
    const labels = { head: '头部', neck: '颈部', innerwearTop: '内衣', top: '上衣', outerwear: '外套', gloves: '手套', waist: '腰部', innerwearBottom: '内裤', bottom: '下装', socks: '袜子', shoes: '鞋子', wrist: '手腕' };
    const filters = body.map((slot) => ({ slot, label: labels[slot] || p?.clothingPositionForSlot?.(slot) || slot }));
    return [{ slot: '', label: '全部' }, { slot: '__set', label: '一套' }, ...filters, { slot: '包具', label: '包具' }, { slot: '饰品', label: '饰品' }, { slot: '装备', label: '装备' }];
  },

  taobaoSearchHint() {
    const text = String(this.taobaoState?.searchText || '').trim();
    return text ? `搜索：${text}` : '可输入关键词，例如 JK装';
  },

  taobaoFilterLabel(slot = this.taobaoState?.filterSlot) {
    return this.taobaoWearFilters().find((item) => item.slot === slot)?.label || slot || '全部';
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
};
