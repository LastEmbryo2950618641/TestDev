/**
 * 电子地图地点说明：以玩家已知事实数组保存，并只按明确更新修改。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldMapFacts = {
  nowLabel(state) {
    state?.ensurePhoneFixedTime?.();
    const dateText = state?.phoneDateText?.();
    const timeText = state?.phoneTimeText?.();
    if (dateText && timeText && !/^1970年/u.test(dateText)) return `${dateText.replace(/\s*周[一二三四五六日天]/u, '')}${timeText}`;
    const d = new Date();
    const time = [d.getHours(), d.getMinutes(), d.getSeconds()].map((x) => String(x).padStart(2, '0')).join(':');
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日${time}`;
  },

  cleanText(text) {
    return String(text || '').replace(/[\n\r]+/g, ' ').replace(/^\d+[.、，\s]*/u, '').replace(/[。！？.!?]+$/u, '').trim().slice(0, 120);
  },

  cleanFactsInput(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    return String(value).split(/[；;\n]+/u).map((text) => ({ text }));
  },

  normalizeTime(value, fallback = '') {
    const text = String(value || '').trim();
    if (!text || /^1970年/u.test(text)) return fallback || this.nowLabel({});
    return text.replace(/\s+/g, '').replace(/周[一二三四五六日天]/u, '');
  },

  normalizeFacts(node = {}, fallback = '', time = '') {
    const safeNode = node || {};
    const existing = this.cleanFactsInput(safeNode.descriptionFacts || safeNode.facts);
    const base = existing.length ? existing : this.cleanFactsInput(safeNode.description || fallback);
    return base.map((item, index) => {
      const text = this.cleanText(item?.text || item?.description || item);
      const nodeName = this.cleanText(safeNode.name);
      if (!text || text === nodeName || /现实推演.*已知地点|电子地图记录的地点|当前现实行动发生或停留的位置/u.test(text)) return null;
      const stamp = this.normalizeTime(item?.updatedAt || item?.discoveredAt || time, time);
      return { id: item?.id || `fact_${Date.now()}_${index}`, text, discoveredAt: this.normalizeTime(item?.discoveredAt || stamp, stamp), updatedAt: stamp, source: item?.source || '现实推演' };
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
    const time = this.normalizeTime(fact?.updatedAt || fact?.discoveredAt || '未知时间');
    const verb = fact?.updatedAt && fact.updatedAt !== fact.discoveredAt ? '更新为' : '发现';
    return `${index + 1}.在${time}${verb}${text}。`;
  },

  addFact(node, text, time, source = '现实推演') {
    const clean = this.cleanText(text);
    if (!node || !clean) return false;
    const stamp = this.normalizeTime(time);
    node.descriptionFacts = this.normalizeFacts(node, '', stamp);
    if (node.descriptionFacts.some((fact) => fact.text === clean)) return false;
    node.descriptionFacts.push({ id: `fact_${Date.now()}_${node.descriptionFacts.length}`, text: clean, discoveredAt: stamp, updatedAt: stamp, source });
    this.syncNode(node, '', stamp);
    return true;
  },

  findFact(node, change = {}) {
    const oldText = this.cleanText(change.oldText || change.previousText || change.matchText || change.text);
    return (node.descriptionFacts || []).find((fact) => (change.factId && fact.id === change.factId) || (oldText && fact.text === oldText)) || null;
  },

  updateFact(node, change = {}, time = '') {
    if (!node) return false;
    const stamp = this.normalizeTime(time);
    node.descriptionFacts = this.normalizeFacts(node, '', stamp);
    const action = String(change.action || change.mode || 'add').toLowerCase();
    const nextText = this.cleanText(change.newText || change.text || change.description || change.fact);
    if (action === 'add') return this.addFact(node, nextText, stamp, change.source || '现实推演');
    const hit = this.findFact(node, change);
    if (!hit) return false;
    if (action === 'delete' || action === 'remove') node.descriptionFacts = node.descriptionFacts.filter((fact) => fact.id !== hit.id);
    else if (nextText) { hit.text = nextText; hit.updatedAt = stamp; hit.source = change.source || hit.source; }
    this.syncNode(node, '', stamp);
    return true;
  },

  applyLocationUpdates(state, result = {}) {
    const map = window.GameModules.realWorldMap.ensure(state, window.GameModules.currentLocationField?.roleProfile?.(state) || {});
    const time = this.nowLabel(state);
    const locationPayloads = [...(result.newLocations || []), ...(result.mapLocationAdds || [])];
    locationPayloads.forEach((item) => window.GameModules.realWorldLocationGraph?.ensurePoiFromPayload?.(state, { ...item, time }, { source: 'real-world-map-facts' }));
    (result.locationDescriptionUpdates || result.mapDescriptionUpdates || []).forEach((change) => {
      const name = window.GameModules.realWorldMap.cleanName(change.locationName || change.name);
      if (!name) return;
      const node = window.GameModules.realWorldLocationGraph?.ensurePoiFromPayload?.(state, { name, parentName: change.parentName, time }, { source: 'real-world-map-facts' });
      this.updateFact(node, change, time);
    });
    map.lastText = window.GameModules.realWorldMap.render(map);
    return map;
  },
};
