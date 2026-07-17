/**

 * 电子地图迷雾：已访问建筑物 + 其一圈邻域可见；首次抵达且无同级邻点时 AI 解锁周围。

 * 地图最小颗粒度 = 建筑物；走廊/房间/楼梯间只在 interiorLayout 中展示。

 */

window.GameModules = window.GameModules || {};



window.GameModules.realWorldMapFog = {

  mapApi() {

    return window.GameModules.realWorldMap;

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

    const map = mapMod.ensure(state, state.playerProfile || {});

    const node = mapMod.currentNode(map);

    if (!node) return { unlocked: [], interior: null };



    const { firstVisit, anchor } = this.markVisited(map, node.id);
    if (firstVisit && anchor) window.GameModules.orgTerritory?.bumpOrgExposureOnMapVisit?.(state, map, anchor);
    const needUnlock = firstVisit || this.shouldUnlockSurroundings(map, anchor);
    const needPatchReview = !needUnlock && anchor?.exteriorRingUnlocked && this.shouldReviewKnownLocationPatch(result);

    if (!needUnlock && !needPatchReview) {
      window.GameModules.orgTerritory?.ensureMapControls?.(map, state);
      return { unlocked: [], interior: anchor?.interiorLayout || null };
    }



    try {

      const payload = await this.generateSurroundUnlock(state, map, node, anchor, result, needUnlock ? 'full' : 'patch');

      const unlocked = await this.applySurroundUnlock(state, map, anchor, node, payload);

      this.syncRevealed(map);

      window.GameModules.orgTerritory?.ensureMapControls?.(map, state);

      map.lastText = mapMod.render(map);

      return { unlocked, interior: anchor.interiorLayout || null };

    } catch (err) {

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
          layoutTemplateId: trimText(room.layoutTemplateId || room.templateId, 64),
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

    const prompt = await window.GameModules.renderPrompt('real-world-map-surround-unlock', {

      手机时间: `${state.phoneDateText?.() || ''} ${state.phoneTimeText?.() || ''}`.trim(),

      地图锚点: anchorName,

      返回模式: mode === 'patch' ? 'patch' : 'full',

      玩家所在室内: indoor,

      当前地点: anchorName,

      上级地点: parent?.name || '无',

      现实地图: map.lastText || this.mapApi().render(map),

      地点说明: this.locationFactsText(map),

      当前地点完整JSON: JSON.stringify(this.buildSurroundUnlockContext(state, map, anchor, sceneNode), null, 2).slice(0, 16000),

      本轮正文: String(result.narration || '').slice(0, 1200),

      玩家行动: String(state.realWorldInput || result.actionText || '').slice(0, 200),

      布局模板目录: window.GameModules.realWorldMapInteriorTemplates?.catalogText?.() || '无',

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

      parse: (text) => window.GameModules.jsonUtils.parseLoose(text),

      validate: (raw) => this.validateUnlockPayload(raw, anchor, map, mode),

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



  validateUnlockPayload(raw = {}, anchor = {}, map = {}, expectedMode = 'full') {

    const responseMode = String(raw.responseMode || raw.mode || raw.updateMode || expectedMode || 'full').trim().toLowerCase() === 'patch' ? 'patch' : 'full';
    const rawPatch = raw.patch && typeof raw.patch === 'object' ? raw.patch : {};
    const rawInterior = raw.interiorLayout || raw.interiorPatch || rawPatch.interiorLayout || rawPatch.interiorPatch || null;
    let interiorLayout = null;
    if (rawInterior) {
      interiorLayout = this.normalizeInterior(rawInterior, anchor.name);
    } else if (responseMode === 'full') {
      interiorLayout = this.normalizeInterior({}, anchor.name);
    }

    const surroundLocations = (Array.isArray(raw.surroundLocations) ? raw.surroundLocations : [])

      .slice(0, 6)

      .map((item) => {
        try { return this.validateSurroundLocation(item, anchor, map); }
        catch (err) { console.warn('[real-world-map] dropped invalid surround location:', err.message); return null; }
      })

      .filter(Boolean);

    const noChange = raw.noChange === true || rawPatch.noChange === true || responseMode === 'patch' && !interiorLayout && !surroundLocations.length;

    if (responseMode === 'full' && !surroundLocations.length) throw new Error('surroundLocations 为空');
    if (responseMode === 'full' && !interiorLayout) throw new Error('interiorLayout 为空');
    if (responseMode === 'patch' && !noChange && !interiorLayout && !surroundLocations.length) throw new Error('patch 为空');

    return { responseMode, noChange, interiorLayout, surroundLocations };

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

      }))

      .filter((zone) => zone.name && zone.description);

    if (!floors.length && !zones.length) throw new Error('interiorLayout 需包含 floors 或 zones');

    if (!zones.length) {

      zones.push({ id: 'zone_corridor', name: '走廊', kind: '走廊', position: '中', description: '连接各户与楼梯间。' });

    }

    return { summary, zones, floors };

  },

  normalizeInteriorFloors(floorsRaw = []) {

    const interiorMod = window.GameModules.realWorldMapInterior;

    const tpl = window.GameModules.realWorldMapInteriorTemplates;

    return (Array.isArray(floorsRaw) ? floorsRaw : []).slice(0, 8).map((floor, floorIndex) => {

      const rooms = (Array.isArray(floor.rooms) ? floor.rooms : []).slice(0, 12).map((room, roomIndex) => {

        const number = String(room.number || room.name || '').trim();

        const residents = interiorMod?.sanitizeResidents?.(room.residents || room.occupants) || [];

        let layoutTemplateId = String(room.layoutTemplateId || room.templateId || '').trim();
        const slotAssignments = room.slotAssignments && typeof room.slotAssignments === 'object' ? room.slotAssignments : {};
        const slotObjects = interiorMod?.normalizeSlotObjects?.(room.slotObjects || room.layoutObjects || room.objectsBySlot || room.shapeObjects) || {};
        const slotObjectContents = interiorMod?.normalizeSlotObjectContents?.(room.slotObjectContents || room.containerContentsBySlot || room.objectContentsBySlot || room.contentsBySlot) || {};
        const rawLayout = interiorMod?.normalizeRoomLayout?.(room.layout || room.roomLayout || room.floorPlan, { slotObjects, slotObjectContents }) || null;

        if (layoutTemplateId && !tpl?.isValidId?.(layoutTemplateId)) layoutTemplateId = rawLayout ? '' : tpl.suggestTemplateId(residents.length);

        if (!rawLayout && !layoutTemplateId && residents.length) layoutTemplateId = tpl?.suggestTemplateId?.(residents.length) || '';

        const mergedAssignments = {

          ...(tpl?.autoSlotAssignments?.(layoutTemplateId, residents) || {}),

          ...slotAssignments,

        };

        const layout = rawLayout || (layoutTemplateId

          ? interiorMod?.buildLayoutFromTemplate?.(layoutTemplateId, { residents, slotAssignments: mergedAssignments, slotObjects, slotObjectContents })

          : null);

        return {

          id: String(room.id || `room_${number || roomIndex + 1}`),

          number,

          name: String(room.name || number).slice(0, 16),

          residents,

          layoutTemplateId,

          slotAssignments: mergedAssignments,

          slotObjects,

          slotObjectContents,

          layout,

        };

      }).filter((room) => room.id || room.number || room.name || room.residents?.length);

      return {

        id: String(floor.id || `floor_${floorIndex + 1}`),

        name: String(floor.name || floor.label || `第${floorIndex + 1}楼`).slice(0, 12),

        rooms,

      };

    }).filter((floor) => floor.rooms.length);

  },



  normalizeZonePosition(value = '') {

    const text = String(value || '中').trim();

    if (/北/u.test(text)) return '北';

    if (/南/u.test(text)) return '南';

    if (/东/u.test(text)) return '东';

    if (/西/u.test(text)) return '西';

    return '中';

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


  mergeInteriorRoom(existing = {}, incoming = {}) {
    return {
      ...existing,
      ...incoming,
      residents: Array.isArray(incoming.residents) && incoming.residents.length ? incoming.residents : (existing.residents || []),
      slotAssignments: {
        ...(existing.slotAssignments && typeof existing.slotAssignments === 'object' ? existing.slotAssignments : {}),
        ...(incoming.slotAssignments && typeof incoming.slotAssignments === 'object' ? incoming.slotAssignments : {}),
      },
      slotObjects: this.mergeSlotObjects(existing.slotObjects, incoming.slotObjects),
      slotObjectContents: {
        ...(existing.slotObjectContents && typeof existing.slotObjectContents === 'object' ? existing.slotObjectContents : {}),
        ...(incoming.slotObjectContents && typeof incoming.slotObjectContents === 'object' ? incoming.slotObjectContents : {}),
      },
      layout: this.mergeRoomLayout(existing.layout, incoming.layout),
    };
  },


  mergeInteriorLayout(existing = {}, incoming = {}) {

    const current = existing && typeof existing === 'object' ? existing : {};

    const next = incoming && typeof incoming === 'object' ? incoming : {};

    const floorMap = new Map();

    (Array.isArray(current.floors) ? current.floors : []).forEach((floor) => {

      const key = String(floor.id || floor.name || '').trim();

      if (key) floorMap.set(key, { ...floor, rooms: Array.isArray(floor.rooms) ? [...floor.rooms] : [] });

    });

    (Array.isArray(next.floors) ? next.floors : []).forEach((floor) => {

      const key = String(floor.id || floor.name || '').trim();

      if (!key) return;

      const target = floorMap.get(key) || { ...floor, rooms: [] };

      const roomMap = new Map((Array.isArray(target.rooms) ? target.rooms : []).map((room) => [String(room.id || room.number || room.name || '').trim(), room]));

      (Array.isArray(floor.rooms) ? floor.rooms : []).forEach((room) => {

        const roomKey = String(room.id || room.number || room.name || '').trim();

        if (!roomKey) return;

        roomMap.set(roomKey, roomMap.has(roomKey) ? this.mergeInteriorRoom(roomMap.get(roomKey), room) : room);

      });

      floorMap.set(key, { ...target, ...floor, rooms: [...roomMap.values()] });

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

    const name = mapMod.cleanName(raw.name || raw.locationName);

    if (!name || mapMod.isAbstractName(name)) throw new Error('周围地点名无效');

    if (mapMod.isInteriorLocationName(name)) throw new Error(`周围地点不能是室内场景：${name}`);

    if (!mapMod.isMapExteriorNode(name) && !mapMod.isCommunityLevelNode(name)) {

      throw new Error(`周围地点必须是建筑物或小区级 POI：${name}`);

    }

    const directNeighbor = raw.directNeighbor === true || raw.isDirectNeighbor === true || raw.adjacent === true;

    const noIntermediate = raw.noIntermediateLocations === true || raw.noIntermediate === true || raw.intermediateFree === true;

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

      : [String(raw.description || `${name}，与${anchor.name}相邻的可前往地点。`).slice(0, 80)];

    return {
      name,
      parentName,
      descriptionFacts: facts,
      granularity: 'building',
      directNeighbor: true,
      noIntermediateLocations: true,
    };

  },



  async applySurroundUnlock(state, map, anchor, sceneNode, payload = {}) {

    const mapMod = this.mapApi();

    const time = mapMod.factTime(state);

    if (payload.interiorLayout) {

      anchor.interiorLayout = this.mergeInteriorLayout(anchor.interiorLayout, payload.interiorLayout);

      if (sceneNode && sceneNode.id !== anchor.id && mapMod.isInteriorLocationName(sceneNode.name)) {

        mapMod.addInteriorZone(anchor, { name: sceneNode.name, description: sceneNode.description });

      }

    }

    anchor.exteriorRingUnlocked = true;

    const unlocked = [];

    for (const item of (payload.surroundLocations || [])) {
      const ensureParams = {
        stage: 'stage4',
        intent: 'create-neighbor',
        targetKeyword: item.name,
        currentNodeId: anchor?.id || '',
        currentLegacyLocationName: anchor?.name || '',
        requiredScope: ['poi-neighbors', 'direct-neighbor-edges'],
        visibleNeed: `电子地图周围解锁需要确认 ${item.name} 是否已存在。`,
        actionText: item.descriptionFacts?.join?.('；') || '',
      };
      const skills = window.GameModules.realWorldLocationGraphSkills;
      const ensureResult = skills?.nodeEnsure?.(state, ensureParams);

      if (ensureResult?.nodeId && ['reuse-existing', 'patch-existing', 'create-new'].includes(ensureResult.decision)) {
        const graphNode = window.GameModules.realWorldLocationGraph?.getNode?.(state, ensureResult.nodeId);
        const mapNode = (map.nodes || []).find((node) => node.graphNodeId === ensureResult.nodeId || node.id === ensureResult.nodeId || node.name === graphNode?.name);
        if (mapNode) {
          this.normalizeNodeFlags(mapNode);
          mapNode.mapVisible = true;
          mapNode.revealed = true;
          mapNode.visited = false;
        }
        const reusedName = ensureResult.path?.[ensureResult.path.length - 1] || item.name;
        if (reusedName && !unlocked.includes(reusedName)) unlocked.push(reusedName);
        continue;
      }

      const created = window.GameModules.realWorldLocationGraph?.ensurePoiFromPayload?.(state, {
        name: item.name,
        parentName: item.parentName,
        parentId: anchor.parentId || '',
        descriptionFacts: item.descriptionFacts,
        time,
      }, { source: 'real-world-map-fog-fallback' });

      if (created) {

        this.normalizeNodeFlags(created);

        created.mapVisible = true;

        created.revealed = true;

        created.visited = false;

        unlocked.push(created.name);

      }

    }

    map.mapAnchorId = anchor.id;

    this.syncRevealed(map);

    window.GameModules.orgTerritory?.ensureMapControls?.(map, state);

    return unlocked;

  },

};


(function enhanceRealWorldMapFogRoutes() {
  const fog = window.GameModules.realWorldMapFog;
  if (!fog || fog.__routeDistanceEnhanced) return;
  fog.__routeDistanceEnhanced = true;

  const originalValidate = fog.validateSurroundLocation;
  fog.validateSurroundLocation = function validateSurroundLocationWithDistance(raw = {}, anchor = {}, map = {}) {
    const item = originalValidate.call(this, raw, anchor, map);
    const meters = Number(raw.distanceMeters || raw.meters || raw.lengthMeters);
    item.distanceMeters = Number.isFinite(meters) && meters > 0 ? Math.round(meters) : null;
    item.distanceText = String(raw.distanceText || raw.distance || raw.distanceLabel || '').trim().slice(0, 18)
      || (item.distanceMeters ? (item.distanceMeters >= 1000 ? `${(item.distanceMeters / 1000).toFixed(item.distanceMeters >= 10000 ? 0 : 1)} km` : `${item.distanceMeters} m`) : '\u8ddd\u79bb\u5f85\u63a8\u6f14');
    item.basis = String(raw.basis || raw.reason || raw.description || '').trim().slice(0, 100);
    return item;
  };

  const originalApply = fog.applySurroundUnlock;
  fog.applySurroundUnlock = async function applySurroundUnlockWithRoutes(state, map, anchor, sceneNode, payload = {}) {
    const unlocked = await originalApply.call(this, state, map, anchor, sceneNode, payload);
    const mapMod = this.mapApi();
    if (mapMod?.applyRouteLinks && anchor?.name && Array.isArray(payload.surroundLocations)) {
      const time = mapMod.factTime(state);
      mapMod.applyRouteLinks(state, map, payload.surroundLocations.map((item) => ({
        from: anchor.name,
        to: item.name,
        distanceMeters: item.distanceMeters,
        distanceText: item.distanceText,
        basis: item.basis || item.descriptionFacts?.join(' '),
      })), time);
    }
    return unlocked;
  };
}());
