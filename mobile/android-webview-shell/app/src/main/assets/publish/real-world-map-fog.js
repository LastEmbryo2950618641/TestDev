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

    if (!needUnlock) {
      window.GameModules.orgTerritory?.ensureMapControls?.(map, state);
      return { unlocked: [], interior: anchor?.interiorLayout || null };
    }



    try {

      const payload = await this.generateSurroundUnlock(state, map, node, anchor, result);

      const unlocked = this.applySurroundUnlock(state, map, anchor, node, payload);

      this.syncRevealed(map);

      window.GameModules.orgTerritory?.ensureMapControls?.(map, state);

      map.lastText = mapMod.render(map);

      return { unlocked, interior: anchor.interiorLayout || null };

    } catch (err) {

      console.warn('电子地图周围解锁失败:', err.message);

      return { unlocked: [], interior: anchor?.interiorLayout || null };

    }

  },



  async generateSurroundUnlock(state, map, sceneNode, anchor, result = {}) {

    const parent = (map.nodes || []).find((item) => item.id === anchor.parentId);

    const sceneName = sceneNode?.name || '';

    const anchorName = anchor?.name || sceneName;

    const indoor = sceneName && sceneName !== anchorName ? sceneName : '无';

    const prompt = await window.GameModules.renderPrompt('real-world-map-surround-unlock', {

      手机时间: `${state.phoneDateText?.() || ''} ${state.phoneTimeText?.() || ''}`.trim(),

      地图锚点: anchorName,

      玩家所在室内: indoor,

      当前地点: anchorName,

      上级地点: parent?.name || '无',

      现实地图: map.lastText || this.mapApi().render(map),

      地点说明: this.locationFactsText(map),

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

      validate: (raw) => this.validateUnlockPayload(raw, anchor, map),

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



  validateUnlockPayload(raw = {}, anchor = {}, map = {}) {

    const interiorLayout = this.normalizeInterior(raw.interiorLayout, anchor.name);

    const surroundLocations = (Array.isArray(raw.surroundLocations) ? raw.surroundLocations : [])

      .slice(0, 6)

      .map((item) => this.validateSurroundLocation(item, anchor, map));

    if (!surroundLocations.length) throw new Error('surroundLocations 为空');

    return { interiorLayout, surroundLocations };

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

        if (layoutTemplateId && !tpl?.isValidId?.(layoutTemplateId)) layoutTemplateId = tpl.suggestTemplateId(residents.length);

        if (!layoutTemplateId && residents.length) layoutTemplateId = tpl?.suggestTemplateId?.(residents.length) || '';

        const slotAssignments = room.slotAssignments && typeof room.slotAssignments === 'object' ? room.slotAssignments : {};

        const mergedAssignments = {

          ...(tpl?.autoSlotAssignments?.(layoutTemplateId, residents) || {}),

          ...slotAssignments,

        };

        const layout = layoutTemplateId

          ? interiorMod?.buildLayoutFromTemplate?.(layoutTemplateId, { residents, slotAssignments: mergedAssignments })

          : null;

        return {

          id: String(room.id || `room_${number || roomIndex + 1}`),

          number,

          name: String(room.name || number).slice(0, 16),

          residents,

          layoutTemplateId,

          slotAssignments: mergedAssignments,

          layout,

        };

      }).filter((room) => room.number || room.residents?.length);

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



  validateSurroundLocation(raw = {}, anchor = {}, map = {}) {

    const mapMod = this.mapApi();

    const name = mapMod.cleanName(raw.name || raw.locationName);

    if (!name || mapMod.isAbstractName(name)) throw new Error('周围地点名无效');

    if (mapMod.isInteriorLocationName(name)) throw new Error(`周围地点不能是室内场景：${name}`);

    if (!mapMod.isMapExteriorNode(name) && !mapMod.isCommunityLevelNode(name)) {

      throw new Error(`周围地点必须是建筑物或小区级 POI：${name}`);

    }

    const parentNode = (map.nodes || []).find((item) => item.id === anchor.parentId);

    const parentFallback = parentNode?.name || anchor.name;

    const parentName = mapMod.cleanName(raw.parentName || raw.parentLocationName || parentFallback);

    const facts = Array.isArray(raw.descriptionFacts)

      ? raw.descriptionFacts.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 2)

      : [String(raw.description || `${name}，与${anchor.name}相邻的可前往地点。`).slice(0, 80)];

    return { name, parentName, descriptionFacts: facts, granularity: 'building' };

  },



  applySurroundUnlock(state, map, anchor, sceneNode, payload = {}) {

    const mapMod = this.mapApi();

    const time = mapMod.factTime(state);

    if (payload.interiorLayout) {

      anchor.interiorLayout = payload.interiorLayout;

      if (sceneNode && sceneNode.id !== anchor.id && mapMod.isInteriorLocationName(sceneNode.name)) {

        mapMod.addInteriorZone(anchor, { name: sceneNode.name, description: sceneNode.description });

      }

    }

    anchor.exteriorRingUnlocked = true;

    const unlocked = [];

    (payload.surroundLocations || []).forEach((item) => {

      const parent = item.parentName

        ? mapMod.upsertNode(map, { name: item.parentName, time, onlyIfNew: true })

        : null;

      const parentId = parent?.id || anchor.parentId || '';

      const created = mapMod.upsertNode(map, {

        name: item.name,

        parentId,

        descriptionFacts: item.descriptionFacts,

        time,

        onlyIfNew: true,

      });

      if (created) {

        this.normalizeNodeFlags(created);

        created.mapVisible = true;

        created.revealed = true;

        created.visited = false;

        unlocked.push(created.name);

      }

    });

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
  fog.applySurroundUnlock = function applySurroundUnlockWithRoutes(state, map, anchor, sceneNode, payload = {}) {
    const unlocked = originalApply.call(this, state, map, anchor, sceneNode, payload);
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
