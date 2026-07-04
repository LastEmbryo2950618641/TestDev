/**
 * 建筑物内部：楼层 → 房间 → 居住人；房间 canvas 简易布局。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldMapInterior = {
  templatesApi() {
    return window.GameModules.realWorldMapInteriorTemplates;
  },

  buildLayoutFromTemplate(templateId = '', options = {}) {
    return this.templatesApi()?.build?.(templateId, options) || null;
  },

  resolveRoomLayout(room = {}) {
    if (room.layout?.shapes?.length) return room.layout;
    const templateId = room.layoutTemplateId || room.templateId;
    if (!templateId) return null;
    return this.buildLayoutFromTemplate(templateId, {
      residents: room.residents || [],
      slotAssignments: room.slotAssignments || {},
    });
  },

  defaultRoom202Layout() {
    return this.buildLayoutFromTemplate('four_bedroom_one_living', {
      residents: ['刘悠', '刘思琪', '刘思瑶', '刘思怡'],
      slotAssignments: { bed_1: '刘悠', bed_2: '刘思琪', bed_3: '刘思瑶', bed_4: '刘思怡' },
    });
  },

  isValidResidentName(name = '') {
    const text = String(name || '').trim();
    return /^[\u4e00-\u9fff·]{2,5}$/u.test(text) && !/发现|走廊|入口|楼梯|房间|单元|左侧|右侧|尽头/u.test(text);
  },

  sanitizeResidents(value) {
    const list = Array.isArray(value)
      ? value
      : String(value || '').split(/[、,，;；/|]/u);
    return list.map((item) => String(item || '').trim()).filter((item) => this.isValidResidentName(item));
  },

  isValidRoomNumber(number = '') {
    return /^\d{3,4}$/u.test(String(number || '').trim());
  },

  isInfrastructureZone(name = '') {
    return /走廊|楼梯|电梯|门厅|入口|过道|前厅/u.test(String(name || ''));
  },

  inferRoomNumberFromZoneName(name = '') {
    const text = String(name || '').trim();
    const num = text.match(/(\d{3,4})/u);
    if (num) return num[1];
    return '';
  },

  isHouseholdMemberName(name = '') {
    return /^刘(悠|思琪|思瑶|思怡)$/u.test(String(name || '').trim());
  },

  collectHouseholdFromZones(zones = []) {
    const names = new Set();
    (Array.isArray(zones) ? zones : []).forEach((zone) => {
      const label = String(zone?.name || '').trim();
      if (!label || this.isInfrastructureZone(label)) return;
      this.parseResidentsFromZoneName(label).forEach((item) => names.add(item));
      this.sanitizeResidents(zone.residents || zone.occupants).forEach((item) => names.add(item));
      const match = label.match(/刘[\u4e00-\u9fff]{1,2}/gu) || [];
      match.forEach((item) => { if (this.isHouseholdMemberName(item)) names.add(item); });
    });
    return [...names];
  },

  parseZoneRoomMap(zones = []) {
    const map = new Map();
    (Array.isArray(zones) ? zones : []).forEach((zone) => {
      const name = String(zone?.name || '').trim();
      if (!name || this.isInfrastructureZone(name)) return;
      const number = this.inferRoomNumberFromZoneName(name);
      if (!number || !this.isValidRoomNumber(number)) return;
      const residents = this.sanitizeResidents(zone.residents || zone.occupants).length
        ? this.sanitizeResidents(zone.residents || zone.occupants)
        : this.parseResidentsFromZoneName(name);
      if (!map.has(number)) map.set(number, new Set());
      residents.forEach((item) => map.get(number).add(item));
    });
    return map;
  },

  parseResidentsFromZoneName(name = '') {
    const text = String(name || '').trim();
    const person = text.match(/^([\u4e00-\u9fff]{2,4})的(?:房|室|房间)/u);
    return person ? this.sanitizeResidents([person[1]]) : [];
  },

  homeUnit202Residents(store = {}, zones = []) {
    const profile = store.playerProfile || {};
    const player = profile.name || profile.displayName || '刘悠';
    const base = this.sanitizeResidents([player, '刘思琪', '刘思瑶', '刘思怡']);
    const merged = new Set(base);
    this.collectHouseholdFromZones(zones).forEach((name) => {
      if (this.isHouseholdMemberName(name)) merged.add(name);
    });
    return [...merged];
  },

  buildDiscoveredHomeFloors(store = {}, zones = []) {
    const residents202 = this.homeUnit202Residents(store, zones);
    const templateId = 'four_bedroom_one_living';
    const slotAssignments = this.templatesApi()?.autoSlotAssignments?.(templateId, residents202) || {};
    const layout = this.buildLayoutFromTemplate(templateId, { residents: residents202, slotAssignments });
    const floor2Numbers = ['201', '202', '203', '204'];
    const rooms = floor2Numbers.map((number) => this.normalizeRoom({
      id: `room_${number}`,
      number,
      name: number,
      residents: number === '202' ? residents202 : [],
      layoutTemplateId: number === '202' ? templateId : '',
      slotAssignments: number === '202' ? slotAssignments : {},
      layout: number === '202' ? layout : null,
    }));
    return [{ id: 'floor_2', name: '第二楼', rooms }];
  },

  normalizeRoom(raw = {}, index = 0) {
    const numberRaw = String(raw.number || raw.name || raw.room || '').trim();
    const number = this.isValidRoomNumber(numberRaw)
      ? numberRaw
      : (numberRaw.match(/(\d{3,4})/u)?.[1] || '');
    const residents = this.sanitizeResidents(raw.residents);
    const displayNumber = number || `R${index + 1}`;
    const layoutTemplateId = String(raw.layoutTemplateId || raw.templateId || '').trim();
    const slotAssignments = raw.slotAssignments && typeof raw.slotAssignments === 'object' ? raw.slotAssignments : {};
    let layout = raw.layout && typeof raw.layout === 'object' ? raw.layout : null;
    if (!layout?.shapes?.length && layoutTemplateId) {
      layout = this.buildLayoutFromTemplate(layoutTemplateId, { residents, slotAssignments });
    }
    return {
      id: String(raw.id || `room_${displayNumber}`),
      number: displayNumber,
      name: String(raw.name || displayNumber).slice(0, 16),
      residents,
      residentsText: residents.join('、'),
      layoutTemplateId,
      slotAssignments,
      layout,
      hasLayout: Boolean(layout?.shapes?.length),
    };
  },

  normalizeFloor(raw = {}, index = 0) {
    const rooms = (Array.isArray(raw.rooms) ? raw.rooms : [])
      .map((room, roomIndex) => this.normalizeRoom(room, roomIndex))
      .filter((room) => this.isValidRoomNumber(room.number) || room.residents.length);
    return {
      id: String(raw.id || `floor_${index + 1}`),
      name: String(raw.name || raw.label || `第${index + 1}楼`).slice(0, 12),
      rooms,
    };
  },

  isQualityFloors(floors = []) {
    const rooms = floors.flatMap((floor) => floor.rooms || []);
    if (!rooms.length) return false;
    if (rooms.some((room) => /^R\d+$/u.test(room.number))) return false;
    if (rooms.some((room) => /发现|走廊|入口|楼梯/u.test(room.residentsText || ''))) return false;
    return rooms.some((room) => this.isValidRoomNumber(room.number));
  },

  isHomeBuildingNode(node, store = {}) {
    const mapMod = window.GameModules.realWorldMap;
    const name = mapMod.cleanName(node?.name || '');
    const home = mapMod.inferHomeName(store.playerProfile || {});
    if (!name || !home) return false;
    return name === home || home.includes(name) || name.includes(home) || /3栋2单元/u.test(name);
  },

  ensureFloors(node, store = {}) {
    if (!node) return [];
    const layout = node.interiorLayout && typeof node.interiorLayout === 'object' ? node.interiorLayout : {};
    node.interiorLayout = layout;
    const zones = Array.isArray(layout.zones) ? layout.zones : [];

    let floors = [];
    if (this.isHomeBuildingNode(node, store)) {
      floors = this.buildDiscoveredHomeFloors(store, zones);
    } else if (Array.isArray(layout.floors) && layout.floors.length) {
      floors = layout.floors.map((floor, index) => this.normalizeFloor(floor, index));
    }

    floors = floors
      .map((floor, index) => this.normalizeFloor(floor, index))
      .filter((floor) => floor.rooms.length);

    const room202 = floors.flatMap((f) => f.rooms).find((room) => room.number === '202');
    if (room202 && !room202.hasLayout) {
      const templateId = room202.layoutTemplateId || this.templatesApi()?.suggestTemplateId?.(room202.residents.length) || 'four_bedroom_one_living';
      room202.layoutTemplateId = templateId;
      room202.layout = this.buildLayoutFromTemplate(templateId, {
        residents: room202.residents,
        slotAssignments: room202.slotAssignments,
      });
      room202.hasLayout = Boolean(room202.layout?.shapes?.length);
    }

    layout.floors = floors;
    return floors;
  },

  findRoom(floors = [], roomId = '') {
    const key = String(roomId || '');
    for (const floor of floors) {
      const room = (floor.rooms || []).find((item) => item.id === key || item.number === key || item.name === key);
      if (room) return { floor, room };
    }
    return { floor: null, room: null };
  },

  drawRoomLayout(canvas, layout = {}) {
    if (!canvas?.getContext) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width || layout.width || 480;
    const height = canvas.height || layout.height || 320;
    const shapes = Array.isArray(layout.shapes) ? layout.shapes : (this.defaultRoom202Layout()?.shapes || []);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#070f1f';
    ctx.fillRect(0, 0, width, height);
    shapes.forEach((shape) => {
      if (shape.type !== 'rect') return;
      const x = Number(shape.x) || 0;
      const y = Number(shape.y) || 0;
      const w = Number(shape.w) || 0;
      const h = Number(shape.h) || 0;
      if (shape.fill) {
        ctx.fillStyle = shape.fill;
        ctx.fillRect(x, y, w, h);
      }
      if (shape.stroke !== false) {
        ctx.strokeStyle = shape.strokeColor || 'rgba(116,246,255,0.55)';
        ctx.lineWidth = Number(shape.lineWidth) || 1.5;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      }
      if (shape.label) {
        ctx.fillStyle = '#eef3ff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(shape.label), x + w / 2, y + h / 2);
      }
    });
  },
};
