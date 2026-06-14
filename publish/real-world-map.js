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

  makeNode(name, parentId = '', description = '') {
    const clean = this.cleanName(name);
    if (this.isAbstractName(clean)) return null;
    return { id: this.nodeId(clean), name: clean, parentId, description: this.cleanDescription(description), order: Date.now() };
  },

  ensure(state, profile = {}) {
    if (!state.realWorldMap || typeof state.realWorldMap !== 'object') state.realWorldMap = this.defaultState(profile);
    const map = state.realWorldMap;
    map.expanded = map.expanded && typeof map.expanded === 'object' ? map.expanded : {};
    map.nodes = this.normalizeNodes(map, profile);
    map.edges = Array.isArray(map.edges) ? map.edges : [];
    const inferred = this.inferHomeName(profile);
    const currentName = this.isAbstractName(map.current || state.realWorldLocationName) ? inferred : this.cleanName(map.current || state.realWorldLocationName);
    const currentNode = currentName ? this.upsertNode(map, { name: currentName, description: this.defaultDescription(currentName, profile) }) : this.currentNode(map);
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

  normalizeNodes(map, profile = {}) {
    const existing = Array.isArray(map.nodes) ? map.nodes : [];
    const nodes = [];
    const add = (node) => {
      const name = this.cleanName(node?.name || node);
      if (this.isAbstractName(name)) return;
      const id = node?.id || this.nodeId(name);
      if (nodes.some((item) => item.id === id)) return;
      nodes.push({
        id,
        name,
        parentId: node?.parentId || '',
        description: this.cleanDescription(node?.description, this.defaultDescription(name, profile)),
        order: Number(node?.order) || nodes.length + 1,
      });
    };
    existing.forEach(add);
    if (Array.isArray(map.edges)) map.edges.forEach((edge) => { add(edge.from); add(edge.to); });
    if (!nodes.length && this.inferHomeName(profile)) add(this.inferHomeName(profile));
    const ids = new Set(nodes.map((node) => node.id));
    nodes.forEach((node) => { if (node.parentId && !ids.has(node.parentId)) node.parentId = ''; });
    return nodes.slice(-40);
  },

  update(state, locationName, result = {}) {
    const map = this.ensure(state, state.playerProfile || {});
    const rawNext = this.cleanName(locationName || result.locationName || map.current);
    const nextName = this.isAbstractName(rawNext) ? this.inferHomeName(state.playerProfile || {}) : rawNext;
    if (!nextName) return map;
    const parentName = this.cleanName(result.parentLocationName || result.parentLocation || '');
    const description = this.cleanDescription(result.locationDescription || result.description, `${nextName}，当前现实行动发生或停留的位置。`);
    const parent = parentName ? this.upsertNode(map, { name: parentName, description: `${parentName}，${nextName} 的上级地点。` }) : this.currentNode(map);
    const node = this.upsertNode(map, { name: nextName, parentId: parent?.id || '', description });
    if (parent && parent.id !== node.id) map.expanded[parent.id] = true;
    if (Array.isArray(result.mapNodes)) result.mapNodes.slice(0, 8).forEach((item) => this.addResultNode(map, item, node));
    if (Array.isArray(result.mapLinks)) result.mapLinks.slice(0, 6).forEach((link) => this.addLinkNode(map, link));
    map.current = node.name;
    map.currentId = node.id;
    map.expanded[node.id] = true;
    state.realWorldLocationName = node.name;
    map.lastText = this.render(map);
    return map;
  },

  addResultNode(map, item, fallbackParent) {
    const name = this.cleanName(item?.name || item?.locationName);
    if (!name) return;
    const parentName = this.cleanName(item?.parentName || item?.parentLocationName || item?.parentLocation || '');
    const parent = parentName ? this.upsertNode(map, { name: parentName }) : fallbackParent;
    this.upsertNode(map, { name, parentId: parent?.id || '', description: item?.description || item?.summary || `${name}，电子地图记录的子地点。` });
    if (parent) map.expanded[parent.id] = true;
  },

  addLinkNode(map, link) {
    const from = this.cleanName(link?.from);
    const to = this.cleanName(link?.to);
    if (!from || !to || from === to) return;
    const parent = this.upsertNode(map, { name: from });
    this.upsertNode(map, { name: to, parentId: parent.id, description: link?.description || `${to}，可由${from}抵达。` });
    map.expanded[parent.id] = true;
  },

  upsertNode(map, data = {}) {
    const name = this.cleanName(data.name);
    if (!name) return null;
    const id = data.id || this.nodeId(name);
    let node = map.nodes.find((item) => item.id === id || item.name === name);
    if (!node) {
      node = this.makeNode(name, data.parentId || '', data.description || `${name}，现实推演记录到的地点。`);
      if (!node) return null;
      map.nodes.push(node);
    }
    if (data.parentId !== undefined && data.parentId !== node.id) node.parentId = data.parentId;
    if (data.description) node.description = this.cleanDescription(data.description);
    map.nodes = map.nodes.slice(-40);
    return node;
  },

  currentNode(map) {
    return map.nodes.find((node) => node.id === map.currentId) || map.nodes.find((node) => node.name === map.current) || map.nodes[0];
  },

  childrenOf(map, parentId = '') {
    return (map.nodes || []).filter((node) => (node.parentId || '') === (parentId || '')).sort((a, b) => (a.order || 0) - (b.order || 0));
  },

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

  toggle(state, id) {
    const map = this.ensure(state, state.playerProfile || {});
    map.expanded[id] = !map.expanded[id];
  },

  showInfo(state, id) {
    const map = this.ensure(state, state.playerProfile || {});
    map.infoNodeId = id;
  },

  closeInfo(state) {
    if (state.realWorldMap) state.realWorldMap.infoNodeId = '';
  },

  infoNode(map) {
    return (map?.nodes || []).find((node) => node.id === map.infoNodeId) || null;
  },

  render(map) {
    const rows = this.visibleNodes(map || {});
    if (!rows.length) return '等待 AI 根据现实上下文生成具体地点';
    return rows.map((node) => `${'  '.repeat(node.depth)}${node.current ? `【${node.name}】` : node.name}`).join('-----');
  },
};
