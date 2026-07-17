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

  genericRoomLayout(room = {}) {
    const title = String(room.name || room.number || room.kind || '房间').trim();
    const kind = String(room.kind || title || '').trim();
    const rect = (id, x, y, w, h, label, fill = 'rgba(116,246,255,0.10)') => ({
      type: 'rect', id, x, y, w, h, label, fill, strokeColor: 'rgba(116,246,255,0.55)',
    });
    const layout = { width: 480, height: 320, shapes: [] };
    if (/走廊|过道|电梯|楼梯|门厅/u.test(kind)) {
      layout.shapes = [
        rect('corridor', 36, 118, 408, 72, title || '走廊', 'rgba(87,199,255,0.10)'),
        rect('door_left', 56, 88, 70, 30, '门', 'rgba(255,209,102,0.12)'),
        rect('door_right', 354, 190, 70, 30, '门', 'rgba(255,209,102,0.12)'),
      ];
      return layout;
    }
    if (/客厅|起居/u.test(kind)) {
      layout.shapes = [
        rect('sofa', 56, 68, 150, 54, '沙发'),
        rect('tea_table', 226, 92, 92, 44, '茶几', 'rgba(255,223,138,0.10)'),
        rect('tv', 350, 58, 58, 112, '电视柜'),
        rect('activity', 72, 214, 320, 44, '活动区', 'rgba(34,240,173,0.10)'),
      ];
      return layout;
    }
    if (/厨房/u.test(kind)) {
      layout.shapes = [
        rect('counter', 46, 50, 360, 48, '料理台'),
        rect('stove', 64, 126, 82, 66, '灶台'),
        rect('sink', 174, 126, 82, 66, '水槽'),
        rect('fridge', 318, 126, 72, 92, '冰箱'),
      ];
      return layout;
    }
    if (/卫生间|洗手间|浴室/u.test(kind)) {
      layout.shapes = [
        rect('shower', 54, 52, 126, 92, '淋浴区'),
        rect('toilet', 228, 66, 86, 64, '马桶'),
        rect('sink', 330, 164, 86, 52, '洗手台'),
      ];
      return layout;
    }
    layout.shapes = [
      rect('bed', 56, 58, 150, 88, '床', 'rgba(116,246,255,0.12)'),
      rect('desk', 250, 58, 120, 52, '书桌'),
      rect('closet', 56, 190, 110, 54, '衣柜'),
      rect('door', 330, 206, 58, 38, '门', 'rgba(255,209,102,0.12)'),
    ];
    return layout;
  },

  resolveRoomLayout(room = {}) {
    const normalizedLayout = this.normalizeRoomLayout(room.layout, {
      slotObjects: room.slotObjects || {},
      slotObjectContents: room.slotObjectContents || {},
    });
    if (normalizedLayout?.shapes?.length) return normalizedLayout;
    const templateId = room.layoutTemplateId || room.templateId;
    if (!templateId) return this.genericRoomLayout(room);
    return this.buildLayoutFromTemplate(templateId, {
      residents: room.residents || [],
      slotAssignments: room.slotAssignments || {},
      slotObjects: room.slotObjects || {},
      slotObjectContents: room.slotObjectContents || {},
    }) || this.genericRoomLayout(room);
  },

  defaultRoom202Layout() {
    return this.buildLayoutFromTemplate('four_bedroom_one_living', {
      residents: ['刘悠', '刘思琪', '刘思瑶', '刘思怡'],
      slotAssignments: { bed_1: '刘悠', bed_2: '刘思琪', bed_3: '刘思瑶', bed_4: '刘思怡' },
      slotObjects: this.defaultSlotObjects('four_bedroom_one_living', { bed_1: '刘悠', bed_2: '刘思琪', bed_3: '刘思瑶', bed_4: '刘思怡' }),
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

  normalizeObjectLabel(item) {
    if (item && typeof item === 'object') {
      return String(item.name || item.label || item.title || item.objectName || item.id || '').trim().slice(0, 18);
    }
    return String(item || '').trim().slice(0, 18);
  },

  normalizeObjectLabels(value) {
    const rows = Array.isArray(value)
      ? value
      : (value && typeof value === 'object'
        ? (this.normalizeObjectLabel(value) ? [value] : Object.values(value))
        : String(value || '').split(/[、,，;；/|]/u));
    return [...new Set(rows.map((item) => this.normalizeObjectLabel(item)).filter(Boolean))].slice(0, 24);
  },

  normalizeObjectRect(item = {}) {
    if (!item || typeof item !== 'object') return null;
    const rawX = Number(item.x ?? item.left);
    const rawY = Number(item.y ?? item.top);
    const rawW = Number(item.w ?? item.width);
    const rawH = Number(item.h ?? item.height);
    if (![rawX, rawY, rawW, rawH].every(Number.isFinite) || rawW <= 0 || rawH <= 0) return null;
    const w = Math.max(12, Math.min(460, rawW));
    const h = Math.max(10, Math.min(300, rawH));
    return {
      x: Math.round(Math.max(0, Math.min(480 - w, rawX))),
      y: Math.round(Math.max(0, Math.min(320 - h, rawY))),
      w: Math.round(w),
      h: Math.round(h),
    };
  },

  normalizeSlotObjectItem(item, index = 0, areaLabel = '') {
    const label = this.normalizeObjectLabel(item);
    if (!label) return null;
    if (!item || typeof item !== 'object') return label;
    const rect = this.normalizeObjectRect(item);
    const containerContents = this.normalizeObjectLabels(
      item.containerContents || item.contents || item.containedItems || item.insideObjects || item.onObjects,
    );
    const out = { name: label };
    const id = String(item.id || item.key || '').trim().slice(0, 48);
    if (id) out.id = id;
    if (rect) Object.assign(out, rect);
    if (containerContents.length) out.containerContents = containerContents;
    if (typeof item.fill === 'string' && item.fill.trim()) out.fill = item.fill.trim().slice(0, 64);
    if (typeof item.strokeColor === 'string' && item.strokeColor.trim()) out.strokeColor = item.strokeColor.trim().slice(0, 64);
    return Object.keys(out).length > 1 ? out : label;
  },

  normalizeSlotObjectList(value = [], areaLabel = '') {
    const rows = Array.isArray(value)
      ? value
      : (value && typeof value === 'object' && this.normalizeObjectLabel(value)
        ? [value]
        : (value && typeof value === 'object' ? Object.values(value) : String(value || '').split(/[、,，;；/|]/u)));
    const seen = new Set();
    const objects = [];
    rows.forEach((item, index) => {
      const normalized = this.normalizeSlotObjectItem(item, index, areaLabel);
      const label = this.normalizeObjectLabel(normalized);
      if (!label) return;
      const key = normalized && typeof normalized === 'object' ? (normalized.id || normalized.name) : label;
      if (seen.has(key)) return;
      seen.add(key);
      objects.push(normalized);
    });
    return objects.slice(0, 24);
  },

  normalizeSlotObjects(value = {}) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value)
      .map(([slot, objects]) => [String(slot || '').trim(), this.normalizeSlotObjectList(objects, slot)])
      .filter(([slot, objects]) => slot && objects.length));
  },

  normalizeSlotObjectContents(value = {}) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).map(([slot, contents]) => {
      if (!contents || typeof contents !== 'object' || Array.isArray(contents)) return [String(slot || '').trim(), {}];
      const normalized = Object.fromEntries(Object.entries(contents)
        .map(([objectName, rows]) => [String(objectName || '').trim(), this.normalizeObjectLabels(rows)])
        .filter(([objectName, rows]) => objectName && rows.length));
      return [String(slot || '').trim(), normalized];
    }).filter(([slot, contents]) => slot && Object.keys(contents).length));
  },

  normalizeRoomLayoutShape(shape = {}, index = 0, options = {}) {
    if (!shape || typeof shape !== 'object') return null;
    const type = String(shape.type || 'rect').trim();
    if (type !== 'rect') return null;
    const rect = this.normalizeObjectRect(shape);
    if (!rect) return null;
    const id = String(shape.id || shape.key || shape.slot || `ai_area_${index + 1}`).trim().slice(0, 48);
    const label = String(shape.label || shape.name || shape.defaultLabel || id).trim().slice(0, 24);
    if (!id || !label) return null;
    const slotKey = String(shape.slot || shape.id || '').trim();
    const slotObjects = options.slotObjects && typeof options.slotObjects === 'object' ? options.slotObjects : {};
    const slotObjectContents = options.slotObjectContents && typeof options.slotObjectContents === 'object' ? options.slotObjectContents : {};
    const objects = this.normalizeSlotObjectList(
      shape.objects || shape.objectLabels || shape.items || shape.contents || (slotKey ? slotObjects[slotKey] : null),
      label,
    );
    const contentsMap = slotKey && slotObjectContents[slotKey] && typeof slotObjectContents[slotKey] === 'object'
      ? slotObjectContents[slotKey]
      : null;
    const objectContents = Object.fromEntries(objects
      .filter((object) => object && typeof object === 'object' && Array.isArray(object.containerContents) && object.containerContents.length)
      .flatMap((object) => [object.id, object.name].filter(Boolean).map((key) => [key, object.containerContents])));
    const normalizedContents = contentsMap
      ? Object.fromEntries(Object.entries(contentsMap)
        .map(([name, rows]) => [String(name || '').trim(), this.normalizeObjectLabels(rows)])
        .filter(([name, rows]) => name && rows.length))
      : {};
    const out = {
      type: 'rect',
      id,
      ...rect,
      label,
      fill: typeof shape.fill === 'string' && shape.fill.trim() ? shape.fill.trim().slice(0, 64) : 'rgba(255,255,255,0.06)',
      stroke: shape.stroke !== false,
      strokeColor: typeof shape.strokeColor === 'string' && shape.strokeColor.trim() ? shape.strokeColor.trim().slice(0, 64) : 'rgba(255,255,255,0.2)',
    };
    if (slotKey) out.slot = slotKey;
    if (objects.length) out.objects = objects;
    if (Object.keys(objectContents).length || Object.keys(normalizedContents).length) {
      out.containerContentsByObject = { ...objectContents, ...normalizedContents };
    }
    if (Number.isFinite(Number(shape.lineWidth))) out.lineWidth = Math.max(1, Math.min(8, Number(shape.lineWidth)));
    if (shape.interactive === false) out.interactive = false;
    if (shape.labelVisible === false) out.labelVisible = false;
    if (shape.hitMode === 'border') out.hitMode = 'border';
    if (Number.isFinite(Number(shape.hitBorderWidth))) out.hitBorderWidth = Math.max(3, Math.min(32, Number(shape.hitBorderWidth)));
    return out;
  },

  normalizeRoomLayout(layout = null, options = {}) {
    if (!layout || typeof layout !== 'object' || !Array.isArray(layout.shapes)) return null;
    const shapes = layout.shapes
      .slice(0, 48)
      .map((shape, index) => this.normalizeRoomLayoutShape(shape, index, options))
      .filter(Boolean);
    if (!shapes.length) return null;
    return {
      width: 480,
      height: 320,
      source: String(layout.source || 'ai').slice(0, 24),
      shapes,
    };
  },

  defaultSlotObjects(templateId = '', slotAssignments = {}) {
    const slots = this.templatesApi()?.list?.().find((item) => item.id === templateId)?.slots || [];
    const out = {};
    slots.forEach((slot) => {
      const label = String(slotAssignments?.[slot] || '').trim();
      if (/^(bed_\d+|master|suite_\d+|guest_\d+)$/u.test(slot)) out[slot] = ['床', '书桌', '衣柜', '床头柜', '台灯'];
      else if (/living|hall|grand_hall|foyer/u.test(slot)) out[slot] = ['沙发', '茶几', '电视柜', '地毯'];
      else if (/kitchen/u.test(slot)) out[slot] = ['料理台', '灶台', '水槽', '冰箱'];
      else if (/bathroom/u.test(slot)) out[slot] = ['淋浴区', '马桶', '洗手台', '镜柜'];
      else if (/dining/u.test(slot)) out[slot] = ['餐桌', '餐椅', '餐边柜'];
      else if (/study/u.test(slot)) out[slot] = ['书桌', '书架', '椅子'];
      else if (/terrace|garden/u.test(slot)) out[slot] = ['盆栽', '栏杆', '户外椅'];
      if (label && out[slot]) out[slot] = out[slot].slice(0, 8);
    });
    return out;
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
    const person = text.match(/^([\u4e00-\u9fff]{2,4})的(?:房|室|房间|卧室)/u);
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
    const slotObjects = this.defaultSlotObjects(templateId, slotAssignments);
    const layout = this.buildLayoutFromTemplate(templateId, { residents: residents202, slotAssignments, slotObjects });
    const floor2Numbers = ['201', '202', '203', '204'];
    const rooms = floor2Numbers.map((number) => this.normalizeRoom({
      id: `room_${number}`,
      number,
      name: number,
      residents: number === '202' ? residents202 : [],
      layoutTemplateId: number === '202' ? templateId : '',
      slotAssignments: number === '202' ? slotAssignments : {},
      slotObjects: number === '202' ? slotObjects : {},
      layout: number === '202' ? layout : null,
    }));
    return [{ id: 'floor_2', name: '第二层', rooms }];
  },

  normalizeRoom(raw = {}, index = 0) {
    const labelRaw = String(raw.number || raw.name || raw.room || raw.label || '').trim();
    const number = this.isValidRoomNumber(labelRaw)
      ? labelRaw
      : (labelRaw.match(/(\d{3,4})/u)?.[1] || '');
    const residents = this.sanitizeResidents(raw.residents || raw.occupants);
    const displayName = String(raw.name || raw.label || number || labelRaw || `房间${index + 1}`).trim().slice(0, 16);
    const displayNumber = number || displayName;
    const layoutTemplateId = String(raw.layoutTemplateId || raw.templateId || '').trim();
    const slotAssignments = raw.slotAssignments && typeof raw.slotAssignments === 'object' ? raw.slotAssignments : {};
    const slotObjects = this.normalizeSlotObjects(raw.slotObjects || raw.layoutObjects || raw.objectsBySlot || raw.shapeObjects);
    const slotObjectContents = this.normalizeSlotObjectContents(raw.slotObjectContents || raw.containerContentsBySlot || raw.objectContentsBySlot || raw.contentsBySlot);
    let layout = this.normalizeRoomLayout(raw.layout || raw.roomLayout || raw.floorPlan, { slotObjects, slotObjectContents });
    if (!layout?.shapes?.length && layoutTemplateId) {
      layout = this.buildLayoutFromTemplate(layoutTemplateId, { residents, slotAssignments, slotObjects, slotObjectContents });
    }
    return {
      id: String(raw.id || `room_${displayNumber || index + 1}`),
      number: displayNumber,
      name: displayName,
      kind: String(raw.kind || raw.type || '').trim().slice(0, 12),
      residents,
      residentsText: residents.join('、'),
      layoutTemplateId,
      slotAssignments,
      slotObjects,
      slotObjectContents,
      layout,
      hasLayout: Boolean(layout?.shapes?.length),
    };
  },

  normalizeFloor(raw = {}, index = 0) {
    const rooms = (Array.isArray(raw.rooms) ? raw.rooms : [])
      .map((room, roomIndex) => this.normalizeRoom(room, roomIndex))
      .filter((room) => room.number || room.name || room.residents.length);
    return {
      id: String(raw.id || `floor_${index + 1}`),
      name: String(raw.name || raw.label || `第${index + 1}层`).slice(0, 12),
      order: raw.order,
      rooms,
    };
  },

  isQualityFloors(floors = []) {
    const rooms = floors.flatMap((floor) => floor.rooms || []);
    if (!rooms.length) return false;
    if (rooms.some((room) => /^R\d+$/u.test(room.number))) return false;
    if (rooms.some((room) => /\u53d1\u73b0|\u8d70\u5eca|\u5165\u53e3|\u697c\u68af/u.test(room.residentsText || ''))) return false;
    return rooms.some((room) => this.isValidRoomNumber(room.number) || room.name);
  },

  isHomeBuildingNode(node, store = {}) {
    const mapMod = window.GameModules.realWorldMap;
    if (!mapMod?.cleanName || !mapMod?.inferHomeName) return false;
    const name = mapMod.cleanName(node?.name || '');
    const home = mapMod.inferHomeName(store.playerProfile || {});
    if (!name || !home) return false;
    return name === home || home.includes(name) || name.includes(home);
  },

  isApartmentBuildingNode(node, store = {}) {
    const mapMod = window.GameModules.realWorldMap;
    if (!mapMod?.cleanName || !mapMod?.inferHomeName) return /小区|公寓|单元|栋|幢|号楼|座/u.test(String(node?.name || ''));
    const name = mapMod.cleanName(node?.name || '');
    const home = mapMod.cleanName(mapMod.inferHomeName(store.playerProfile || {}));
    const text = `${name} ${home}`;
    if (/别墅|独栋|合院|庄园|平层/u.test(text)) return false;
    return /小区|公寓|单元|栋|幢|号楼|座/u.test(text);
  },

  hasNumberedRooms(floors = []) {
    return (Array.isArray(floors) ? floors : []).some((floor) => (
      (floor.rooms || []).some((room) => this.isValidRoomNumber(room.number) || this.isValidRoomNumber(room.name))
    ));
  },

  parseCnFloorNumber(text = '') {
    const raw = String(text || '').trim();
    const digit = raw.match(/(?:第)?(\d{1,3})\s*[层楼]/u) || raw.match(/(\d{1,3})\s*(?:F|f|楼)/u);
    if (digit) return Math.max(1, Number(digit[1]) || 1);
    const cn = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
    const cnMatch = raw.match(/(?:第)?([一二三四五六七八九十]{1,3})[层楼]/u);
    if (!cnMatch) return 0;
    const chars = cnMatch[1];
    if (chars === '十') return 10;
    if (chars.startsWith('十')) return 10 + (cn[chars[1]] || 0);
    if (chars.includes('十')) return (cn[chars[0]] || 1) * 10 + (cn[chars[2]] || 0);
    return cn[chars] || 0;
  },

  floorDisplayName(rank = 1) {
    const n = Math.max(1, Number(rank) || 1);
    const cn = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    if (n <= 10) return `第${cn[n]}层`;
    return `第${n}层`;
  },

  inferZoneKind(zone = {}) {
    const text = String([zone.kind, zone.name, zone.description].filter(Boolean).join(' '));
    if (/走廊|过道/u.test(text)) return '走廊';
    if (/楼梯/u.test(text)) return '楼梯间';
    if (/电梯/u.test(text)) return '电梯间';
    if (/客厅|起居/u.test(text)) return '客厅';
    if (/厨房/u.test(text)) return '厨房';
    if (/卫生间|洗手间|浴室/u.test(text)) return '卫生间';
    if (/卧室|房间|的房/u.test(text)) return '卧室';
    return String(zone.kind || '房间').slice(0, 12);
  },

  zoneRoomName(zone = {}, index = 0) {
    const raw = String(zone.name || zone.label || '').trim();
    const person = raw.match(/^([\u4e00-\u9fff]{2,4})的(?:房|室|房间|卧室)/u);
    if (person) return `${person[1]}的卧室`;
    if (raw) return raw.replace(/^第?[一二三四五六七八九十\d]+[层楼]/u, '').trim() || raw;
    return `空间${index + 1}`;
  },

  roomFromZone(zone = {}, index = 0) {
    const kind = this.inferZoneKind(zone);
    const name = this.zoneRoomName(zone, index);
    const residents = this.sanitizeResidents(zone.residents || zone.occupants).length
      ? this.sanitizeResidents(zone.residents || zone.occupants)
      : this.parseResidentsFromZoneName(name);
    return this.normalizeRoom({
      id: zone.id || `zone_room_${index + 1}`,
      name,
      kind,
      residents,
      layoutTemplateId: kind === '卧室' ? 'single_room' : '',
      layout: zone.layout,
    }, index);
  },

  buildFloorsFromZones(zones = [], node = {}, store = {}) {
    const rows = (Array.isArray(zones) ? zones : []).filter((zone) => String(zone?.name || zone?.label || '').trim());
    if (!rows.length) return [];
    const explicitRanks = rows
      .map((zone) => this.parseCnFloorNumber([zone.name, zone.description].filter(Boolean).join(' ')))
      .filter(Boolean);
    const currentRank = this.parseCnFloorNumber(store.realWorldLocationName || store.realWorldMap?.current || node.name || '');
    const defaultRank = explicitRanks[0] || currentRank || 1;
    const groups = new Map();
    rows.forEach((zone, index) => {
      const rank = this.parseCnFloorNumber([zone.name, zone.description].filter(Boolean).join(' ')) || defaultRank;
      if (!groups.has(rank)) groups.set(rank, []);
      groups.get(rank).push(this.roomFromZone(zone, index));
    });
    return [...groups.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([rank, rooms]) => ({
        id: `floor_${rank}`,
        name: this.floorDisplayName(rank),
        order: rank,
        rooms: rooms
          .filter((room, index, list) => list.findIndex((item) => item.id === room.id || item.name === room.name) === index)
          .sort((a, b) => String(a.number || a.name).localeCompare(String(b.number || b.name), 'zh-Hans-CN', { numeric: true })),
      }));
  },

  floorRank(floor = {}, index = 0) {
    if (Number.isFinite(Number(floor.order))) return Number(floor.order);
    const text = String(floor.name || floor.id || '').trim();
    const basement = /\u5730\u4e0b|B(\d+)/i.exec(text);
    if (basement) return -Number(basement[1] || 1);
    const digit = text.match(/-?\d+/u);
    if (digit) return Number(digit[0]);
    const cn = { '\u4e00': 1, '\u4e8c': 2, '\u4e09': 3, '\u56db': 4, '\u4e94': 5, '\u516d': 6, '\u4e03': 7, '\u516b': 8, '\u4e5d': 9, '\u5341': 10 };
    const cnMatch = text.match(/\u7b2c?([\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341]{1,3})[\u5c42\u697c]/u);
    if (cnMatch) {
      const chars = cnMatch[1];
      if (chars === '\u5341') return 10;
      if (chars.startsWith('\u5341')) return 10 + (cn[chars[1]] || 0);
      if (chars.includes('\u5341')) return (cn[chars[0]] || 1) * 10 + (cn[chars[2]] || 0);
      return cn[chars] || index;
    }
    return 1000 + index;
  },

  ensureFloors(node, store = {}) {
    if (!node) return [];
    const layout = node.interiorLayout && typeof node.interiorLayout === 'object' ? node.interiorLayout : {};
    node.interiorLayout = layout;

    let floors = Array.isArray(layout.floors) ? layout.floors.map((floor, index) => this.normalizeFloor(floor, index)) : [];
    floors = floors
      .filter((floor) => floor.rooms.length)
      .map((floor, index) => ({ ...floor, _sourceIndex: index }))
      .sort((a, b) => this.floorRank(a, a._sourceIndex) - this.floorRank(b, b._sourceIndex))
      .map(({ _sourceIndex, ...floor }) => ({
        ...floor,
        rooms: (floor.rooms || []).slice().sort((a, b) => String(a.number || a.name).localeCompare(String(b.number || b.name), 'zh-Hans-CN', { numeric: true })),
      }));

    const needsHomeApartmentFallback = this.isHomeBuildingNode(node, store)
      && this.isApartmentBuildingNode(node, store)
      && !this.hasNumberedRooms(floors);

    if (needsHomeApartmentFallback) {
      const homeFloors = this.buildDiscoveredHomeFloors(store, layout.zones || []);
      if (homeFloors.length) floors = homeFloors;
    } else if (!this.isQualityFloors(floors)) {
      const zoneFloors = this.buildFloorsFromZones(layout.zones || [], node, store);
      if (zoneFloors.length) floors = zoneFloors;
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

  findFloor(floors = [], floorId = '') {
    const key = String(floorId || '');
    return (Array.isArray(floors) ? floors : []).find((floor) => floor.id === key || floor.name === key) || null;
  },

  roomDisplayTitle(room = {}) {
    room = room || {};
    const number = String(room.number || '').trim();
    const name = String(room.name || '').trim();
    const kind = String(room.kind || '').trim();
    if (name && (name !== number || !this.isValidRoomNumber(number))) return name;
    if (kind && !/^\d{3,4}$/u.test(number)) return `${number || name || '房间'} · ${kind}`;
    return number || name || '未命名房间';
  },

  roomObjectLabels(room = {}) {
    const layout = this.resolveRoomLayout(room);
    const labels = [];
    (Array.isArray(layout?.shapes) ? layout.shapes : []).forEach((shape) => {
      const label = String(shape?.label || '').trim();
      if (label && !labels.includes(label)) labels.push(label);
    });
    const drillable = this.roomLayoutRegions(layout)
      .filter((region) => this.isDrillableRoomRegion(region))
      .map((region) => region.label)
      .filter((label, index, list) => label && list.indexOf(label) === index);
    return drillable.length ? drillable : labels.filter((label) => !/^(门|窗)$/u.test(label));
  },

  roomShapeLabel(shape = {}) {
    return String(shape.label || shape.defaultLabel || shape.id || shape.slot || '').trim();
  },

  roomShapeRegionId(shape = {}, index = 0) {
    const label = this.roomShapeLabel(shape);
    return String(shape.id || shape.slot || `shape_${index}_${label || 'area'}`);
  },

  roomShapeObjectLabels(shape = {}) {
    const explicit = this.normalizeObjectLabels(shape.objects || shape.objectLabels || shape.items || shape.contents);
    if (explicit.length) return explicit;
    const label = this.roomShapeLabel(shape);
    const text = `${label} ${shape.id || ''} ${shape.slot || ''}`;
    if (/卧室|主卧|次卧|床位|bed|master|suite/u.test(text)) return ['床', '书桌', '衣柜', '床头柜', '台灯', '书架', '梳妆台', '地毯', '墙面', '窗', '门'];
    if (/客厅|起居|景观|living/u.test(text)) return ['沙发', '茶几', '电视柜', '地毯', '落地灯', '书架', '置物架', '盆栽', '墙面', '窗'];
    if (/厨房|料理|灶|水槽|冰箱|kitchen/u.test(text)) return ['料理台', '灶台', '水槽', '冰箱', '橱柜', '置物架', '垃圾桶'];
    if (/卫生间|洗手|浴|马桶|bathroom|toilet|sink/u.test(text)) return ['淋浴区', '马桶', '洗手台', '镜柜', '毛巾架', '洗衣篮', '置物架'];
    if (/餐厅|dining/u.test(text)) return ['餐桌', '餐椅', '餐边柜', '吊灯', '置物架', '墙面'];
    if (/书房|study/u.test(text)) return ['书桌', '书架', '椅子', '台灯', '文件柜', '地毯', '墙面'];
    if (/衣柜|closet/u.test(text)) return ['挂衣区', '抽屉', '收纳盒'];
    if (/门/u.test(text)) return ['门扇', '门锁', '门把手'];
    if (/窗/u.test(text)) return ['窗框', '窗帘', '窗台'];
    if (/露台|阳台|terrace|garden/u.test(text)) return ['盆栽', '栏杆', '户外椅'];
    return label ? [label] : ['待观察摆件'];
  },

  roomShapeObjectItems(shape = {}) {
    return this.normalizeSlotObjectList(
      shape.objects || shape.objectSpecs || shape.objectLabels || shape.items || shape.contents,
      this.roomShapeLabel(shape),
    );
  },

  roomLayoutRegions(layout = {}) {
    const shapes = Array.isArray(layout?.shapes) ? layout.shapes : [];
    return shapes.map((shape, index) => {
      if (shape?.type !== 'rect') return null;
      if (shape.interactive === false) return null;
      const label = this.roomShapeLabel(shape);
      if (!label) return null;
      const x = Number(shape.x) || 0;
      const y = Number(shape.y) || 0;
      const w = Number(shape.w) || 0;
      const h = Number(shape.h) || 0;
      if (w <= 0 || h <= 0) return null;
      return {
        id: this.roomShapeRegionId(shape, index),
        index,
        label,
        shape,
        x,
        y,
        w,
        h,
      };
    }).filter(Boolean);
  },

  regionContainsPoint(region = {}, x = 0, y = 0) {
    const inside = x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h;
    if (!inside) return false;
    const hitMode = String(region.shape?.hitMode || '');
    if (hitMode !== 'border') return true;
    const border = Math.max(3, Number(region.shape?.hitBorderWidth) || Number(region.shape?.lineWidth) || 10);
    return x <= region.x + border
      || x >= region.x + region.w - border
      || y <= region.y + border
      || y >= region.y + region.h - border;
  },

  isDrillableRoomRegion(region = {}) {
    const text = `${region.label || ''} ${region.id || ''} ${region.shape?.slot || ''}`.trim();
    if (!text || /门|窗|墙|wall|door|window/u.test(text)) return false;
    return /卧室|主卧|次卧|房间|客厅|起居|厨房|卫生间|浴室|餐厅|书房|bed_|master|suite|living|kitchen|bathroom|dining|study/u.test(text);
  },

  objectShapeId(label = '', index = 0) {
    const known = [
      [/床头柜/u, 'bedside_table'],
      [/床/u, 'bed'],
      [/书桌|桌/u, 'desk'],
      [/电视/u, 'tv_cabinet'],
      [/镜/u, 'mirror_cabinet'],
      [/餐边柜/u, 'sideboard'],
      [/文件柜/u, 'file_cabinet'],
      [/鞋柜/u, 'shoe_cabinet'],
      [/梳妆台/u, 'dresser'],
      [/置物架|收纳架/u, 'shelf'],
      [/毛巾架/u, 'towel_rack'],
      [/洗衣篮|脏衣篮/u, 'laundry_basket'],
      [/垃圾桶/u, 'trash_bin'],
      [/盆栽|植物/u, 'plant'],
      [/花瓶/u, 'vase'],
      [/空调/u, 'air_conditioner'],
      [/衣柜|衣橱|衣帽柜/u, 'closet'],
      [/台灯|灯/u, 'lamp'],
      [/沙发/u, 'sofa'],
      [/茶几/u, 'tea_table'],
      [/地毯/u, 'rug'],
      [/料理台|操作台/u, 'counter'],
      [/灶/u, 'stove'],
      [/水槽/u, 'sink'],
      [/冰箱/u, 'fridge'],
      [/淋浴/u, 'shower'],
      [/马桶/u, 'toilet'],
      [/洗手台|洗手/u, 'washstand'],
      [/镜/u, 'mirror_cabinet'],
      [/餐桌/u, 'dining_table'],
      [/餐椅/u, 'dining_chair'],
      [/书架/u, 'bookshelf'],
      [/门/u, 'door'],
      [/窗/u, 'window'],
    ];
    const hit = known.find(([pattern]) => pattern.test(label));
    return hit ? hit[1] : `object_${index + 1}`;
  },

  objectPresetRect(label = '', index = 0, areaText = '') {
    const text = `${label} ${areaText}`;
    const presets = [
      [/床头柜/u, [216, 76, 44, 42, 'rgba(255,223,138,0.12)']],
      [/床/u, [54, 58, 154, 92, 'rgba(116,246,255,0.14)']],
      [/衣柜|衣橱|衣帽柜/u, [54, 196, 118, 54, 'rgba(255,143,178,0.12)']],
      [/书桌|写字桌/u, [262, 58, 126, 54, 'rgba(116,246,255,0.10)']],
      [/台灯|落地灯|吊灯/u, [304, 130, 56, 34, 'rgba(255,223,138,0.16)']],
      [/沙发/u, [58, 70, 170, 58, 'rgba(116,246,255,0.12)']],
      [/茶几/u, [246, 88, 92, 46, 'rgba(255,223,138,0.12)']],
      [/电视柜|电视/u, [360, 62, 58, 122, 'rgba(116,246,255,0.10)']],
      [/地毯/u, [88, 202, 260, 52, 'rgba(34,240,173,0.10)']],
      [/料理台|操作台|橱柜/u, [56, 56, 340, 46, 'rgba(116,246,255,0.10)']],
      [/灶/u, [70, 132, 84, 62, 'rgba(255,143,178,0.12)']],
      [/水槽/u, [184, 132, 84, 62, 'rgba(116,246,255,0.12)']],
      [/冰箱/u, [326, 128, 72, 92, 'rgba(255,223,138,0.10)']],
      [/淋浴/u, [58, 56, 126, 94, 'rgba(116,246,255,0.12)']],
      [/马桶/u, [232, 70, 86, 64, 'rgba(255,255,255,0.08)']],
      [/洗手台/u, [332, 166, 88, 52, 'rgba(116,246,255,0.10)']],
      [/镜柜|镜/u, [332, 112, 88, 36, 'rgba(255,223,138,0.10)']],
      [/餐桌/u, [132, 86, 180, 82, 'rgba(255,223,138,0.12)']],
      [/餐椅/u, [132 + (index % 4) * 46, 190, 40, 34, 'rgba(116,246,255,0.08)']],
      [/书架/u, [56, 58, 86, 150, 'rgba(255,143,178,0.10)']],
      [/梳妆台/u, [258, 188, 116, 52, 'rgba(255,143,178,0.10)']],
      [/置物架|收纳架/u, [382, 120, 46, 112, 'rgba(116,246,255,0.08)']],
      [/文件柜|鞋柜/u, [48, 224, 96, 46, 'rgba(255,143,178,0.10)']],
      [/毛巾架/u, [382, 74, 50, 30, 'rgba(255,223,138,0.10)']],
      [/洗衣篮|脏衣篮/u, [72, 226, 58, 42, 'rgba(116,246,255,0.08)']],
      [/垃圾桶/u, [382, 230, 42, 38, 'rgba(255,255,255,0.08)']],
      [/盆栽|植物/u, [374, 192, 52, 52, 'rgba(34,240,173,0.10)']],
      [/花瓶/u, [296, 132, 42, 36, 'rgba(255,223,138,0.12)']],
      [/空调/u, [332, 42, 88, 32, 'rgba(116,246,255,0.08)']],
      [/椅子/u, [282, 122, 62, 48, 'rgba(116,246,255,0.08)']],
      [/门/u, [330, 258, 80, 12, 'rgba(255,209,102,0.18)']],
      [/窗/u, [190, 28, 110, 10, 'rgba(116,246,255,0.22)']],
    ];
    const hit = presets.find(([pattern]) => pattern.test(text));
    if (hit) return hit[1];
    const col = index % 3;
    const row = Math.floor(index / 3);
    return [68 + col * 126, 74 + row * 74, 96, 46, 'rgba(116,246,255,0.09)'];
  },

  objectLayoutRect(object = '', index = 0, areaText = '') {
    if (object && typeof object === 'object') {
      const rect = this.normalizeObjectRect(object);
      if (rect) {
        const fill = typeof object.fill === 'string' && object.fill.trim()
          ? object.fill.trim()
          : 'rgba(116,246,255,0.10)';
        return [rect.x, rect.y, rect.w, rect.h, fill];
      }
    }
    return this.objectPresetRect(this.normalizeObjectLabel(object), index, areaText);
  },

  objectContainerRelation(label = '') {
    const text = String(label || '');
    if (/衣柜|衣橱|衣帽柜|柜|冰箱|抽屉|箱|盒|书架|镜柜/u.test(text)) return '里面';
    if (/地板|地面|地毯/u.test(text)) return '上';
    if (/墙|墙面|壁/u.test(text)) return '上';
    if (/床|书桌|桌|茶几|餐桌|电视柜|洗手台|料理台|灶台|水槽|窗|窗台|置物架|花架|鞋柜|梳妆台/u.test(text)) return '上';
    if (/门/u.test(text)) return '上';
    return '相关物品';
  },

  defaultContainerContents(label = '', areaLabel = '') {
    const text = `${label} ${areaLabel}`;
    const rules = [
      [/床头柜/u, ['手机充电器', '纸巾', '水杯', '小抽屉']],
      [/床/u, ['床单', '被子', '枕头', '床垫', '睡衣']],
      [/衣柜|衣橱|衣帽柜/u, ['衣服', '裙子', '内衣', '袜子', '收纳盒']],
      [/书桌|写字桌/u, ['书籍', '笔记本', '文具', '台灯底座', '充电线']],
      [/台灯|落地灯|吊灯/u, ['灯罩', '灯泡', '开关', '小花瓶']],
      [/地板|地面/u, ['拖鞋', '地毯', '散落书本', '数据线']],
      [/墙|墙面|壁/u, ['挂画', '照片墙', '时钟', '开关面板', '壁挂置物架']],
      [/沙发/u, ['抱枕', '毯子', '遥控器']],
      [/茶几/u, ['水杯', '纸巾盒', '杂志', '果盘']],
      [/电视柜|电视/u, ['遥控器', '机顶盒', '游戏手柄', '收纳抽屉']],
      [/地毯/u, ['拖鞋', '靠垫', '落下的小物件']],
      [/料理台|操作台|橱柜/u, ['砧板', '调料瓶', '餐具', '收纳柜']],
      [/灶/u, ['锅具', '锅铲', '调味罐']],
      [/水槽/u, ['洗洁精', '海绵', '沥水篮']],
      [/冰箱/u, ['饮料', '水果', '便当盒', '冷冻食品']],
      [/淋浴/u, ['洗发水', '沐浴露', '浴巾']],
      [/马桶/u, ['纸巾', '清洁刷', '垃圾桶']],
      [/洗手台/u, ['牙刷杯', '洗面奶', '毛巾']],
      [/镜柜|镜/u, ['护肤品', '梳子', '备用牙刷']],
      [/餐桌/u, ['餐具', '水杯', '桌垫']],
      [/餐椅/u, ['坐垫', '靠背套']],
      [/书架/u, ['书籍', '文件夹', '相框', '小摆件']],
      [/置物架|收纳架/u, ['收纳盒', '摆件', '香薰', '备用钥匙']],
      [/梳妆台/u, ['化妆品', '镜子', '发夹', '首饰盒']],
      [/鞋柜/u, ['鞋子', '雨伞', '鞋刷', '钥匙盘']],
      [/空调/u, ['遥控器', '滤网', '导风板']],
      [/植物|盆栽|花瓶/u, ['花枝', '水', '装饰石']],
      [/椅子/u, ['坐垫', '搭着的衣物']],
      [/门/u, ['门锁', '门把手', '挂钩']],
      [/窗/u, ['窗帘', '窗台盆栽', '窗锁']],
    ];
    const hit = rules.find(([pattern]) => pattern.test(text));
    return hit ? hit[1].slice() : ['可疑小物件', '待观察杂物'];
  },

  normalizeContainerContents(value = [], label = '', areaLabel = '') {
    const explicit = this.normalizeObjectLabels(value);
    return explicit.length ? explicit : this.defaultContainerContents(label, areaLabel);
  },

  containerContentsForObject(areaShape = {}, label = '', objectId = '', areaLabel = '') {
    const maps = [
      areaShape.containerContentsByObject,
      areaShape.contentsByObject,
      areaShape.objectContents,
      areaShape.objectContainerContents,
    ].filter((item) => item && typeof item === 'object' && !Array.isArray(item));
    for (const map of maps) {
      const explicit = this.normalizeObjectLabels(map[objectId] || map[label]);
      if (explicit.length) return explicit;
    }
    return this.defaultContainerContents(label, areaLabel);
  },

  containerContentsForRoomObject(object = '', areaShape = {}, label = '', objectId = '', areaLabel = '') {
    if (object && typeof object === 'object') {
      const explicit = this.normalizeObjectLabels(
        object.containerContents || object.contents || object.containedItems || object.insideObjects || object.onObjects,
      );
      if (explicit.length) return explicit;
    }
    return this.containerContentsForObject(areaShape, label, objectId, areaLabel);
  },

  roomShapeContainerContents(shape = {}) {
    const label = this.roomShapeLabel(shape);
    return this.normalizeContainerContents(
      shape.containerContents || shape.contents || shape.containedItems || shape.insideObjects || shape.onObjects,
      label,
      shape.areaLabel || '',
    );
  },

  roomAreaDetailLayout(room = {}, areaRegion = {}) {
    if (!areaRegion?.shape) return null;
    const explicit = this.normalizeRoomLayout(areaRegion.shape.detailLayout || areaRegion.shape.layout || areaRegion.shape.childLayout);
    if (explicit?.shapes?.length) {
      return {
        ...explicit,
        areaId: areaRegion.id,
        areaLabel: String(areaRegion.label || '房间内部').trim(),
        roomId: room.id || room.number || room.name || '',
      };
    }
    const areaLabel = String(areaRegion.label || '房间内部').trim();
    const objects = this.roomShapeObjectItems(areaRegion.shape);
    const seenIds = new Set();
    const rect = (id, x, y, w, h, label, fill = 'rgba(116,246,255,0.10)', extra = {}) => ({
      type: 'rect',
      id,
      x,
      y,
      w,
      h,
      label,
      fill,
      stroke: true,
      strokeColor: extra.strokeColor || 'rgba(116,246,255,0.55)',
      objects: extra.objects || [label],
      containerContents: extra.containerContents || this.defaultContainerContents(label, areaLabel),
      sourceObject: extra.sourceObject || null,
      areaLabel,
    });
    const roomFloor = {
      type: 'rect',
      id: 'room_floor',
      x: 26,
      y: 38,
      w: 428,
      h: 236,
      label: '地板',
      fill: 'rgba(87,199,255,0.035)',
      stroke: false,
      objects: ['地板'],
      containerContents: this.defaultContainerContents('地板', areaLabel),
      areaLabel,
    };
    const wall = [
      { type: 'rect', id: 'room_wall', x: 24, y: 24, w: 432, h: 264, label: '墙面', labelVisible: false, fill: 'rgba(116,246,255,0.015)', stroke: true, strokeColor: 'rgba(116,246,255,0.82)', lineWidth: 2, hitMode: 'border', hitBorderWidth: 14, objects: ['墙面'], containerContents: this.defaultContainerContents('墙面', areaLabel), areaLabel },
      { type: 'rect', id: 'room_window', x: 190, y: 28, w: 110, h: 10, label: '窗', fill: 'rgba(116,246,255,0.18)', stroke: true, strokeColor: '#74f6ff', objects: ['窗'], containerContents: this.defaultContainerContents('窗', areaLabel), areaLabel },
      { type: 'rect', id: 'room_door', x: 330, y: 276, w: 80, h: 10, label: '门', fill: 'rgba(255,209,102,0.18)', stroke: true, strokeColor: '#ffd166', objects: ['门'], containerContents: this.defaultContainerContents('门', areaLabel), areaLabel },
    ];
    const objectShapes = objects.map((object, index) => {
      const label = this.normalizeObjectLabel(object);
      let id = object && typeof object === 'object' && object.id ? String(object.id).trim().slice(0, 48) : this.objectShapeId(label, index);
      if (seenIds.has(id)) id = `${id}_${index + 1}`;
      seenIds.add(id);
      const [x, y, w, h, fill] = this.objectLayoutRect(object, index, areaLabel);
      return rect(id, x, y, w, h, label, fill, {
        containerContents: this.containerContentsForRoomObject(object, areaRegion.shape, label, id, areaLabel),
        objects: [label],
        sourceObject: object && typeof object === 'object' ? object : null,
        strokeColor: object && typeof object === 'object' && object.strokeColor ? object.strokeColor : undefined,
      });
    });
    return {
      width: 480,
      height: 320,
      areaId: areaRegion.id,
      areaLabel,
      roomId: room.id || room.number || room.name || '',
      shapes: [roomFloor, ...wall, ...objectShapes],
    };
  },

  floorPlanRegions(floor = {}, width = 520, height = 340) {
    const rooms = Array.isArray(floor?.rooms) ? floor.rooms : [];
    if (!rooms.length) return [];
    const padding = 18;
    const gap = 12;
    const cols = Math.max(1, Math.ceil(Math.sqrt(rooms.length)));
    const rows = Math.max(1, Math.ceil(rooms.length / cols));
    const roomW = Math.max(74, (width - padding * 2 - gap * (cols - 1)) / cols);
    const roomH = Math.max(58, (height - padding * 2 - gap * (rows - 1)) / rows);
    return rooms.map((room, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      return {
        room,
        roomId: room.id || room.number || room.name || `room_${index + 1}`,
        x: padding + col * (roomW + gap),
        y: padding + row * (roomH + gap),
        w: roomW,
        h: roomH,
      };
    });
  },

  drawWrappedText(ctx, text = '', x = 0, y = 0, maxWidth = 120, lineHeight = 16, maxLines = 2) {
    const chars = Array.from(String(text || '').trim());
    const lines = [];
    let line = '';
    chars.forEach((ch) => {
      const next = line + ch;
      if (!line || ctx.measureText(next).width <= maxWidth) {
        line = next;
        return;
      }
      lines.push(line);
      line = ch;
    });
    if (line) lines.push(line);
    const clipped = lines.slice(0, maxLines);
    if (lines.length > maxLines) clipped[maxLines - 1] = `${clipped[maxLines - 1].slice(0, Math.max(1, clipped[maxLines - 1].length - 1))}…`;
    clipped.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
  },

  drawRoundRect(ctx, x, y, w, h, r = 12) {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  },

  drawFloorPlan(canvas, floor = {}) {
    if (!canvas?.getContext) return [];
    const ctx = canvas.getContext('2d');
    const width = canvas.width || 520;
    const height = canvas.height || 340;
    const regions = this.floorPlanRegions(floor, width, height);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#07101f';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(87,199,255,0.18)';
    ctx.lineWidth = 1;
    for (let x = 16; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + height * 0.45, height);
      ctx.stroke();
    }
    regions.forEach((region, index) => {
      const room = region.room || {};
      const hasLayout = Boolean(room.hasLayout || room.layout || room.layoutTemplateId);
      ctx.save();
      ctx.fillStyle = hasLayout ? 'rgba(34,240,173,0.12)' : 'rgba(87,199,255,0.08)';
      ctx.strokeStyle = hasLayout ? 'rgba(34,240,173,0.54)' : 'rgba(87,199,255,0.34)';
      ctx.lineWidth = 2;
      this.drawRoundRect(ctx, region.x, region.y, region.w, region.h, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#eef8ff';
      ctx.font = '800 14px "Microsoft YaHei", sans-serif';
      this.drawWrappedText(ctx, this.roomDisplayTitle(room), region.x + 12, region.y + 24, region.w - 24, 17, 2);
      ctx.fillStyle = '#9fb2c8';
      ctx.font = '12px "Microsoft YaHei", sans-serif';
      const detail = room.residentsText ? `居住人：${room.residentsText}` : (room.kind || `空间 ${index + 1}`);
      this.drawWrappedText(ctx, detail, region.x + 12, region.y + region.h - 30, region.w - 24, 15, 2);
      ctx.restore();
    });
    return regions;
  },

  drawRoomLayout(canvas, layout = {}, options = {}) {
    if (!canvas?.getContext) return [];
    const ctx = canvas.getContext('2d');
    const width = canvas.width || layout.width || 480;
    const height = canvas.height || layout.height || 320;
    const regions = this.roomLayoutRegions(layout);
    const selectedId = String(options.selectedId || '');
    const shapes = Array.isArray(layout.shapes) ? layout.shapes : [];
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#070f1f';
    ctx.fillRect(0, 0, width, height);
    shapes.forEach((shape, index) => {
      if (shape.type !== 'rect') return;
      const regionId = this.roomShapeRegionId(shape, index);
      const selected = selectedId && selectedId === regionId;
      const x = Number(shape.x) || 0;
      const y = Number(shape.y) || 0;
      const w = Number(shape.w) || 0;
      const h = Number(shape.h) || 0;
      if (shape.fill) {
        ctx.fillStyle = selected ? 'rgba(255,209,102,0.18)' : shape.fill;
        ctx.fillRect(x, y, w, h);
      } else if (selected) {
        ctx.fillStyle = 'rgba(255,209,102,0.12)';
        ctx.fillRect(x, y, w, h);
      }
      if (shape.stroke !== false) {
        ctx.strokeStyle = selected ? 'rgba(255,209,102,0.95)' : (shape.strokeColor || 'rgba(116,246,255,0.55)');
        ctx.lineWidth = selected ? 3 : (Number(shape.lineWidth) || 1.5);
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      }
      if (shape.label && shape.labelVisible !== false) {
        ctx.fillStyle = selected ? '#fff4c7' : '#eef3ff';
        ctx.font = selected ? '800 12px sans-serif' : '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(shape.label), x + w / 2, y + h / 2);
      }
    });
    return regions;
  },
};
