window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.realWorld = window.GameModules.ui.realWorld || {};

window.GameModules.ui.realWorld.mapInteriorViewHelpers = {
  interiorView() {
    const map = this.realWorldMap || {};
    if (map.interiorRoomId) return 'room';
    if (map.interiorFloorId) return 'floor';
    return 'tree';
  },

  interiorTitle() {
    const node = this.realWorldMapInteriorNode();
    if (!node) return '室内结构';
    return `${node.name || '未知地点'} · 室内结构`;
  },

  interiorZones() {
    const node = this.realWorldMapInteriorNode();
    return Array.isArray(node?.interiorLayout?.zones) ? node.interiorLayout.zones : [];
  },

  interiorSummary() {
    const floors = this.realWorldMapInteriorFloors();
    const roomCount = floors.reduce((sum, floor) => sum + (Array.isArray(floor?.rooms) ? floor.rooms.length : 0), 0);
    if (!floors.length && !roomCount) return '';
    const parts = [`${floors.length} 层`, `${roomCount} 个房间`];
    return parts.join(' · ');
  },

  selectedRoom() {
    const map = this.realWorldMap || {};
    return window.GameModules.realWorldMapInterior.findRoom(this.realWorldMapInteriorFloors(), map.interiorRoomId).room;
  },

  selectedFloor() {
    const map = this.realWorldMap || {};
    return window.GameModules.realWorldMapInterior.findFloor(this.realWorldMapInteriorFloors(), map.interiorFloorId);
  },

  roomChipTitle(room = {}) {
    return window.GameModules.realWorldMapInterior.roomDisplayTitle(room);
  },

  roomResidentsLabel(room = {}) {
    if (!room?.residentsText) return '居住人：未知';
    return `居住人：${room.residentsText}`;
  },

  selectedRoomResidentsLine() {
    const helpers = window.GameModules.ui.realWorld.mapInteriorViewHelpers;
    return helpers.roomResidentsLabel.call(this, helpers.selectedRoom.call(this));
  },

  selectedRoomObjectsLine() {
    const room = window.GameModules.ui.realWorld.mapInteriorViewHelpers.selectedRoom.call(this);
    const area = window.GameModules.ui.realWorld.mapInteriorViewHelpers.selectedRoomAreaRegion.call(this);
    if (area) {
      const objects = window.GameModules.realWorldMapInterior
        .roomShapeObjectItems(area.shape)
        .map((object) => window.GameModules.realWorldMapInterior.normalizeObjectLabel(object))
        .filter(Boolean);
      return objects.length ? `当前区域：${area.label}｜摆件：${objects.join('、')}` : `当前区域：${area.label}`;
    }
    const layout = window.GameModules.realWorldMapInterior.resolveRoomLayout(room);
    const hasDrillableAreas = window.GameModules.realWorldMapInterior.roomLayoutRegions(layout)
      .some((region) => window.GameModules.realWorldMapInterior.isDrillableRoomRegion(region));
    const labels = window.GameModules.realWorldMapInterior.roomObjectLabels(room);
    if (!labels.length) return '室内物品：等待进一步观察';
    return hasDrillableAreas ? `可查看区域：${labels.join('、')}` : `室内物品：${labels.join('、')}`;
  },

  selectedRoomAreaRegion() {
    const room = window.GameModules.ui.realWorld.mapInteriorViewHelpers.selectedRoom.call(this);
    const areaId = String(this.realWorldMap?.interiorRoomAreaId || '');
    if (!room || !areaId) return null;
    const layout = window.GameModules.realWorldMapInterior.resolveRoomLayout(room);
    return window.GameModules.realWorldMapInterior.roomLayoutRegions(layout).find((region) => region.id === areaId) || null;
  },

  selectedRoomAreaLayout() {
    const room = window.GameModules.ui.realWorld.mapInteriorViewHelpers.selectedRoom.call(this);
    const area = window.GameModules.ui.realWorld.mapInteriorViewHelpers.selectedRoomAreaRegion.call(this);
    return area ? window.GameModules.realWorldMapInterior.roomAreaDetailLayout(room, area) : null;
  },

  selectedRoomAreaTitle() {
    const area = window.GameModules.ui.realWorld.mapInteriorViewHelpers.selectedRoomAreaRegion.call(this);
    return area?.label || '';
  },

  selectedRoomObjectRegion() {
    const room = window.GameModules.ui.realWorld.mapInteriorViewHelpers.selectedRoom.call(this);
    const shapeId = String(this.realWorldMap?.interiorRoomShapeId || '');
    if (!room || !shapeId) return null;
    const areaLayout = window.GameModules.ui.realWorld.mapInteriorViewHelpers.selectedRoomAreaLayout.call(this);
    const layout = areaLayout || window.GameModules.realWorldMapInterior.resolveRoomLayout(room);
    return window.GameModules.realWorldMapInterior.roomLayoutRegions(layout).find((region) => region.id === shapeId) || null;
  },

  selectedRoomObjectTitle() {
    const object = window.GameModules.ui.realWorld.mapInteriorViewHelpers.selectedRoomObjectRegion.call(this);
    return object?.label || '';
  },

  selectedRoomObjectLine() {
    const object = window.GameModules.ui.realWorld.mapInteriorViewHelpers.selectedRoomObjectRegion.call(this);
    if (object) {
      const label = object.label || '该物件';
      const relation = window.GameModules.realWorldMapInterior.objectContainerRelation(label);
      const labels = window.GameModules.realWorldMapInterior.roomShapeContainerContents(object.shape);
      if (!labels.length) return `${label}${relation === '相关物品' ? '' : relation}：等待进一步观察`;
      return relation === '相关物品'
        ? `相关物品：${labels.join('、')}`
        : `${label}${relation}：${labels.join('、')}`;
    }
    return '';
  },

  selectedRoomTemplateLabel() {
    const room = window.GameModules.ui.realWorld.mapInteriorViewHelpers.selectedRoom.call(this);
    if (!room) return '';
    const area = window.GameModules.ui.realWorld.mapInteriorViewHelpers.selectedRoomAreaRegion.call(this);
    if (area?.label) return `区域布局：${area.label}内部`;
    const explicitLabel = String(room.layoutTemplateName || room.layoutTemplateLabel || room.templateName || '').trim();
    if (explicitLabel && explicitLabel !== room.layoutTemplateId) return explicitLabel;
    const templateId = String(room.layoutTemplateId || room.templateId || '').trim();
    if (!templateId) return '';
    const template = window.GameModules.realWorldMapInteriorTemplates?.list?.().find((item) => item.id === templateId);
    return template?.name ? `布局模板：${template.name}` : '';
  },

  zoneKindLabel(zone = {}) {
    return zone.kind || '区域';
  },

  zoneDescriptionText(zone = {}) {
    return String(zone.description || '').trim();
  },

  zoneGridClass(position = '') {
    const raw = String(position || '').trim().toLowerCase();
    if (!raw) return 'real-world-map-zone--center';
    return `real-world-map-zone--${raw.replace(/[^a-z0-9_-]+/g, '-')}`;
  },

  infoInteriorTargetNodeId() {
    return this.realWorldMapInfoNode()?.id || '';
  },

  canOpenInfoInterior() {
    return !!this.realWorldMapInfoNode()?.id;
  },

  infoInteriorActionLabel() {
    return '查看建筑内部';
  },

  interiorFloorRoomCountText(floor = {}) {
    return `${Array.isArray(floor?.rooms) ? floor.rooms.length : 0} 个空间`;
  },

  interiorBackToFloorsLabel() {
    return '返回楼层';
  },

  interiorRoomRows(floor = {}) {
    return (Array.isArray(floor?.rooms) ? floor.rooms : []).map((room) => ({
      key: room.id || this.roomChipTitle(room),
      roomId: room.id || '',
      title: this.roomChipTitle(room),
      residentsLine: this.roomResidentsLabel(room),
    }));
  },

  interiorFloorRows() {
    return this.realWorldMapInteriorFloors().map((floor) => ({
      key: floor.id || floor.name || 'floor',
      floorId: floor.id || '',
      title: floor.name || '未命名楼层',
      roomCountText: this.interiorFloorRoomCountText(floor),
      toggleIcon: this.realWorldMapInteriorFloorOpen(floor.id) ? '▾' : '▸',
      roomRows: this.interiorRoomRows(floor),
      open: !!this.realWorldMapInteriorFloorOpen(floor.id),
    }));
  },

  interiorZoneRows() {
    return window.GameModules.ui.realWorld.mapInteriorViewHelpers.interiorZones.call(this).map((zone) => ({
      key: zone.id || zone.name || 'zone',
      title: zone.name || '未命名区域',
      kindLabel: this.zoneKindLabel(zone),
      descriptionText: this.zoneDescriptionText(zone),
      gridClass: this.zoneGridClass(zone.position),
    }));
  },

  selectedRoomDetailView() {
    const room = this.selectedRoom();
    return {
      residentsLine: this.selectedRoomResidentsLine(),
      templateLabel: this.selectedRoomTemplateLabel(),
      hasTemplateLabel: !!this.selectedRoomTemplateLabel(),
      roomId: room?.id || '',
    };
  },

  interiorPanelView() {
    const floorRows = this.interiorFloorRows();
    const zoneRows = this.interiorZoneRows();
    const roomDetail = this.selectedRoomDetailView();
    const interiorView = this.realWorldMapInteriorView();
    return {
      title: this.realWorldMapInteriorTitle(),
      summaryText: this.realWorldMapInteriorSummary(),
      view: interiorView,
      isTreeView: interiorView === 'tree',
      isFloorView: interiorView === 'floor',
      isRoomView: interiorView === 'room',
      emptyText: !floorRows.length ? '该建筑内部仍处于迷雾，等待现实行动推演楼层、房间或公共区域。' : '',
      floorRows,
      zoneRows,
      hasZoneRows: zoneRows.length > 0,
      backLabel: this.interiorBackToFloorsLabel(),
      roomDetail,
    };
  },
};
