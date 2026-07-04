/**
 * 预置屋内 Canvas 布局模板。AI 选择 layoutTemplateId + slotAssignments，运行时 materialize 成 shapes。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldMapInteriorTemplates = {
  WIDTH: 480,
  HEIGHT: 320,
  M: 24,

  wallShapes() {
    const M = this.M;
    const W = this.WIDTH;
    const H = this.HEIGHT;
    return [
      { type: 'rect', x: M, y: M, w: W - M * 2, h: H - M * 2 - 16, stroke: true, strokeColor: 'rgba(116,246,255,0.85)', lineWidth: 2 },
      { type: 'rect', x: W / 2 - 40, y: H - M - 12, w: 80, h: 12, fill: 'rgba(116,246,255,0.15)', stroke: true, strokeColor: '#74f6ff', label: '门' },
      { type: 'rect', x: W / 2 - 60, y: M, w: 120, h: 8, fill: 'rgba(255,223,138,0.35)', label: '窗' },
    ];
  },

  rect(slot, x, y, w, h, opts = {}) {
    return {
      type: 'rect',
      slot,
      x,
      y,
      w,
      h,
      fill: opts.fill || 'rgba(255,255,255,0.06)',
      stroke: opts.stroke !== false,
      strokeColor: opts.strokeColor || 'rgba(255,255,255,0.2)',
      defaultLabel: opts.label || '',
    };
  },

  catalog: [
    { id: 'single_room', name: '单人间', desc: '一室一床，含书桌衣柜与独立卫生间角', slots: ['bed_1', 'desk', 'closet', 'bathroom'] },
    { id: 'double_room', name: '双人间', desc: '同一卧室内两张床', slots: ['bed_1', 'bed_2', 'desk', 'closet', 'bathroom'] },
    { id: 'studio', name: '单间开间', desc: '无隔断开间：睡眠区+小客厅+厨房角', slots: ['bed_1', 'living', 'kitchen', 'bathroom'] },
    { id: 'one_bedroom_one_living', name: '一室一厅', desc: '一间卧室+独立客厅+厨卫', slots: ['bed_1', 'living', 'kitchen', 'bathroom'] },
    { id: 'two_bedroom_one_living', name: '两室一厅', desc: '两卧室+客厅+厨卫', slots: ['bed_1', 'bed_2', 'living', 'kitchen', 'bathroom'] },
    { id: 'three_bedroom_one_living', name: '三室一厅', desc: '三卧室+客厅+厨卫', slots: ['bed_1', 'bed_2', 'bed_3', 'living', 'kitchen', 'bathroom'] },
    { id: 'four_bedroom_one_living', name: '四室一厅', desc: '四卧室+客厅+厨卫，适合多人同住', slots: ['bed_1', 'bed_2', 'bed_3', 'bed_4', 'living', 'kitchen', 'bathroom'] },
    { id: 'two_bedroom_two_living', name: '两室两厅', desc: '两卧室+客厅+餐厅+厨卫', slots: ['bed_1', 'bed_2', 'living', 'dining', 'kitchen', 'bathroom'] },
    { id: 'three_bedroom_two_living', name: '三室两厅', desc: '三卧室+客厅+餐厅+厨卫', slots: ['bed_1', 'bed_2', 'bed_3', 'living', 'dining', 'kitchen', 'bathroom'] },
    { id: 'dormitory', name: '宿舍型', desc: '多床位+共用通道，上下铺或联排床', slots: ['bed_1', 'bed_2', 'bed_3', 'bed_4', 'bed_5', 'bed_6', 'aisle', 'bathroom'] },
    { id: 'office_open', name: '开放式办公', desc: '工位区+会议桌+茶水角', slots: ['desk_1', 'desk_2', 'desk_3', 'meeting', 'pantry'] },
    { id: 'office_partition', name: '隔断办公', desc: '独立办公室+外间工位', slots: ['office', 'desk_1', 'desk_2', 'meeting'] },
    { id: 'retail_shop', name: '商铺', desc: '门面柜台+货架+后仓', slots: ['counter', 'shelf_1', 'shelf_2', 'storage'] },
    { id: 'restaurant_hall', name: '餐厅大厅', desc: '散座区+吧台+后厨', slots: ['table_1', 'table_2', 'bar', 'kitchen'] },
    { id: 'classroom', name: '教室', desc: '讲台+排座+后柜', slots: ['podium', 'row_1', 'row_2', 'cabinet'] },
    // —— 豪宅 / 高端住宅 ——
    { id: 'luxury_penthouse', name: '豪华大平层', category: 'luxury', desc: '超大客餐厅+主卧套+次卧，城市顶级平层', slots: ['master', 'bed_2', 'bed_3', 'living', 'dining', 'kitchen', 'bathroom', 'study'] },
    { id: 'duplex_luxury', name: '复式豪宅', category: 'luxury', desc: '上下复式：下层客餐厨，上层多卧套', slots: ['master', 'bed_2', 'bed_3', 'living', 'dining', 'kitchen', 'stairs', 'bathroom'] },
    { id: 'standalone_villa', name: '独栋别墅', category: 'luxury', desc: '独栋一层主区：门厅+大客厅+多卧+花园出口', slots: ['foyer', 'master', 'bed_2', 'bed_3', 'living', 'dining', 'kitchen', 'garden', 'bathroom'] },
    { id: 'courtyard_villa', name: '合院别墅', category: 'luxury', desc: '四合式围合：中庭+四厢房+主堂', slots: ['courtyard', 'master', 'bed_2', 'bed_3', 'hall', 'kitchen', 'tea_room'] },
    { id: 'mansion_estate', name: '庄园大宅', category: 'luxury', desc: '多套房+大厅+佣人区+酒窖健身，适合多人同住', slots: ['master', 'suite_2', 'suite_3', 'suite_4', 'grand_hall', 'dining', 'kitchen', 'staff', 'wine_cellar', 'gym'] },
    { id: 'sky_villa', name: '空中别墅', category: 'luxury', desc: '高层整层打通：景观客厅+多套房+露台', slots: ['master', 'bed_2', 'bed_3', 'living', 'dining', 'kitchen', 'terrace', 'bathroom'] },
  ],

  templates: {},

  init() {
    const M = this.M;
    const W = this.WIDTH;
    const H = this.HEIGHT;
    const iw = W - M * 2;
    const ih = H - M * 2 - 16;
    const wall = () => this.wallShapes();

    this.templates = {
      single_room: {
        shapes: [
          ...wall(),
          this.rect('bed_1', M + 12, M + 20, 120, 80, { fill: 'rgba(116,246,255,0.12)', strokeColor: 'rgba(116,246,255,0.45)', label: '床' }),
          this.rect('desk', M + 12, M + 120, 100, 56, { label: '书桌' }),
          this.rect('closet', M + 130, M + 20, 72, 100, { label: '衣柜' }),
          this.rect('bathroom', W - M - 100, H - M - 100, 88, 72, { label: '卫生间' }),
        ],
      },
      double_room: {
        shapes: [
          ...wall(),
          this.rect('bed_1', M + 12, M + 20, 100, 72, { fill: 'rgba(116,246,255,0.12)', label: '床A' }),
          this.rect('bed_2', M + 124, M + 20, 100, 72, { fill: 'rgba(116,246,255,0.12)', label: '床B' }),
          this.rect('desk', M + 12, M + 110, 120, 56, { label: '书桌' }),
          this.rect('closet', M + 250, M + 20, 72, 100, { label: '衣柜' }),
          this.rect('bathroom', W - M - 96, H - M - 96, 84, 68, { label: '卫生间' }),
        ],
      },
      studio: {
        shapes: [
          ...wall(),
          this.rect('bed_1', M + 12, M + 20, 110, 76, { fill: 'rgba(116,246,255,0.12)', label: '睡眠区' }),
          this.rect('living', M + 140, M + 20, iw - 160, 90, { label: '客厅' }),
          this.rect('kitchen', M + 12, M + 120, 140, 56, { label: '厨房' }),
          this.rect('bathroom', W - M - 96, H - M - 96, 84, 68, { label: '卫生间' }),
        ],
      },
      one_bedroom_one_living: {
        shapes: [
          ...wall(),
          this.rect('bed_1', M + 12, M + 20, 130, 90, { fill: 'rgba(116,246,255,0.12)', label: '卧室' }),
          this.rect('living', M + 160, M + 20, iw - 180, 110, { label: '客厅' }),
          this.rect('kitchen', M + 12, M + 130, 120, 56, { label: '厨房' }),
          this.rect('bathroom', W - M - 96, H - M - 96, 84, 68, { label: '卫生间' }),
        ],
      },
      two_bedroom_one_living: {
        shapes: [
          ...wall(),
          this.rect('bed_1', M + 12, M + 20, 100, 72, { fill: 'rgba(116,246,255,0.12)', label: '卧室1' }),
          this.rect('bed_2', M + 124, M + 20, 100, 72, { fill: 'rgba(116,246,255,0.12)', label: '卧室2' }),
          this.rect('living', M + 250, M + 20, iw - 270, 100, { label: '客厅' }),
          this.rect('kitchen', M + 12, M + 110, 120, 56, { label: '厨房' }),
          this.rect('bathroom', W - M - 96, H - M - 96, 84, 68, { label: '卫生间' }),
        ],
      },
      three_bedroom_one_living: {
        shapes: [
          ...wall(),
          this.rect('bed_1', M + 8, M + 16, 88, 64, { fill: 'rgba(116,246,255,0.12)', label: '卧1' }),
          this.rect('bed_2', M + 104, M + 16, 88, 64, { fill: 'rgba(116,246,255,0.12)', label: '卧2' }),
          this.rect('bed_3', M + 200, M + 16, 88, 64, { fill: 'rgba(116,246,255,0.12)', label: '卧3' }),
          this.rect('living', M + 8, M + 96, iw - 120, 72, { label: '客厅' }),
          this.rect('kitchen', M + 8, M + 184, 100, 48, { label: '厨房' }),
          this.rect('bathroom', W - M - 96, H - M - 96, 84, 68, { label: '卫生间' }),
        ],
      },
      four_bedroom_one_living: {
        shapes: [
          ...wall(),
          this.rect('bed_1', M + 8, M + 16, 88, 60, { fill: 'rgba(116,246,255,0.12)', strokeColor: 'rgba(116,246,255,0.45)', label: '卧1' }),
          this.rect('bed_2', M + 104, M + 16, 88, 60, { fill: 'rgba(255,143,178,0.14)', strokeColor: 'rgba(255,143,178,0.5)', label: '卧2' }),
          this.rect('bed_3', M + 200, M + 16, 88, 60, { fill: 'rgba(255,143,178,0.14)', strokeColor: 'rgba(255,143,178,0.5)', label: '卧3' }),
          this.rect('bed_4', M + 296, M + 16, 72, 60, { fill: 'rgba(255,143,178,0.14)', strokeColor: 'rgba(255,143,178,0.5)', label: '卧4' }),
          this.rect('living', M + 8, M + 88, iw - 120, 68, { label: '客厅' }),
          this.rect('kitchen', M + 8, M + 168, 100, 48, { label: '厨房' }),
          this.rect('bathroom', W - M - 96, H - M - 96, 84, 68, { label: '卫生间' }),
        ],
      },
      two_bedroom_two_living: {
        shapes: [
          ...wall(),
          this.rect('bed_1', M + 8, M + 16, 96, 68, { fill: 'rgba(116,246,255,0.12)', label: '卧室1' }),
          this.rect('bed_2', M + 112, M + 16, 96, 68, { fill: 'rgba(116,246,255,0.12)', label: '卧室2' }),
          this.rect('living', M + 220, M + 16, 120, 68, { label: '客厅' }),
          this.rect('dining', M + 220, M + 92, 120, 52, { label: '餐厅' }),
          this.rect('kitchen', M + 8, M + 100, 100, 48, { label: '厨房' }),
          this.rect('bathroom', W - M - 96, H - M - 96, 84, 68, { label: '卫生间' }),
        ],
      },
      three_bedroom_two_living: {
        shapes: [
          ...wall(),
          this.rect('bed_1', M + 8, M + 12, 80, 56, { fill: 'rgba(116,246,255,0.12)', label: '卧1' }),
          this.rect('bed_2', M + 96, M + 12, 80, 56, { fill: 'rgba(116,246,255,0.12)', label: '卧2' }),
          this.rect('bed_3', M + 184, M + 12, 80, 56, { fill: 'rgba(116,246,255,0.12)', label: '卧3' }),
          this.rect('living', M + 8, M + 80, 140, 60, { label: '客厅' }),
          this.rect('dining', M + 160, M + 80, 100, 60, { label: '餐厅' }),
          this.rect('kitchen', M + 8, M + 152, 96, 44, { label: '厨房' }),
          this.rect('bathroom', W - M - 96, H - M - 96, 84, 68, { label: '卫生间' }),
        ],
      },
      dormitory: {
        shapes: [
          ...wall(),
          this.rect('bed_1', M + 8, M + 16, 64, 48, { fill: 'rgba(116,246,255,0.12)', label: '床1' }),
          this.rect('bed_2', M + 80, M + 16, 64, 48, { fill: 'rgba(116,246,255,0.12)', label: '床2' }),
          this.rect('bed_3', M + 152, M + 16, 64, 48, { fill: 'rgba(116,246,255,0.12)', label: '床3' }),
          this.rect('bed_4', M + 224, M + 16, 64, 48, { fill: 'rgba(116,246,255,0.12)', label: '床4' }),
          this.rect('bed_5', M + 8, M + 72, 64, 48, { fill: 'rgba(116,246,255,0.12)', label: '床5' }),
          this.rect('bed_6', M + 80, M + 72, 64, 48, { fill: 'rgba(116,246,255,0.12)', label: '床6' }),
          this.rect('aisle', M + 160, M + 72, iw - 180, 48, { label: '通道' }),
          this.rect('bathroom', W - M - 96, H - M - 96, 84, 68, { label: '卫生间' }),
        ],
      },
      office_open: {
        shapes: [
          ...wall(),
          this.rect('desk_1', M + 12, M + 20, 100, 56, { label: '工位1' }),
          this.rect('desk_2', M + 124, M + 20, 100, 56, { label: '工位2' }),
          this.rect('desk_3', M + 236, M + 20, 100, 56, { label: '工位3' }),
          this.rect('meeting', M + 12, M + 96, 180, 72, { label: '会议区' }),
          this.rect('pantry', W - M - 100, M + 20, 88, 56, { label: '茶水间' }),
        ],
      },
      office_partition: {
        shapes: [
          ...wall(),
          this.rect('office', M + 12, M + 20, 140, 100, { label: '独立办公室' }),
          this.rect('desk_1', M + 170, M + 20, 96, 56, { label: '工位1' }),
          this.rect('desk_2', M + 278, M + 20, 96, 56, { label: '工位2' }),
          this.rect('meeting', M + 12, M + 140, 160, 64, { label: '会议室' }),
        ],
      },
      retail_shop: {
        shapes: [
          ...wall(),
          this.rect('counter', M + 12, M + 20, 120, 48, { label: '柜台' }),
          this.rect('shelf_1', M + 12, M + 84, 100, 100, { label: '货架A' }),
          this.rect('shelf_2', M + 124, M + 84, 100, 100, { label: '货架B' }),
          this.rect('storage', W - M - 96, M + 20, 84, 80, { label: '后仓' }),
        ],
      },
      restaurant_hall: {
        shapes: [
          ...wall(),
          this.rect('table_1', M + 12, M + 20, 120, 72, { label: '散座A' }),
          this.rect('table_2', M + 148, M + 20, 120, 72, { label: '散座B' }),
          this.rect('bar', M + 12, M + 108, 80, 48, { label: '吧台' }),
          this.rect('kitchen', W - M - 110, M + 20, 100, 100, { label: '后厨' }),
        ],
      },
      classroom: {
        shapes: [
          ...wall(),
          this.rect('podium', M + 12, M + 20, 80, 48, { label: '讲台' }),
          this.rect('row_1', M + 12, M + 84, iw - 24, 44, { label: '前排' }),
          this.rect('row_2', M + 12, M + 140, iw - 24, 44, { label: '后排' }),
          this.rect('cabinet', W - M - 72, M + 20, 60, 56, { label: '储物柜' }),
        ],
      },
      luxury_penthouse: {
        shapes: [
          ...wall(),
          this.rect('living', M + 8, M + 12, 200, 80, { fill: 'rgba(255,223,138,0.1)', strokeColor: 'rgba(255,223,138,0.45)', label: '超大客厅' }),
          this.rect('dining', M + 220, M + 12, 100, 56, { fill: 'rgba(255,223,138,0.08)', label: '餐厅' }),
          this.rect('master', M + 8, M + 104, 100, 64, { fill: 'rgba(255,223,138,0.14)', strokeColor: 'rgba(255,223,138,0.5)', label: '主卧套' }),
          this.rect('bed_2', M + 120, M + 104, 80, 56, { fill: 'rgba(255,223,138,0.1)', label: '次卧1' }),
          this.rect('bed_3', M + 212, M + 104, 80, 56, { fill: 'rgba(255,223,138,0.1)', label: '次卧2' }),
          this.rect('study', M + 304, M + 104, 64, 56, { label: '书房' }),
          this.rect('kitchen', M + 8, M + 180, 96, 44, { label: '厨房' }),
          this.rect('bathroom', W - M - 88, H - M - 88, 76, 60, { label: '主卫' }),
        ],
      },
      duplex_luxury: {
        shapes: [
          ...wall(),
          this.rect('living', M + 8, M + 100, 160, 72, { fill: 'rgba(255,223,138,0.1)', label: '一层客厅' }),
          this.rect('dining', M + 180, M + 100, 88, 56, { label: '餐厅' }),
          this.rect('kitchen', M + 280, M + 100, 80, 56, { label: '厨房' }),
          this.rect('stairs', M + 280, M + 168, 80, 40, { label: '楼梯' }),
          this.rect('master', M + 8, M + 12, 96, 56, { fill: 'rgba(255,223,138,0.14)', label: '二层主卧' }),
          this.rect('bed_2', M + 112, M + 12, 80, 56, { fill: 'rgba(255,223,138,0.1)', label: '二层次卧1' }),
          this.rect('bed_3', M + 200, M + 12, 80, 56, { fill: 'rgba(255,223,138,0.1)', label: '二层次卧2' }),
          this.rect('bathroom', W - M - 88, M + 12, 76, 56, { label: '二层卫' }),
        ],
      },
      standalone_villa: {
        shapes: [
          ...wall(),
          this.rect('foyer', M + 8, M + 168, 72, 48, { fill: 'rgba(255,223,138,0.08)', label: '门厅' }),
          this.rect('living', M + 92, M + 88, 180, 80, { fill: 'rgba(255,223,138,0.12)', label: '挑高客厅' }),
          this.rect('dining', M + 8, M + 88, 72, 68, { label: '餐厅' }),
          this.rect('master', M + 8, M + 12, 96, 64, { fill: 'rgba(255,223,138,0.14)', label: '主卧' }),
          this.rect('bed_2', M + 112, M + 12, 80, 56, { label: '次卧1' }),
          this.rect('bed_3', M + 200, M + 12, 80, 56, { label: '次卧2' }),
          this.rect('kitchen', M + 288, M + 12, 80, 56, { label: '厨房' }),
          this.rect('garden', M + 288, M + 88, 80, 72, { fill: 'rgba(120,200,120,0.12)', label: '花园' }),
          this.rect('bathroom', W - M - 88, H - M - 88, 76, 60, { label: '主卫' }),
        ],
      },
      courtyard_villa: {
        shapes: [
          ...wall(),
          this.rect('courtyard', M + 140, M + 88, 120, 72, { fill: 'rgba(120,200,120,0.15)', strokeColor: 'rgba(120,200,120,0.4)', label: '中庭' }),
          this.rect('hall', M + 140, M + 12, 120, 64, { fill: 'rgba(255,223,138,0.1)', label: '正堂' }),
          this.rect('master', M + 8, M + 88, 80, 64, { fill: 'rgba(255,223,138,0.14)', label: '东厢主卧' }),
          this.rect('bed_2', M + 8, M + 12, 80, 56, { label: '东厢次' }),
          this.rect('bed_3', W - M - 88, M + 88, 80, 64, { label: '西厢' }),
          this.rect('tea_room', W - M - 88, M + 12, 80, 56, { label: '茶室' }),
          this.rect('kitchen', M + 8, M + 168, 80, 48, { label: '厨房' }),
        ],
      },
      mansion_estate: {
        shapes: [
          ...wall(),
          this.rect('grand_hall', M + 8, M + 88, 160, 72, { fill: 'rgba(255,223,138,0.12)', strokeColor: 'rgba(255,223,138,0.45)', label: '挑高大堂' }),
          this.rect('dining', M + 180, M + 88, 88, 56, { label: '正式餐厅' }),
          this.rect('master', M + 8, M + 12, 88, 56, { fill: 'rgba(255,223,138,0.16)', label: '主人套房' }),
          this.rect('suite_2', M + 104, M + 12, 72, 56, { fill: 'rgba(255,223,138,0.1)', label: '套房2' }),
          this.rect('suite_3', M + 184, M + 12, 72, 56, { fill: 'rgba(255,223,138,0.1)', label: '套房3' }),
          this.rect('suite_4', M + 264, M + 12, 72, 56, { fill: 'rgba(255,223,138,0.1)', label: '套房4' }),
          this.rect('kitchen', M + 8, M + 180, 80, 44, { label: '厨房' }),
          this.rect('staff', M + 280, M + 88, 80, 48, { label: '佣人区' }),
          this.rect('wine_cellar', M + 280, M + 148, 80, 40, { label: '酒窖' }),
          this.rect('gym', M + 180, M + 152, 88, 48, { label: '健身' }),
        ],
      },
      sky_villa: {
        shapes: [
          ...wall(),
          this.rect('living', M + 8, M + 12, 200, 76, { fill: 'rgba(255,223,138,0.12)', label: '景观客厅' }),
          this.rect('terrace', M + 220, M + 12, 100, 76, { fill: 'rgba(120,200,255,0.12)', strokeColor: 'rgba(120,200,255,0.35)', label: '露台' }),
          this.rect('master', M + 8, M + 100, 96, 60, { fill: 'rgba(255,223,138,0.14)', label: '主卧' }),
          this.rect('bed_2', M + 112, M + 100, 80, 56, { label: '次卧1' }),
          this.rect('bed_3', M + 200, M + 100, 80, 56, { label: '次卧2' }),
          this.rect('dining', M + 288, M + 100, 80, 56, { label: '餐厅' }),
          this.rect('kitchen', M + 8, M + 172, 96, 44, { label: '厨房' }),
          this.rect('bathroom', W - M - 88, H - M - 88, 76, 60, { label: '主卫' }),
        ],
      },
    };
  },

  list() {
    if (!Object.keys(this.templates).length) this.init();
    return this.catalog;
  },

  get(id = '') {
    if (!Object.keys(this.templates).length) this.init();
    return this.templates[String(id || '')] || null;
  },

  isValidId(id = '') {
    return Boolean(this.get(id));
  },

  catalogText() {
    const rows = this.list();
    const basic = rows.filter((item) => !item.category || item.category !== 'luxury');
    const luxury = rows.filter((item) => item.category === 'luxury');
    const fmt = (item) => {
      const slots = (item.slots || []).join('、');
      return `- ${item.id}（${item.name}）：${item.desc}；可填槽位：${slots}`;
    };
    return [
      '【普通住宅/常用】',
      ...basic.map(fmt),
      '',
      '【豪宅/高端】',
      ...luxury.map(fmt),
      '',
      '豪宅选型提示：城市顶级平层→luxury_penthouse；复式/跃层→duplex_luxury；独栋带花园→standalone_villa；中式合院→courtyard_villa；大型庄园/多人同住→mansion_estate；高层整层+露台→sky_villa。',
    ].join('\n');
  },

  residentSlotIds(templateId = '') {
    const item = this.list().find((row) => row.id === templateId);
    return (item?.slots || []).filter((slot) => /^(bed_\d+|master|suite_\d+|guest_\d+)$/u.test(slot));
  },

  bedSlotIds(templateId = '') {
    return this.residentSlotIds(templateId);
  },

  suggestTemplateId(residentCount = 0, hints = {}) {
    const n = Math.max(0, Number(residentCount) || 0);
    const luxury = Boolean(hints.luxury || hints.mansion || hints.豪宅 || hints.villa);
    if (luxury) {
      if (hints.courtyard || hints.合院) return 'courtyard_villa';
      if (hints.duplex || hints.复式) return 'duplex_luxury';
      if (hints.estate || hints.庄园 || n >= 6) return 'mansion_estate';
      if (hints.penthouse || hints.平层 || hints.大平层) return 'luxury_penthouse';
      if (hints.sky || hints.露台 || hints.空中) return 'sky_villa';
      if (hints.villa || hints.独栋) return 'standalone_villa';
      if (n <= 2) return 'luxury_penthouse';
      if (n <= 4) return 'duplex_luxury';
      return 'mansion_estate';
    }
    if (n <= 1) return 'single_room';
    if (n === 2) return 'double_room';
    if (n === 3) return 'three_bedroom_one_living';
    if (n === 4) return 'four_bedroom_one_living';
    if (n <= 6) return 'dormitory';
    return 'dormitory';
  },

  autoSlotAssignments(templateId = '', residents = []) {
    const names = (Array.isArray(residents) ? residents : []).map((item) => String(item || '').trim()).filter(Boolean);
    const beds = this.residentSlotIds(templateId);
    const out = {};
    if (!beds.length || !names.length) return out;
    names.forEach((name, index) => {
      const slot = beds[index] || beds[beds.length - 1];
      if (!slot) return;
      out[slot] = out[slot] ? `${out[slot]}、${name}` : name;
    });
    return out;
  },

  materialize(templateId = '', slotAssignments = {}) {
    const tpl = this.get(templateId);
    if (!tpl) return null;
    const assignments = slotAssignments && typeof slotAssignments === 'object' ? slotAssignments : {};
    const shapes = (tpl.shapes || []).map((shape) => {
      const next = { ...shape };
      if (!next.slot) return next;
      const label = String(assignments[next.slot] || next.defaultLabel || '').trim();
      if (label) next.label = label;
      else if (next.defaultLabel) next.label = next.defaultLabel;
      delete next.slot;
      delete next.defaultLabel;
      return next;
    });
    return {
      width: this.WIDTH,
      height: this.HEIGHT,
      templateId,
      slotAssignments: { ...assignments },
      shapes,
    };
  },

  build(templateId = '', options = {}) {
    const id = this.isValidId(templateId) ? templateId : this.suggestTemplateId(options.residents?.length || 0);
    const assignments = {
      ...this.autoSlotAssignments(id, options.residents || []),
      ...(options.slotAssignments || {}),
    };
    return this.materialize(id, assignments);
  },
};

window.GameModules.realWorldMapInteriorTemplates.init();
