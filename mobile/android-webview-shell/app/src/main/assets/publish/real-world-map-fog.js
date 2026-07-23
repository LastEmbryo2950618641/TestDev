/**

 * 电子地图迷雾：已访问建筑物 + 其一圈邻域可见；首次抵达且无同级邻点时 AI 解锁周围。

 * 地图最小颗粒度 = 建筑物；周边解锁只处理外部相邻 POI，不生成室内布局。

 */

window.GameModules = window.GameModules || {};



window.GameModules.realWorldMapFog = {

  mapApi() {

    return window.GameModules.realWorldMap;

  },

  debugMode(state = {}) {

    return state?.realWorldMapDebugMode !== false && state?.config?.realWorldMapDebug !== false;

  },

  debugConsoleMode(state = {}) {

    if (state?.realWorldMapDebugConsole === true || state?.config?.realWorldMapDebugConsole === true) return true;
    try {
      return window.localStorage?.getItem?.('realWorldMapDebugConsole') === '1';
    } catch (err) {
      return false;
    }

  },

  rawMapState(map = {}) {

    if (!map || typeof map !== 'object') return map;
    try {
      return window.Alpine?.raw ? window.Alpine.raw(map) : map;
    } catch (err) {
      return map;
    }

  },

  surroundUnlockDebug(state = {}, event = '', detail = {}) {

    const row = {
      time: new Date().toISOString(),
      event,
      ...detail,
    };

    if (state && typeof state === 'object') {
      if (!Array.isArray(state.realWorldMapSurroundUnlockDebugLog)) state.realWorldMapSurroundUnlockDebugLog = [];
      state.realWorldMapSurroundUnlockDebugLog.push(row);
      if (state.realWorldMapSurroundUnlockDebugLog.length > 120) {
        state.realWorldMapSurroundUnlockDebugLog.splice(0, state.realWorldMapSurroundUnlockDebugLog.length - 120);
      }
    }

    if (this.debugConsoleMode(state)) {
      try {
        console.log('[电子地图周围解锁Debug]', JSON.stringify(row));
      } catch (error) {
        console.log('[电子地图周围解锁Debug]', row);
      }
    }

    return row;

  },

  summarizeInteriorLayout(layout = {}) {

    const floors = Array.isArray(layout?.floors) ? layout.floors : [];
    const zones = Array.isArray(layout?.zones) ? layout.zones : [];
    let rooms = 0;
    let shapes = 0;
    let slotObjectGroups = 0;
    let slotObjects = 0;
    let containerContentItems = 0;
    let ownerRefs = Array.isArray(layout?.ownerRefs) ? layout.ownerRefs.length : 0;
    let usageContracts = Array.isArray(layout?.usageContracts) ? layout.usageContracts.length : 0;

    floors.forEach((floor) => {
      ownerRefs += Array.isArray(floor?.ownerRefs) ? floor.ownerRefs.length : 0;
      usageContracts += Array.isArray(floor?.usageContracts) ? floor.usageContracts.length : 0;
      (Array.isArray(floor?.rooms) ? floor.rooms : []).forEach((room) => {
        rooms += 1;
        ownerRefs += Array.isArray(room?.ownerRefs) ? room.ownerRefs.length : 0;
        usageContracts += Array.isArray(room?.usageContracts) ? room.usageContracts.length : 0;
        shapes += Array.isArray(room?.layout?.shapes) ? room.layout.shapes.length : 0;
        const slotMap = room?.slotObjects && typeof room.slotObjects === 'object' ? room.slotObjects : {};
        Object.values(slotMap).forEach((items) => {
          slotObjectGroups += 1;
          (Array.isArray(items) ? items : []).forEach((item) => {
            slotObjects += 1;
            containerContentItems += Array.isArray(item?.containerContents) ? item.containerContents.length : 0;
          });
        });
        const contentMap = room?.slotObjectContents && typeof room.slotObjectContents === 'object' ? room.slotObjectContents : {};
        Object.values(contentMap).forEach((items) => {
          containerContentItems += Array.isArray(items) ? items.length : 0;
        });
      });
    });

    return {
      floors: floors.length,
      rooms,
      zones: zones.length,
      shapes,
      slotObjectGroups,
      slotObjects,
      containerContentItems,
      ownerRefs,
      usageContracts,
    };

  },

  summarizeUnlockRawPayload(raw = {}) {

    const patch = raw?.patch && typeof raw.patch === 'object' ? raw.patch : {};
    return {
      responseMode: String(raw?.responseMode || raw?.mode || raw?.updateMode || ''),
      topLevelKeys: raw && typeof raw === 'object' ? Object.keys(raw).slice(0, 30) : [],
      patchKeys: patch && typeof patch === 'object' ? Object.keys(patch).slice(0, 30) : [],
      currentNode: String(raw?.currentNode || raw?.current || raw?.['当前节点'] || '').slice(0, 120),
      locationInfoCount: this.normalizeLocationInfo(raw?.locationInfo || raw?.facts || raw?.['地点信息']).length,
      factionInfoCount: this.normalizeFactionInfo(raw?.factions || raw?.faction || raw?.['势力']).length,
      characterLocationCount: (() => {
        try { return this.normalizeCharacterLocations(raw, { strict: false }).length; }
        catch (_) { return 0; }
      })(),
      hasInteriorLayout: Boolean(raw?.interiorLayout),
      hasSurroundLocations: Array.isArray(raw?.surroundLocations),
      hasSimpleSurroundLocations: Boolean(raw?.surroundingLocations || raw?.nearbyLocations || raw?.['周围地点']),
      surroundLocationCount: this.normalizeSurroundLocationRows(raw).length,
    };

  },

  normalizeNodeFlags(node = {}) {

    if (!node) return node;

    if (typeof node.visited !== 'boolean') node.visited = false;

    if (typeof node.revealed !== 'boolean') node.revealed = false;

    if (typeof node.mapVisible !== 'boolean') node.mapVisible = !this.mapApi().isInteriorLocationName(node.name);

    if (typeof node.exteriorRingUnlocked !== 'boolean') node.exteriorRingUnlocked = false;

    if (!node.interiorLayout || typeof node.interiorLayout !== 'object') {

      node.interiorLayout = { summary: '', zones: [] };

    }

    if (!Array.isArray(node.interiorLayout.zones)) node.interiorLayout.zones = [];

    return node;

  },



  resolveAnchor(map, node) {

    return this.mapApi().resolveExteriorAnchorNode(map, node) || node;

  },



  exteriorSiblings(map, node) {

    if (!node?.parentId) {

      return (map.nodes || []).filter((item) => item.id !== node.id && !item.parentId && this.mapApi().isMapDisplayNode(item, map));

    }

    return this.mapApi().childrenOf(map, node.parentId).filter((item) => item.id !== node.id && this.mapApi().isMapDisplayNode(item, map));

  },



  oneRingNeighborIds(map, nodeId) {

    const mapMod = this.mapApi();

    const node = (map.nodes || []).find((item) => item.id === nodeId);

    if (!node) return [];

    const anchor = this.resolveAnchor(map, node);

    const ids = new Set([anchor.id]);

    if (anchor.parentId) ids.add(anchor.parentId);

    this.exteriorSiblings(map, anchor).forEach((sib) => ids.add(sib.id));

    const parent = (map.nodes || []).find((item) => item.id === anchor.parentId);

    if (parent) this.exteriorSiblings(map, parent).forEach((sib) => ids.add(sib.id));

    return [...ids].filter((id) => {

      const item = (map.nodes || []).find((nodeItem) => nodeItem.id === id);

      return item && mapMod.isMapDisplayNode(item, map);

    });

  },



  syncRevealed(map) {

    const mapMod = this.mapApi();

    const revealed = new Set();

    (map.nodes || []).forEach((node) => {

      this.normalizeNodeFlags(node);

      if (!mapMod.isMapDisplayNode(node, map)) return;

      if (node.visited) {

        revealed.add(node.id);

        this.oneRingNeighborIds(map, node.id).forEach((id) => revealed.add(id));

      }

    });

    (map.nodes || []).forEach((node) => {

      const anchor = this.resolveAnchor(map, node);

      if (node.visited && mapMod.isMapDisplayNode(anchor, map)) revealed.add(anchor.id);

      node.revealed = revealed.has(node.id);

    });

    map.revealedIds = [...revealed];

    return map;

  },



  markVisited(map, nodeId) {

    const mapMod = this.mapApi();

    const node = (map.nodes || []).find((item) => item.id === nodeId);

    if (!node) return { node: null, firstVisit: false, anchor: null };

    this.normalizeNodeFlags(node);

    const anchor = this.resolveAnchor(map, node);

    const firstVisit = !anchor.visited;

    node.visited = true;

    node.revealed = true;

    if (anchor.id !== node.id) {

      anchor.visited = true;

      anchor.revealed = true;

    }

    map.mapAnchorId = anchor.id;

    this.syncRevealed(map);

    return { node, anchor, firstVisit };

  },



  visibleNodes(map) {

    this.syncRevealed(map);

    const mapMod = this.mapApi();

    return (map.nodes || []).filter((node) => node.revealed && mapMod.isMapDisplayNode(node, map));

  },



  shouldUnlockSurroundings(map, anchor) {

    if (!anchor?.visited) return false;

    if (anchor.exteriorRingUnlocked) return false;

    if (this.exteriorSiblings(map, anchor).length > 0) return false;

    return true;

  },


  shouldReviewKnownLocationPatch(result = {}) {
    const text = [
      result.narration,
      result.locationDescription,
      result.status,
      result.quest,
      result.actionText,
    ].map((item) => String(item || '')).join('\n').slice(0, 2400);
    return /(放|放置|放进|放在|放到|摆上|拿|取走|取出|移动|挪|整理|收拾|打开|关闭|挂|贴|藏|塞|桌|床|柜|架|墙|地板|窗|门|包|箱|抽屉|物品|摆件|容器|户型|布局|新房间|陌生房间|进入.{0,24}(房间|卧室|客厅|厨房|卫生间|楼层)|查看.{0,24}(柜|桌|床|墙|地板|窗|门|房间|卧室|摆件|物品)|观察.{0,24}(房间|卧室|客厅|厨房|卫生间|摆件|物品))/u.test(text);
  },

  hasKnownInteriorFloors(anchor = {}) {
    return Array.isArray(anchor?.interiorLayout?.floors) && anchor.interiorLayout.floors.length > 0;
  },

  shouldBootstrapMissingInterior(state = {}, result = {}, sceneNode = {}, anchor = {}) {
    if (!anchor || this.hasKnownInteriorFloors(anchor)) return false;
    const mapMod = this.mapApi();
    const sceneName = String(sceneNode?.name || '');
    if (mapMod?.isInteriorLocationName?.(sceneName)) return true;
    const text = [
      sceneName,
      state.realWorldInput,
      result.actionText,
      result.narration,
      result.locationName,
      result.locationDescription,
      result.status,
    ].map((item) => String(item || '')).join('\n').slice(0, 3200);
    return /(房间|卧室|客厅|厨房|卫生间|书房|阳台|玄关|衣帽间|楼层|室内|户型|布局|床|柜|桌|墙|地板|窗|门|摆件|物品|进入.{0,24}(房间|卧室|室内)|查看.{0,24}(建筑内部|房间|卧室|室内|户型|布局)|观察.{0,24}(房间|卧室|室内|户型|布局))/u.test(text);
  },



  bootstrapHome(map) {

    if (!map) return map;

    const mapMod = this.mapApi();

    mapMod.compactInteriorNodes(map);

    (map.nodes || []).forEach((node) => this.normalizeNodeFlags(node));

    const scene = mapMod.currentNode(map) || map.nodes[0];

    const home = scene ? this.resolveAnchor(map, scene) : null;

    if (home && !map.nodes.some((node) => mapMod.isMapDisplayNode(node, map) && node.visited)) {

      home.visited = true;

      map.mapAnchorId = home.id;

      this.syncRevealed(map);

    }

    return map;

  },



  async afterLocationUpdate(state, result = {}) {

    const mapMod = this.mapApi();

    const map = mapMod.ensure(state, window.GameModules.currentLocationField?.roleProfile?.(state) || {});

    const node = mapMod.currentNode(map);

    if (!node) return { unlocked: [], interior: null };



    const { firstVisit, anchor } = this.markVisited(map, node.id);
    if (firstVisit && anchor) window.GameModules.orgTerritory?.bumpOrgExposureOnMapVisit?.(state, map, anchor);
    const needInteriorBootstrap = this.shouldBootstrapMissingInterior(state, result, node, anchor);
    const needUnlock = firstVisit || this.shouldUnlockSurroundings(map, anchor) || needInteriorBootstrap;
    const needPatchReview = !needUnlock && anchor?.exteriorRingUnlocked && this.shouldReviewKnownLocationPatch(result);
    this.surroundUnlockDebug(state, 'after-location-update-decision', {
      sceneNodeId: node?.id || '',
      sceneNodeName: node?.name || '',
      anchorId: anchor?.id || '',
      anchorGraphNodeId: anchor?.graphNodeId || '',
      anchorName: anchor?.name || '',
      firstVisit,
      exteriorRingUnlocked: Boolean(anchor?.exteriorRingUnlocked),
      hasKnownInteriorFloors: this.hasKnownInteriorFloors(anchor),
      needInteriorBootstrap,
      needUnlock,
      needPatchReview,
      mode: needUnlock ? 'full' : (needPatchReview ? 'patch' : 'skip'),
      existingInteriorSummary: this.summarizeInteriorLayout(anchor?.interiorLayout || {}),
      narrationLength: String(result?.narration || '').length,
      actionTextLength: String(state?.realWorldInput || result?.actionText || '').length,
    });

    if (!needUnlock && !needPatchReview) {
      this.surroundUnlockDebug(state, 'after-location-update-skip', {
        reason: 'no-first-visit-no-surround-unlock-no-known-location-patch',
        anchorId: anchor?.id || '',
        anchorName: anchor?.name || '',
      });
      window.GameModules.orgTerritory?.ensureMapControls?.(map, state);
      return { unlocked: [], interior: anchor?.interiorLayout || null };
    }



    try {

      const payload = await this.generateSurroundUnlock(state, map, node, anchor, result, needUnlock ? 'full' : 'patch');

      const unlocked = await this.applySurroundUnlock(state, map, anchor, node, payload);

      this.syncRevealed(map);

      window.GameModules.orgTerritory?.ensureMapControls?.(map, state);

      map.lastText = mapMod.render(map);
      state.realWorldMap = this.rawMapState({ ...map, _boundStore: state });
      state.refreshRealWorldMapJsonDump?.();
      const refreshedInteriorNode = map.interiorNodeId
        ? (state.realWorldMap.nodes || []).find((item) => item.id === map.interiorNodeId || item.name === map.interiorNodeId)
        : null;
      this.surroundUnlockDebug(state, 'after-location-update-map-refreshed', {
        mapAnchorId: state.realWorldMap.mapAnchorId || '',
        interiorNodeId: state.realWorldMap.interiorNodeId || '',
        interiorNodeName: refreshedInteriorNode?.name || '',
        interiorNodeFloors: Array.isArray(refreshedInteriorNode?.interiorLayout?.floors)
          ? refreshedInteriorNode.interiorLayout.floors.length
          : 0,
        anchorInteriorSummary: this.summarizeInteriorLayout(anchor?.interiorLayout || {}),
      });

      return { unlocked, interior: anchor.interiorLayout || null };

    } catch (err) {

      this.surroundUnlockDebug(state, 'after-location-update-failed', {
        anchorId: anchor?.id || '',
        anchorName: anchor?.name || '',
        message: err?.message || String(err || ''),
        stack: String(err?.stack || '').slice(0, 1200),
      });

      console.warn('电子地图周围解锁失败:', err.message);

      return { unlocked: [], interior: anchor?.interiorLayout || null };

    }

  },



  buildSurroundUnlockContext(state, map, anchor, sceneNode = {}) {
    const graphApi = window.GameModules.realWorldLocationGraph;
    const graph = graphApi?.ensureGraphState?.(state) || null;
    const graphNode = graphApi?.getNode?.(state, anchor?.graphNodeId || anchor?.id || anchor?.name) || null;
    const nodeId = graphNode?.id || anchor?.graphNodeId || anchor?.id || '';
    const trimText = (value, max = 160) => String(value || '').trim().slice(0, max);
    const ownerRefs = (value) => Array.isArray(value) ? value.slice(0, 6).map((ref) => ({
      type: trimText(ref?.type, 24),
      id: trimText(ref?.id, 64),
      name: trimText(ref?.name, 80),
      role: trimText(ref?.role, 40),
    })).filter((ref) => ref.type || ref.id || ref.name) : [];
    const contracts = (value) => Array.isArray(value) ? value.slice(0, 6).map((contract) => ({
      id: trimText(contract?.id, 64),
      type: trimText(contract?.type, 40),
      status: trimText(contract?.status, 32),
      billingCycle: trimText(contract?.billingCycle, 24),
      monthlyRent: Number(contract?.monthlyRent) || 0,
      currency: trimText(contract?.currency, 12),
      debtAmount: Number(contract?.debtAmount) || 0,
      basis: trimText(contract?.basis, 120),
      ownerRefs: ownerRefs(contract?.ownerRefs),
      userRefs: ownerRefs(contract?.userRefs),
    })) : [];
    const authority = (value) => value && typeof value === 'object' ? {
      type: trimText(value.type, 24),
      id: trimText(value.id, 64),
      name: trimText(value.name, 80),
      reason: trimText(value.reason, 120),
    } : null;
    const compactObject = (object = {}) => ({
      id: trimText(object.id || object.nodeId, 64),
      name: trimText(object.name || object.label, 80),
      x: Number(object.x) || 0,
      y: Number(object.y) || 0,
      w: Number(object.w) || 0,
      h: Number(object.h) || 0,
      ownerRefs: ownerRefs(object.ownerRefs),
      usageContracts: contracts(object.usageContracts),
      containerContents: (Array.isArray(object.containerContents || object.contents || object.containerItems)
        ? (object.containerContents || object.contents || object.containerItems)
        : []).slice(0, 16).map((item) => (typeof item === 'string' ? trimText(item, 60) : {
        id: trimText(item?.id || item?.nodeId || item?.tempRef, 64),
        name: trimText(item?.name || item?.label, 80),
        ownerRefs: ownerRefs(item?.ownerRefs),
      })).filter(Boolean),
    });
    const compactShape = (shape = {}, depth = 0) => ({
      id: trimText(shape.id || shape.nodeId, 64),
      nodeId: trimText(shape.nodeId, 64),
      type: trimText(shape.type || 'rect', 16),
      nodeType: trimText(shape.nodeType, 24),
      label: trimText(shape.label || shape.name, 80),
      x: Number(shape.x) || 0,
      y: Number(shape.y) || 0,
      w: Number(shape.w) || 0,
      h: Number(shape.h) || 0,
      ownerRefs: ownerRefs(shape.ownerRefs),
      usageContracts: contracts(shape.usageContracts),
      objects: (Array.isArray(shape.objects) ? shape.objects : []).slice(0, 16).map(compactObject),
      detailLayout: depth < 2 && Array.isArray(shape.detailLayout?.shapes)
        ? {
          width: Number(shape.detailLayout.width) || 480,
          height: Number(shape.detailLayout.height) || 320,
          shapes: shape.detailLayout.shapes.slice(0, 16).map((child) => compactShape(child, depth + 1)),
        }
        : null,
    });
    const compactSlotObjects = (slotObjects = {}) => Object.fromEntries(Object.entries(slotObjects || {}).slice(0, 24)
      .map(([slot, objects]) => [trimText(slot, 64), (Array.isArray(objects) ? objects : [objects]).slice(0, 16).map(compactObject)]));
    const compactInterior = (layout = {}) => ({
      summary: trimText(layout.summary || layout.overview, 180),
      zones: (Array.isArray(layout.zones) ? layout.zones : []).slice(0, 16).map((zone) => ({
        id: trimText(zone.id || zone.nodeId, 64),
        nodeId: trimText(zone.nodeId, 64),
        name: trimText(zone.name || zone.label, 80),
        kind: trimText(zone.kind || zone.type, 40),
        position: trimText(zone.position || zone.pos, 20),
        description: trimText(zone.description || zone.detail, 120),
        ownerRefs: ownerRefs(zone.ownerRefs),
        usageContracts: contracts(zone.usageContracts),
      })),
      floors: (Array.isArray(layout.floors) ? layout.floors : []).slice(0, 10).map((floor) => ({
        id: trimText(floor.id || floor.nodeId, 64),
        nodeId: trimText(floor.nodeId, 64),
        name: trimText(floor.name || floor.label, 80),
        ownerRefs: ownerRefs(floor.ownerRefs),
        usageContracts: contracts(floor.usageContracts),
        rooms: (Array.isArray(floor.rooms) ? floor.rooms : []).slice(0, 18).map((room) => ({
          id: trimText(room.id || room.nodeId, 64),
          nodeId: trimText(room.nodeId, 64),
          number: trimText(room.number || room.roomCode, 40),
          name: trimText(room.name || room.label, 80),
          residents: (Array.isArray(room.residents) ? room.residents : []).slice(0, 12).map((item) => trimText(item, 60)).filter(Boolean),
          ownerRefs: ownerRefs(room.ownerRefs),
          usageContracts: contracts(room.usageContracts),
          slotAssignments: room.slotAssignments && typeof room.slotAssignments === 'object' ? room.slotAssignments : {},
          slotObjects: compactSlotObjects(room.slotObjects),
          slotObjectContents: room.slotObjectContents && typeof room.slotObjectContents === 'object' ? room.slotObjectContents : {},
          layout: room.layout && typeof room.layout === 'object' ? {
            width: Number(room.layout.width) || 480,
            height: Number(room.layout.height) || 320,
            shapes: (Array.isArray(room.layout.shapes) ? room.layout.shapes : []).slice(0, 24).map((shape) => compactShape(shape, 0)),
          } : null,
        })),
      })),
    });
    const compactNode = (node = {}) => node ? ({
      id: trimText(node.id, 64),
      graphNodeId: trimText(node.graphNodeId, 64),
      identityKey: trimText(node.identityKey, 140),
      name: trimText(node.displayName || node.name, 100),
      type: trimText(node.type || 'poi', 24),
      parentId: trimText(node.parentId, 64),
      mapVisible: node.mapVisible !== false,
      visited: Boolean(node.visited),
      revealed: Boolean(node.revealed),
      exteriorRingUnlocked: Boolean(node.exteriorRingUnlocked),
      description: trimText(node.description, 220),
      descriptionFacts: (Array.isArray(node.descriptionFacts) ? node.descriptionFacts : []).slice(0, 8).map((item) => trimText(item, 120)).filter(Boolean),
      ownerRefs: ownerRefs(node.ownerRefs),
      usageContracts: contracts(node.usageContracts),
      effectiveAuthorityRef: authority(node.effectiveAuthorityRef),
    }) : null;
    const mapEdges = (Array.isArray(map?.edges) ? map.edges : []).filter((edge) => (
      edge.from === anchor?.id || edge.to === anchor?.id || edge.fromName === anchor?.name || edge.toName === anchor?.name
    )).slice(0, 20).map((edge) => ({
      from: trimText(edge.fromName || edge.from, 100),
      to: trimText(edge.toName || edge.to, 100),
      distanceMeters: Number(edge.distanceMeters) || null,
      distanceText: trimText(edge.distanceText || edge.distance, 40),
      basis: trimText(edge.basis, 120),
      relation: trimText(edge.relation || 'direct-neighbor', 40),
    }));
    const graphNeighbors = nodeId && graphApi?.nearbyBfs
      ? graphApi.nearbyBfs(state, nodeId, 1).slice(0, 20).map((row) => ({
        node: compactNode(row.node),
        depth: row.depth || 1,
        edge: {
          distanceMeters: Number(row.edge?.distanceMeters) || null,
          distanceText: trimText(row.edge?.distanceText, 40),
          basis: trimText(row.edge?.basis, 120),
          relation: trimText(row.edge?.relation || 'direct-neighbor', 40),
          directNeighbor: row.edge?.directNeighbor !== false,
          noIntermediateLocations: row.edge?.noIntermediateLocations !== false,
        },
      }))
      : [];
    const parentId = anchor?.parentId || graphNode?.parentId || '';
    const sameParentPois = (Array.isArray(map?.nodes) ? map.nodes : [])
      .filter((node) => node && node.id !== anchor?.id && node.parentId === parentId && node.mapVisible !== false)
      .slice(0, 24)
      .map(compactNode);
    return {
      currentPoi: compactNode({ ...(graphNode || {}), ...(anchor || {}), id: nodeId || anchor?.id || graphNode?.id }),
      currentScene: compactNode(sceneNode),
      path: nodeId && graphApi?.pathByNodeId ? graphApi.pathByNodeId(state, nodeId).map(compactNode).filter(Boolean) : [],
      parent: compactNode((map.nodes || []).find((node) => node.id === anchor?.parentId) || (graph?.nodesById || {})[parentId]),
      knownDirectNeighbors: graphNeighbors,
      sameParentPois,
      existingRouteEdges: mapEdges,
      interiorLayout: compactInterior(anchor?.interiorLayout || {}),
    };
  },



  async generateSurroundUnlock(state, map, sceneNode, anchor, result = {}, mode = 'full') {

    const parent = (map.nodes || []).find((item) => item.id === anchor.parentId);

    const sceneName = sceneNode?.name || '';

    const anchorName = anchor?.name || sceneName;

    const indoor = sceneName && sceneName !== anchorName ? sceneName : '无';

    const contextJson = this.buildSurroundUnlockContext(state, map, anchor, sceneNode);
    const contextText = JSON.stringify(contextJson, null, 2).slice(0, 16000);
    const appearingCharacters = this.appearingCharacterNames(state, result);
    const locationSnapshots = this.appearingCharacterLocationSnapshots(state, appearingCharacters, result);

    this.surroundUnlockDebug(state, 'generate-start', {
      mode: mode === 'patch' ? 'patch' : 'full',
      sceneNodeId: sceneNode?.id || '',
      sceneNodeName: sceneName,
      anchorId: anchor?.id || '',
      anchorGraphNodeId: anchor?.graphNodeId || '',
      anchorName,
      parentId: parent?.id || '',
      parentName: parent?.name || '',
      indoor,
      exteriorRingUnlocked: Boolean(anchor?.exteriorRingUnlocked),
      contextLength: contextText.length,
      contextInteriorSummary: this.summarizeInteriorLayout(contextJson?.interiorLayout || {}),
      knownDirectNeighborCount: Array.isArray(contextJson?.knownDirectNeighbors) ? contextJson.knownDirectNeighbors.length : 0,
      sameParentPoiCount: Array.isArray(contextJson?.sameParentPois) ? contextJson.sameParentPois.length : 0,
      existingRouteEdgeCount: Array.isArray(contextJson?.existingRouteEdges) ? contextJson.existingRouteEdges.length : 0,
      appearingCharacterCount: appearingCharacters.length,
      appearingCharacters: appearingCharacters.slice(0, 12),
      locationNeedUpdateCount: locationSnapshots.filter((item) => item.needUpdate).length,
    });

    const prompt = await window.GameModules.renderPrompt('real-world-map-surround-unlock', {

      手机时间: `${state.phoneDateText?.() || ''} ${state.phoneTimeText?.() || ''}`.trim(),

      地图锚点: anchorName,

      返回模式: mode === 'patch' ? 'patch' : 'full',

      玩家所在室内: indoor,

      当前地点: anchorName,

      上级地点: parent?.name || '无',

      现实地图: map.lastText || this.mapApi().render(map),

      地点说明: this.locationFactsText(map),

      当前地点完整JSON: contextText,

      本轮正文: String(result.narration || '').slice(0, 1200),

      玩家行动: String(state.realWorldInput || result.actionText || '').slice(0, 200),

      出场人物: appearingCharacters.length ? appearingCharacters.join('、') : '无',

      出场人物地点快照: this.formatAppearingCharacterLocationSnapshots(locationSnapshots),

    });

    this.surroundUnlockDebug(state, 'prompt-ready', {
      mode: mode === 'patch' ? 'patch' : 'full',
      promptLength: String(prompt || '').length,
      promptForbidsInteriorLayout: String(prompt || '').includes('禁止返回 `interiorLayout`'),
      promptHasSurroundFactionRule: String(prompt || '').includes('每项必须写 `距离`、`地点名`、`势力`'),
      promptHasCharacterLocationField: String(prompt || '').includes('出场人物位置'),
      promptHasProfileLocationFormat: String(prompt || '').includes('势力·层级1·层级2·地点·地点内位置'),
      promptPreview: String(prompt || '').slice(0, 1200),
    });

    return window.GameModules.jsonUtils.generateJsonWithRetry({

      source: 'real-world-map-surround-unlock',

      sourceTitle: '现实Stage4滑动结算｜电子地图周围解锁',

      promptId: 'real-world-map-surround-unlock',

      model: state.modelId,

      store: state,

      useRealWorldKvCache: true,

      outputLimitKind: 'stage4',

      timeoutMs: 60000,

      prompt,

      format: prompt,

      max: 2,

      parse: (text) => {
        const rawText = String(text || '');
        this.surroundUnlockDebug(state, 'raw-response', {
          mode: mode === 'patch' ? 'patch' : 'full',
          length: rawText.length,
          preview: rawText.slice(0, 1800),
        });
        const parsed = window.GameModules.jsonUtils.parseLoose(text);
        this.surroundUnlockDebug(state, 'parsed-response', this.summarizeUnlockRawPayload(parsed));
        return parsed;
      },

      validate: (raw) => {
        this.surroundUnlockDebug(state, 'validate-start', this.summarizeUnlockRawPayload(raw));
        const payload = this.validateUnlockPayload(raw, anchor, map, mode, { requiredLocationNames: locationSnapshots.filter((item) => item.needUpdate).map((item) => item.name) });
        this.surroundUnlockDebug(state, 'validate-done', {
          responseMode: payload.responseMode,
          noChange: Boolean(payload.noChange),
          locationInfoCount: Array.isArray(payload.locationInfo) ? payload.locationInfo.length : 0,
          factionInfoCount: Array.isArray(payload.factionInfo) ? payload.factionInfo.length : 0,
          characterLocationCount: Array.isArray(payload.characterLocations) ? payload.characterLocations.length : 0,
          surroundLocationCount: Array.isArray(payload.surroundLocations) ? payload.surroundLocations.length : 0,
          surroundLocationNames: (payload.surroundLocations || []).map((item) => item.name).slice(0, 12),
          surroundLocationFactions: (payload.surroundLocations || []).map((item) => item.faction || '').slice(0, 12),
        });
        return payload;
      },

    });

  },



  locationFactsText(map) {

    const mapMod = this.mapApi();

    return (map.nodes || []).filter((node) => node.revealed && mapMod.isMapDisplayNode(node, map)).map((node) => {

      const infoFacts = window.GameModules.realWorldMapFacts?.normalizeFacts?.(node, node.description, '') || [];
      const facts = infoFacts.map((fact, index) => window.GameModules.ui.realWorld.mapInfoViewHelpers.factText.call(this, fact, index)).filter(Boolean).join('');

      return `${node.name}：${facts || node.description || '暂无说明'}`;

    }).join('\n') || '暂无地点说明。';

  },



  validateUnlockPayload(raw = {}, anchor = {}, map = {}, expectedMode = 'full', options = {}) {

    const rawObj = raw && typeof raw === 'object' ? raw : {};
    const responseMode = 'neighbors';

    const surroundLocations = this.normalizeSurroundLocationRows(rawObj)

      .slice(0, 6)

      .map((item) => {
        try { return this.validateSurroundLocation(item, anchor, map); }
        catch (err) { console.warn('[real-world-map] dropped invalid surround location:', err.message); return null; }
      })

      .filter(Boolean);

    const locationInfo = this.normalizeLocationInfo(rawObj.locationInfo || rawObj.facts || rawObj['地点信息']);
    const factionInfo = this.normalizeFactionInfo(rawObj.factions || rawObj.faction || rawObj['势力']);
    const characterLocations = this.normalizeCharacterLocations(rawObj);
    const requiredLocationNames = Array.isArray(options.requiredLocationNames) ? options.requiredLocationNames : [];
    if (requiredLocationNames.length) {
      const returned = new Set(characterLocations.map((item) => item.name));
      const missing = requiredLocationNames.filter((name) => !returned.has(name));
      if (missing.length) {
        throw new Error(`出场人物位置缺少需更新人物：${missing.join('、')}`);
      }
    }
    const noChange = rawObj.noChange === true
      || (!surroundLocations.length && !locationInfo.length && !factionInfo.length && !characterLocations.length);

    return {
      responseMode,
      noChange,
      currentNode: String(rawObj.currentNode || rawObj.current || rawObj['当前节点'] || anchor?.name || '').trim().slice(0, 120),
      locationInfo,
      factionInfo,
      characterLocations,
      surroundLocations,
      debugShape: this.summarizeUnlockRawPayload(rawObj),
    };

  },

  appearingCharacterNames(state = {}, result = {}) {
    const names = [];
    const seen = new Set();
    const push = (value) => {
      const name = String(value || '').trim();
      if (!name || seen.has(name)) return;
      seen.add(name);
      names.push(name);
    };
    (Array.isArray(result?.appearedCharacters) ? result.appearedCharacters : []).forEach((item) => {
      if (typeof item === 'string') push(item);
      else push(item?.name || item?.characterName || item?.profile?.name);
    });
    (Array.isArray(result?.solidifiableCharacters) ? result.solidifiableCharacters : []).forEach((item) => {
      if (typeof item === 'string') push(item);
      else push(item?.name || item?.characterName || item?.profile?.name);
    });
    const shared = state?.sharedControlState?.();
    if (shared) push(shared.profile?.name || shared.name);
    const playerName = state?.playerIdentityState?.()?.profile?.name
      || state?.playerIdentityState?.()?.name
      || state?.character?.name
      || '';
    if (playerName) push(playerName);
    return names.slice(0, 16);
  },

  resolveAppearingCharacter(state = {}, name = '') {
    const clean = String(name || '').trim();
    if (!clean) return null;
    const graphApi = window.GameModules.realWorldLocationGraph;
    const byRef = graphApi?.findCharacterByRef?.(state, { name: clean });
    if (byRef) return byRef;
    const player = state?.playerIdentityState?.();
    if (player && (player.profile?.name === clean || player.name === clean || clean === '玩家')) return player;
    const shared = state?.sharedControlState?.();
    if (shared && (shared.profile?.name === clean || shared.name === clean)) return shared;
    return Object.values(state?.rpgStates || {}).find((item) => item?.profile?.name === clean || item?.name === clean) || null;
  },

  appearingCharacterLocationSnapshots(state = {}, names = [], result = {}) {
    const locField = window.GameModules.currentLocationField;
    const sceneHint = String(result?.locationName || state?.realWorldLocationName || state?.realWorldMap?.current || '').trim();
    return (Array.isArray(names) ? names : []).map((name) => {
      const character = this.resolveAppearingCharacter(state, name);
      const recorded = locField?.fromCharacterState?.(character)
        || String(state?.characterSchedules?.[character?.id || '']?.currentLocation || '').trim()
        || '';
      const valid = Boolean(locField?.isValidProfileFormat?.(recorded));
      const needUpdate = !valid;
      return {
        name,
        characterId: character?.id || '',
        recorded: recorded || '（空）',
        valid,
        needUpdate,
        sceneHint,
      };
    });
  },

  formatAppearingCharacterLocationSnapshots(snapshots = []) {
    const rows = Array.isArray(snapshots) ? snapshots : [];
    if (!rows.length) return '无';
    return rows.map((item) => (
      `${item.name}｜当前记录：${item.recorded}｜格式：${item.valid ? '合规' : '不合规'}｜需更新：${item.needUpdate ? '是' : '否'}｜场景提示：${item.sceneHint || '无'}`
    )).join('\n');
  },

  normalizeCharacterLocations(rawObj = {}, options = {}) {
    const strict = options.strict !== false;
    const locField = window.GameModules.currentLocationField;
    const source = rawObj.characterLocations
      || rawObj.participantLocations
      || rawObj['出场人物位置']
      || rawObj['角色位置']
      || rawObj['人物位置']
      || [];
    const rows = Array.isArray(source)
      ? source
      : (source && typeof source === 'object'
        ? Object.entries(source).map(([key, value]) => {
          if (value && typeof value === 'object') {
            return {
              ...value,
              name: value.name || value.characterName || value['姓名'] || key,
              location: value.location || value.currentLocation || value['当前位置'] || value['地点'],
            };
          }
          return { name: key, location: value };
        })
        : []);
    return rows
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const name = String(item.name || item.characterName || item['姓名'] || '').trim().slice(0, 32);
        const location = locField?.normalize?.(
          item.location
          || item.currentLocation
          || item.locationName
          || item['当前位置']
          || item['地点']
          || '',
        ) || String(
          item.location
          || item.currentLocation
          || item.locationName
          || item['当前位置']
          || item['地点']
          || '',
        ).trim().slice(0, 160);
        if (!name || !location) return null;
        if (!locField?.isValidProfileFormat?.(location)) {
          if (!strict) return null;
          throw new Error(`出场人物位置格式不合规（需势力·层级1·层级2·地点·地点内位置）：${name} => ${location}`);
        }
        const mapNodeName = locField.mapNodeName(location);
        const interiorPosition = locField.interiorPosition(location);
        return { name, location, mapNodeName, interiorPosition };
      })
      .filter(Boolean)
      .slice(0, 16);
  },

  normalizeSurroundLocationFaction(raw = {}) {
    const direct = raw.faction
      || raw.factionChain
      || raw.authority
      || raw.control
      || raw['势力']
      || raw.highestControl
      || raw['最高控制'];
    if (Array.isArray(direct)) return this.normalizeFactionInfo(direct)[0] || '';
    if (direct && typeof direct === 'object') return this.normalizeFactionInfo([direct])[0] || '';
    const text = String(direct || '').trim();
    if (text) return this.normalizeFactionInfo([text])[0] || '';
    // Tolerate malformed model output that put the faction as a third unlabeled string-like value.
    const knownKeys = new Set([
      'name', 'locationName', '地点名', 'distance', 'distanceText', '距离', 'distanceMeters', 'meters',
      'parentName', 'parentLocationName', 'description', 'descriptionFacts', 'info', '地点信息',
      'directNeighbor', 'isDirectNeighbor', 'adjacent', 'noIntermediateLocations', 'noIntermediate',
      'intermediateFree', 'intermediateLocations', 'basis', 'faction', 'factionChain', 'authority',
      'control', '势力', 'highestControl', '最高控制',
    ]);
    const extras = Object.entries(raw || {})
      .filter(([key, value]) => !knownKeys.has(key) && typeof value === 'string' && String(value).includes('·'))
      .map(([, value]) => String(value || '').trim())
      .filter(Boolean);
    return extras.length ? (this.normalizeFactionInfo(extras)[0] || '') : '';
  },

  normalizeSurroundLocationRows(rawObj = {}) {
    const source = rawObj.surroundLocations || rawObj.surroundingLocations || rawObj.nearbyLocations || rawObj['周围地点'] || [];
    if (Array.isArray(source)) return source;
    if (!source || typeof source !== 'object') return [];
    return Object.entries(source).map(([key, value]) => {
      if (value && typeof value === 'object') return { ...value, name: value.name || value.locationName || value['地点名'] || key };
      return { name: key, distanceText: String(value || '').trim() };
    });
  },

  normalizeLocationInfo(value = []) {
    const rows = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(/\n+/u) : []);
    return rows
      .map((item, index) => String(item || '').trim().replace(/^\d+[.、]\s*/u, `${index + 1}. `))
      .filter(Boolean)
      .slice(0, 8)
      .map((item, index) => /^\d+[.、]/u.test(item) ? item.slice(0, 160) : `${index + 1}. ${item.slice(0, 150)}`);
  },

  normalizeFactionInfo(value = []) {
    const rows = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(/[\n,，;；]+/u) : []);
    return rows
      .map((item) => {
        if (item && typeof item === 'object') {
          return [
            item.name || item.factionName || item['势力名'],
            item.level1 || item.tier1 || item['势力层级1'],
            item.level2 || item.tier2 || item['势力层级2'],
          ].map((part) => String(part || '').trim()).filter(Boolean).join('·');
        }
        return String(item || '').trim();
      })
      .map((item) => item.split('·').map((part) => part.trim()).filter(Boolean).slice(0, 3).join('·'))
      .filter(Boolean)
      .slice(0, 8);
  },

  normalizeInterior(value = {}, nodeName = '') {

    const summary = String(value.summary || value.overview || `${nodeName}的内部空间分布。`).slice(0, 160);

    const interiorMod = window.GameModules.realWorldMapInterior;

    const floors = this.normalizeInteriorFloors(value.floors || []);

    const zones = (Array.isArray(value.zones) ? value.zones : [])

      .slice(0, 12)

      .map((zone, index) => ({

        id: String(zone.id || `zone_${index + 1}`),

        name: String(zone.name || `区域${index + 1}`).slice(0, 16),

        kind: String(zone.kind || zone.type || '空间').slice(0, 12),

        position: this.normalizeZonePosition(zone.position || zone.pos || zone.direction),

        description: String(zone.description || zone.detail || '').slice(0, 80),

        ownerRefs: this.normalizeOwnershipRefs(zone.ownerRefs),

        usageContracts: this.normalizeUsageContracts(zone.usageContracts),

      }))

      .filter((zone) => zone.name && zone.description);

    if (!floors.length && !zones.length) return { summary, zones: [], floors: [] };

    return { summary, zones, floors };

  },

  normalizeInteriorFloors(floorsRaw = []) {

    const interiorMod = window.GameModules.realWorldMapInterior;

    return (Array.isArray(floorsRaw) ? floorsRaw : []).slice(0, 8).map((floor, floorIndex) => {

      const rooms = (Array.isArray(floor.rooms) ? floor.rooms : []).slice(0, 12).map((room, roomIndex) => {

        const label = String(room.number || room.roomNumber || room.name || room.roomName || room.label || room.title || room.id || '').trim();
        const explicitNumber = String(room.number || room.roomNumber || '').trim();
        const number = explicitNumber || (label.match(/(\d{2,4})(?:号|室|房)?/u)?.[1] || '');
        const name = String(room.name || room.roomName || room.label || room.title || number || label).trim();

        const ownerRefs = this.normalizeOwnershipRefs(room.ownerRefs);
        const usageContracts = this.normalizeUsageContracts(room.usageContracts);
        const explicitResidents = interiorMod?.sanitizeResidents?.(room.residents || room.occupants) || [];
        const residents = explicitResidents.length
          ? explicitResidents
          : (interiorMod?.contractUserNames?.(usageContracts) || this.contractUserNames(usageContracts));

        const slotAssignments = room.slotAssignments && typeof room.slotAssignments === 'object' ? room.slotAssignments : {};
        const slotObjects = interiorMod?.normalizeSlotObjects?.(room.slotObjects || room.layoutObjects || room.objectsBySlot || room.shapeObjects) || {};
        const slotObjectContents = interiorMod?.normalizeSlotObjectContents?.(room.slotObjectContents || room.containerContentsBySlot || room.objectContentsBySlot || room.contentsBySlot) || {};
        const layout = interiorMod?.normalizeRoomLayout?.(room.layout || room.roomLayout || room.floorPlan, { slotObjects, slotObjectContents }) || null;

        return {

          id: String(room.id || `room_${number || name || roomIndex + 1}`),

          number,

          name: name.slice(0, 16),

          residents,

          ownerRefs,

          usageContracts,

          slotAssignments,

          slotObjects,

          slotObjectContents,

          layout,

        };

      }).filter((room) => room.id || room.number || room.name || room.residents?.length);

      return {

        id: String(floor.id || `floor_${floorIndex + 1}`),

        name: String(floor.name || floor.label || `第${floorIndex + 1}楼`).slice(0, 12),

        ownerRefs: this.normalizeOwnershipRefs(floor.ownerRefs),

        usageContracts: this.normalizeUsageContracts(floor.usageContracts),

        rooms,

      };

    }).filter((floor) => String(floor.id || floor.name || '').trim() || floor.rooms.length);

  },



  normalizeZonePosition(value = '') {

    const text = String(value || '中').trim();

    if (/北/u.test(text)) return '北';

    if (/南/u.test(text)) return '南';

    if (/东/u.test(text)) return '东';

    if (/西/u.test(text)) return '西';

    return '中';

  },

  normalizeOwnershipRefs(value = []) {
    return (Array.isArray(value) ? value : []).slice(0, 12).map((ref) => ({
      type: String(ref?.type || '').trim().slice(0, 24),
      id: String(ref?.id || ref?.nodeId || '').trim().slice(0, 64),
      name: String(ref?.name || ref?.displayName || ref?.label || '').trim().slice(0, 80),
      role: String(ref?.role || '').trim().slice(0, 40),
    })).filter((ref) => ref.type || ref.id || ref.name);
  },

  normalizeUsageContracts(value = []) {
    return (Array.isArray(value) ? value : []).slice(0, 12).map((contract) => {
      const ownerRefs = this.normalizeOwnershipRefs(contract?.ownerRefs);
      const userRefs = this.normalizeOwnershipRefs(contract?.userRefs);
      return {
        id: String(contract?.id || '').trim().slice(0, 64),
        type: String(contract?.type || contract?.kind || 'usage').trim().slice(0, 40),
        status: String(contract?.status || 'active').trim().slice(0, 32),
        billingCycle: String(contract?.billingCycle || contract?.cycle || 'monthly').trim().slice(0, 24),
        monthlyRent: Number(contract?.monthlyRent) || 0,
        currency: String(contract?.currency || 'CNY').trim().slice(0, 12),
        debtAmount: Number(contract?.debtAmount) || 0,
        basis: String(contract?.basis || contract?.description || '').trim().slice(0, 120),
        ownerRefs,
        userRefs,
      };
    }).filter((contract) => (
      contract.id
      || contract.ownerRefs.length
      || contract.userRefs.length
      || contract.basis
      || contract.monthlyRent
      || contract.debtAmount
    ));
  },

  contractUserNames(usageContracts = []) {
    const names = new Set();
    (Array.isArray(usageContracts) ? usageContracts : []).forEach((contract) => {
      if (contract?.status === 'ended') return;
      (Array.isArray(contract?.userRefs) ? contract.userRefs : []).forEach((ref) => {
        const name = String(ref?.name || ref?.displayName || ref?.id || '').trim();
        if (name) names.add(name);
      });
    });
    return [...names];
  },

  mergeOwnershipRefs(existing = [], incoming = []) {
    const keyOf = (ref = {}, index = 0) => String(ref.id || ref.name || ref.type || `ref_${index}`).trim();
    const map = new Map();
    this.normalizeOwnershipRefs(existing).forEach((ref, index) => {
      const key = keyOf(ref, index);
      if (key) map.set(key, ref);
    });
    this.normalizeOwnershipRefs(incoming).forEach((ref, index) => {
      const key = keyOf(ref, index);
      if (!key) return;
      map.set(key, { ...(map.get(key) || {}), ...ref });
    });
    return [...map.values()];
  },

  mergeUsageContracts(existing = [], incoming = []) {
    const keyOf = (contract = {}, index = 0) => {
      if (contract.id) return contract.id;
      const users = this.normalizeOwnershipRefs(contract.userRefs).map((ref) => ref.id || ref.name).join('|');
      const owners = this.normalizeOwnershipRefs(contract.ownerRefs).map((ref) => ref.id || ref.name).join('|');
      return `${contract.type || 'usage'}:${owners}->${users}` || `contract_${index}`;
    };
    const map = new Map();
    this.normalizeUsageContracts(existing).forEach((contract, index) => {
      const key = keyOf(contract, index);
      if (key) map.set(key, contract);
    });
    this.normalizeUsageContracts(incoming).forEach((contract, index) => {
      const key = keyOf(contract, index);
      if (!key) return;
      const prev = map.get(key) || {};
      map.set(key, {
        ...prev,
        ...contract,
        ownerRefs: this.mergeOwnershipRefs(prev.ownerRefs, contract.ownerRefs),
        userRefs: this.mergeOwnershipRefs(prev.userRefs, contract.userRefs),
      });
    });
    return [...map.values()];
  },

  mergeObjectList(existing = [], incoming = []) {
    const keyOf = (item = {}, index = 0) => String((item && typeof item === 'object' ? item.id || item.nodeId || item.name || item.label : item) || `object_${index}`).trim();
    const map = new Map();
    (Array.isArray(existing) ? existing : []).forEach((item, index) => {
      const key = keyOf(item, index);
      if (key) map.set(key, item);
    });
    (Array.isArray(incoming) ? incoming : []).forEach((item, index) => {
      const key = keyOf(item, index);
      if (!key) return;
      const prev = map.get(key);
      if (prev && typeof prev === 'object' && item && typeof item === 'object') {
        map.set(key, {
          ...prev,
          ...item,
          containerContents: Array.isArray(item.containerContents)
            ? item.containerContents
            : (Array.isArray(prev.containerContents) ? prev.containerContents : []),
        });
      } else {
        map.set(key, item);
      }
    });
    return [...map.values()];
  },


  mergeSlotObjects(existing = {}, incoming = {}) {
    const output = { ...(existing && typeof existing === 'object' ? existing : {}) };
    Object.entries(incoming && typeof incoming === 'object' ? incoming : {}).forEach(([slot, objects]) => {
      const key = String(slot || '').trim();
      if (!key) return;
      output[key] = this.mergeObjectList(output[key], Array.isArray(objects) ? objects : [objects]);
    });
    return output;
  },


  mergeLayoutShapes(existing = [], incoming = []) {
    const keyOf = (shape = {}, index = 0) => String(shape.id || shape.nodeId || shape.label || shape.name || `shape_${index}`).trim();
    const map = new Map();
    (Array.isArray(existing) ? existing : []).forEach((shape, index) => {
      const key = keyOf(shape, index);
      if (key) map.set(key, shape);
    });
    (Array.isArray(incoming) ? incoming : []).forEach((shape, index) => {
      const key = keyOf(shape, index);
      if (!key) return;
      const prev = map.get(key);
      if (prev && typeof prev === 'object' && shape && typeof shape === 'object') {
        const merged = {
          ...prev,
          ...shape,
          objects: this.mergeObjectList(prev.objects, shape.objects),
        };
        if (prev.detailLayout || shape.detailLayout) merged.detailLayout = this.mergeRoomLayout(prev.detailLayout, shape.detailLayout);
        map.set(key, merged);
      } else {
        map.set(key, shape);
      }
    });
    return [...map.values()];
  },


  mergeRoomLayout(existing = null, incoming = null) {
    if (!incoming || typeof incoming !== 'object') return existing || null;
    if (!existing || typeof existing !== 'object') return incoming;
    return {
      ...existing,
      ...incoming,
      width: Number(incoming.width) || Number(existing.width) || 480,
      height: Number(incoming.height) || Number(existing.height) || 320,
      shapes: this.mergeLayoutShapes(existing.shapes, incoming.shapes),
    };
  },

  syncSlotObjectsIntoLayout(layout = null, slotObjects = {}) {
    if (!layout || typeof layout !== 'object' || !Array.isArray(layout.shapes)) return layout || null;
    const source = slotObjects && typeof slotObjects === 'object' ? slotObjects : {};
    const patchObjectsByName = new Map();
    Object.values(source).forEach((objects) => {
      (Array.isArray(objects) ? objects : []).forEach((object) => {
        const name = String(object?.name || object?.label || '').trim();
        if (name) patchObjectsByName.set(name, object);
      });
    });
    return {
      ...layout,
      shapes: layout.shapes.map((shape) => {
        const slot = String(shape?.slot || shape?.id || '').trim();
        const objects = slot ? source[slot] : null;
        const existingObjects = Array.isArray(shape?.objects) ? shape.objects : [];
        const matchingObjects = existingObjects
          .map((object) => patchObjectsByName.get(String(object?.name || object?.label || object || '').trim()))
          .filter(Boolean);
        if ((!Array.isArray(objects) || !objects.length) && !matchingObjects.length) return shape;
        return {
          ...shape,
          objects: this.mergeObjectList(existingObjects, [
            ...(Array.isArray(objects) ? objects : []),
            ...matchingObjects,
          ]),
        };
      }),
    };
  },


  mergeInteriorRoom(existing = {}, incoming = {}) {
    const slotObjects = this.mergeSlotObjects(existing.slotObjects, incoming.slotObjects);
    const layout = this.syncSlotObjectsIntoLayout(this.mergeRoomLayout(existing.layout, incoming.layout), slotObjects);
    return {
      ...existing,
      ...incoming,
      residents: Array.isArray(incoming.residents) && incoming.residents.length ? incoming.residents : (existing.residents || []),
      ownerRefs: this.mergeOwnershipRefs(existing.ownerRefs, incoming.ownerRefs),
      usageContracts: this.mergeUsageContracts(existing.usageContracts, incoming.usageContracts),
      slotAssignments: {
        ...(existing.slotAssignments && typeof existing.slotAssignments === 'object' ? existing.slotAssignments : {}),
        ...(incoming.slotAssignments && typeof incoming.slotAssignments === 'object' ? incoming.slotAssignments : {}),
      },
      slotObjects,
      slotObjectContents: {
        ...(existing.slotObjectContents && typeof existing.slotObjectContents === 'object' ? existing.slotObjectContents : {}),
        ...(incoming.slotObjectContents && typeof incoming.slotObjectContents === 'object' ? incoming.slotObjectContents : {}),
      },
      layout,
    };
  },


  mergeInteriorLayout(existing = {}, incoming = {}) {

    const current = existing && typeof existing === 'object' ? existing : {};

    const next = incoming && typeof incoming === 'object' ? incoming : {};

    const parseChineseNumber = (text = '') => {
      const raw = String(text || '').trim();
      if (!raw) return '';
      if (/^\d+$/u.test(raw)) return raw;
      const digits = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
      if (raw === '十') return '10';
      const tenIndex = raw.indexOf('十');
      if (tenIndex >= 0) {
        const left = raw.slice(0, tenIndex);
        const right = raw.slice(tenIndex + 1);
        const tens = left ? digits[left] : 1;
        const ones = right ? digits[right] : 0;
        if (Number.isFinite(tens) && Number.isFinite(ones)) return String(tens * 10 + ones);
      }
      return Object.prototype.hasOwnProperty.call(digits, raw) ? String(digits[raw]) : '';
    };

    const floorNumberKey = (floor = {}) => {
      const idText = String(floor.id || '').trim();
      const explicitText = [floor.number, floor.name, floor.label].map((item) => String(item || '')).join(' ');
      const digit = idText.match(/^floor[_-]?(\d+)$/iu)?.[1]
        || explicitText.match(/(?:第)?(\d+)(?:层|樓|楼|f)\b/iu)?.[1]
        || explicitText.match(/^\s*(\d+)\s*$/u)?.[1];
      if (digit) return `floor-number:${Number(digit)}`;
      const chinese = explicitText.match(/第([零一二两三四五六七八九十]+)[层樓楼]/u)?.[1];
      const parsed = parseChineseNumber(chinese);
      return parsed ? `floor-number:${Number(parsed)}` : '';
    };

    const roomNumberKey = (room = {}) => {
      const idText = String(room.id || '').trim();
      const explicitText = [room.number, room.name, room.label].map((item) => String(item || '')).join(' ');
      const digit = explicitText.match(/(\d{2,4})(?:号|室|房)?/iu)?.[1]
        || idText.match(/^room[_-]?(\d{2,4})$/iu)?.[1];
      return digit ? `room-number:${digit}` : '';
    };

    const floorKeys = (floor = {}) => [...new Set([
      String(floor.id || '').trim(),
      String(floor.name || '').trim(),
      String(floor.number || '').trim(),
      floorNumberKey(floor),
    ].filter(Boolean))];

    const roomKeys = (room = {}) => [...new Set([
      String(room.id || '').trim(),
      String(room.number || '').trim(),
      String(room.name || '').trim(),
      roomNumberKey(room),
    ].filter(Boolean))];

    const floorMap = new Map();
    const floorAliases = new Map();

    (Array.isArray(current.floors) ? current.floors : []).forEach((floor) => {

      const keys = floorKeys(floor);

      const key = keys[0] || '';

      if (key) {
        floorMap.set(key, { ...floor, rooms: Array.isArray(floor.rooms) ? [...floor.rooms] : [] });
        keys.forEach((alias) => floorAliases.set(alias, key));
      }

    });

    (Array.isArray(next.floors) ? next.floors : []).forEach((floor) => {

      const keys = floorKeys(floor);

      const key = keys.map((alias) => floorAliases.get(alias)).find(Boolean) || keys[0] || '';

      if (!key) return;

      const target = floorMap.get(key) || { ...floor, rooms: [] };

      const roomMap = new Map();
      const roomAliases = new Map();

      (Array.isArray(target.rooms) ? target.rooms : []).forEach((room) => {
        const keysForRoom = roomKeys(room);
        const primary = keysForRoom[0] || '';
        if (!primary) return;
        roomMap.set(primary, room);
        keysForRoom.forEach((alias) => roomAliases.set(alias, primary));
      });

      (Array.isArray(floor.rooms) ? floor.rooms : []).forEach((room) => {

        const keysForRoom = roomKeys(room);

        const roomKey = keysForRoom.map((alias) => roomAliases.get(alias)).find(Boolean) || keysForRoom[0] || '';

        if (!roomKey) return;

        roomMap.set(roomKey, roomMap.has(roomKey) ? this.mergeInteriorRoom(roomMap.get(roomKey), room) : room);

      });

      floorMap.set(key, {
        ...target,
        ...floor,
        id: target.id || floor.id,
        name: target.name || floor.name,
        ownerRefs: this.mergeOwnershipRefs(target.ownerRefs, floor.ownerRefs),
        usageContracts: this.mergeUsageContracts(target.usageContracts, floor.usageContracts),
        rooms: [...roomMap.values()],
      });

      keys.forEach((alias) => floorAliases.set(alias, key));

    });

    const zones = [...(Array.isArray(current.zones) ? current.zones : [])];

    const zoneKeys = new Set(zones.map((zone) => String(zone.id || zone.name || '').trim()).filter(Boolean));

    (Array.isArray(next.zones) ? next.zones : []).forEach((zone) => {

      const key = String(zone.id || zone.name || '').trim();

      if (!key || zoneKeys.has(key)) return;

      zoneKeys.add(key);

      zones.push(zone);

    });

    return {

      summary: current.summary || next.summary || '',

      zones,

      floors: [...floorMap.values()],

    };

  },



  validateSurroundLocation(raw = {}, anchor = {}, map = {}) {

    const mapMod = this.mapApi();

    const name = mapMod.cleanName(raw.name || raw.locationName || raw['地点名']);

    if (!name || mapMod.isAbstractName(name)) throw new Error('周围地点名无效');

    if (mapMod.isInteriorLocationName(name)) throw new Error(`周围地点不能是室内场景：${name}`);

    if (!mapMod.isMapExteriorNode(name) && !mapMod.isCommunityLevelNode(name)) {

      throw new Error(`周围地点必须是建筑物或小区级 POI：${name}`);

    }

    const directNeighbor = raw.directNeighbor !== false && raw.isDirectNeighbor !== false && raw.adjacent !== false;

    const noIntermediate = raw.noIntermediateLocations !== false && raw.noIntermediate !== false && raw.intermediateFree !== false;

    const intermediateLocations = Array.isArray(raw.intermediateLocations)
      ? raw.intermediateLocations.map((item) => String(item || '').trim()).filter(Boolean)
      : [];

    if (!directNeighbor || !noIntermediate || intermediateLocations.length) {

      throw new Error(`周围地点必须与${anchor.name}直接相邻且中间没有其他具体地点：${name}`);

    }

    const parentNode = (map.nodes || []).find((item) => item.id === anchor.parentId);

    const parentFallback = parentNode?.name || anchor.name;

    const parentName = mapMod.cleanName(raw.parentName || raw.parentLocationName || parentFallback);

    const facts = Array.isArray(raw.descriptionFacts)

      ? raw.descriptionFacts.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 2)

      : [String(raw.description || raw.info || raw['地点信息'] || `${name}，与${anchor.name}相邻的可前往地点。`).slice(0, 80)];

    const faction = this.normalizeSurroundLocationFaction(raw);
    if (faction) {
      const fact = `势力：${faction}`;
      if (!facts.includes(fact)) facts.push(fact);
    }

    return {
      name,
      parentName,
      descriptionFacts: facts.slice(0, 3),
      faction,
      effectiveAuthorityRef: faction ? { type: 'faction-chain', name: faction } : null,
      granularity: 'building',
      directNeighbor: true,
      noIntermediateLocations: true,
      distanceMeters: Number(raw.distanceMeters || raw.meters || raw.lengthMeters) || null,
      distanceText: String(raw.distanceText || raw.distance || raw['距离'] || '').trim().slice(0, 18),
    };

  },


  applyCharacterLocations(state = {}, locations = []) {
    const rows = Array.isArray(locations) ? locations : [];
    if (!rows.length || !state) return [];
    const graphApi = window.GameModules.realWorldLocationGraph;
    const locField = window.GameModules.currentLocationField;
    const time = this.mapApi()?.factTime?.(state) || new Date().toISOString();
    const applied = [];
    state.characterSchedules = state.characterSchedules && typeof state.characterSchedules === 'object'
      ? state.characterSchedules
      : {};

    rows.forEach((row) => {
      const name = String(row?.name || '').trim();
      const location = String(row?.location || '').trim();
      if (!name || !location || !locField?.isValidProfileFormat?.(location)) return;
      const character = this.resolveAppearingCharacter(state, name) || graphApi?.findCharacterByRef?.(state, { name }) || null;
      const characterId = graphApi?.characterKey?.(character || { name }) || character?.id || name;
      const mapNodeName = row.mapNodeName || locField.mapNodeName(location);
      const interiorPosition = row.interiorPosition || locField.interiorPosition(location);
      const node = graphApi?.getNode?.(state, mapNodeName) || graphApi?.getNode?.(state, location) || null;
      if (node?.id) {
        graphApi.setCharacterCurrentNode?.(state, characterId, node.id, {
          characterName: character?.profile?.name || character?.name || name,
          reason: '电子地图周围解锁同步出场人物角色卡当前位置。',
          time,
        });
      }
      const prev = state.characterSchedules[characterId] || {};
      state.characterSchedules[characterId] = {
        ...prev,
        characterId,
        characterName: prev.characterName || character?.profile?.name || character?.name || name,
        currentLocation: mapNodeName || location,
        currentNodeId: node?.id || prev.currentNodeId || '',
        currentLocationIdentityKey: node?.identityKey || prev.currentLocationIdentityKey || '',
        profileCurrentLocation: location,
        reason: '电子地图周围解锁同步出场人物角色卡当前位置。',
        updatedAt: time,
        source: '电子地图周围解锁',
      };
      if (character) {
        character.profile = character.profile && typeof character.profile === 'object' ? character.profile : {};
        character.profile.currentLocation = location;
        character.values = character.values && typeof character.values === 'object' ? character.values : {};
        character.values.current_location = {
          ...locField.stateValueFromText(
            location,
            state,
            '电子地图周围解锁覆盖角色卡当前位置。',
            character.worldTag || character.profile?.work || window.GameModules.realWorld2026?.label || '未知世界',
          ),
          nodeId: node?.id || character.values.current_location?.nodeId || '',
          identityKey: node?.identityKey || character.values.current_location?.identityKey || '',
          mapNodeName,
          interiorPosition,
        };
        if (characterId === 'player-self' || character.profile?.isPlayer) {
          if (state.playerProfile && typeof state.playerProfile === 'object') {
            state.playerProfile.currentLocation = location;
          }
          state.realWorldLocationName = mapNodeName || state.realWorldLocationName;
          if (state.realWorldMap) {
            state.realWorldMap.current = mapNodeName || state.realWorldMap.current;
            if (node?.legacyMapNodeId || node?.id) {
              state.realWorldMap.currentId = node.legacyMapNodeId || node.id;
            }
          }
        }
      }
      window.GameModules.orgTerritory?.bumpOrgExposureOnScheduleLocation?.(state, mapNodeName || location);
      applied.push({ name, characterId, location, mapNodeName, nodeId: node?.id || '' });
    });
    return applied;
  },


  async applySurroundUnlock(state, map, anchor, sceneNode, payload = {}) {

    const graphApi = window.GameModules.realWorldLocationGraph;
    const mapMod = this.mapApi();
    const time = mapMod.factTime(state);

    this.surroundUnlockDebug(state, 'apply-start', {
      anchorId: anchor?.id || '',
      anchorGraphNodeId: anchor?.graphNodeId || '',
      anchorName: anchor?.name || '',
      sceneNodeId: sceneNode?.id || '',
      sceneNodeName: sceneNode?.name || '',
      responseMode: payload?.responseMode || '',
      noChange: Boolean(payload?.noChange),
      rawShape: payload?.debugShape || null,
      beforeInteriorSummary: this.summarizeInteriorLayout(anchor?.interiorLayout || {}),
      locationInfoCount: Array.isArray(payload?.locationInfo) ? payload.locationInfo.length : 0,
      factionInfoCount: Array.isArray(payload?.factionInfo) ? payload.factionInfo.length : 0,
      characterLocationCount: Array.isArray(payload?.characterLocations) ? payload.characterLocations.length : 0,
      surroundLocationCount: Array.isArray(payload?.surroundLocations) ? payload.surroundLocations.length : 0,
      surroundLocationNames: (payload?.surroundLocations || []).map((item) => item.name).slice(0, 12),
    });

    const unlocked = [];
    const touchedNodeIds = [];
    const anchorRef = anchor?.graphNodeId || anchor?.id || map?.mapAnchorId || map?.currentId || '';
    let anchorGraphNode = graphApi?.poiAncestor?.(state, anchorRef) || graphApi?.getNode?.(state, anchorRef);
    if (!anchorGraphNode) {
      anchorGraphNode = graphApi?.ensurePoiFromPayload?.(state, {
        nodeId: anchor?.graphNodeId || anchor?.id,
        name: anchor?.name || map?.current || state?.realWorldLocationName,
        time,
      }, { source: 'real-world-map-surround-anchor', skipProject: true });
    }
    const anchorGraphParentId = anchorGraphNode?.parentId || anchor.parentId || '';

    for (const item of (payload.surroundLocations || [])) {
      this.surroundUnlockDebug(state, 'apply-neighbor-start', {
        anchorId: anchor?.id || '',
        anchorName: anchor?.name || '',
        itemName: item?.name || '',
        parentName: item?.parentName || '',
        distanceMeters: item?.distanceMeters || null,
        distanceText: item?.distanceText || '',
        faction: item?.faction || '',
      });
      const created = graphApi?.ensurePoiFromPayload?.(state, {
        name: item.name,
        parentName: item.parentName,
        parentId: anchorGraphParentId,
        descriptionFacts: item.descriptionFacts,
        effectiveAuthorityRef: item.effectiveAuthorityRef || (item.faction ? { type: 'faction-chain', name: item.faction } : null),
        time,
      }, { source: 'real-world-map-surround-neighbor', skipProject: true });

      if (created) {
        if (item.faction) {
          const existingFacts = Array.isArray(created.descriptionFacts) ? created.descriptionFacts : [];
          const fact = `势力：${item.faction}`;
          if (!existingFacts.includes(fact)) {
            created.descriptionFacts = [...existingFacts, fact].slice(-30);
          }
          if (!created.effectiveAuthorityRef) {
            created.effectiveAuthorityRef = { type: 'faction-chain', name: item.faction };
          }
        }
        this.surroundUnlockDebug(state, 'apply-neighbor-merged', {
          itemName: item?.name || '',
          createdId: created?.id || '',
          createdName: created?.name || '',
          faction: item?.faction || '',
        });
        graphApi?.ensureRouteEdge?.(state, anchorGraphNode?.id || anchor?.graphNodeId || anchor?.id, created.id, {
          relation: 'direct-neighbor',
          directNeighbor: true,
          noIntermediateLocations: true,
          distanceMeters: item.distanceMeters,
          distanceText: item.distanceText,
          basis: item.basis,
          source: 'real-world-map-surround-unlock',
          time,
        });
        touchedNodeIds.push(created.id);
        unlocked.push(created.name);
      }
    }

    const finalAnchor = (map.nodes || []).find((node) => node.id === anchor?.id) || anchor;
    const locationInfo = Array.isArray(payload.locationInfo) ? payload.locationInfo : [];
    const factionInfo = Array.isArray(payload.factionInfo) ? payload.factionInfo : [];
    if ((locationInfo.length || factionInfo.length) && finalAnchor) {
      const existingFacts = Array.isArray(finalAnchor.descriptionFacts) ? finalAnchor.descriptionFacts : [];
      const factSet = new Set(existingFacts.map((item) => String(item || '').trim()).filter(Boolean));
      locationInfo.forEach((item) => {
        const text = String(item || '').trim();
        if (text && !factSet.has(text)) factSet.add(text);
      });
      factionInfo.forEach((item) => {
        const text = String(item || '').trim();
        const fact = text ? `势力：${text}` : '';
        if (fact && !factSet.has(fact)) factSet.add(fact);
      });
      finalAnchor.descriptionFacts = [...factSet].slice(-30);
      if (factionInfo[0]) {
        finalAnchor.effectiveAuthorityRef = { type: 'faction-chain', name: factionInfo[0] };
      }
    }
    if ((locationInfo.length || factionInfo.length) && anchorGraphNode) {
      const existingFacts = Array.isArray(anchorGraphNode.descriptionFacts) ? anchorGraphNode.descriptionFacts : [];
      const factSet = new Set(existingFacts.map((item) => String(item || '').trim()).filter(Boolean));
      locationInfo.forEach((item) => {
        const text = String(item || '').trim();
        if (text) factSet.add(text);
      });
      factionInfo.forEach((item) => {
        const text = String(item || '').trim();
        if (text) factSet.add(`势力：${text}`);
      });
      anchorGraphNode.descriptionFacts = [...factSet].slice(-30);
      if (factionInfo[0]) {
        anchorGraphNode.effectiveAuthorityRef = { type: 'faction-chain', name: factionInfo[0] };
      }
    }
    if (finalAnchor) {
      finalAnchor.exteriorRingUnlocked = true;
      finalAnchor.visited = true;
      finalAnchor.revealed = true;
      this.normalizeNodeFlags(finalAnchor);
      anchor = finalAnchor;
    }

    map.mapAnchorId = anchor.id;

    const characterLocationApplied = this.applyCharacterLocations(state, payload.characterLocations || []);

    this.syncRevealed(map);

    window.GameModules.orgTerritory?.ensureMapControls?.(map, state);

    this.surroundUnlockDebug(state, 'apply-done', {
      anchorId: anchor?.id || '',
      anchorName: anchor?.name || '',
      unlocked,
      touchedNodeIds,
      characterLocationApplied,
      afterInteriorSummary: this.summarizeInteriorLayout(anchor?.interiorLayout || {}),
      mapNodeCount: Array.isArray(map?.nodes) ? map.nodes.length : 0,
      graphNodeCount: graphApi?.standardPoiGraph?.(state)?.nodes?.length || 0,
      graphEdgeCount: graphApi?.standardPoiGraph?.(state)?.edges?.length || 0,
    });

    return unlocked;

  },

};

