/**
 * 现实世界电子地图：地点以树词条组织，可展开子地点并查看说明。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldMap = {
  defaultState(profile = {}) {
    const home = this.inferHomeName(profile);
    const node = home ? this.makeNode(home, '', this.defaultDescription(home, profile)) : null;
    return { current: home, currentId: node?.id || '', nodes: node ? [node] : [], edges: [], expanded: node ? { [node.id]: true } : {}, infoNodeId: '', lastText: home };
  },

  isAbstractName(name) {
    const text = this.cleanName(name);
    return !text || /^(玩家住处|住处|现实地点|当前位置|未知地点|现实起点)$/u.test(text) || /现实起点$/u.test(text);
  },

  inferHomeName(profile = {}) {
    const candidates = [profile.homeLocation, profile.locationName, profile.refinedCity, profile.city];
    return candidates.map((x) => this.cleanName(x)).find((x) => !this.isAbstractName(x) && /区|县|镇|街|路|巷|号|栋|楼|室|小区|公寓|学校|公司|工位/u.test(x)) || '';
  },

  defaultDescription(name, profile = {}) {
    const detail = [profile.refinedLivingStatus, profile.refinedRole].filter(Boolean).join('；');
    return detail ? `${name}。${detail}` : `${name}，现实推演中的已知地点。`;
  },

  cleanName(name) {
    return String(name || '').replace(/[\n\r|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 28);
  },

  cleanDescription(text, fallback = '现实推演记录到的地点。') {
    return String(text || fallback).replace(/[\n\r]+/g, ' ').trim().slice(0, 160) || fallback;
  },

  nodeId(name) {
    return `loc_${this.cleanName(name).replace(/[^\w\u4e00-\u9fa5]+/gu, '_')}`;
  },

  factTime(state) {
    return window.GameModules.realWorldMapFacts?.nowLabel?.(state) || `${state.phoneDateText?.() || ''}${state.phoneTimeText?.() || ''}` || new Date().toISOString();
  },

  syncFacts(node, fallback = '', time = '') {
    return window.GameModules.realWorldMapFacts?.syncNode?.(node, fallback, time) || node;
  },

  makeNode(name, parentId = '', description = '', time = '') {
    const clean = this.cleanName(name);
    if (this.isAbstractName(clean)) return null;
    return this.syncFacts({ id: this.nodeId(clean), name: clean, parentId, description: this.cleanDescription(description), order: Date.now() }, description, time);
  },

  ensure(state, profile = {}) {
    if (!state.realWorldMap || typeof state.realWorldMap !== 'object') state.realWorldMap = this.defaultState(profile);
    const map = state.realWorldMap;
    map.expanded = map.expanded && typeof map.expanded === 'object' ? map.expanded : {};
    map.nodes = this.normalizeNodes(map, profile, this.factTime(state));
    map.edges = Array.isArray(map.edges) ? map.edges : [];
    const inferred = this.inferHomeName(profile);
    const currentName = this.isAbstractName(map.current || state.realWorldLocationName) ? inferred : this.cleanName(map.current || state.realWorldLocationName);
    const currentNode = currentName ? this.upsertNode(map, { name: currentName, description: this.defaultDescription(currentName, profile), time: this.factTime(state), onlyIfNew: true }) : this.currentNode(map);
    if (currentNode) {
      map.current = currentNode.name;
      map.currentId = currentNode.id;
      map.expanded[currentNode.id] = true;
      state.realWorldLocationName = currentNode.name;
    } else {
      map.current = '';
      map.currentId = '';
      state.realWorldLocationName = '';
    }
    map.lastText = this.render(map);
    return map;
  },

  normalizeNodes(map, profile = {}, time = '') {
    const nodes = [];
    const add = (node) => {
      const name = this.cleanName(node?.name || node);
      if (this.isAbstractName(name)) return;
      const id = node?.id || this.nodeId(name);
      if (nodes.some((item) => item.id === id)) return;
      nodes.push(this.syncFacts({ id, name, parentId: node?.parentId || '', description: this.cleanDescription(node?.description, this.defaultDescription(name, profile)), descriptionFacts: node?.descriptionFacts || node?.facts, order: Number(node?.order) || nodes.length + 1 }, node?.description || this.defaultDescription(name, profile), time));
    };
    (Array.isArray(map.nodes) ? map.nodes : []).forEach(add);
    if (Array.isArray(map.edges)) map.edges.forEach((edge) => { add(edge.from); add(edge.to); });
    if (!nodes.length && this.inferHomeName(profile)) add(this.inferHomeName(profile));
    const ids = new Set(nodes.map((node) => node.id));
    nodes.forEach((node) => { if (node.parentId && !ids.has(node.parentId)) node.parentId = ''; });
    return nodes.slice(-40);
  },

  update(state, locationName, result = {}) {
    const map = this.ensure(state, state.playerProfile || {});
    const time = this.factTime(state);
    const rawNext = this.cleanName(locationName || result.locationName || map.current);
    const nextName = this.isAbstractName(rawNext) ? this.inferHomeName(state.playerProfile || {}) : rawNext;
    if (!nextName) return map;
    const parentName = this.cleanName(result.parentLocationName || result.parentLocation || '');
    const descriptionRaw = result.locationDescription || result.description;
    const description = this.cleanDescription(descriptionRaw, `${nextName}，当前现实行动发生或停留的位置。`);
    const parent = parentName ? this.upsertNode(map, { name: parentName, description: `${parentName}，${nextName} 的上级地点。`, time, onlyIfNew: true }) : null;
    const node = this.upsertNode(map, { name: nextName, parentId: parentName ? parent?.id || '' : undefined, description, time, appendFact: Boolean(descriptionRaw) });
    if (parent && parent.id !== node.id) map.expanded[parent.id] = true;
    if (Array.isArray(result.mapNodes)) result.mapNodes.slice(0, 8).forEach((item) => this.addLocation(state, item, time, node));
    if (Array.isArray(result.mapLinks)) result.mapLinks.slice(0, 6).forEach((link) => this.addLinkNode(map, link, time));
    window.GameModules.realWorldMapFacts?.applyLocationUpdates?.(state, result);
    map.current = node.name;
    map.currentId = node.id;
    map.expanded[node.id] = true;
    state.realWorldLocationName = node.name;
    map.lastText = this.render(map);
    return map;
  },

  addLocation(state, item = {}, time = '', fallbackParent = null) {
    const map = this.ensure(state, state.playerProfile || {});
    const name = this.cleanName(item.name || item.locationName);
    if (!name) return null;
    const parentName = this.cleanName(item.parentName || item.parentLocationName || item.parentLocation || '');
    const parent = parentName ? this.upsertNode(map, { name: parentName, time }) : fallbackParent;
    const facts = item.descriptionFacts || item.facts || item.fact || item.description || item.summary || `${name}，电子地图记录的地点。`;
    const node = this.upsertNode(map, { name, parentId: parent?.id || '', description: Array.isArray(facts) ? '' : facts, descriptionFacts: facts, time });
    if (parent) map.expanded[parent.id] = true;
    map.lastText = this.render(map);
    return node;
  },

  addLinkNode(map, link, time = '') {
    const from = this.cleanName(link?.from);
    const to = this.cleanName(link?.to);
    if (!from || !to || from === to) return;
    const parent = this.upsertNode(map, { name: from, time });
    this.upsertNode(map, { name: to, parentId: parent.id, description: link?.description || `${to}，可由${from}抵达。`, time, onlyIfNew: true });
    map.expanded[parent.id] = true;
  },

  upsertNode(map, data = {}) {
    const name = this.cleanName(data.name);
    if (!name || this.isAbstractName(name)) return null;
    const id = data.id || this.nodeId(name);
    let node = map.nodes.find((item) => item.id === id || item.name === name);
    if (!node) {
      node = this.makeNode(name, data.parentId || '', data.description || `${name}，现实推演记录到的地点。`, data.time);
      if (!node) return null;
      map.nodes.push(node);
    }
    if (data.parentId !== undefined && data.parentId !== node.id) node.parentId = data.parentId;
    this.syncFacts(node, data.description || node.description, data.time);
    const facts = window.GameModules.realWorldMapFacts;
    if (data.descriptionFacts) node.descriptionFacts = facts?.normalizeFacts?.({ descriptionFacts: data.descriptionFacts }, '', data.time) || node.descriptionFacts;
    if (data.appendFact && data.description) facts?.addFact?.(node, data.description, data.time);
    if (!data.onlyIfNew && data.description && !node.descriptionFacts?.length) facts?.addFact?.(node, data.description, data.time);
    this.syncFacts(node, data.description || node.description, data.time);
    map.nodes = map.nodes.slice(-40);
    return node;
  },

  currentNode(map) { return map.nodes.find((node) => node.id === map.currentId) || map.nodes.find((node) => node.name === map.current) || map.nodes[0]; },
  childrenOf(map, parentId = '') { return (map.nodes || []).filter((node) => (node.parentId || '') === (parentId || '')).sort((a, b) => (a.order || 0) - (b.order || 0)); },

  visibleNodes(map) {
    const rows = [];
    const walk = (parentId, depth) => {
      this.childrenOf(map, parentId).forEach((node) => {
        rows.push({ ...node, depth, hasChildren: this.childrenOf(map, node.id).length > 0, current: node.id === map.currentId });
        if (map.expanded?.[node.id]) walk(node.id, depth + 1);
      });
    };
    walk('', 0);
    return rows;
  },

  toggle(state, id) { const map = this.ensure(state, state.playerProfile || {}); map.expanded[id] = !map.expanded[id]; },
  showInfo(state, id) { const map = this.ensure(state, state.playerProfile || {}); map.infoNodeId = id; },
  closeInfo(state) { if (state.realWorldMap) state.realWorldMap.infoNodeId = ''; },
  infoNode(map) { return (map?.nodes || []).find((node) => node.id === map.infoNodeId) || null; },
  render(map) {
    const rows = this.visibleNodes(map || {});
    if (!rows.length) return '等待 AI 根据现实上下文生成具体地点';
    return rows.map((node) => `${'  '.repeat(node.depth)}${node.current ? `【${node.name}】` : node.name}`).join('-----');
  },
};
