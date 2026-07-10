window.GameModules = window.GameModules || {};

(function initBodyFigureModule() {
  const FIGURE_INDEX_URL = '/assets/body-figures/index.json';
  const DEV_FIGURE_INDEX_URL = '/__dev/body-figure-index';
  const MASK_INDEX_URL = '/assets/body-figures/mask/index.json';
  const STORAGE_KEY = 'game-body-figure-bindings-v1';
  const BODY_META_KEYS = [
    'overall',
    'figure',
    'skinTone',
    'aura',
    'styleBase',
    'makeupBase',
    'colorScheme',
    'hosiery',
    'hairstyle',
    'accessoryDensity',
    'tags',
  ];

  const runtime = {
    loaded: false,
    localLoaded: false,
    maskLoaded: false,
    loadingPromise: null,
    localPromise: null,
    maskPromise: null,
    entries: new Map(),
    bindings: readBindings(),
  };

  function safeWindowFetch(url) {
    const impl = window.fetch || (typeof fetch === 'function' ? fetch : null);
    if (!impl) return Promise.reject(new Error('fetch unavailable'));
    return impl(url);
  }

  function safeJsonFetch(url) {
    return safeWindowFetch(url).then((res) => {
      if (!res?.ok) throw new Error(`HTTP ${res?.status || 0}`);
      return res.json();
    });
  }

  function clampPercent(value, fallback = 50) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    if (num < 0) return 0;
    if (num > 100) return 100;
    return num;
  }

  function normalizePath(value = '') {
    return String(value || '')
      .trim()
      .replace(/^\/+/, '')
      .replace(/^assets\/body-figures\/+/i, '')
      .replace(/^body-figures\/+/i, '')
      .replace(/\\/g, '/')
      .replace(/\/+$/, '');
  }

  function normalizeText(value = '') {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  function unique(list = []) {
    const out = [];
    const seen = new Set();
    list.forEach((item) => {
      const value = String(item || '').trim();
      if (!value) return;
      const key = normalizeText(value);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(value);
    });
    return out;
  }

  function readBindings() {
    try {
      const raw = window.localStorage?.getItem?.(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeBindings() {
    try {
      window.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(runtime.bindings || {}));
    } catch (_) {
      // ignore storage failures so the UI still works
    }
  }

  function bindingKey(ownerId = '', stateKind = '') {
    return `${String(ownerId || '').trim()}::${String(stateKind || '').trim()}`;
  }

  function parseBindingKey(key = '') {
    const raw = String(key || '');
    const splitIndex = raw.indexOf('::');
    if (splitIndex < 0) return { ownerId: raw.trim(), stateKind: '' };
    return {
      ownerId: raw.slice(0, splitIndex).trim(),
      stateKind: raw.slice(splitIndex + 2).trim(),
    };
  }

  function inferGender(meta = {}, entry = {}) {
    const direct = normalizeText(meta.gender || entry.gender || '');
    if (direct === 'male' || direct === 'female') return direct;
    const path = normalizeText(entry.path || meta.path || meta.id || '');
    if (path.includes('male/')) return 'male';
    if (path.includes('female/')) return 'female';
    const tags = collectTagsFromMeta(meta).map((item) => normalizeText(item));
    if (tags.includes('male')) return 'male';
    if (tags.includes('female')) return 'female';
    return '';
  }

  function collectTagsFromMeta(meta = {}) {
    const tags = [];
    BODY_META_KEYS.forEach((key) => {
      const value = meta[key];
      if (Array.isArray(value)) tags.push(...value);
      else if (typeof value === 'string') tags.push(value);
    });
    if (meta.gender) tags.push(meta.gender);
    if (meta.stateKind) tags.push(meta.stateKind);
    if (meta.height) tags.push(meta.height);
    if (meta.weight) tags.push(meta.weight);
    if (meta.label) tags.push(meta.label);
    (meta.parts || []).forEach((part) => {
      if (part?.part) tags.push(part.part);
      if (Array.isArray(part?.tags)) tags.push(...part.tags);
    });
    return unique(tags);
  }

  function collectTargetTags(targetMeta = {}, rows = []) {
    const tags = collectTagsFromMeta(targetMeta);
    rows.forEach((row = {}) => {
      const item = row.item || {};
      if (item.part) tags.push(item.part);
      if (item.name) tags.push(item.name);
      if (Array.isArray(item.tags)) tags.push(...item.tags);
      if (row.title) tags.push(String(row.title).replace(/^\d+\.\s*/, ''));
    });
    return unique(tags);
  }

  function defaultLabelForIndex(index = 0) {
    const side = index % 2 === 0 ? 'left' : 'right';
    const x = side === 'left' ? 10 : 90;
    const y = Math.min(90, 9 + index * 7.6);
    return { x, y, side };
  }

  function defaultAnchorForIndex(index = 0) {
    return { x: 50, y: Math.min(88, 10 + index * 7.2) };
  }

  function buildLine(anchor = {}, label = {}) {
    const anchorX = clampPercent(anchor.x, 50);
    const anchorY = clampPercent(anchor.y, 50);
    const labelX = clampPercent(label.x, 50);
    const labelY = clampPercent(label.y, 50);
    const isRight = String(label.side || '').trim() === 'right';
    const endX = isRight ? Math.max(0, labelX - 10) : Math.min(100, labelX + 10);
    return { x1: anchorX, y1: anchorY, x2: endX, y2: labelY };
  }

  function resolveImageSrc(entry = {}, imageFile = '') {
    const raw = String(entry.imageSrc || '').trim();
    if (raw) return raw;
    const path = normalizePath(entry.path || entry.id || '');
    const file = String(imageFile || entry.image || 'figure.png').trim() || 'figure.png';
    return `/assets/body-figures/${path}/${file}`;
  }

  function normalizeEntry(entry = {}, meta = {}, options = {}) {
    const path = normalizePath(entry.path || meta.path || meta.id || entry.id || '');
    const image = String(meta.image || entry.image || 'figure.png').trim() || 'figure.png';
    const normalizedMeta = {
      ...meta,
      id: String(meta.id || entry.id || path.split('/').pop() || path).trim(),
      path,
      image,
      ownerId: String(meta.ownerId || meta.characterId || entry.ownerId || '').trim(),
      ownerName: String(meta.ownerName || meta.characterName || entry.ownerName || '').trim(),
      personId: String(meta.personId || meta.ownerId || meta.characterId || entry.personId || '').trim(),
      personName: String(meta.personName || meta.ownerName || meta.characterName || entry.personName || '').trim(),
      stateKind: String(meta.stateKind || entry.stateKind || (options.mask ? 'mask' : 'natural')).trim(),
      label: String(meta.label || entry.label || path.split('/').pop() || '形象图').trim(),
      generated: Boolean(meta.generated || entry.generated),
      default: Boolean(entry.default || meta.default),
      real: meta.real !== false,
      gender: inferGender(meta, entry),
      imageSrc: resolveImageSrc(entry, image),
      tags: collectTagsFromMeta(meta),
      parts: Array.isArray(meta.parts) ? meta.parts.map((part, index) => ({
        ...part,
        part: String(part?.part || `部位${index + 1}`).trim(),
        tags: Array.isArray(part?.tags) ? part.tags : [],
        anchor: part?.anchor || defaultAnchorForIndex(index),
        label: part?.label || defaultLabelForIndex(index),
      })) : [],
      isMask: Boolean(options.mask),
      tag: options.mask ? 'mask' : 'body-figure',
    };
    return normalizedMeta;
  }

  async function loadMetaEntry(entry = {}, options = {}) {
    const path = normalizePath(entry.path || entry.id || '');
    if (!path) return null;
    const metaUrl = `/assets/body-figures/${path}/meta.json`;
    let meta = {};
    try {
      meta = await safeJsonFetch(metaUrl);
    } catch (_) {
      meta = {};
    }
    const normalized = normalizeEntry(entry, meta, options);
    runtime.entries.set(normalized.path, normalized);
    return normalized;
  }

  async function ensureFigureEntries() {
    if (runtime.loaded) return Array.from(runtime.entries.values()).filter((entry) => !entry.isMask);
    if (!runtime.loadingPromise) {
      runtime.loadingPromise = (async () => {
        try {
          const index = await safeJsonFetch(FIGURE_INDEX_URL);
          const list = Array.isArray(index?.figures) ? index.figures : [];
          await Promise.all(list.map((entry) => loadMetaEntry(entry, { mask: false })));
        } catch (err) {
          console.warn('[body-figure] 读取 figure 索引失败:', err?.message || err);
        }
        await ensureLocalFigureEntries();
        runtime.loaded = true;
        return Array.from(runtime.entries.values()).filter((entry) => !entry.isMask);
      })();
    }
    await runtime.loadingPromise;
    return Array.from(runtime.entries.values()).filter((entry) => !entry.isMask);
  }

  async function ensureLocalFigureEntries() {
    if (runtime.localLoaded) return Array.from(runtime.entries.values()).filter((entry) => !entry.isMask);
    if (!runtime.localPromise) {
      runtime.localPromise = safeJsonFetch(DEV_FIGURE_INDEX_URL)
        .then(async (index) => {
          const list = Array.isArray(index?.figures) ? index.figures : [];
          await Promise.all(list.map((entry) => loadMetaEntry(entry, { mask: false })));
          runtime.localLoaded = true;
          return list;
        })
        .catch(() => {
          runtime.localLoaded = true;
          return [];
        });
    }
    await runtime.localPromise;
    return Array.from(runtime.entries.values()).filter((entry) => !entry.isMask);
  }

  async function ensureMaskEntries() {
    if (runtime.maskLoaded) return Array.from(runtime.entries.values()).filter((entry) => entry.isMask);
    if (!runtime.maskPromise) {
      runtime.maskPromise = safeJsonFetch(MASK_INDEX_URL)
        .then(async (index) => {
          const list = Array.isArray(index?.figures) ? index.figures : [];
          await Promise.all(list.map((entry) => loadMetaEntry(entry, { mask: true })));
          runtime.maskLoaded = true;
          return list;
        })
        .catch((err) => {
          runtime.maskLoaded = true;
          console.warn('[body-figure] 读取遮罩索引失败:', err?.message || err);
          return [];
        });
    }
    await runtime.maskPromise;
    return Array.from(runtime.entries.values()).filter((entry) => entry.isMask);
  }

  async function ensureForOptions(options = {}) {
    if (options.mask) return ensureMaskEntries();
    await ensureFigureEntries();
    return Array.from(runtime.entries.values()).filter((entry) => !entry.isMask);
  }

  function reverseBindings() {
    const reversed = {};
    Object.entries(runtime.bindings || {}).forEach(([key, value]) => {
      const path = normalizePath(value);
      if (!path) return;
      const ownerId = String(key.split('::')[0] || '').trim();
      if (!ownerId) return;
      reversed[path] = ownerId;
    });
    runtime.entries.forEach((entry) => {
      if (!reversed[entry.path] && entry.activeFigure && entry.ownerId) reversed[entry.path] = entry.ownerId;
    });
    return reversed;
  }

  function bindingFor(ownerId = '', stateKind = '') {
    const exact = runtime.bindings?.[bindingKey(ownerId, stateKind)];
    if (exact) return normalizePath(exact);
    if (stateKind === 'dressed') {
      const natural = runtime.bindings?.[bindingKey(ownerId, 'natural')];
      if (natural) return normalizePath(natural);
    }
    const fallback = Object.entries(runtime.bindings || {}).find(([key]) => key.startsWith(`${ownerId}::`));
    return normalizePath(fallback?.[1] || '');
  }

  function candidateScore(entry = {}, targetMeta = {}, rows = [], options = {}) {
    const targetTags = collectTargetTags(targetMeta, rows).map((item) => normalizeText(item));
    const candidateTags = collectTagsFromMeta(entry).map((item) => normalizeText(item));
    const targetTagSet = new Set(targetTags);
    const candidateTagSet = new Set(candidateTags);
    let score = 0;

    if (options.mask && entry.isMask) score += 1000;
    if (!options.mask && entry.isMask) score -= 1000;

    const targetOwnerId = String(targetMeta.characterId || targetMeta.ownerId || targetMeta.personId || '').trim();
    if (targetOwnerId && entry.ownerId && targetOwnerId === entry.ownerId) score += 220;
    if (targetOwnerId && entry.personId && targetOwnerId === entry.personId) score += 180;

    const targetGender = normalizeText(targetMeta.gender || '');
    const entryGender = normalizeText(entry.gender || '');
    if (targetGender && entryGender) {
      if (targetGender === entryGender) score += 60;
      else score -= 180;
    }

    const targetStateKind = normalizeText(targetMeta.stateKind || '');
    const entryStateKind = normalizeText(entry.stateKind || '');
    if (targetStateKind && entryStateKind) {
      if (targetStateKind === entryStateKind) score += 35;
      else if (targetStateKind === 'dressed' && entryStateKind === 'natural') score += 6;
      else score -= 12;
    }

    let overlap = 0;
    targetTagSet.forEach((tag) => {
      if (candidateTagSet.has(tag)) overlap += 1;
    });
    score += overlap * 8;

    const partNames = rows.map((row) => normalizeText(row?.item?.part || row?.item?.name || '')).filter(Boolean);
    entry.parts.forEach((part = {}) => {
      const partName = normalizeText(part.part || '');
      if (partNames.includes(partName)) score += 2;
    });

    if (entry.generated) score += 8;
    if (entry.default) score += 4;
    if (entry.activeFigure) score += 12;

    return {
      score,
      overlap,
      targetTagCount: targetTagSet.size,
      candidateTagCount: candidateTagSet.size,
    };
  }

  function bestFigureEntry(targetMeta = {}, rows = [], options = {}) {
    const entries = Array.from(runtime.entries.values()).filter((entry) => options.mask ? entry.isMask : !entry.isMask);
    if (!entries.length) return null;

    const reversed = reverseBindings();
    const targetOwnerId = String(targetMeta.characterId || targetMeta.ownerId || targetMeta.personId || '').trim();
    const boundPath = targetOwnerId ? bindingFor(targetOwnerId, targetMeta.stateKind || '') : '';
    if (boundPath) {
      const boundEntry = entries.find((entry) => entry.path === boundPath);
      if (boundEntry) return { entry: boundEntry, metrics: { score: 9999, overlap: 0 } };
    }

    const ranked = entries
      .map((entry) => {
        const boundOwnerId = reversed[entry.path] || entry.ownerId || entry.personId || '';
        return {
          entry,
          metrics: candidateScore(entry, targetMeta, rows, options),
          boundOwnerId,
          boundOther: Boolean(boundOwnerId && targetOwnerId && boundOwnerId !== targetOwnerId),
        };
      })
      .filter((item) => options.includeBoundOthers || !item.boundOther);
    ranked.sort((left, right) => {
      if (right.metrics.score !== left.metrics.score) return right.metrics.score - left.metrics.score;
      if (right.metrics.overlap !== left.metrics.overlap) return right.metrics.overlap - left.metrics.overlap;
      if (Number(Boolean(right.entry.generated)) !== Number(Boolean(left.entry.generated))) {
        return Number(Boolean(right.entry.generated)) - Number(Boolean(left.entry.generated));
      }
      return String(left.entry.path || '').localeCompare(String(right.entry.path || ''));
    });

    return ranked[0] || null;
  }

  function matchPartMeta(entry = {}, partName = '', index = 0) {
    const wanted = normalizeText(partName);
    const exact = entry.parts.find((part) => normalizeText(part.part || '') === wanted);
    if (exact) return exact;
    return entry.parts[index] || {
      part: partName,
      tags: [],
      anchor: defaultAnchorForIndex(index),
      label: defaultLabelForIndex(index),
    };
  }

  function figureAnnotation(entry = {}, row = {}, index = 0) {
    const partName = String(row?.item?.part || row?.item?.name || '').trim() || String(row?.title || '').replace(/^\d+\.\s*/, '').trim();
    const matched = matchPartMeta(entry, partName, index);
    const label = matched.label || defaultLabelForIndex(index);
    const anchor = matched.anchor || defaultAnchorForIndex(index);
    const tagLine = row?.tags || (Array.isArray(matched.tags) && matched.tags.length ? `[${matched.tags.join(' / ')}]` : '');
    return {
      part: partName || `部位${index + 1}`,
      title: String(row?.title || `${index + 1}. ${partName || matched.part || `部位${index + 1}`}`).trim(),
      preview: String(row?.preview || row?.item?.description || matched.description || '').trim(),
      tags: String(tagLine || '').trim(),
      anchor: {
        x: clampPercent(anchor.x, 50),
        y: clampPercent(anchor.y, 50),
      },
      label: {
        x: clampPercent(label.x, String(label.side || '').trim() === 'right' ? 90 : 10),
        y: clampPercent(label.y, 50),
        side: String(label.side || '').trim() === 'right' ? 'right' : 'left',
      },
      line: buildLine(anchor, label),
    };
  }

  function buildFigurePresentation(entry = {}, targetMeta = {}, rows = [], sectionTitle = '', options = {}, metrics = {}) {
    const annotations = rows.map((row, index) => figureAnnotation(entry, row, index));
    return {
      id: entry.id,
      path: entry.path,
      tag: entry.tag || 'body-figure',
      label: entry.label || `${sectionTitle || '形象图'}参考图`,
      imageSrc: entry.imageSrc,
      sectionTitle,
      generated: Boolean(entry.generated),
      default: Boolean(entry.default),
      stateKind: entry.stateKind || 'natural',
      ownerId: entry.ownerId || '',
      ownerName: entry.ownerName || entry.characterName || '',
      annotations,
      score: Number(metrics.score || 0),
      baseScore: Math.max(0, Number(metrics.score || 0)),
      meta: { ...entry },
      targetMeta: { ...targetMeta },
    };
  }

  function pendingState(options = {}) {
    if (options.mask) {
      if (!runtime.maskPromise && !runtime.maskLoaded) ensureMaskEntries();
      return { pending: true };
    }
    if (!runtime.loadingPromise && !runtime.loaded) ensureFigureEntries();
    return { pending: true };
  }

  function resolveLoadedFigure(targetMeta = {}, rows = [], sectionTitle = '', options = {}) {
    const picked = bestFigureEntry(targetMeta, rows, options);
    if (!picked?.entry) return null;
    return buildFigurePresentation(picked.entry, targetMeta, rows, sectionTitle, options, picked.metrics);
  }

  function figureChoices(targetMeta = {}, rows = []) {
    const reversed = reverseBindings();
    const entries = Array.from(runtime.entries.values()).filter((entry) => !entry.isMask);
    const ranked = entries.map((entry) => {
      const metrics = candidateScore(entry, targetMeta, rows, {});
      const boundOwnerId = reversed[entry.path] || '';
      return {
        ...entry,
        score: metrics.score,
        baseScore: Math.max(0, metrics.score),
        boundOwnerId,
        boundOwnerName: boundOwnerId && boundOwnerId === entry.ownerId
          ? (entry.ownerName || entry.characterName || boundOwnerId)
          : boundOwnerId,
      };
    });

    ranked.sort((left, right) => {
      if (right.baseScore !== left.baseScore) return right.baseScore - left.baseScore;
      if (Number(Boolean(right.generated)) !== Number(Boolean(left.generated))) {
        return Number(Boolean(right.generated)) - Number(Boolean(left.generated));
      }
      return String(left.path || '').localeCompare(String(right.path || ''));
    });
    return ranked;
  }

  function getGameStore() {
    try {
      if (window.Alpine && typeof window.Alpine.store === 'function') return window.Alpine.store('game');
    } catch (_) {
      return null;
    }
    return null;
  }

  function resolveRowByPart(rows = [], part = '') {
    const target = normalizeText(part);
    return rows.find((row = {}) => {
      const item = row.item || {};
      return normalizeText(item.part || item.name || '') === target
        || normalizeText(String(row.title || '').replace(/^\d+\.\s*/, '')) === target;
    }) || null;
  }

  function refreshAnnotationLine(ann = {}) {
    ann.line = buildLine(ann.anchor || {}, ann.label || {});
    return ann;
  }

  window.GameModules.bodyFigure = {
    prefetchAll() {
      return Promise.all([ensureFigureEntries(), ensureMaskEntries()]);
    },

    prefetchMask() {
      return ensureMaskEntries();
    },

    resolveSync(targetMeta = {}, rows = [], sectionTitle = '', options = {}) {
      if (options.mask ? !runtime.maskLoaded : !runtime.loaded) {
        if (!options.mask) {
          const partial = resolveLoadedFigure(targetMeta, rows, sectionTitle, options);
          if (partial) {
            if (!runtime.loadingPromise) ensureFigureEntries();
            return partial;
          }
        }
        return pendingState(options);
      }
      return resolveLoadedFigure(targetMeta, rows, sectionTitle, options);
    },

    async resolve(targetMeta = {}, rows = [], sectionTitle = '', options = {}) {
      await ensureForOptions(options);
      return resolveLoadedFigure(targetMeta, rows, sectionTitle, options);
    },

    async listFigureChoices(targetMeta = {}, rows = []) {
      await ensureFigureEntries();
      return figureChoices(targetMeta, rows);
    },

    getBindingPath(ownerId = '', stateKind = '') {
      return bindingFor(String(ownerId || '').trim(), String(stateKind || '').trim());
    },

    registerEntry(entry = {}, meta = {}) {
      const normalized = normalizeEntry(entry, meta, { mask: false });
      runtime.entries.set(normalized.path, normalized);
      return normalized;
    },

    async bindCurrentFigure(path = '', ownerId = '', ownerName = '', options = {}) {
      const normalizedPath = normalizePath(path);
      if (!normalizedPath) return { ok: false, error: '缺少形象图路径' };
      await ensureFigureEntries();
      const entry = runtime.entries.get(normalizedPath);
      if (!entry) return { ok: false, error: '找不到对应形象图' };

      const normalizedOwnerId = String(ownerId || '').trim();
      const stateKind = String(options?.stateKind || entry.stateKind || 'natural').trim() || 'natural';
      const reversed = reverseBindings();
      const boundOwnerId = reversed[normalizedPath] || '';
      if (boundOwnerId && boundOwnerId !== normalizedOwnerId && !options?.force) {
        return { ok: false, error: `该形象图已绑定${boundOwnerId}` };
      }

      Object.keys(runtime.bindings || {}).forEach((key) => {
        const parsed = parseBindingKey(key);
        if (parsed.ownerId !== normalizedOwnerId) return;
        if (parsed.stateKind && parsed.stateKind !== stateKind) return;
        delete runtime.bindings[key];
      });
      runtime.bindings[bindingKey(normalizedOwnerId, stateKind)] = normalizedPath;
      writeBindings();
      entry.ownerName = String(ownerName || entry.ownerName || '').trim();
      window.dispatchEvent?.(new CustomEvent('body-figure-meta-ready', {
        detail: { tag: 'binding-updated', path: normalizedPath, ownerId: normalizedOwnerId, stateKind },
      }));
      return { ok: true, path: normalizedPath, ownerId: normalizedOwnerId, stateKind };
    },

    calloutStyle(ann = {}) {
      const side = String(ann?.label?.side || '').trim() === 'right' ? 'right' : 'left';
      const left = clampPercent(ann?.label?.x, side === 'right' ? 90 : 10);
      const top = clampPercent(ann?.label?.y ?? ann?.line?.y2, 50);
      const transform = side === 'right'
        ? 'translate(-100%,-50%)'
        : 'translate(0,-50%)';
      return `left:${left}%;top:${top}%;transform:${transform};`;
    },

    anchorStyle(ann = {}) {
      const left = clampPercent(ann?.anchor?.x, 50);
      const top = clampPercent(ann?.anchor?.y, 50);
      return `left:${left}%;top:${top}%;`;
    },

    startAnchorDrag(event, figure = {}, ann = {}) {
      const stage = event?.target?.closest?.('.body-figure-stage');
      if (!stage || !ann) return false;
      const pointerId = event.pointerId;
      const move = (moveEvent) => {
        const rect = stage.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        ann.anchor = ann.anchor || {};
        ann.anchor.x = clampPercent(((moveEvent.clientX - rect.left) / rect.width) * 100, ann.anchor.x || 50);
        ann.anchor.y = clampPercent(((moveEvent.clientY - rect.top) / rect.height) * 100, ann.anchor.y || 50);
        refreshAnnotationLine(ann);
      };
      const stop = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', stop);
        event.target?.classList?.remove?.('dragging');
        try { event.target?.releasePointerCapture?.(pointerId); } catch (_) {}
      };
      event.target?.classList?.add?.('dragging');
      try { event.target?.setPointerCapture?.(pointerId); } catch (_) {}
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', stop, { once: true });
      return true;
    },

    openAnnotationPart(rows = [], part = '') {
      const row = resolveRowByPart(rows, part);
      const store = getGameStore();
      if (!row || !store?.toggleAbilityDetail) return false;
      store.toggleAbilityDetail(row.field, row.item, row.index);
      return true;
    },

    isAnnotationActive(rows = [], part = '') {
      const row = resolveRowByPart(rows, part);
      const store = getGameStore();
      if (!row || !store?.isAbilityDetailOpen) return false;
      return Boolean(store.isAbilityDetailOpen(row.field, row.item, row.index));
    },
  };
})();

