window.GameModules = window.GameModules || {};

/** 带部位坐标标注的参考图：按 overall 标签匹配。 */
window.GameModules.bodyFigure = {
  figureEntries: [
    { id: 'female-adult-petite-small-bust-no-pubic-hair', path: 'female/adult-petite-small-bust-no-pubic-hair', default: true },
    { id: 'female-adult-petite-medium-bust-sparse-pubic-hair', path: 'female/adult-petite-medium-bust-sparse-pubic-hair' },
    { id: 'female-adult-petite-medium-bust-dense-pubic-hair', path: 'female/adult-petite-medium-bust-dense-pubic-hair' },
    { id: 'female-adult-youthful-small-bust-no-pubic-hair', path: 'female/adult-youthful-small-bust-no-pubic-hair' },
    { id: 'female-adult-youthful-medium-bust-sparse-pubic-hair', path: 'female/adult-youthful-medium-bust-sparse-pubic-hair' },
    { id: 'female-adult-youthful-medium-bust-dense-pubic-hair', path: 'female/adult-youthful-medium-bust-dense-pubic-hair' },
    { id: 'female-mature-small-bust-no-pubic-hair', path: 'female/mature-small-bust-no-pubic-hair' },
    { id: 'female-mature-medium-bust-no-pubic-hair', path: 'female/mature-medium-bust-no-pubic-hair' },
    { id: 'female-mature-large-bust-no-pubic-hair', path: 'female/mature-large-bust-no-pubic-hair' },
    { id: 'male-youth-slender-natural', path: 'male/youth-slender-natural', default: true },
  ],
  maskEntry: { id: 'mask-image1', path: 'mask/image1', mask: true },

  metaCache: {},
  manifestEntries: [],
  manifestLoaded: false,

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
    if (tags.some((t) => t === '少女' || t === 'girl' || /少女/.test(t))) return 'girl';
    if (tags.some((t) => t === '萝莉' || /萝莉|幼态|童颜/.test(t))) return '萝莉';
    if (tags.some((t) => t === '御姐' || /御姐|成熟/.test(t))) return '御姐';
    return '';
  },

  pickFigureEntry(tag = '') {
    const list = this.tagIndex[tag] || [];
    return list.find((item) => item.default) || list[0] || null;
  },

  async loadManifest() {
    if (this.manifestLoaded) return this.manifestEntries;
    this.manifestLoaded = true;
    try {
      const res = await fetch(this.basePath('index.json'), { cache: 'no-cache' });
      if (!res.ok) return this.manifestEntries;
      const data = await res.json();
      this.manifestEntries = (Array.isArray(data?.figures) ? data.figures : [])
        .map((item) => ({
          id: String(item?.id || item?.path || '').trim(),
          path: String(item?.path || item?.id || '').trim(),
          default: Boolean(item?.default),
          generated: Boolean(item?.generated),
          ownerId: item?.ownerId || '',
          stateKind: item?.stateKind || '',
        }))
        .filter((item) => item.id && item.path);
    } catch (err) {
      console.warn('[body-figure] manifest 加载失败:', err?.message || err);
    }
    return this.manifestEntries;
  },

  registerEntry(entry = {}, meta = null) {
    const normalized = {
      id: String(entry.id || entry.path || '').trim(),
      path: String(entry.path || entry.id || '').trim(),
      default: Boolean(entry.default),
      generated: Boolean(entry.generated),
      ownerId: entry.ownerId || '',
      stateKind: entry.stateKind || '',
    };
    if (!normalized.id || !normalized.path) return null;
    this.figureEntries = [normalized, ...this.allEntries().filter((item) => item.path !== normalized.path && item.id !== normalized.id)];
    if (meta) this.metaCache[normalized.path] = meta;
    window.dispatchEvent(new CustomEvent('body-figure-meta-ready', { detail: { tag: normalized.id, id: normalized.id, generated: normalized.generated } }));
    return normalized;
  },

  allEntries() {
    const byPath = new Map();
    const add = (item) => {
      const id = String(item?.id || item?.path || '').trim();
      const path = String(item?.path || item?.id || '').trim();
      if (!id || !path || byPath.has(path)) return;
      byPath.set(path, { ...item, id, path });
    };
    (Array.isArray(this.figureEntries) ? this.figureEntries : []).forEach(add);
    (Array.isArray(this.manifestEntries) ? this.manifestEntries : []).forEach(add);
    Object.values(this.tagIndex || {}).flat().forEach(add);
    return [...byPath.values()];
  },

  tokenText(value) {
    return String(value ?? '').replace(/^[\[\s]+|[\]\s]+$/g, '').trim();
  },

  collectTokens(value, out = []) {
    if (value == null) return out;
    if (Array.isArray(value)) {
      value.forEach((item) => this.collectTokens(item, out));
      return out;
    }
    if (typeof value === 'object') {
      Object.values(value).forEach((item) => this.collectTokens(item, out));
      return out;
    }
    String(value).split(/[、,，;；|｜\s]+/).map((item) => this.tokenText(item)).filter(Boolean).forEach((item) => out.push(item));
    return out;
  },

  collectProfileTokens(meta = {}, rows = []) {
    const cfg = window.GameModules.appearanceProfileTags;
    const normalized = cfg?.normalizeNaturalMeta?.(meta, {}) || meta || {};
    const tokens = [];
    ['characterId', 'ownerId', 'personId', 'stateKind', 'tags'].forEach((key) => this.collectTokens(meta?.[key], tokens));
    ['overall', 'figure', 'height', 'weight', 'skinTone', 'aura'].forEach((key) => this.collectTokens(normalized[key], tokens));
    ['styleBase', 'makeupBase', 'colorScheme', 'hosiery', 'hairstyle', 'accessoryDensity'].forEach((key) => this.collectTokens(meta?.[key], tokens));
    (rows || []).forEach((row) => {
      this.collectTokens(row?.item?.tags, tokens);
      this.collectTokens(row?.tags, tokens);
    });
    return new Set(tokens);
  },

  normalizeGender(value = '') {
    const raw = String(value || '').trim().toLowerCase();
    if (raw.includes('女') || raw.includes('female') || raw.includes('woman') || raw.includes('girl')) return 'female';
    if (raw.includes('男') || raw.includes('male') || raw.includes('man') || raw.includes('boy')) return 'male';
    return '';
  },

  profileGender(meta = {}) {
    return this.normalizeGender(meta?.gender || meta?.性别 || meta?.profile?.gender || '');
  },

  figureGender(entry = {}, meta = {}) {
    const explicit = this.normalizeGender(meta?.gender || entry?.gender || '');
    if (explicit) return explicit;
    const target = String(entry?.path || entry?.id || '').trim().toLowerCase();
    if (target.startsWith('male/')) return 'male';
    if (target.startsWith('female/')) return 'female';
    return '';
  },

  collectFigureTokens(meta = {}) {
    const tokens = [];
    ['characterId', 'ownerId', 'personId', 'stateKind', 'tags'].forEach((key) => this.collectTokens(meta?.[key], tokens));
    ['overall', 'figure', 'height', 'weight', 'skinTone', 'aura'].forEach((key) => this.collectTokens(meta?.[key], tokens));
    ['styleBase', 'makeupBase', 'colorScheme', 'hosiery', 'hairstyle', 'accessoryDensity'].forEach((key) => this.collectTokens(meta?.[key], tokens));
    (meta?.parts || []).forEach((part) => this.collectTokens(part?.tags, tokens));
    return new Set(tokens);
  },

  figureOwnerId(meta = {}) {
    return String(meta?.characterId || meta?.ownerId || meta?.personId || '').trim();
  },

  stripOwnerToken(meta = {}, ownerId = '') {
    const id = String(ownerId || '').trim();
    if (!id || !Array.isArray(meta.tags)) return;
    meta.tags = meta.tags.filter((tag) => String(tag || '').trim() !== id);
  },

  clearFigureOwner(meta = {}, ownerId = '') {
    const id = String(ownerId || this.figureOwnerId(meta)).trim();
    ['characterId', 'ownerId', 'personId'].forEach((key) => {
      if (!id || String(meta?.[key] || '').trim() === id) meta[key] = '';
    });
    ['characterName', 'ownerName', 'personName'].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(meta, key)) meta[key] = '';
    });
    meta.activeFigure = false;
    this.stripOwnerToken(meta, id);
    return meta;
  },

  assignFigureOwner(meta = {}, ownerId = '', ownerName = '', stateKind = '') {
    const id = String(ownerId || '').trim();
    if (!id) return meta;
    const name = String(ownerName || '').trim();
    meta.characterId = id;
    meta.ownerId = id;
    meta.personId = id;
    if (name) {
      meta.characterName = name;
      meta.ownerName = name;
      meta.personName = name;
    }
    if (stateKind) meta.stateKind = stateKind === 'dressed' ? 'dressed' : 'natural';
    meta.activeFigure = true;
    const tags = Array.isArray(meta.tags) ? meta.tags.map((tag) => String(tag || '').trim()).filter(Boolean) : [];
    if (!tags.includes(id)) tags.unshift(id);
    meta.tags = tags;
    return meta;
  },

  scoreFigureMeta(profileTokens, figureMeta = {}) {
    const figureTokens = this.collectFigureTokens(figureMeta);
    let score = 0;
    figureTokens.forEach((token) => {
      if (profileTokens.has(token)) score += 1;
    });
    return score;
  },

  randomEntry(entries = []) {
    const list = entries.length ? entries : this.allEntries();
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)] || list[0];
  },

  figureTime(meta = {}, entry = {}) {
    const stamp = Date.parse(meta?.generatedAt || meta?.createdAt || '') || 0;
    if (stamp) return stamp;
    const id = String(entry?.id || entry?.path || meta?.id || '');
    const match = id.match(/(\d{10,})$/);
    return match ? Number(match[1]) || 0 : 0;
  },

  async loadLocalEntries() {
    try {
      const res = await fetch('/__dev/body-figure-index', { cache: 'no-cache' });
      if (!res.ok) return this.manifestEntries;
      const data = await res.json();
      const entries = (Array.isArray(data?.figures) ? data.figures : [])
        .map((item) => ({
          id: String(item?.id || item?.path || '').trim(),
          path: String(item?.path || item?.id || '').trim(),
          default: Boolean(item?.default),
          generated: Boolean(item?.generated),
          ownerId: item?.ownerId || '',
          stateKind: item?.stateKind || '',
        }))
        .filter((item) => item.id && item.path);
      if (entries.length) {
        const byPath = new Map([...this.manifestEntries, ...entries].map((item) => [item.path, item]));
        this.manifestEntries = [...byPath.values()];
      }
    } catch (_) {
      // Static hosting has no dev index endpoint; index.json remains the fallback.
    }
    return this.manifestEntries;
  },

  async ensureEntriesLoaded() {
    await this.loadManifest();
    await this.loadLocalEntries();
    await Promise.all(this.allEntries().map((entry) => this.loadMeta(entry.path)));
    return this.allEntries();
  },

  scoredFigures(meta = {}, rows = [], options = {}) {
    const ownerId = String(meta?.characterId || meta?.ownerId || meta?.personId || '').trim();
    const profileTokens = this.collectProfileTokens(meta, rows);
    const targetGender = this.profileGender(meta);
    return this.allEntries()
      .filter((entry) => !entry?.mask && !String(entry?.path || '').startsWith('mask/'))
      .map((entry) => {
        const cached = this.metaCache[entry.path] || null;
        const boundOwnerId = this.figureOwnerId(cached);
        const boundOther = Boolean(boundOwnerId && ownerId && boundOwnerId !== ownerId);
        const exactOwner = Boolean(boundOwnerId && ownerId && boundOwnerId === ownerId);
        const figureGender = this.figureGender(entry, cached || {});
        const genderMismatch = Boolean(targetGender && figureGender && targetGender !== figureGender);
        const baseScore = cached ? this.scoreFigureMeta(profileTokens, cached) : 0;
        const score = baseScore + (exactOwner ? 1000 : 0);
        return {
          entry,
          cached,
          score,
          baseScore,
          exactOwner,
          boundOwnerId,
          boundOther,
          figureGender,
          genderMismatch,
          time: this.figureTime(cached || {}, entry),
        };
      })
      .filter((item) => !item.genderMismatch || item.exactOwner)
      .filter((item) => options.includeBoundOthers || !item.boundOther)
      .sort((a, b) => (b.score - a.score) || (Number(b.exactOwner) - Number(a.exactOwner)) || (b.time - a.time) || String(a.entry.id).localeCompare(String(b.entry.id)));
  },

  pickFigureEntry(meta = {}, rows = []) {
    const entries = this.allEntries().filter((entry) => !entry?.mask && !String(entry?.path || '').startsWith('mask/'));
    if (!entries.length) return null;
    const scored = this.scoredFigures(meta, rows);
    const cachedScored = scored.filter((item) => item.cached);
    const maxScore = Math.max(0, ...cachedScored.map((item) => item.score));
    if (maxScore <= 0) {
      const fallback = cachedScored.length ? cachedScored : scored;
      const picked = fallback[Math.floor(Math.random() * fallback.length)] || fallback[0] || null;
      return picked ? { ...picked, random: true } : { entry: this.randomEntry(entries), cached: null, score: 0, random: true };
    }
    return cachedScored[0] || null;
  },

  async listFigureChoices(meta = {}, rows = []) {
    await this.ensureEntriesLoaded();
    return this.scoredFigures(meta, rows, { includeBoundOthers: true })
      .filter((item) => item.cached)
      .map((item) => {
        const cached = item.cached || {};
        return {
          id: item.entry.id,
          path: item.entry.path,
          metaPath: `${item.entry.path}/meta.json`,
          imageSrc: this.basePath(`${item.entry.path}/${cached.image || 'figure.png'}`),
          label: cached.label || item.entry.id,
          score: item.score,
          baseScore: item.baseScore,
          exactOwner: item.exactOwner,
          boundOwnerId: item.boundOwnerId,
          boundOther: item.boundOther,
          boundOwnerName: cached.characterName || cached.ownerName || cached.personName || '',
          stateKind: cached.stateKind || item.entry.stateKind || '',
          generated: Boolean(cached.generated || item.entry.generated),
          real: Boolean(cached.real),
        };
      });
  },

  async bindCurrentFigure(pathKey = '', ownerId = '', ownerName = '', options = {}) {
    const targetPath = String(pathKey || '').replace(/^\/+/, '').replace(/\/meta\.json$/i, '').trim();
    const id = String(ownerId || '').trim();
    if (!targetPath || !id) return { ok: false, error: 'missing target or owner' };
    await this.ensureEntriesLoaded();
    const target = this.metaCache[targetPath] || await this.loadMeta(targetPath);
    if (!target) return { ok: false, error: 'target meta not found' };
    const currentOwner = this.figureOwnerId(target);
    if (currentOwner && currentOwner !== id && !options.force) {
      return { ok: false, error: 'figure already bound', boundOwnerId: currentOwner };
    }
    const changed = [];
    this.allEntries().forEach((entry) => {
      const meta = this.metaCache[entry.path];
      if (!meta) return;
      const metaOwner = this.figureOwnerId(meta);
      if (entry.path === targetPath) {
        if (metaOwner && metaOwner !== id) this.clearFigureOwner(meta, metaOwner);
        this.assignFigureOwner(meta, id, ownerName, options.stateKind || meta.stateKind || '');
        changed.push(entry.path);
        return;
      }
      if (metaOwner === id) {
        this.clearFigureOwner(meta, id);
        changed.push(entry.path);
      }
    });
    const saved = await Promise.all([...new Set(changed)].map((path) => this.saveMeta(path, this.metaCache[path])));
    if (saved.some((ok) => !ok)) return { ok: false, error: 'save failed' };
    window.dispatchEvent(new CustomEvent('body-figure-meta-ready', { detail: { tag: 'current-figure-changed', id, path: targetPath } }));
    return { ok: true, path: targetPath };
  },

  rowForPart(rows = [], part = '') {
    const name = String(part || '').trim();
    return (rows || []).find((row) => {
      const p = String(row?.item?.part || '').trim();
      return p === name || p.includes(name) || name.includes(p);
    }) || null;
  },

  imageSize(meta = {}) {
    const size = meta.imageSize || {};
    const width = Number(size.width || meta.imageWidth || meta.width) || 529;
    const height = Number(size.height || meta.imageHeight || meta.height) || 1024;
    return { width, height };
  },

  clamp(value, min = 0, max = 100) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  },

  roundPoint(point = {}) {
    return {
      x: Math.round(this.clamp(point.x) * 10) / 10,
      y: Math.round(this.clamp(point.y) * 10) / 10,
    };
  },

  stagePoint(point = {}, meta = {}) {
    const x = Number(point.x) || 50;
    const y = Number(point.y) || 50;
    const { width, height } = this.imageSize(meta);
    const imageAspect = width / height;
    const stageAspect = 3 / 4;
    if (imageAspect < stageAspect) {
      const usedWidth = (imageAspect / stageAspect) * 100;
      const padX = (100 - usedWidth) / 2;
      return { x: padX + (x / 100) * usedWidth, y };
    }
    if (imageAspect > stageAspect) {
      const usedHeight = (stageAspect / imageAspect) * 100;
      const padY = (100 - usedHeight) / 2;
      return { x, y: padY + (y / 100) * usedHeight };
    }
    return { x, y };
  },

  imagePointFromStage(point = {}, meta = {}) {
    const x = this.clamp(point.x);
    const y = this.clamp(point.y);
    const { width, height } = this.imageSize(meta);
    const imageAspect = width / height;
    const stageAspect = 3 / 4;
    if (imageAspect < stageAspect) {
      const usedWidth = (imageAspect / stageAspect) * 100;
      const padX = (100 - usedWidth) / 2;
      return this.roundPoint({ x: ((x - padX) / usedWidth) * 100, y });
    }
    if (imageAspect > stageAspect) {
      const usedHeight = (stageAspect / imageAspect) * 100;
      const padY = (100 - usedHeight) / 2;
      return this.roundPoint({ x, y: ((y - padY) / usedHeight) * 100 });
    }
    return this.roundPoint({ x, y });
  },

  buildAnnotations(meta = {}, rows = []) {
    const parts = Array.isArray(meta.parts) ? meta.parts : [];
    const annotations = parts.map((item) => {
      const part = String(item.part || '').trim();
      const row = this.rowForPart(rows, part);
      const anchor = item.anchor || { x: 50, y: 50 };
      const stageAnchor = this.stagePoint(anchor, meta);
      const label = item.label || { x: anchor.x < 50 ? 8 : 92, y: anchor.y, side: anchor.x < 50 ? 'left' : 'right' };
      return {
        part,
        anchor: {
          x: stageAnchor.x,
          y: stageAnchor.y,
          imageX: Number(anchor.x) || 50,
          imageY: Number(anchor.y) || 50,
        },
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
          x1: stageAnchor.x,
          y1: stageAnchor.y,
          x2: Number(label.x) || 10,
          y2: Number(label.y) || 50,
        },
      };
    });
    return this.spreadLabelRows(annotations);
  },

  spreadLabelRows(annotations = []) {
    const groups = { left: [], right: [] };
    annotations.forEach((ann) => {
      const side = ann?.label?.side === 'right' ? 'right' : 'left';
      groups[side].push(ann);
    });
    Object.values(groups).forEach((list) => {
      if (!list.length) return;
      list.sort((a, b) => (Number(a?.label?.y) || 0) - (Number(b?.label?.y) || 0));
      const minY = 7;
      const maxY = 88;
      const step = list.length > 1 ? (maxY - minY) / (list.length - 1) : 0;
      list.forEach((ann, index) => {
        const y = list.length > 1 ? minY + (step * index) : Number(ann.label.y) || 50;
        ann.label.y = Math.round(y * 10) / 10;
        ann.line.y2 = ann.label.y;
      });
    });
    return annotations;
  },

  resolveFromMeta(cached = {}, entry = {}, rows = [], sectionTitle = '', tag = '') {
    if (!cached || !entry) return null;
    return {
      tag,
      id: entry.id,
      path: entry.path,
      metaPath: `${entry.path}/meta.json`,
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
    await this.loadManifest();
    const tag = this.matchTag(meta);
    if (!tag) return null;
    const entry = this.pickFigureEntry(tag);
    if (!entry) return null;
    const cached = await this.loadMeta(entry.path);
    if (!cached) return null;
    return this.resolveFromMeta(cached, entry, rows, sectionTitle, tag);
  },

  async prefetchForTag(tag = 'girl') {
    const entry = this.pickFigureEntry(tag);
    if (!entry) return;
    await this.loadMeta(entry.path);
    window.dispatchEvent(new CustomEvent('body-figure-meta-ready', { detail: { tag, id: entry.id } }));
  },

  async prefetchAll() {
    await Promise.all(Object.keys(this.tagIndex).map((tag) => this.prefetchForTag(tag)));
  },

  resolveSync(meta = {}, rows = [], sectionTitle = '', options = {}) {
    if (options?.mask) {
      const entry = this.maskEntry;
      const cached = this.metaCache[entry.path];
      if (!cached) return { tag: 'mask', entry, pending: true, label: entry.id, sectionTitle };
      return this.resolveFromMeta(cached, entry, rows, sectionTitle, 'mask');
    }
    const picked = this.pickFigureEntry(meta, rows);
    const entry = picked?.entry || null;
    if (!entry) return null;
    const cached = picked.cached || this.metaCache[entry.path];
    if (!cached) return { tag: entry.id, entry, pending: true, label: entry.id, sectionTitle };
    return this.resolveFromMeta(cached, entry, rows, sectionTitle, entry.id);
  },

  async resolve(meta = {}, rows = [], sectionTitle = '', options = {}) {
    if (options?.mask) {
      const entry = this.maskEntry;
      const cached = await this.loadMeta(entry.path);
      if (!cached) return null;
      return this.resolveFromMeta(cached, entry, rows, sectionTitle, 'mask');
    }
    await this.loadManifest();
    await Promise.all(this.allEntries().map((entry) => this.loadMeta(entry.path)));
    const picked = this.pickFigureEntry(meta, rows);
    const entry = picked?.entry || null;
    const cached = picked?.cached || (entry ? this.metaCache[entry.path] : null);
    if (!entry || !cached) return null;
    return this.resolveFromMeta(cached, entry, rows, sectionTitle, entry.id);
  },

  async prefetchForTag(tag = 'image1') {
    await this.loadManifest();
    const entry = this.allEntries().find((item) => item.id === tag || item.path === tag) || this.randomEntry();
    if (!entry) return;
    await this.loadMeta(entry.path);
    window.dispatchEvent(new CustomEvent('body-figure-meta-ready', { detail: { tag, id: entry.id } }));
  },

  async prefetchAll() {
    await this.loadManifest();
    await Promise.all(this.allEntries().map((entry) => this.loadMeta(entry.path)));
    window.dispatchEvent(new CustomEvent('body-figure-meta-ready', { detail: { tag: 'all' } }));
  },

  async prefetchMask() {
    const entry = this.maskEntry;
    if (!entry) return;
    await this.loadMeta(entry.path);
    window.dispatchEvent(new CustomEvent('body-figure-meta-ready', { detail: { tag: 'mask', id: entry.id } }));
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

  stagePercentFromEvent(event, stage) {
    const rect = stage?.getBoundingClientRect?.();
    if (!rect?.width || !rect?.height) return null;
    return {
      x: this.clamp(((event.clientX - rect.left) / rect.width) * 100),
      y: this.clamp(((event.clientY - rect.top) / rect.height) * 100),
    };
  },

  updateAnnotationAnchor(figure = {}, ann = {}, stagePoint = {}) {
    const cached = this.metaCache?.[figure.path];
    if (!cached || !ann?.part) return null;
    const imagePoint = this.imagePointFromStage(stagePoint, cached);
    const renderedPoint = this.stagePoint(imagePoint, cached);
    const item = (cached.parts || []).find((part) => String(part?.part || '') === String(ann.part || ''));
    if (item) item.anchor = imagePoint;
    ann.anchor = {
      x: renderedPoint.x,
      y: renderedPoint.y,
      imageX: imagePoint.x,
      imageY: imagePoint.y,
    };
    if (ann.line) {
      ann.line.x1 = renderedPoint.x;
      ann.line.y1 = renderedPoint.y;
    }
    return { cached, imagePoint, renderedPoint };
  },

  async saveMeta(pathKey = '', meta = {}) {
    const key = String(pathKey || '').replace(/^\/+/, '');
    if (!key) return false;
    try {
      const res = await fetch('/__dev/body-figure-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `${key}/meta.json`, meta }),
      });
      if (!res.ok) throw new Error(await res.text());
      window.dispatchEvent(new CustomEvent('body-figure-meta-saved', { detail: { path: key } }));
      return true;
    } catch (err) {
      console.warn('[body-figure] meta 保存失败:', err?.message || err);
      return false;
    }
  },

  startAnchorDrag(event, figure = {}, ann = {}) {
    const stage = event?.currentTarget?.closest?.('.body-figure-stage');
    if (!stage || !figure?.path || !ann?.part) return;
    const target = event.currentTarget;
    target.setPointerCapture?.(event.pointerId);
    target.classList.add('dragging');
    const apply = (pointerEvent) => {
      const stagePoint = this.stagePercentFromEvent(pointerEvent, stage);
      if (!stagePoint) return;
      this.updateAnnotationAnchor(figure, ann, stagePoint);
    };
    const finish = async (pointerEvent) => {
      apply(pointerEvent);
      target.releasePointerCapture?.(event.pointerId);
      target.classList.remove('dragging');
      window.removeEventListener('pointermove', apply);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      const cached = this.metaCache?.[figure.path];
      if (cached) await this.saveMeta(figure.path, cached);
    };
    apply(event);
    window.addEventListener('pointermove', apply);
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', finish, { once: true });
  },

  openAnnotationPart(rows = [], part = '') {
    return window.GameModules.bodySilhouette?.openBodyPartDetail?.(rows, part) || false;
  },

  isAnnotationActive(rows = [], part = '') {
    return window.GameModules.bodySilhouette?.isBodyPartActive?.(rows, part) || false;
  },
};
