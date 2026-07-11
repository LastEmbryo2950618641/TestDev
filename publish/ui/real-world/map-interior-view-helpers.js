window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.realWorld = window.GameModules.ui.realWorld || {};

window.GameModules.ui.realWorld.mapInteriorViewHelpers = {
  interiorView() {
    const map = this.realWorldMap || {};
    return map.interiorRoomId ? 'room' : 'tree';
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
    const zoneCount = this.interiorZones().length;
    const parts = [`${floors.length} 层`, `${roomCount} 个房间`];
    if (zoneCount) parts.push(`${zoneCount} 个分区`);
    return parts.join(' · ');
  },

  selectedRoom() {
    const map = this.realWorldMap || {};
    return window.GameModules.realWorldMapInterior.findRoom(this.realWorldMapInteriorFloors(), map.interiorRoomId).room;
  },

  roomChipTitle(room = {}) {
    return room.number || room.name || '未命名空间';
  },

  roomResidentsLabel(room = {}) {
    if (!room?.residentsText) return '居住人：未知';
    return `居住人：${room.residentsText}`;
  },

  selectedRoomResidentsLine() {
    return this.roomResidentsLabel(this.selectedRoom());
  },

  selectedRoomTemplateLabel() {
    const room = this.selectedRoom();
    if (!room) return '';
    return room.layoutTemplateName || room.layoutTemplateLabel || room.layoutTemplateId || room.templateName || '';
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
    return this.interiorZones().map((zone) => ({
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
      isRoomView: interiorView === 'room',
      emptyText: !floorRows.length && !zoneRows.length ? '该建筑内部仍处于迷雾，等待现实行动推演楼层、房间或公共区域。' : '',
      floorRows,
      zoneRows,
      hasZoneRows: zoneRows.length > 0,
      backLabel: this.interiorBackToFloorsLabel(),
      roomDetail,
    };
  },
};
