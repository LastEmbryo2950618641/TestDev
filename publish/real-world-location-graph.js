window.GameModules = window.GameModules || {};

window.GameModules.realWorldLocationGraph = {
  version: 1,

  emptyGraph() {
    return {
      version: this.version,
      nextNodeSeq: 1,
      nodesById: {},
      legacyAliases: {},
      identityIndex: {},
      searchIndex: { locationNodeIds: [], byNormalizedName: {} },
      characterLocations: {},
      poiGraph: { nodes: [], edges: [] },
      updatedAt: '',
    };
  },

  ensureGraphState(state = {}) {
    if (!state.locationGraph || typeof state.locationGraph !== 'object') state.locationGraph = this.emptyGraph();
    const graph = state.locationGraph;
    graph.version = Number(graph.version) || this.version;
    graph.nextNodeSeq = Math.max(1, Number(graph.nextNodeSeq) || 1);
    graph.nodesById = graph.nodesById && typeof graph.nodesById === 'object' ? graph.nodesById : {};
    graph.legacyAliases = graph.legacyAliases && typeof graph.legacyAliases === 'object' ? graph.legacyAliases : {};
    graph.identityIndex = graph.identityIndex && typeof graph.identityIndex === 'object' ? graph.identityIndex : {};
    graph.searchIndex = graph.searchIndex && typeof graph.searchIndex === 'object' ? graph.searchIndex : { locationNodeIds: [], byNormalizedName: {} };
    graph.characterLocations = graph.characterLocations && typeof graph.characterLocations === 'object' ? graph.characterLocations : {};
    graph.poiGraph = graph.poiGraph && typeof graph.poiGraph === 'object' ? graph.poiGraph : { nodes: [], edges: [] };
    graph.poiGraph.nodes = Array.isArray(graph.poiGraph.nodes) ? graph.poiGraph.nodes : [];
    graph.poiGraph.edges = Array.isArray(graph.poiGraph.edges) ? graph.poiGraph.edges : [];
    graph.auditCache = graph.auditCache && typeof graph.auditCache === 'object' ? graph.auditCache : {};
    this.syncNextSeq(graph);
    this.importLegacyMap(state, graph);
    this.rebuildIdentityIndex(graph);
    this.rebuildSearchIndex(graph);
    this.syncNextSeq(graph);
    return graph;
  },

  syncNextSeq(graph = {}) {
    const maxSeq = Object.keys(graph.nodesById || {}).reduce((max, id) => {
      const match = String(id || '').match(/^loc_(\d+)$/);
      return match ? Math.max(max, Number(match[1]) || 0) : max;
    }, 0);
    graph.nextNodeSeq = Math.max(Number(graph.nextNodeSeq) || 1, maxSeq + 1);
  },

  allocateLocationNodeId(state = {}) {
    const graph = this.ensureGraphState(state);
    let seq = Math.max(1, Number(graph.nextNodeSeq) || 1);
    let id = `loc_${seq}`;
    while (graph.nodesById[id]) {
      seq += 1;
      id = `loc_${seq}`;
    }
    graph.nextNodeSeq = seq + 1;
    return id;
  },

  cleanName(value = '') {
    const mapApi = window.GameModules.realWorldMap;
    return mapApi?.cleanName ? mapApi.cleanName(value) : String(value || '').replace(/[\n\r|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  },

  legacyKey(kind = '', value = '') {
    const text = String(value || '').trim();
    return text ? `${kind}:${text}` : '';
  },

  normalizeIdentityName(value = '') {
    return this.cleanName(value).toLowerCase().replace(/\s+/g, '');
  },

  identityKeyFor(data = {}) {
    const type = String(data.type || 'node').trim().toLowerCase() || 'node';
    const parentId = String(data.parentId || '').trim() || 'root';
    const name = this.normalizeIdentityName(data.displayName || data.name);
    return name ? `${type}|${parentId}|${name}` : '';
  },

  rememberIdentity(graph = {}, node = {}) {
    const key = this.identityKeyFor(node);
    if (!key || !node?.id) return '';
    node.identityKey = key;
    graph.identityIndex = graph.identityIndex && typeof graph.identityIndex === 'object' ? graph.identityIndex : {};
    graph.identityIndex[key] = node.id;
    this.rememberAlias(graph, this.legacyKey('identity', key), node.id);
    return key;
  },

  rememberSearchNode(graph = {}, node = {}) {
    if (!node?.id || !this.isLocationSearchNode(node)) return;
    graph.searchIndex = graph.searchIndex && typeof graph.searchIndex === 'object' ? graph.searchIndex : { locationNodeIds: [], byNormalizedName: {} };
    graph.searchIndex.locationNodeIds = Array.isArray(graph.searchIndex.locationNodeIds) ? graph.searchIndex.locationNodeIds : [];
    graph.searchIndex.byNormalizedName = graph.searchIndex.byNormalizedName && typeof graph.searchIndex.byNormalizedName === 'object' ? graph.searchIndex.byNormalizedName : {};
    if (!graph.searchIndex.locationNodeIds.includes(node.id)) graph.searchIndex.locationNodeIds.push(node.id);
    const key = this.normalizeIdentityName(node.displayName || node.name);
    if (!key) return;
    graph.searchIndex.byNormalizedName[key] = graph.searchIndex.byNormalizedName[key] || [];
    if (!graph.searchIndex.byNormalizedName[key].includes(node.id)) graph.searchIndex.byNormalizedName[key].push(node.id);
  },

  rebuildIdentityIndex(graph = {}) {
    graph.identityIndex = {};
    Object.values(graph.nodesById || {}).forEach((node) => this.rememberIdentity(graph, node));
    return graph.identityIndex;
  },

  locationSearchTypes() {
    return new Set(['poi', 'floor', 'room', 'zone', 'function-zone', 'inner-room']);
  },

  isLocationSearchNode(node = {}) {
    return this.locationSearchTypes().has(String(node.type || '').toLowerCase());
  },

  rebuildSearchIndex(graph = {}) {
    const byNormalizedName = {};
    const locationNodeIds = [];
    Object.values(graph.nodesById || {}).forEach((node) => {
      if (!node?.id || !this.isLocationSearchNode(node)) return;
      locationNodeIds.push(node.id);
      const key = this.normalizeIdentityName(node.displayName || node.name);
      if (!key) return;
      byNormalizedName[key] = byNormalizedName[key] || [];
      if (!byNormalizedName[key].includes(node.id)) byNormalizedName[key].push(node.id);
    });
    graph.searchIndex = { locationNodeIds, byNormalizedName };
    return graph.searchIndex;
  },

  alias(graph = {}, key = '') {
    return key ? graph.legacyAliases?.[key] || '' : '';
  },

  rememberAlias(graph = {}, key = '', nodeId = '') {
    if (key && nodeId) graph.legacyAliases[key] = nodeId;
  },

  importLegacyMap(state = {}, graph = this.ensureGraphState(state)) {
    const map = state.realWorldMap && typeof state.realWorldMap === 'object' ? state.realWorldMap : null;
    if (!map) return graph;
    const legacyNodes = Array.isArray(map.nodes) ? map.nodes : [];
    legacyNodes.forEach((node) => this.importLegacyPoiNode(state, graph, node));
    legacyNodes.forEach((node) => this.importLegacyInterior(state, graph, node));
    this.importLegacyEdges(state, graph, map);
    return graph;
  },

  importLegacyPoiNode(state = {}, graph = {}, legacyNode = {}) {
    const legacyId = String(legacyNode?.id || '').trim();
    const name = this.cleanName(legacyNode?.name);
    if (!legacyId && !name) return null;
    const aliasKeys = [this.legacyKey('mapId', legacyId), this.legacyKey('name', name)].filter(Boolean);
    const existingId = aliasKeys.map((key) => this.alias(graph, key)).find(Boolean);
    if (existingId && graph.nodesById[existingId]) return graph.nodesById[existingId];
    const id = this.allocateLocationNodeIdNoImport(graph);
    const parentId = legacyNode.parentId ? this.alias(graph, this.legacyKey('mapId', legacyNode.parentId)) : '';
    const node = {
      id,
      type: 'poi',
      name,
      displayName: name,
      parentId: parentId || '',
      legacyMapNodeId: legacyId || '',
      legacyAliases: aliasKeys,
      mapVisible: legacyNode.mapVisible !== false,
      known: true,
      source: 'legacy-realWorldMap',
      description: legacyNode.description || '',
      descriptionFacts: Array.isArray(legacyNode.descriptionFacts) ? legacyNode.descriptionFacts : [],
      ownerRefs: Array.isArray(legacyNode.ownerRefs) ? legacyNode.ownerRefs : [],
      usageContracts: Array.isArray(legacyNode.usageContracts) ? legacyNode.usageContracts : [],
      effectiveAuthorityRef: legacyNode.effectiveAuthorityRef || null,
      updatedAt: legacyNode.updatedAt || '',
    };
    graph.nodesById[id] = node;
    aliasKeys.forEach((key) => this.rememberAlias(graph, key, id));
    this.rememberIdentity(graph, node);
    this.rememberSearchNode(graph, node);
    if (!graph.poiGraph.nodes.includes(id)) graph.poiGraph.nodes.push(id);
    return node;
  },

  allocateLocationNodeIdNoImport(graph = {}) {
    let seq = Math.max(1, Number(graph.nextNodeSeq) || 1);
    let id = `loc_${seq}`;
    while (graph.nodesById?.[id]) {
      seq += 1;
      id = `loc_${seq}`;
    }
    graph.nextNodeSeq = seq + 1;
    return id;
  },

  importLegacyInterior(state = {}, graph = {}, legacyNode = {}) {
    const poiId = this.alias(graph, this.legacyKey('mapId', legacyNode?.id)) || this.alias(graph, this.legacyKey('name', legacyNode?.name));
    if (!poiId) return;
    const layout = legacyNode?.interiorLayout && typeof legacyNode.interiorLayout === 'object' ? legacyNode.interiorLayout : {};
    const floors = Array.isArray(layout.floors) ? layout.floors : [];
    floors.forEach((floor, floorIndex) => {
      const floorNode = this.ensureChildNode(graph, {
        type: 'floor',
        parentId: poiId,
        name: this.cleanName(floor.name || floor.label || `第${floorIndex + 1}层`),
        legacyKey: this.legacyKey('floor', `${poiId}:${floor.id || floor.name || floorIndex}`),
        order: Number(floor.order) || floorIndex + 1,
      });
      (Array.isArray(floor.rooms) ? floor.rooms : []).forEach((room, roomIndex) => {
        const roomName = this.cleanName(room.name || room.number || room.label || `房间${roomIndex + 1}`);
        const roomNode = this.ensureChildNode(graph, {
          type: 'room',
          parentId: floorNode.id,
          name: roomName,
          legacyKey: this.legacyKey('room', `${floorNode.id}:${room.id || room.number || room.name || roomIndex}`),
          roomCode: room.number || '',
          ownerRefs: room.ownerRefs,
          usageContracts: room.usageContracts,
        });
        this.importRoomLayoutNodes(graph, roomNode.id, room);
      });
    });
    (Array.isArray(layout.zones) ? layout.zones : []).forEach((zone, index) => {
      this.ensureChildNode(graph, {
        type: 'zone',
        parentId: poiId,
        name: this.cleanName(zone.name || zone.label || `区域${index + 1}`),
        legacyKey: this.legacyKey('zone', `${poiId}:${zone.id || zone.name || index}`),
        ownerRefs: zone.ownerRefs,
        usageContracts: zone.usageContracts,
      });
    });
  },

  importRoomLayoutNodes(graph = {}, roomId = '', room = {}) {
    const layout = room.layout && typeof room.layout === 'object' ? room.layout : {};
    (Array.isArray(layout.shapes) ? layout.shapes : []).forEach((shape, index) => {
      const name = this.cleanName(shape.label || shape.name || shape.id || `功能区${index + 1}`);
      const zoneNode = this.ensureChildNode(graph, {
        type: 'zone',
        parentId: roomId,
        name,
        legacyKey: this.legacyKey('shape', `${roomId}:${shape.nodeId || shape.id || name || index}`),
        order: Number(shape.order) || index + 1,
        x: shape.x,
        y: shape.y,
        w: shape.w,
        h: shape.h,
        ownerRefs: shape.ownerRefs,
        usageContracts: shape.usageContracts,
      });
      (Array.isArray(shape.objects) ? shape.objects : []).forEach((object, objectIndex) => {
        this.importObjectNode(graph, zoneNode.id, object, objectIndex, shape);
      });
    });
    Object.entries(room.slotObjects || {}).forEach(([slot, objects]) => {
      const parent = this.ensureChildNode(graph, {
        type: 'zone',
        parentId: roomId,
        name: this.cleanName(slot),
        legacyKey: this.legacyKey('slot', `${roomId}:${slot}`),
      });
      (Array.isArray(objects) ? objects : [objects]).forEach((object, index) => this.importObjectNode(graph, parent.id, object, index));
    });
  },

  importObjectNode(graph = {}, parentId = '', object = {}, index = 0, shape = {}) {
    const objectName = this.cleanName(typeof object === 'string' ? object : object?.name || object?.label || `摆件${index + 1}`);
    if (!objectName) return null;
    const objectNode = this.ensureChildNode(graph, {
      type: 'object',
      parentId,
      name: objectName,
      legacyKey: this.legacyKey('object', `${parentId}:${object?.id || objectName}:${index}`),
      order: Number(object?.order) || index + 1,
      x: object?.x,
      y: object?.y,
      w: object?.w,
      h: object?.h,
      ownerRefs: object?.ownerRefs,
      usageContracts: object?.usageContracts,
    });
    const contents = object && typeof object === 'object'
      ? object.containerContents || object.contents || object.containedItems || object.insideObjects || object.onObjects
      : shape.containerContents;
    (Array.isArray(contents) ? contents : []).forEach((item, itemIndex) => {
      const name = this.cleanName(typeof item === 'string' ? item : item?.name || item?.label || `物品${itemIndex + 1}`);
      if (!name) return;
      this.ensureChildNode(graph, {
        type: 'container-item',
        parentId: objectNode.id,
        name,
        legacyKey: this.legacyKey('container', `${objectNode.id}:${item?.id || name}:${itemIndex}`),
        ownerRefs: item?.ownerRefs,
        usageContracts: item?.usageContracts,
      });
    });
    return objectNode;
  },

  ensureChildNode(graph = {}, data = {}) {
    const legacy = data.legacyKey || '';
    const identityKey = this.identityKeyFor(data);
    const existingId = this.alias(graph, legacy) || graph.identityIndex?.[identityKey] || this.alias(graph, this.legacyKey('identity', identityKey));
    const id = existingId && graph.nodesById[existingId] ? existingId : this.allocateLocationNodeIdNoImport(graph);
    const node = {
      ...(graph.nodesById[id] || {}),
      id,
      type: data.type || graph.nodesById[id]?.type || 'node',
      name: this.cleanName(data.name) || graph.nodesById[id]?.name || '',
      displayName: this.cleanName(data.displayName || data.name) || graph.nodesById[id]?.displayName || graph.nodesById[id]?.name || '',
      parentId: data.parentId || graph.nodesById[id]?.parentId || '',
      order: Number(data.order) || Number(graph.nodesById[id]?.order) || 0,
      legacyAliases: [...new Set([...(graph.nodesById[id]?.legacyAliases || []), legacy].filter(Boolean))],
      ownerRefs: Array.isArray(data.ownerRefs) ? data.ownerRefs : (graph.nodesById[id]?.ownerRefs || []),
      usageContracts: Array.isArray(data.usageContracts) ? data.usageContracts : (graph.nodesById[id]?.usageContracts || []),
      effectiveAuthorityRef: data.effectiveAuthorityRef || graph.nodesById[id]?.effectiveAuthorityRef || null,
      source: graph.nodesById[id]?.source || 'legacy-interior',
    };
    if (data.roomCode !== undefined) node.roomCode = String(data.roomCode || '');
    ['x', 'y', 'w', 'h'].forEach((key) => {
      const value = Number(data[key]);
      if (Number.isFinite(value)) node[key] = value;
    });
    graph.nodesById[id] = node;
    if (legacy) this.rememberAlias(graph, legacy, id);
    this.rememberIdentity(graph, node);
    this.rememberSearchNode(graph, node);
    return node;
  },

  importLegacyEdges(state = {}, graph = {}, map = {}) {
    const seen = new Set((graph.poiGraph.edges || []).map((edge) => edge.id));
    (Array.isArray(map.edges) ? map.edges : []).forEach((edge, index) => {
      const from = this.alias(graph, this.legacyKey('mapId', edge.from)) || this.alias(graph, this.legacyKey('name', edge.fromName));
      const to = this.alias(graph, this.legacyKey('mapId', edge.to)) || this.alias(graph, this.legacyKey('name', edge.toName));
      if (!from || !to || from === to) return;
      const id = `edge_${from}_${to}`;
      if (seen.has(id)) return;
      seen.add(id);
      graph.poiGraph.edges.push({
        id,
        fromPoiId: from,
        toPoiId: to,
        relation: 'direct-neighbor',
        directNeighbor: true,
        noIntermediateLocations: true,
        intermediateLocations: [],
        distanceMeters: edge.distanceMeters || null,
        distanceText: edge.distanceText || '',
        basis: edge.basis || '',
        legacyEdgeIndex: index,
      });
    });
  },

  allNodes(state = {}) {
    const graph = this.ensureGraphState(state);
    return Object.values(graph.nodesById || {});
  },

  getNode(state = {}, nodeId = '') {
    const graph = this.ensureGraphState(state);
    const key = String(nodeId || '').trim();
    return graph.nodesById[key]
      || graph.nodesById[graph.identityIndex?.[key]]
      || graph.nodesById[this.alias(graph, this.legacyKey('identity', key))]
      || graph.nodesById[this.alias(graph, this.legacyKey('mapId', key))]
      || graph.nodesById[this.alias(graph, this.legacyKey('name', key))]
      || null;
  },

  findStrictNode(state = {}, params = {}) {
    const graph = this.ensureGraphState(state);
    const direct = this.getNode(state, params.nodeId || params.id || params.identityKey || '');
    if (direct) return direct;
    const name = this.normalizeIdentityName(params.name || params.displayName || params.targetKeyword || params.keyword);
    if (!name) return null;
    const type = String(params.type || '').trim().toLowerCase();
    const parentId = String(params.parentId || '').trim();
    const hits = Object.values(graph.nodesById || {}).filter((node) => {
      if (!node) return false;
      if (type && String(node.type || '').toLowerCase() !== type) return false;
      if (parentId && node.parentId !== parentId) return false;
      return this.normalizeIdentityName(node.displayName || node.name) === name;
    });
    return hits[0] || null;
  },

  pathByNodeId(state = {}, nodeId = '') {
    const graph = this.ensureGraphState(state);
    const start = this.getNode(state, nodeId);
    if (!start) return [];
    const path = [];
    let current = start;
    for (let guard = 0; guard < 32 && current; guard += 1) {
      path.unshift(current);
      current = current.parentId ? graph.nodesById[current.parentId] : null;
    }
    return path;
  },

  pathText(state = {}, nodeId = '') {
    return this.pathByNodeId(state, nodeId).map((node) => node.displayName || node.name || node.id).join(' -> ');
  },

  searchNode(state = {}, keyword = '', limit = 20, options = {}) {
    const graph = this.ensureGraphState(state);
    const key = this.cleanName(keyword).toLowerCase();
    if (!key) return [];
    const normalizedKey = this.normalizeIdentityName(keyword);
    const includeTypes = Array.isArray(options.includeTypes) ? new Set(options.includeTypes.map((type) => String(type || '').toLowerCase())) : null;
    const indexedIds = includeTypes
      ? Object.values(graph.nodesById || {}).filter((node) => includeTypes.has(String(node.type || '').toLowerCase())).map((node) => node.id)
      : (graph.searchIndex?.locationNodeIds || []);
    return indexedIds
      .map((id) => graph.nodesById[id])
      .filter((node) => {
        if (!node) return false;
        const haystack = [
          node.id,
          node.identityKey,
          node.name,
          node.displayName,
          node.legacyMapNodeId,
          ...(node.legacyAliases || []),
          JSON.stringify(node.ownerRefs || []),
          JSON.stringify(node.usageContracts || []),
        ].join(' ').toLowerCase();
        return haystack.includes(key) || this.normalizeIdentityName(node.displayName || node.name).includes(normalizedKey);
      })
      .slice(0, Math.max(1, Number(limit) || 20));
  },

  poiAncestor(state = {}, nodeId = '') {
    const graph = this.ensureGraphState(state);
    let current = this.getNode(state, nodeId);
    for (let guard = 0; guard < 32 && current; guard += 1) {
      if (current.type === 'poi') return current;
      current = current.parentId ? graph.nodesById[current.parentId] : null;
    }
    return null;
  },

  nearbyBfs(state = {}, nodeId = '', depth = 1) {
    const graph = this.ensureGraphState(state);
    const origin = this.poiAncestor(state, nodeId) || this.getNode(state, nodeId);
    if (!origin) return [];
    const maxDepth = Math.max(0, Math.min(4, Number(depth) || 1));
    const edges = Array.isArray(graph.poiGraph.edges) ? graph.poiGraph.edges : [];
    const queue = [{ id: origin.id, depth: 0 }];
    const visited = new Set([origin.id]);
    const rows = [];
    while (queue.length) {
      const current = queue.shift();
      if (current.depth >= maxDepth) continue;
      edges.forEach((edge) => {
        const nextId = edge.fromPoiId === current.id ? edge.toPoiId : edge.toPoiId === current.id ? edge.fromPoiId : '';
        if (!nextId || visited.has(nextId)) return;
        visited.add(nextId);
        const node = graph.nodesById[nextId];
        if (!node) return;
        const row = { node, edge, depth: current.depth + 1 };
        rows.push(row);
        queue.push({ id: nextId, depth: current.depth + 1 });
      });
    }
    return rows;
  },

  edgeIdFor(fromPoiId = '', toPoiId = '') {
    const pair = [String(fromPoiId || ''), String(toPoiId || '')].sort();
    return pair[0] && pair[1] ? `edge_${pair[0]}_${pair[1]}` : '';
  },

  ensureRouteEdge(state = {}, fromRef = '', toRef = '', data = {}) {
    const graph = this.ensureGraphState(state);
    const fromNode = this.poiAncestor(state, fromRef) || this.getNode(state, fromRef);
    const toNode = this.poiAncestor(state, toRef) || this.getNode(state, toRef);
    if (!fromNode?.id || !toNode?.id || fromNode.id === toNode.id) return null;
    const id = data.id || this.edgeIdFor(fromNode.id, toNode.id);
    if (!id) return null;
    const existing = (graph.poiGraph.edges || []).find((edge) => edge.id === id);
    const meters = Number(data.distanceMeters || data.meters || data.lengthMeters);
    let distanceMeters = Number.isFinite(meters) && meters > 0 ? Math.round(meters) : existing?.distanceMeters || null;
    const distanceText = data.distanceText || data.distance || existing?.distanceText || '';
    if (!(distanceMeters > 0) && distanceText) {
      const parsed = window.GameModules.realWorldMapFog?.parseDistanceMeters?.(distanceText);
      if (parsed > 0) distanceMeters = parsed;
    }
    const edge = {
      ...(existing || {}),
      id,
      fromPoiId: fromNode.id,
      toPoiId: toNode.id,
      relation: data.relation || 'route',
      directNeighbor: data.directNeighbor !== false,
      noIntermediateLocations: data.noIntermediateLocations !== false,
      intermediateLocations: Array.isArray(data.intermediateLocations) ? data.intermediateLocations : [],
      distanceMeters,
      distanceText,
      basis: data.basis || data.reason || existing?.basis || '',
      source: data.source || existing?.source || 'location-graph-route',
      updatedAt: data.time || new Date().toISOString(),
    };
    if (existing) Object.assign(existing, edge);
    else graph.poiGraph.edges.push(edge);
    graph.updatedAt = edge.updatedAt;
    return edge;
  },

  isStandardMapNode(state = {}, node = {}) {
    if (!node?.id || node.mapVisible === false) return false;
    if (node.type && node.type !== 'poi') return false;
    return true;
  },

  standardPoiGraph(state = {}) {
    const graph = this.ensureGraphState(state);
    const candidateIds = (Array.isArray(graph.poiGraph.nodes) ? graph.poiGraph.nodes : [])
      .filter((id) => this.isStandardMapNode(state, graph.nodesById?.[id]));
    const candidateIdSet = new Set(candidateIds);
    const routeEdges = (Array.isArray(graph.poiGraph.edges) ? graph.poiGraph.edges : [])
      .filter((edge) => {
        if (!candidateIdSet.has(edge.fromPoiId) || !candidateIdSet.has(edge.toPoiId) || edge.fromPoiId === edge.toPoiId) return false;
        const meters = Number(edge.distanceMeters);
        return meters > 0 || String(edge.distanceText || '').trim();
      });
    const linkedIdSet = new Set(routeEdges.flatMap((edge) => [edge.fromPoiId, edge.toPoiId]));
    const visibleNodeIds = candidateIds.filter((id) => linkedIdSet.has(id));
    const currentGraphNode = this.poiAncestor(state, state.realWorldMap?.mapAnchorId || state.realWorldMap?.currentId)
      || this.getNode(state, state.realWorldMap?.mapAnchorId || state.realWorldMap?.currentId || state.realWorldLocationName);
    // Always surface the current POI even before surround edges exist (dump was empty with orphan home).
    if (currentGraphNode?.id && candidateIdSet.has(currentGraphNode.id) && !visibleNodeIds.includes(currentGraphNode.id)) {
      visibleNodeIds.unshift(currentGraphNode.id);
    }
    const currentId = visibleNodeIds.includes(currentGraphNode?.id) ? currentGraphNode.id : visibleNodeIds[0] || '';
    return {
      currentId,
      nodes: visibleNodeIds.map((id, index) => {
        const node = graph.nodesById[id] || {};
        return {
          id,
          name: node.displayName || node.name || id,
          current: id === currentId,
          visited: Boolean(node.visited || id === currentId),
          revealed: node.known !== false,
          mapVisible: node.mapVisible !== false,
          order: Number(node.order) || index + 1,
        };
      }),
      edges: routeEdges
        .map((edge) => ({
          id: edge.id || this.edgeIdFor(edge.fromPoiId, edge.toPoiId),
          from: edge.fromPoiId,
          to: edge.toPoiId,
          weight: Number(edge.distanceMeters) || null,
          distanceMeters: Number(edge.distanceMeters) || null,
          distanceText: edge.distanceText || '',
        })),
    };
  },

  linkRoutePath(state = {}, refs = [], data = {}) {
    const nodes = (Array.isArray(refs) ? refs : [])
      .map((ref) => (typeof ref === 'object' ? this.getNode(state, ref.nodeId || ref.graphNodeId || ref.id || ref.identityKey || ref.name) : this.getNode(state, ref)))
      .filter(Boolean);
    const edges = [];
    for (let index = 1; index < nodes.length; index += 1) {
      const edge = this.ensureRouteEdge(state, nodes[index - 1].id, nodes[index].id, { ...data, routeIndex: index });
      if (edge) edges.push(edge);
    }
    return edges;
  },

  characterKey(character = 'player-self') {
    if (character && typeof character === 'object') return String(character.characterId || character.playerId || character.id || character.profile?.id || character.profile?.name || character.name || 'player-self').trim();
    return String(character || 'player-self').trim();
  },

  setCharacterCurrentNode(state = {}, character = 'player-self', nodeRef = '', data = {}) {
    const graph = this.ensureGraphState(state);
    const node = this.getNode(state, nodeRef);
    const characterId = this.characterKey(character);
    if (!characterId || !node?.id) return null;
    const row = {
      ...(graph.characterLocations?.[characterId] || {}),
      characterId,
      characterName: data.characterName || character?.name || character?.profile?.name || characterId,
      nodeId: node.id,
      identityKey: node.identityKey || '',
      locationName: node.displayName || node.name || node.id,
      reason: data.reason || '',
      updatedAt: data.time || new Date().toISOString(),
    };
    graph.characterLocations[characterId] = row;
    state.characterSchedules = state.characterSchedules && typeof state.characterSchedules === 'object' ? state.characterSchedules : {};
    const schedule = state.characterSchedules[characterId];
    if (schedule) {
      state.characterSchedules[characterId] = { ...schedule, currentLocation: row.locationName, currentNodeId: row.nodeId, currentLocationIdentityKey: row.identityKey };
    }
    if (characterId === 'player-self' || characterId === state.playerIdentityState?.()?.id) {
      state.realWorldLocationName = row.locationName;
      if (state.realWorldMap) {
        state.realWorldMap.current = row.locationName;
        state.realWorldMap.currentId = node.legacyMapNodeId || node.id;
      }
      const playerState = state.playerIdentityState?.();
      if (playerState?.values && Object.prototype.hasOwnProperty.call(playerState.values, 'current_location')) delete playerState.values.current_location;
    }
    return row;
  },

  getCharacterCurrentNode(state = {}, character = 'player-self') {
    const graph = this.ensureGraphState(state);
    const characterId = this.characterKey(character);
    const recorded = graph.characterLocations?.[characterId];
    const direct = recorded?.nodeId ? this.getNode(state, recorded.nodeId) : null;
    if (direct) return direct;
    const schedule = state.characterSchedules?.[characterId];
    const scheduleNode = schedule ? this.getNode(state, schedule.currentNodeId || schedule.currentLocationIdentityKey || schedule.currentLocation) : null;
    if (scheduleNode) return scheduleNode;
    if (characterId === 'player-self') {
      return this.getNode(state, state.realWorldMap?.currentId || state.realWorldMap?.current || state.realWorldLocationName);
    }
    return null;
  },

  searchByPerson(state = {}, name = '', mode = 'both') {
    const key = this.cleanName(name);
    if (!key) return [];
    const checkOwner = mode === 'owner' || mode === 'both';
    const checkUser = mode === 'user' || mode === 'both';
    return this.allNodes(state).filter((node) => {
      const ownerHit = checkOwner && JSON.stringify(node.ownerRefs || []).includes(key);
      const userHit = checkUser && (node.usageContracts || []).some((contract) => JSON.stringify(contract.userRefs || []).includes(key));
      return ownerHit || userHit;
    });
  },

  searchContracts(state = {}, params = {}) {
    const nodeId = String(params.nodeId || '').trim();
    const personName = this.cleanName(params.personName || params.name || '');
    const status = String(params.status || '').trim();
    return this.allNodes(state).flatMap((node) => (node.usageContracts || []).map((contract) => ({ node, contract })))
      .filter(({ node, contract }) => !nodeId || node.id === nodeId)
      .filter(({ contract }) => !status || contract.status === status || (status === 'debt' && Number(contract.debtAmount) > 0))
      .filter(({ contract }) => !personName || JSON.stringify([contract.ownerRefs, contract.userRefs]).includes(personName));
  },

  authorityPath(state = {}, nodeId = '') {
    const path = this.pathByNodeId(state, nodeId);
    const node = path[path.length - 1] || null;
    return { path, ownerRefs: node?.ownerRefs || [], effectiveAuthorityRef: node?.effectiveAuthorityRef || null };
  },

  ensurePoiFromPayload(state = {}, payload = {}, options = {}) {
    const graph = this.ensureGraphState(state);
    const mapApi = window.GameModules.realWorldMap || {};
    const rawName = mapApi.cleanName ? mapApi.cleanName(payload.name || payload.locationName) : this.cleanName(payload.name || payload.locationName);
    const exteriorName = mapApi.mapExteriorName ? mapApi.mapExteriorName(rawName) : rawName;
    const name = this.cleanName(exteriorName || rawName);
    if (!name || mapApi.isAbstractName?.(name)) return null;
    const parentName = this.cleanName(payload.parentName || payload.parentLocationName || payload.parentLocation || '');
    let parentId = '';
    if (payload.parentId) parentId = this.getNode(state, payload.parentId)?.id || String(payload.parentId || '');
    if (!parentId && parentName) {
      const parent = this.ensurePoiFromPayload(state, { name: parentName, description: `${parentName}，${name} 的上级地点。` }, { ...options, skipProject: true });
      parentId = parent?.id || '';
    }
    const identityKey = payload.identityKey || this.identityKeyFor({ type: 'poi', parentId, name });
    const existing = this.findStrictNode(state, {
      nodeId: payload.nodeId || payload.id,
      identityKey,
      name,
      type: 'poi',
      parentId,
    }) || this.findStrictNode(state, {
      nodeId: payload.nodeId || payload.id,
      identityKey,
      name,
      type: 'poi',
    });
    const id = existing?.id || this.allocateLocationNodeId(state);
    const facts = payload.descriptionFacts || payload.facts || payload.fact || '';
    const description = Array.isArray(facts) ? '' : String(payload.description || payload.summary || facts || '').slice(0, 240);
    const node = {
      ...(graph.nodesById[id] || {}),
      id,
      type: 'poi',
      name,
      displayName: name,
      parentId: parentId || graph.nodesById[id]?.parentId || '',
      legacyMapNodeId: graph.nodesById[id]?.legacyMapNodeId || id,
      legacyAliases: [...new Set([...(graph.nodesById[id]?.legacyAliases || []), this.legacyKey('mapId', id), this.legacyKey('name', name), this.legacyKey('identity', identityKey)].filter(Boolean))],
      identityKey,
      mapVisible: payload.mapVisible !== false,
      known: true,
      source: options.source || payload.source || 'location-graph-facade',
      description: description || graph.nodesById[id]?.description || '',
      descriptionFacts: Array.isArray(facts) ? facts : (graph.nodesById[id]?.descriptionFacts || []),
      ownerRefs: Array.isArray(payload.ownerRefs) ? payload.ownerRefs : (graph.nodesById[id]?.ownerRefs || []),
      usageContracts: Array.isArray(payload.usageContracts) ? payload.usageContracts : (graph.nodesById[id]?.usageContracts || []),
      effectiveAuthorityRef: payload.effectiveAuthorityRef || graph.nodesById[id]?.effectiveAuthorityRef || null,
      geopoliticalStub: Boolean(payload.geopoliticalStub || graph.nodesById[id]?.geopoliticalStub),
      updatedAt: payload.time || new Date().toISOString(),
    };
    graph.nodesById[id] = node;
    node.legacyAliases.forEach((key) => this.rememberAlias(graph, key, id));
    this.rememberAlias(graph, this.legacyKey('name', name), id);
    this.rememberIdentity(graph, node);
    this.rememberSearchNode(graph, node);
    if (!graph.poiGraph.nodes.includes(id)) graph.poiGraph.nodes.push(id);
    if (options.skipProject) return node;
    this.projectLocationGraphToLegacyMap(state);
    const map = state.realWorldMap;
    return (map?.nodes || []).find((item) => item.graphNodeId === id || item.id === id || item.name === name) || node;
  },

  characterStates(state = {}) {
    const storeApi = window.GameModules.characterStateStore;
    if (storeApi?.listLive) {
      const live = storeApi.listLive(state);
      if (live.length) return live;
    }
    return Object.values(state.rpgStates || {}).filter((item) => item && typeof item === 'object');
  },

  refMatchesCharacter(ref = {}, character = {}) {
    const profile = character.profile || character;
    const refId = String(ref.id || ref.characterId || '').trim();
    const refName = String(ref.name || ref.characterName || '').trim();
    return Boolean(
      (refId && (refId === character.id || refId === profile.id))
      || (refName && (refName === profile.name || refName === character.name))
    );
  },

  findCharacterByRef(state = {}, ref = {}) {
    return this.characterStates(state).find((character) => this.refMatchesCharacter(ref, character)) || null;
  },

  characterMoney(character = null) {
    if (!character) return null;
    const profile = character.profile || character;
    const value = profile.money ?? profile.cash ?? profile.balance ?? profile.wealthAmount ?? character.money ?? character.cash ?? character.balance;
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : null;
  },

  setCharacterMoney(character = null, amount = 0) {
    if (!character) return;
    const profile = character.profile || character;
    const next = Math.round((Number(amount) || 0) * 100) / 100;
    if ('money' in profile || !('wealthAmount' in profile)) profile.money = next;
    else profile.wealthAmount = next;
  },

  pathDisplay(state = {}, nodeId = '') {
    return this.pathByNodeId(state, nodeId).map((node) => node.displayName || node.name || node.id).join('/');
  },

  rebuildCharacterPropertyIndex(state = {}) {
    const graph = this.ensureGraphState(state);
    const characters = this.characterStates(state);
    characters.forEach((character) => {
      character.properties = character.properties && typeof character.properties === 'object' ? character.properties : {};
      character.properties.realWorldProperties = { owned: [], using: [] };
    });
    Object.values(graph.nodesById || {}).forEach((node) => {
      characters.forEach((character) => {
        const owned = (node.ownerRefs || []).some((ref) => this.refMatchesCharacter(ref, character));
        if (owned) {
          const incomingContracts = (node.usageContracts || []).filter((contract) => (
            contract.status !== 'ended'
            && (contract.ownerRefs || node.ownerRefs || []).some((ref) => this.refMatchesCharacter(ref, character))
          ));
          character.properties.realWorldProperties.owned.push({
            nodeId: node.id,
            name: node.displayName || node.name || node.id,
            path: this.pathDisplay(state, node.id),
            monthlyRentIncome: incomingContracts.reduce((sum, contract) => sum + (Number(contract.monthlyRent) || 0), 0),
            users: incomingContracts.flatMap((contract) => contract.userRefs || []).map((ref) => ref.name || ref.id).filter(Boolean),
          });
        }
        (node.usageContracts || []).forEach((contract) => {
          if (contract.status === 'ended') return;
          const using = (contract.userRefs || []).some((ref) => this.refMatchesCharacter(ref, character));
          if (!using) return;
          character.properties.realWorldProperties.using.push({
            nodeId: node.id,
            name: node.displayName || node.name || node.id,
            path: this.pathDisplay(state, node.id),
            monthlyRentCost: Number(contract.monthlyRent) || 0,
            debtAmount: Number(contract.debtAmount) || 0,
            owners: (contract.ownerRefs || node.ownerRefs || []).map((ref) => ref.name || ref.id).filter(Boolean),
          });
        });
      });
    });
    return Object.fromEntries(characters.map((character) => [character.id || character.profile?.name || character.name, character]));
  },

  settleUsageContracts(state = {}, dateValue = new Date()) {
    const graph = this.ensureGraphState(state);
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    const safeDate = Number.isFinite(date.getTime()) ? date : new Date();
    const monthKey = `${safeDate.getFullYear()}-${String(safeDate.getMonth() + 1).padStart(2, '0')}`;
    const settled = [];
    const debts = [];
    Object.values(graph.nodesById || {}).forEach((node) => {
      (node.usageContracts || []).forEach((contract) => {
        if (contract.status === 'ended' || contract.billingCycle && contract.billingCycle !== 'monthly') return;
        contract.debtAmount = Number(contract.debtAmount) || 0;
        if (contract.debtAmount > 0) this.ensureDebtEvent(state, node, contract, safeDate);
        if (contract.lastSettledMonth === monthKey) return;
        const rent = Number(contract.monthlyRent) || 0;
        if (rent <= 0) {
          contract.lastSettledMonth = monthKey;
          contract.settlementHistory = [{ month: monthKey, amount: 0, status: 'free-use' }, ...(contract.settlementHistory || [])].slice(0, 24);
          settled.push({ nodeId: node.id, contractId: contract.id || '', amount: 0, status: 'free-use' });
          return;
        }
        const user = (contract.userRefs || []).map((ref) => this.findCharacterByRef(state, ref)).find(Boolean) || null;
        const owner = (contract.ownerRefs || node.ownerRefs || []).map((ref) => this.findCharacterByRef(state, ref)).find(Boolean) || null;
        const userMoney = this.characterMoney(user);
        if (user && userMoney !== null && userMoney < rent) {
          contract.debtAmount += rent;
          contract.lastDebtMonth = monthKey;
          contract.settlementHistory = [{ month: monthKey, amount: rent, status: 'debt' }, ...(contract.settlementHistory || [])].slice(0, 24);
          this.ensureDebtEvent(state, node, contract, this.addDays(safeDate, 1));
          debts.push({ nodeId: node.id, contractId: contract.id || '', amount: rent, debtAmount: contract.debtAmount });
          return;
        }
        if (user && userMoney !== null) this.setCharacterMoney(user, userMoney - rent);
        const ownerMoney = this.characterMoney(owner);
        if (owner && ownerMoney !== null) this.setCharacterMoney(owner, ownerMoney + rent);
        contract.lastSettledMonth = monthKey;
        contract.settlementHistory = [{ month: monthKey, amount: rent, status: 'settled' }, ...(contract.settlementHistory || [])].slice(0, 24);
        settled.push({ nodeId: node.id, contractId: contract.id || '', amount: rent, status: 'settled' });
      });
    });
    this.rebuildCharacterPropertyIndex(state);
    return { settled, debts };
  },

  addDays(date = new Date(), days = 0) {
    const next = new Date(date.getTime());
    next.setDate(next.getDate() + Number(days || 0));
    return next;
  },

  ensureDebtEvent(state = {}, node = {}, contract = {}, date = new Date()) {
    state.calendarState = state.calendarState && typeof state.calendarState === 'object' ? state.calendarState : { events: [] };
    state.calendarState.events = Array.isArray(state.calendarState.events) ? state.calendarState.events : [];
    const dayKey = date.toISOString().slice(0, 10);
    const id = `rent-arrears:${node.id}:${contract.id || 'contract'}:${dayKey}`;
    if (state.calendarState.events.some((event) => event.id === id)) return null;
    const event = {
      id,
      type: 'rent-arrears',
      title: '催债事件',
      name: '催债事件',
      time: dayKey,
      nodeId: node.id,
      contractId: contract.id || '',
      debtAmount: Number(contract.debtAmount) || 0,
      detail: `${node.displayName || node.name || node.id} 租约欠款 ${Number(contract.debtAmount) || 0}，需要持续催收。`,
    };
    state.calendarState.events.unshift(event);
    return event;
  },

  projectLocationGraphToLegacyMap(state = {}) {
    const graph = this.ensureGraphState(state);
    const map = state.realWorldMap && typeof state.realWorldMap === 'object'
      ? state.realWorldMap
      : (state.realWorldMap = { currentId: '', current: '', nodes: [], edges: [] });
    map.nodes = Array.isArray(map.nodes) ? map.nodes : [];
    map.edges = Array.isArray(map.edges) ? map.edges : [];
    const mapNodeIdFor = (node) => node?.legacyMapNodeId || node?.id || '';
    (graph.poiGraph.nodes || []).forEach((nodeId) => {
      const node = graph.nodesById[nodeId];
      if (!node) return;
      const mapNodeId = mapNodeIdFor(node);
      const displayName = node.displayName || node.name || node.id;
      const normalizedDisplayName = this.normalizeIdentityName(displayName);
      this.rememberAlias(graph, this.legacyKey('mapId', mapNodeId), node.id);
      this.rememberAlias(graph, this.legacyKey('name', displayName), node.id);
      let mapNode = map.nodes.find((item) => (
        item.id === mapNodeId
        || item.id === node.id
        || item.graphNodeId === node.id
        || item.identityKey && item.identityKey === node.identityKey
        || this.normalizeIdentityName(item.displayName || item.name) === normalizedDisplayName
      ));
      if (!mapNode) {
        mapNode = { id: mapNodeId, name: displayName, mapVisible: node.mapVisible !== false };
        map.nodes.push(mapNode);
      }
      mapNode.id = mapNode.id || mapNodeId;
      mapNode.name = displayName || mapNode.name || node.id;
      mapNode.parentId = node.parentId ? mapNodeIdFor(graph.nodesById[node.parentId]) : '';
      mapNode.mapVisible = node.mapVisible !== false;
      mapNode.description = node.description || mapNode.description || '';
      mapNode.descriptionFacts = Array.isArray(node.descriptionFacts) ? node.descriptionFacts : (mapNode.descriptionFacts || []);
      mapNode.identityKey = node.identityKey || mapNode.identityKey || '';
      mapNode.ownerRefs = Array.isArray(node.ownerRefs) ? node.ownerRefs : (mapNode.ownerRefs || []);
      mapNode.usageContracts = Array.isArray(node.usageContracts) ? node.usageContracts : (mapNode.usageContracts || []);
      mapNode.effectiveAuthorityRef = node.effectiveAuthorityRef || mapNode.effectiveAuthorityRef || null;
      mapNode.graphNodeId = node.id;
      const interiorLayout = this.projectInteriorLayout(graph, node.id);
      if (interiorLayout.floors.length || interiorLayout.zones.length) mapNode.interiorLayout = interiorLayout;
    });
    (graph.poiGraph.edges || []).forEach((edge) => {
      const fromNode = graph.nodesById[edge.fromPoiId];
      const toNode = graph.nodesById[edge.toPoiId];
      const from = mapNodeIdFor(fromNode);
      const to = mapNodeIdFor(toNode);
      if (!from || !to || from === to) return;
      const exists = map.edges.some((item) => (
        (item.from === from && item.to === to) || (item.from === to && item.to === from)
      ));
      if (exists) return;
      map.edges.push({
        from,
        to,
        distanceMeters: edge.distanceMeters || null,
        distanceText: edge.distanceText || '',
        basis: edge.basis || '',
        relation: edge.relation || 'direct-neighbor',
      });
    });
    this.compactProjectedMapDisplayNodes(state, map);
    return map;
  },

  compactProjectedMapDisplayNodes(state = {}, map = {}) {
    if (!Array.isArray(map.nodes) || map.nodes.length < 2) return map;
    const mapApi = window.GameModules.realWorldMap || {};
    const isDisplayCandidate = (node = {}) => {
      if (!node?.id || !node?.name || node.mapVisible === false) return false;
      if (mapApi.isInteriorLocationName?.(node.name)) return false;
      return true;
    };
    const normalized = (node = {}) => this.normalizeIdentityName(node.displayName || node.name || '');
    const normalizedFull = (node = {}) => String(node.displayName || node.name || '').replace(/[\n\r|]+/g, ' ').replace(/\s+/g, '').trim().toLowerCase();
    const sameDisplayPlace = (a = {}, b = {}) => {
      if (!isDisplayCandidate(a) || !isDisplayCandidate(b)) return false;
      if (a.graphNodeId && b.graphNodeId && a.graphNodeId === b.graphNodeId) return true;
      if (a.identityKey && b.identityKey && a.identityKey === b.identityKey) return true;
      const ak = normalizedFull(a);
      const bk = normalizedFull(b);
      if (!ak || !bk) return false;
      if (ak === bk) return true;
      const minLength = Math.min(ak.length, bk.length);
      return minLength >= 4 && (ak.endsWith(bk) || bk.endsWith(ak));
    };
    const floorCount = (node = {}) => Array.isArray(node?.interiorLayout?.floors) ? node.interiorLayout.floors.length : 0;
    const chooseKeep = (a = {}, b = {}) => {
      const an = normalized(a);
      const bn = normalized(b);
      if (an.length !== bn.length) return an.length < bn.length ? a : b;
      if (floorCount(a) !== floorCount(b)) return floorCount(a) > floorCount(b) ? a : b;
      if (a.graphNodeId && !b.graphNodeId) return a;
      if (b.graphNodeId && !a.graphNodeId) return b;
      return a;
    };
    const mergeNode = (target = {}, source = {}) => {
      target.graphNodeId = target.graphNodeId || source.graphNodeId || '';
      target.identityKey = target.identityKey || source.identityKey || '';
      target.parentId = target.parentId || source.parentId || '';
      target.description = target.description || source.description || '';
      target.descriptionFacts = Array.isArray(target.descriptionFacts) && target.descriptionFacts.length
        ? target.descriptionFacts
        : (Array.isArray(source.descriptionFacts) ? source.descriptionFacts : []);
      target.ownerRefs = Array.isArray(target.ownerRefs) && target.ownerRefs.length ? target.ownerRefs : (source.ownerRefs || []);
      target.usageContracts = Array.isArray(target.usageContracts) && target.usageContracts.length ? target.usageContracts : (source.usageContracts || []);
      target.effectiveAuthorityRef = target.effectiveAuthorityRef || source.effectiveAuthorityRef || null;
      target.revealed = Boolean(target.revealed || source.revealed);
      target.visited = Boolean(target.visited || source.visited);
      target.exteriorRingUnlocked = Boolean(target.exteriorRingUnlocked || source.exteriorRingUnlocked);
      if (!floorCount(target) && floorCount(source)) target.interiorLayout = source.interiorLayout;
      return target;
    };
    const remap = {};
    const removed = new Set();
    for (let i = 0; i < map.nodes.length; i += 1) {
      const a = map.nodes[i];
      if (removed.has(a?.id)) continue;
      for (let j = i + 1; j < map.nodes.length; j += 1) {
        const b = map.nodes[j];
        if (removed.has(b?.id) || !sameDisplayPlace(a, b)) continue;
        const keep = chooseKeep(a, b);
        const drop = keep === a ? b : a;
        mergeNode(keep, drop);
        remap[drop.id] = keep.id;
        removed.add(drop.id);
        if (drop === a) break;
      }
    }
    if (!removed.size) return map;
    map.nodes = map.nodes.filter((node) => !removed.has(node.id));
    const remapId = (id = '') => remap[id] || id;
    ['currentId', 'mapAnchorId', 'infoNodeId', 'interiorNodeId'].forEach((key) => {
      if (map[key]) map[key] = remapId(map[key]);
    });
    map.edges = (Array.isArray(map.edges) ? map.edges : []).map((edge) => ({
      ...edge,
      from: remapId(edge.from),
      to: remapId(edge.to),
    })).filter((edge, index, edges) => {
      if (!edge.from || !edge.to || edge.from === edge.to) return false;
      const key = [edge.from, edge.to].sort().join('|');
      return edges.findIndex((item) => [item.from, item.to].sort().join('|') === key) === index;
    });
    return map;
  },

  projectInteriorLayout(graph = {}, poiId = '') {
    const childrenOf = (parentId, type = '') => Object.values(graph.nodesById || {})
      .filter((node) => node.parentId === parentId && (!type || node.type === type))
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name || '').localeCompare(String(b.name || '')));
    const floors = childrenOf(poiId, 'floor').map((floor, floorIndex) => ({
      id: floor.id,
      nodeId: floor.id,
      name: floor.displayName || floor.name || `第${floorIndex + 1}层`,
      ownerRefs: floor.ownerRefs || [],
      usageContracts: floor.usageContracts || [],
      rooms: childrenOf(floor.id, 'room').map((room, roomIndex) => ({
        id: room.id,
        nodeId: room.id,
        name: room.displayName || room.name || `房间${roomIndex + 1}`,
        number: room.roomCode || room.number || '',
        ownerRefs: room.ownerRefs || [],
        usageContracts: room.usageContracts || [],
        layout: this.projectRoomLayout(graph, room.id),
      })),
    }));
    const zones = childrenOf(poiId, 'zone').map((zone, index) => this.projectZoneRecord(graph, zone, index));
    return { floors, zones };
  },

  projectRoomLayout(graph = {}, roomId = '') {
    const zones = this.projectLayoutChildren(graph, roomId)
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name || '').localeCompare(String(b.name || '')));
    const shapes = zones.map((zone, index) => this.projectZoneShape(graph, zone, index));
    return { width: 480, height: 320, shapes };
  },

  projectLayoutChildren(graph = {}, parentId = '') {
    return Object.values(graph.nodesById || {})
      .filter((node) => node.parentId === parentId && (node.type === 'zone' || node.type === 'room'));
  },

  projectZoneRecord(graph = {}, zone = {}, index = 0) {
    return {
      id: zone.id,
      nodeId: zone.id,
      name: zone.displayName || zone.name || `区域${index + 1}`,
      ownerRefs: zone.ownerRefs || [],
      usageContracts: zone.usageContracts || [],
    };
  },

  projectZoneShape(graph = {}, zone = {}, index = 0) {
    const objects = Object.values(graph.nodesById || {})
      .filter((node) => node.parentId === zone.id && node.type === 'object')
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name || '').localeCompare(String(b.name || '')))
      .map((object, objectIndex) => this.projectObjectRecord(graph, object, objectIndex));
    const children = this.projectLayoutChildren(graph, zone.id)
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name || '').localeCompare(String(b.name || '')));
    const column = index % 2;
    const row = Math.floor(index / 2);
    const shape = {
      id: zone.id,
      nodeId: zone.id,
      label: zone.displayName || zone.name || `功能区${index + 1}`,
      type: 'rect',
      nodeType: zone.type === 'room' ? 'room' : 'zone',
      x: Number(zone.x) || 24 + column * 224,
      y: Number(zone.y) || 24 + row * 132,
      w: Number(zone.w) || 200,
      h: Number(zone.h) || 112,
      ownerRefs: zone.ownerRefs || [],
      usageContracts: zone.usageContracts || [],
      objects,
    };
    if (children.length) {
      shape.detailLayout = {
        width: 480,
        height: 320,
        source: 'location-graph-nested',
        shapes: children.map((child, childIndex) => this.projectZoneShape(graph, child, childIndex)),
      };
    }
    return shape;
  },

  projectObjectRecord(graph = {}, object = {}, index = 0) {
    const contents = Object.values(graph.nodesById || {})
      .filter((node) => node.parentId === object.id && node.type === 'container-item')
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name || '').localeCompare(String(b.name || '')))
      .map((node) => node.displayName || node.name || node.id)
      .filter(Boolean);
    return {
      id: object.id,
      nodeId: object.id,
      name: object.displayName || object.name || `摆件${index + 1}`,
      x: Number(object.x) || 24 + (index % 3) * 56,
      y: Number(object.y) || 24 + Math.floor(index / 3) * 42,
      w: Number(object.w) || 48,
      h: Number(object.h) || 32,
      ownerRefs: object.ownerRefs || [],
      usageContracts: object.usageContracts || [],
      containerContents: contents,
    };
  },
};
