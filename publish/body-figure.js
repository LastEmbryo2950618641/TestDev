window.GameModules = window.GameModules || {};

/** 带部位坐标标注的参考图：按 overall 标签（如 少女）匹配 */
window.GameModules.bodyFigure = {
  tagIndex: {
    少女: [{ id: '图片1', path: '少女/图片1', default: true }],
  },

  metaCache: {},

  basePath(relative = '') {
    return `assets/body-figures/${String(relative || '').replace(/^\/+/, '')}`;
  },

  async loadMeta(relativePath = '') {
    const key = String(relativePath || '').trim();
    if (!key) return null;
    if (this.metaCache[key]) return this.metaCache[key];
    try {
      const res = await fetch(`${this.basePath(`${key}/meta.json`)}`, { cache: 'no-cache' });
      if (!res.ok) return null;
      const meta = await res.json();
      this.metaCache[key] = meta;
      return meta;
    } catch (err) {
      console.warn('[身体参考图] meta 加载失败:', key, err.message);
      return null;
    }
  },

  matchTag(meta = {}) {
    const cfg = window.GameModules.appearanceProfileTags;
    const normalized = cfg?.normalizeNaturalMeta?.(meta, {}) || meta || {};
    const tags = [...(normalized.overall || []), ...(normalized.figure || [])].map((x) => String(x || '').trim()).filter(Boolean);
    if (tags.some((t) => t === '少女' || /少女/.test(t))) return '少女';
    if (tags.some((t) => t === '萝莉' || /萝莉|幼态|童颜/.test(t))) return '萝莉';
    if (tags.some((t) => t === '御姐' || /御姐|成熟/.test(t))) return '御姐';
    return '';
  },

  pickFigureEntry(tag = '') {
    const list = this.tagIndex[tag] || [];
    return list.find((item) => item.default) || list[0] || null;
  },

  rowForPart(rows = [], part = '') {
    const name = String(part || '').trim();
    return (rows || []).find((row) => {
      const p = String(row?.item?.part || '').trim();
      return p === name || p.includes(name) || name.includes(p);
    }) || null;
  },

  buildAnnotations(meta = {}, rows = []) {
    const parts = Array.isArray(meta.parts) ? meta.parts : [];
    return parts.map((item) => {
      const part = String(item.part || '').trim();
      const row = this.rowForPart(rows, part);
      const anchor = item.anchor || { x: 50, y: 50 };
      const label = item.label || { x: anchor.x < 50 ? 8 : 92, y: anchor.y, side: anchor.x < 50 ? 'left' : 'right' };
      return {
        part,
        anchor: { x: Number(anchor.x) || 50, y: Number(anchor.y) || 50 },
        label: {
          x: Number(label.x) || (label.side === 'right' ? 90 : 10),
          y: Number(label.y) || Number(anchor.y) || 50,
          side: label.side === 'right' ? 'right' : 'left',
        },
        title: row?.title || part,
        tags: row?.tags || '',
        preview: row?.preview || '暂无描写',
        row,
        line: {
          x1: Number(anchor.x) || 50,
          y1: Number(anchor.y) || 50,
          x2: Number(label.x) || 10,
          y2: Number(label.y) || 50,
        },
      };
    });
  },

  resolveFromMeta(cached = {}, entry = {}, rows = [], sectionTitle = '', tag = '') {
    if (!cached || !entry) return null;
    return {
      tag,
      id: entry.id,
      label: cached.label || `${tag}参考 · ${entry.id}`,
      imageSrc: this.basePath(`${entry.path}/${cached.image || 'figure.png'}`),
      sectionTitle,
      annotations: this.buildAnnotations(cached, rows),
    };
  },

  resolveSync(meta = {}, rows = [], sectionTitle = '') {
    const tag = this.matchTag(meta);
    if (!tag) return null;
    const entry = this.pickFigureEntry(tag);
    if (!entry) return null;
    const cached = this.metaCache[entry.path];
    if (!cached) return { tag, entry, pending: true, label: `${tag}参考 · ${entry.id}`, sectionTitle };
    return this.resolveFromMeta(cached, entry, rows, sectionTitle, tag);
  },

  async resolve(meta = {}, rows = [], sectionTitle = '') {
    const tag = this.matchTag(meta);
    if (!tag) return null;
    const entry = this.pickFigureEntry(tag);
    if (!entry) return null;
    const cached = await this.loadMeta(entry.path);
    if (!cached) return null;
    return this.resolveFromMeta(cached, entry, rows, sectionTitle, tag);
  },

  async prefetchForTag(tag = '少女') {
    const entry = this.pickFigureEntry(tag);
    if (!entry) return;
    await this.loadMeta(entry.path);
    window.dispatchEvent(new CustomEvent('body-figure-meta-ready', { detail: { tag, id: entry.id } }));
  },

  async prefetchAll() {
    await Promise.all(Object.keys(this.tagIndex).map((tag) => this.prefetchForTag(tag)));
  },

  calloutStyle(ann = {}) {
    const side = ann?.label?.side === 'right' ? 'right' : 'left';
    const x = Number(ann?.label?.x) || (side === 'right' ? 90 : 10);
    const y = Number(ann?.label?.y) || 50;
    const transform = side === 'right' ? 'translate(-100%, -50%)' : 'translate(0, -50%)';
    return `left:${x}%;top:${y}%;transform:${transform}`;
  },

  anchorStyle(ann = {}) {
    const x = Number(ann?.anchor?.x) || 50;
    const y = Number(ann?.anchor?.y) || 50;
    return `left:${x}%;top:${y}%;transform:translate(-50%, -50%)`;
  },

  openAnnotationPart(rows = [], part = '') {
    return window.GameModules.bodySilhouette?.openBodyPartDetail?.(rows, part) || false;
  },

  isAnnotationActive(rows = [], part = '') {
    return window.GameModules.bodySilhouette?.isBodyPartActive?.(rows, part) || false;
  },
};
