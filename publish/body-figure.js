window.GameModules = window.GameModules || {};

const BODY_FIGURE_META_STORE_KEY = 'body-figure-meta-v1';

function clampBodyFigurePercent(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

/** Callout width as % of stage — keep in sync with `.body-figure-callout` CSS. */
const BODY_FIGURE_CALLOUT_WIDTH_PCT = 22;
/** Approx callout height as % of stage — keeps top edge inside when anchored at bottom. */
const BODY_FIGURE_CALLOUT_HEIGHT_PCT = 8;

/**
 * Layout reference (x,y) is the outer bottom corner in the side gutter.
 * Left grows right; right grows left — boxes stay in-frame.
 * Line attaches to the inner bottom corner facing the figure.
 */
function bodyFigureCalloutLayout(ann = {}) {
  const side = ann?.label?.side === 'right' ? 'right' : 'left';
  let x = clampBodyFigurePercent(ann?.label?.x ?? ann?.x ?? ann?.left ?? (side === 'right' ? 90 : 10));
  let y = clampBodyFigurePercent(ann?.label?.y ?? ann?.y ?? ann?.top ?? 50);
  y = Math.max(y, BODY_FIGURE_CALLOUT_HEIGHT_PCT);
  if (side === 'right') {
    x = Math.max(x, BODY_FIGURE_CALLOUT_WIDTH_PCT);
    return {
      side,
      x,
      y,
      transform: 'translate(-100%, -100%)',
      lineX: clampBodyFigurePercent(x - BODY_FIGURE_CALLOUT_WIDTH_PCT),
      lineY: y,
    };
  }
  x = Math.min(x, 100 - BODY_FIGURE_CALLOUT_WIDTH_PCT);
  return {
    side,
    x,
    y,
    transform: 'translate(0, -100%)',
    lineX: clampBodyFigurePercent(x + BODY_FIGURE_CALLOUT_WIDTH_PCT),
    lineY: y,
  };
}

function roundBodyFigurePoint(point = {}) {
  return {
    x: Math.round(clampBodyFigurePercent(point.x) * 10) / 10,
    y: Math.round(clampBodyFigurePercent(point.y) * 10) / 10,
  };
}

function bodyFigureImageSize(meta = {}) {
  const width = Number(meta?.imageSize?.width ?? meta?.width ?? 529) || 529;
  const height = Number(meta?.imageSize?.height ?? meta?.height ?? 1024) || 1024;
  return { width, height };
}

function bodyFigureStagePoint(point = {}, meta = {}) {
  const x = clampBodyFigurePercent(point.x);
  const y = clampBodyFigurePercent(point.y);
  const { width, height } = bodyFigureImageSize(meta);
  if (!width || !height) return { x, y };
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
}

function bodyFigureImagePointFromStage(point = {}, meta = {}) {
  const x = clampBodyFigurePercent(point.x);
  const y = clampBodyFigurePercent(point.y);
  const { width, height } = bodyFigureImageSize(meta);
  if (!width || !height) return roundBodyFigurePoint({ x, y });
  const imageAspect = width / height;
  const stageAspect = 3 / 4;
  if (imageAspect < stageAspect) {
    const usedWidth = (imageAspect / stageAspect) * 100;
    const padX = (100 - usedWidth) / 2;
    return roundBodyFigurePoint({ x: ((x - padX) / usedWidth) * 100, y });
  }
  if (imageAspect > stageAspect) {
    const usedHeight = (stageAspect / imageAspect) * 100;
    const padY = (100 - usedHeight) / 2;
    return roundBodyFigurePoint({ x, y: ((y - padY) / usedHeight) * 100 });
  }
  return roundBodyFigurePoint({ x, y });
}

function readBodyFigureStoredMeta(pathKey = '') {
  const cleanPath = String(pathKey || '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
  if (!cleanPath) return null;
  const key = `${BODY_FIGURE_META_STORE_KEY}:${cleanPath}`;
  try {
    const saved = window.GameModules?.metadataStore?.get?.(key);
    if (saved && typeof saved === 'object') return saved;
  } catch (err) {
    console.warn('[body-figure] metadata store read failed:', err?.message || err);
  }
  try {
    const raw = window.localStorage?.getItem?.(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('[body-figure] local storage read failed:', err?.message || err);
    return null;
  }
}

async function writeBodyFigureStoredMeta(pathKey = '', meta = {}) {
  const cleanPath = String(pathKey || '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
  if (!cleanPath) return false;
  const key = `${BODY_FIGURE_META_STORE_KEY}:${cleanPath}`;
  let ok = false;
  try {
    const saved = window.GameModules?.metadataStore?.save?.(key, meta || {});
    if (saved && typeof saved.then === 'function') await saved;
    ok = true;
  } catch (err) {
    console.warn('[body-figure] metadata store save failed:', err?.message || err);
  }
  try {
    window.localStorage?.setItem?.(key, JSON.stringify(meta || {}));
    ok = true;
  } catch (err) {
    console.warn('[body-figure] local storage save failed:', err?.message || err);
  }
  return ok;
}

function mergeBodyFigureMeta(base = {}, override = {}) {
  return {
    ...(base || {}),
    ...(override || {}),
  };
}

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
  const parts = Array.isArray(meta?.annotations) && meta.annotations.length ? meta.annotations : (Array.isArray(meta?.parts) ? meta.parts : []);
  return parts
    .map((part, index) => {
      const partName = String(part?.part || part?.name || part?.title || '').trim();
      const anchor = part?.anchor || {};
      const label = part?.label || {};
      const imageAnchor = {
        x: Number(anchor.imageX ?? anchor.x ?? part?.anchorX ?? part?.x ?? 50),
        y: Number(anchor.imageY ?? anchor.y ?? part?.anchorY ?? part?.y ?? (10 + index * 7)),
      };
      const stageAnchor = bodyFigureStagePoint(imageAnchor, meta);
      const labelX = Number(label.x ?? part?.labelX ?? part?.x ?? (stageAnchor.x >= 55 ? 90 : 10));
      const labelY = Number(label.y ?? part?.labelY ?? part?.y ?? stageAnchor.y);
      const side = label.side || part?.side || (labelX >= stageAnchor.x ? 'right' : 'left');
      const layout = bodyFigureCalloutLayout({ label: { x: labelX, y: labelY, side } });
      return {
        ...part,
        part: partName,
        title: partName,
        anchorX: stageAnchor.x,
        anchorY: stageAnchor.y,
        anchor: {
          x: stageAnchor.x,
          y: stageAnchor.y,
          imageX: imageAnchor.x,
          imageY: imageAnchor.y,
        },
        x: labelX,
        y: labelY,
        label: {
          x: labelX,
          y: labelY,
          side,
        },
        line: {
          x1: stageAnchor.x,
          y1: stageAnchor.y,
          x2: layout.lineX,
          y2: layout.lineY,
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
  metaPromises: {},
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
    if (this.metaPromises[key]) return this.metaPromises[key];
    const storedMeta = readBodyFigureStoredMeta(key);
    const staticMeta = staticBodyFigureMeta(key);
    if (staticMeta || storedMeta) {
      this.metaCache[key] = normalizeBodyFigureMeta(mergeBodyFigureMeta(staticMeta || {}, storedMeta || {}), { path: key, id: key });
      return this.metaCache[key];
    }
    this.metaPromises[key] = (async () => {
      try {
        const res = await fetch(this.basePath(`${key}/meta.json`), { cache: 'no-cache' });
        if (!res.ok) return null;
        const meta = await res.json();
        this.metaCache[key] = normalizeBodyFigureMeta(mergeBodyFigureMeta(meta, readBodyFigureStoredMeta(key) || {}), { path: key, id: key });
        return this.metaCache[key];
      } catch (err) {
        console.warn('[body-figure] meta load failed:', key, err?.message || err);
        return null;
      } finally {
        delete this.metaPromises[key];
      }
    })();
    return this.metaPromises[key];
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
      this.metaCache[staticPath] = normalizeBodyFigureMeta(mergeBodyFigureMeta(staticMeta, readBodyFigureStoredMeta(staticPath) || {}), { path: staticPath, id: staticPath });
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
    const layout = bodyFigureCalloutLayout(ann);
    return `left:${layout.x}%;top:${layout.y}%;transform:${layout.transform};`;
  },

  anchorStyle(ann = {}) {
    const x = clampBodyFigurePercent(ann?.anchor?.x ?? ann?.anchorX ?? ann?.x ?? ann?.left ?? 50);
    const y = clampBodyFigurePercent(ann?.anchor?.y ?? ann?.anchorY ?? ann?.y ?? ann?.top ?? 50);
    return `left:${x}%;top:${y}%;transform:translate(-50%, -50%);`;
  },

  stagePercentFromEvent(event, stage) {
    const rect = stage?.getBoundingClientRect?.();
    if (!rect?.width || !rect?.height) return null;
    return {
      x: clampBodyFigurePercent(((event.clientX - rect.left) / rect.width) * 100),
      y: clampBodyFigurePercent(((event.clientY - rect.top) / rect.height) * 100),
    };
  },

  updateAnnotationAnchor(figure = {}, ann = {}, stagePoint = {}) {
    const cached = this.metaCache?.[figure.path];
    if (!cached || !ann?.part) return null;
    const imagePoint = bodyFigureImagePointFromStage(stagePoint, cached);
    const renderedPoint = bodyFigureStagePoint(imagePoint, cached);
    const item = (cached.parts || []).find((part) => String(part?.part || '') === String(ann.part || ''));
    if (item) {
      item.anchor = {
        x: renderedPoint.x,
        y: renderedPoint.y,
        imageX: imagePoint.x,
        imageY: imagePoint.y,
      };
      item.anchorX = renderedPoint.x;
      item.anchorY = renderedPoint.y;
      item.line = {
        ...(item.line || {}),
        x1: renderedPoint.x,
        y1: renderedPoint.y,
      };
    }
    ann.anchor = {
      x: renderedPoint.x,
      y: renderedPoint.y,
      imageX: imagePoint.x,
      imageY: imagePoint.y,
    };
    ann.anchorX = renderedPoint.x;
    ann.anchorY = renderedPoint.y;
    if (ann.line) {
      ann.line.x1 = renderedPoint.x;
      ann.line.y1 = renderedPoint.y;
    }
    return { cached, imagePoint, renderedPoint };
  },

  updateAnnotationLabel(figure = {}, ann = {}, stagePoint = {}) {
    const cached = this.metaCache?.[figure.path];
    if (!cached || !ann?.part) return null;
    const x = clampBodyFigurePercent(stagePoint.x);
    const y = clampBodyFigurePercent(stagePoint.y);
    const side = x >= clampBodyFigurePercent(ann?.anchor?.x ?? ann?.anchorX ?? 50) ? 'right' : 'left';
    const layout = bodyFigureCalloutLayout({ label: { x, y, side } });
    const item = (cached.parts || []).find((part) => String(part?.part || '') === String(ann.part || ''));
    if (item) {
      item.label = {
        ...(item.label || {}),
        x,
        y,
        side,
      };
      item.x = x;
      item.y = y;
      item.line = {
        ...(item.line || {}),
        x2: layout.lineX,
        y2: layout.lineY,
      };
    }
    ann.x = x;
    ann.y = y;
    ann.label = {
      ...(ann.label || {}),
      x,
      y,
      side,
    };
    if (ann.line) {
      ann.line.x2 = layout.lineX;
      ann.line.y2 = layout.lineY;
    }
    return { cached, stagePoint: { x, y } };
  },

  async saveMeta(pathKey = '', meta = {}) {
    const key = String(pathKey || '').replace(/^\/+/, '');
    if (!key) return false;
    const stored = await writeBodyFigureStoredMeta(key, meta);
    try {
      const result = await resolveBodyFigureAssetSource().saveMeta({ path: `${key}/meta.json`, meta });
      const ok = Boolean(result?.ok ?? result?.status === 200 ?? result?.status === 204);
      if (!ok && !stored) throw new Error('saveMeta returned not ok');
      window.dispatchEvent?.(new CustomEvent('body-figure-meta-saved', { detail: { path: key, fallback: !ok } }));
      return true;
    } catch (err) {
      if (!stored) {
        console.warn('[body-figure] meta 保存失败:', err?.message || err);
        return false;
      }
      window.dispatchEvent?.(new CustomEvent('body-figure-meta-saved', { detail: { path: key, fallback: true } }));
      return true;
    }
  },

  startAnchorDrag(event, figure = {}, ann = {}) {
    const stage = event?.currentTarget?.closest?.('.body-figure-stage');
    if (!stage || !figure?.path || !ann?.part) return;
    const target = event.currentTarget;
    const pointerId = event?.pointerId;
    target.setPointerCapture?.(pointerId);
    target.classList.add('dragging');
    const apply = (pointerEvent) => {
      const stagePoint = this.stagePercentFromEvent(pointerEvent, stage);
      if (!stagePoint) return;
      this.updateAnnotationAnchor(figure, ann, stagePoint);
    };
    const finish = async (pointerEvent) => {
      apply(pointerEvent);
      target.releasePointerCapture?.(pointerId);
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

  startLabelDrag(event, figure = {}, ann = {}) {
    const stage = event?.currentTarget?.closest?.('.body-figure-stage');
    if (!stage || !figure?.path || !ann?.part) return;
    const target = event.currentTarget;
    const pointerId = event?.pointerId;
    const startPoint = { x: Number(event?.clientX) || 0, y: Number(event?.clientY) || 0 };
    let dragging = false;
    target.setPointerCapture?.(pointerId);
    const apply = (pointerEvent) => {
      const moveX = Math.abs((Number(pointerEvent?.clientX) || 0) - startPoint.x);
      const moveY = Math.abs((Number(pointerEvent?.clientY) || 0) - startPoint.y);
      if (!dragging && moveX < 4 && moveY < 4) return;
      dragging = true;
      target.classList.add('dragging');
      const stagePoint = this.stagePercentFromEvent(pointerEvent, stage);
      if (!stagePoint) return;
      this.updateAnnotationLabel(figure, ann, stagePoint);
    };
    const finish = async (pointerEvent) => {
      apply(pointerEvent);
      target.releasePointerCapture?.(pointerId);
      target.classList.remove('dragging');
      window.removeEventListener('pointermove', apply);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      if (dragging) {
        target.dataset.bodyFigureDragMoved = '1';
        const cached = this.metaCache?.[figure.path];
        if (cached) await this.saveMeta(figure.path, cached);
      }
    };
    window.addEventListener('pointermove', apply);
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', finish, { once: true });
  },

  openAnnotationPart(rows = [], part = '', event = null) {
    const cleanPart = String(part || '').trim();
    if (event?.currentTarget?.dataset?.bodyFigureDragMoved === '1') {
      delete event.currentTarget.dataset.bodyFigureDragMoved;
      event.preventDefault?.();
      event.stopPropagation?.();
      return false;
    }
    this.activeAnnotationPart = cleanPart;
    return Boolean(cleanPart && (rows || []).length >= 0);
  },

  isAnnotationActive(rows = [], part = '') {
    void rows;
    return this.activeAnnotationPart === String(part || '').trim();
  },
};
