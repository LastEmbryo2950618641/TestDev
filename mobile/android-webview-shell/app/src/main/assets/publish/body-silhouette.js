window.GameModules = window.GameModules || {};

/** 身体轮廓：本地 SVG + 可选 manifest 远程 URL 覆盖；按性别/整体体型 meta 选型 */
window.GameModules.bodySilhouette = {
  keys: ['female-loli', 'female-shoujo', 'female-onee', 'male-boy', 'male-youth', 'male-mature'],

  labels: {
    'female-loli': '女 · 萝莉体型',
    'female-shoujo': '女 · 少女体型',
    'female-onee': '女 · 御姐体型',
    'male-boy': '男 · 少年体型',
    'male-youth': '男 · 青年体型',
    'male-mature': '男 · 成熟体型',
  },

  /** 百分比热区，与 11 个固定部位对应 */
  hotspots: [
    { part: '头发', x: 28, y: 1, w: 44, h: 14 },
    { part: '脸部', x: 30, y: 10, w: 40, h: 12 },
    { part: '耳朵', x: 22, y: 12, w: 56, h: 8 },
    { part: '脖颈', x: 36, y: 20, w: 28, h: 7 },
    { part: '胸部', x: 30, y: 26, w: 40, h: 14 },
    { part: '双臂', x: 14, y: 28, w: 72, h: 18 },
    { part: '小腹', x: 32, y: 40, w: 36, h: 12 },
    { part: '臀部', x: 30, y: 52, w: 40, h: 10 },
    { part: '神秘花园', x: 36, y: 61, w: 28, h: 9 },
    { part: '双大腿', x: 28, y: 70, w: 44, h: 14 },
    { part: '双小腿', x: 30, y: 84, w: 40, h: 14 },
  ],

  remoteOverrides: {},

  async prefetchManifest() {
    try {
      const res = await fetch('assets/body-silhouettes/manifest.json', { cache: 'no-cache' });
      if (!res.ok) return;
      const data = await res.json();
      const assets = data?.assets && typeof data.assets === 'object' ? data.assets : {};
      this.remoteOverrides = Object.fromEntries(
        Object.entries(assets)
          .map(([key, item]) => [key, String(item?.url || '').trim()])
          .filter(([, url]) => url),
      );
      this.manifestLoaded = true;
      window.dispatchEvent(new CustomEvent('body-silhouette-manifest-ready'));
    } catch (err) {
      console.warn('[身体轮廓] manifest 加载失败，使用本地 SVG:', err.message);
    }
  },

  normalizeGender(profile = {}) {
    const raw = String(profile.gender || profile.性别 || '').trim();
    if (/男|male|boy|man/i.test(raw)) return 'male';
    if (/女|female|girl|woman/i.test(raw)) return 'female';
    const text = `${profile.appearance || ''} ${profile.role || ''} ${profile.detail || ''}`;
    if (/男性|男生|男子|他/.test(text)) return 'male';
    if (/女性|女生|女子|她/.test(text)) return 'female';
    return 'female';
  },

  parseHeightCm(meta = {}, profile = {}) {
    const raw = String(meta.height || profile.height || '').trim();
    const match = raw.match(/(\d{2,3})/);
    if (match) return Number(match[1]);
    const age = Number(String(profile.age || '').match(/\d+/)?.[0]);
    if (age && age <= 16) return 152;
    if (age && age >= 30) return 172;
    return 0;
  },

  overallTags(meta = {}) {
    const cfg = window.GameModules.appearanceProfileTags;
    const normalized = cfg?.normalizeNaturalMeta?.(meta, {}) || meta || {};
    return [...(normalized.overall || []), ...(normalized.figure || [])].map((x) => String(x || '').trim()).filter(Boolean);
  },

  resolveKey(profile = {}, meta = {}) {
    const gender = this.normalizeGender(profile);
    const tags = this.overallTags(meta);
    const joined = tags.join(' ');
    const height = this.parseHeightCm(meta, profile);
    const loliLike = /萝莉|幼态|童颜|娇小/.test(joined) || (height > 0 && height <= 158);
    const oneeLike = /御姐|成熟|冷艳/.test(joined) || (height >= 172 && !loliLike);
    if (gender === 'male') {
      if (loliLike) return 'male-boy';
      if (oneeLike) return 'male-mature';
      return 'male-youth';
    }
    if (loliLike) return 'female-loli';
    if (oneeLike) return 'female-onee';
    return 'female-shoujo';
  },

  assetSrc(key) {
    const remote = this.remoteOverrides?.[key];
    if (remote) return remote;
    return `assets/body-silhouettes/${key}.svg`;
  },

  resolveSrc(key) {
    return this.assetSrc(key);
  },

  resolvePresentation(profile = {}, meta = {}, sectionTitle = '') {
    const key = this.resolveKey(profile, meta);
    return {
      key,
      label: this.labels[key] || key,
      src: this.assetSrc(key),
      remote: Boolean(this.remoteOverrides?.[key]),
      sectionTitle,
      hotspots: this.hotspots.map((spot) => ({ ...spot })),
    };
  },

  findBodyRow(rows = [], part = '') {
    const name = String(part || '').trim();
    if (!name) return null;
    return (rows || []).find((row) => {
      const p = String(row?.item?.part || row?.title || '').trim();
      return p === name || p.includes(name) || name.includes(p);
    }) || null;
  },

  openBodyPartDetail(rows = [], part = '') {
    const row = this.findBodyRow(rows, part);
    if (!row?.field) return false;
    window.GameModules.rpgFieldUi?.toggleAbilityDetail?.(row.field, row.item, row.index);
    return true;
  },

  isBodyPartActive(rows = [], part = '') {
    const row = this.findBodyRow(rows, part);
    if (!row?.field) return false;
    return Boolean(window.GameModules.rpgFieldUi?.isAbilityDetailOpen?.(row.field, row.item, row.index));
  },
};
