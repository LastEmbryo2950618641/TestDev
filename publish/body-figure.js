window.GameModules = window.GameModules || {};

function resolveBodyFigureAssetSource() {
  const coreSource = window.GameModules?.platform?.core?.assets?.bodyFigure;
  if (coreSource?.assetBasePath) return coreSource;
  return {
    assetBasePath(relative = '') {
      return `assets/body-figures/${String(relative || '').replace(/^\/+/, '')}`;
    },
    loadIndex() {
      return fetch('assets/body-figures/index.json', { cache: 'no-cache' });
    },
    saveMeta() {
      return Promise.resolve({ ok: false });
    },
    saveImage() {
      return Promise.resolve({ ok: false });
    },
  };
}

function staticBodyFigureIndex() {
  const data = window.GameModules?.bodyFigureStatic?.index || {};
  return Array.isArray(data?.figures) ? data.figures : [];
}

function staticBodyFigureMeta(relativePath = '') {
  const key = String(relativePath || '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
  return key ? (window.GameModules?.bodyFigureStatic?.metas || {})[key] || null : null;
}

function normalizeBodyFigureMeta(meta = {}, fallback = {}) {
  return {
    ...fallback,
    ...(meta || {}),
    id: String(meta?.id || fallback.id || fallback.path || '').trim(),
    path: String(meta?.path || fallback.path || '').trim(),
    ownerId: String(meta?.ownerId || fallback.ownerId || meta?.characterId || fallback.characterId || '').trim(),
    stateKind: String(meta?.stateKind || fallback.stateKind || 'natural').trim() || 'natural',
  };
}

function normalizeBodyFigureEntry(entry = {}, fallback = {}) {
  const path = String(entry?.path || fallback.path || '').trim();
  const id = String(entry?.id || fallback.id || path || '').trim();
  return {
    ...fallback,
    ...(entry || {}),
    id,
    path,
    default: Boolean(entry?.default ?? fallback.default),
    generated: Boolean(entry?.generated ?? fallback.generated),
    ownerId: String(entry?.ownerId || fallback.ownerId || '').trim(),
    stateKind: String(entry?.stateKind || fallback.stateKind || 'natural').trim() || 'natural',
    image: String(entry?.image || fallback.image || '').trim(),
  };
}

function pickBodyFigureRowValue(rows = [], keys = []) {
  for (const row of rows || []) {
    const text = String(row?.text || row?.value || row?.label || '').trim();
    if (!text) continue;
    const tag = String(row?.tag || row?.part || row?.key || '').trim().toLowerCase();
    if (!keys.length || keys.includes(tag)) return text;
  }
  return '';
}

function normalizeBodyFigureAnnotations(meta = {}) {
  if (Array.isArray(meta?.annotations) && meta.annotations.length) return meta.annotations;
  return (Array.isArray(meta?.parts) ? meta.parts : [])
    .map((part, index) => {
      const partName = String(part?.part || part?.name || part?.title || '').trim();
      const anchor = part?.anchor || {};
      const label = part?.label || {};
      const anchorX = Number(anchor.x ?? part?.anchorX ?? part?.x ?? 50);
      const anchorY = Number(anchor.y ?? part?.anchorY ?? part?.y ?? (10 + index * 7));
      const labelX = Number(label.x ?? part?.labelX ?? (anchorX >= 55 ? 90 : 10));
      const labelY = Number(label.y ?? part?.labelY ?? anchorY);
      return {
        ...part,
        part: partName,
        title: partName,
        anchorX,
        anchorY,
        x: labelX,
        y: labelY,
        label: {
          x: labelX,
          y: labelY,
          side: label.side || (labelX >= anchorX ? 'right' : 'left'),
        },
        line: {
          x1: anchorX,
          y1: anchorY,
          x2: labelX,
          y2: labelY,
        },
      };
    })
    .filter((part) => part.part);
}

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
  manifestPromise: null,
  resolvedCache: {},
  currentBindings: {},
  activeAnnotationPart: '',

  basePath(relative = '') {
    return resolveBodyFigureAssetSource().assetBasePath(relative);
  },

  buildImageSrc(path = '', imageName = '') {
    const cleanPath = String(path || '').trim();
    if (!cleanPath) return '';
    const fileName = String(imageName || '').trim() || 'figure.png';
    return this.basePath(`${cleanPath}/${fileName}`);
  },

  async loadMeta(relativePath = '') {
    const key = String(relativePath || '').trim();
    if (!key) return null;
    if (this.metaCache[key]) return this.metaCache[key];
    const staticMeta = staticBodyFigureMeta(key);
    if (staticMeta) {
      this.metaCache[key] = normalizeBodyFigureMeta(staticMeta, { path: key, id: key });
      return this.metaCache[key];
    }
    try {
      const res = await fetch(this.basePath(`${key}/meta.json`), { cache: 'no-cache' });
      if (!res.ok) return null;
      const meta = await res.json();
      this.metaCache[key] = normalizeBodyFigureMeta(meta, { path: key, id: key });
      return this.metaCache[key];
    } catch (err) {
      console.warn('[body-figure] meta load failed:', key, err?.message || err);
      return null;
    }
  },

  async loadManifest() {
    if (this.manifestLoaded) return this.manifestEntries;
    if (this.manifestPromise) return this.manifestPromise;
    this.manifestPromise = (async () => {
      let figures = staticBodyFigureIndex();
      try {
        if (!figures.length) {
          const res = await resolveBodyFigureAssetSource().loadIndex();
          if (res?.ok) {
          const data = await res.json().catch(() => ({}));
          figures = Array.isArray(data?.figures) ? data.figures : [];
          }
        }
      } catch (err) {
        console.warn('[body-figure] manifest load failed:', err?.message || err);
      }
      const merged = [...figures, ...this.figureEntries]
        .map((entry) => normalizeBodyFigureEntry(entry, { image: 'figure.png' }))
        .filter((entry) => entry.path);
      const dedup = [];
      const seen = new Set();
      for (const entry of merged) {
        if (seen.has(entry.path)) continue;
        seen.add(entry.path);
        dedup.push(entry);
      }
      this.manifestEntries = dedup;
      this.manifestLoaded = true;
      this.manifestPromise = null;
      return dedup;
    })();
    return this.manifestPromise;
  },

  async prefetchAll() {
    const entries = await this.loadManifest();
    await Promise.all(entries.map(async (entry) => {
      const meta = await this.loadMeta(entry.path);
      if (meta) this.metaCache[entry.path] = meta;
    }));
    return true;
  },

  async prefetchMask() {
    const path = String(this.maskEntry?.path || '').trim();
    if (!path) return null;
    return this.loadMeta(path);
  },

  registerEntry(entry = {}, meta = {}) {
    const normalizedEntry = normalizeBodyFigureEntry(entry, meta);
    if (!normalizedEntry.path) return null;
    const normalizedMeta = normalizeBodyFigureMeta(meta, normalizedEntry);
    this.metaCache[normalizedEntry.path] = normalizedMeta;
    this.manifestEntries = [normalizedEntry, ...(this.manifestEntries || []).filter((item) => item.path !== normalizedEntry.path)];
    this.manifestLoaded = true;
    return normalizedEntry;
  },

  getBinding(characterId = '', stateKind = 'natural') {
    const key = `${String(characterId || '').trim()}::${String(stateKind || 'natural').trim() || 'natural'}`;
    return this.currentBindings[key] || null;
  },

  setBinding(characterId = '', stateKind = 'natural', path = '') {
    const cleanCharacterId = String(characterId || '').trim();
    const cleanPath = String(path || '').trim();
    const key = `${cleanCharacterId}::${String(stateKind || 'natural').trim() || 'natural'}`;
    if (!cleanCharacterId) return;
    if (!cleanPath) {
      delete this.currentBindings[key];
      return;
    }
    this.currentBindings[key] = cleanPath;
  },

  chooseDefaultPath(meta = {}, entries = []) {
    const ownerId = String(meta?.ownerId || meta?.characterId || meta?.personId || '').trim();
    const stateKind = String(meta?.stateKind || 'natural').trim() || 'natural';
    const boundPath = this.getBinding(ownerId, stateKind);
    if (boundPath) return boundPath;
    const generated = entries.find((entry) => entry.ownerId && ownerId && entry.ownerId === ownerId && String(entry.stateKind || 'natural') === stateKind);
    if (generated?.path) return generated.path;
    const matchedDefault = entries.find((entry) => entry.default && (!entry.stateKind || String(entry.stateKind) === stateKind));
    if (matchedDefault?.path) return matchedDefault.path;
    return entries[0]?.path || '';
  },

  async listFigureChoices(meta = {}, rows = []) {
    const entries = await this.loadManifest();
    const activePath = this.chooseDefaultPath(meta, entries);
    return Promise.all(entries.map(async (entry) => {
      const entryMeta = await this.loadMeta(entry.path) || normalizeBodyFigureMeta(entry, { path: entry.path, id: entry.id });
      const imageName = String(entryMeta?.image || entry.image || 'figure.png').trim() || 'figure.png';
      const ownerId = String(meta?.ownerId || meta?.characterId || meta?.personId || '').trim();
      const title = String(entryMeta?.title || entryMeta?.label || entry.id || entry.path).trim();
      return {
        id: entry.id || entry.path,
        path: entry.path,
        ownerId: entry.ownerId || entryMeta?.ownerId || '',
        generated: Boolean(entry.generated || entryMeta?.generated),
        default: Boolean(entry.default),
        active: entry.path === activePath,
        disabled: false,
        imageSrc: this.buildImageSrc(entry.path, imageName),
        title,
        subtitle: String(entryMeta?.summary || pickBodyFigureRowValue(rows, ['summary', 'overall']) || '').trim(),
        stateKind: String(entry.stateKind || entryMeta?.stateKind || 'natural').trim() || 'natural',
        meta: entryMeta,
        mine: Boolean(ownerId && (entry.ownerId === ownerId || entryMeta?.ownerId === ownerId)),
      };
    }));
  },

  async bindCurrentFigure(path = '', characterId = '', ownerName = '', options = {}) {
    const cleanPath = String(path || '').trim();
    const cleanCharacterId = String(characterId || '').trim();
    const stateKind = String(options?.stateKind || 'natural').trim() || 'natural';
    if (!cleanPath || !cleanCharacterId) return { ok: false, error: 'missing-path-or-character' };
    const meta = await this.loadMeta(cleanPath) || normalizeBodyFigureMeta({ path: cleanPath, ownerId: cleanCharacterId, ownerName, stateKind });
    this.metaCache[cleanPath] = normalizeBodyFigureMeta(meta, { path: cleanPath, ownerId: cleanCharacterId, ownerName, stateKind });
    this.setBinding(cleanCharacterId, stateKind, cleanPath);
    return { ok: true, path: cleanPath, meta: this.metaCache[cleanPath] };
  },

  buildResolvedFigure(path = '', meta = {}, rows = [], sectionTitle = '', options = {}) {
    const resolvedMeta = this.metaCache[path] || normalizeBodyFigureMeta(meta, { path, id: path });
    const imageName = String(resolvedMeta?.image || 'figure.png').trim() || 'figure.png';
    const tag = `${String(resolvedMeta?.ownerId || meta?.ownerId || meta?.characterId || 'figure').trim()}:${String(resolvedMeta?.stateKind || meta?.stateKind || 'natural').trim()}:${String(sectionTitle || '').trim()}`;
    const annotations = normalizeBodyFigureAnnotations(resolvedMeta);
    const imageSrc = this.buildImageSrc(path, imageName);
    const maskSrc = options?.mask ? this.buildImageSrc(this.maskEntry.path, 'figure.png') : '';
    return {
      id: resolvedMeta.id || path,
      path,
      tag,
      imageSrc,
      maskSrc,
      displaySrc: maskSrc || imageSrc,
      title: String(resolvedMeta?.title || resolvedMeta?.label || sectionTitle || '').trim(),
      summary: String(resolvedMeta?.summary || pickBodyFigureRowValue(rows, ['summary', 'overall']) || '').trim(),
      annotations,
      ownerId: resolvedMeta.ownerId || '',
      stateKind: resolvedMeta.stateKind || 'natural',
      meta: resolvedMeta,
    };
  },

  resolveSync(meta = {}, rows = [], sectionTitle = '', options = {}) {
    const cacheKey = JSON.stringify({
      ownerId: meta?.ownerId || meta?.characterId || meta?.personId || '',
      stateKind: meta?.stateKind || 'natural',
      sectionTitle: String(sectionTitle || ''),
      mask: Boolean(options?.mask),
    });
    const existing = this.resolvedCache[cacheKey];
    if (existing) return existing;
    const ownerId = String(meta?.ownerId || meta?.characterId || meta?.personId || '').trim();
    const stateKind = String(meta?.stateKind || 'natural').trim() || 'natural';
    const boundPath = this.getBinding(ownerId, stateKind);
    if (boundPath && this.metaCache[boundPath]) {
      const resolved = this.buildResolvedFigure(boundPath, meta, rows, sectionTitle, options);
      this.resolvedCache[cacheKey] = resolved;
      return resolved;
    }
    const staticEntries = (this.manifestEntries?.length ? this.manifestEntries : staticBodyFigureIndex().map((entry) => normalizeBodyFigureEntry(entry, { image: 'figure.png' }))).filter((entry) => entry.path);
    const staticPath = this.chooseDefaultPath(meta, staticEntries);
    const staticMeta = staticBodyFigureMeta(staticPath);
    if (staticPath && staticMeta) {
      this.metaCache[staticPath] = normalizeBodyFigureMeta(staticMeta, { path: staticPath, id: staticPath });
      const resolved = this.buildResolvedFigure(staticPath, meta, rows, sectionTitle, options);
      this.resolvedCache[cacheKey] = resolved;
      return resolved;
    }
    return { pending: true, cacheKey };
  },

  async resolve(meta = {}, rows = [], sectionTitle = '', options = {}) {
    const entries = await this.loadManifest();
    const path = this.chooseDefaultPath(meta, entries);
    if (!path) return null;
    await this.loadMeta(path);
    const resolved = this.buildResolvedFigure(path, meta, rows, sectionTitle, options);
    const cacheKey = JSON.stringify({
      ownerId: meta?.ownerId || meta?.characterId || meta?.personId || '',
      stateKind: meta?.stateKind || 'natural',
      sectionTitle: String(sectionTitle || ''),
      mask: Boolean(options?.mask),
    });
    this.resolvedCache[cacheKey] = resolved;
    return resolved;
  },

  calloutStyle(ann = {}) {
    const x = Number(ann?.x ?? ann?.left ?? 0);
    const y = Number(ann?.y ?? ann?.top ?? 0);
    return `left:${x}%;top:${y}%;`;
  },

  anchorStyle(ann = {}) {
    const x = Number(ann?.anchorX ?? ann?.x ?? ann?.left ?? 0);
    const y = Number(ann?.anchorY ?? ann?.y ?? ann?.top ?? 0);
    return `left:${x}%;top:${y}%;`;
  },

  startAnchorDrag() {
    return false;
  },

  openAnnotationPart(rows = [], part = '') {
    const cleanPart = String(part || '').trim();
    this.activeAnnotationPart = cleanPart;
    return Boolean(cleanPart && (rows || []).length >= 0);
  },

  isAnnotationActive(rows = [], part = '') {
    void rows;
    return this.activeAnnotationPart === String(part || '').trim();
  },
};
