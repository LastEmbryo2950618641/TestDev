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
    return this.cleanName(window.GameModules.currentLocationField?.mapNodeName?.(profile) || '');
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

  mapExteriorName(name = '') {
    const text = this.cleanName(name);
    if (!text) return '';
    const match = text.match(/^(.+?(?:\d+|[一二三四五六七八九十]+)\s*(?:栋|幢|号楼|座))(?:\s*(?:\d+|[一二三四五六七八九十]+)\s*单元.*|.*(?:房间|卧室|客厅|厨房|卫生间|洗手间|浴室|走廊|楼梯间|电梯间|门厅).*)$/u);
    return this.cleanName(match?.[1] || text);
  },

  interiorNameWithinExterior(name = '', exteriorName = '') {
    const text = this.cleanName(name);
    const exterior = this.cleanName(exteriorName);
    if (!text || !exterior || text === exterior || !text.startsWith(exterior)) return text;
    return this.cleanName(text.slice(exterior.length)) || text;
  },

  /** 建筑物内部场景：不出现在电子地图节点上，只进 interiorLayout。 */
  isInteriorLocationName(name = '') {
    const text = this.cleanName(name);
    if (!text) return false;
    if (/的房间|卧室|客厅|厨房|卫生间|洗手间|浴室|储物间|书房|阳台|衣帽间/u.test(text)) return true;
    if (/^走廊$|走廊$|楼梯间|电梯间|电梯厅|单元门厅|门厅$/u.test(text)) return true;
    if (/的(房|室|间)/u.test(text)) return true;
    return false;
  },

  /** 电子地图可见 POI：建筑、场所、道路与步道均为可移动节点。 */
  isMapExteriorNode(name = '') {
    const text = this.cleanName(name);
    if (!text || this.isInteriorLocationName(text)) return false;
    const exterior = this.mapExteriorName(text);
    if (exterior && exterior !== text) return false;
    if (/栋|座|号楼|幢/u.test(text) && !/单元|走廊|楼梯|房间/u.test(text)) return true;
    if (/小区|社区|公园|花园|超市|商店|店铺|广场|学校|公司|办公|车场|停车场|门岗|菜市|市场/u.test(text)) return true;
    if (/路|街|巷|道|步道|通道|入口|出口|大门|门口|桥|隧道/u.test(text)) return true;
    if (/省|市|区|县|镇|街道/u.test(text) && /栋|楼/u.test(text) && !/单元/u.test(text)) return true;
    return false;
  },

  isCommunityLevelNode(name = '') {
    const text = this.cleanName(name);
    if (this.mapExteriorName(text) !== text) return false;
    return Boolean(text) && /小区|社区|园|广场/u.test(text) && !this.isInteriorLocationName(text) && !this.isMapExteriorNode(text);
  },

  isAggregateMapNode(name = '') {
    const text = this.cleanName(name);
    if (this.mapExteriorName(text) !== text) return false;
    return Boolean(text) && /小区|社区|街道|园区|片区/u.test(text) && !/栋|单元|座|号楼|幢/u.test(text);
  },

  isMapDisplayNode(node = {}, map = null) {
    if (!node?.name) return false;
    if (node.mapVisible === false) return false;
    if (this.isInteriorLocationName(node.name)) return false;
    if (map && this.isAggregateMapNode(node.name)) {
      const kids = this.childrenOf(map, node.id);
      if (kids.some((child) => child.mapVisible !== false && this.isMapExteriorNode(child.name))) return false;
    }
    if (this.isMapExteriorNode(node.name)) return true;
    if (this.isCommunityLevelNode(node.name)) {
      const kids = map ? this.childrenOf(map, node.id) : [];
      return kids.some((child) => this.isMapExteriorNode(child.name));
    }
    return false;
  },

  resolveExteriorAnchorNode(map, node) {
    if (!node) return null;
    let current = node;
    for (let guard = 0; guard < 12 && current; guard += 1) {
      if (this.isMapExteriorNode(current.name) && !this.isAggregateMapNode(current.name)) return current;
      if (!current.parentId) break;
      current = (map.nodes || []).find((item) => item.id === current.parentId);
    }
    current = node;
    for (let guard = 0; guard < 12 && current; guard += 1) {
      if (!this.isInteriorLocationName(current.name)) return current;
      if (!current.parentId) break;
      current = (map.nodes || []).find((item) => item.id === current.parentId);
    }
    return node;
  },

  inferInteriorKind(name = '') {
    const text = this.cleanName(name);
    if (/楼梯/u.test(text)) return '楼梯间';
    if (/走廊/u.test(text)) return '走廊';
    if (/厨房/u.test(text)) return '厨房';
    if (/卫生间|洗手间|浴室/u.test(text)) return '卫生间';
    if (/客厅/u.test(text)) return '客厅';
    if (/房间|卧室/u.test(text)) return '卧室';
    return '空间';
  },

  ensureInteriorLayout(node) {
    if (!node.interiorLayout || typeof node.interiorLayout !== 'object') node.interiorLayout = { summary: '', zones: [] };
    if (!Array.isArray(node.interiorLayout.zones)) node.interiorLayout.zones = [];
    return node.interiorLayout;
  },

  addInteriorZone(anchor, source = {}) {
    if (!anchor) return;
    const name = this.cleanName(source.name || source);
    if (!name) return;
    const layout = this.ensureInteriorLayout(anchor);
    if (layout.zones.some((zone) => zone.name === name)) return;
    layout.zones.push({
      id: String(source.id || `zone_${this.nodeId(name)}`),
      name,
      kind: String(source.kind || this.inferInteriorKind(name)).slice(0, 12),
      position: String(source.position || '中').slice(0, 2),
      description: this.cleanDescription(source.description || `${name}，${anchor.name} 内部空间。`),
    });
  },

  compactInteriorNodes(map) {
    (map.nodes || []).forEach((node) => {
      if (!this.isInteriorLocationName(node.name)) return;
      node.mapVisible = false;
      node.exteriorRingUnlocked = false;
      const anchor = this.resolveExteriorAnchorNode(map, node);
      if (!anchor || anchor.id === node.id) return;
      if (!node.parentId || node.parentId !== anchor.id) node.parentId = anchor.id;
      this.addInteriorZone(anchor, {
        id: `zone_${node.id}`,
        name: node.name,
        kind: this.inferInteriorKind(node.name),
        description: node.description || `${node.name}，${anchor.name} 内部空间。`,
      });
    });
  },

  mapDisplayRender(map) {
    const nodes = (map.nodes || []).filter((node) => this.isMapDisplayNode(node, map));
    if (!nodes.length) return '等待 AI 根据现实上下文生成具体地点';
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const roots = nodes.filter((node) => !node.parentId || !byId.has(node.parentId));
    const lines = [];
    const walk = (node, depth) => {
      const anchorId = map.mapAnchorId || map.currentId;
      const mark = node.id === anchorId ? `【${node.name}】` : node.name;
      lines.push(`${'  '.repeat(depth)}${mark}`);
      this.childrenOf(map, node.id)
        .filter((child) => this.isMapDisplayNode(child, map))
        .forEach((child) => walk(child, depth + 1));
    };
    roots.forEach((root) => walk(root, 0));
    return lines.join('\n') || nodes.map((node) => node.name).join('、');
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
    const clean = this.mapExteriorName(name) || this.cleanName(name);
    if (this.isAbstractName(clean)) return null;
    return this.syncFacts({ id: this.nodeId(clean), name: clean, parentId, description: this.cleanDescription(description), order: Date.now(), visited: false, revealed: false, mapVisible: true, interiorLayout: { summary: '', zones: [] }, control: null, controlHistory: [] }, description, time);
  },

  trimMapNodes(map, store = null, max = 40) {
    if (!Array.isArray(map?.nodes) || map.nodes.length <= max) return;
    const dropped = map.nodes.slice(0, map.nodes.length - max);
    window.GameModules.orgTerritory?.archiveEvictedMapNodes?.(store, dropped, map);
    map.nodes = map.nodes.slice(-max);
  },

  ensure(state, profile = {}) {
    const sourceProfile = state?.playerIdentityState?.()?.profile || profile || {};
    if (!state.realWorldMap || typeof state.realWorldMap !== 'object') {
      const initialMap = this.defaultState(sourceProfile);
      state.realWorldMap = window.Alpine?.raw ? window.Alpine.raw(initialMap) : initialMap;
    }
    const map = state.realWorldMap;
    map.expanded = map.expanded && typeof map.expanded === 'object' ? map.expanded : {};
    map.view = map.view && typeof map.view === 'object' ? map.view : { x: 0, y: 0, scale: 1 };
    map.nodes = this.normalizeNodes(map, sourceProfile, this.factTime(state), state);
    map._boundStore = state;
    map.edges = Array.isArray(map.edges) ? map.edges : [];
    map.nodes.forEach((node) => window.GameModules.realWorldMapFog?.normalizeNodeFlags?.(node));
    window.GameModules.orgTerritory?.ensureMapControls?.(map, state);
    this.compactInteriorNodes(map);
    const inferred = this.inferHomeName(sourceProfile);
    const currentName = inferred || (this.isAbstractName(map.current || state.realWorldLocationName) ? '' : this.cleanName(map.current || state.realWorldLocationName));
    const currentNode = currentName ? this.upsertNode(map, { name: currentName, description: this.defaultDescription(currentName, sourceProfile), time: this.factTime(state), onlyIfNew: true }) : this.currentNode(map);
    if (currentNode) {
      map.current = currentNode.name;
      map.currentId = currentNode.id;
      const anchor = this.resolveExteriorAnchorNode(map, currentNode) || currentNode;
      map.mapAnchorId = anchor.id;
      map.expanded[anchor.id] = true;
      state.realWorldLocationName = currentNode.name;
    } else {
      map.current = '';
      map.currentId = '';
      map.mapAnchorId = '';
      state.realWorldLocationName = '';
    }
    window.GameModules.realWorldMapFog?.bootstrapHome?.(map);
    window.GameModules.realWorldMapGeopolitical?.ensure?.(state, map, profile);
    window.GameModules.orgTerritory?.ensureMapControls?.(map, state);
    map.lastText = this.render(map);
    return map;
  },

  interiorLayoutScore(layout = {}) {
    if (!layout || typeof layout !== 'object') return 0;
    const floors = Array.isArray(layout.floors) ? layout.floors : [];
    const zones = Array.isArray(layout.zones) ? layout.zones : [];
    let score = zones.length;
    floors.forEach((floor) => {
      const rooms = Array.isArray(floor?.rooms) ? floor.rooms : [];
      score += 10 + rooms.length * 10;
      rooms.forEach((room) => {
        score += Array.isArray(room?.layout?.shapes) ? room.layout.shapes.length : 0;
        const slotObjects = room?.slotObjects && typeof room.slotObjects === 'object' ? room.slotObjects : {};
        Object.values(slotObjects).forEach((items) => { score += Array.isArray(items) ? items.length : 0; });
      });
    });
    return score;
  },

  normalizeNodes(map, profile = {}, time = '', store = null) {
    const nodes = [];
    const add = (node) => {
      const rawName = this.cleanName(node?.name || node);
      const name = this.mapExteriorName(rawName) || rawName;
      if (this.isAbstractName(name)) return;
      const id = node?.id || this.nodeId(name);
      const existing = nodes.find((item) => item.id === id || item.name === name);
      if (existing) {
        if (node?.interiorLayout && this.interiorLayoutScore(node.interiorLayout) >= this.interiorLayoutScore(existing.interiorLayout)) existing.interiorLayout = node.interiorLayout;
        if (!existing.descriptionFacts?.length && (node?.descriptionFacts || node?.facts)) existing.descriptionFacts = node.descriptionFacts || node.facts;
        existing.mapVisible = existing.mapVisible !== false || node?.mapVisible !== false;
        existing.revealed = Boolean(existing.revealed || node?.revealed);
        existing.visited = Boolean(existing.visited || node?.visited);
        existing.exteriorRingUnlocked = Boolean(existing.exteriorRingUnlocked || node?.exteriorRingUnlocked);
        existing.graphNodeId = existing.graphNodeId || node?.graphNodeId || '';
        existing.identityKey = existing.identityKey || node?.identityKey || '';
        existing.ownerRefs = Array.isArray(existing.ownerRefs) && existing.ownerRefs.length ? existing.ownerRefs : (node?.ownerRefs || existing.ownerRefs);
        existing.usageContracts = Array.isArray(existing.usageContracts) && existing.usageContracts.length ? existing.usageContracts : (node?.usageContracts || existing.usageContracts);
        return;
      }
      nodes.push(this.syncFacts({
        id,
        name,
        parentId: node?.parentId || '',
        description: this.cleanDescription(node?.description, this.defaultDescription(name, profile)),
        descriptionFacts: node?.descriptionFacts || node?.facts,
        order: Number(node?.order) || nodes.length + 1,
        revealed: node?.revealed,
        visited: node?.visited,
        mapVisible: node?.mapVisible,
        exteriorRingUnlocked: node?.exteriorRingUnlocked,
        interiorLayout: node?.interiorLayout,
        graphNodeId: node?.graphNodeId,
        identityKey: node?.identityKey,
        ownerRefs: node?.ownerRefs,
        usageContracts: node?.usageContracts,
        control: node?.control,
        controlHistory: node?.controlHistory,
        geopoliticalStub: node?.geopoliticalStub,
      }, node?.description || this.defaultDescription(name, profile), time));
    };
    (Array.isArray(map.nodes) ? map.nodes : []).forEach(add);
    if (Array.isArray(map.edges)) map.edges.forEach((edge) => { add(edge.from); add(edge.to); });
    if (!nodes.length && this.inferHomeName(profile)) add(this.inferHomeName(profile));
    const ids = new Set(nodes.map((node) => node.id));
    nodes.forEach((node) => { if (node.parentId && !ids.has(node.parentId)) node.parentId = ''; });
    if (store && nodes.length > 40) {
      window.GameModules.orgTerritory?.archiveEvictedMapNodes?.(store, nodes.slice(0, nodes.length - 40), { ...map, nodes });
    }
    return nodes.slice(-40);
  },

  update(state, locationName, result = {}) {
    const sourceProfile = state?.playerIdentityState?.()?.profile || state?.playerProfile || {};
    const map = this.ensure(state, sourceProfile);
    const time = this.factTime(state);
    const rawNext = this.cleanName(locationName || result.locationName || map.current);
    const exteriorName = this.mapExteriorName(rawNext);
    const unitLevel = Boolean(exteriorName && exteriorName !== rawNext);
    const nextName = this.isAbstractName(rawNext) ? this.inferHomeName(sourceProfile) : (unitLevel ? exteriorName : rawNext);
    if (!nextName) return map;
    const parentName = this.cleanName(result.parentLocationName || result.parentLocation || '');
    const descriptionRaw = result.locationDescription || result.description;
    const description = this.cleanDescription(descriptionRaw, `${nextName}，当前现实行动发生或停留的位置。`);
    let parent = parentName ? this.upsertNode(map, { name: parentName, description: `${parentName}，${nextName} 的上级地点。`, time, onlyIfNew: true }) : null;
    const interior = this.isInteriorLocationName(nextName);
    if (interior && !parent) {
      const anchorGuess = this.resolveExteriorAnchorNode(map, map.nodes.find((item) => item.id === map.mapAnchorId) || this.currentNode(map));
      if (anchorGuess) parent = anchorGuess;
    }
    const node = this.upsertNode(map, {
      name: nextName,
      parentId: parentName ? parent?.id || '' : (interior ? parent?.id || undefined : undefined),
      description,
      time,
      appendFact: Boolean(descriptionRaw),
    });
    if (!node) return map;
    const anchor = this.resolveExteriorAnchorNode(map, node) || node;
    if (interior) {
      node.mapVisible = false;
      if (anchor.id !== node.id) {
        node.parentId = anchor.id;
        this.addInteriorZone(anchor, { name: nextName, description });
      }
    } else if (unitLevel) {
      node.mapVisible = true;
      this.addInteriorZone(node, { name: this.interiorNameWithinExterior(rawNext, exteriorName), description });
    } else if (this.isMapExteriorNode(nextName)) {
      node.mapVisible = true;
    }
    if (parent && parent.id !== node.id && this.isMapDisplayNode(parent, map)) map.expanded[parent.id] = true;
    if (Array.isArray(result.mapNodes)) {
      result.mapNodes.slice(0, 8).forEach((item) => {
        const itemName = this.cleanName(item.name || item.locationName);
        if (this.isInteriorLocationName(itemName)) this.addInteriorZone(anchor, item);
        else this.addLocation(state, item, time, anchor);
      });
    }
    if (Array.isArray(result.mapLinks)) result.mapLinks.slice(0, 6).forEach((link) => this.addLinkNode(map, link, time));
    window.GameModules.realWorldMapFacts?.applyLocationUpdates?.(state, result);
    map.current = node.name;
    map.currentId = node.id;
    map.mapAnchorId = anchor.id;
    map.expanded[anchor.id] = true;
    state.realWorldLocationName = node.name;
    map.lastText = this.render(map);
    state.refreshRealWorldMapJsonDump?.();
    return map;
  },

  addLocation(state, item = {}, time = '', fallbackParent = null) {
    const map = this.ensure(state, state.playerIdentityState?.()?.profile || state.playerProfile || {});
    const rawName = this.cleanName(item.name || item.locationName);
    const exteriorName = this.mapExteriorName(rawName);
    const unitLevel = Boolean(exteriorName && exteriorName !== rawName);
    const name = unitLevel ? exteriorName : rawName;
    if (!name) return null;
    if (this.isInteriorLocationName(name)) {
      const anchor = fallbackParent || this.resolveExteriorAnchorNode(map, this.currentNode(map));
      if (anchor) this.addInteriorZone(anchor, item);
      return anchor;
    }
    const graphNode = window.GameModules.realWorldLocationGraph?.ensurePoiFromPayload?.(state, {
      ...item,
      name,
      parentId: fallbackParent?.id || item.parentId || '',
      time,
    }, { source: 'real-world-map-addLocation' });
    if (graphNode) {
      if (unitLevel) this.addInteriorZone(graphNode, { ...item, name: this.interiorNameWithinExterior(rawName, exteriorName) });
      if (fallbackParent && this.isMapDisplayNode(fallbackParent, map)) map.expanded[fallbackParent.id] = true;
      map.lastText = this.render(map);
      return graphNode;
    }
    const parentName = this.cleanName(item.parentName || item.parentLocationName || item.parentLocation || '');
    const parent = parentName ? this.upsertNode(map, { name: parentName, time }) : fallbackParent;
    const facts = item.descriptionFacts || item.facts || item.fact || item.description || item.summary || `${name}，电子地图记录的地点。`;
    const node = this.upsertNode(map, { name, parentId: parent?.id || '', description: Array.isArray(facts) ? '' : facts, descriptionFacts: facts, time });
    if (node) node.mapVisible = this.isMapExteriorNode(name) || this.isCommunityLevelNode(name);
    if (node && unitLevel) this.addInteriorZone(node, { ...item, name: this.interiorNameWithinExterior(rawName, exteriorName) });
    if (parent && this.isMapDisplayNode(parent, map)) map.expanded[parent.id] = true;
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
    const name = this.mapExteriorName(data.name) || this.cleanName(data.name);
    if (!name || this.isAbstractName(name)) return null;
    const id = data.id || this.nodeId(name);
    const existingMapNode = map.nodes.find((item) => item.id === id || item.name === name);
    if (data.onlyIfNew && existingMapNode) return existingMapNode;
    const store = map?._boundStore || null;
    if (store && window.GameModules.realWorldLocationGraph?.ensurePoiFromPayload) {
      const previousInterior = existingMapNode?.interiorLayout;
      const previousFlags = existingMapNode ? {
        visited: existingMapNode.visited,
        revealed: existingMapNode.revealed,
        exteriorRingUnlocked: existingMapNode.exteriorRingUnlocked,
      } : null;
      const graphNode = window.GameModules.realWorldLocationGraph.ensurePoiFromPayload(store, { ...data, name }, { source: 'real-world-map-upsertNode' });
      if (graphNode) {
        if (data.parentId !== undefined && data.parentId !== graphNode.id) graphNode.parentId = data.parentId;
        if (this.isInteriorLocationName(name)) graphNode.mapVisible = false;
        else if (data.mapVisible === false) graphNode.mapVisible = false;
        else if (this.isMapExteriorNode(name) || this.isCommunityLevelNode(name)) graphNode.mapVisible = true;
        this.syncFacts(graphNode, data.description || graphNode.description, data.time);
        const facts = window.GameModules.realWorldMapFacts;
        if (data.descriptionFacts) graphNode.descriptionFacts = facts?.normalizeFacts?.({ descriptionFacts: data.descriptionFacts }, '', data.time) || graphNode.descriptionFacts;
        if (data.appendFact && data.description) facts?.addFact?.(graphNode, data.description, data.time);
        if (!data.onlyIfNew && data.description && !graphNode.descriptionFacts?.length) facts?.addFact?.(graphNode, data.description, data.time);
        this.syncFacts(graphNode, data.description || graphNode.description, data.time);
        window.GameModules.orgTerritory?.normalizeNodeControl?.(graphNode, map, store);
        this.trimMapNodes(map, store);
        const projectedMapNode = map.nodes.find((item) => item.id === graphNode.id || item.graphNodeId === graphNode.id || item.name === name) || null;
        if (projectedMapNode) {
          if (previousInterior && this.interiorLayoutScore(previousInterior) >= this.interiorLayoutScore(projectedMapNode.interiorLayout)) projectedMapNode.interiorLayout = previousInterior;
          if (previousFlags) {
            projectedMapNode.visited = Boolean(projectedMapNode.visited || previousFlags.visited);
            projectedMapNode.revealed = Boolean(projectedMapNode.revealed || previousFlags.revealed);
            projectedMapNode.exteriorRingUnlocked = Boolean(projectedMapNode.exteriorRingUnlocked || previousFlags.exteriorRingUnlocked);
          }
          projectedMapNode.graphNodeId = projectedMapNode.graphNodeId || graphNode.id;
          projectedMapNode.identityKey = projectedMapNode.identityKey || graphNode.identityKey || '';
          return projectedMapNode;
        }
        return graphNode;
      }
    }
    let node = existingMapNode;
    if (!node) {
      node = this.makeNode(name, data.parentId || '', data.description || `${name}，现实推演记录到的地点。`, data.time);
      if (!node) return null;
      map.nodes.push(node);
    }
    if (data.parentId !== undefined && data.parentId !== node.id) node.parentId = data.parentId;
    if (this.isInteriorLocationName(name)) node.mapVisible = false;
    else if (data.mapVisible === false) node.mapVisible = false;
    else if (this.isMapExteriorNode(name) || this.isCommunityLevelNode(name)) node.mapVisible = true;
    this.syncFacts(node, data.description || node.description, data.time);
    const facts = window.GameModules.realWorldMapFacts;
    if (data.descriptionFacts) node.descriptionFacts = facts?.normalizeFacts?.({ descriptionFacts: data.descriptionFacts }, '', data.time) || node.descriptionFacts;
    if (data.appendFact && data.description) facts?.addFact?.(node, data.description, data.time);
    if (!data.onlyIfNew && data.description && !node.descriptionFacts?.length) facts?.addFact?.(node, data.description, data.time);
    this.syncFacts(node, data.description || node.description, data.time);
    window.GameModules.orgTerritory?.normalizeNodeControl?.(node, map, map._boundStore || null);
    this.trimMapNodes(map, map._boundStore || null);
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

  toggle(state, id) { const map = this.ensure(state, state.playerIdentityState?.()?.profile || state.playerProfile || {}); map.expanded[id] = !map.expanded[id]; },
  showInfo(state, id) {
    const map = this.ensure(state, state.playerIdentityState?.()?.profile || state.playerProfile || {});
    map.infoNodeId = id;
    map.interiorNodeId = '';
    map.interiorRoomId = '';
    map.interiorRoomAreaId = '';
    map.interiorRoomShapeId = '';
  },
  showInterior(state, id) {
    const map = this.ensure(state, state.playerIdentityState?.()?.profile || state.playerProfile || {});
    map.interiorNodeId = id;
    map.interiorRoomId = '';
    map.interiorRoomAreaId = '';
    map.interiorRoomShapeId = '';
    map.infoNodeId = '';
  },
  closeInfo(state) { if (state.realWorldMap) state.realWorldMap.infoNodeId = ''; },
  closeInterior(state) {
    if (state.realWorldMap) {
      state.realWorldMap.interiorNodeId = '';
      state.realWorldMap.interiorRoomId = '';
      state.realWorldMap.interiorRoomAreaId = '';
      state.realWorldMap.interiorRoomShapeId = '';
    }
  },
  interiorNode(map) {
    const key = String(map?.interiorNodeId || '');
    if (!key) return null;
    const nodes = Array.isArray(map?.nodes) ? map.nodes : [];
    return nodes.find((item) => item.id === key || item.name === key)
      || window.GameModules.realWorldLocationGraph?.getNode?.(map?._boundStore || {}, key)
      || null;
  },
  infoNode(map) {
    return (map?.nodes || []).find((node) => node.id === map.infoNodeId)
      || window.GameModules.realWorldLocationGraph?.getNode?.(map?._boundStore || {}, map?.infoNodeId)
      || null;
  },
  render(map) {
    return this.mapDisplayRender(map || {});
  },
};


(function enhanceRealWorldMapRoutes() {
  const mapMod = window.GameModules.realWorldMap;
  if (!mapMod || mapMod.__routeGraphEnhanced) return;
  mapMod.__routeGraphEnhanced = true;

  Object.assign(mapMod, {
    routeEdgeId(fromId = '', toId = '') {
      return `route_${[String(fromId || ''), String(toId || '')].sort().join('_')}`;
    },

    normalizeDistanceText(edge = {}) {
      const direct = String(edge.distanceText || edge.distance || edge.distanceLabel || '').trim();
      if (direct) return direct.slice(0, 18);
      const meters = Number(edge.distanceMeters || edge.meters || edge.lengthMeters);
      if (Number.isFinite(meters) && meters > 0) {
        return meters >= 1000 ? `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km` : `${Math.round(meters)} m`;
      }
      return '\u8ddd\u79bb\u5f85\u63a8\u6f14';
    },

    resolveRouteNode(map, value, time = '') {
      const rawName = typeof value === 'object'
        ? (value.id || value.name || value.locationName || value.nodeName)
        : value;
      const text = String(rawName || '').trim();
      if (!text) return null;
      let node = (map.nodes || []).find((item) => item.id === text || item.name === text);
      if (!node) node = this.upsertNode(map, { name: text, time, onlyIfNew: true });
      if (!node) return null;
      return this.resolveExteriorAnchorNode(map, node) || node;
    },

    normalizeRouteLink(map, raw = {}, time = '') {
      if (!raw || typeof raw !== 'object') return null;
      const fromRaw = raw.from || raw.fromName || raw.source || raw.sourceName || raw.start || raw.startName;
      const toRaw = raw.to || raw.toName || raw.target || raw.targetName || raw.end || raw.endName;
      const from = this.resolveRouteNode(map, fromRaw, time);
      const to = this.resolveRouteNode(map, toRaw, time);
      if (!from || !to || from.id === to.id) return null;
      const meters = Number(raw.distanceMeters || raw.meters || raw.lengthMeters);
      return {
        id: String(raw.id || this.routeEdgeId(from.id, to.id)),
        from: from.id,
        to: to.id,
        fromName: from.name,
        toName: to.name,
        distanceMeters: Number.isFinite(meters) && meters > 0 ? Math.round(meters) : null,
        distanceText: this.normalizeDistanceText(raw),
        basis: String(raw.basis || raw.reason || raw.description || raw.detail || '').trim().slice(0, 100),
        updatedAt: time || '',
      };
    },

    normalizeEdges(map, time = '') {
      const edges = [];
      const seen = new Set();
      (Array.isArray(map.edges) ? map.edges : []).forEach((raw) => {
        const edge = this.normalizeRouteLink(map, raw, raw.updatedAt || time);
        if (!edge || seen.has(edge.id)) return;
        seen.add(edge.id);
        edges.push(edge);
      });
      map.edges = edges.slice(-80);
      return map.edges;
    },

    applyRouteLinks(state, map, routeLinks = [], time = '') {
      if (!Array.isArray(routeLinks) || !routeLinks.length) return [];
      if (!Array.isArray(map.edges)) map.edges = [];
      const existing = new Map(map.edges.map((edge) => [edge.id, edge]));
      const applied = [];
      routeLinks.slice(0, 12).forEach((raw) => {
        const edge = this.normalizeRouteLink(map, raw, time);
        if (!edge) return;
        existing.set(edge.id, { ...(existing.get(edge.id) || {}), ...edge });
        applied.push(edge);
      });
      map.edges = [...existing.values()].slice(-80);
      return applied;
    },
  });

  const originalEnsure = mapMod.ensure;
  mapMod.ensure = function enhancedEnsure(state, profile = {}) {
    const map = originalEnsure.call(this, state, profile);
    this.normalizeEdges(map, this.factTime(state));
    return map;
  };

  const originalUpdate = mapMod.update;
  mapMod.update = function enhancedUpdate(state, locationName, result = {}) {
    const map = originalUpdate.call(this, state, locationName, result);
    const time = this.factTime(state);
    this.applyRouteLinks(state, map, result.routeLinks || result.routes || [], time);
    if (Array.isArray(result.mapLinks)) this.applyRouteLinks(state, map, result.mapLinks, time);
    map.lastText = this.render(map);
    return map;
  };
}());
