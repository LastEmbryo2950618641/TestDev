/**
 * 电子地图地点说明：以玩家已知事实数组保存，并只按明确更新修改。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldMapFacts = {
  nowLabel(state) {
    return `${state.phoneDateText?.() || '未知日期'} ${state.phoneTimeText?.() || ''}`.trim();
  },

  cleanText(text) {
    return String(text || '').replace(/[\n\r]+/g, ' ').replace(/^\d+[.、，\s]*/u, '').trim().slice(0, 120);
  },

  cleanFactsInput(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    return String(value).split(/[；;\n]+/u).map((text) => ({ text }));
  },

  normalizeFacts(node = {}, fallback = '', time = '') {
    const safeNode = node || {};
    const existing = this.cleanFactsInput(safeNode.descriptionFacts || safeNode.facts);
    const base = existing.length ? existing : this.cleanFactsInput(safeNode.description || fallback);
    return base.map((item, index) => {
      const text = this.cleanText(item?.text || item?.description || item);
      if (!text) return null;
      const stamp = item?.updatedAt || item?.discoveredAt || time || '未知时间';
      return { id: item?.id || `fact_${Date.now()}_${index}`, text, discoveredAt: item?.discoveredAt || stamp, updatedAt: stamp, source: item?.source || '现实推演' };
    }).filter(Boolean).slice(-20);
  },

  syncNode(node, fallback = '', time = '') {
    if (!node) return null;
    node.descriptionFacts = this.normalizeFacts(node, fallback, time);
    node.description = node.descriptionFacts.map((fact, index) => this.formatFact(fact, index)).join('');
    return node;
  },

  formatFact(fact, index) {
    const text = this.cleanText(fact?.text);
    const time = fact?.updatedAt || fact?.discoveredAt || '未知时间';
    const verb = fact?.updatedAt && fact.updatedAt !== fact.discoveredAt ? '更新为' : '发现';
    return `${index + 1}.在${time}${verb}${text}。`;
  },

  addFact(node, text, time, source = '现实推演') {
    const clean = this.cleanText(text);
    if (!node || !clean) return false;
    node.descriptionFacts = this.normalizeFacts(node, '', time);
    if (node.descriptionFacts.some((fact) => fact.text === clean)) return false;
    node.descriptionFacts.push({ id: `fact_${Date.now()}_${node.descriptionFacts.length}`, text: clean, discoveredAt: time || '未知时间', updatedAt: time || '未知时间', source });
    this.syncNode(node, '', time);
    return true;
  },

  findFact(node, change = {}) {
    const oldText = this.cleanText(change.oldText || change.previousText || change.matchText || change.text);
    return (node.descriptionFacts || []).find((fact) => (change.factId && fact.id === change.factId) || (oldText && fact.text === oldText)) || null;
  },

  updateFact(node, change = {}, time = '') {
    if (!node) return false;
    node.descriptionFacts = this.normalizeFacts(node, '', time);
    const action = String(change.action || change.mode || 'add').toLowerCase();
    const nextText = this.cleanText(change.newText || change.text || change.description || change.fact);
    if (action === 'add') return this.addFact(node, nextText, time, change.source || '现实推演');
    const hit = this.findFact(node, change);
    if (!hit) return false;
    if (action === 'delete' || action === 'remove') node.descriptionFacts = node.descriptionFacts.filter((fact) => fact.id !== hit.id);
    else if (nextText) { hit.text = nextText; hit.updatedAt = time || hit.updatedAt; hit.source = change.source || hit.source; }
    this.syncNode(node, '', time);
    return true;
  },

  applyLocationUpdates(state, result = {}) {
    const map = window.GameModules.realWorldMap.ensure(state, state.playerProfile || {});
    const time = this.nowLabel(state);
    const locationPayloads = [...(result.newLocations || []), ...(result.mapLocationAdds || [])];
    locationPayloads.forEach((item) => window.GameModules.realWorldMap.addLocation(state, item, time));
    (result.locationDescriptionUpdates || result.mapDescriptionUpdates || []).forEach((change) => {
      const name = window.GameModules.realWorldMap.cleanName(change.locationName || change.name);
      if (!name) return;
      const node = window.GameModules.realWorldMap.upsertNode(map, { name, parentName: change.parentName, time });
      this.updateFact(node, change, time);
    });
    map.lastText = window.GameModules.realWorldMap.render(map);
    return map;
  },
};
