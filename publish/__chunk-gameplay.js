
;// ---- assets/data/real-world-2026.js ----
window.GameModules = window.GameModules || {};

window.GameModules.realWorld2026 = {
  year: 2026,
  label: '2026 现代都市现实世界',
  summary: '玩家刚买到一台新手机，生活在高度移动互联网化的现代都市。外卖、社交平台、短视频、即时通讯、通勤、校园或职场压力共同构成日常背景。',
  defaults: {
    city: '未设定城市',
    livingStatus: '独居 / 与家人同住 / 合租 / 宿舍，玩家自行决定',
    dailyRole: '学生 / 上班族 / 自由职业 / 其他，玩家自行决定',
    device: '一台刚激活的新手机',
  },
  relationHint: '玩家的人际关系必须以玩家填写为准；没有填写的关系不要擅自补完具体姓名、亲密度或冲突。父母信息未填写时，默认父母已故，去世原因使用入库资料。',
};


;// ---- real-world-map-facts.js ----
/**
 * 电子地图地点说明：以玩家已知事实数组保存，并只按明确更新修改。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldMapFacts = {
  nowLabel(state) {
    state?.ensurePhoneFixedTime?.();
    const dateText = state?.phoneDateText?.();
    const timeText = state?.phoneTimeText?.();
    if (dateText && timeText && !/^1970年/u.test(dateText)) return `${dateText.replace(/\s*周[一二三四五六日天]/u, '')}${timeText}`;
    const d = new Date();
    const time = [d.getHours(), d.getMinutes(), d.getSeconds()].map((x) => String(x).padStart(2, '0')).join(':');
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日${time}`;
  },

  cleanText(text) {
    return String(text || '').replace(/[\n\r]+/g, ' ').replace(/^\d+[.、，\s]*/u, '').replace(/[。！？.!?]+$/u, '').trim().slice(0, 120);
  },

  cleanFactsInput(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    return String(value).split(/[；;\n]+/u).map((text) => ({ text }));
  },

  normalizeTime(value, fallback = '') {
    const text = String(value || '').trim();
    if (!text || /^1970年/u.test(text)) return fallback || this.nowLabel({});
    return text.replace(/\s+/g, '').replace(/周[一二三四五六日天]/u, '');
  },

  normalizeFacts(node = {}, fallback = '', time = '') {
    const safeNode = node || {};
    const existing = this.cleanFactsInput(safeNode.descriptionFacts || safeNode.facts);
    const base = existing.length ? existing : this.cleanFactsInput(safeNode.description || fallback);
    return base.map((item, index) => {
      const text = this.cleanText(item?.text || item?.description || item);
      const nodeName = this.cleanText(safeNode.name);
      if (!text || text === nodeName || /现实推演.*已知地点|电子地图记录的地点|当前现实行动发生或停留的位置/u.test(text)) return null;
      const stamp = this.normalizeTime(item?.updatedAt || item?.discoveredAt || time, time);
      return { id: item?.id || `fact_${Date.now()}_${index}`, text, discoveredAt: this.normalizeTime(item?.discoveredAt || stamp, stamp), updatedAt: stamp, source: item?.source || '现实推演' };
    }).filter(Boolean).slice(-20);
  },

  syncNode(node, fallback = '', time = '') {
    if (!node) return null;
    node.descriptionFacts = this.normalizeFacts(node, fallback, time);
    node.description = node.descriptionFacts.map((fact, index) => this.formatFact(fact, index)).join('');
    return node;
  },

  formatFact(fact, index) {
    const text = this.cleanText(fact?.text);
    const time = this.normalizeTime(fact?.updatedAt || fact?.discoveredAt || '未知时间');
    const verb = fact?.updatedAt && fact.updatedAt !== fact.discoveredAt ? '更新为' : '发现';
    return `${index + 1}.在${time}${verb}${text}。`;
  },

  addFact(node, text, time, source = '现实推演') {
    const clean = this.cleanText(text);
    if (!node || !clean) return false;
    const stamp = this.normalizeTime(time);
    node.descriptionFacts = this.normalizeFacts(node, '', stamp);
    if (node.descriptionFacts.some((fact) => fact.text === clean)) return false;
    node.descriptionFacts.push({ id: `fact_${Date.now()}_${node.descriptionFacts.length}`, text: clean, discoveredAt: stamp, updatedAt: stamp, source });
    this.syncNode(node, '', stamp);
    return true;
  },

  findFact(node, change = {}) {
    const oldText = this.cleanText(change.oldText || change.previousText || change.matchText || change.text);
    return (node.descriptionFacts || []).find((fact) => (change.factId && fact.id === change.factId) || (oldText && fact.text === oldText)) || null;
  },

  updateFact(node, change = {}, time = '') {
    if (!node) return false;
    const stamp = this.normalizeTime(time);
    node.descriptionFacts = this.normalizeFacts(node, '', stamp);
    const action = String(change.action || change.mode || 'add').toLowerCase();
    const nextText = this.cleanText(change.newText || change.text || change.description || change.fact);
    if (action === 'add') return this.addFact(node, nextText, stamp, change.source || '现实推演');
    const hit = this.findFact(node, change);
    if (!hit) return false;
    if (action === 'delete' || action === 'remove') node.descriptionFacts = node.descriptionFacts.filter((fact) => fact.id !== hit.id);
    else if (nextText) { hit.text = nextText; hit.updatedAt = stamp; hit.source = change.source || hit.source; }
    this.syncNode(node, '', stamp);
    return true;
  },

  applyLocationUpdates(state, result = {}) {
    const map = window.GameModules.realWorldMap.ensure(state, state.playerProfile || {});
    const time = this.nowLabel(state);
    const locationPayloads = [...(result.newLocations || []), ...(result.mapLocationAdds || [])];
    locationPayloads.forEach((item) => window.GameModules.realWorldMap.addLocation(state, item, time));
    (result.locationDescriptionUpdates || result.mapDescriptionUpdates || []).forEach((change) => {
      const name = window.GameModules.realWorldMap.cleanName(change.locationName || change.name);
      if (!name) return;
      const node = window.GameModules.realWorldMap.upsertNode(map, { name, parentName: change.parentName, time });
      this.updateFact(node, change, time);
    });
    map.lastText = window.GameModules.realWorldMap.render(map);
    return map;
  },
};


;// ---- org-territory-system.js ----
/**
 * 组织—领土控势：共享 schema 规范化、控势解析、迷雾/草案/已确立展示。
 * 设计依据：docs/schemas/org-territory-system-design.md
 */
window.GameModules = window.GameModules || {};

window.GameModules.orgTerritory = {
  ITEM_STATES: ['fog', 'sketch', 'established'],

  nowLabel(store) {
    try {
      return store?.phoneDate?.()?.toISOString?.() || new Date().toISOString();
    } catch (_) {
      return new Date().toISOString();
    }
  },

  defaultCountryOrgId(store) {
    const factions = store?.factionState?.factions || [];
    const country = factions.find((f) => f.type === '国家' && !f.parentId);
    if (country?.id) return country.id;
    return window.GameModules.factionSystem?.inferTopCountry?.(store?.playerProfile || {})?.id || 'country-china';
  },

  orgNameById(store, orgId = '') {
    const id = String(orgId || '').trim();
    if (!id) return '未知';
    const faction = (store?.factionState?.factions || []).find((f) => f.id === id);
    return faction?.name || id;
  },

  validOrgId(store, orgId = '') {
    const id = String(orgId || '').trim();
    if (!id) return this.defaultCountryOrgId(store);
    if (!store?.factionState) store?.initFactionSystem?.();
    const factions = store?.factionState?.factions || [];
    if (factions.some((f) => f.id === id)) return this.resolveLiveOrgId(store, id);
    const byName = this.resolveOrgIdByName(store, id);
    if (byName) return this.resolveLiveOrgId(store, byName);
    return this.resolveLiveOrgId(store, id);
  },

  parentRefFog(label = '迷雾') {
    return { fog: true, orgNodeId: null, label: label || '迷雾' };
  },

  parentRefClear(orgNodeId = null, label = '') {
    return { fog: false, orgNodeId: orgNodeId || null, label: String(label || '未知').trim() || '未知' };
  },

  normalizeParentRef(raw, fallbackLabel = '迷雾') {
    if (!raw || typeof raw !== 'object') return this.parentRefFog(fallbackLabel);
    if (raw.fog === true || (!raw.orgNodeId && !raw.label)) return this.parentRefFog(raw.label || fallbackLabel);
    return {
      fog: false,
      orgNodeId: raw.orgNodeId || null,
      label: String(raw.label || raw.name || '').trim() || '未知',
    };
  },

  normalizeItemState(state, fallback = 'fog') {
    const value = String(state || '').trim();
    return this.ITEM_STATES.includes(value) ? value : fallback;
  },

  stateBadge(state) {
    const map = { fog: '未确立', sketch: '草案', established: '已确立' };
    return map[this.normalizeItemState(state)] || '未确立';
  },

  resolveBindType(store, name = '') {
    const label = String(name || '').trim();
    if (!label || label === '未知') return { bindType: 'unknown', characterId: '' };
    const states = store?.rpgStates || {};
    const found = Object.values(states).find((s) => {
      const n = String(s?.profile?.name || s?.name || '').trim();
      return n && (n === label || n.endsWith(label));
    });
    if (found?.id) return { bindType: 'role', characterId: found.id };
    return { bindType: 'intro', characterId: '' };
  },

  normalizeOccupant(raw, store) {
    if (typeof raw === 'string') {
      const bind = this.resolveBindType(store, raw);
      return {
        name: raw,
        bindType: bind.bindType,
        characterId: bind.characterId,
        occupantFog: false,
        state: 'sketch',
      };
    }
    const name = String(raw?.name || raw?.characterName || '').trim();
    const bindType = raw?.bindType || this.resolveBindType(store, name).bindType;
    return {
      name: name || '未知',
      bindType,
      characterId: raw?.characterId || (bindType === 'role' ? this.resolveBindType(store, name).characterId : ''),
      occupantFog: raw?.occupantFog === true || !name,
      state: this.normalizeItemState(raw?.state, name ? 'sketch' : 'fog'),
      reason: String(raw?.reason || '').trim(),
    };
  },

  normalizeRole(raw, store) {
    if (typeof raw === 'string') {
      return this.decorateRole({ title: raw, titleFog: false, dutyFog: true, occupantFog: true, characters: ['未知'], occupants: [] });
    }
    const title = String(raw?.title || raw?.name || raw?.position || '').trim();
    const titleFog = raw?.titleFog === true || !title;
    const chars = Array.isArray(raw?.characters) ? raw.characters : (raw?.character ? [raw.character] : []);
    let occupants = Array.isArray(raw?.occupants) ? raw.occupants.map((o) => this.normalizeOccupant(o, store)) : [];
    if (!occupants.length && chars.length) {
      occupants = chars.map((c) => this.normalizeOccupant(c, store));
    }
    const occupantFog = raw?.occupantFog === true || (!occupants.length && !chars.filter((c) => c && c !== '未知').length);
    const role = {
      ...raw,
      title: titleFog ? '职位：迷雾' : title,
      titleFog,
      dutyNote: String(raw?.dutyNote || raw?.duty || '').trim(),
      dutyFog: raw?.dutyFog !== false && !String(raw?.dutyNote || raw?.duty || '').trim(),
      count: raw?.count ?? raw?.quantity ?? (occupants.length || (chars.length && !chars.includes('未知') ? chars.length : '未知')),
      state: this.normalizeItemState(raw?.state, titleFog ? 'fog' : 'sketch'),
      occupants,
      occupantFog,
      characters: chars.map(String).filter(Boolean).length ? chars.map(String).filter(Boolean) : (occupants.map((o) => o.name).filter(Boolean).length ? occupants.map((o) => o.name) : ['未知']),
    };
    return this.decorateRole(role);
  },

  decorateRole(role) {
    const occupants = Array.isArray(role.occupants) ? role.occupants : [];
    const chars = Array.isArray(role.characters) ? role.characters : [];
    const previewNames = occupants.filter((o) => !o.occupantFog).map((o) => o.name).filter(Boolean);
    const displayChars = previewNames.length ? previewNames : chars;
    return {
      ...role,
      preview: displayChars.slice(0, 4).join('、') || '未知',
      overflow: displayChars.length > 4,
      displayTitle: role.titleFog ? '职位：迷雾' : role.title,
      displayDuty: role.dutyFog ? '职责：迷雾' : (role.dutyNote || '职责：迷雾'),
      displayOccupants: role.occupantFog ? '任职：迷雾' : `任职：${displayChars.join('、') || '未知'}`,
      stateBadge: this.stateBadge(role.state),
    };
  },

  normalizeStructureNode(raw, faction = {}, index = 0, store) {
    const name = String(raw?.name || raw?.title || `部门${index + 1}`).trim() || `部门${index + 1}`;
    const id = String(raw?.id || `struct-${faction.id || 'faction'}-${index}-${name.replace(/\s+/g, '-')}`).slice(0, 64);
    const state = this.normalizeItemState(raw?.state, raw?.roles?.length ? 'sketch' : 'fog');
    return {
      ...raw,
      id,
      name,
      kind: raw?.kind || 'department',
      state,
      parentRef: this.normalizeParentRef(raw?.parentRef, '迷雾'),
      roles: (Array.isArray(raw?.roles) ? raw.roles : []).map((r) => this.normalizeRole(r, store)),
      sketchNote: String(raw?.sketchNote || '').trim(),
      stateBadge: this.stateBadge(state),
      parentLabel: this.nodeParentLabel({ parentRef: this.normalizeParentRef(raw?.parentRef, '迷雾') }),
    };
  },

  nodeParentLabel(node = {}) {
    const ref = node.parentRef || {};
    if (ref.fog) return '上级：迷雾';
    return ref.label ? `上级：${ref.label}` : '上级：未知';
  },

  defaultCapabilities() {
    return {
      political: { entries: [] },
      economic: { entries: [] },
      asset: { entries: [] },
      military: { entries: [] },
    };
  },

  defaultStub(faction = {}) {
    return {
      oneLine: `${faction.name || '组织'}（${faction.type || '组织'}，尚未推演细化）`,
    };
  },

  normalizeFaction(faction = {}, store) {
    if (!faction || typeof faction !== 'object') return faction;
    const resolution = faction.resolution || (faction.structure?.length ? 'L2' : 'L1');
    const status = faction.status || 'active';
    const stub = faction.stub && typeof faction.stub === 'object' ? faction.stub : this.defaultStub(faction);
    const solid = faction.solid && typeof faction.solid === 'object'
      ? { capabilities: { ...this.defaultCapabilities(), ...(faction.solid.capabilities || {}) } }
      : { capabilities: this.defaultCapabilities() };
    const structure = (Array.isArray(faction.structure) ? faction.structure : []).map((node, index) => this.normalizeStructureNode(node, faction, index, store));
    const territoryAnchors = (Array.isArray(faction.territoryAnchors) ? faction.territoryAnchors : [])
      .map((id) => String(id || '').trim()).filter(Boolean).slice(0, 8);
    return {
      ...faction,
      resolution,
      stub,
      status,
      solid,
      structure,
      territoryAnchors,
      resolutionBadge: this.resolutionBadge(resolution),
    };
  },

  resolutionBadge(resolution = 'L1') {
    const map = { L1: '迷雾', L2: '已接触', L3: '已固化', L4: '已审计' };
    return map[String(resolution || 'L1').toUpperCase()] || '迷雾';
  },

  defaultControl(orgId, store, reason = '默认法域继承') {
    const id = this.validOrgId(store, orgId);
    return {
      effectiveOrgId: id,
      claimOrgId: id,
      ownerOrgId: id,
      status: 'stable',
      since: this.nowLabel(store),
      reason,
      inherit: true,
    };
  },

  normalizeControl(raw, store) {
    if (!raw || typeof raw !== 'object') return this.defaultControl(this.defaultCountryOrgId(store), store);
    const effectiveOrgId = this.validOrgId(store, raw.effectiveOrgId || raw.effective || this.defaultCountryOrgId(store));
    const claimOrgId = this.validOrgId(store, raw.claimOrgId || raw.claim || effectiveOrgId);
    const ownerRaw = raw.ownerOrgId || raw.owner;
    const ownerOrgId = ownerRaw
      ? this.validOrgId(store, ownerRaw)
      : effectiveOrgId;
    return {
      effectiveOrgId,
      claimOrgId,
      ownerOrgId,
      status: ['stable', 'contested', 'transitional', 'disputed'].includes(raw.status) ? raw.status : 'stable',
      since: raw.since || this.nowLabel(store),
      reason: String(raw.reason || '默认法域继承').slice(0, 120),
      inherit: raw.inherit !== false,
    };
  },

  inferDefaultOwnerOrgId(store, node = {}) {
    const text = String(node.name || '').trim();
    if (!text) return null;
    const factions = store?.factionState?.factions || [];
    const companies = factions.filter((f) => f.type === '公司' || f.type === '工作室' || f.kind === 'company' || f.id === 'company-main');
    for (const company of companies) {
      const name = String(company.name || '').trim();
      if (name.length >= 2 && text.includes(name)) return company.id;
    }
    return null;
  },

  normalizeNodeControl(node, map, store) {
    if (!node) return null;
    const mapMod = window.GameModules.realWorldMap;
    if (mapMod?.isInteriorLocationName?.(node.name)) {
      const anchor = mapMod.resolveExteriorAnchorNode(map, node);
      if (anchor && anchor.id !== node.id) {
        node.control = { ...this.resolveControl(map, anchor, store), inherit: true, reason: '继承建筑物控势' };
        return node.control;
      }
    }
    if (!node.control || typeof node.control !== 'object') {
      node.control = this.defaultControl(this.defaultCountryOrgId(store), store);
    } else {
      const hadOwner = Boolean(node.control.ownerOrgId || node.control.owner);
      node.control = this.normalizeControl(node.control, store);
      if (!hadOwner && mapMod?.isMapExteriorNode?.(node.name)) {
        const inferred = this.inferDefaultOwnerOrgId(store, node);
        if (inferred) node.control.ownerOrgId = this.validOrgId(store, inferred);
      }
    }
    if (!Array.isArray(node.controlHistory)) node.controlHistory = [];
    return node.control;
  },

  resolveControl(map, node, store) {
    const mapMod = window.GameModules.realWorldMap;
    if (!node || !map) return this.defaultControl(this.defaultCountryOrgId(store), store);
    const anchor = mapMod.resolveExteriorAnchorNode(map, node) || node;
    let walk = anchor;
    for (let guard = 0; guard < 12 && walk; guard += 1) {
      this.normalizeNodeControl(walk, map, store);
      const control = walk.control;
      if (control && control.inherit === false) return { ...control };
      if (!walk.parentId) break;
      walk = (map.nodes || []).find((item) => item.id === walk.parentId);
    }
    return this.defaultControl(this.defaultCountryOrgId(store), store);
  },

  resolveControlLabel(map, node, store) {
    if (!node?.revealed) return '';
    const control = this.resolveControl(map, node, store);
    const effective = this.orgNameById(store, control.effectiveOrgId);
    const claim = this.orgNameById(store, control.claimOrgId);
    const owner = this.orgNameById(store, control.ownerOrgId || control.effectiveOrgId);
    const mark = control.status === 'contested' ? ' ⚔' : '';
    const ownerPart = owner !== effective ? `产权：${owner}｜管治：${effective}` : `控势：${effective}`;
    if (effective === claim) return `${ownerPart}${mark}`;
    return `${ownerPart}｜宣称：${claim}${mark}`;
  },

  ensureMapControls(map, store) {
    if (!map?.nodes) return map;
    (map.nodes || []).forEach((node) => this.normalizeNodeControl(node, map, store));
    return map;
  },

  findMapNode(map, nameOrId = '') {
    const key = String(nameOrId || '').trim();
    if (!key) return null;
    return (map?.nodes || []).find((node) => node.id === key || node.name === key) || null;
  },

  isChangeMode(update = {}) {
    const mode = String(update.change?.mode || update.mode || '').trim();
    return /^(change|更改|replace|set)$/u.test(mode);
  },

  canMutateEstablished(item, update = {}) {
    if (!item || item.state !== 'established') return true;
    return this.isChangeMode(update) || update.change?.establish === false;
  },

  CAPABILITY_DIMS: ['political', 'economic', 'asset', 'military'],
  CAPABILITY_LABELS: { political: '政治', economic: '经济', asset: '资产', military: '军事' },

  normalizeCapabilityEntry(raw = {}, faction = {}, dim = 'political', index = 0, store) {
    const name = String(raw?.name || raw?.title || `条目${index + 1}`).trim();
    const id = String(raw?.id || `${dim}-${faction.id || 'org'}-${index}-${name.replace(/\s+/g, '-')}`).slice(0, 64);
    const state = this.normalizeItemState(raw?.state, name ? 'fog' : 'fog');
    return {
      ...raw,
      id,
      name,
      kind: String(raw?.kind || raw?.type || '条目').slice(0, 24),
      state,
      parentRef: this.normalizeParentRef(raw?.parentRef, '迷雾'),
      sketchNote: String(raw?.sketchNote || raw?.note || '').trim(),
      linkStructureId: raw?.linkStructureId || '',
      stateBadge: this.stateBadge(state),
      parentLabel: this.nodeParentLabel({ parentRef: this.normalizeParentRef(raw?.parentRef, '迷雾') }),
    };
  },

  capabilitySummary(faction = {}, maxPerDim = 2) {
    const caps = faction.solid?.capabilities || {};
    const lines = [];
    this.CAPABILITY_DIMS.forEach((dim) => {
      const entries = caps[dim]?.entries || [];
      if (!entries.length) return;
      const brief = entries.slice(0, maxPerDim).map((e) => `${e.name}(${this.stateBadge(e.state)})`).join('、');
      lines.push(`${this.CAPABILITY_LABELS[dim]}：${brief}`);
    });
    return lines.join('；');
  },

  orgIndexLine(faction = {}) {
    const stub = faction.stub?.oneLine || `${faction.name || '组织'}（${faction.type || '组织'}）`;
    const badge = faction.resolution || 'L1';
    return `${faction.name}｜${badge}｜${stub}`.slice(0, 140);
  },

  orgIndexText(store, action = '', max = 800) {
    store.initFactionSystem?.();
    const factions = store.factionState?.factions || [];
    if (!factions.length) return '暂无已知组织。';
    const related = window.GameModules.factionArchive?.relatedFactions?.(store, action, []) || [];
    const relatedIds = new Set(related.map((f) => f.id));
    const sorted = [...factions].sort((a, b) => {
      const ar = relatedIds.has(a.id) ? 0 : 1;
      const br = relatedIds.has(b.id) ? 0 : 1;
      if (ar !== br) return ar - br;
      return String(a.resolution || 'L1').localeCompare(String(b.resolution || 'L1'));
    });
    return sorted.map((f) => this.orgIndexLine(f)).join('\n').slice(0, max);
  },

  orgHotBlock(faction = {}, store) {
    const resolution = String(faction.resolution || 'L1').toUpperCase();
    if (resolution === 'L1') return '';
    const parts = [`【${faction.name}】${faction.resolutionBadge || this.resolutionBadge(faction.resolution)}`];
    (faction.structure || []).slice(0, 4).forEach((node) => {
      parts.push(`- ${node.name}｜${this.stateBadge(node.state)}｜${this.nodeParentLabel(node)}`);
      (node.roles || []).slice(0, 2).forEach((role) => {
        const title = role.displayTitle || role.title || '职位：迷雾';
        parts.push(`  · ${title}｜${this.stateBadge(role.state)}`);
      });
    });
    const cap = this.capabilitySummary(faction, 2);
    if (cap) parts.push(cap);
    return parts.join('\n');
  },

  orgHotText(store, action = '', max = 1200) {
    store.initFactionSystem?.();
    const seed = `${action} ${store.realWorldLocationName || ''} ${store.realWorldSceneTitle || ''}`;
    const related = window.GameModules.factionArchive?.relatedFactions?.(store, seed, []) || [];
    const candidates = related.length
      ? related
      : (store.factionState?.factions || []).filter((f) => ['L2', 'L3', 'L4'].includes(String(f.resolution || '').toUpperCase()));
    const lines = candidates.map((f) => this.orgHotBlock(f, store)).filter(Boolean);
    return lines.join('\n\n').slice(0, max) || '暂无已接触组织细节。';
  },

  territoryHotText(store, max = 600) {
    const map = window.GameModules.realWorldMap?.ensure?.(store, store.playerProfile || {}) || {};
    const nodes = window.GameModules.realWorldMapFog?.visibleNodes?.(map)
      || (map.nodes || []).filter((n) => n.revealed && window.GameModules.realWorldMap?.isMapDisplayNode?.(n, map));
    const lines = nodes.slice(0, 14).map((node) => {
      const label = this.resolveControlLabel(map, node, store);
      return label ? `${node.name}｜${label}` : null;
    }).filter(Boolean);
    return lines.join('\n').slice(0, max) || '暂无已揭示地点控势。';
  },

  factionExposureScore(faction = {}, store) {
    if (!faction?.id && !faction?.name) return 0;
    if (faction.type === '国家' && !faction.parentId) return 2;
    if (['company-main', 'family-player-home'].includes(faction.id)) return 2;
    const resolution = String(faction.resolution || 'L1').toUpperCase();
    if (['L2', 'L3', 'L4'].includes(resolution)) return 1;
    const key = window.GameModules.factionArchive?.factionKey?.(faction);
    const archives = store?.factionState?.archives?.[key];
    if (archives && Object.keys(archives).length) return 1;
    if (faction.kind === 'admin') return 0;
    return 0;
  },

  hasArchiveExposure(faction = {}, store) {
    const key = window.GameModules.factionArchive?.factionKey?.(faction);
    const archive = store?.factionState?.archives?.[key];
    if (!archive) return false;
    return (archive.docs || []).some((doc) => (doc.paragraphs || []).length > 0);
  },

  settlementSubjectKey(update = {}) {
    const type = String(update?.updateType || '').trim();
    const subject = update.subject || {};
    if (type === 'territory-control') {
      return String(subject.locationName || subject.name || subject.id || '').trim();
    }
    if (/^org-status|membership|faction-structure|faction-overview|org-capability/u.test(type)) {
      return String(subject.name || subject.factionId || subject.id || subject.orgId || '').trim();
    }
    return '';
  },

  isOrgTerritoryUpdate(update = {}) {
    const type = String(update?.updateType || '').trim();
    return /^(territory-control|org-status|org-structure-node|org-capability-entry|org-capability|membership|faction-structure|faction-overview)$/u.test(type);
  },

  REAL_WORLD_WORK_ALIASES: ['2026现代都市现实世界', '2026 现代都市', '现代都市现实世界'],

  isRealWorldPlaySession(store = {}) {
    const realWorldTag = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const activeWorld = String(store.character?.work || store.selectedWork || '').trim();
    if (!activeWorld) return true;
    if (activeWorld === realWorldTag) return true;
    return this.REAL_WORLD_WORK_ALIASES.includes(activeWorld);
  },

  consistencySignature(report = {}) {
    return [...(report.warnings || []), ...(report.fixes || [])].join('|');
  },

  trimReconciliationLog(store, max = 30) {
    if (!store?.orgTerritoryReconciliationLog?.length) return;
    if (store.orgTerritoryReconciliationLog.length > max) {
      store.orgTerritoryReconciliationLog = store.orgTerritoryReconciliationLog.slice(-max);
    }
  },

  filterUpdatesForStoryWorld(updates = [], store = {}) {
    if (this.isRealWorldPlaySession(store)) return updates;
    const skipped = [];
    const kept = (Array.isArray(updates) ? updates : []).filter((item) => {
      if (!this.isOrgTerritoryUpdate(item)) return true;
      skipped.push(item);
      return false;
    });
    if (skipped.length) {
      this.recordReconciliationLog(store, {
        at: this.nowLabel(store),
        kind: 'story-world-skip',
        count: skipped.length,
        types: [...new Set(skipped.map((x) => x.updateType))].join('、'),
      });
      console.info('[orgTerritory] 异世界推演跳过组织/控势结算', skipped.length, '条');
    }
    return kept;
  },

  dedupeOrgTerritoryUpdates(updates = [], store = null) {
    const list = Array.isArray(updates) ? updates.slice() : [];
    const byTerritory = new Map();
    const rest = [];
    list.forEach((item) => {
      if (item?.updateType !== 'territory-control') {
        rest.push(item);
        return;
      }
      const loc = this.settlementSubjectKey(item);
      if (!loc) {
        rest.push(item);
        return;
      }
      if (byTerritory.has(loc)) {
        const prev = byTerritory.get(loc);
        if (store) {
          this.recordReconciliationLog(store, {
            at: this.nowLabel(store),
            kind: 'territory-control-dedupe',
            location: loc,
            keptSummary: item?.change?.value?.effectiveOrgId || '',
            droppedSummary: prev?.change?.value?.effectiveOrgId || '',
          });
        }
        console.warn('[orgTerritory] 同轮控势冲突，保留最后一条:', loc);
      }
      byTerritory.set(loc, item);
    });
    return [...rest, ...Array.from(byTerritory.values())];
  },

  archiveEvictedMapNodes(store, droppedNodes = [], map = {}) {
    const archive = window.GameModules.factionArchive;
    if (!store || !archive || !Array.isArray(droppedNodes) || !droppedNodes.length) return 0;
    let count = 0;
    droppedNodes.forEach((node) => {
      if (!node?.name) return;
      const history = Array.isArray(node.controlHistory) ? node.controlHistory : [];
      const hasCustomControl = node.control && (history.length > 0 || node.control.inherit === false);
      if (!node.revealed && !hasCustomControl) return;
      const mapCtx = map?.nodes?.length ? map : { nodes: [node], current: node.name, currentId: node.id };
      const label = this.resolveControlLabel(mapCtx, node, store);
      const parts = [`[地图节点淘汰] ${node.name}`];
      if (label) parts.push(`末态：${label}`);
      history.slice(0, 8).forEach((h) => {
        const eff = this.orgNameById(store, h.effectiveOrgId);
        const snippet = String(h.reason || '').slice(0, 80);
        parts.push(`${String(h.at || '').slice(0, 19).replace('T', ' ')} 实控${eff}${snippet ? `（${snippet}）` : ''}`);
      });
      const text = parts.join('；');
      const orgNames = [
        this.orgNameById(store, node.control?.effectiveOrgId),
        this.orgNameById(store, node.control?.claimOrgId),
        this.orgNameById(store, node.control?.ownerOrgId),
      ].filter(Boolean);
      archive.appendForRelated(store, text, orgNames, '地图控势归档');
      count += 1;
    });
    if (count) console.info('[orgTerritory] 已归档', count, '个淘汰地图节点的控势历史');
    return count;
  },

  validatePrincipleCompliance(store) {
    if (!store?.factionState) store?.initFactionSystem?.();
    const notes = [];
    const profile = store?.playerProfile || {};
    const map = window.GameModules.realWorldMap?.ensure?.(store, profile) || store?.realWorldMap || {};

    (store?.factionState?.factions || []).forEach((faction) => {
      const resolution = String(faction.resolution || 'L1').toUpperCase();
      const isAdmin = faction.kind === 'admin' || faction.kind === 'community';
      if (resolution === 'L1' && !isAdmin && !this.hasArchiveExposure(faction, store) && (faction.structure || []).length > 0) {
        notes.push(`C5：L1 未接触组织「${faction.name}」含 structure，audit 应 strip`);
      }
      if (['L2', 'L3', 'L4'].includes(resolution) && !(faction.changeLog || []).length && !this.hasArchiveExposure(faction, store)) {
        notes.push(`C1：「${faction.name}」已 ${resolution} 但无 changeLog 或 archive 追溯`);
      }
      const deptNames = (faction.structure || []).map((n) => String(n.name || '').trim()).filter(Boolean);
      deptNames.forEach((name) => {
        const dupes = (faction.structure || []).filter((n) => n.name === name && String(n.state || 'sketch') === 'sketch');
        if (dupes.length > 1) notes.push(`C4：「${faction.name}」sketch 期部门「${name}」重复 ${dupes.length} 条，应 id upsert 合并`);
      });
      (faction.structure || []).forEach((node) => {
        (node.roles || []).forEach((role) => {
          if (role.state === 'established' && !(faction.changeLog || []).some((c) => /structure|更改|change/u.test(String(c.action || c.field || '')))) {
            notes.push(`C2：「${faction.name}」职位「${role.title || '未知'}」已 established，changeLog 缺更改记录`);
          }
          if (!role.dutyFog && !role.dutyNote && role.state !== 'fog') {
            notes.push(`C3：「${faction.name}」职位「${role.title || '未知'}」duty 未迷雾但无 dutyNote`);
          }
        });
      });
      this.CAPABILITY_DIMS.forEach((dim) => {
        (faction.solid?.capabilities?.[dim]?.entries || []).forEach((entry) => {
          if (entry.state === 'established' && entry.parentRef?.fog === false && !entry.parentRef?.label && !entry.parentRef?.orgNodeId) {
            notes.push(`C3：「${faction.name}」能力条目「${entry.name}」上级已非迷雾但无 label`);
          }
        });
      });
    });

    const hot = this.territoryHotText(store);
    (map.nodes || []).forEach((node) => {
      if (node.revealed || !node.name) return;
      const name = String(node.name).trim();
      if (!name) return;
      const hit = hot.split(/\n/u).some((line) => line.startsWith(`${name}｜`) || line === name);
      if (hit) notes.push(`C6：未揭示地点「${node.name}」不应出现在 Territory Hot`);
    });

    const checks = {
      C1: !notes.some((n) => n.startsWith('C1')),
      C2: !notes.some((n) => n.startsWith('C2')),
      C3: !notes.some((n) => n.startsWith('C3')),
      C4: !notes.some((n) => n.startsWith('C4')),
      C5: !notes.some((n) => n.startsWith('C5')),
      C6: !notes.some((n) => n.startsWith('C6')),
    };
    return { ok: notes.length === 0, notes, checks };
  },

  sanitizeAuditFaction(faction = {}, store, existing = null) {
    if (!faction?.name) return null;
    const resolution = String(existing?.resolution || faction.resolution || 'L1').toUpperCase();
    const archiveHit = this.hasArchiveExposure(existing || faction, store);
    const lowExposure = resolution === 'L1' && !archiveHit;
    const isAdmin = faction.kind === 'admin' || faction.kind === 'community' || /^admin-|^community-/.test(String(faction.id || ''));

    if (lowExposure || isAdmin) {
      faction.structure = [];
      faction.resolution = 'L1';
      if (!faction.stub?.oneLine) {
        faction.stub = { oneLine: `${faction.name}（stub，尚未推演接触）` };
      }
    }

    if (isAdmin) {
      faction.resolution = 'L1';
      faction.structure = [];
    }

    if (faction.solid?.capabilities && (lowExposure || isAdmin)) {
      Object.keys(faction.solid.capabilities).forEach((dim) => {
        if (faction.id !== 'company-main' || dim !== 'economic') {
          faction.solid.capabilities[dim].entries = [];
        }
      });
    }

    if (existing?.resolution === 'L3' || existing?.resolution === 'L4') {
      const establishedNodes = (existing.structure || []).filter((n) => n.state === 'established');
      if (establishedNodes.length && JSON.stringify(faction.structure) !== JSON.stringify(existing.structure)) {
        faction.structure = existing.structure;
      }
    }

    return this.normalizeFaction(faction, store);
  },

  bumpOrgExposureOnMapVisit(store, map, node) {
    if (!store || !node?.id) return false;
    store.initFactionSystem?.();
    const anchorIds = new Set([node.id]);
    const chainNames = new Set([String(node.name || '').trim()].filter(Boolean));
    let walk = node;
    const mapMod = window.GameModules.realWorldMap;
    for (let guard = 0; guard < 8 && walk; guard += 1) {
      if (walk.parentId) anchorIds.add(walk.parentId);
      if (walk.name) chainNames.add(String(walk.name).trim());
      if (!walk.parentId) break;
      walk = (map?.nodes || []).find((item) => item.id === walk.parentId);
    }
    const nodeName = String(node.name || '');
    const now = this.nowLabel(store);
    const bump = (faction, reason) => {
      if (String(faction.resolution || 'L1').toUpperCase() !== 'L1') return false;
      faction.resolution = 'L2';
      faction.resolutionBadge = this.resolutionBadge('L2');
      faction.changeLog = [{ field: 'resolution', reason, at: now, action: 'exposure' }, ...(faction.changeLog || [])].slice(0, 50);
      return true;
    };
    let touched = false;
    (store.factionState?.factions || []).forEach((faction) => {
      if (faction.kind === 'community' || faction.type === '社区') {
        const anchored = (faction.territoryAnchors || []).some((id) => anchorIds.has(id));
        const named = faction.name && nodeName.includes(String(faction.name).replace(/小区|社区/u, '').slice(0, 4));
        if ((anchored || named) && bump(faction, '地图 POI 首访接触')) touched = true;
        return;
      }
      if (faction.kind === 'admin' || faction.type === '行政区') {
        const named = chainNames.has(String(faction.name || '').trim())
          || (faction.location && chainNames.has(String(faction.location).trim()));
        if (named && bump(faction, '政区地图链首访接触')) touched = true;
      }
    });
    return touched;
  },

  resolveMapNodeForLocation(store, locationName = '', map = null) {
    const label = String(locationName || '').trim();
    if (!label) return { map: null, node: null };
    const mapMod = window.GameModules.realWorldMap;
    const m = map || mapMod?.ensure?.(store, store?.playerProfile || {}) || store?.realWorldMap || null;
    if (!m?.nodes) return { map: m, node: null };
    let node = this.findMapNode(m, label);
    if (!node) {
      node = (m.nodes || []).find((n) => this.locationsCompatible(n.name, label));
    }
    if (!node) return { map: m, node: null };
    const anchor = mapMod?.resolveExteriorAnchorNode?.(m, node) || node;
    return { map: m, node: anchor };
  },

  bumpOrgExposureOnScheduleLocation(store, locationName = '') {
    if (!store || !locationName) return false;
    store.initFactionSystem?.();
    const { map, node } = this.resolveMapNodeForLocation(store, locationName);
    if (!map || !node) return false;
    return this.bumpOrgExposureOnMapVisit(store, map, node);
  },

  resolveTerritoryBrief(store, params = {}) {
    const profile = store?.playerProfile || {};
    const mapMod = window.GameModules.realWorldMap;
    const map = mapMod?.ensure?.(store, profile) || store.realWorldMap || {};
    const name = String(params.locationName || params.name || params.keyword || map.current || '').trim();
    if (name) {
      const node = this.findMapNode(map, name);
      if (!node) return `未找到地点：${name}`;
      if (!node.revealed) return `地点「${node.name}」尚未揭示，无控势资料。`;
      const anchor = mapMod?.resolveExteriorAnchorNode?.(map, node) || node;
      const control = this.resolveControl(map, anchor, store);
      const label = this.resolveControlLabel(map, anchor, store);
      const lines = [`地点：${anchor.name}`, `控势：${label}`];
      const ownerId = control.ownerOrgId || control.effectiveOrgId;
      if (ownerId !== control.effectiveOrgId) {
        lines.push(`产权：${this.orgNameById(store, ownerId)}｜管治：${this.orgNameById(store, control.effectiveOrgId)}`);
      }
      if (control.status && control.status !== 'stable') lines.push(`状态：${control.status}`);
      const parent = anchor.parentId ? (map.nodes || []).find((n) => n.id === anchor.parentId) : null;
      if (parent?.revealed) {
        const parentLabel = this.resolveControlLabel(map, parent, store);
        if (parentLabel) lines.push(`上级区域：${parent.name}｜${parentLabel}`);
      }
      return lines.join('\n');
    }
    return `控势摘要（已揭示）：\n${this.territoryHotText(store, 800)}`;
  },

  parseCapabilityDim(field = '', value = {}) {
    const text = String(field || '');
    const match = text.match(/capabilities\.(political|economic|asset|military)/u);
    if (match) return match[1];
    const dim = String(value.dimension || value.capability || value.dim || '').trim().toLowerCase();
    if (this.CAPABILITY_DIMS.includes(dim)) return dim;
    const cn = String(value.dimension || value.capability || '').trim();
    const cnMap = { 政治: 'political', 经济: 'economic', 资产: 'asset', 军事: 'military' };
    return cnMap[cn] || 'economic';
  },

  resolveOrgIdByName(store, name = '') {
    if (!store?.factionState) return '';
    const label = String(name || '').trim();
    if (!label) return '';
    const factions = store?.factionState?.factions || [];
    const hit = factions.find((f) => f.name === label || f.id === label);
    if (hit?.id) return hit.id;
    if (label === '美利坚合众国') return 'country-usa';
    if (label === '中华人民共和国') return 'country-china';
    const slug = store?.factionIdByName?.(label);
    if (slug && factions.some((f) => f.id === slug)) return slug;
    return '';
  },

  orgNameByIdOrLabel(store, orgId = '', fallback = '') {
    const id = String(orgId || '').trim();
    if (id) return this.orgNameById(store, id);
    return String(fallback || '').trim() || '未知组织';
  },

  normalizeMembership(raw = {}, store) {
    const orgName = String(raw.orgName || raw.force || raw.faction || '').trim();
    const orgId = String(raw.orgId || '').trim() || this.resolveOrgIdByName(store, orgName);
    const title = String(raw.title || raw.position || '成员').trim();
    const department = String(raw.department || raw.dept || '').trim();
    return {
      ...raw,
      orgId,
      orgName: orgName || this.orgNameByIdOrLabel(store, orgId, ''),
      title,
      department,
      departmentFog: raw.departmentFog === true || !department,
      since: raw.since || '',
      reason: String(raw.reason || '').slice(0, 240),
      state: this.normalizeItemState(raw.state, title ? 'sketch' : 'fog'),
      displayLine: department && !raw.departmentFog
        ? `${orgName || this.orgNameById(store, orgId)} / ${department} / ${title}`
        : `${orgName || this.orgNameById(store, orgId)} / ${title}${raw.departmentFog !== false && !department ? '（部门：迷雾）' : ''}`,
    };
  },

  membershipFromForcePosition(entry = {}, store) {
    return this.normalizeMembership({
      orgName: entry.force || entry.faction,
      orgId: entry.orgId,
      title: entry.position,
      department: entry.department,
      departmentFog: entry.departmentFog,
      since: entry.since,
      reason: entry.reason,
    }, store);
  },

  forcePositionFromMembership(membership = {}) {
    const orgName = membership.orgName || '';
    const title = membership.title || '成员';
    return {
      name: `${orgName} / ${title}`,
      force: orgName,
      faction: orgName,
      position: title,
      orgId: membership.orgId || '',
      department: membership.department || '',
      reason: membership.reason || '',
      changeMode: membership.changeMode || 'membership同步',
    };
  },

  syncCharacterOrgMemberships(state, store) {
    if (!state?.values) return state;
    const ot = this;
    const fps = Array.isArray(state.values.force_positions) ? state.values.force_positions : [];
    const existing = Array.isArray(state.values.memberships) ? state.values.memberships : [];
    const merged = existing.slice();
    fps.forEach((fp) => {
      const mem = ot.membershipFromForcePosition(fp, store);
      if (!mem.orgId && !mem.orgName) return;
      const dup = merged.some((m) => (m.orgId && m.orgId === mem.orgId && m.title === mem.title) || (m.orgName === mem.orgName && m.title === mem.title));
      if (!dup) merged.push(mem);
    });
    state.values.memberships = merged.map((m) => ot.normalizeMembership(m, store));
    state.values.force_positions = fps.map((fp) => {
      const orgId = fp.orgId || ot.resolveOrgIdByName(store, fp.force || fp.faction);
      const patch = orgId ? { orgId } : {};
      if (fp.department !== undefined) return { ...fp, ...patch };
      const mem = merged.find((m) => (m.orgId && m.orgId === orgId) || m.orgName === fp.force);
      if (mem?.department) return { ...fp, ...patch, department: mem.department };
      return { ...fp, ...patch };
    });
    return state;
  },

  upsertCharacterMembership(state, patch = {}, store) {
    if (!state?.values) return null;
    const mem = this.normalizeMembership(patch, store);
    if (!mem.orgId && !mem.orgName) return null;
    const list = Array.isArray(state.values.memberships) ? state.values.memberships : [];
    const idx = list.findIndex((m) => (mem.orgId && m.orgId === mem.orgId) || (m.orgName === mem.orgName && m.title === mem.title));
    if (idx >= 0) list[idx] = { ...list[idx], ...mem };
    else list.push(mem);
    state.values.memberships = list.map((m) => this.normalizeMembership(m, store));
    const fp = this.forcePositionFromMembership(mem);
    const fps = Array.isArray(state.values.force_positions) ? state.values.force_positions : [];
    const fpIdx = fps.findIndex((f) => f.force === fp.force && f.position === fp.position);
    if (fpIdx >= 0) fps[fpIdx] = { ...fps[fpIdx], ...fp };
    else fps.push(fp);
    state.values.force_positions = fps;
    return mem;
  },

  findCharacterStateByName(store, name = '') {
    const label = String(name || '').trim();
    if (!label) return null;
    return Object.values(store?.rpgStates || {}).find((s) => {
      const n = String(s?.profile?.name || s?.name || '').trim();
      return n && (n === label || n.endsWith(label));
    }) || null;
  },

  isCohabitantCharacter(name = '', profile = {}) {
    const label = String(name || '').trim();
    if (!label) return false;
    const blob = [profile.livingStatus, profile.relationships, profile.notes, profile.parents].filter(Boolean).join('；');
    if (!blob.includes(label)) return false;
    return /妹妹|兄弟|姐姐|同住|家庭|三胞胎|亲属|家人/.test(blob);
  },

  ensurePresetFamilyMemberships(store) {
    if (!store?.factionState) return;
    window.GameModules.orgTerritoryActions?.ensureFamilyOrg?.(store);
    const familyId = 'family-player-home';
    const family = (store.factionState?.factions || []).find((f) => f.id === familyId);
    if (!family) return;
    const profile = store.playerProfile || {};
    const playerName = String(profile.name || profile.playerName || '').trim();

    Object.values(store.rpgStates || {}).forEach((state) => {
      const name = String(state.profile?.name || state.name || '').trim();
      if (!name || name === playerName || state.id === 'player-self') return;
      const rel = String(state.profile?.relationships || state.profile?.role || '').trim();
      if (!this.isCohabitantCharacter(name, profile) && !/妹妹|兄弟|姐姐|同住/.test(rel)) return;
      const title = /妹妹/.test(rel) ? '妹妹' : (/兄弟/.test(rel) ? '兄弟' : (/姐姐/.test(rel) ? '姐姐' : '同住家庭成员'));
      this.upsertCharacterMembership(state, {
        orgId: familyId,
        orgName: family.name,
        title,
        department: '家庭',
        state: 'sketch',
        reason: '玩家资料或预置角色卡确认家庭同住关系（不预填 political）。',
        source: 'preset-family',
      }, store);
    });

    const player = store.playerIdentityState?.();
    if (player) {
      this.upsertCharacterMembership(player, {
        orgId: familyId,
        orgName: family.name,
        title: '户主/同住者',
        department: '家庭',
        state: 'sketch',
        reason: '玩家家庭 org 预绑定。',
        source: 'preset-family',
      }, store);
    }
  },

  collectFactionMemberships(store, faction = {}) {
    store?.initFactionSystem?.();
    const factionId = faction?.id || '';
    const factionName = faction?.name || '';
    if (!factionId && !factionName) return [];
    const rows = [];
    const seen = new Set();
    const push = (row) => {
      const key = `${row.characterName}|${row.orgId}|${row.title}|${row.source}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push(row);
    };

    Object.values(store?.rpgStates || {}).forEach((state) => {
      const characterName = String(state?.profile?.name || state?.name || '未知').trim();
      (state.values?.memberships || []).forEach((raw) => {
        const m = this.normalizeMembership(raw, store);
        if (m.orgId !== factionId && m.orgName !== factionName) return;
        push({
          characterName,
          characterId: state.id,
          orgId: m.orgId,
          orgName: m.orgName,
          title: m.title,
          department: m.departmentFog ? '迷雾' : (m.department || '—'),
          since: m.since,
          reason: m.reason,
          stateBadge: this.stateBadge(m.state),
          source: 'membership',
        });
      });
      (state.values?.force_positions || []).forEach((fp) => {
        const orgId = fp.orgId || this.resolveOrgIdByName(store, fp.force || fp.faction);
        if (orgId !== factionId && fp.force !== factionName) return;
        if ((state.values?.memberships || []).some((m) => this.normalizeMembership(m, store).orgId === orgId)) return;
        push({
          characterName,
          characterId: state.id,
          orgId,
          orgName: fp.force || factionName,
          title: fp.position || '成员',
          department: fp.department || '—',
          since: fp.since || '',
          reason: fp.reason || '',
          stateBadge: '兼容',
          source: 'force_positions',
        });
      });
    });

    (faction.structure || []).forEach((node) => {
      (node.roles || []).forEach((role) => {
        (role.occupants || []).forEach((occ) => {
          if (occ.occupantFog || !occ.name || occ.name === '未知') return;
          push({
            characterName: occ.name,
            characterId: occ.characterId || '',
            orgId: factionId,
            orgName: factionName,
            title: role.displayTitle || role.title || '职位',
            department: node.name || '—',
            since: '',
            reason: occ.reason || role.reason || '',
            stateBadge: this.stateBadge(role.state),
            source: 'structure',
          });
        });
        (role.characters || []).filter((c) => c && c !== '未知').forEach((name) => {
          if ((role.occupants || []).some((o) => o.name === name)) return;
          push({
            characterName: name,
            characterId: '',
            orgId: factionId,
            orgName: factionName,
            title: role.title || '职位',
            department: node.name || '—',
            since: '',
            reason: '',
            stateBadge: this.stateBadge(role.state),
            source: 'structure',
          });
        });
      });
    });

    return rows.sort((a, b) => a.characterName.localeCompare(b.characterName, 'zh-CN'));
  },

  formatControlHistoryEntry(store, item = {}) {
    const at = String(item.at || item.since || '').slice(0, 19).replace('T', ' ');
    const effective = this.orgNameById(store, item.effectiveOrgId);
    const claim = this.orgNameById(store, item.claimOrgId);
    const owner = this.orgNameById(store, item.ownerOrgId || item.effectiveOrgId);
    const status = item.status === 'contested' ? '争夺' : (item.status || 'stable');
    let controlText = effective === claim ? effective : `实控${effective}｜宣称${claim}`;
    if (owner !== effective) controlText = `产权${owner}｜管治${effective}${effective === claim ? '' : `｜宣称${claim}`}`;
    return `${at || '未知时间'}｜${controlText}｜${status}${item.reason ? `｜${item.reason}` : ''}`;
  },

  resolveHomeMapNode(store) {
    const profile = store?.playerProfile || {};
    const mapMod = window.GameModules.realWorldMap;
    const map = mapMod?.ensure?.(store, profile) || store.realWorldMap || {};
    const homeName = mapMod?.inferHomeName?.(profile) || '';
    if (!homeName) return null;
    const exact = this.findMapNode(map, homeName);
    if (exact) return exact;
    return (map.nodes || []).find((node) => {
      const name = String(node.name || '');
      return name && (name.includes(homeName) || homeName.includes(name));
    }) || null;
  },

  controlHistoryForNode(map, node, store) {
    if (!node) return [];
    const mapMod = window.GameModules.realWorldMap;
    const anchor = mapMod?.resolveExteriorAnchorNode?.(map, node) || node;
    const history = Array.isArray(anchor.controlHistory) ? anchor.controlHistory : [];
    const current = this.resolveControl(map, anchor, store);
    const lines = history.map((item) => this.formatControlHistoryEntry(store, item));
    if (current?.since) {
      lines.unshift(`当前｜${this.resolveControlLabel(map, anchor, store)}｜自 ${String(current.since).slice(0, 19).replace('T', ' ')}`);
    }
    return lines.slice(0, 12);
  },

  ORG_STATUSES: ['active', 'rebel', 'independent', 'dissolved', 'merged'],
  ORG_STATUS_LABELS: { active: '活跃', rebel: '起义', independent: '独立', dissolved: '解散', merged: '已合并' },

  normalizeOrgStatus(status, fallback = 'active') {
    const value = String(status || '').trim().toLowerCase();
    return this.ORG_STATUSES.includes(value) ? value : fallback;
  },

  orgStatusLabel(faction = {}) {
    const status = this.normalizeOrgStatus(faction.status);
    const base = this.ORG_STATUS_LABELS[status] || status;
    const leg = faction.legitimacy === 'contested' ? '（合法性争议）' : (faction.legitimacy === 'unrecognized' ? '（未获承认）' : '');
    return status === 'active' && !leg ? '' : `${base}${leg}`;
  },

  resolveLiveOrgId(store, orgId = '', seen = null) {
    if (!store?.factionState) store?.initFactionSystem?.();
    const chain = seen || new Set();
    let current = String(orgId || '').trim();
    if (!current) return this.defaultCountryOrgId(store);
    for (let guard = 0; guard < 8 && current; guard += 1) {
      if (chain.has(current)) break;
      chain.add(current);
      const faction = (store?.factionState?.factions || []).find((f) => f.id === current);
      if (!faction) {
        console.warn('[orgTerritory] 无效 orgId，回退法域 stub:', current);
        return this.defaultCountryOrgId(store);
      }
      if (faction.status === 'dissolved' || faction.status === 'merged') {
        const next = (faction.successorIds || [])[0];
        if (next) {
          current = next;
          continue;
        }
        console.warn('[orgTerritory] 已解散/合并 org 无 successor，回退法域:', faction.id);
        return this.defaultCountryOrgId(store);
      }
      return faction.id;
    }
    return this.defaultCountryOrgId(store);
  },

  validateWorldConsistency(store) {
    if (!store?.factionState) return { fixes: [], warnings: [] };
    const fixes = [];
    const warnings = [];
    const profile = store?.playerProfile || {};
    const map = window.GameModules.realWorldMap?.ensure?.(store, profile) || {};
    this.syncPlayerLocationFromMap(store, map, fixes);
    this.autoSanitizeFactionExposure(store, fixes);
    (map.nodes || []).forEach((node) => {
      this.normalizeNodeControl(node, map, store);
      const control = node.control;
      if (!control) return;
      const eff = this.resolveLiveOrgId(store, control.effectiveOrgId);
      const claim = this.resolveLiveOrgId(store, control.claimOrgId);
      const owner = this.resolveLiveOrgId(store, control.ownerOrgId || control.effectiveOrgId);
      if (eff !== control.effectiveOrgId) {
        fixes.push(`地图「${node.name}」实控 ${control.effectiveOrgId} → ${eff}`);
        control.effectiveOrgId = eff;
      }
      if (claim !== control.claimOrgId) {
        fixes.push(`地图「${node.name}」宣称 ${control.claimOrgId} → ${claim}`);
        control.claimOrgId = claim;
      }
      if (owner !== (control.ownerOrgId || control.effectiveOrgId)) {
        fixes.push(`地图「${node.name}」产权 ${control.ownerOrgId || control.effectiveOrgId} → ${owner}`);
        control.ownerOrgId = owner;
      }
    });
    window.GameModules.orgTerritory?.ensureMapControls?.(map, store);
    (store?.factionState?.factions || []).forEach((faction) => {
      if (faction.parentId) {
        const liveParent = this.resolveLiveOrgId(store, faction.parentId);
        if (liveParent !== faction.parentId && (faction.status === 'active' || !faction.status)) {
          warnings.push(`势力「${faction.name}」上级 ${faction.parentId} 已失效，建议结算改隶`);
        }
      }
      const status = this.normalizeOrgStatus(faction.status);
      if (status === 'rebel' || status === 'independent') {
        const anchors = Array.isArray(faction.territoryAnchors) ? faction.territoryAnchors : [];
        const hasArchive = this.hasArchiveExposure(faction, store);
        if (!anchors.length && !hasArchive) {
          warnings.push(`势力「${faction.name}」${status} 但无 territoryAnchors 或 archive 夺控/独立依据`);
        }
        const hasBreakRelation = (faction.relations || []).some((r) => /hostile|secession/u.test(String(r.type || r.relation || '')));
        if (!hasBreakRelation && faction.parentId) {
          warnings.push(`势力「${faction.name}」${status} 建议补充 hostile/secession 关系`);
        }
      }
    });

    const company = (store?.factionState?.factions || []).find((f) => f.id === 'company-main');
    if (company && ['dissolved', 'merged'].includes(company.status) && store?.companyState?.employment?.active !== false) {
      warnings.push(`公司 org 已${company.status}，但 employment 仍 active；同步离职`);
      window.GameModules.orgTerritoryActions?.syncEmploymentOnOrgDissolved?.(store, company, '读档一致性校验');
    }

    this.validateLocationConsistency(store, map, warnings);

    const compliance = this.validatePrincipleCompliance(store);
    if (compliance.notes?.length) warnings.push(...compliance.notes);

    if (fixes.length) console.warn('[orgTerritory] 存档一致性修复:', fixes.join('；'));
    if (warnings.length) console.warn('[orgTerritory] 存档一致性警告:', warnings.join('；'));
    const at = store?.phoneDate?.()?.toISOString?.() || new Date().toISOString();
    const prev = store?.orgTerritoryConsistency || {};
    const prevSig = prev.signature || this.consistencySignature(prev);
    const nextSig = this.consistencySignature({ warnings, fixes });
    const dismissed = Boolean(prev.dismissed) && prevSig === nextSig;
    const report = { fixes, warnings, compliance, map, at, dismissed, signature: nextSig };
    if (store) {
      store.orgTerritoryConsistency = report;
      window.GameModules.alertLog?.ingestConsistencyReport?.(store, report);
    }
    return report;
  },

  recordReconciliationLog(store, entry = {}) {
    if (!store || !entry) return;
    store.orgTerritoryReconciliationLog = Array.isArray(store.orgTerritoryReconciliationLog) ? store.orgTerritoryReconciliationLog : [];
    store.orgTerritoryReconciliationLog.push(entry);
    this.trimReconciliationLog(store);
    window.GameModules.alertLog?.ingestReconciliationEntry?.(store, entry);
  },

  normalizeLocationLabel(name = '') {
    return String(name || '').replace(/\s+/g, '').trim();
  },

  locationsCompatible(a = '', b = '') {
    const left = this.normalizeLocationLabel(a);
    const right = this.normalizeLocationLabel(b);
    if (!left || !right) return true;
    if (left === right) return true;
    return left.includes(right) || right.includes(left);
  },

  locationPlaceholder(name = '') {
    const value = String(name || '').trim();
    return !value || /^(?:未知|当前位置未知|现实当前位置|尚未生成|未确认|玩家面前)$/u.test(value);
  },

  syncPlayerLocationFromMap(store, map = null, fixes = null) {
    const profile = store?.playerProfile || {};
    const worldMap = map || window.GameModules.realWorldMap?.ensure?.(store, profile) || store?.realWorldMap || {};
    const mapLoc = String(worldMap.current || store?.realWorldLocationName || '').trim();
    if (!mapLoc) return false;
    let changed = false;
    const note = (text) => { if (Array.isArray(fixes)) fixes.push(text); changed = true; };

    const playerState = store?.playerIdentityState?.() || store?.rpgStates?.['player-self'];
    if (playerState?.values) {
      const raw = playerState.values.current_location;
      const playerLoc = typeof raw === 'object' ? String(raw?.name || '').trim() : String(raw || '').trim();
      if (this.locationPlaceholder(playerLoc) || !this.locationsCompatible(mapLoc, playerLoc)) {
        playerState.values.current_location = {
          ...(typeof raw === 'object' ? raw : {}),
          name: mapLoc,
          worldTag: raw?.worldTag || window.GameModules.realWorld2026?.label || '2026 现代都市现实世界',
          updatedAt: store?.phoneDateText?.() || new Date().toISOString(),
          reason: raw?.reason || '与地图当前位置同步。',
        };
        note(`玩家身份 current_location 已同步为「${mapLoc}」`);
        if (playerState.id && store?.rpgStates?.[playerState.id]) {
          store.rpgStates[playerState.id] = playerState;
        }
      }
    }

    const scheduleKey = playerState?.id || 'player-self';
    const schedule = store?.characterSchedules?.[scheduleKey];
    if (schedule) {
      const scheduleLoc = String(schedule.currentLocation || '').trim();
      if (this.locationPlaceholder(scheduleLoc) || !this.locationsCompatible(mapLoc, scheduleLoc)) {
        schedule.currentLocation = mapLoc;
        note(`人事安排 currentLocation 已同步为「${mapLoc}」`);
      }
    }
    return changed;
  },

  autoSanitizeFactionExposure(store, fixes = []) {
    if (!store?.factionState?.factions?.length) return false;
    let changed = false;
    store.factionState.factions = store.factionState.factions.map((faction) => {
      const before = JSON.stringify({ structure: faction.structure || [], resolution: faction.resolution, stub: faction.stub });
      const sanitized = this.sanitizeAuditFaction({ ...faction }, store, faction);
      if (!sanitized) return faction;
      const after = JSON.stringify({ structure: sanitized.structure || [], resolution: sanitized.resolution, stub: sanitized.stub });
      if (before !== after) {
        fixes.push(`C5：已规范化 L1 组织「${sanitized.name}」的 structure/stub`);
        changed = true;
      }
      return { ...faction, ...sanitized };
    });
    return changed;
  },

  validateLocationConsistency(store, map = {}, warnings = []) {
    const mapLoc = String(map.current || store?.realWorldLocationName || '').trim();
    if (!mapLoc) return;
    const playerState = store?.playerIdentityState?.() || store?.rpgStates?.['player-self'];
    const playerRaw = playerState?.values?.current_location;
    const playerLoc = typeof playerRaw === 'object' ? String(playerRaw?.name || '').trim() : String(playerRaw || '').trim();
    const schedule = store?.characterSchedules?.['player-self'] || store?.characterSchedules?.[playerState?.id];
    const scheduleLoc = String(schedule?.currentLocation || '').trim();

    if (playerLoc && !this.locationsCompatible(mapLoc, playerLoc)) {
      warnings.push(`玩家地图位置「${mapLoc}」与身份 current_location「${playerLoc}」不一致`);
    }
    if (scheduleLoc && !this.locationsCompatible(mapLoc, scheduleLoc)) {
      warnings.push(`玩家地图位置「${mapLoc}」与人事安排 currentLocation「${scheduleLoc}」不一致`);
    }

    const node = (map.nodes || []).find((item) => item.id === map.currentId || item.name === mapLoc);
    if (!node) return;
    const control = this.resolveControl(map, node, store);
    if (control?.status === 'contested' || control?.status === 'disputed') {
      if (playerLoc && !this.locationsCompatible(mapLoc, playerLoc)) {
        warnings.push(`POI「${node.name}」控势为 ${control.status}，地图/身份/人事位置应一致`);
      }
    }
  },

  inferFamilyOrgName(profile = {}) {
    const name = String(profile.name || profile.playerName || '玩家').trim();
    const home = String(profile.refinedCity || profile.city || '').trim();
    if (name && home) return `${name}家庭（${home.slice(0, 12)}）`;
    if (name) return `${name}家庭`;
    return '玩家家庭';
  },
};


;// ---- org-territory-actions.js ----
/**
 * 组织—领土控势：Stage4 结算 apply（territory-control / faction-structure）。
 */
window.GameModules = window.GameModules || {};

window.GameModules.orgTerritoryActions = {
  ot() {
    return window.GameModules.orgTerritory;
  },

  reasonText(update = {}) {
    return window.GameModules.updateRegistry?.reasonText?.(update, '现实推演确认组织或控势变化。') || '现实推演确认组织或控势变化。';
  },

  appendOrgTerritorySystemRecord(store, key, value, reason = '') {
    if (!store || !value) return;
    store.realWorldSystemRecords = Array.isArray(store.realWorldSystemRecords) ? store.realWorldSystemRecords : [];
    const at = store.phoneDate?.()?.toISOString?.() || new Date().toISOString();
    const entry = { key: String(key || '政体').slice(0, 24), value: String(value).slice(0, 240), reason: String(reason || '').slice(0, 120), at };
    const dup = store.realWorldSystemRecords.some((item) => item.key === entry.key && item.value === entry.value);
    if (dup) return;
    store.realWorldSystemRecords = [...store.realWorldSystemRecords, entry].slice(-60);
  },

  ensureFaction(store, name = '') {
    store.initFactionSystem?.();
    const label = String(name || '').trim();
    let faction = (store.factionState?.factions || []).find((f) => f.name === label || f.id === label);
    if (!faction && label) {
      store.ensureFactionPosition?.({ force: label, position: '成员', characterName: '未知', reason: '控势或组织结算先创建势力 stub。' });
      faction = (store.factionState?.factions || []).find((f) => f.name === label || f.id === label);
    }
    return faction;
  },

  applyTerritoryControl(store, update = {}) {
    const ot = this.ot();
    const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
    const subject = update.subject || {};
    const value = update.change?.value ?? update.value ?? {};
    const locationName = String(subject.locationName || subject.name || subject.id || value.locationName || value.name || '').trim();
    const node = ot.findMapNode(map, locationName || map.current);
    if (!node) return { ok: false, text: `控势：未找到地点「${locationName || map.current || '未知'}」` };

    const anchor = window.GameModules.realWorldMap.resolveExteriorAnchorNode(map, node) || node;
    const patch = typeof value === 'object' && !Array.isArray(value) ? value : {};
    const allowUnrevealed = update.change?.reveal === true || patch.reveal === true;
    if (!anchor.revealed && !allowUnrevealed) {
      return { ok: false, text: `控势：地点「${anchor.name}」尚未揭示，不可写入地图；可仅写入 archive/org sketch` };
    }
    const before = JSON.stringify(anchor.control || {});
    const next = ot.normalizeControl({
      ...(anchor.control || {}),
      effectiveOrgId: patch.effectiveOrgId || patch.effective || anchor.control?.effectiveOrgId,
      claimOrgId: patch.claimOrgId || patch.claim || anchor.control?.claimOrgId,
      ownerOrgId: patch.ownerOrgId || patch.owner || anchor.control?.ownerOrgId,
      status: patch.status || anchor.control?.status || 'stable',
      since: ot.nowLabel(store),
      reason: patch.reason || this.reasonText(update),
      inherit: patch.inherit === true ? true : false,
    }, store);

    anchor.control = next;
    anchor.controlHistory = [
      {
        at: next.since,
        effectiveOrgId: next.effectiveOrgId,
        claimOrgId: next.claimOrgId,
        ownerOrgId: next.ownerOrgId,
        status: next.status,
        reason: next.reason,
        source: 'settlement',
      },
      ...(Array.isArray(anchor.controlHistory) ? anchor.controlHistory : []),
    ].slice(0, 20);

    ot.ensureMapControls(map, store);
    map.lastText = window.GameModules.realWorldMap.render(map);
    const changed = before !== JSON.stringify(anchor.control);
    const label = ot.resolveControlLabel(map, anchor, store);
    return { ok: changed, text: changed ? `控势更新：${anchor.name} → ${label}` : '' };
  },

  parseStructurePath(field = '') {
    const parts = String(field || '').split('.').filter(Boolean);
    const idx = parts.indexOf('structure');
    if (idx < 0) return { nodeName: '', tail: parts };
    return { nodeName: parts[idx + 1] || '', tail: parts.slice(idx + 2) };
  },

  applyFactionStructureUpdate(store, update = {}, legacyItem = {}) {
    const ot = this.ot();
    store.initFactionSystem?.();
    const subject = update.subject || {};
    const factionName = String(subject.name || subject.factionId || subject.id || legacyItem.factionName || legacyItem.name || '').trim();
    const faction = this.ensureFaction(store, factionName);
    if (!faction) return { ok: false, text: `组织：未找到势力「${factionName}」` };

    const change = update.change || {};
    const value = change.value ?? legacyItem.value ?? {};
    const { nodeName } = this.parseStructurePath(update.field || '');
    const deptName = nodeName && nodeName !== 'roles' ? nodeName : (value.nodeName || value.department || value.dept || '组织架构');
    const reason = this.reasonText(update) || legacyItem.reason || '现实推演确认组织架构变化。';
    const now = ot.nowLabel(store);

    faction.structure = Array.isArray(faction.structure) ? faction.structure : [];
    let node = faction.structure.find((n) => n.name === deptName || n.id === value.nodeId || n.id === value.id);
    if (!node) {
      node = ot.normalizeStructureNode({
        name: deptName,
        state: value.nodeState || value.state || 'fog',
        parentRef: value.parentRef,
        roles: [],
      }, faction, faction.structure.length, store);
      faction.structure.push(node);
    } else if (!ot.canMutateEstablished(node, update) && (value.name || value.parentRef)) {
      return { ok: false, text: `组织：「${deptName}」已确立，需「更改」类结算才能修改` };
    } else {
      if (value.name) node.name = String(value.name).trim();
      if (value.state || value.nodeState) node.state = ot.normalizeItemState(value.state || value.nodeState, node.state);
      if (value.parentRef) node.parentRef = ot.normalizeParentRef(value.parentRef);
      if (value.sketchNote) node.sketchNote = String(value.sketchNote).slice(0, 240);
    }

    const roleValue = value.title || value.position || legacyItem.position || (typeof value === 'string' ? value : '');
    if (roleValue || value.roles || Array.isArray(value.characters)) {
      node.roles = Array.isArray(node.roles) ? node.roles : [];
      const title = String(roleValue || value.title || '未命名职位').trim();
      const lookupTitle = String(value.previousTitle || value.oldTitle || '').trim();
      let role = node.roles.find((r) => (value.roleId && r.id === value.roleId) || (lookupTitle && r.title === lookupTitle) || r.title === title);
      if (!role) {
        role = { title, state: 'fog', titleFog: !title, dutyFog: true, occupantFog: true, characters: [], occupants: [] };
        node.roles.push(role);
      } else if (!ot.canMutateEstablished(role, update) && (value.title || value.characters || value.occupants)) {
        return { ok: false, text: `组织：职位「${title}」已确立，需「更改」类结算` };
      }
      if (value.title) {
        role.title = String(value.title).trim();
        role.titleFog = value.titleFog === true || !role.title;
      }
      if (value.dutyNote || value.duty) {
        role.dutyNote = String(value.dutyNote || value.duty).trim();
        role.dutyFog = false;
      }
      if (value.dutyFog === true) role.dutyFog = true;
      if (value.state) role.state = ot.normalizeItemState(value.state, role.state);
      if (value.establish === true || value.state === 'established') role.state = 'established';
      if (Array.isArray(value.characters)) {
        role.characters = value.characters.map(String).filter(Boolean);
        role.occupants = value.characters.map((c) => ot.normalizeOccupant(c, store));
        role.occupantFog = !role.occupants.length;
      }
      if (Array.isArray(value.occupants)) {
        role.occupants = value.occupants.map((o) => ot.normalizeOccupant(o, store));
        role.characters = role.occupants.map((o) => o.name).filter(Boolean);
        role.occupantFog = role.occupants.every((o) => o.occupantFog);
      }
      if (value.occupantFog === true) role.occupantFog = true;
      Object.assign(role, ot.normalizeRole(role, store));
    }

    Object.assign(faction, ot.normalizeFaction(faction, store));
    faction.updatedAt = now;
    faction.changeLog = [{ field: 'structure', reason, at: now, action: change.mode || 'upsert' }, ...(faction.changeLog || [])].slice(0, 50);
    if (faction.resolution === 'L1' && faction.structure.length) faction.resolution = 'L2';
    store.refreshFactionOrgCache?.();
    return { ok: true, text: `组织更新：${faction.name} / ${node.name}` };
  },

  ensureFactionSolid(faction = {}) {
    const ot = this.ot();
    if (!faction.solid || typeof faction.solid !== 'object') {
      faction.solid = { capabilities: ot.defaultCapabilities() };
    }
    faction.solid.capabilities = { ...ot.defaultCapabilities(), ...(faction.solid.capabilities || {}) };
    ot.CAPABILITY_DIMS.forEach((dim) => {
      if (!Array.isArray(faction.solid.capabilities[dim]?.entries)) {
        faction.solid.capabilities[dim] = { entries: [] };
      }
    });
    return faction.solid;
  },

  upsertCapabilityEntry(entries = [], patch = {}, faction = {}, dim = 'economic', store, update = {}) {
    const ot = this.ot();
    const id = String(patch.id || '').trim();
    const name = String(patch.name || patch.title || '').trim();
    let entry = entries.find((e) => (id && e.id === id) || (name && e.name === name));
    if (!entry) {
      entry = ot.normalizeCapabilityEntry(patch, faction, dim, entries.length, store);
      entries.push(entry);
    } else if (!ot.canMutateEstablished(entry, update) && (patch.name || patch.parentRef || patch.sketchNote)) {
      return { entry: null, blocked: true };
    } else {
      if (patch.name) entry.name = String(patch.name).trim();
      if (patch.kind) entry.kind = String(patch.kind).slice(0, 24);
      if (patch.state) entry.state = ot.normalizeItemState(patch.state, entry.state);
      if (patch.parentRef) entry.parentRef = ot.normalizeParentRef(patch.parentRef);
      if (patch.sketchNote || patch.note) entry.sketchNote = String(patch.sketchNote || patch.note).slice(0, 240);
      if (patch.establish === true || patch.state === 'established') entry.state = 'established';
      Object.assign(entry, ot.normalizeCapabilityEntry(entry, faction, dim, 0, store));
    }
    return { entry, blocked: false };
  },

  applyOrgCapabilityEntry(store, update = {}) {
    const ot = this.ot();
    store.initFactionSystem?.();
    const subject = update.subject || {};
    const factionName = String(subject.name || subject.factionId || subject.id || '').trim();
    const faction = this.ensureFaction(store, factionName);
    if (!faction) return { ok: false, text: `能力：未找到势力「${factionName}」` };

    const change = update.change || {};
    const value = change.value ?? update.value ?? {};
    const patch = typeof value === 'object' && !Array.isArray(value) ? value : { name: String(value || '新条目') };
    const dim = ot.parseCapabilityDim(update.field, patch);
    const reason = this.reasonText(update);
    const now = ot.nowLabel(store);

    this.ensureFactionSolid(faction);
    const entries = faction.solid.capabilities[dim].entries;
    const { entry, blocked } = this.upsertCapabilityEntry(entries, patch, faction, dim, store, update);
    if (blocked) return { ok: false, text: `能力：「${patch.name || entry?.name}」已确立，需「更改」类结算` };
    if (change.mode === 'remove' && entry) {
      faction.solid.capabilities[dim].entries = entries.filter((e) => e.id !== entry.id);
    }

    Object.assign(faction, ot.normalizeFaction(faction, store));
    faction.updatedAt = now;
    faction.changeLog = [{ field: `capabilities.${dim}`, reason, at: now, action: change.mode || 'upsert' }, ...(faction.changeLog || [])].slice(0, 50);
    if (['L1', 'L2'].includes(String(faction.resolution || 'L1').toUpperCase())) faction.resolution = 'L2';
    store.refreshFactionOrgCache?.();
    const label = ot.CAPABILITY_LABELS[dim] || dim;
    return { ok: true, text: `能力条目：${faction.name} / ${label} / ${entry?.name || patch.name}` };
  },

  applyOrgCapability(store, update = {}) {
    const ot = this.ot();
    store.initFactionSystem?.();
    const subject = update.subject || {};
    const factionName = String(subject.name || subject.factionId || subject.id || '').trim();
    const faction = this.ensureFaction(store, factionName);
    if (!faction) return { ok: false, text: `能力：未找到势力「${factionName}」` };

    const value = update.change?.value ?? update.value ?? {};
    const patch = typeof value === 'object' && !Array.isArray(value) ? value : {};
    const dim = ot.parseCapabilityDim(update.field, patch);
    const reason = this.reasonText(update);
    const now = ot.nowLabel(store);

    this.ensureFactionSolid(faction);
    if (patch.level) faction.solid.capabilities[dim].level = String(patch.level).slice(0, 24);
    if (patch.note || patch.summary) faction.solid.capabilities[dim].note = String(patch.note || patch.summary).slice(0, 240);
    if (Array.isArray(patch.entries)) {
      patch.entries.forEach((item) => this.upsertCapabilityEntry(faction.solid.capabilities[dim].entries, item, faction, dim, store, update));
    }

    Object.assign(faction, ot.normalizeFaction(faction, store));
    faction.updatedAt = now;
    faction.changeLog = [{ field: `capabilities.${dim}`, reason, at: now, action: 'capability' }, ...(faction.changeLog || [])].slice(0, 50);
    store.refreshFactionOrgCache?.();
    return { ok: true, text: `能力维度：${faction.name} / ${ot.CAPABILITY_LABELS[dim] || dim}` };
  },

  applyMembershipUpdate(store, update = {}) {
    const ot = this.ot();
    const subject = update.subject || {};
    const characterName = String(subject.name || subject.characterName || update.characterName || '').trim();
    const characterId = String(subject.characterId || subject.id || '').trim();
    let state = characterId && characterId !== 'player-self' ? store.itemSkillState?.(characterId) : store.playerIdentityState?.();
    if (!state && characterName) state = ot.findCharacterStateByName(store, characterName);
    if (!state && (characterId === 'player-self' || !characterName)) state = store.playerIdentityState?.();
    if (!state?.values) return { ok: false, text: `人事：未找到角色「${characterName || characterId || '未知'}」` };

    const change = update.change || {};
    const value = change.value ?? update.value ?? {};
    const patch = typeof value === 'object' && !Array.isArray(value) ? value : {};
    const reason = this.reasonText(update);
    const now = ot.nowLabel(store);

    if (change.mode === 'remove') {
      const orgId = patch.orgId || ot.resolveOrgIdByName(store, patch.orgName || patch.force);
      state.values.memberships = (state.values.memberships || []).filter((m) => m.orgId !== orgId && m.orgName !== patch.orgName);
      state.values.force_positions = (state.values.force_positions || []).filter((f) => f.orgId !== orgId && f.force !== patch.orgName);
    } else {
      ot.upsertCharacterMembership(state, { ...patch, since: patch.since || now, reason: patch.reason || reason }, store);
    }

    store.rpgStates = { ...(store.rpgStates || {}), [state.id]: state };
    window.GameModules.sqliteSave?.saveCharacterState?.(state);
    const mem = (state.values.memberships || []).slice(-1)[0];
    return { ok: true, text: `人事归属：${state.profile?.name || characterName} → ${mem?.displayLine || patch.orgName || '组织'}` };
  },

  syncCompanyEconomicEntry(store, faction = {}, company = {}, reason = '') {
    if (!faction?.id || !company?.name) return;
    const ot = this.ot();
    this.ensureFactionSolid(faction);
    const entries = faction.solid.capabilities.economic.entries;
    const patch = {
      id: `econ-${faction.id}`,
      name: `${company.name}经营`,
      kind: '企业',
      state: entries.find((e) => e.id === `econ-${faction.id}`)?.state || 'sketch',
      parentRef: ot.parentRefClear(null, faction.parentName || faction.name),
      sketchNote: [company.industry, company.scale, company.location].filter(Boolean).join('｜').slice(0, 240),
    };
    this.upsertCapabilityEntry(entries, patch, faction, 'economic', store, {});
    Object.assign(faction, ot.normalizeFaction(faction, store));
    faction.changeLog = [{ field: 'capabilities.economic', reason: reason || '公司APP同步经济能力条目。', at: ot.nowLabel(store), action: 'sync' }, ...(faction.changeLog || [])].slice(0, 50);
  },

  ensureFamilyOrg(store) {
    if (!store?.factionState) return null;
    if (!Array.isArray(store.factionState?.factions)) return null;
    const ot = this.ot();
    const profile = store.playerProfile || {};
    const id = 'family-player-home';
    let faction = (store.factionState?.factions || []).find((f) => f.id === id);
    const country = (store.factionState?.factions || []).find((f) => f.type === '国家' && !f.parentId)
      || window.GameModules.factionSystem?.countryFaction?.(profile);
    const community = (store.factionState?.factions || []).find((f) => f.kind === 'community');
    const parent = community || country;
    const name = ot.inferFamilyOrgName(profile);
    const now = ot.nowLabel(store);
    if (!faction) {
      faction = ot.normalizeFaction({
        id,
        name,
        type: '家庭',
        kind: 'family',
        parentId: parent?.id || '',
        parentName: parent?.name || '无势力归属',
        level: '家庭级',
        location: profile.refinedCity || profile.city || '现实城市未登记',
        domain: '家庭资产与同住',
        scale: '小型',
        stance: '私人',
        influence: 10,
        description: '玩家家庭组织 stub；个人现金资产单向同步至 asset 能力条目。',
        resolution: 'L1',
        stub: { oneLine: `${name}（家庭 stub，资产随 playerProfile.wealth 镜像）` },
        status: 'active',
        legitimacy: 'recognized',
        structure: [],
        rules: [],
        resources: [],
        relations: [],
        fixed: true,
        updatedAt: now,
      }, store);
      store.factionState.factions.push(faction);
    } else {
      faction.name = name;
      faction.parentId = community?.id || country?.id || faction.parentId;
      faction.parentName = community?.name || country?.name || faction.parentName;
      Object.assign(faction, ot.normalizeFaction(faction, store));
    }
    this.syncFamilyTerritoryAnchor(store, faction);
    return faction;
  },

  syncFamilyTerritoryAnchor(store, family = null) {
    const ot = this.ot();
    const item = family || (store.factionState?.factions || []).find((f) => f.id === 'family-player-home');
    if (!item) return null;
    const node = ot.resolveHomeMapNode?.(store);
    if (!node?.id) return item;
    const anchors = Array.isArray(item.territoryAnchors) ? item.territoryAnchors.slice() : [];
    if (!anchors.includes(node.id)) anchors.unshift(node.id);
    item.territoryAnchors = anchors.slice(0, 8);
    if (node.name) item.location = node.name;
    Object.assign(item, ot.normalizeFaction(item, store));
    return item;
  },

  syncPlayerWealthAsset(store, wealth = null) {
    if (!store?.playerProfile) return null;
    const ot = this.ot();
    const profile = store.playerProfile;
    const w = wealth || (typeof store.normalizePlayerWealth === 'function' ? store.normalizePlayerWealth(profile) : {});
    const amount = Number(w.wealthAmount ?? profile.wealthAmount ?? 0);
    const tier = w.wealthTier || profile.wealthTier || '中产';
    const family = this.ensureFamilyOrg(store);
    if (!family) return null;
    this.ensureFactionSolid(family);
    const entries = family.solid.capabilities.asset.entries;
    const patch = {
      id: 'asset-player-cash',
      name: '家庭可支配现金（镜像）',
      kind: '现金资产',
      state: 'sketch',
      parentRef: ot.parentRefClear(family.id, family.name),
      sketchNote: `${tier}｜${amount.toLocaleString('zh-CN')}元｜来源：playerProfile.wealth（不重复记账）`,
      wealthMirror: { tier, amount, source: profile.wealthSource || '' },
    };
    this.upsertCapabilityEntry(entries, patch, family, 'asset', store, {});
    Object.assign(family, ot.normalizeFaction(family, store));
    family.updatedAt = ot.nowLabel(store);
    return family;
  },

  applyOrgStatus(store, update = {}) {
    const ot = this.ot();
    store.initFactionSystem?.();
    const subject = update.subject || {};
    const factionId = String(subject.factionId || subject.id || subject.orgId || '').trim();
    const factionName = String(subject.name || subject.factionName || '').trim();
    let faction = (store.factionState?.factions || []).find((f) => f.id === factionId || f.name === factionName);
    if (!faction && factionName) faction = this.ensureFaction(store, factionName);
    if (!faction) return { ok: false, text: `政体：未找到组织「${factionName || factionId}」` };

    const change = update.change || {};
    const value = change.value ?? update.value ?? {};
    const patch = typeof value === 'object' && !Array.isArray(value) ? value : {};
    const reason = this.reasonText(update);
    const now = ot.nowLabel(store);
    const nextStatus = ot.normalizeOrgStatus(patch.status || patch.orgStatus, faction.status || 'active');

    faction.status = nextStatus;
    if (patch.legitimacy) faction.legitimacy = String(patch.legitimacy).slice(0, 24);
    if (Array.isArray(patch.predecessorIds)) faction.predecessorIds = patch.predecessorIds.map(String).slice(0, 8);
    if (patch.successorId || patch.successorOrgId) {
      faction.successorIds = [String(patch.successorId || patch.successorOrgId)].filter(Boolean);
    }
    if (Array.isArray(patch.successorIds)) faction.successorIds = patch.successorIds.map(String).slice(0, 4);
    if (patch.name) faction.name = String(patch.name).trim();

    if ((nextStatus === 'merged' || nextStatus === 'dissolved') && faction.successorIds?.length) {
      const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
      (map.nodes || []).forEach((node) => {
        if (!node.control) return;
        let touched = false;
        if (node.control.effectiveOrgId === faction.id) {
          node.control.effectiveOrgId = ot.resolveLiveOrgId(store, faction.successorIds[0]);
          touched = true;
        }
        if (node.control.claimOrgId === faction.id) {
          node.control.claimOrgId = ot.resolveLiveOrgId(store, faction.successorIds[0]);
          touched = true;
        }
        if ((node.control.ownerOrgId || node.control.effectiveOrgId) === faction.id) {
          node.control.ownerOrgId = ot.resolveLiveOrgId(store, faction.successorIds[0]);
          touched = true;
        }
        if (touched) {
          node.control.inherit = false;
          node.controlHistory = [{ at: now, effectiveOrgId: node.control.effectiveOrgId, claimOrgId: node.control.claimOrgId, ownerOrgId: node.control.ownerOrgId, status: node.control.status, reason, source: 'org-status' }, ...(node.controlHistory || [])].slice(0, 20);
        }
      });
      map.lastText = window.GameModules.realWorldMap.render(map);
      store.realWorldMap = map;
    }

    if (nextStatus === 'rebel' || nextStatus === 'independent') {
      this.applyOrgStatusEconomicCascade(store, faction, reason, now);
      const statusLabel = ot.orgStatusLabel(faction) || nextStatus;
      this.appendOrgTerritorySystemRecord(store, '政体', `${faction.name}：${statusLabel}`, reason);
      const parent = (store.factionState?.factions || []).find((f) => f.id === faction.parentId);
      const hasBreakRelation = (faction.relations || []).some((r) => /hostile|secession/u.test(String(r.type || r.relation || '')));
      if (parent && !hasBreakRelation) {
        faction.relations = [{
          targetOrgId: parent.id,
          target: parent.name,
          type: nextStatus === 'independent' ? 'secession' : 'hostile',
          relation: nextStatus === 'independent' ? 'secession' : 'hostile',
          detail: reason || '政体状态变更',
          status: 'active',
          since: now,
        }, ...(faction.relations || [])].slice(0, 12);
      }
    }

    if (nextStatus === 'dissolved' || nextStatus === 'merged') {
      this.syncEmploymentOnOrgDissolved(store, faction, reason);
    }

    Object.assign(faction, ot.normalizeFaction(faction, store));
    faction.updatedAt = now;
    faction.changeLog = [{ field: 'status', reason, at: now, action: nextStatus }, ...(faction.changeLog || [])].slice(0, 50);
    ot.validateWorldConsistency(store);
    store.refreshFactionOrgCache?.();
    const label = ot.orgStatusLabel(faction) || nextStatus;
    return { ok: true, text: `政体状态：${faction.name} → ${label}` };
  },

  applyOrgStatusEconomicCascade(store, faction, reason = '', now = '') {
    const ot = this.ot();
    const isEmployer = /公司|工作室|企业/u.test(String(faction.type || '')) || faction.kind === 'company';
    if (!isEmployer) return;
    this.ensureFactionSolid(faction);
    const entries = faction.solid?.capabilities?.economic?.entries || [];
    const label = ot.orgStatusLabel(faction) || faction.status;
    const note = `⚠ ${label}：管治区冲突，发薪/经营或中断（${String(reason || '政体状态变更').slice(0, 60)}）`;
    let touched = false;
    entries.forEach((entry) => {
      const key = `${entry.name || ''}${entry.kind || ''}`;
      if (/薪|工资|用工|payroll|经营|营收/ui.test(key)) {
        entry.sketchNote = [entry.sketchNote, note].filter(Boolean).join('｜').slice(0, 240);
        entry.state = entry.state || 'sketch';
        touched = true;
      }
    });
    if (!touched) {
      entries.unshift({
        id: `economic-disrupt-${String(now || ot.nowLabel(store)).replace(/[^\d]/g, '').slice(-12)}`,
        name: '经营中断（政体状态）',
        kind: '经营风险',
        state: 'sketch',
        parentRef: ot.parentRefClear(faction.id, faction.name),
        sketchNote: note,
      });
    }
    faction.solid.capabilities.economic.entries = entries.slice(0, 24);
  },

  adminSlug(name = '') {
    return String(name || '').replace(/[^\w\u4e00-\u9fa5]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 48) || 'region';
  },

  ensureAdminOrgStub(store, item = {}, parentOrgId = '') {
    const ot = this.ot();
    store.initFactionSystem?.();
    const profile = store.playerProfile || {};
    const country = (store.factionState?.factions || []).find((f) => f.type === '国家' && !f.parentId)
      || window.GameModules.factionSystem?.countryFaction?.(profile);
    const kind = item.kind || 'admin';
    const id = kind === 'community' ? `community-${this.adminSlug(item.name)}` : `admin-${this.adminSlug(item.name)}`;
    const parentId = parentOrgId || country?.id || '';
    const parentFaction = (store.factionState?.factions || []).find((f) => f.id === parentId);
    const parentName = parentFaction?.name || country?.name || '无势力归属';
    let faction = (store.factionState?.factions || []).find((f) => f.id === id || f.name === item.name);
    const now = ot.nowLabel(store);
    const type = kind === 'community' ? '社区' : '行政区';
    if (!faction) {
      faction = ot.normalizeFaction({
        id,
        name: item.name,
        type,
        kind,
        parentId,
        parentName,
        level: item.level || '行政区级',
        location: item.name,
        domain: kind === 'community' ? '居住社区' : '地方政区',
        scale: kind === 'community' ? '小型' : '大型',
        stance: '中立',
        influence: kind === 'community' ? 15 : 40,
        description: `${item.name}（${item.level || '政区'} stub，地址链自动生成）`,
        resolution: 'L1',
        stub: { oneLine: `${item.name}（${item.level || '政区'} stub，尚未推演接触）` },
        status: 'active',
        structure: [],
        rules: [],
        resources: [],
        relations: [],
        fixed: true,
        updatedAt: now,
      }, store);
      store.factionState.factions.push(faction);
    } else if (parentId && !faction.parentId) {
      faction.parentId = parentId;
      faction.parentName = parentName;
      Object.assign(faction, ot.normalizeFaction(faction, store));
    }
    return faction;
  },

  linkFamilyToCommunity(store, communityOrgId = '') {
    if (!communityOrgId) return;
    const ot = this.ot();
    const community = (store.factionState?.factions || []).find((f) => f.id === communityOrgId);
    if (!community) return;
    const family = (store.factionState?.factions || []).find((f) => f.id === 'family-player-home');
    if (!family) return;
    family.parentId = community.id;
    family.parentName = community.name;
    Object.assign(family, ot.normalizeFaction(family, store));
  },

  syncEmploymentOnOrgDissolved(store, faction, reason = '') {
    if (!store?.companyState || !faction) return false;
    const isPlayerCompany = faction.id === 'company-main'
      || (store.currentCompany?.()?.name && store.currentCompany().name === faction.name);
    if (!isPlayerCompany || !['dissolved', 'merged'].includes(faction.status)) return false;
    if (store.companyState.employment?.active === false) return false;
    const endAt = store.phoneDate?.()?.toISOString?.() || new Date().toISOString();
    const companyName = store.currentCompany?.()?.name || faction.name;
    store.companyState.employment = {
      active: false,
      startAt: store.companyState.employment?.startAt || endAt,
      resignedAt: endAt,
      resignedCompany: companyName,
    };
    const records = store.companyState.employmentRecords || [];
    const record = records.find((item) => item.status === '在职') || records[0];
    if (record) {
      record.status = '已离职';
      record.endAt = endAt;
      record.duration = store.employmentDurationText?.(record.startAt, endAt) || record.duration || '';
    }
    this.appendOrgTerritorySystemRecord(store, '就业', `${companyName}：组织 ${faction.status}，同步离职`, reason || '政体状态变更');
    return true;
  },

  applySettlementUpdates(store, updates = []) {
    const lines = [];
    const ot = this.ot();
    const deduped = ot.dedupeOrgTerritoryUpdates?.(Array.isArray(updates) ? updates : [], store) || updates;
    const ordered = deduped.slice().sort((a, b) => {
      const rank = (t) => (t === 'org-status' ? 0 : t === 'territory-control' ? 1 : 2);
      return rank(a?.updateType) - rank(b?.updateType);
    });
    const settlementLimit = 12;
    const batch = ordered.slice(0, settlementLimit);
    const droppedCount = Math.max(0, ordered.length - batch.length);
    if (droppedCount > 0) {
      console.warn('[orgTerritory] 同轮组织结算超过上限，丢弃', droppedCount, '条');
      ot.recordReconciliationLog?.(store, {
        at: ot.nowLabel(store),
        kind: 'settlement-truncated',
        kept: batch.length,
        dropped: droppedCount,
      });
    }
    for (const update of batch) {
      const type = String(update?.updateType || '').trim();
      if (type === 'org-status') {
        const result = this.applyOrgStatus(store, update);
        if (result.text) lines.push(result.text);
      } else if (type === 'territory-control') {
        const result = this.applyTerritoryControl(store, update);
        if (result.text) lines.push(result.text);
      } else if (type === 'faction-structure' || type === 'org-structure-node') {
        const result = this.applyFactionStructureUpdate(store, update);
        if (result.text) lines.push(result.text);
      } else if (type === 'org-capability-entry') {
        const result = this.applyOrgCapabilityEntry(store, update);
        if (result.text) lines.push(result.text);
      } else if (type === 'org-capability') {
        const result = this.applyOrgCapability(store, update);
        if (result.text) lines.push(result.text);
      } else if (type === 'membership') {
        const result = this.applyMembershipUpdate(store, update);
        if (result.text) lines.push(result.text);
      } else if (type === 'faction-overview') {
        const ctx = window.GameModules.realWorldAgentContext;
        const name = update.subject?.name || update.subject?.factionId || update.subject?.id || '';
        const value = update.change?.value ?? update.value ?? {};
        const patch = typeof value === 'object' && !Array.isArray(value) ? value : {};
        if (name && ctx?.upsertFaction) {
          const text = ctx.upsertFaction(store, { name, ...patch, reason: this.reasonText(update) });
          if (text) lines.push(String(text).split('\n')[0]);
        }
      }
    }
    return lines;
  },

  applyLegacyStructure(store, item = {}) {
    if (String(item.action || '') !== 'updateStructure') return null;
    return this.applyFactionStructureUpdate(store, {
      subject: { name: item.factionName || item.name },
      change: { mode: 'upsert', value: item.value || { title: item.position, characters: item.characters } },
      reasons: [{ evidence: item.reason || '' }],
    }, item);
  },
};


;// ---- real-world-map.js ----
/**
 * 现实世界电子地图：地点以树词条组织，可展开子地点并查看说明。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldMap = {
  defaultState(profile = {}) {
    const home = this.inferHomeName(profile);
    const node = home ? this.makeNode(home, '', this.defaultDescription(home, profile)) : null;
    return { current: home, currentId: node?.id || '', nodes: node ? [node] : [], edges: [], expanded: node ? { [node.id]: true } : {}, infoNodeId: '', lastText: home };
  },

  isAbstractName(name) {
    const text = this.cleanName(name);
    return !text || /^(玩家住处|住处|现实地点|当前位置|未知地点|现实起点)$/u.test(text) || /现实起点$/u.test(text);
  },

  inferHomeName(profile = {}) {
    const candidates = [profile.homeLocation, profile.locationName, profile.refinedCity, profile.city];
    return candidates.map((x) => this.cleanName(x)).find((x) => !this.isAbstractName(x) && /区|县|镇|街|路|巷|号|栋|楼|室|小区|公寓|学校|公司|工位/u.test(x)) || '';
  },

  defaultDescription(name, profile = {}) {
    const detail = [profile.refinedLivingStatus, profile.refinedRole].filter(Boolean).join('；');
    return detail ? `${name}。${detail}` : `${name}，现实推演中的已知地点。`;
  },

  cleanName(name) {
    return String(name || '').replace(/[\n\r|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 28);
  },

  cleanDescription(text, fallback = '现实推演记录到的地点。') {
    return String(text || fallback).replace(/[\n\r]+/g, ' ').trim().slice(0, 160) || fallback;
  },

  /** 建筑物内部场景：不出现在电子地图节点上，只进 interiorLayout。 */
  isInteriorLocationName(name = '') {
    const text = this.cleanName(name);
    if (!text) return false;
    if (/的房间|卧室|客厅|厨房|卫生间|洗手间|浴室|储物间|书房|阳台|衣帽间/u.test(text)) return true;
    if (/^走廊$|走廊$|楼梯间|电梯间|电梯厅|单元门厅|门厅$/u.test(text)) return true;
    if (/的(房|室|间)/u.test(text)) return true;
    return false;
  },

  /** 电子地图可见 POI：最小颗粒度为某一栋建筑物或小区级场所。 */
  isMapExteriorNode(name = '') {
    const text = this.cleanName(name);
    if (!text || this.isInteriorLocationName(text)) return false;
    if (/\d+\s*栋[\s\S]{0,12}单元|\d+\s*号楼[\s\S]{0,8}单元|\d+\s*幢[\s\S]{0,8}单元/u.test(text)) return true;
    if (/栋|单元|座|号楼|幢/u.test(text) && !/走廊|楼梯|房间/u.test(text)) return true;
    if (/小区|社区|公园|花园|超市|商店|店铺|广场|学校|公司|办公|车场|停车场|门岗|菜市|市场/u.test(text)) return true;
    if (/省|市|区|县|镇|街道/u.test(text) && /栋|单元|楼/u.test(text)) return true;
    return false;
  },

  isCommunityLevelNode(name = '') {
    const text = this.cleanName(name);
    return Boolean(text) && /小区|社区|园|广场/u.test(text) && !this.isInteriorLocationName(text) && !this.isMapExteriorNode(text);
  },

  isMapDisplayNode(node = {}, map = null) {
    if (!node?.name) return false;
    if (node.mapVisible === false) return false;
    if (this.isInteriorLocationName(node.name)) return false;
    if (this.isMapExteriorNode(node.name)) return true;
    if (this.isCommunityLevelNode(node.name)) {
      const kids = map ? this.childrenOf(map, node.id) : [];
      return kids.some((child) => this.isMapExteriorNode(child.name));
    }
    return false;
  },

  resolveExteriorAnchorNode(map, node) {
    if (!node) return null;
    let current = node;
    let best = null;
    for (let guard = 0; guard < 12 && current; guard += 1) {
      if (this.isMapExteriorNode(current.name)) best = current;
      if (!current.parentId) break;
      current = (map.nodes || []).find((item) => item.id === current.parentId);
    }
    if (best) return best;
    current = node;
    for (let guard = 0; guard < 12 && current; guard += 1) {
      if (!this.isInteriorLocationName(current.name)) return current;
      if (!current.parentId) break;
      current = (map.nodes || []).find((item) => item.id === current.parentId);
    }
    return node;
  },

  inferInteriorKind(name = '') {
    const text = this.cleanName(name);
    if (/楼梯/u.test(text)) return '楼梯间';
    if (/走廊/u.test(text)) return '走廊';
    if (/厨房/u.test(text)) return '厨房';
    if (/卫生间|洗手间|浴室/u.test(text)) return '卫生间';
    if (/客厅/u.test(text)) return '客厅';
    if (/房间|卧室/u.test(text)) return '卧室';
    return '空间';
  },

  ensureInteriorLayout(node) {
    if (!node.interiorLayout || typeof node.interiorLayout !== 'object') node.interiorLayout = { summary: '', zones: [] };
    if (!Array.isArray(node.interiorLayout.zones)) node.interiorLayout.zones = [];
    return node.interiorLayout;
  },

  addInteriorZone(anchor, source = {}) {
    if (!anchor) return;
    const name = this.cleanName(source.name || source);
    if (!name) return;
    const layout = this.ensureInteriorLayout(anchor);
    if (layout.zones.some((zone) => zone.name === name)) return;
    layout.zones.push({
      id: String(source.id || `zone_${this.nodeId(name)}`),
      name,
      kind: String(source.kind || this.inferInteriorKind(name)).slice(0, 12),
      position: String(source.position || '中').slice(0, 2),
      description: this.cleanDescription(source.description || `${name}，${anchor.name} 内部空间。`),
    });
  },

  compactInteriorNodes(map) {
    (map.nodes || []).forEach((node) => {
      if (!this.isInteriorLocationName(node.name)) return;
      node.mapVisible = false;
      node.exteriorRingUnlocked = false;
      const anchor = this.resolveExteriorAnchorNode(map, node);
      if (!anchor || anchor.id === node.id) return;
      if (!node.parentId || node.parentId !== anchor.id) node.parentId = anchor.id;
      this.addInteriorZone(anchor, {
        id: `zone_${node.id}`,
        name: node.name,
        kind: this.inferInteriorKind(node.name),
        description: node.description || `${node.name}，${anchor.name} 内部空间。`,
      });
    });
    (map.nodes || []).forEach((node) => {
      if (!this.isMapExteriorNode(node.name) || !node.exteriorRingUnlocked) return;
      const siblings = (map.nodes || []).filter((item) => item.parentId === node.parentId && item.id !== node.id && this.isMapDisplayNode(item, map));
      if (!siblings.length) node.exteriorRingUnlocked = false;
    });
  },

  mapDisplayRender(map) {
    const nodes = (map.nodes || []).filter((node) => this.isMapDisplayNode(node, map));
    if (!nodes.length) return '等待 AI 根据现实上下文生成具体地点';
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const roots = nodes.filter((node) => !node.parentId || !byId.has(node.parentId));
    const lines = [];
    const walk = (node, depth) => {
      const anchorId = map.mapAnchorId || map.currentId;
      const mark = node.id === anchorId ? `【${node.name}】` : node.name;
      lines.push(`${'  '.repeat(depth)}${mark}`);
      this.childrenOf(map, node.id)
        .filter((child) => this.isMapDisplayNode(child, map))
        .forEach((child) => walk(child, depth + 1));
    };
    roots.forEach((root) => walk(root, 0));
    return lines.join('\n') || nodes.map((node) => node.name).join('、');
  },

  nodeId(name) {
    return `loc_${this.cleanName(name).replace(/[^\w\u4e00-\u9fa5]+/gu, '_')}`;
  },

  factTime(state) {
    return window.GameModules.realWorldMapFacts?.nowLabel?.(state) || `${state.phoneDateText?.() || ''}${state.phoneTimeText?.() || ''}` || new Date().toISOString();
  },

  syncFacts(node, fallback = '', time = '') {
    return window.GameModules.realWorldMapFacts?.syncNode?.(node, fallback, time) || node;
  },

  makeNode(name, parentId = '', description = '', time = '') {
    const clean = this.cleanName(name);
    if (this.isAbstractName(clean)) return null;
    return this.syncFacts({ id: this.nodeId(clean), name: clean, parentId, description: this.cleanDescription(description), order: Date.now(), visited: false, revealed: false, mapVisible: true, interiorLayout: { summary: '', zones: [] }, control: null, controlHistory: [] }, description, time);
  },

  trimMapNodes(map, store = null, max = 40) {
    if (!Array.isArray(map?.nodes) || map.nodes.length <= max) return;
    const dropped = map.nodes.slice(0, map.nodes.length - max);
    window.GameModules.orgTerritory?.archiveEvictedMapNodes?.(store, dropped, map);
    map.nodes = map.nodes.slice(-max);
  },

  ensure(state, profile = {}) {
    if (!state.realWorldMap || typeof state.realWorldMap !== 'object') state.realWorldMap = this.defaultState(profile);
    const map = state.realWorldMap;
    map.expanded = map.expanded && typeof map.expanded === 'object' ? map.expanded : {};
    map.view = map.view && typeof map.view === 'object' ? map.view : { x: 0, y: 0, scale: 1 };
    map.nodes = this.normalizeNodes(map, profile, this.factTime(state), state);
    map._boundStore = state;
    map.edges = Array.isArray(map.edges) ? map.edges : [];
    map.nodes.forEach((node) => window.GameModules.realWorldMapFog?.normalizeNodeFlags?.(node));
    window.GameModules.orgTerritory?.ensureMapControls?.(map, state);
    this.compactInteriorNodes(map);
    const inferred = this.inferHomeName(profile);
    const currentName = this.isAbstractName(map.current || state.realWorldLocationName) ? inferred : this.cleanName(map.current || state.realWorldLocationName);
    const currentNode = currentName ? this.upsertNode(map, { name: currentName, description: this.defaultDescription(currentName, profile), time: this.factTime(state), onlyIfNew: true }) : this.currentNode(map);
    if (currentNode) {
      map.current = currentNode.name;
      map.currentId = currentNode.id;
      const anchor = this.resolveExteriorAnchorNode(map, currentNode) || currentNode;
      map.mapAnchorId = anchor.id;
      map.expanded[anchor.id] = true;
      state.realWorldLocationName = currentNode.name;
    } else {
      map.current = '';
      map.currentId = '';
      map.mapAnchorId = '';
      state.realWorldLocationName = '';
    }
    window.GameModules.realWorldMapFog?.bootstrapHome?.(map);
    window.GameModules.realWorldMapGeopolitical?.ensure?.(state, map, profile);
    window.GameModules.orgTerritory?.ensureMapControls?.(map, state);
    map.lastText = this.render(map);
    return map;
  },

  normalizeNodes(map, profile = {}, time = '', store = null) {
    const nodes = [];
    const add = (node) => {
      const name = this.cleanName(node?.name || node);
      if (this.isAbstractName(name)) return;
      const id = node?.id || this.nodeId(name);
      if (nodes.some((item) => item.id === id)) return;
      nodes.push(this.syncFacts({
        id,
        name,
        parentId: node?.parentId || '',
        description: this.cleanDescription(node?.description, this.defaultDescription(name, profile)),
        descriptionFacts: node?.descriptionFacts || node?.facts,
        order: Number(node?.order) || nodes.length + 1,
        revealed: node?.revealed,
        visited: node?.visited,
        mapVisible: node?.mapVisible,
        control: node?.control,
        controlHistory: node?.controlHistory,
        geopoliticalStub: node?.geopoliticalStub,
      }, node?.description || this.defaultDescription(name, profile), time));
    };
    (Array.isArray(map.nodes) ? map.nodes : []).forEach(add);
    if (Array.isArray(map.edges)) map.edges.forEach((edge) => { add(edge.from); add(edge.to); });
    if (!nodes.length && this.inferHomeName(profile)) add(this.inferHomeName(profile));
    const ids = new Set(nodes.map((node) => node.id));
    nodes.forEach((node) => { if (node.parentId && !ids.has(node.parentId)) node.parentId = ''; });
    if (store && nodes.length > 40) {
      window.GameModules.orgTerritory?.archiveEvictedMapNodes?.(store, nodes.slice(0, nodes.length - 40), { ...map, nodes });
    }
    return nodes.slice(-40);
  },

  update(state, locationName, result = {}) {
    const map = this.ensure(state, state.playerProfile || {});
    const time = this.factTime(state);
    const rawNext = this.cleanName(locationName || result.locationName || map.current);
    const nextName = this.isAbstractName(rawNext) ? this.inferHomeName(state.playerProfile || {}) : rawNext;
    if (!nextName) return map;
    const parentName = this.cleanName(result.parentLocationName || result.parentLocation || '');
    const descriptionRaw = result.locationDescription || result.description;
    const description = this.cleanDescription(descriptionRaw, `${nextName}，当前现实行动发生或停留的位置。`);
    let parent = parentName ? this.upsertNode(map, { name: parentName, description: `${parentName}，${nextName} 的上级地点。`, time, onlyIfNew: true }) : null;
    const interior = this.isInteriorLocationName(nextName);
    if (interior && !parent) {
      const anchorGuess = this.resolveExteriorAnchorNode(map, map.nodes.find((item) => item.id === map.mapAnchorId) || this.currentNode(map));
      if (anchorGuess) parent = anchorGuess;
    }
    const node = this.upsertNode(map, {
      name: nextName,
      parentId: parentName ? parent?.id || '' : (interior ? parent?.id || undefined : undefined),
      description,
      time,
      appendFact: Boolean(descriptionRaw),
    });
    if (!node) return map;
    const anchor = this.resolveExteriorAnchorNode(map, node) || node;
    if (interior) {
      node.mapVisible = false;
      if (anchor.id !== node.id) {
        node.parentId = anchor.id;
        this.addInteriorZone(anchor, { name: nextName, description });
      }
    } else if (this.isMapExteriorNode(nextName)) {
      node.mapVisible = true;
    }
    if (parent && parent.id !== node.id && this.isMapDisplayNode(parent, map)) map.expanded[parent.id] = true;
    if (Array.isArray(result.mapNodes)) {
      result.mapNodes.slice(0, 8).forEach((item) => {
        const itemName = this.cleanName(item.name || item.locationName);
        if (this.isInteriorLocationName(itemName)) this.addInteriorZone(anchor, item);
        else this.addLocation(state, item, time, anchor);
      });
    }
    if (Array.isArray(result.mapLinks)) result.mapLinks.slice(0, 6).forEach((link) => this.addLinkNode(map, link, time));
    window.GameModules.realWorldMapFacts?.applyLocationUpdates?.(state, result);
    map.current = node.name;
    map.currentId = node.id;
    map.mapAnchorId = anchor.id;
    map.expanded[anchor.id] = true;
    state.realWorldLocationName = node.name;
    map.lastText = this.render(map);
    return map;
  },

  addLocation(state, item = {}, time = '', fallbackParent = null) {
    const map = this.ensure(state, state.playerProfile || {});
    const name = this.cleanName(item.name || item.locationName);
    if (!name) return null;
    if (this.isInteriorLocationName(name)) {
      const anchor = fallbackParent || this.resolveExteriorAnchorNode(map, this.currentNode(map));
      if (anchor) this.addInteriorZone(anchor, item);
      return anchor;
    }
    const parentName = this.cleanName(item.parentName || item.parentLocationName || item.parentLocation || '');
    const parent = parentName ? this.upsertNode(map, { name: parentName, time }) : fallbackParent;
    const facts = item.descriptionFacts || item.facts || item.fact || item.description || item.summary || `${name}，电子地图记录的地点。`;
    const node = this.upsertNode(map, { name, parentId: parent?.id || '', description: Array.isArray(facts) ? '' : facts, descriptionFacts: facts, time });
    if (node) node.mapVisible = this.isMapExteriorNode(name) || this.isCommunityLevelNode(name);
    if (parent && this.isMapDisplayNode(parent, map)) map.expanded[parent.id] = true;
    map.lastText = this.render(map);
    return node;
  },

  addLinkNode(map, link, time = '') {
    const from = this.cleanName(link?.from);
    const to = this.cleanName(link?.to);
    if (!from || !to || from === to) return;
    const parent = this.upsertNode(map, { name: from, time });
    this.upsertNode(map, { name: to, parentId: parent.id, description: link?.description || `${to}，可由${from}抵达。`, time, onlyIfNew: true });
    map.expanded[parent.id] = true;
  },

  upsertNode(map, data = {}) {
    const name = this.cleanName(data.name);
    if (!name || this.isAbstractName(name)) return null;
    const id = data.id || this.nodeId(name);
    let node = map.nodes.find((item) => item.id === id || item.name === name);
    if (!node) {
      node = this.makeNode(name, data.parentId || '', data.description || `${name}，现实推演记录到的地点。`, data.time);
      if (!node) return null;
      map.nodes.push(node);
    }
    if (data.parentId !== undefined && data.parentId !== node.id) node.parentId = data.parentId;
    if (this.isInteriorLocationName(name)) node.mapVisible = false;
    else if (data.mapVisible === false) node.mapVisible = false;
    else if (this.isMapExteriorNode(name) || this.isCommunityLevelNode(name)) node.mapVisible = true;
    this.syncFacts(node, data.description || node.description, data.time);
    const facts = window.GameModules.realWorldMapFacts;
    if (data.descriptionFacts) node.descriptionFacts = facts?.normalizeFacts?.({ descriptionFacts: data.descriptionFacts }, '', data.time) || node.descriptionFacts;
    if (data.appendFact && data.description) facts?.addFact?.(node, data.description, data.time);
    if (!data.onlyIfNew && data.description && !node.descriptionFacts?.length) facts?.addFact?.(node, data.description, data.time);
    this.syncFacts(node, data.description || node.description, data.time);
    window.GameModules.orgTerritory?.normalizeNodeControl?.(node, map, map._boundStore || null);
    this.trimMapNodes(map, map._boundStore || null);
    return node;
  },

  currentNode(map) { return map.nodes.find((node) => node.id === map.currentId) || map.nodes.find((node) => node.name === map.current) || map.nodes[0]; },
  childrenOf(map, parentId = '') { return (map.nodes || []).filter((node) => (node.parentId || '') === (parentId || '')).sort((a, b) => (a.order || 0) - (b.order || 0)); },

  visibleNodes(map) {
    const rows = [];
    const walk = (parentId, depth) => {
      this.childrenOf(map, parentId).forEach((node) => {
        rows.push({ ...node, depth, hasChildren: this.childrenOf(map, node.id).length > 0, current: node.id === map.currentId });
        if (map.expanded?.[node.id]) walk(node.id, depth + 1);
      });
    };
    walk('', 0);
    return rows;
  },

  toggle(state, id) { const map = this.ensure(state, state.playerProfile || {}); map.expanded[id] = !map.expanded[id]; },
  showInfo(state, id) { const map = this.ensure(state, state.playerProfile || {}); map.infoNodeId = id; map.interiorNodeId = ''; },
  showInterior(state, id) {
    const map = this.ensure(state, state.playerProfile || {});
    map.interiorNodeId = id;
    map.interiorRoomId = '';
    map.infoNodeId = '';
    map.interiorFloorOpen = map.interiorFloorOpen && typeof map.interiorFloorOpen === 'object' ? map.interiorFloorOpen : {};
    const node = (map.nodes || []).find((item) => item.id === id);
    if (node) {
      const floors = window.GameModules.realWorldMapInterior?.ensureFloors?.(node, state) || [];
      floors.forEach((floor) => {
        if (map.interiorFloorOpen[floor.id] === undefined) map.interiorFloorOpen[floor.id] = false;
      });
    }
  },
  closeInfo(state) { if (state.realWorldMap) state.realWorldMap.infoNodeId = ''; },
  closeInterior(state) { if (state.realWorldMap) { state.realWorldMap.interiorNodeId = ''; state.realWorldMap.interiorRoomId = ''; } },
  interiorNode(map) { return (map?.nodes || []).find((node) => node.id === map.interiorNodeId) || null; },
  infoNode(map) { return (map?.nodes || []).find((node) => node.id === map.infoNodeId) || null; },
  render(map) {
    return this.mapDisplayRender(map || {});
  },
};


;// ---- real-world-map-geopolitical.js ----
/**
 * 从玩家地址 deterministic 生成政区 map 父链 + 对应 org stub（L1，无 structure）。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldMapGeopolitical = {
  slug(name = '') {
    return String(name || '').replace(/[^\w\u4e00-\u9fa5]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 48) || 'region';
  },

  parseAdminChain(profile = {}) {
    const address = [profile.refinedCity, profile.city, profile.homeLocation, profile.locationName]
      .map((x) => String(x || '').trim()).find((x) => x.length >= 4) || '';
    const home = window.GameModules.realWorldMap?.inferHomeName?.(profile) || '';
    const combined = `${address}${home}`.replace(/\s+/g, '');
    if (!combined) return [];

    const parts = [];
    let rest = combined;
    const directCities = ['北京市', '上海市', '天津市', '重庆市'];
    let province = directCities.find((dc) => combined.includes(dc)) || '';
    if (province) {
      parts.push({ level: '省级', name: province, kind: 'admin' });
      rest = combined.slice(combined.indexOf(province) + province.length);
    } else {
      const pm = combined.match(/([\u4e00-\u9fa5]{2,10}(?:省|自治区|特别行政区))/);
      if (pm) {
        province = pm[1];
        parts.push({ level: '省级', name: province, kind: 'admin' });
        rest = combined.slice(combined.indexOf(province) + province.length);
      }
    }

    if (!directCities.includes(province)) {
      const cm = rest.match(/([\u4e00-\u9fa5]{2,10}(?:市|州|盟|地区))/);
      if (cm) {
        parts.push({ level: '市级', name: cm[1], kind: 'admin' });
        rest = rest.slice(rest.indexOf(cm[1]) + cm[1].length);
      }
    }

    const dm = rest.match(/([\u4e00-\u9fa5]{2,10}(?:区|县|旗))/);
    if (dm) {
      parts.push({ level: '区县级', name: dm[1], kind: 'admin' });
      rest = rest.slice(rest.indexOf(dm[1]) + dm[1].length);
    }

    const sm = rest.match(/([\u4e00-\u9fa5]{2,12}(?:街道|镇|乡))/);
    if (sm) parts.push({ level: '街道级', name: sm[1], kind: 'admin' });

    const communitySource = home || combined;
    const comm = communitySource.match(/([\u4e00-\u9fa5]{2,14}(?:小区|社区|花园|苑|公寓|里))/);
    if (comm) parts.push({ level: '社区级', name: comm[1], kind: 'community' });

    const seen = new Set();
    return parts.filter((item) => {
      const key = item.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  ensure(store, map, profile = {}) {
    if (!store || !map) return map;
    if (!store.factionState) return map;
    const mapMod = window.GameModules.realWorldMap;
    const otActions = window.GameModules.orgTerritoryActions;
    const chain = this.parseAdminChain(profile);
    if (!chain.length) return map;

    let parentNodeId = '';
    let lastAdminOrgId = '';
    let communityOrgId = '';
    let communityNodeId = '';

    chain.forEach((item) => {
      const node = mapMod.upsertNode(map, {
        name: item.name,
        parentId: parentNodeId,
        description: `${item.name}（政区 stub，接触后细化）`,
        mapVisible: item.kind === 'community',
        onlyIfNew: true,
      });
      if (!node) return;
      node.geopoliticalStub = true;
      if (item.kind !== 'community') node.mapVisible = false;
      parentNodeId = node.id;

      const org = otActions?.ensureAdminOrgStub?.(store, item, lastAdminOrgId);
      if (org?.id) {
        if (item.kind === 'community') {
          communityOrgId = org.id;
          communityNodeId = node.id;
          org.territoryAnchors = [node.id, ...(org.territoryAnchors || [])].filter((v, i, a) => a.indexOf(v) === i).slice(0, 8);
        } else {
          lastAdminOrgId = org.id;
        }
      }
    });

    const homeName = mapMod.inferHomeName?.(profile);
    if (homeName) {
      const homeNode = window.GameModules.orgTerritory?.findMapNode?.(map, homeName)
        || map.nodes.find((n) => n.name === homeName || homeName.includes(n.name) || n.name.includes(homeName));
      if (homeNode && parentNodeId && !homeNode.parentId) homeNode.parentId = parentNodeId;
      if (communityOrgId) otActions?.linkFamilyToCommunity?.(store, communityOrgId);
    }

    if (communityOrgId && communityNodeId) {
      otActions?.linkFamilyToCommunity?.(store, communityOrgId);
    }

    window.GameModules.orgTerritory?.ensureMapControls?.(map, store);
    return map;
  },
};


;// ---- real-world-map-fog.js ----
/**

 * 电子地图迷雾：已访问建筑物 + 其一圈邻域可见；首次抵达且无同级邻点时 AI 解锁周围。

 * 地图最小颗粒度 = 建筑物；走廊/房间/楼梯间只在 interiorLayout 中展示。

 */

window.GameModules = window.GameModules || {};



window.GameModules.realWorldMapFog = {

  mapApi() {

    return window.GameModules.realWorldMap;

  },



  normalizeNodeFlags(node = {}) {

    if (!node) return node;

    if (typeof node.visited !== 'boolean') node.visited = false;

    if (typeof node.revealed !== 'boolean') node.revealed = false;

    if (typeof node.mapVisible !== 'boolean') node.mapVisible = !this.mapApi().isInteriorLocationName(node.name);

    if (typeof node.exteriorRingUnlocked !== 'boolean') node.exteriorRingUnlocked = false;

    if (!node.interiorLayout || typeof node.interiorLayout !== 'object') {

      node.interiorLayout = { summary: '', zones: [] };

    }

    if (!Array.isArray(node.interiorLayout.zones)) node.interiorLayout.zones = [];

    return node;

  },



  resolveAnchor(map, node) {

    return this.mapApi().resolveExteriorAnchorNode(map, node) || node;

  },



  exteriorSiblings(map, node) {

    if (!node?.parentId) {

      return (map.nodes || []).filter((item) => item.id !== node.id && !item.parentId && this.mapApi().isMapDisplayNode(item, map));

    }

    return this.mapApi().childrenOf(map, node.parentId).filter((item) => item.id !== node.id && this.mapApi().isMapDisplayNode(item, map));

  },



  oneRingNeighborIds(map, nodeId) {

    const mapMod = this.mapApi();

    const node = (map.nodes || []).find((item) => item.id === nodeId);

    if (!node) return [];

    const anchor = this.resolveAnchor(map, node);

    const ids = new Set([anchor.id]);

    if (anchor.parentId) ids.add(anchor.parentId);

    this.exteriorSiblings(map, anchor).forEach((sib) => ids.add(sib.id));

    const parent = (map.nodes || []).find((item) => item.id === anchor.parentId);

    if (parent) this.exteriorSiblings(map, parent).forEach((sib) => ids.add(sib.id));

    return [...ids].filter((id) => {

      const item = (map.nodes || []).find((nodeItem) => nodeItem.id === id);

      return item && mapMod.isMapDisplayNode(item, map);

    });

  },



  syncRevealed(map) {

    const mapMod = this.mapApi();

    const revealed = new Set();

    (map.nodes || []).forEach((node) => {

      this.normalizeNodeFlags(node);

      if (!mapMod.isMapDisplayNode(node, map)) return;

      if (node.visited) {

        revealed.add(node.id);

        this.oneRingNeighborIds(map, node.id).forEach((id) => revealed.add(id));

      }

    });

    (map.nodes || []).forEach((node) => {

      const anchor = this.resolveAnchor(map, node);

      if (node.visited && mapMod.isMapDisplayNode(anchor, map)) revealed.add(anchor.id);

      node.revealed = revealed.has(node.id);

    });

    map.revealedIds = [...revealed];

    return map;

  },



  markVisited(map, nodeId) {

    const mapMod = this.mapApi();

    const node = (map.nodes || []).find((item) => item.id === nodeId);

    if (!node) return { node: null, firstVisit: false, anchor: null };

    this.normalizeNodeFlags(node);

    const anchor = this.resolveAnchor(map, node);

    const firstVisit = !anchor.visited;

    node.visited = true;

    node.revealed = true;

    if (anchor.id !== node.id) {

      anchor.visited = true;

      anchor.revealed = true;

    }

    map.mapAnchorId = anchor.id;

    this.syncRevealed(map);

    return { node, anchor, firstVisit };

  },



  visibleNodes(map) {

    this.syncRevealed(map);

    const mapMod = this.mapApi();

    return (map.nodes || []).filter((node) => node.revealed && mapMod.isMapDisplayNode(node, map));

  },



  shouldUnlockSurroundings(map, anchor) {

    if (!anchor?.visited) return false;

    if (anchor.exteriorRingUnlocked) return false;

    if (this.exteriorSiblings(map, anchor).length > 0) return false;

    return true;

  },



  bootstrapHome(map) {

    if (!map) return map;

    const mapMod = this.mapApi();

    mapMod.compactInteriorNodes(map);

    (map.nodes || []).forEach((node) => this.normalizeNodeFlags(node));

    const scene = mapMod.currentNode(map) || map.nodes[0];

    const home = scene ? this.resolveAnchor(map, scene) : null;

    if (home && !map.nodes.some((node) => mapMod.isMapDisplayNode(node, map) && node.visited)) {

      home.visited = true;

      map.mapAnchorId = home.id;

      this.syncRevealed(map);

    }

    return map;

  },



  async afterLocationUpdate(state, result = {}) {

    const mapMod = this.mapApi();

    const map = mapMod.ensure(state, state.playerProfile || {});

    const node = mapMod.currentNode(map);

    if (!node) return { unlocked: [], interior: null };



    const { firstVisit, anchor } = this.markVisited(map, node.id);
    if (firstVisit && anchor) window.GameModules.orgTerritory?.bumpOrgExposureOnMapVisit?.(state, map, anchor);
    const needUnlock = firstVisit || this.shouldUnlockSurroundings(map, anchor);

    if (!needUnlock) {
      window.GameModules.orgTerritory?.ensureMapControls?.(map, state);
      return { unlocked: [], interior: anchor?.interiorLayout || null };
    }



    try {

      const payload = await this.generateSurroundUnlock(state, map, node, anchor, result);

      const unlocked = this.applySurroundUnlock(state, map, anchor, node, payload);

      this.syncRevealed(map);

      window.GameModules.orgTerritory?.ensureMapControls?.(map, state);

      map.lastText = mapMod.render(map);

      return { unlocked, interior: anchor.interiorLayout || null };

    } catch (err) {

      console.warn('电子地图周围解锁失败:', err.message);

      return { unlocked: [], interior: anchor?.interiorLayout || null };

    }

  },



  async generateSurroundUnlock(state, map, sceneNode, anchor, result = {}) {

    const parent = (map.nodes || []).find((item) => item.id === anchor.parentId);

    const sceneName = sceneNode?.name || '';

    const anchorName = anchor?.name || sceneName;

    const indoor = sceneName && sceneName !== anchorName ? sceneName : '无';

    const prompt = await window.GameModules.renderPrompt('real-world-map-surround-unlock', {

      手机时间: `${state.phoneDateText?.() || ''} ${state.phoneTimeText?.() || ''}`.trim(),

      地图锚点: anchorName,

      玩家所在室内: indoor,

      当前地点: anchorName,

      上级地点: parent?.name || '无',

      现实地图: map.lastText || this.mapApi().render(map),

      地点说明: this.locationFactsText(map),

      本轮正文: String(result.narration || '').slice(0, 1200),

      玩家行动: String(state.realWorldInput || result.actionText || '').slice(0, 200),

      布局模板目录: window.GameModules.realWorldMapInteriorTemplates?.catalogText?.() || '无',

    });

    return window.GameModules.jsonUtils.generateJsonWithRetry({

      source: 'real-world-map-surround-unlock',

      promptId: 'real-world-map-surround-unlock',

      model: state.modelId,

      timeoutMs: 60000,

      prompt,

      format: prompt,

      max: 2,

      parse: (text) => window.GameModules.jsonUtils.parseLoose(text),

      validate: (raw) => this.validateUnlockPayload(raw, anchor, map),

    });

  },



  locationFactsText(map) {

    const mapMod = this.mapApi();

    return (map.nodes || []).filter((node) => node.revealed && mapMod.isMapDisplayNode(node, map)).map((node) => {

      const facts = (node.descriptionFacts || []).map((fact, index) => window.GameModules.realWorldMapFacts.formatFact(fact, index)).join('');

      return `${node.name}：${facts || node.description || '暂无说明'}`;

    }).join('\n') || '暂无地点说明。';

  },



  validateUnlockPayload(raw = {}, anchor = {}, map = {}) {

    const interiorLayout = this.normalizeInterior(raw.interiorLayout, anchor.name);

    const surroundLocations = (Array.isArray(raw.surroundLocations) ? raw.surroundLocations : [])

      .slice(0, 6)

      .map((item) => this.validateSurroundLocation(item, anchor, map));

    if (!surroundLocations.length) throw new Error('surroundLocations 为空');

    return { interiorLayout, surroundLocations };

  },



  normalizeInterior(value = {}, nodeName = '') {

    const summary = String(value.summary || value.overview || `${nodeName}的内部空间分布。`).slice(0, 160);

    const interiorMod = window.GameModules.realWorldMapInterior;

    const floors = this.normalizeInteriorFloors(value.floors || []);

    const zones = (Array.isArray(value.zones) ? value.zones : [])

      .slice(0, 12)

      .map((zone, index) => ({

        id: String(zone.id || `zone_${index + 1}`),

        name: String(zone.name || `区域${index + 1}`).slice(0, 16),

        kind: String(zone.kind || zone.type || '空间').slice(0, 12),

        position: this.normalizeZonePosition(zone.position || zone.pos || zone.direction),

        description: String(zone.description || zone.detail || '').slice(0, 80),

      }))

      .filter((zone) => zone.name && zone.description);

    if (!floors.length && !zones.length) throw new Error('interiorLayout 需包含 floors 或 zones');

    if (!zones.length) {

      zones.push({ id: 'zone_corridor', name: '走廊', kind: '走廊', position: '中', description: '连接各户与楼梯间。' });

    }

    return { summary, zones, floors };

  },

  normalizeInteriorFloors(floorsRaw = []) {

    const interiorMod = window.GameModules.realWorldMapInterior;

    const tpl = window.GameModules.realWorldMapInteriorTemplates;

    return (Array.isArray(floorsRaw) ? floorsRaw : []).slice(0, 8).map((floor, floorIndex) => {

      const rooms = (Array.isArray(floor.rooms) ? floor.rooms : []).slice(0, 12).map((room, roomIndex) => {

        const number = String(room.number || room.name || '').trim();

        const residents = interiorMod?.sanitizeResidents?.(room.residents || room.occupants) || [];

        let layoutTemplateId = String(room.layoutTemplateId || room.templateId || '').trim();

        if (layoutTemplateId && !tpl?.isValidId?.(layoutTemplateId)) layoutTemplateId = tpl.suggestTemplateId(residents.length);

        if (!layoutTemplateId && residents.length) layoutTemplateId = tpl?.suggestTemplateId?.(residents.length) || '';

        const slotAssignments = room.slotAssignments && typeof room.slotAssignments === 'object' ? room.slotAssignments : {};

        const mergedAssignments = {

          ...(tpl?.autoSlotAssignments?.(layoutTemplateId, residents) || {}),

          ...slotAssignments,

        };

        const layout = layoutTemplateId

          ? interiorMod?.buildLayoutFromTemplate?.(layoutTemplateId, { residents, slotAssignments: mergedAssignments })

          : null;

        return {

          id: String(room.id || `room_${number || roomIndex + 1}`),

          number,

          name: String(room.name || number).slice(0, 16),

          residents,

          layoutTemplateId,

          slotAssignments: mergedAssignments,

          layout,

        };

      }).filter((room) => room.number || room.residents?.length);

      return {

        id: String(floor.id || `floor_${floorIndex + 1}`),

        name: String(floor.name || floor.label || `第${floorIndex + 1}楼`).slice(0, 12),

        rooms,

      };

    }).filter((floor) => floor.rooms.length);

  },



  normalizeZonePosition(value = '') {

    const text = String(value || '中').trim();

    if (/北/u.test(text)) return '北';

    if (/南/u.test(text)) return '南';

    if (/东/u.test(text)) return '东';

    if (/西/u.test(text)) return '西';

    return '中';

  },



  validateSurroundLocation(raw = {}, anchor = {}, map = {}) {

    const mapMod = this.mapApi();

    const name = mapMod.cleanName(raw.name || raw.locationName);

    if (!name || mapMod.isAbstractName(name)) throw new Error('周围地点名无效');

    if (mapMod.isInteriorLocationName(name)) throw new Error(`周围地点不能是室内场景：${name}`);

    if (!mapMod.isMapExteriorNode(name) && !mapMod.isCommunityLevelNode(name)) {

      throw new Error(`周围地点必须是建筑物或小区级 POI：${name}`);

    }

    const parentNode = (map.nodes || []).find((item) => item.id === anchor.parentId);

    const parentFallback = parentNode?.name || anchor.name;

    const parentName = mapMod.cleanName(raw.parentName || raw.parentLocationName || parentFallback);

    const facts = Array.isArray(raw.descriptionFacts)

      ? raw.descriptionFacts.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 2)

      : [String(raw.description || `${name}，与${anchor.name}相邻的可前往地点。`).slice(0, 80)];

    return { name, parentName, descriptionFacts: facts, granularity: 'building' };

  },



  applySurroundUnlock(state, map, anchor, sceneNode, payload = {}) {

    const mapMod = this.mapApi();

    const time = mapMod.factTime(state);

    if (payload.interiorLayout) {

      anchor.interiorLayout = payload.interiorLayout;

      if (sceneNode && sceneNode.id !== anchor.id && mapMod.isInteriorLocationName(sceneNode.name)) {

        mapMod.addInteriorZone(anchor, { name: sceneNode.name, description: sceneNode.description });

      }

    }

    anchor.exteriorRingUnlocked = true;

    const unlocked = [];

    (payload.surroundLocations || []).forEach((item) => {

      const parent = item.parentName

        ? mapMod.upsertNode(map, { name: item.parentName, time, onlyIfNew: true })

        : null;

      const parentId = parent?.id || anchor.parentId || '';

      const created = mapMod.upsertNode(map, {

        name: item.name,

        parentId,

        descriptionFacts: item.descriptionFacts,

        time,

        onlyIfNew: true,

      });

      if (created) {

        this.normalizeNodeFlags(created);

        created.mapVisible = true;

        created.revealed = true;

        created.visited = false;

        unlocked.push(created.name);

      }

    });

    map.mapAnchorId = anchor.id;

    this.syncRevealed(map);

    window.GameModules.orgTerritory?.ensureMapControls?.(map, state);

    return unlocked;

  },

};



;// ---- real-world-map-graph.js ----
/**
 * 电子地图网状布局：根据 parentId 树生成节点坐标与连线。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldMapGraph = {
  NODE_H: 48,
  GAP_X: 28,
  GAP_Y: 84,
  PADDING: 56,

  nodeWidth(name = '') {
    const len = String(name || '').length;
    return Math.min(260, Math.max(108, len * 12 + 36));
  },

  build(map = {}) {
    const fog = window.GameModules.realWorldMapFog;
    const rawNodes = fog?.visibleNodes?.(map) || (Array.isArray(map.nodes) ? map.nodes : []);
    if (!rawNodes.length) {
      return { nodes: [], edges: [], width: 360, height: 280, centerX: 180, centerY: 140 };
    }

    const byId = new Map(rawNodes.map((node) => [node.id, node]));
    const childrenOf = (parentId = '') => rawNodes
      .filter((node) => (node.parentId || '') === (parentId || ''))
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    const roots = rawNodes.filter((node) => {
      const parentId = node.parentId || '';
      return !parentId || !byId.has(parentId);
    });

    const positions = {};
    let leafCursor = 0;

    const place = (node, depth) => {
      const kids = childrenOf(node.id);
      const w = this.nodeWidth(node.name);
      let x;
      if (!kids.length) {
        x = leafCursor;
        leafCursor += w + this.GAP_X;
      } else {
        kids.forEach((child) => place(child, depth + 1));
        const boxes = kids.map((child) => positions[child.id]).filter(Boolean);
        const minX = Math.min(...boxes.map((box) => box.x));
        const maxX = Math.max(...boxes.map((box) => box.x + box.w));
        x = (minX + maxX - w) / 2;
      }
      const y = this.PADDING + depth * (this.NODE_H + this.GAP_Y);
      positions[node.id] = { x, y, w, h: this.NODE_H, cx: x + w / 2, cy: y + this.NODE_H / 2 };
    };

    roots.forEach((root) => place(root, 0));

    const edges = [];
    rawNodes.forEach((node) => {
      if (node.parentId && byId.has(node.parentId)) {
        edges.push({ from: node.parentId, to: node.id });
      }
    });

    const layoutNodes = rawNodes
      .filter((node) => positions[node.id])
      .map((node) => {
        const box = positions[node.id];
        return {
          id: node.id,
          name: node.name,
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
          cx: box.cx,
          cy: box.cy,
          current: node.id === (map.mapAnchorId || map.currentId),
          visited: Boolean(node.visited),
          revealed: Boolean(node.revealed),
        };
      });

    let maxX = this.PADDING;
    let maxY = this.PADDING;
    layoutNodes.forEach((node) => {
      maxX = Math.max(maxX, node.x + node.w + this.PADDING);
      maxY = Math.max(maxY, node.y + node.h + this.PADDING);
    });

    const width = Math.max(360, maxX);
    const height = Math.max(280, maxY);
    const edgeLines = edges.map((edge) => {
      const from = positions[edge.from];
      const to = positions[edge.to];
      if (!from || !to) return null;
      return {
        id: `${edge.from}-${edge.to}`,
        x1: from.cx,
        y1: from.y + from.h,
        x2: to.cx,
        y2: to.y,
      };
    }).filter(Boolean);

    return {
      nodes: layoutNodes,
      edges: edgeLines,
      width,
      height,
      centerX: width / 2,
      centerY: height / 2,
    };
  },
};


;// ---- real-world-map-interior-templates.js ----
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


;// ---- real-world-map-interior.js ----
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


;// ---- inference/agent-context-core.js ----
window.GameModules = window.GameModules || {};
window.GameModules.realWorldAgentContextParts = window.GameModules.realWorldAgentContextParts || {};

window.GameModules.realWorldAgentContextParts.core = {
  limit(text, max = 1200) {
    return String(text || '').trim().slice(0, max);
  },


  recentLog(store, limit = 3) {
    const rows = (store.realWorldLog || []).filter((entry) => entry.type !== 'system').slice(-limit);
    return rows.map((entry) => entry.type === 'user'
      ? `玩家行动：${entry.text}`
      : `地点：${entry.locationName || store.realWorldLocationName || '未知'}｜结果：${this.limit(entry.narration || entry.text || '', 260)}`).join('\n') || '暂无现实世界推演记录。';
  },


  worldlineRecordText(event = {}) {
    return [
      `记录编号：${event.eventId || event.id || '未知记录'}`,
      `时间：${event.time || '未知'}`,
      `标题：${event.name || '现实事件'}`,
      `情节：${event.plotId || event.summary || '未归纳'}`,
      `状态：${event.status || '已记录'}`,
      `详细：${String(event.detail || '').trim()}`,
    ].filter(Boolean).join('\n');
  },


  recentWorldlineRecords(store, targetChars = 5000, maxChars = 6000) {
    const line = store.realWorldline?.() || {};
    const events = (line.events || []).filter((event) => String(event.detail || '').trim());
    const picked = [];
    let total = 0;
    const separator = '\n\n---\n\n';
    for (const event of events.slice().reverse()) {
      const text = this.worldlineRecordText(event);
      const nextTotal = total + text.length + (picked.length ? separator.length : 0);
      if (nextTotal > maxChars) break;
      picked.push(text);
      total = nextTotal;
      if (total >= targetChars) break;
    }
    return picked.length ? picked.reverse().join(separator) : '暂无符合长度上限的最近世界线记录。';
  },


  buildLoadedText(items = []) {
    if (!items.length) return '本轮尚未动态载入额外资料。';
    return items.map((item, index) => `### 资料${index + 1}｜${item.title}\n${this.limit(item.text, item.max || 1600)}`).join('\n\n');
  },


  recentWorldline(store, limit = 800, separator = '\n') {
    return this.recentWorldlineRecords(store, limit, limit).split(/\n\n---\n\n/u).join(separator);
  },

  systemRecordLine(record = {}) {
    return [
      `类型：${record.key || '记录'}`,
      record.at ? `时间：${record.at}` : '',
      `内容：${String(record.value || '').trim()}`,
      record.reason ? `原因：${String(record.reason || '').trim()}` : '',
    ].filter(Boolean).join('｜');
  },

  recentSystemRecords(store, limit = 8, maxChars = 1200) {
    const rows = [
      ...(Array.isArray(store?.realWorldSystemRecords) ? store.realWorldSystemRecords : []),
      ...(window.GameModules.updateRegistry?.legacySystemRecords?.(store) || []),
    ].filter((item) => String(item?.value || '').trim());
    const picked = [];
    let total = 0;
    for (const record of rows.slice(-limit).reverse()) {
      const line = this.systemRecordLine(record);
      const nextTotal = total + line.length + (picked.length ? 1 : 0);
      if (nextTotal > maxChars) break;
      picked.push(line);
      total = nextTotal;
    }
    return picked.length ? picked.reverse().join('\n') : '暂无系统级补充记录。';
  },


  recentSummary(store, count = 4) {
    return this.recentLog(store, count);
  },


  recentCompletedLogEntries(store, excludeLogId = null, limit = 4) {
    let rows = (store?.realWorldLog || [])
      .filter((entry) => entry.type !== 'system' && !entry.streaming && entry.id !== excludeLogId);
    if (rows.length && rows[rows.length - 1]?.type === 'user') rows = rows.slice(0, -1);
    return rows.slice(-Math.max(1, limit));
  },


  recentContinuityLogText(store, excludeLogId = null, limit = 4) {
    const rows = this.recentCompletedLogEntries(store, excludeLogId, limit);
    if (!rows.length) return '暂无上一轮推演记录。';
    return rows.map((entry) => entry.type === 'user'
      ? `玩家行动：${entry.text}`
      : `地点：${entry.locationName || store?.realWorldLocationName || '未知'}｜结果：${this.limit(entry.narration || entry.text || '', 260)}`).join('\n');
  },


  lastRoundStage1GuidanceFromStore(store, excludeLogId = null) {
    const aiEntries = (store?.realWorldLog || [])
      .filter((entry) => entry.type === 'ai' && !entry.streaming && entry.id !== excludeLogId && Array.isArray(entry.agentTrace) && entry.agentTrace.length);
    const last = aiEntries[aiEntries.length - 1];
    if (!last) return null;
    const trace = last.agentTrace;
    return [...trace].reverse().find((item) => item?.type === 'context_done') || trace[trace.length - 1] || null;
  },


  stage1GuidanceSummary(guidance = null) {
    if (!guidance) return '无';
    const names = (group = [], reasonLabel = '理由') => (Array.isArray(group) ? group : []).map((item) => {
      const name = typeof item === 'string' ? item : (item.name || item.idOrName || item.id || item.characterName);
      const reason = typeof item === 'object' && item ? item.reason : '';
      return `${name}${reason ? `（${reasonLabel}：${reason}）` : ''}`;
    }).join('、') || '无';
    const random = (Array.isArray(guidance.randomActiveEvents) ? guidance.randomActiveEvents : [])
      .map((item) => `${item.characterName || item.name}：${item.eventType || item.actionMethod || '背景行动'}｜${item.motivation || item.reason || ''}`)
      .join('；') || '无';
    const queryReasons = (label, key) => {
      const items = [...new Set(Array.isArray(guidance.sceneQueries?.[key]) ? guidance.sceneQueries[key] : [])];
      return items.length ? items.map((item, index) => `${label}${index + 1}：${item}`).join('\n') : `${label}1：无`;
    };
    return [
      `资料状态：${guidance.type === 'context_done' ? '资料已足够' : '继续请求资料'}`,
      queryReasons('地点查询理由', 'location'),
      queryReasons('因果查询理由', 'causality'),
      queryReasons('冲突查询理由', 'conflict'),
      `强制出场：${names(guidance.forcedParticipants, '出场理由')}`,
      `高优先候选：${names(guidance.priorityCandidates, '候选理由')}`,
      `戏剧候选：${names(guidance.dramaCandidates, '候选理由')}`,
      `禁止出场：${names(guidance.forbiddenParticipants, '不在场理由')}`,
      `随机主动事件：${random}`,
      `随机事件闯入条件：${guidance.randomIntrusionCondition || '无明确条件则禁止闯入'}`,
    ].join('\n');
  },


  redactPromptPollution(text = '') {
    const banned = [
      /时间规则：所有现实时间都以桌面时间为准[^\n]*/gu,
      /本次 final 必须返回[^\n]*/giu,
      /final\.wechatActions[^\n]*/giu,
      /elapsedSeconds[^\n]*/giu,
      /subject\.id[^\n]*/giu,
      /主体ID规则：[\s\S]*?(?=\n[^\n：]{1,16}：|$)/gu,
      /Skill：[^\n]*/gu,
      /激活条件：[^\n]*/gu,
      /返回格式：[^\n]*/gu,
      /结算对象[^\n]*/gu,
      /类型完成[^\n]*/gu,
      /更新N[^\n]*/gu,
      /正文必须[^\n]*/gu,
      /场景锚定报告[^\n]*/gu,
      /需严格跟着世界线续写[^\n]*/gu,
      /生日[^\n]*/gu,
      /具体地址：[^\n]*/gu,
      /财富[^\n]*/gu,
      /固定收入：[^\n]*/gu,
      /性经验次数：[^\n]*/gu,
      /父母去世原因：[^\n]*/gu,
      /世界观补全：暂无[^\n]*/gu,
      /势力资料库：[\s\S]*?暂无[^\n]*(?=\n|$)/gu,
      /全部情绪值：[^\n]*/gu,
      /全部对玩家感觉值：[^\n]*/gu,
      /全部穿着槽：[^\n]*/gu,
      /全部物品：[^\n]*/gu,
      /全部技能：[^\n]*/gu,
      /全部核心属性数值：[^\n]*/gu,
      /全部身体状态细项：[^\n]*/gu,
    ];
    const promptLeakLine = (line = '') => /final|role[- ]?card|RPG/iu.test(line)
      && /位置|地点|房间|门口|走廊|客厅|空间|相邻|在场|附近|路过|进入|听见|看见|通信|微信|当前行动|当前状态|状态|标题|场景/u.test(line);
    return banned.reduce((out, pattern) => out.replace(pattern, ''), String(text || ''))
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !promptLeakLine(line))
      .join('\n');
  },


  sanitizeLoadedTitle(title = '', index = 0) {
    const cleaned = this.redactPromptPollution(title || '').trim();
    const methodLike = /(^|[^\p{Script=Han}])(?:[a-z][\w-]*\.)+(?:[a-z][\w-]*)(?=$|[^\p{Script=Han}])/iu;
    const skillWords = /\b(?:skill|query|method)\b/iu;
    return cleaned && !methodLike.test(cleaned) && !skillWords.test(cleaned) ? cleaned : `资料${index + 1}`;
  },


  isRoleCardMaterial(item = {}) {
    const title = String(item?.title || '');
    const text = String(item?.text || '');
    return /角色卡|character\.query|searchCharacterProfile/u.test(title) || /资料类型：完整角色卡/u.test(text);
  },


  loadedRoleCardRoutingSummary(item = {}) {
    const text = this.redactPromptPollution(item?.text || '');
    const keepKeys = /^(资料类型|姓名|角色ID|世界|身份|性别|年龄\/生日|职业|当前地点|人际关系|外貌|性格|喜好|人物说明|社群角色|势力地位|状态标签|核心属性|身体状态|情绪|对玩家感觉|穿着|物品|技能|知识|上线体验|其他身份状态)：/u;
    const lines = text.split(/\r?\n/u).map((line) => line.trim()).filter((line) => keepKeys.test(line));
    return this.limit(lines.join('\n') || text, 1400);
  },


  loadedRoutingSummary(items = []) {
    if (!items.length) return '无';
    return items.map((item, index) => {
      const title = this.sanitizeLoadedTitle(item?.title || '', index);
      const text = this.redactPromptPollution(item?.text || '');
      const summary = this.isRoleCardMaterial(item) ? this.loadedRoleCardRoutingSummary(item) : this.limit(text, 260);
      return `资料${index + 1}：${title}\n${summary}`;
    }).filter(Boolean).join('\n') || '无';
  },


  loadedAnchorSummary(items = []) {
    if (!items.length) return '无';
    const anchorKeywords = /位置|地点|房间|门口|走廊|客厅|空间|相邻|在场|附近|路过|进入|听见|看见|通信|微信|当前行动|当前状态/u;
    const pollutionKeywords = /全部情绪|全部对玩家感觉|全部穿着槽|全部物品|全部技能|全部核心属性数值|全部身体状态细项|性经验次数|财富|生日|父母去世|等级|力量|敏捷|体质|智力|感知|意志|魅力/u;
    const promptLeakLine = (line = '') => /final|role[- ]?card|RPG/iu.test(line) && anchorKeywords.test(line);
    const titlePollutionKeywords = /final|role[- ]?card|RPG|全部情绪|全部对玩家感觉|全部穿着槽|全部物品|全部技能|全部核心属性数值|全部身体状态细项|性经验次数|财富|生日|父母去世|等级|力量|敏捷|体质|智力|感知|意志|魅力/iu;
    const keepLine = (line = '') => anchorKeywords.test(line) && !pollutionKeywords.test(line) && !promptLeakLine(line);
    return items.map((item, index) => {
      const title = titlePollutionKeywords.test(item?.title || '') ? `资料${index + 1}` : this.sanitizeLoadedTitle(item?.title || '', index);
      const lines = this.redactPromptPollution(item?.text || '').split(/\r?\n/u).filter(keepLine).slice(0, 8);
      return lines.length ? `资料${index + 1}：${title}\n${this.limit(lines.join('\n'), 420)}` : '';
    }).filter(Boolean).join('\n') || '无';
  },


  redactNarrationPollution(text = '') {
    const removeBlocks = [
      /时间规则：所有现实时间都以桌面时间为准[^\n]*/gu,
      /本次 final 必须返回[^\n]*/giu,
      /final\.wechatActions[^\n]*/giu,
      /elapsedSeconds[^\n]*/giu,
      /subject\.id[^\n]*/giu,
      /subject\.id 规则[^\n]*/giu,
      /主体ID规则：[\s\S]*?(?=\n[^\n：]{1,16}：|\n## |$)/gu,
      /势力资料库：[\s\S]*?(?:暂无记录|暂无势力资料库记录。?)[^\n]*(?=\n|$)/gu,
      /需严格跟着世界线续写，保证正文对最新世界线连续性。?/gu,
      /文本内容参照material-[^\n]*/giu,
      /参照对象：[^\n]*/gu,
      /来源ID：[^\n]*/gu,
      /关键词查询：[^\n]*/gu,
      /除非玩家提出新的未知地点[^\n]*request_context[^\n]*/gu,
      /不要继续[^\n]*request_context[^\n]*/gu,
      /不要重复[^\n]*(?:资料请求|request_context)[^\n]*/gu,
      /资料请求\d*：[^\n]*/gu,
      /request_context[^\n]*/giu,
      /Skill：[^\n]*/gu,
      /激活条件：[^\n]*/gu,
      /返回格式：[^\n]*/gu,
      /结算对象[^\n]*/gu,
      /类型完成[^\n]*/gu,
      /更新N[^\n]*/gu,
      /结算边界：[^\n]*/gu,
      /暂无记录。?/gu,
      /未填写/gu,
    ];
    const methodLike = /(^|[^\p{Script=Han}])(?:[a-z][\w-]*\.)+(?:[a-z][\w-]*)(?=$|[^\p{Script=Han}])/iu;
    const protocolLine = (line = '') => methodLike.test(line) || /\b(?:skill|query|method|Top3)\b/iu.test(line);
    return removeBlocks.reduce((out, pattern) => out.replace(pattern, ''), String(text || ''))
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !protocolLine(line))
      .join('\n');
  },


  safeNarrationTitle(title = '', index = 0) {
    const cleaned = this.redactNarrationPollution(title || '').trim();
    return cleaned ? this.sanitizeLoadedTitle(cleaned, index) : `资料${index + 1}`;
  },


  loadedNarrationSummary(items = []) {
    if (!items.length) return '无';
    const roleCardFields = /^(?:资料类型|姓名|角色ID|世界|身份|性别|年龄\/生日|职业|当前地点|人际关系|外貌|性格|喜好|人物说明|社群角色|势力地位|状态标签|核心属性|身体状态|情绪|对玩家感觉|穿着|物品|技能|知识|上线体验|其他身份状态)[:：]/u;
    const factKeywords = /位置|地点|房间|门口|走廊|客厅|空间|相邻|在场|附近|路过|进入|离开|等待|回应|听见|看见|可听见|可看见|通信|微信|事实|关系|历史|当前状态|当前行动|状态/u;
    const protocolKeywords = /文本内容参照|参照对象|关键词查询|资料请求|request_context|不要继续|不要重复|Top3|elapsedSeconds|subject\.id|主体ID规则|结算对象|类型完成|更新N|Skill：|激活条件|返回格式/u;
    return items.map((item, index) => {
      const title = this.safeNarrationTitle(item?.title || '', index);
      const text = this.redactNarrationPollution(item?.text || '');
      const isRoleCard = /资料类型[:：](?:完整角色卡|介绍卡)|角色卡/u.test(`${item?.title || ''}\n${text}`);
      const limitLines = isRoleCard ? 24 : 10;
      const limitChars = isRoleCard ? 1800 : 700;
      const lines = text
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line && !/undefined[:：]/iu.test(line) && !protocolKeywords.test(line))
        .filter((line) => (isRoleCard ? roleCardFields.test(line) : factKeywords.test(line)))
        .slice(0, limitLines);
      return lines.length ? `资料${index + 1}：${title}\n${this.limit(lines.join('\n'), limitChars)}` : '';
    }).filter(Boolean).join('\n') || '无';
  },

};


;// ---- inference/material-dedup.js ----
window.GameModules = window.GameModules || {};
window.GameModules.realWorldAgentContextParts = window.GameModules.realWorldAgentContextParts || {};

window.GameModules.realWorldAgentContextParts.materialDedup = {
  materialHash(text = '') {
    let hash = 0;
    String(text || '').split('').forEach((char) => { hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0; });
    return `material-${Math.abs(hash).toString(36)}`;
  },


  materialStableId(item = {}, fallback = '') {
    const text = `${item.id || item.eventId || ''}\n${item.title || ''}\n${item.text || ''}\n${fallback || ''}`;
    const explicit = String(item.eventId || item.id || '').trim()
      || (text.match(/记录编号[:：]\s*([^\n\s]+)/u) || [])[1]
      || (text.match(/"eventId"\s*:\s*"([^"]+)"/u) || [])[1]
      || (text.match(/"id"\s*:\s*"([^"]+)"/u) || [])[1];
    return String(explicit || this.materialHash(text)).trim();
  },


  materialSimilarityText(text = '') {
    return String(text || '')
      .replace(/记录编号[:：][^\n]+/gu, '')
      .replace(/[\s"'“”‘’`.,，。！？!?:：；;、()[\]{}<>《》|｜\-—_+=~～\\/]+/gu, '')
      .slice(0, 1000);
  },


  materialSimilarity(a = '', b = '') {
    const left = this.materialSimilarityText(a);
    const right = this.materialSimilarityText(b);
    if (!left || !right) return 0;
    const leftHead = left.slice(0, Math.min(90, left.length));
    const rightHead = right.slice(0, Math.min(90, right.length));
    if ((leftHead.length > 40 && right.includes(leftHead)) || (rightHead.length > 40 && left.includes(rightHead))) return 1;
    const grams = (text) => {
      const out = new Set();
      for (let i = 0; i < text.length - 1; i += 1) out.add(text.slice(i, i + 2));
      return out;
    };
    const aSet = grams(left), bSet = grams(right);
    if (!aSet.size || !bSet.size) return 0;
    let hit = 0;
    aSet.forEach((gram) => { if (bSet.has(gram)) hit += 1; });
    return hit / Math.min(aSet.size, bSet.size);
  },


  recentWorldlineReferenceEvents(store = null) {
    const line = store?.realWorldline?.() || {};
    const picked = [];
    let total = 0;
    for (const event of (line.events || []).slice().reverse()) {
      const text = `${event.summary || ''}\n${event.detail || ''}\n${JSON.stringify(event)}`;
      const nextTotal = total + text.length;
      if (nextTotal > 6000) break;
      picked.push(event);
      total = nextTotal;
      if (total >= 5000) break;
    }
    return picked;
  },


  materialReferenceCandidates(store = null, loaded = [], current = []) {
    const worldline = this.recentWorldlineReferenceEvents(store).map((event) => ({
      id: this.materialStableId(event),
      label: `${event.name || '世界线记录'}｜${event.time || '未知时间'}`,
      text: `${event.summary || ''}\n${event.detail || ''}\n${JSON.stringify(event)}`,
    }));
    const dynamic = [...loaded, ...current].map((item, index) => ({
      id: this.materialStableId(item, `loaded-${index}`),
      label: item.title || `已载入资料${index + 1}`,
      text: item.text || '',
    }));
    return [...worldline, ...dynamic].filter((item) => item.id && this.materialSimilarityText(item.text).length > 40);
  },


  materialReferenceFor(text = '', refs = []) {
    const id = this.materialStableId({ text });
    return refs.find((ref) => ref.id === id || this.materialSimilarity(text, ref.text) >= 0.82) || null;
  },


  materialReferenceText(ref = null) {
    return ref ? `文本内容参照${ref.id}(唯一id)\n参照对象：${ref.label}` : '';
  },


  normalizeMaterialToken(value = '') {
    return String(value || '').trim().replace(/\s+/g, '');
  },


  normalizeMaterialWorld(value = '') {
    const token = this.normalizeMaterialToken(value || window.GameModules.realWorld2026?.label || '现实世界');
    if (!token || token === '现实世界') return this.normalizeMaterialToken(window.GameModules.realWorld2026?.label || '现实世界');
    return token;
  },


  materialRequestKey(skill = '', method = '', params = {}, materials = window.GameModules.realWorldMaterials) {
    const cleanSkill = String(skill || '').trim();
    const cleanMethod = String(method || '').trim();
    const p = params && typeof params === 'object' ? params : {};
    const world = this.normalizeMaterialWorld(p.world || p.worldTag);
    if (cleanSkill === 'character.query') {
      const name = this.normalizeMaterialToken(p.name || p.characterName || p.characterId || p.target || '');
      if (name && (/searchCharacterProfile|CurrentCharacterStatus/u.test(cleanMethod))) return `${cleanSkill}:characterProfile:${world}:${name}`;
    }
    if (cleanSkill === 'realworld.location.query') {
      const location = this.normalizeMaterialToken(p.locationName || p.name || p.keyword || '');
      if (location && /getLocationDetail|searchLocation/u.test(cleanMethod)) return `${cleanSkill}:location:${world}:${location}`;
      if (cleanMethod === 'getCurrentLocationContext') return `${cleanSkill}:currentLocation:${world || 'default'}`;
    }
    const req = { skill: cleanSkill, method: cleanMethod, params: p };
    return materials?.keyOf?.(req) || `${cleanSkill}:${cleanMethod}:${JSON.stringify(p)}`;
  },

};


;// ---- inference/material-request-catalog.js ----
window.GameModules = window.GameModules || {};
window.GameModules.realWorldAgentContextParts = window.GameModules.realWorldAgentContextParts || {};

window.GameModules.realWorldAgentContextParts.materialRequestCatalog = {
  worldLabel() {
    return window.GameModules.realWorld2026?.label || '2026现代都市现实世界';
  },


  splitChineseRequestLine(line = '') {
    const body = String(line || '').replace(/^资料请求\d+\s*[：:]/u, '').trim();
    return body.split(/[，,、；;]/u).map((part) => part.trim()).filter(Boolean);
  },


  guidedMaterialRequestCatalog(mode = 'real') {
    const world = () => this.worldLabel();
    return [
      { mode: 'both', category: '角色查询', action: '搜索角色卡', skill: 'character.query', method: 'searchCharacterProfile', requiredParams: ['name'], buildParams: (p) => ({ name: p[0] || '', world: p[1] || world() }) },
      { mode: 'both', category: '角色查询', action: '已知角色列表', skill: 'character.query', method: 'listKnownCharacters', requiredParams: [], buildParams: (p) => ({ world: p[0] || world() }) },
      { mode: 'real', category: '地点查询', action: '当前地点上下文', skill: 'realworld.location.query', method: 'getCurrentLocationContext', requiredParams: [], buildParams: (p) => ({ world: p[0] || world() }) },
      { mode: 'real', category: '地点查询', action: '查询附近地点', skill: 'realworld.location.query', method: 'getNearbyLocations', requiredParams: ['locationName'], buildParams: (p) => ({ locationName: p[0] || '', world: p[1] || world() }) },
      { mode: 'real', category: '地点查询', action: '搜索地点', skill: 'realworld.location.query', method: 'searchLocationOne', requiredParams: ['keyword'], buildParams: (p) => ({ keyword: p[0] || '', world: p[1] || world() }) },
      { mode: 'both', category: '世界线查询', action: '按关键词搜索', skill: 'realworld.history.query', method: 'searchWorldlineByKeyword', requiredParams: ['keyword'], buildParams: (p) => ({ keyword: p[0] || '', world: p[1] || world() }) },
      { mode: 'both', category: '世界线查询', action: '按时间搜索', skill: 'realworld.history.query', method: 'searchWorldlineByTime', requiredParams: ['time'], buildParams: (p) => ({ time: p[0] || '', keyword: p[1] || '', world: p[2] || world() }) },
      { mode: 'both', category: '记忆查询', action: '搜索角色记忆窗口', skill: 'memory.query', method: 'searchCharacterMemoryWindow', requiredParams: ['keyword'], buildParams: (p) => ({ characterId: p[0] || '', keyword: p[1] || '' }) },
      { mode: 'real', category: '微信查询', action: '联系人列表', skill: 'wechat.query', method: 'listContacts', requiredParams: [], buildParams: (p) => ({ world: p[0] || world() }) },
      { mode: 'real', category: '微信查询', action: '会话片段', skill: 'wechat.query', method: 'getThread', requiredParams: ['contactId'], buildParams: (p) => ({ contactId: p[0] || '', count: Number(p[1]) || 5 }) },
      { mode: 'real', category: '公司查询', action: '工作上下文', skill: 'company.query', method: 'getWorkContext', requiredParams: [], buildParams: (p) => ({ companyName: p[0] || '' }) },
      { mode: 'real', category: '势力查询', action: '势力列表', skill: 'faction.query', method: 'listFactions', requiredParams: [], buildParams: (p) => ({ world: p[0] || world() }) },
      { mode: 'real', category: '势力查询', action: '搜索势力', skill: 'faction.query', method: 'searchFactionOne', requiredParams: ['keyword'], buildParams: (p) => ({ keyword: p[0] || '' }) },
      { mode: 'real', category: '势力查询', action: '势力档案', skill: 'faction.query', method: 'searchFactionArchive', requiredParams: ['keyword'], buildParams: (p) => ({ keyword: p[0] || '', world: p[1] || world() }) },
      { mode: 'real', category: '势力查询', action: '人事归属', skill: 'faction.query', method: 'listMemberships', requiredParams: [], buildParams: (p) => ({ name: p[0] || '', world: p[1] || world() }) },
      { mode: 'real', category: '势力查询', action: '势力详情', skill: 'faction.query', method: 'getFactionDetail', requiredParams: ['name'], buildParams: (p) => ({ name: p[0] || '', world: p[1] || world() }) },
      { mode: 'real', category: '控势查询', action: '控势摘要', skill: 'faction.query', method: 'resolveTerritoryBrief', requiredParams: [], buildParams: (p) => ({ locationName: p[0] || '', world: p[1] || world() }) },
      { mode: 'real', category: '控势查询', action: '地点控势详情', skill: 'faction.query', method: 'getTerritoryControl', requiredParams: ['locationName'], buildParams: (p) => ({ locationName: p[0] || '', world: p[1] || world() }) },
      { mode: 'both', category: '物品查询', action: '角色物品', skill: 'item.query', method: 'listCharacterItems', requiredParams: ['target'], buildParams: (p) => ({ target: p[0] || '' }) },
      { mode: 'both', category: '物品查询', action: '搜索已知物品', skill: 'item.query', method: 'searchKnownItem', requiredParams: ['keyword'], buildParams: (p) => ({ keyword: p[0] || '' }) },
    ];
  },


  stage1MaterialCatalogText(mode = 'real') {
    const lines = [];
    const seen = new Map();
    this.guidedMaterialRequestCatalog(mode).forEach((item) => {
      if (!(item.mode === 'both' || item.mode === mode)) return;
      const list = seen.get(item.category) || [];
      if (!list.includes(item.action)) list.push(item.action);
      seen.set(item.category, list);
    });
    seen.forEach((actions, category) => lines.push(`${category}：${actions.join('、')}`));
    return lines.join('\n') || '无可请求资料';
  },


  parseChineseMaterialRequest(line = '', options = {}) {
    const mode = options.mode || 'real';
    const parts = this.splitChineseRequestLine(line);
    if (parts.length < 2) return null;
    let [category, action, ...params] = parts;
    if (category === '地点查询' && /^查询[^附近]/u.test(action)) {
      params = [action.replace(/^查询/u, '').trim(), ...params];
      action = '搜索地点';
    }
    const entry = this.guidedMaterialRequestCatalog(mode).find((item) => (item.mode === 'both' || item.mode === mode) && item.category === category && item.action === action);
    if (!entry) return null;
    const built = entry.buildParams(params, options);
    const required = Array.isArray(entry.requiredParams) ? entry.requiredParams : Object.keys(built).filter((key) => key !== 'world');
    if (required.some((key) => built[key] === '' || built[key] === undefined)) return null;
    return { skill: entry.skill, method: entry.method, params: built, sourceText: String(line || '').trim() };
  },


  participantProfileRequests(data = {}) {
    const forbidden = new Set((data.forbiddenParticipants || []).map((item) => String(item?.name || item || '').trim()).filter(Boolean));
    const seen = new Set();
    const requests = [];
    const add = (items = []) => {
      for (const item of items || []) {
        const name = String(item?.name || item || '').trim();
        if (!name || forbidden.has(name) || seen.has(name) || requests.length >= 3) continue;
        seen.add(name);
        requests.push({ skill: 'character.query', method: 'searchCharacterProfile', params: { name, world: this.worldLabel() } });
      }
    };
    add(data.forcedParticipants);
    add(data.priorityCandidates);
    add(data.dramaCandidates);
    return requests;
  },


  sceneAnchorRequests(data = {}) {
    const queries = data.sceneQueries || {};
    const requests = [{ skill: 'realworld.location.query', method: 'getCurrentLocationContext', params: { world: this.worldLabel() } }];
    (queries.location || []).forEach((keyword) => {
      const text = String(keyword || '').trim();
      if (text) requests.push({ skill: 'realworld.location.query', method: 'searchLocationOne', params: { keyword: text, world: this.worldLabel() } });
    });
    (queries.causality || []).forEach((keyword) => {
      const text = String(keyword || '').trim();
      if (text) requests.push({ skill: 'realworld.history.query', method: 'searchWorldlineByKeyword', params: { keyword: text, world: this.worldLabel() } });
    });
    (queries.conflict || []).forEach((keyword) => {
      const text = String(keyword || '').trim();
      if (text) requests.push({ skill: 'memory.query', method: 'searchCharacterMemoryWindow', params: { characterId: '', keyword: text } });
    });
    return requests.slice(0, 4);
  },

};


;// ---- inference/scene-boundary.js ----
window.GameModules = window.GameModules || {};
window.GameModules.realWorldAgentContextParts = window.GameModules.realWorldAgentContextParts || {};

window.GameModules.realWorldAgentContextParts.sceneBoundary = {
  scheduleNameForId(store, id = '', entry = {}) {
    const state = store?.rpgStates?.[id] || window.GameModules.sqliteSave?.getCharacterState?.(id);
    return String(entry.characterName || state?.profile?.name || state?.name || id || '').trim();
  },


  cleanScheduleLocation(location = '') {
    return String(location || '').trim();
  },


  unknownScheduleLocation(location = '') {
    return !this.cleanScheduleLocation(location) || /^当前位置未知|未知地点|现实地点|当前位置$/u.test(this.cleanScheduleLocation(location));
  },


  householdLocationKey(location = '') {
    const text = this.cleanScheduleLocation(location);
    const explicitRoom = text.match(/^(.{0,40}?[0-9一二三四五六七八九十百千万]+(?:号|室))/u);
    if (explicitRoom) return explicitRoom[1].trim();
    const explicitUnit = text.match(/^(.{0,40}?[0-9一二三四五六七八九十百千万]+(?:栋|楼)(?:[0-9一二三四五六七八九十百千万]+单元)?)/u);
    return String(explicitUnit?.[1] || '').trim();
  },


  scheduleLocationsAdjacent(a = '', b = '') {
    const left = this.cleanScheduleLocation(a);
    const right = this.cleanScheduleLocation(b);
    if (!left || !right || this.unknownScheduleLocation(left) || this.unknownScheduleLocation(right)) return false;
    if (left === right) return false;
    const leftKey = this.householdLocationKey(left);
    const rightKey = this.householdLocationKey(right);
    if (!leftKey || !rightKey) return false;
    return leftKey === rightKey || leftKey.includes(rightKey) || rightKey.includes(leftKey);
  },


  scheduleParticipantHints(store, action = '', currentLocation = '') {
    const schedules = store?.characterSchedules && typeof store.characterSchedules === 'object' ? store.characterSchedules : {};
    const location = this.cleanScheduleLocation(currentLocation || store?.realWorldLocationName || store?.realWorldMap?.current || '');
    const out = { sameLocation: [], nearbyLocation: [], offstage: [], unknown: [] };
    Object.entries(schedules).forEach(([id, entry]) => {
      if (!entry || typeof entry !== 'object') return;
      const name = this.scheduleNameForId(store, id, entry);
      if (!name) return;
      const current = this.cleanScheduleLocation(entry.currentLocation);
      const item = { id: entry.characterId || id, name, currentLocation: current, currentAction: String(entry.currentAction || '').trim(), availability: entry.availability || '未知', reason: entry.reason || '' };
      if (item.availability === '场外') out.offstage.push(item);
      else if (this.unknownScheduleLocation(current)) out.unknown.push(item);
      else if (current && location && current === location) out.sameLocation.push(item);
      else if (this.scheduleLocationsAdjacent(current, location)) out.nearbyLocation.push(item);
    });
    return {
      sameLocation: out.sameLocation.slice(0, 3),
      nearbyLocation: out.nearbyLocation.slice(0, Math.max(0, 3 - out.sameLocation.length)),
      offstage: out.offstage.slice(0, 5),
      unknown: out.unknown.slice(0, 5),
    };
  },


  scheduleHintLine(items = [], label = '') {
    const text = (items || []).map((item) => `${item.name}（${[item.currentLocation, item.currentAction].filter(Boolean).join('，') || '无详情'}）`).join('、');
    return `${label}：${text || '无'}`;
  },


  scheduleCandidateHintText(store, action = '', currentLocation = '') {
    const hints = this.scheduleParticipantHints(store, action, currentLocation);
    if (!Object.values(hints).some((items) => items.length)) return '日程候选提示：无';
    return [
      '日程候选提示：',
      this.scheduleHintLine(hints.sameLocation, '同地点'),
      this.scheduleHintLine(hints.nearbyLocation, '同住/相邻'),
      this.scheduleHintLine(hints.offstage, '明确场外'),
      this.scheduleHintLine(hints.unknown, '未知位置'),
      '规则：同地点/同住/相邻可作为高优先候选或戏剧候选，但不是强制出场；明确场外不得作为可出场候选；每轮最多选择3个日程候选。',
    ].join('\n');
  },


  sceneParticipantBoundary(trace = [], effectiveSceneLayers = null) {
    const layers = effectiveSceneLayers || (Array.isArray(trace) ? {
      forcedParticipants: trace.flatMap((item) => Array.isArray(item?.forcedParticipants) ? item.forcedParticipants : []),
      priorityCandidates: trace.flatMap((item) => Array.isArray(item?.priorityCandidates) ? item.priorityCandidates : []),
      dramaCandidates: trace.flatMap((item) => Array.isArray(item?.dramaCandidates) ? item.dramaCandidates : []),
      forbiddenParticipants: trace.flatMap((item) => Array.isArray(item?.forbiddenParticipants) ? item.forbiddenParticipants : []),
      randomActiveEvents: trace.flatMap((item) => Array.isArray(item?.randomActiveEvents) ? item.randomActiveEvents : []),
      randomIntrusionCondition: [...trace].reverse().find((item) => item?.randomIntrusionCondition)?.randomIntrusionCondition || '无明确条件则禁止闯入',
    } : trace || {});
    const seenNames = new Set();
    const clean = (group = []) => (Array.isArray(group) ? group : []).filter((item) => {
      const name = String(item?.name || item?.idOrName || item?.id || item?.characterName || '').trim();
      if (!name || seenNames.has(name)) return false;
      seenNames.add(name);
      return true;
    });
    const names = (group = [], label = '理由') => clean(group).map((item) => {
      const name = item.name || item.idOrName || item.id || item.characterName;
      return `${name}${item.reason ? `（${label}：${item.reason}）` : ''}`;
    }).join('、') || '无';
    const random = (Array.isArray(layers.randomActiveEvents) ? layers.randomActiveEvents : []).map((item) => `${item.characterName || item.name}：${item.eventType || item.actionMethod || '场外事件'}｜${item.motivation || ''}`).join('；') || '无';
    return [
      `强制出场：${names(layers.forcedParticipants, '出场理由')}`,
      `高优先候选：${names(layers.priorityCandidates, '候选理由')}`,
      `戏剧候选：${names(layers.dramaCandidates, '候选理由')}`,
      `禁止出场：${names(layers.forbiddenParticipants, '不在场理由')}`,
      `随机主动事件：${random}`,
      `随机事件闯入条件：${layers.randomIntrusionCondition || '无明确条件则禁止闯入'}`,
    ].join('\n');
  },


  randomActiveEventCandidates(store, action = '', options = {}) {
    const blocked = new Set([...(options.blockedNames || []), ...String(action || '').match(/[\p{Script=Han}A-Za-z0-9_]{2,}/gu) || []]);
    ['forcedParticipants', 'priorityCandidates', 'dramaCandidates', 'forbiddenParticipants'].forEach((key) => {
      (Array.isArray(options[key]) ? options[key] : []).forEach((item) => {
        const name = String(item?.name || item?.characterName || item?.idOrName || item?.id || item || '').trim();
        if (name) blocked.add(name);
      });
    });
    const states = [...Object.values(store?.rpgStates || {}), ...(window.GameModules.sqliteSave.listCharacterStates?.() || [])];
    const seen = new Set();
    return states.map((state) => ({ id: state.id || state.profile?.name || state.name, name: state.profile?.name || state.name }))
      .filter((item) => item.name && !blocked.has(item.name) && !seen.has(item.name) && seen.add(item.name))
      .slice(0, 3);
  },

};


;// ---- inference/material-loader.js ----
window.GameModules = window.GameModules || {};
window.GameModules.realWorldAgentContextParts = window.GameModules.realWorldAgentContextParts || {};

window.GameModules.realWorldAgentContextParts.materialLoader = {
  async autoLoadForStep(store, action = '', loadedKeys = new Set(), materialSession = null, materials = window.GameModules.realWorldMaterials, memoryIds = new Set(), step = 1, loaded = [], current = []) {
    if (step !== 1) return [];
    const ctx = window.GameModules.realWorldAgentContext || window.GameModules.realWorldAgentContextParts?.core || {};
    const actionText = String(action || '');
    const lastGuidance = ctx.lastRoundStage1GuidanceFromStore?.(store) || null;
    const priorParticipantNames = ['forcedParticipants', 'priorityCandidates'].flatMap((key) => (Array.isArray(lastGuidance?.[key]) ? lastGuidance[key] : []))
      .map((item) => (typeof item === 'string' ? item : (item?.name || item?.idOrName || item?.characterName || '')).trim())
      .filter(Boolean);
    const states = [...Object.values(store?.rpgStates || {}), ...(window.GameModules.sqliteSave.listCharacterStates?.() || [])];
    const seen = new Set();
    const worldOk = (state) => window.GameModules.characterQuery?.worldMatches?.(window.GameModules.realWorld2026?.label || '2026 现代都市现实世界', state.worldTag || state.profile?.work);
    const nameHit = (name) => actionText.includes(name) || priorParticipantNames.includes(name);
    const hits = states.filter((state) => {
      const name = String(state?.profile?.name || state?.name || '').trim();
      const id = String(state?.id || '').trim();
      const key = id || name;
      if (!name || seen.has(key) || !nameHit(name) || !worldOk(state)) return false;
      seen.add(key);
      return true;
    }).slice(0, 3);
    const out = [];
    for (const state of hits) {
      const name = state.profile?.name || state.name;
      const req = { skill: 'character.query', method: 'searchCharacterProfile', params: { name, world: window.GameModules.realWorld2026?.label || '2026 现代都市现实世界', auto: true } };
      const key = this.materialRequestKey(req.skill, req.method, req.params, materials);
      if (loadedKeys.has(key)) continue;
      loadedKeys.add(key);
      const text = window.GameModules.characterQuery?.stateText?.(state, req.params.world, 3200) || '';
      if (!text) continue;
      materials?.record?.(materialSession, req, `自动资料：${name}角色卡`, text);
      out.push({ title: `自动资料：${name}角色卡`, text, max: 3200, participants: [{ type: 'character', id: state.id || name, name, role: 'loaded-role-card' }] });
    }
    return out;
  },


  async skillText() {
    const ids = ['emotion.feeling.wearing.assess', 'memory.query', 'character.query', 'past.event.query', 'company.query', 'faction.query', 'realworld.location.query', 'realworld.history.query', 'lexicon.query', 'item.query', 'wechat.query', 'wechat.message.incoming', 'realworld.vitals.adjust'];
    const texts = await Promise.all(ids.map((id) => window.GameModules.skillLoader?.instruction?.(id) || ''));
    const crossWorld = ['# 跨世界资料查询', '每个 request.params 可写 world/worldTag 指定资料所属世界；默认现实世界。需要作品/异世界资料时写作品名，并用 worklore.query 查询。', window.GameModules.workLoreMaterials?.skillText?.() || ''].filter(Boolean).join('\n');
    return [crossWorld, ...texts.filter(Boolean)].join('\n\n');
  },


  stage1BlockedMaterialText(skill = '', method = '', policy = 'deny', step = 1) {
    const pair = `${skill}.${method}`;
    if (policy === 'deny') {
      return [
        `资料请求未执行：${pair} 属于 Stage1 禁止的写库/结算/侧效应 skill。`,
        '此类变更应通过 Stage4 结算 genericUpdates 写入，或在后续步骤改用只读查询替代。',
      ].join('\n');
    }
    if (policy === 'deep') {
      return [
        `资料请求未执行：${pair} 属于 Stage1 深读 skill，仅 step≥3 且 brief/Index 不足时可用（当前 step=${step}）。`,
        '请优先使用控势摘要 resolveTerritoryBrief 或势力列表/档案搜索等浅读 skill。',
      ].join('\n');
    }
    return `资料请求未执行：${pair} 不符合当前 Step${step} 资料策略。`;
  },


  async loadRequests(store, action, requests = [], loadedKeys = new Set(), materialSession = null, materials = window.GameModules.realWorldMaterials, memoryIds = new Set(), loaded = [], current = [], options = {}) {
    const step = Number(options?.step || 1);
    const out = [];
    for (const req of requests.slice(0, options.limit || 3)) {
      const skill = String(req?.skill || '').trim();
      const method = String(req?.method || '').trim();
      const params = req?.params && typeof req.params === 'object' ? req.params : {};
      if (!skill || !method) continue;
      if (materials?.isStage1Eligible && !materials.isStage1Eligible({ skill, method }, step)) {
        const policy = materials.stage1PolicyFor?.({ skill, method }) || 'deny';
        materials.recordStage1Block?.(materialSession, store, { skill, method, params }, policy, step);
        out.push({
          title: `blocked:${skill}.${method}`,
          text: this.stage1BlockedMaterialText(skill, method, policy, step),
          max: 260,
        });
        continue;
      }
      const key = this.materialRequestKey(skill, method, params, materials);
      if (loadedKeys.has(key)) continue;
      loadedKeys.add(key);
      const material = materials?.optionFor?.({ skill, method, params });
      const max = material?.maxChars || this.maxFor(skill);
      const text = await this.dispatch(store, action, skill, method, { ...params, maxChars: max });
      if (text) {
        const title = `${skill}.${method}`;
        const ref = this.materialReferenceFor(text, this.materialReferenceCandidates(store, loaded, [...current, ...out]));
        const finalText = ref ? this.materialReferenceText(ref) : text;
        materials?.record?.(materialSession, { skill, method, params }, title, finalText);
        out.push({ title, text: finalText, max: ref ? 260 : max, referenceId: ref?.id });
      }
    }
    return out;
  },


  maxFor(skill) {
    if (skill === 'past.event.query') return 5200;
    if (skill === 'character.query') return 3200;
    if (skill === 'realworld.location.query') return 1500;
    if (skill === 'memory.query') return 1600;
    if (skill === 'realworld.history.query') return 1800;
    if (skill === 'company.query') return 1400;
    if (skill === 'faction.query') return 1600;
    if (skill === 'worklore.query') return 1800;
    if (skill === 'lexicon.query') return 1200;
    return 1000;
  },


  unsupportedMaterialText(skill = '', method = '') {
    const allowed = ['company.query', 'faction.query', 'realworld.location.query', 'realworld.history.query', 'memory.query', 'character.query', 'past.event.query', 'lexicon.query', 'item.query', 'wechat.query', 'worklore.query'];
    return [
      `资料请求未执行：${skill || '未知 skill'}.${method || '未知 method'} 不是当前资料阶段可用 skill。`,
      `可用 skill：${allowed.join('、')}。`,
      '请基于已载入资料判断是否足够；只有缺口会直接改变本次行动结果时，才改用当前资料清单中的可用 skill 重新请求。',
    ].join('\n');
  },


  async dispatch(store, action, skill, method, params) {
    if (skill === 'company.query') return this.company(store, method, params);
    if (skill === 'faction.query') return this.faction(store, method, params);
    if (skill === 'realworld.location.query') return this.location(store, method, params, action);
    if (skill === 'realworld.history.query') return this.history(store, method, params);
    if (skill === 'memory.query') return await this.memory(store, action, method, params);
    if (skill === 'character.query') return window.GameModules.characterQuery?.query?.(store, method, params) || '';
    if (skill === 'past.event.query') return window.GameModules.pastEventQuery?.query?.(store, method, { question: action, ...params }) || '';
    if (skill === 'lexicon.query') return await this.lexicon(store, method, params);
    if (skill === 'item.query') return await this.itemQuery(store, method, params);
    if (skill === 'wechat.query') return window.GameModules.realWorldAgentWechat?.wechat?.(store, method, params) || '';
    if (skill === 'worklore.query') return await window.GameModules.workLoreQuery?.dispatch?.(store, action, method, params) || '';
    return this.unsupportedMaterialText(skill, method);
  },


  company(store, method, params = {}) {
    const current = store.currentCompany?.();
    const list = store.companyState?.companies || (current ? [current] : []);
    const keyword = String(params.keyword || params.companyName || params.name || '').trim();
    if (method === 'listPlayerCompanies') return list.map((c) => `- ${c.name}：${c.type || '组织'}｜${c.industry || '行业未知'}｜${c.location || '地点未知'}`).join('\n') || '暂无公司。';
    const company = list.find((c) => !keyword || c.name.includes(keyword)) || current || list[0];
    if (!company) return '暂无公司资料。';
    if (method === 'searchCompany' && keyword && !JSON.stringify(company).includes(keyword)) return '未命中公司资料。';
    if (method === 'getWorkContext') return this.workContext(store, company);
    return this.companySummary(store, company);
  },


  companySummary(store, company = {}) {
    const work = company.workMode || {};
    const salary = company.salary || {};
    const org = (company.organization || []).slice(0, 4).map((d) => `${d.name}：${(d.jobs || []).map((j) => `${j.title}(${(j.people || []).join('、')})`).join('；')}`).join('\n');
    return [`公司：${company.name}`, `类型/行业：${company.type || '未知'}｜${company.industry || '未知'}`, `地点：${company.location || '未知'}`, `规模：${company.scale || '未知'}`, `制度：${work.type || '员工'}｜${work.workDays || ''}｜${work.startTime || ''}-${work.endTime || ''}`, `薪资：${salary.monthlyBase || 0}${salary.currency || 'CNY'}｜绩效${salary.performanceMonths || 0}个月`, `组织：\n${org || '暂无组织架构。'}`, `规则：${(company.rules || []).join('；') || '暂无规则。'}`].join('\n');
  },


  workContext(store, company = {}) {
    const stats = store.companyState?.workStats || {};
    const pay = store.monthlyPayPreview?.() || {};
    return [this.companySummary(store, company), `本月状态：迟到${stats.lateCount || 0}次｜旷班${stats.absentCount || 0}次｜绩效${stats.performance ?? 100}/100`, `收入预估：底薪${pay.base || 0}｜日薪${pay.daily || 0}｜本月完整上班${pay.workDays || 0}天`].join('\n');
  },


  location(store, method, params = {}) {
    const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
    const keyword = String(params.keyword || params.locationName || params.name || '').trim();
    if (method === 'getCurrentLocationContext') return this.locationDetail(map, map.current || store.realWorldLocationName);
    if (method === 'getNearbyLocations') return this.nearby(map, keyword || map.current);
    if (method === 'listTopLocations') return this.topLocations(map);
    if (method === 'searchLocation') return this.searchLocation(map, keyword);
    return this.locationDetail(map, keyword || map.current);
  },


  locationDetail(map, name = '') {
    const node = (map.nodes || []).find((item) => item.name === name || item.id === name) || (map.nodes || [])[0];
    if (!node) return '暂无地点资料。';
    const parent = (map.nodes || []).find((item) => item.id === node.parentId)?.name || '无';
    const children = (map.nodes || []).filter((item) => item.parentId === node.id).map((item) => item.name).join('、') || '无';
    const facts = (node.descriptionFacts || []).map((fact, i) => window.GameModules.realWorldMapFacts.formatFact(fact, i)).join('') || node.description || '暂无说明。';
    return `地点：${node.name}\n上级地点：${parent}\n子地点：${children}\n说明：${facts}`;
  },


  searchLocation(map, keyword = '') {
    if (!keyword) return this.topLocations(map);
    const hits = (map.nodes || []).filter((node) => `${node.name} ${node.description || ''} ${JSON.stringify(node.descriptionFacts || [])}`.includes(keyword)).slice(0, 8);
    return hits.map((node) => this.locationDetail(map, node.name)).join('\n\n') || '未命中地点。';
  },


  nearby(map, name = '') {
    const node = (map.nodes || []).find((item) => item.name === name) || (map.nodes || [])[0];
    if (!node) return '暂无附近地点。';
    const rows = (map.nodes || []).filter((item) => item.parentId === node.parentId || item.parentId === node.id || item.id === node.parentId).slice(0, 10);
    return rows.map((item) => `- ${item.name}${item.id === node.id ? '（当前）' : ''}`).join('\n') || '暂无附近地点。';
  },


  topLocations(map) {
    return (map.nodes || []).filter((node) => !node.parentId).slice(0, 12).map((node) => `- ${node.name}`).join('\n') || '暂无顶层地点。';
  },


  async memory(store, action, method, params = {}) {
    const keyword = String(params.keyword || action || '').trim();
    if (method === 'searchMemoryArchive') return await store.searchMemoryArchive?.('player-self', keyword) || '未命中记忆归档。';
    if (method === 'getCharacterMemory') return this.limit(store.getCharacterMemory?.('player-self') || '', 1600);
    return store.searchCharacterMemory?.('player-self', keyword) || store.memoryQueryContext?.('player-self', keyword) || '未命中相关记忆。';
  },
};


;// ---- real-world-agent-context.js ----
window.GameModules = window.GameModules || {};

const realWorldAgentContextParts = window.GameModules.realWorldAgentContextParts || {};

window.GameModules.realWorldAgentContext = {
  ...realWorldAgentContextParts.core,
  ...realWorldAgentContextParts.materialDedup,
  ...realWorldAgentContextParts.materialRequestCatalog,
  ...realWorldAgentContextParts.sceneBoundary,
  ...realWorldAgentContextParts.materialLoader,
  baseSnapshot(store, action = '') {
    const realWorld = window.GameModules.realWorld2026 || {};
    const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
    const companies = this.companyNames(store);
    const recent = this.recentLog(store, 3);
    const recentWorldline = this.recentWorldlineRecords(store, 5000, 6000);
    const longing = store.prepareRealWorldLongingContext?.() || '';
    const shared = store.sharedControlState?.();
    const sharedProfile = shared?.profile || {};
    const sharedLocation = shared ? store.controlLinkLocationText?.(shared) || '当前位置未登记' : '';
    const sharedBody = shared ? this.characterBodyText(shared) : '';
    return [
      `世界：${realWorld.label || '2026 现代都市现实世界'}`,
      `背景：${realWorld.summary || '玩家生活在现代都市，个人信息由玩家自行设定。'}`,
      window.GameModules.gamePremise?.aiPremiseLine || '',
      `关系边界：${realWorld.relationHint || '玩家相关人际关系只以玩家填写为准，未填写不要擅自补完。'}`,
      `桌面时间：${store.phoneDateText?.() || '未知'} ${store.phoneTimeText?.() || ''}`,
      `时间规则：所有现实时间都以桌面时间为准；本次 final 必须返回 elapsedSeconds，代码会用它推进桌面时间。`,
    `玩家资料：${store.playerSetupSummary?.() || store.playerName || '玩家'}`,
    `玩家属性：${this.limit(store.playerIdentitySummary?.() || '玩家本人属性尚未生成。', 1000)}`,
    ...(store.playerAspirationSummary?.() ? [`人生取向：${store.playerAspirationSummary()}`] : []),
      `玩家财富：${store.playerWealthText?.(store.playerProfile || {}) || `${Number(store.playerProfile?.wealthAmount || 0).toLocaleString('zh-CN')}元`}`,
      `现实身体状态：${this.vitalsText(store, store.playerIdentityState?.())}`,
      `主体ID规则：\n${window.GameModules.promptSections?.subjectIdRules?.(store) || '玩家本人固定 id:player-self；未知角色直接写完整姓名，禁止自造前缀。'}`,
      ...(shared ? [`同世界附身控制：当前上线对象为${sharedProfile.name || shared.name || '未知角色'}；身份：${sharedProfile.role || '未知'}；所在位置：${sharedLocation}。玩家意识已附身接管该角色身体，可直接控制其动作、视线、表情、触觉、嗅觉、味觉、听觉、身体反馈与局部反应；同时玩家现实本体仍由同一个意识维持控制，属于一心多用。描写时以第二人称“你”的附身镜头为主，重点写被控角色身体内的视角、动作执行、感官回流和外界反应；不要写成单纯远程旁观，也不要让玩家本体消失或失控。`, `被控角色身体与状态：${sharedBody}`] : []),
      `当前场景：${store.realWorldSceneTitle || '现实世界'}`,
      `当前地点：${store.realWorldLocationName || map.current || '尚未生成具体地点'}`,
      `当前目标：${store.realWorldQuest || '确认现实处境'}`,
      `当前组织名称：${companies || '暂无公司名称'}`,
      `组织索引（Org Index）：\n${window.GameModules.orgTerritory?.orgIndexText?.(store, action, 800) || '暂无已知组织。'}`,
      `组织热点（Org Hot）：\n${window.GameModules.orgTerritory?.orgHotText?.(store, action, 1200) || '暂无已接触组织细节。'}`,
      `控势摘要（Territory Hot）：\n${window.GameModules.orgTerritory?.territoryHotText?.(store, 600) || '暂无已揭示地点控势。'}`,
      `势力资料库：\n${window.GameModules.factionArchive?.contextFor?.(store, action, 1600) || '暂无势力资料库记录。'}`,
      ...(longing ? [`角色思念上下文：\n${longing}`] : []),
      `## 最近发送的世界线\n需严格跟着世界线续写，保证正文对最新世界线连续性。\n${recentWorldline}`,
      `系统级补充记录（日历/通信/世界线节点等；不含角色行动复述）：\n${this.recentSystemRecords(store, 8, 1200)}`,
      `最近记录摘要：\n${recent}`,
      `本次行动：${action || '继续观察现实世界'}`,
    ].join('\n');
  },

  vitalsText(store, state = null) {
    const values = state?.values || {};
    const percent = (pool) => pool?.max ? Math.round((pool.current / pool.max) * 100) : 100;
    const row = (key, label) => {
      const pool = values[key] || {};
      const value = percent(pool);
      const note = values.vital_update_notes?.[key]?.reason || '';
      return `${label}${value}/100${note ? `（上次变化：${note}）` : ''}`;
    };
    return state?.values ? [row('vitality', '生命力'), row('stamina_pool', '精力'), row('satiety', '饱食度'), row('hydration', '水分'), row('fatigue', '疲劳'), row('mental_stability', '精神稳定')].join('；') : '玩家本人状态尚未生成。';
  },

  characterBodyText(state = null) {
    const v = state?.values || {}, p = state?.profile || {};
    const names = (list) => (list || []).map((item) => item?.slot ? `${item.slot}:${item.name || '未穿戴'}` : (item?.name || item)).slice(0, 12).join('、') || '无';
    const base = [`性别${p.gender || v.gender || '未知'}`, `年龄${v.age ?? p.age ?? '未知'}`, `身份${p.role || p.job || state?.name || '未知'}`];
    if (v.level) base.push(`等级${v.level}`, `力量${v.strength}`, `敏捷${v.agility}`, `体质${v.constitution}`, `智力${v.intelligence}`, `感知${v.perception}`, `意志${v.willpower}`, `魅力${v.charisma}`);
    base.push(`穿着${names(v.wearing)}`, `物品${names(v.items)}`);
    if (v.intimacy?.bodyStatus) base.push(`身体状态${String(v.intimacy.bodyStatus).slice(0, 80)}`);
    return this.limit(base.join('｜'), 900);
  },

  companyNames(store) {
    const list = store.companyState?.companies || [];
    if (!list.length) return store.currentCompany?.()?.name || '';
    return list.map((item) => `${item.name}${item.id === store.companyState?.currentCompanyId ? '（当前）' : ''}`).join('、');
  },

  buildStage1RoutingContext({ store, action, loaded = [], config = null } = {}) {
    const map = window.GameModules.realWorldMap?.ensure?.(store, store?.playerProfile || {}) || {};
    const location = store?.realWorldLocationName || map.current || '未知地点';
    const time = [store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ') || '未知时间';
    const player = store?.playerName || store?.playerProfile?.name || '玩家';
    const priorCount = store?.realWorldAgentKvByMode?.[config?.mode || 'real']?.messages?.length || 0;
    const actionText = String(action || '');
    const orgTerritoryHint = /夺控|法域|归属|控势|起义|独立|领土|管辖|组织|势力|公司|社区|政府/u.test(actionText)
      ? `组织/控势线索：base 已含 Org Index 与 Territory Hot（仅已揭示）。优先资料请求：控势查询，控势摘要，${location}；或势力查询，势力档案，关键词。brief 不足且 step≥3 才请求势力详情/地点控势详情。禁止 Stage1 写入势力或改控势。`
      : '';
    return [
      `模式：${config?.label || '现实'}`,
      `本次行动：${action || '继续观察现实世界'}`,
      `当前位置：${location}`,
      `当前时间：${time}`,
      `当前对象线索：${player}`,
      orgTerritoryHint,
      this.scheduleCandidateHintText(store, action, location),
      priorCount
        ? `前轮完整推演上下文：已通过对话链继承（${priorCount} 条消息，不压缩）；本轮仅补充以下增量，勿重复请求前轮已载入资料。`
        : '',
      `已加载资料摘要：\n${this.loadedRoutingSummary(loaded)}`,
      `可请求资料目录：\n${this.stage1MaterialCatalogText(config?.mode || 'real')}`,
    ].filter(Boolean).join('\n');
  },

  buildNarrationContext({ store, action, config = null } = {}) {
    const map = window.GameModules.realWorldMap?.ensure?.(store, store?.playerProfile || {}) || {};
    const recentWorldline = this.redactNarrationPollution(this.recentWorldline(store, 800, '\n'));
    const recent = this.redactNarrationPollution(this.recentSummary(store, 4));
    return [
      `模式：${config?.label || '现实'}`,
      `本次行动：${action || '继续观察现实世界'}`,
      `当前地点：${store?.realWorldLocationName || map.current || '未知地点'}`,
      `当前场景：${store?.realWorldSceneTitle || '现实世界'}`,
      `当前时间提示：${[store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ') || '未知时间'}`,
      `玩家可写资料：${store?.playerSetupSummary?.() || store?.playerName || '玩家'}`,
      `最近事实连续性：正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。`,
      `最近世界线摘要：\n${recentWorldline || '无'}`,
      `最近记录摘要：\n${recent || '无'}`,
    ].join('\n');
  },

  buildSceneAnchorContext({ store, action, loaded = [], trace = [], effectiveSceneLayers = null, config = null } = {}) {
    const map = window.GameModules.realWorldMap?.ensure?.(store, store?.playerProfile || {}) || {};
    const location = store?.realWorldLocationName || map.current || store?.realWorldSceneTitle || '未知地点';
    const time = [store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ') || '未知时间';
    return [
      `模式：${config?.label || '现实'}`,
      `本次行动：${action || '继续观察现实世界'}`,
      `当前场景位置：${location}`,
      `当前时间提示：${time}`,
      `空间边界线索：仅保留门口、房间、走廊、相邻空间、可听见/可看见/可进入条件。`,
      this.scheduleCandidateHintText(store, action, location),
      `参与者边界：\n${this.sceneParticipantBoundary(trace, effectiveSceneLayers)}`,
      `已加载锚定事实：\n${this.loadedAnchorSummary(loaded)}`,
    ].join('\n');
  },
};


;// ---- real-world-longing-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.realWorldLongingActions = {
  realWorldLongingRoster() {
    const byId = new Map();
    (this.wechatContacts?.() || []).filter((c) => !c.group).forEach((contact) => {
      const id = this.wechatMessageKey?.(contact) || contact.id;
      const state = this.itemSkillState?.(id) || this.rpgStates?.[id] || window.GameModules.sqliteSave.getCharacterState?.(id);
      if (id && state?.id && state.id !== 'player-self') byId.set(state.id, { contact, state });
    });
    Object.values(this.rpgStates || {}).forEach((state) => {
      if (state?.id && state.id !== 'player-self' && !byId.has(state.id)) byId.set(state.id, { contact: null, state });
    });
    return [...byId.values()];
  },

  longingStateFor(state) {
    state.values = state.values || {};
    const raw = state.values.longing_to_player || {};
    const base = Number(this.phoneFixedTime) || Date.now();
    return { value: Math.max(0, Math.min(999, Number(raw.value) || 0)), updatedAt: Number(raw.updatedAt) || base };
  },

  async settleRealWorldLongingMeters(elapsedSeconds, startMs, endMs) {
    const delta = Math.max(0, Number(endMs) - Number(startMs));
    if (!delta) return [];
    const events = [];
    for (const item of this.realWorldLongingRoster()) {
      const feeling = Number(item.state?.metrics?.playerFeelings?.好感) || 0;
      const meter = this.longingStateFor(item.state);
      const triggers = this.longingTriggersFor(item, meter, feeling, elapsedSeconds, startMs, endMs);
      item.state.values.longing_to_player = triggers.meter;
      if (triggers.events.length) events.push(...triggers.events);
      this.rpgStates = { ...(this.rpgStates || {}), [item.state.id]: item.state };
      await window.GameModules.sqliteSave.saveCharacterState?.(item.state);
    }
    this.realWorldLongingEvents = [...(this.realWorldLongingEvents || []), ...events].slice(-20);
    return events;
  },

  longingTriggersFor(item, meter, feeling, elapsedSeconds, startMs, endMs) {
    if (feeling < 20) return { meter: { ...meter, updatedAt: endMs }, events: [] };
    const gain = (0.3 + 0.7 * Math.random()) * feeling * (Math.max(0, Number(elapsedSeconds) || 0) / 172800);
    const total = meter.value + gain;
    const count = Math.floor(total / 100);
    const next = { value: total % 100, updatedAt: endMs };
    if (count < 1) return { meter: { ...next, value: total }, events: [] };
    return { meter: next, events: this.makeLongingEvents(item, count, startMs, endMs, feeling) };
  },

  makeLongingEvents(item, count, startMs, endMs, feeling) {
    const profile = item.state.profile || {};
    const contact = item.contact || { id: item.state.id, name: profile.name || item.state.name };
    return Array.from({ length: count }, (_, index) => {
      const last = index === count - 1;
      const ratio = last ? 1 : (0.6 + 0.4 * Math.random()) * ((index + 1) / count);
      const at = new Date(startMs + (endMs - startMs) * ratio);
      return {
        id: `longing-${item.state.id}-${at.getTime()}-${index}`,
        characterId: item.state.id,
        contactId: contact.id || item.state.id,
        name: profile.name || contact.name || item.state.name,
        relation: contact.relation || profile.role || '',
        personality: profile.personality || profile.detail || '',
        feeling,
        missed: !last,
        timeIso: at.toISOString(),
      };
    });
  },

  prepareRealWorldLongingContext() {
    const pending = (this.realWorldLongingEvents || []).filter((e) => e?.id);
    if (!pending.length) return '';
    this.realWorldLongingPreparedIds = pending.map((e) => e.id);
    const events = pending.map((e) => `- ${e.missed ? '过去错过' : '当前触发'}｜${e.timeIso}｜${e.name}(${e.characterId})｜联系人:${e.contactId || '未确认'}｜${e.relation || '关系未知'}｜好感${e.feeling}｜性格:${e.personality || '未记录'}`).join('\n');
    return [`## 本轮触发的角色思念事件`, `以下事件必须在 final.narration 中明确体现。过去错过事件写成角色在对应过去时间想起玩家、试图联系或靠近但玩家未回应；当前触发事件让角色按性格以找玩家、发微信、打电话、上门、托人询问等合理方式行动。`, `若角色选择微信联系，先请求 wechat.query.listWechatSkills / listContacts / getThread 确认联系人和口吻；final.wechatActions 使用 sendIncomingPast 写过去错过消息，使用 sendIncomingNow 写当前消息。不要代替玩家回复。`, events].join('\n');
  },

  clearPreparedRealWorldLongingEvents() {
    const ids = new Set(this.realWorldLongingPreparedIds || []);
    if (ids.size) this.realWorldLongingEvents = (this.realWorldLongingEvents || []).filter((e) => !ids.has(e.id));
    this.realWorldLongingPreparedIds = [];
  },
};


;// ---- real-world-agent-history.js ----
window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.realWorldAgentContext, {
  history(store, method, params = {}) {
    const keyword = String(params.keyword || '').trim();
    if (method === 'getWorldlinePending') return this.worldlinePending(store);
    if (method === 'listWorldlineIndex') return this.worldlineIndex(store);
    if (method === 'searchWorldlineByKeyword') return this.searchWorldline(store, keyword, '关键词');
    if (method === 'searchWorldlineByTime') return this.searchWorldlineByTime(store, params);
    if (method === 'listWorldlinePlots') return this.worldlinePlots(store);
    if (method === 'getWorldlinePlotRecords') return this.worldlinePlotRecords(store, params);
    const rows = this.allRealWorldRows(store);
    const picked = method === 'searchRealWorldLog' && keyword
      ? rows.filter((entry) => `${entry.text || ''} ${entry.narration || ''} ${entry.locationName || ''}`.includes(keyword)).slice(-8)
      : rows.slice(-5);
    return picked.map((entry) => entry.type === 'user'
      ? `玩家：${entry.text}`
      : `现实：${entry.locationName || '未知地点'}｜${this.limit(entry.narration || '', 320)}`).join('\n') || '未命中现实记录。';
  },

  allRealWorldRows(store) {
    const total = window.GameModules.sqliteSave.countRealWorldLogEntries?.() || 0;
    if (total) return window.GameModules.sqliteSave.listRealWorldLogEntries?.(1, Math.min(total, 200)) || [];
    return (store.realWorldLog || []).filter((entry) => entry.type !== 'system');
  },

  worldlinePending(store) {
    const line = store.realWorldline?.() || {};
    const ids = line.pendingPlot?.recordIds || [];
    if (!ids.length) return '暂无正在记录的现实时间线。';
    return this.eventsByIds(line, ids).map((event) => this.eventLine(event)).join('\n') || '正在记录时间线没有命中具体记录。';
  },

  worldlineIndex(store) {
    const line = store.realWorldline?.() || {};
    const pending = line.pendingPlot ? `记录中｜${line.pendingPlot.startedAt || ''}-${line.pendingPlot.endedAt || ''}｜记录数:${(line.pendingPlot.recordIds || []).length}` : '记录中｜暂无';
    const plots = (line.plots || []).slice(-12).map((plot) => `情节｜${plot.情节编号 || plot.id || '未编号'}｜${plot.情节标题 || plot.情节名称 || plot.摘要 || '未命名'}｜${plot.情节时间段 || ''}｜记录:${plot.重要记录编号 || plot.recordIds || ''}`);
    const events = (line.events || []).slice(-12).map((event) => `事件｜${event.eventId || event.id || '未知'}｜${event.time || ''}｜${event.name || '现实事件'}｜情节:${event.plotId || event.summary || '未归纳'}｜${this.limit(event.detail || event.summary || '', 80)}`);
    return ['世界线清单', pending, ...plots, ...events].join('\n') || '暂无世界线资料。';
  },

  searchWorldline(store, query = '', label = '关键词') {
    const key = String(query || '').trim();
    if (!key) return this.worldlineIndex(store);
    const line = store.realWorldline?.() || {};
    const plots = (line.plots || []).filter((plot) => this.worldlinePlotText(plot).includes(key)).slice(-6);
    const events = (line.events || []).filter((event) => this.worldlineEventText(event).includes(key)).slice(-8);
    const plotText = plots.map((plot) => this.worldlinePlotDetail(line, plot)).join('\n\n');
    const eventText = events.map((event) => this.eventLine(event)).join('\n');
    return this.limit([`${label}查询：${key}`, plotText ? `命中情节：\n${plotText}` : '', eventText ? `命中事件：\n${eventText}` : ''].filter(Boolean).join('\n\n') || '未命中世界线资料。', 1800);
  },

  searchWorldlineByTime(store, params = {}) {
    const start = this.parseHistoryTime(params.startTime || params.start || params.minTime || params.from);
    const end = this.parseHistoryTime(params.endTime || params.end || params.maxTime || params.to);
    const keyword = String(params.keyword || '').trim();
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return this.searchWorldline(store, String(params.time || params.keyword || '').trim(), '时间');
    const line = store.realWorldline?.() || {};
    const keywordHit = (text) => !keyword || text.includes(keyword);
    const inRange = (value) => {
      const at = this.parseHistoryTime(value);
      return Number.isFinite(at) && at >= start && at <= end;
    };
    const events = (line.events || []).filter((event) => inRange(event.time) && keywordHit(this.worldlineEventText(event))).slice(-8);
    const plots = (line.plots || []).filter((plot) => this.plotOverlapsRange(plot, start, end) && keywordHit(this.worldlinePlotText(plot))).slice(-6);
    const plotText = plots.map((plot) => this.worldlinePlotDetail(line, plot)).join('\n\n');
    const eventText = events.map((event) => this.eventLine(event)).join('\n');
    const title = `时间段查询：${params.startTime || params.start || ''} - ${params.endTime || params.end || ''}${keyword ? `｜关键词：${keyword}` : ''}`;
    return this.limit([title, plotText ? `命中情节：\n${plotText}` : '', eventText ? `命中事件：\n${eventText}` : '未命中该时间段世界线资料。'].filter(Boolean).join('\n\n'), 1800);
  },

  parseHistoryTime(value = '') {
    const text = String(value || '').trim();
    const match = text.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?(?:[ T]+(\d{1,2})[:：](\d{1,2})(?::(\d{1,2}))?)?/u);
    if (!match) return NaN;
    const [, y, m, d, hh = '0', mm = '0', ss = '0'] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)).getTime();
  },

  plotOverlapsRange(plot = {}, start, end) {
    const times = String(plot.情节时间段 || plot.timeRange || plot.time || '').match(/\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}日?(?:[ T]+\d{1,2}[:：]\d{1,2}(?::\d{1,2})?)?/gu) || [];
    const parsed = times.map((item) => this.parseHistoryTime(item)).filter(Number.isFinite);
    if (!parsed.length) return false;
    const min = Math.min(...parsed), max = Math.max(...parsed);
    return max >= start && min <= end;
  },

  worldlinePlots(store) {
    const line = store.realWorldline?.() || {};
    return (line.plots || [])
      .map((plot) => `${plot.情节编号 || '未编号'}｜${plot.情节名称 || plot.摘要 || '未命名'}｜${plot.重要记录编号 || ''}`)
      .join('\n') || '暂无已归纳情节。';
  },

  worldlinePlotRecords(store, params = {}) {
    const line = store.realWorldline?.() || {};
    const plotId = String(params.plotId || params.id || params.keyword || '').trim();
    const plot = (line.plots || []).find((item) => String(item.情节编号 || item.id || '').includes(plotId)
      || String(item.情节名称 || item.情节标题 || item.摘要 || '').includes(plotId));
    if (!plot) return '未命中已归纳情节。';
    return this.worldlinePlotDetail(line, plot);
  },

  worldlinePlotDetail(line = {}, plot = {}) {
    const ids = String(plot.重要记录编号 || plot.recordIds || '').split(/[、,，\s]+/).filter(Boolean);
    const events = this.eventsByIds(line, ids);
    return [
      `情节：${plot.情节编号 || plot.id || ''}｜${plot.情节标题 || plot.情节名称 || plot.摘要 || ''}`,
      `时间：${plot.情节时间段 || ''}`,
      `摘要：${plot.情节总结 || plot.摘要 || plot.情节摘要 || ''}`,
      `关键片段：${plot.重要片段 || ''}`,
      `关联记录：\n${events.map((event) => this.eventLine(event)).join('\n') || ids.join('、') || '无关联记录命中。'}`,
    ].join('\n');
  },

  worldlineEventText(event = {}) {
    return `${event.eventId || event.id || ''}\n${event.time || ''}\n${event.name || ''}\n${event.summary || ''}\n${event.plotId || ''}\n${event.detail || ''}\n${JSON.stringify(event)}`;
  },

  worldlinePlotText(plot = {}) {
    return `${plot.情节编号 || plot.id || ''}\n${plot.情节标题 || ''}\n${plot.情节名称 || ''}\n${plot.情节时间段 || ''}\n${plot.情节总结 || ''}\n${plot.摘要 || ''}\n${plot.重要片段 || ''}\n${plot.重要记录编号 || plot.recordIds || ''}\n${JSON.stringify(plot)}`;
  },

  eventsByIds(line = {}, ids = []) {
    const set = new Set(ids);
    return (line.events || []).filter((event) => set.has(event.eventId) || set.has(event.id));
  },

  eventLine(event = {}) {
    return `${event.eventId || event.id || '未知记录'}｜${event.time || ''}｜${event.name || '现实事件'}｜${this.limit(event.detail || event.summary || '', 360)}`;
  },
});


;// ---- real-world-agent-memory.js ----
window.GameModules = window.GameModules || {};

(() => {
  const ctx = window.GameModules.realWorldAgentContext;
  if (!ctx || ctx.memoryInstalled) return;

  function clean(text) {
    return String(text || '').replace(/\s+/g, '').slice(0, 220);
  }

  Object.assign(ctx, {
    memoryInstalled: true,

    allCharacterMemoryIds(store) {
      const ids = new Set(['player-self']);
      Object.keys(store.rpgStates || {}).forEach((id) => id && ids.add(String(id)));
      (window.GameModules.sqliteSave.listCharacterStates?.() || []).forEach((state) => state?.id && ids.add(String(state.id)));
      return [...ids];
    },

    characterState(store, id) {
      return store.rpgStates?.[id] || window.GameModules.sqliteSave.getCharacterState?.(id) || null;
    },

    characterMemoryName(store, id) {
      if (id === 'player-self') return store.playerDisplayCharacter?.().name || store.playerName || '玩家本人';
      const state = this.characterState(store, id) || {};
      return state.name || state.profile?.name || id;
    },

    resolveMemoryIds(store, characters = []) {
      const ids = new Set(['player-self']);
      const allIds = this.allCharacterMemoryIds(store);
      const states = (window.GameModules.sqliteSave.listCharacterStates?.() || []).concat(Object.values(store.rpgStates || {}));
      characters.forEach((item) => {
        const rawId = String(item?.id || item?.characterId || '').trim();
        const rawName = String(item?.name || (typeof item === 'string' ? item : '')).trim();
        if (rawId === 'all' || rawName === 'all') allIds.forEach((id) => ids.add(id));
        if (rawId && allIds.includes(rawId)) ids.add(rawId);
        const hit = states.find((state) => state?.id === rawId || state?.name === rawName || state?.profile?.name === rawName);
        if (hit?.id) ids.add(String(hit.id));
      });
      return [...ids];
    },

    timelineMemoryIndex(store, loaded = []) {
      const line = store.realWorldline?.() || {};
      const pendingIds = line.pendingPlot?.recordIds || [];
      const pending = (line.events || []).filter((event) => pendingIds.includes(event.eventId) || pendingIds.includes(event.id));
      const loadedHistory = loaded.filter((item) => String(item.title || '').includes('realworld.history.query'));
      const texts = [
        ...pending.map((event) => `${event.detail || ''}${event.summary || ''}`),
        ...loadedHistory.map((item) => item.text || ''),
      ];
      return {
        ids: new Set(pending.flatMap((event) => [event.eventId, event.id]).filter(Boolean)),
        texts: texts.map(clean).filter((text) => text.length > 30),
      };
    },

    memoryDuplicatesTimeline(item, index) {
      const ids = [item.id, item.linkedLongTermId, ...(item.sourceIds || [])].filter(Boolean);
      if (ids.some((id) => index.ids.has(id))) return true;
      const text = clean(`${item.summary || ''}${item.text || ''}`);
      return text.length > 30 && index.texts.some((eventText) => eventText.includes(text.slice(0, 60)) || text.includes(eventText.slice(0, 60)));
    },

    collectMemoryLines(memory, timelineIndex, limit = 8) {
      const m = window.GameModules.characterMemory;
      const pools = [
        ['短期-刚发生', memory.shortTerm?.recent],
        ['短期-归纳中', memory.shortTerm?.summaryBuffer],
        ['短期-近发生', memory.shortTerm?.summarized],
        ['长期-难忘', memory.longTerm?.vivid],
        ['长期-不可忘记', memory.longTerm?.permanent],
      ];
      const seen = new Set();
      const lines = [];
      let skipped = 0;
      pools.forEach(([name, items]) => (items || []).forEach((item) => {
        const key = item.id || item.linkedLongTermId || clean(item.summary || item.text);
        if (!key || seen.has(key)) { skipped += 1; return; }
        seen.add(key);
        if (this.memoryDuplicatesTimeline(item, timelineIndex)) { skipped += 1; return; }
        if (lines.length < limit) lines.push(`- ${name}｜${m.itemText(item)}`);
      }));
      return { lines, skipped };
    },

    characterMemoriesForStep(store, action = '', characters = [], loaded = [], alreadyLoaded = new Set(), forcePlayer = false) {
      const ids = this.resolveMemoryIds(store, characters).filter((id) => forcePlayer || !alreadyLoaded.has(id));
      if (!ids.length) return null;
      const index = this.timelineMemoryIndex(store, loaded);
      const sections = [];
      let skippedTotal = 0;
      const loadedIds = [];
      ids.forEach((id) => {
        const memory = window.GameModules.characterMemory?.ensure?.(id);
        if (!memory) return;
        const picked = this.collectMemoryLines(memory, index, id === 'player-self' ? 10 : 7);
        skippedTotal += picked.skipped;
        loadedIds.push(id);
        if (picked.lines.length) sections.push(`### ${this.characterMemoryName(store, id)}（${id}）\n${picked.lines.join('\n')}`);
      });
      const note = skippedTotal ? `\n（已去重 ${skippedTotal} 条：与已载入现实时间线记录或短/长期记忆重复的同源记录只保留一份。）` : '';
      const text = this.limit((sections.join('\n\n') || '相关角色暂无可用短期/长期记忆。') + note, 3200);
      return { title: 'memory.query.characterMemoriesForStep', text, max: 3200, ids: loadedIds };
    },

    peopleMemoryBrief(store, action = '', maxChars = 2800) {
      const item = this.characterMemoriesForStep(store, action, [{ id: 'all' }], [], new Set(), true);
      return this.limit(item?.text || '暂无人物短期/长期记忆。', maxChars);
    },

    searchAllPeopleMemory(store, keyword = '') {
      return this.limit(this.allCharacterMemoryIds(store).map((id) => {
        const text = store.searchCharacterMemory?.(id, keyword) || '';
        if (!text || text.includes('未命中') || text.includes('无关键词')) return '';
        return `### ${this.characterMemoryName(store, id)}（${id}）\n${text}`;
      }).filter(Boolean).join('\n\n') || '未命中任何人物记忆。', 2600);
    },
  });

  ctx.memory = async function memory(store, action, method, params = {}) {
    const keyword = String(params.keyword || action || '').trim();
    const characterId = String(params.characterId || params.id || 'player-self').trim();
    if (method === 'getAllCharacterMemories') return this.peopleMemoryBrief(store, keyword, 3600);
    if (method === 'searchMemoryArchive') return await store.searchMemoryArchive?.(characterId, keyword) || '未命中记忆归档。';
    if (method === 'getCharacterMemory') return characterId === 'all' ? this.peopleMemoryBrief(store, keyword, 3600) : (this.limit(store.getCharacterMemory?.(characterId) || '', 1800) || '暂无人物记忆。');
    if (method === 'searchCharacterMemory') return characterId === 'all' ? this.searchAllPeopleMemory(store, keyword) : (store.searchCharacterMemory?.(characterId, keyword) || '未命中相关记忆。');
    return store.searchCharacterMemory?.('player-self', keyword) || store.memoryQueryContext?.('player-self', keyword) || '未命中相关记忆。';
  };
})();


;// ---- real-world-agent-location-fill.js ----
window.GameModules = window.GameModules || {};

(() => {
  const ctx = window.GameModules.realWorldAgentContext;
  if (!ctx || ctx.locationFillInstalled) return;
  const baseLocation = ctx.location?.bind(ctx);

  Object.assign(ctx, {
    locationFillInstalled: true,

    async location(store, method, params = {}, action = '') {
      const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
      const keyword = String(params.keyword || params.locationName || params.name || '').trim();
      if (method === 'getCurrentLocationContext') {
        const current = this.ensurePlayerCurrentLocation(store, action);
        return this.locationDetail(map, current?.name || map.current || store.realWorldLocationName);
      }
      if ((method === 'searchLocation' || method === 'getLocationDetail') && keyword) {
        const existing = this.findLocationHit(map, keyword);
        if (existing) return this.locationDetail(map, existing.name);
        if (this.shouldFillCharacterLocation(store, keyword, action)) return await this.fillCharacterLocation(store, this.locationTargetKeyword(store, `${keyword} ${action}`) || keyword, action);
      }
      return baseLocation ? baseLocation(store, method, params) : '';
    },

    async actionLocationForStep(store, action = '', characters = [], reason = '', loadedKeys = new Set()) {
      const text = `${action} ${reason} ${characters.map((item) => `${item?.id || item} ${item?.name || ''}`).join(' ')}`;
      const wantsPerson = /房间|卧室|找|去|前往|位置|所在|妹妹|姐姐|哥哥|弟弟|母亲|父亲/u.test(text);
      if (!wantsPerson) return null;
      const key = `realworld.location.auto:${this.locationPersonKey(store, text) || text.slice(0, 24)}`;
      if (loadedKeys.has(key)) return null;
      loadedKeys.add(key);
      this.ensurePlayerCurrentLocation(store, action);
      const target = this.locationTargetKeyword(store, text);
      if (!target) return null;
      const existing = this.findLocationHit(window.GameModules.realWorldMap.ensure(store, store.playerProfile || {}), target);
      const detail = existing ? this.locationDetail(window.GameModules.realWorldMap.ensure(store, store.playerProfile || {}), existing.name) : await this.fillCharacterLocation(store, target, action);
      return { title: 'realworld.location.query.autoCharacterRoute', text: detail, max: 1800 };
    },

    findLocationHit(map, keyword = '') {
      const key = String(keyword || '').trim();
      if (!key) return null;
      const tokens = this.locationKeywordTokens(key);
      const needsRoom = /房间|卧室/u.test(key);
      return (map.nodes || []).find((node) => {
        const text = `${node.name} ${node.description || ''} ${JSON.stringify(node.descriptionFacts || [])}`;
        if (text.includes(key)) return true;
        if (needsRoom) return /房间|卧室/u.test(text) && tokens.some((token) => !/房间|卧室/u.test(token) && text.includes(token));
        return tokens.some((token) => text.includes(token));
      });
    },

    locationKeywordTokens(keyword = '') {
      const text = String(keyword || '');
      const clean = text.replace(/位置|信息|当前|状态|地点|路线|环境|获取|需要|相关|上下文|以便|确定|前往|的|和|与/gu, ' ');
      const names = [...clean.matchAll(/[\u4e00-\u9fa5]{2,4}/gu)].map((m) => m[0]).filter((x) => !/房间|卧室/u.test(x));
      const family = ['妹妹', '姐姐', '哥哥', '弟弟', '母亲', '父亲'].filter((x) => text.includes(x));
      const rooms = /房间|卧室/u.test(text) ? ['房间', '卧室'] : [];
      return [...new Set([...names, ...family, ...rooms])].filter((x) => x.length >= 2);
    },

    shouldFillCharacterLocation(store, keyword = '', action = '') {
      const text = `${keyword} ${action || store.realWorldInput || ''}`;
      if (/房间|卧室|住所|住处|家里|妹妹|姐姐|哥哥|弟弟|母亲|父亲/u.test(text)) return true;
      return Boolean(this.findCharacterForLocationKeyword(store, text));
    },

    findCharacterForLocationKeyword(store, keyword = '') {
      const states = (window.GameModules.sqliteSave.listCharacterStates?.() || []).concat(Object.values(store.rpgStates || {}));
      const hits = states.map((state) => {
        const profile = state?.profile || state || {};
        const text = [state?.id, state?.name, profile.name, profile.role, profile.relationships, profile.detail].filter(Boolean).join(' ');
        let score = 0;
        if (profile.name && keyword.includes(profile.name)) score += 50;
        if (state?.name && keyword.includes(state.name)) score += 40;
        if (state?.id && keyword.includes(state.id)) score += 20;
        if (/妹妹/u.test(keyword) && /妹妹/u.test(text)) score += 25;
        if (state?.id === 'player-self') score -= 45;
        return { state, score, text };
      }).filter((item) => item.text && item.score > 0).sort((a, b) => b.score - a.score);
      return hits[0]?.state || null;
    },

    locationPersonKey(store, text = '') {
      const hit = this.findCharacterForLocationKeyword(store, text);
      return hit?.id || hit?.profile?.name || hit?.name || '';
    },

    locationTargetKeyword(store, text = '') {
      const hit = this.findCharacterForLocationKeyword(store, text);
      const profile = hit?.profile || hit || {};
      if (profile.name) return `${profile.name}的房间`;
      const match = String(text || '').match(/([\u4e00-\u9fa5]{2,4})(?:的)?(?:房间|卧室|位置|所在)/u);
      return match?.[1] ? `${match[1]}的房间` : '';
    },

    ensurePlayerCurrentLocation(store, action = '') {
      const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
      if (map.current && !window.GameModules.realWorldMap.isAbstractName(map.current)) return this.findLocationHit(map, map.current);
      const fallback = this.playerHomeLocationName(store, action);
      return fallback ? window.GameModules.realWorldMap.addLocation(store, {
        name: fallback,
        descriptionFacts: [`玩家当前位于${fallback}，这是本次现实推演的路线起点。`],
      }, window.GameModules.realWorldMap.factTime(store)) : null;
    },

    playerHomeLocationName(store, action = '') {
      const profile = store.playerProfile || {};
      const text = [profile.refinedCity, profile.homeLocation, profile.locationName, profile.refinedLivingStatus, action].filter(Boolean).join(' ');
      const match = text.match(/([\u4e00-\u9fa5A-Za-z0-9-]+小区[^，。；\s]{0,24}(?:号|室)?)/u);
      return window.GameModules.realWorldMap.cleanName(match?.[1] || profile.refinedCity || profile.homeLocation || store.realWorldLocationName || '');
    },

    async fillCharacterLocation(store, keyword = '', action = '') {
      const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
      const character = this.findCharacterForLocationKeyword(store, `${keyword} ${action}`);
      const clue = this.locationFillClue(store, keyword, character, action);
      let payload = null;
      try {
        const prompt = await window.GameModules.renderPrompt('real-world-map-location-add', {
          手机时间: `${store.phoneDateText?.() || ''} ${store.phoneTimeText?.() || ''}`.trim(),
          当前地点: map.current || store.realWorldLocationName || '未知',
          现实地图: map.lastText || window.GameModules.realWorldMap.render(map),
          地点说明: this.locationFactsText(map),
          新地点线索: clue,
        });
        payload = await window.GameModules.jsonUtils.generateJsonWithRetry({
          source: 'real-world-location-fill', promptId: 'real-world-map-location-add', model: store.modelId, timeoutMs: 45000, prompt, format: prompt, max: 2,
          parse: (text) => window.GameModules.jsonUtils.parseLoose(text),
          validate: (raw) => this.validateLocationFill(raw),
        });
      } catch (err) {
        console.warn('现实人物地点补齐失败，使用保守兜底:', err.code, err.message, err.stack);
        payload = this.fallbackLocationFill(store, keyword, character);
      }
      const time = window.GameModules.realWorldMap.factTime(store);
      const routeNodes = this.applyRouteNodes(store, payload.routeNodes || [], time);
      const node = window.GameModules.realWorldMap.addLocation(store, payload, time);
      return [`地图未命中“${keyword}”，已视为现实世界地点未加载完全并补齐地点。`, this.routeSummary(routeNodes, node), this.locationDetail(map, node?.name || payload.name), '补齐结论：玩家当前地点、目标人物地点、从当前地点前往目标地点的中间路线和当前可用上下文已经足够用于本次现实推演；除非玩家提出新的未知地点，不要继续为同一人物地点或路线重复 request_context。'].join('\n');
    },

    locationFillClue(store, keyword = '', character = null, action = '') {
      const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
      const profile = character?.profile || character || {};
      return [
        `查询关键词：${keyword}`,
        `玩家当前地点：${map.current || store.realWorldLocationName || '未知'}`,
        `本次行动：${action || store.realWorldInput || '现实行动中需要前往该人物相关地点'}`,
        `人物资料：${profile.name || character?.name || '未知人物'}｜${profile.role || ''}｜${profile.relationships || ''}｜${profile.detail || ''}`,
        '已有地图没有命中该人物地点，说明现实世界地图尚未加载完全；请先判断玩家当前地点，再推理从当前地点到目标人物地点的路线。若中间经过走廊、楼梯、二楼平台、卧室门口等地图中没有的新地点，必须放入 routeNodes 自动补齐。目标地点 descriptionFacts 要写清完整路线，例如“从客厅沿楼梯上二楼，穿过二楼走廊后右手第二间”。禁止写“根据本次现实行动补齐”“玩家当然知道可以前往这里”这类兜底说明。',
      ].join('\n');
    },

    applyRouteNodes(store, routeNodes = [], time = '') {
      return (Array.isArray(routeNodes) ? routeNodes : []).slice(0, 5).map((item) => {
        try { return window.GameModules.realWorldMap.addLocation(store, this.validateRouteNode(item), time); }
        catch (_) { return null; }
      }).filter(Boolean);
    },

    routeSummary(routeNodes = [], target = null) {
      const names = [...routeNodes.map((node) => node.name), target?.name].filter(Boolean);
      return names.length ? `路线节点：${names.join(' → ')}` : '路线节点：已根据当前地点和目标地点补齐。';
    },

    locationFactsText(map) {
      return (map.nodes || []).map((node) => `${node.name}：${(node.descriptionFacts || []).map((fact, i) => window.GameModules.realWorldMapFacts.formatFact(fact, i)).join('') || node.description || '暂无说明'}`).join('\n') || '暂无地点说明。';
    },

    validateLocationFill(raw = {}) {
      const item = this.validateRouteNode(raw);
      const routeNodes = Array.isArray(raw.routeNodes) ? raw.routeNodes.map((node) => this.validateRouteNode(node)).slice(0, 5) : [];
      return { ...item, routeNodes };
    },

    validateRouteNode(raw = {}) {
      const name = window.GameModules.realWorldMap.cleanName(raw.name || raw.locationName);
      if (!name || window.GameModules.realWorldMap.isAbstractName(name)) throw new Error('地点名缺失或过于抽象');
      const facts = Array.isArray(raw.descriptionFacts) ? raw.descriptionFacts.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 3) : [String(raw.description || '')];
      if (!facts.length || facts.some((x) => /补齐|当然知道|可以前往|人物相关地点/u.test(x)) || !facts.join('').match(/左|右|上楼|下楼|走廊|门|房间|卧室|客厅|楼梯|尽头|旁边|对面|第二间|第一间|经过|穿过/u)) throw new Error('地点说明缺少具体方位路线');
      return { name, parentName: window.GameModules.realWorldMap.cleanName(raw.parentName || raw.parentLocationName || ''), descriptionFacts: facts };
    },

    fallbackLocationFill(store, keyword = '', character = null) {
      const map = window.GameModules.realWorldMap.ensure(store, store.playerProfile || {});
      const profile = character?.profile || character || {};
      const name = profile.name ? `${profile.name}的房间` : window.GameModules.realWorldMap.cleanName(keyword.replace(/地点|信息|位置/gu, ''));
      const route = map.current ? `从${map.current}出发，沿住处内部走廊或楼梯前往，房门位于家庭卧室区域的第二间。` : '从当前室内位置出发，沿走廊前往家庭卧室区域，目标房门在第二间。';
      return { name: name || '相关人物房间', parentName: map.current || store.realWorldLocationName || '', descriptionFacts: [route], routeNodes: [{ name: '住处内部走廊', parentName: map.current || store.realWorldLocationName || '', descriptionFacts: [`从${map.current || '当前室内位置'}出来后先进入连接各房间的走廊。`] }] };
    },
  });
})();


;// ---- story-agent-context.js ----
window.GameModules = window.GameModules || {};

window.GameModules.storyAgentContext = {
  materialBudgetChars: 5500,
  autoLimits: { readme: 700, people: 1300, timeline: 1000 },

  limit(text, max = 1200) { return String(text || '').trim().slice(0, max); },

  baseSnapshot(store, action = '') {
    const c = store.character || {};
    const state = store.characterRpgState || {};
    const exp = state.values?.control_experience || {};
    const work = c.work || store.selectedWork || '原创世界';
    const recentWorldline = this.recentWorldlineRecords(store, work, 5000, 6000);
    return [
      `界面：《我狠狠操控》主剧情/被操控角色推演`,
      `背景：正在操控作品《${work}》所在的异世界/原作世界，不是玩家现实世界；现实资料只作为操控者身份与动机背景。`,
      `玩家：${store.playerName || store.playerProfile?.name || '玩家'}`,
      `玩家现实资料：${store.playerSetupSummary?.() || '玩家资料未完成。'}`,
      `被操控角色：${c.name || '未知角色'}｜作品：${work}｜身份：${c.role || '未知'}`,
      `角色设定：${this.limit(c.detail || c.personality || '暂无角色简介。', 1000)}`,
      `角色技能：${Array.isArray(c.skills) ? c.skills.map((s) => `${s.name || '技能'}:${s.desc || s.description || ''}`).join('；') : '无'}`,
      `当前模式：${store.online ? 'online' : 'offline'}｜控制方式：${store.controlMode || 'possess'}`,
      `游戏内时间：${store.entryTimeLabel?.() || '未知'}｜场景：${store.sceneTitle || '剧情现场'}｜回合：${store.turn || 1}`,
      `当前目标：${store.quest || '确认操控连接'}`,
      `当前情绪/关系：情绪=${store.mood || '冷静'}｜信任=${store.trust ?? '--'}｜反抗=${store.resistance ?? '--'}`,
      `角色当前数值：\n${store.metricGroups?.(state).map((group) => `${group.title}：${Object.entries(group.values || {}).map(([k, v]) => `${k}${v}`).join('、')}`).join('\n') || '暂无数值。'}`,
      `上线体验：次数=${exp.onlineCount || 0}｜感觉=${exp.feeling || '未知'}｜适应=${exp.adaptation || 0}/100｜摘要=${exp.summary || '尚无经历'}`,
      `目标状态快照：\n${window.GameModules.promptSections?.stateSnapshot?.(store, state) || '暂无角色卡快照。'}`,
      `## 最近发送的世界线\n需严格跟着世界线续写，保证正文对最新世界线连续性。\n${recentWorldline}`,
      `最近剧情：\n${this.recentLog(store, 4)}`,
      `本次行动：${action || '继续推进操控剧情'}`,
    ].join('\n');
  },

  recentLog(store, limit = 4) {
    const rows = (store.log || []).filter((entry) => entry.kind === 'novel').slice(-limit);
    return rows.map((entry) => [`玩家行动：${entry.playerText || ''}`, `剧情：${this.limit(entry.storyText || '', 320)}`, entry.mind ? `角色心理：${this.limit(entry.mind, 160)}` : ''].filter(Boolean).join('\n')).join('\n---\n') || '暂无主剧情记录。';
  },

  worldlineRecordText(event = {}) {
    return [
      `记录编号：${event.eventId || event.id || '未知记录'}`,
      `时间：${event.time || '未知'}`,
      `标题：${event.name || '异世界事件'}`,
      `情节：${event.plotId || event.summary || '未归纳'}`,
      `状态：${event.status || '已记录'}`,
      `详细：${String(event.detail || '').trim()}`,
    ].filter(Boolean).join('\n');
  },

  recentWorldlineRecords(store, worldTag = '', targetChars = 5000, maxChars = 6000) {
    const lore = (store.savedWorldLores || []).find((item) => item.worldTag === worldTag) || {};
    const line = lore.worldline || window.GameModules.sqliteSave.getWorldline?.(worldTag) || {};
    const events = (line.events || []).filter((event) => String(event.detail || '').trim());
    const picked = [];
    let total = 0;
    const separator = '\n\n---\n\n';
    for (const event of events.slice().reverse()) {
      const text = this.worldlineRecordText(event);
      const nextTotal = total + text.length + (picked.length ? separator.length : 0);
      if (nextTotal > maxChars) break;
      picked.push(text);
      total = nextTotal;
      if (total >= targetChars) break;
    }
    return picked.length ? picked.reverse().join(separator) : '暂无符合长度上限的最近世界线记录。';
  },

  buildLoadedText(items = []) {
    if (!items.length) return '本轮尚未动态载入额外资料。';
    return items.map((item, index) => `### 资料${index + 1}｜${item.title}\n${this.limit(item.text, item.max || 1600)}`).join('\n\n');
  },

  async skillText(store) {
    const ids = ['emotion.feeling.wearing.assess', 'memory.query', 'character.query', 'past.event.query', 'lexicon.query', 'item.query', 'company.query', 'faction.query', 'realworld.location.query', 'realworld.history.query'];
    const texts = await Promise.all(ids.map((id) => window.GameModules.skillLoader?.instruction?.(id) || ''));
    const crossWorld = ['# 跨世界资料查询', '每个 request.params 可写 world/worldTag 指定资料所属世界；默认当前操控作品。需要玩家现实资料时写现实世界名，需要其它作品资料时写作品名。', '当前作品世界线用 realworld.history.query 查询；作品原作设定用 worklore.query 查询；玩家现实资料可用 company.query、faction.query、realworld.location.query。'].join('\n');
    return [crossWorld, window.GameModules.workLoreMaterials?.skillText?.() || '', ...texts.filter(Boolean)].join('\n\n');
  },

  worldLabel(store = null) {
    return store?.character?.work || store?.selectedWork || '原创世界';
  },

  splitChineseRequestLine(line = '') {
    return window.GameModules.realWorldAgentContext.splitChineseRequestLine(line);
  },

  guidedMaterialRequestCatalog(mode = 'story') {
    const base = window.GameModules.realWorldAgentContext.guidedMaterialRequestCatalog(mode).filter((item) => item.mode === 'both');
    const work = (p, store) => p[1] || this.worldLabel(store);
    return [
      ...base,
      { mode: 'story', category: '作品设定查询', action: '入口说明', skill: 'worklore.query', method: 'getReadme', buildParams: (p, options) => ({ world: p[0] || this.worldLabel(options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '常驻设定', skill: 'worklore.query', method: 'getDefaultLoad', buildParams: (p, options) => ({ world: p[0] || this.worldLabel(options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索人物', skill: 'worklore.query', method: 'searchPeople', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索剧情', skill: 'worklore.query', method: 'searchPlot', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索时间线', skill: 'worklore.query', method: 'searchTimeline', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索能力', skill: 'worklore.query', method: 'searchAbility', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索关系', skill: 'worklore.query', method: 'searchRelationship', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索地点', skill: 'worklore.query', method: 'searchLocation', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索物品', skill: 'worklore.query', method: 'searchItem', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
    ];
  },

  stage1MaterialCatalogText(mode = 'story') {
    const lines = [];
    const seen = new Map();
    this.guidedMaterialRequestCatalog(mode).forEach((item) => {
      if (!(item.mode === 'both' || item.mode === mode || mode === 'story')) return;
      const list = seen.get(item.category) || [];
      if (!list.includes(item.action)) list.push(item.action);
      seen.set(item.category, list);
    });
    seen.forEach((actions, category) => lines.push(`${category}：${actions.join('、')}`));
    return lines.join('\n') || '无可请求资料';
  },

  redactPromptPollution(text = '') {
    return window.GameModules.realWorldAgentContext.redactPromptPollution(text);
  },

  loadedRoutingSummary(items = []) {
    return window.GameModules.realWorldAgentContext.loadedRoutingSummary(items);
  },

  buildStage1RoutingContext({ store, action, loaded = [], config = null } = {}) {
    const work = this.worldLabel(store);
    const character = store?.character?.name || '未知角色';
    const scene = store?.sceneTitle || '未知场景';
    return [
      `模式：${config?.label || '操控剧情'}`,
      `本次行动：${action || '继续推进操控剧情'}`,
      `当前位置：${scene}`,
      `当前时间：${store?.entryTimeLabel?.() || '未知时间'}`,
      `当前对象线索：${character}｜作品：${work}`,
      `已加载资料摘要：\n${this.loadedRoutingSummary(loaded)}`,
      `可请求资料目录：\n${this.stage1MaterialCatalogText('story')}`,
    ].join('\n');
  },

  loadedAnchorSummary(items = []) {
    return window.GameModules.realWorldAgentContext.loadedAnchorSummary(items);
  },

  sceneParticipantBoundary(trace = [], effectiveSceneLayers = null) {
    return window.GameModules.realWorldAgentContext.sceneParticipantBoundary(trace, effectiveSceneLayers);
  },

  buildSceneAnchorContext({ store, action, loaded = [], trace = [], effectiveSceneLayers = null, config = null } = {}) {
    const work = this.worldLabel(store);
    const character = store?.character?.name || '未知角色';
    const scene = store?.sceneTitle || '未知场景';
    return [
      `模式：${config?.label || '操控剧情'}`,
      `本次行动：${action || '继续推进操控剧情'}`,
      `当前场景位置：${scene}`,
      `当前时间提示：${store?.entryTimeLabel?.() || '未知时间'}`,
      `空间边界线索：仅保留当前作品《${work}》中地点、相邻空间、移动路径、自然介入条件。`,
      `参与者边界：\n${this.sceneParticipantBoundary(trace, effectiveSceneLayers)}`,
      `已加载锚定事实：\n${this.loadedAnchorSummary(loaded)}`,
      `当前对象线索：${character}｜作品：${work}`,
    ].join('\n');
  },

  redactNarrationPollution(text = '') {
    return window.GameModules.realWorldAgentContext.redactNarrationPollution(text);
  },

  safeNarrationTitle(title = '', index = 0) {
    return window.GameModules.realWorldAgentContext.safeNarrationTitle(title, index);
  },

  loadedNarrationSummary(items = []) {
    return window.GameModules.realWorldAgentContext.loadedNarrationSummary(items);
  },

  buildNarrationContext({ store, action, config = null } = {}) {
    const work = this.worldLabel(store);
    const character = store?.character?.name || '未知角色';
    const recent = this.redactNarrationPollution(this.recentLog(store, 4));
    return [
      `模式：${config?.label || '操控剧情'}`,
      `本次行动：${action || '继续推进操控剧情'}`,
      `作品：${work}`,
      `被操控角色：${character}`,
      `当前场景：${store?.sceneTitle || '未知场景'}`,
      `当前时间提示：${store?.entryTimeLabel?.() || '未知时间'}`,
      `当前目标：${store?.quest || '确认操控连接'}`,
      `最近事实连续性：正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。`,
      `最近剧情摘要：\n${recent || '无'}`,
    ].join('\n');
  },

  parseChineseMaterialRequest(line = '', options = {}) {
    const parts = this.splitChineseRequestLine(line);
    if (parts.length < 2) return null;
    const [category, action, ...params] = parts;
    const entry = this.guidedMaterialRequestCatalog('story').find((item) => item.category === category && item.action === action);
    if (!entry) return null;
    const built = entry.buildParams(params, { ...options, store: options.store });
    if (Object.values(built).some((value) => value === '')) return null;
    return { skill: entry.skill, method: entry.method, params: built, sourceText: String(line || '').trim() };
  },

  participantProfileRequests(data = {}, options = {}) {
    const store = options.store || {};
    const world = this.worldLabel(store);
    const forbidden = new Set((data.forbiddenParticipants || []).map((item) => String(item?.name || item || '').trim()).filter(Boolean));
    const seen = new Set();
    const requests = [];
    const add = (items = []) => {
      for (const item of items || []) {
        const name = String(item?.name || item || '').trim();
        if (!name || forbidden.has(name) || seen.has(name) || requests.length >= 3) continue;
        seen.add(name);
        requests.push({ skill: 'worklore.query', method: 'searchPeople', params: { keyword: name, name, world } });
      }
    };
    add(data.forcedParticipants);
    add(data.priorityCandidates);
    add(data.dramaCandidates);
    return requests;
  },

  sceneAnchorRequests(data = {}, store = {}) {
    const queries = data.sceneQueries || {};
    const world = this.worldLabel(store);
    const requests = [];
    (queries.location || []).forEach((keyword) => {
      const text = String(keyword || '').trim();
      if (text) requests.push({ skill: 'worklore.query', method: 'searchLocation', params: { keyword: text, world } });
    });
    (queries.causality || []).forEach((keyword) => {
      const text = String(keyword || '').trim();
      if (text) requests.push({ skill: 'worklore.query', method: 'searchTimeline', params: { keyword: text, world } });
    });
    (queries.conflict || []).forEach((keyword) => {
      const text = String(keyword || '').trim();
      if (text) requests.push({ skill: 'worklore.query', method: 'searchPlot', params: { keyword: text, world } });
    });
    return requests.slice(0, 4);
  },

  randomActiveEventCandidates(store, action = '', options = {}) {
    const rng = typeof options.rng === 'function' ? options.rng : Math.random;
    const blocked = new Set(String(action || '').match(/[\p{Script=Han}A-Za-z0-9_]{2,}/gu) || []);
    ['forcedParticipants', 'priorityCandidates', 'dramaCandidates', 'forbiddenParticipants'].forEach((key) => {
      (Array.isArray(options[key]) ? options[key] : []).forEach((item) => {
        const name = String(item?.name || item?.characterName || item?.idOrName || item?.id || item || '').trim();
        if (name) blocked.add(name);
      });
    });
    const pool = (store.knownCharacters || []).map((item) => ({ id: item.id || item.name, name: item.name || item.id })).filter((item) => item.name && !blocked.has(item.name));
    if (!pool.length) return [];
    const roll = rng();
    const count = roll < 0.5 ? 0 : (roll < 0.8 ? 1 : (roll < 0.95 ? 2 : 3));
    return pool.slice(0, count);
  },

  stage1BlockedMaterialText(skill = '', method = '', policy = 'deny', step = 1) {
    const loader = window.GameModules.realWorldAgentContextParts?.materialLoader;
    if (loader?.stage1BlockedMaterialText) {
      const text = loader.stage1BlockedMaterialText(skill, method, policy, step);
      if (policy === 'deep' && skill === 'worklore.query') {
        return text.replace('控势摘要 resolveTerritoryBrief 或势力列表/档案搜索等浅读 skill', 'getReadme、searchPeople、searchTimeline 等浅读 skill');
      }
      return text;
    }
    return `资料请求未执行：${skill}.${method}`;
  },

  async loadRequests(store, action, requests = [], loadedKeys = new Set(), materialSession = null, materials = window.GameModules.workLoreMaterials, memoryIds = new Set(), loaded = [], current = [], options = {}) {
    const step = Number(options?.step || 1);
    const out = [];
    for (const req of requests.slice(0, options.limit || 3)) {
      const skill = String(req?.skill || '').trim();
      const method = String(req?.method || '').trim();
      const params = req?.params && typeof req.params === 'object' ? req.params : {};
      if (!skill || !method) continue;
      if (materials?.isStage1Eligible && !materials.isStage1Eligible({ skill, method }, step)) {
        const policy = materials.stage1PolicyFor?.({ skill, method }) || 'deny';
        materials.recordStage1Block?.(materialSession, store, { skill, method, params }, policy, step);
        out.push({
          title: `blocked:${skill}.${method}`,
          text: this.stage1BlockedMaterialText(skill, method, policy, step),
          max: 260,
        });
        continue;
      }
      const memoryTarget = skill === 'memory.query' ? String(params.characterId || params.id || store.character?.id || '').trim() : '';
      const broadMemory = memoryTarget && this.isBroadMemoryRequest(method, params);
      if (broadMemory && memoryIds.has(memoryTarget)) continue;
      const key = `${skill}:${method}:${JSON.stringify(params)}`;
      if (!skill || !method || loadedKeys.has(key)) continue;
      loadedKeys.add(key);
      const material = materials?.optionFor?.({ skill, method, params });
      const max = material?.maxChars || this.maxFor(skill);
      if (!this.hasBudget(loaded, current, out, max)) continue;
      const text = await this.dispatch(store, action, skill, method, { ...params, maxChars: max });
      if (!text) continue;
      if (broadMemory) memoryIds.add(memoryTarget);
      const title = `${skill}.${method}`;
      materials?.record?.(materialSession, { skill, method, params }, title, text);
      out.push({ title, text, max });
    }
    return out;
  },

  isBroadMemoryRequest(method = '', params = {}) {
    const keyword = String(params.keyword || '').trim();
    return !keyword || ['getRecentCharacterMemories', 'getCharacterMemory', 'searchCharacterMemory'].includes(method);
  },

  async autoLoadForStep(store, action, loadedKeys, materialSession, materials, memoryIds, step, loaded = [], current = []) {
    if (step !== 1) return [];
    const out = [];
    const add = async (method, params, title, max) => {
      if (!this.hasBudget(loaded, current, out, max)) return;
      const req = { skill: 'worklore.query', method, params };
      const key = materials?.keyOf?.(req) || `${req.skill}:${req.method}:${JSON.stringify(req.params || {})}`;
      if (loadedKeys.has(key) || this.hasSimilarWorkLore([...loaded, ...current, ...out], method, params)) return;
      loadedKeys.add(key);
      const text = await window.GameModules.workLoreQuery.dispatch(store, action, method, { ...params, auto: true, maxChars: max });
      if (!text) return;
      materials?.record?.(materialSession, req, title, text);
      out.push({ title, text, max });
    };
    await add('getReadme', {}, '自动资料：作品 README 结构', this.autoLimits.readme);
    const characterName = String(store.character?.name || '').trim();
    if (characterName) await add('searchPeople', { keyword: characterName }, '自动资料：当前角色人物卡', this.autoLimits.people);
    if (this.shouldAutoTimeline(store, action)) await add('searchTimeline', { keyword: this.timelineKeyword(store, action) }, '自动资料：当前阶段时间线', this.autoLimits.timeline);
    return out;
  },

  hasBudget(loaded = [], current = [], pending = [], nextMax = 0) {
    const used = [...loaded, ...current, ...pending].reduce((sum, item) => sum + String(item.text || '').length, 0);
    return used + nextMax <= this.materialBudgetChars;
  },

  hasSimilarWorkLore(items = [], method = '', params = {}) {
    const keyword = String(params.keyword || '').trim();
    return items.some((item) => {
      const title = String(item.title || '');
      const text = String(item.text || '');
      if (!title.includes(`worklore.query.${method}`) && !title.includes(method) && !text.includes(method)) return false;
      return !keyword || text.includes(keyword);
    });
  },

  shouldAutoTimeline(store, action = '') {
    const text = `${store.entryTimeLabel?.() || ''} ${store.sceneTitle || ''} ${store.quest || ''} ${action || ''}`;
    return !/未知/.test(text) && /(第\s*\d+|\d+年|\d+月|\d+日|夜|昼|晨|晚|阶段|章节|圣杯战争|开战|决战|当前时间|时间线)/.test(text);
  },

  timelineKeyword(store, action = '') {
    return [store.entryTimeLabel?.(), store.sceneTitle, store.quest, store.character?.name, action].filter(Boolean).join(' ');
  },

  history(store, method, params = {}) {
    const worldTag = String(params.world || params.worldTag || store.character?.work || store.selectedWork || '原创世界').trim();
    const keyword = String(params.keyword || '').trim();
    if (method === 'listWorldlineIndex') return this.worldlineIndex(store, worldTag);
    if (method === 'searchWorldlineByKeyword') return this.searchWorldline(store, worldTag, keyword, '关键词');
    if (method === 'searchWorldlineByTime') return this.searchWorldlineByTime(store, worldTag, params);
    if (method === 'listWorldlinePlots') return this.worldlinePlots(store, worldTag);
    if (method === 'getWorldlinePlotRecords') return this.worldlinePlotRecords(store, worldTag, params);
    return window.GameModules.realWorldAgentContext.history(store, method, params);
  },

  worldlineFor(store, worldTag = '') {
    const tag = String(worldTag || store.character?.work || store.selectedWork || '原创世界').trim();
    const lore = (store.savedWorldLores || []).find((item) => item.worldTag === tag) || {};
    return lore.worldline || window.GameModules.sqliteSave.getWorldline?.(tag) || { events: [], plots: [], pendingPlot: null };
  },

  worldlineIndex(store, worldTag = '') {
    const line = this.worldlineFor(store, worldTag);
    const pending = line.pendingPlot ? `记录中｜${line.pendingPlot.startedAt || ''}-${line.pendingPlot.endedAt || ''}｜记录数:${(line.pendingPlot.recordIds || []).length}` : '记录中｜暂无';
    const plots = (line.plots || []).slice(-12).map((plot) => `情节｜${plot.情节编号 || plot.id || '未编号'}｜${plot.情节标题 || plot.情节名称 || plot.摘要 || '未命名'}｜${plot.情节时间段 || ''}｜记录:${plot.重要记录编号 || plot.recordIds || ''}`);
    const events = (line.events || []).slice(-12).map((event) => this.eventLine(event));
    return [`世界线清单：${worldTag || store.character?.work || '当前作品'}`, pending, ...plots, ...events].join('\n') || '暂无世界线资料。';
  },

  searchWorldline(store, worldTag = '', query = '', label = '关键词') {
    const key = String(query || '').trim();
    if (!key) return this.worldlineIndex(store, worldTag);
    const line = this.worldlineFor(store, worldTag);
    const events = (line.events || []).filter((event) => this.worldlineEventText(event).includes(key)).slice(-8);
    const plots = (line.plots || []).filter((plot) => this.worldlinePlotText(plot).includes(key)).slice(-6);
    const eventText = events.map((event) => this.eventLine(event)).join('\n');
    const plotText = plots.map((plot) => this.worldlinePlotDetail(line, plot)).join('\n\n');
    return this.limit([`${label}查询：${key}`, plotText ? `命中情节：\n${plotText}` : '', eventText ? `命中事件：\n${eventText}` : ''].filter(Boolean).join('\n\n') || '未命中世界线资料。', 1800);
  },

  searchWorldlineByTime(store, worldTag = '', params = {}) {
    const start = this.parseHistoryTime(params.startTime || params.start || params.minTime || params.from);
    const end = this.parseHistoryTime(params.endTime || params.end || params.maxTime || params.to);
    const keyword = String(params.keyword || '').trim();
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return this.searchWorldline(store, worldTag, String(params.time || params.keyword || '').trim(), '时间');
    const line = this.worldlineFor(store, worldTag);
    const keywordHit = (text) => !keyword || text.includes(keyword);
    const inRange = (value) => {
      const at = this.parseHistoryTime(value);
      return Number.isFinite(at) && at >= start && at <= end;
    };
    const events = (line.events || []).filter((event) => inRange(event.time) && keywordHit(this.worldlineEventText(event))).slice(-8);
    const plots = (line.plots || []).filter((plot) => this.plotOverlapsRange(plot, start, end) && keywordHit(this.worldlinePlotText(plot))).slice(-6);
    const eventText = events.map((event) => this.eventLine(event)).join('\n');
    const plotText = plots.map((plot) => this.worldlinePlotDetail(line, plot)).join('\n\n');
    const title = `时间段查询：${params.startTime || params.start || ''} - ${params.endTime || params.end || ''}${keyword ? `｜关键词：${keyword}` : ''}`;
    return this.limit([title, plotText ? `命中情节：\n${plotText}` : '', eventText ? `命中事件：\n${eventText}` : '未命中该时间段世界线资料。'].filter(Boolean).join('\n\n'), 1800);
  },

  parseHistoryTime(value = '') {
    const text = String(value || '').trim();
    const match = text.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?(?:[ T]+(\d{1,2})[:：](\d{1,2})(?::(\d{1,2}))?)?/u);
    if (!match) return NaN;
    const [, y, m, d, hh = '0', mm = '0', ss = '0'] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)).getTime();
  },

  plotOverlapsRange(plot = {}, start, end) {
    const times = String(plot.情节时间段 || plot.timeRange || plot.time || '').match(/\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}日?(?:[ T]+\d{1,2}[:：]\d{1,2}(?::\d{1,2})?)?/gu) || [];
    const parsed = times.map((item) => this.parseHistoryTime(item)).filter(Number.isFinite);
    if (!parsed.length) return false;
    const min = Math.min(...parsed), max = Math.max(...parsed);
    return max >= start && min <= end;
  },

  worldlinePlots(store, worldTag = '') {
    const line = this.worldlineFor(store, worldTag);
    return (line.plots || []).map((plot) => `${plot.情节编号 || '未编号'}｜${plot.情节名称 || plot.情节标题 || plot.摘要 || '未命名'}｜${plot.重要记录编号 || ''}`).join('\n') || '暂无已归纳情节。';
  },

  worldlinePlotRecords(store, worldTag = '', params = {}) {
    const line = this.worldlineFor(store, worldTag);
    const plotId = String(params.plotId || params.id || params.keyword || '').trim();
    const plot = (line.plots || []).find((item) => String(item.情节编号 || item.id || '').includes(plotId) || String(item.情节名称 || item.情节标题 || item.摘要 || '').includes(plotId));
    return plot ? this.worldlinePlotDetail(line, plot) : '未命中已归纳情节。';
  },

  worldlinePlotDetail(line = {}, plot = {}) {
    const ids = String(plot.重要记录编号 || plot.recordIds || '').split(/[、,，\s]+/).filter(Boolean);
    const events = (line.events || []).filter((event) => ids.includes(event.eventId) || ids.includes(event.id));
    return [`情节：${plot.情节编号 || plot.id || ''}｜${plot.情节标题 || plot.情节名称 || plot.摘要 || ''}`, `时间：${plot.情节时间段 || ''}`, `总结：${plot.情节总结 || plot.摘要 || plot.情节摘要 || ''}`, `关键片段：${plot.重要片段 || ''}`, `关联记录：\n${events.map((event) => this.eventLine(event)).join('\n') || ids.join('、') || '无'}`].join('\n');
  },

  worldlineEventText(event = {}) {
    return `${event.eventId || event.id || ''}\n${event.time || ''}\n${event.name || ''}\n${event.summary || ''}\n${event.plotId || ''}\n${event.detail || ''}\n${JSON.stringify(event)}`;
  },

  worldlinePlotText(plot = {}) {
    return `${plot.情节编号 || plot.id || ''}\n${plot.情节标题 || ''}\n${plot.情节名称 || ''}\n${plot.情节时间段 || ''}\n${plot.情节总结 || ''}\n${plot.摘要 || ''}\n${plot.重要片段 || ''}\n${plot.重要记录编号 || plot.recordIds || ''}\n${JSON.stringify(plot)}`;
  },

  eventLine(event = {}) {
    return `${event.eventId || event.id || '未知记录'}｜${event.time || ''}｜${event.name || '异世界事件'}｜${this.limit(event.detail || event.summary || '', 360)}`;
  },

  maxFor(skill) {
    if (skill === 'worklore.query') return 2200;
    if (skill === 'memory.query') return 1800;
    if (skill === 'past.event.query') return 5200;
    if (skill === 'character.query') return 3200;
    if (skill === 'item.query') return 1400;
    if (skill === 'lexicon.query') return 1200;
    return 1000;
  },

  async dispatch(store, action, skill, method, params) {
    const realCtx = window.GameModules.realWorldAgentContext;
    if (skill === 'worklore.query') return await window.GameModules.workLoreQuery.dispatch(store, action, method, params);
    if (skill === 'memory.query') return await realCtx.memory(store, action, method, { characterId: params.characterId || store.character?.id, ...params });
    if (skill === 'character.query') return window.GameModules.characterQuery?.query?.(store, method, { worldTag: params.worldTag || params.world || params.work || store.character?.work, ...params }) || '';
    if (skill === 'past.event.query') return window.GameModules.pastEventQuery?.query?.(store, method, { question: action, characterId: store.character?.id, characterName: store.character?.name, worldTag: store.character?.work, ...params }) || '';
    if (skill === 'lexicon.query') return await realCtx.lexicon(store, method, params);
    if (skill === 'item.query') return await realCtx.itemQuery(store, method, { target: params.target || store.character?.id, ...params });
    if (skill === 'company.query') return realCtx.company(store, method, params);
    if (skill === 'faction.query') return realCtx.faction(store, method, params);
    if (skill === 'realworld.location.query') return realCtx.location(store, method, params, action);
    if (skill === 'realworld.history.query') return this.history(store, method, { ...params, world: params.world || params.worldTag || store.character?.work });
    return '';
  },

  characterMemoriesForStep(store, action, characters = [], loaded = [], memoryIds = new Set(), first = false) {
    const ids = [store.character?.id, ...characters.map((item) => item.id || item.characterId).filter(Boolean)].filter(Boolean);
    const unique = [...new Set(ids)].filter((id) => !memoryIds.has(id)).slice(0, first ? 3 : 1);
    if (!unique.length) return null;
    const realCtx = window.GameModules.realWorldAgentContext;
    const text = unique.map((id) => `## ${id}\n${realCtx.recentCharacterMemoriesText?.(id, 6) || store.getCharacterMemory?.(id) || '暂无记忆。'}`).join('\n\n');
    return { title: '角色记忆', text, ids: unique, max: 1800 };
  },
};


;// ---- real-world-agent-loop.js ----
window.GameModules = window.GameModules || {};

window.GameModules.realWorldAgentLoop = {
  finalSeparator: '<!--REAL_WORLD_JSON-->',
  minSteps: 2,
  maxSteps: 8,
  kvCacheSeq: 0,

  async run(store, action, logId = null) {
    return await this.runConfigured(store, action, logId, this.realConfig());
  },

  async runStory(store, action, logId = null) {
    return await this.runConfigured(store, action, logId, this.storyConfig());
  },

  realConfig() {
    return { mode: 'real', label: '现实', ctx: window.GameModules.realWorldAgentContext, materials: window.GameModules.realWorldMaterials, templateId: 'inference-stage3-narration', firstTemplateId: 'inference-stage1-guided-query' };
  },

  storyConfig() {
    return { mode: 'story', label: '操控剧情', ctx: window.GameModules.storyAgentContext, materials: window.GameModules.workLoreMaterials, templateId: 'inference-stage3-narration', firstTemplateId: 'inference-stage1-guided-query' };
  },

  renderPrompt(id, vars) {
    const renderer = window.GameModules.renderPrompt || ((templateId, templateVars) => window.GameModules.promptTemplates?.render?.(templateId, templateVars));
    return renderer(id, vars);
  },

  snapshotKvMessages(session) {
    if (!session?.messages?.length) return [];
    return session.messages.map((item) => ({ role: String(item.role || 'user'), content: String(item.content || '') }));
  },

  forkKvCacheSession(parentSession, messagesSnapshot = null) {
    if (!parentSession) return null;
    return {
      id: `${parentSession.id}-fork-${Date.now()}`,
      providerId: parentSession.providerId,
      enabled: true,
      trackCache: parentSession.trackCache,
      persist: false,
      fork: true,
      messages: (messagesSnapshot || parentSession.messages || []).slice(),
      requestCount: 0,
      promptCacheHitTokens: 0,
      promptCacheMissTokens: 0,
    };
  },

  loadPersistedAgentMessages(store, mode = 'real') {
    const bucket = store?.realWorldAgentKvByMode?.[mode];
    const messages = Array.isArray(bucket?.messages) ? bucket.messages : [];
    return messages
      .filter((item) => item && ['user', 'assistant', 'system'].includes(String(item.role || '')))
      .map((item) => ({ role: String(item.role || 'user'), content: String(item.content || '') }))
      .filter((item) => item.content.trim());
  },

  persistAgentConversation(store, session, mode = 'real') {
    if (session?.persist === false || session?.fork) return;
    if (!session?.messages?.length) return;
    store.realWorldAgentKvByMode = store.realWorldAgentKvByMode || {};
    store.realWorldAgentKvByMode[mode] = {
      messages: session.messages.map((item) => ({ role: String(item.role || 'user'), content: String(item.content || '') })),
      updatedAt: Date.now(),
      requestCount: Math.max(0, Math.round(Number(session.requestCount) || 0)),
    };
  },

  createDeepSeekKvCacheSession(store, config = this.realConfig()) {
    const providerId = window.GameModules.aiProvider?.currentProviderId?.();
    const mode = config.mode || 'real';
    const priorMessages = this.loadPersistedAgentMessages(store, mode);
    const deepseek = providerId === 'deepseek';
    if (!deepseek && !priorMessages.length) return null;
    return {
      id: `${mode}-kv-${Date.now()}-${++this.kvCacheSeq}`,
      providerId,
      enabled: true,
      trackCache: deepseek,
      messages: priorMessages.slice(),
      restoredMessageCount: priorMessages.length,
      requestCount: 0,
      promptCacheHitTokens: 0,
      promptCacheMissTokens: 0,
    };
  },

  withDeepSeekKvCacheSession(store, config = this.realConfig()) {
    if (Object.prototype.hasOwnProperty.call(config || {}, 'kvCacheSession')) return config;
    const session = this.createDeepSeekKvCacheSession(store, config);
    return session ? { ...config, kvCacheSession: session } : config;
  },

  promptToMessages(prompt) {
    return Array.isArray(prompt)
      ? prompt.map((msg) => ({ role: msg?.role || 'user', content: String(msg?.content || '') }))
      : [{ role: 'user', content: String(prompt || '') }];
  },

  messagesForDeepSeekKvCache(session, prompt) {
    if (!session) return null;
    const current = this.promptToMessages(prompt);
    if (!session.messages?.length) return current;
    return [...session.messages, ...current];
  },

  rememberDeepSeekKvCache(session, messages, assistantText = '', info = {}) {
    if (!session) return;
    if (session.trackCache) {
      const cache = info?.deepseekCache || {};
      session.promptCacheHitTokens += Number(cache.promptCacheHitTokens) || 0;
      session.promptCacheMissTokens += Number(cache.promptCacheMissTokens) || 0;
    }
    session.messages = [
      ...(Array.isArray(messages) ? messages : this.promptToMessages(messages)),
      { role: 'assistant', content: String(assistantText || '') },
    ];
    session.requestCount += 1;
  },

  inferReasoningPhase(config = {}) {
    if (config.reasoningPhase) return String(config.reasoningPhase);
    const promptId = String(config.promptId || config.firstTemplateId || '');
    const match = promptId.match(/inference-stage([1-5])/iu);
    if (match) return `stage${match[1]}`;
    if (config.guidedStep) return 'stage1';
    const sourceTitle = String(config.sourceTitle || '');
    if (sourceTitle.includes('场景锚定')) return 'stage2';
    if (sourceTitle.includes('Stage5') || sourceTitle.includes('盛装')) return 'stage5';
    if (sourceTitle.includes('Stage4') || sourceTitle.includes('滑动结算')) return 'stage4';
    if (config.streamToUi) return 'stage3';
    return '';
  },

  reasoningSectionMeta(config = {}) {
    const phase = this.inferReasoningPhase(config);
    const stage1Step = Math.max(1, Number(config.guidedStep) || 1);
    const stage4Attempt = Number(config.settlementAttempt);
    if (phase === 'stage1') {
      return { phase, step: stage1Step, label: `Stage1 - ${stage1Step}`, id: `stage1-${stage1Step}` };
    }
    if (phase === 'stage2') {
      return { phase, step: 0, label: 'Stage2', id: 'stage2' };
    }
    if (phase === 'stage3') {
      return { phase, step: 0, label: 'Stage3', id: 'stage3' };
    }
    if (phase === 'stage4') {
      const attempt = Number.isFinite(stage4Attempt) ? stage4Attempt : 0;
      return {
        phase,
        step: attempt,
        label: attempt > 0 ? `Stage4 - ${attempt + 1}` : 'Stage4',
        id: attempt > 0 ? `stage4-${attempt}` : 'stage4',
      };
    }
    if (phase === 'stage5') {
      return { phase, step: 0, label: 'Stage5', id: 'stage5' };
    }
    return { phase: 'unknown', step: 0, label: '未知阶段', id: `reasoning-${Date.now()}` };
  },

  reasoningStageGroupKey(meta = {}) {
    const phase = String(meta.phase || 'unknown');
    const step = Number(meta.step) || 0;
    if (phase === 'stage1') return `${phase}-${Math.max(1, step || 1)}`;
    if (phase === 'stage4') return `${phase}-${step}`;
    return phase;
  },

  parseReasoningLabel(label = '') {
    const match = String(label || '').trim().match(/^Stage\s*([1-4])(?:\s*[-–—]\s*(\d+))?/iu);
    if (!match) return null;
    const phase = `stage${match[1]}`;
    const step = Number(match[2]) || 0;
    if (phase === 'stage1') {
      const n = Math.max(1, step || 1);
      return { phase, step: n, label: `Stage1 - ${n}`, id: `stage1-${n}` };
    }
    if (phase === 'stage4' && step > 0) {
      return { phase, step, label: `Stage4 - ${step + 1}`, id: `stage4-${step}` };
    }
    return {
      phase,
      step,
      label: phase === 'stage2' ? 'Stage2' : phase === 'stage3' ? 'Stage3' : 'Stage4',
      id: phase === 'stage4' ? 'stage4' : phase,
    };
  },

  directReasoningSectionMeta(section = {}) {
    const id = String(section?.id || '');
    const storedPhase = String(section?.phase || '');
    const storedStep = Number(section?.step);
    if (storedPhase && storedPhase !== 'unknown') {
      const step = Number.isFinite(storedStep) ? storedStep : 0;
      if (storedPhase === 'stage1') {
        const n = Math.max(1, step || 1);
        return { phase: storedPhase, step: n, label: String(section?.label || `Stage1 - ${n}`), id: id || `stage1-${n}` };
      }
      if (storedPhase === 'stage4') {
        return { phase: storedPhase, step, label: String(section?.label || (step > 0 ? `Stage4 - ${step + 1}` : 'Stage4')), id: id || (step > 0 ? `stage4-${step}` : 'stage4') };
      }
      return {
        phase: storedPhase,
        step,
        label: String(section?.label || (storedPhase === 'stage2' ? 'Stage2' : storedPhase === 'stage3' ? 'Stage3' : 'Stage4')),
        id: id || storedPhase,
      };
    }
    const stage1Match = id.match(/^stage1-(?:step-)?(\d+)$/iu);
    if (stage1Match) {
      const step = Number(stage1Match[1]) || 1;
      return { phase: 'stage1', step, label: `Stage1 - ${step}`, id: `stage1-${step}` };
    }
    if (id === 'stage2') return { phase: 'stage2', step: 0, label: 'Stage2', id: 'stage2' };
    if (id === 'stage3') return { phase: 'stage3', step: 0, label: 'Stage3', id: 'stage3' };
    if (/^stage4(?:-attempt-|-)?(\d+)?$/iu.test(id) || id === 'stage4') {
      const attempt = Number(id.match(/(\d+)/u)?.[1]) || 0;
      return { phase: 'stage4', step: attempt, label: attempt > 0 ? `Stage4 - ${attempt + 1}` : 'Stage4', id: attempt > 0 ? `stage4-${attempt}` : 'stage4' };
    }
    return this.parseReasoningLabel(section?.label);
  },

  reasoningPipelineFromEntry(entry = {}) {
    const agentTrace = Array.isArray(entry?.agentTrace) ? entry.agentTrace : [];
    const steps = [];
    agentTrace.forEach((item, index) => {
      const step = Number(item?.step) || index + 1;
      if (!steps.includes(step)) steps.push(step);
    });
    if (!steps.length) steps.push(1);
    const pipeline = steps.map((step) => ({ phase: 'stage1', step, label: `Stage1 - ${step}`, id: `stage1-${step}` }));
    // Stage2 / Stage4 默认 JSON 模式，不产生深度思考；未知段落按流水线只补 Stage3。
    pipeline.push({ phase: 'stage3', step: 0, label: 'Stage3', id: 'stage3' });
    return pipeline;
  },

  assignReasoningSectionMetas(sections = [], entry = {}) {
    const pipeline = this.reasoningPipelineFromEntry(entry);
    const occupied = new Map();
    const assigned = [];

    const occupy = (meta, section) => {
      const key = this.reasoningStageGroupKey(meta);
      const sectionId = String(section?.id || '');
      const existing = occupied.get(key);
      if (existing && existing.sectionId && sectionId && existing.sectionId !== sectionId) return false;
      occupied.set(key, { sectionId, meta });
      assigned.push({ meta, section });
      return true;
    };

    const pending = [];
    (Array.isArray(sections) ? sections : []).forEach((section) => {
      const text = String(section?.text || '').trim();
      if (!text) return;
      const direct = this.directReasoningSectionMeta(section);
      if (direct && occupy(direct, section)) return;
      pending.push(section);
    });

    let pipeIdx = 0;
    pending.forEach((section) => {
      while (pipeIdx < pipeline.length && occupied.has(this.reasoningStageGroupKey(pipeline[pipeIdx]))) pipeIdx += 1;
      const meta = pipeIdx < pipeline.length
        ? { ...pipeline[pipeIdx++] }
        : { phase: 'unknown', step: assigned.length, label: String(section?.label || '现实推演'), id: String(section?.id || `legacy-${assigned.length}`) };
      occupy(meta, section);
    });

    return assigned;
  },

  reasoningSectionMetaFromStored(section = {}, index = 0, entry = {}) {
    const assigned = this.assignReasoningSectionMetas([section], entry);
    return assigned[0]?.meta || { phase: 'unknown', step: index, label: '现实推演', id: String(section?.id || `legacy-${index}`) };
  },

  patchConfiguredReasoning(store, logId, reasoningText = '', config = this.realConfig()) {
    const text = String(reasoningText || '').trim();
    if (!text || !logId) return;
    if (config.mode === 'story') {
      store.updateNovelEntry?.(logId, { thinking: text });
      return;
    }
    const entry = (store.realWorldLog || []).find((item) => item.id === logId) || window.GameModules.sqliteSave.getRealWorldLogEntry?.(logId) || {};
    const meta = this.reasoningSectionMeta(config);
    const key = String(config.reasoningKey || meta.id);
    const sections = this.mergeThinkingSection(entry, {
      id: key,
      phase: meta.phase,
      step: meta.step,
      label: meta.label,
      text,
      open: true,
      collapseOthers: Boolean(config.livePatch),
    });
    store.patchRealWorldLogEntry?.(logId, { thinkingSections: sections, thinking: this.joinThinkingSections(sections) }, { live: Boolean(config.livePatch) });
  },

  mergeThinkingSection(entry = {}, section = {}) {
    const sections = Array.isArray(entry.thinkingSections)
      ? entry.thinkingSections.map((item) => ({
        id: String(item?.id || ''),
        phase: String(item?.phase || ''),
        step: Number(item?.step) || 0,
        label: String(item?.label || '现实推演'),
        text: String(item?.text || ''),
        open: item?.open !== false,
      })).filter((item) => item.text.trim())
      : [];
    if (!sections.length && String(entry.thinking || '').trim()) {
      sections.push({ id: 'legacy-thinking', phase: 'unknown', step: 0, label: '现实推演', text: String(entry.thinking || '').trim(), open: true });
    }
    const next = {
      id: String(section.id || `reasoning-${Date.now()}`),
      phase: String(section.phase || ''),
      step: Number(section.step) || 0,
      label: String(section.label || '现实推演'),
      text: String(section.text || '').trim(),
      open: section.open !== false,
    };
    if (!next.text) return sections;
    const index = sections.findIndex((item) => item.id === next.id);
    if (index >= 0) {
      sections[index] = { ...sections[index], ...next, open: sections[index].open !== false || next.open !== false };
      return sections;
    }
    if (section.collapseOthers) sections.forEach((item) => { item.open = false; });
    sections.push(next);
    return sections;
  },

  joinThinkingSections(sections = []) {
    return (Array.isArray(sections) ? sections : [])
      .map((item) => String(item?.text || '').trim())
      .filter(Boolean)
      .join('\n\n');
  },

  deepSeekKvCacheSummary(session) {
    if (!session?.enabled) return null;
    return {
      promptCacheHitTokens: Math.max(0, Math.round(Number(session.promptCacheHitTokens) || 0)),
      promptCacheMissTokens: Math.max(0, Math.round(Number(session.promptCacheMissTokens) || 0)),
      requestCount: Math.max(0, Math.round(Number(session.requestCount) || 0)),
    };
  },

  async runConfigured(store, action, logId = null, config = this.realConfig()) {
    config = this.withDeepSeekKvCacheSession(store, config);
    const ctx = config.ctx;
    if (!ctx) throw new Error(`${config.label || 'Loop'}上下文未加载`);
    const loaded = [];
    const trace = [];
    const loadedKeys = new Set();
    const memoryIds = new Set();
    const skills = await ctx.skillText(store);
    const base = ctx.baseSnapshot(store, action);
    const materialSession = config.materials?.createSession?.(action) || null;
    let lastPrompt = '';
    let lastRaw = '';
    let lastGuidance = null;

    const guidedMaxSteps = this.guidedMaxSteps(store, config);
    for (let step = 1; step <= guidedMaxSteps; step += 1) {
      const prompt = await this.buildConfiguredPrompt({ store, action, base, loaded, skills, step, materialSession, config, guidance: lastGuidance, logId });
      lastPrompt = prompt;
      this.markConfiguredStep(store, logId, this.stepText(step, config), config);
      const raw = await this.completeConfiguredParsedStep(store, prompt, logId, false, false, { ...config, guidedStep: step }, step > 1);
      lastRaw = raw.raw;
      const data = raw.data;
      if (!data) throw new Error(`${config.label || 'Loop'}返回格式错误`);
      lastGuidance = data;
      const traceItem = this.traceItem(step, data, raw.raw, ctx);
      trace.push(traceItem);

      const results = await this.loadStepContext(ctx, store, action, data, loadedKeys, loaded, memoryIds, step, materialSession, config.materials);
      traceItem.loaded = results.map((item) => ({ title: item.title, text: ctx.limit(item.text, 800) }));
      this.updateConfiguredTrace(store, logId, trace, config);
      if (results.length) {
        loaded.push(...results);
        this.markConfiguredStep(store, logId, this.loadedContextText(data, results, step, config), config);
      }

      if (data.type === 'request_context' && step < guidedMaxSteps) continue;
      if (step < this.minSteps && data.type !== 'context_done') continue;
      break;
    }
    const final = await this.generateConfiguredFinal({ store, action, base, loaded, skills, trace, materialSession, logId, prompt: lastPrompt, raw: lastRaw, config });
    this.persistAgentConversation(store, config.kvCacheSession, config.mode);
    return final;
  },

  async generatePhasedFinal(args) {
    return await this.generateConfiguredFinal({ ...args, config: this.realConfig() });
  },

  async generateConfiguredFinal({ store, action, base, loaded, skills, trace, materialSession, logId, config = this.realConfig() }) {
    const effectiveSceneLayers = this.resolveEffectiveSceneLayers(trace, store, config);
    const sceneAnchorPrompt = await this.buildConfiguredSceneAnchorPrompt({ store, action, base, loaded, trace, effectiveSceneLayers, materialSession, config });
    this.markConfiguredStep(store, logId, `${config.label}资料已载入，正在生成场景锚定报告…`, config);
    const sceneAnchor = await this.completeSceneAnchorReport(store, sceneAnchorPrompt, logId, config);
    const sceneAnchorReport = sceneAnchor.text;
    const narrationPrompt = await this.buildConfiguredNarrationPrompt({ store, action, base, loaded, skills, materialSession, sceneAnchorReport, config });
    const narrationMessages = this.buildConfiguredNarrationMessages({ store, action, prompt: narrationPrompt, config });
    this.markConfiguredStep(store, logId, `${config.label}场景锚定完成，正在生成正文…`, config);
    const narrationRaw = await this.completeConfiguredStep(store, narrationMessages, logId, true, { ...config, promptId: config.templateId, streamToUi: true });
    const narration = await this.ensureConfiguredNarrationLength(store, action, narrationPrompt, this.cleanPhasedNarration(narrationRaw), logId, config);
    if (!narration) throw new Error(`${config.label}正文为空`);
    this.showConfiguredNarration(store, logId, narration, config);

    const postStage3Checkpoint = this.snapshotKvMessages(config.kvCacheSession);
    const stage5KvConfig = {
      ...config,
      kvCacheSession: this.forkKvCacheSession(config.kvCacheSession, postStage3Checkpoint),
    };

    let settlementPrompt = 'Stage4 紧凑 JSON 滑动结算', settlementRaw = '', updates = {}, profilePatches = [];
    const participants = this.mergeNarrationParticipants(this.stageParticipants(effectiveSceneLayers, loaded, store), narration, store, sceneAnchor.data);
    try {
      this.markConfiguredStep(store, logId, `${config.label}正文已完成，正在并行结算与盛装外观更新…`, config, { keepNarration: true });
      const stage4Promise = (async () => {
        try {
          const settled = await this.completeConfiguredSettlementKvWindow({ store, action, base, loaded, skills, materialSession, narration, trace, participants, logId, config });
          return { ...settled, type: settled.type || 'final' };
        } catch (err) {
          console.warn(`${config.label}状态更新生成失败，保留已生成正文并使用最小结算:`, err.message);
          return this.fallbackUpdateJson(store, action, config);
        }
      })();
      const stage5 = window.GameModules.realWorldProfileStage5;
      const stage5Result = stage5?.runParallelWithStage4
        ? await stage5.runParallelWithStage4({ store, narration, participants, logId, config: stage5KvConfig, loop: this, stage4Promise })
        : { updates: await stage4Promise, patches: [], skipped: true };
      updates = stage5Result.updates || await stage4Promise;
      updates = { ...updates, type: updates.type || 'final' };
      profilePatches = Array.isArray(stage5Result.patches) ? stage5Result.patches : [];
      settlementPrompt = 'Stage4 紧凑 JSON 滑动结算 + Stage5 盛装外观（并行）';
      settlementRaw = JSON.stringify({ settlement: updates, stage5Gate: stage5Result.gate || null, profilePatches: profilePatches.map((item) => ({ subject: item.subject, parts: item.parts })) });
    } catch (err) {
      console.warn(`${config.label}并行结算失败，保留已生成正文并使用最小结算:`, err.message);
      updates = this.fallbackUpdateJson(store, action, config);
      settlementRaw = JSON.stringify(updates);
    }
    const resultPayload = { ...updates, profilePatches };
    const result = config.mode === 'story' ? this.mergeStoryNarrationAndUpdates(store, narration, resultPayload, config) : this.mergeNarrationAndUpdates(store, narration, resultPayload, config);
    const anchoredTrace = trace.map((item, index) => index === trace.length - 1 ? { ...item, anchorReport: sceneAnchor.data } : item);
    return { result, prompt: `---SCENE_ANCHOR---\n${sceneAnchorPrompt}\n\n---NARRATION---\n${narrationPrompt}\n\n---SETTLEMENT_JSON---\n${settlementPrompt}`, loaded, raw: `${sceneAnchor.raw}\n\n${narrationRaw}\n\n${settlementRaw}`, trace: anchoredTrace, deepseekCache: this.deepSeekKvCacheSummary(config.kvCacheSession) };
  },

  async loadStepContext(ctx, store, action, data, loadedKeys, loaded, memoryIds, step, materialSession = null, materials = window.GameModules.realWorldMaterials) {
    const out = [];
    if (data.type === 'request_context') {
      const autoLoaded = await ctx.autoLoadForStep?.(store, action, loadedKeys, materialSession, materials, memoryIds, step, loaded, out) || [];
      out.push(...autoLoaded);
      const load = async (requests, limit) => {
        if (!Array.isArray(requests) || !requests.length) return [];
        return await ctx.loadRequests(store, action, requests, loadedKeys, materialSession, materials, memoryIds, loaded, out, { limit, step });
      };
      const profileRequests = ctx.participantProfileRequests?.(data, { store, mode: data.mode }) || [];
      out.push(...await load(profileRequests, 3));
      const anchorRequests = data.sceneQueriesAreReasons ? [] : (ctx.sceneAnchorRequests?.(data, store, { mode: data.mode }) || []);
      out.push(...await load(anchorRequests, 4));
      const requestList = Array.isArray(data.requests) && data.requests.length ? data.requests : (Array.isArray(data.needed) ? data.needed : []);
      out.push(...await load(requestList, 2));
    }
    const locationItem = await ctx.actionLocationForStep?.(store, action, data.characters || data.relatedCharacters || [], data.reason || '', loadedKeys);
    if (locationItem?.text) {
      materials?.record?.(materialSession, { skill: 'realworld.location.query', method: 'searchLocation', params: { keyword: 'autoCharacterRoute' } }, locationItem.title, locationItem.text);
      out.push(locationItem);
    }
    const memoryItem = ctx.characterMemoriesForStep?.(store, action, data.characters || data.relatedCharacters || [], [...loaded, ...out], memoryIds, step === 1);
    if (memoryItem?.text) {
      (memoryItem.ids || []).forEach((id) => memoryIds.add(id));
      materials?.record?.(materialSession, { skill: 'memory.query', method: 'searchCharacterMemory', params: { keyword: 'characterMemoriesForStep' } }, memoryItem.title, memoryItem.text);
      out.push(memoryItem);
    }
    return out;
  },

  async buildPrompt(args) {
    return await this.buildConfiguredPrompt({ ...args, config: this.realConfig() });
  },

  async buildConfiguredPrompt({ store, action, base, loaded, skills, step, materialSession = null, forceFinal = false, config = this.realConfig(), guidance = null, logId = null }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.materials?.summary?.(materialSession, { step }) || '';
    const randomOptions = { mode: config.mode };
    ['forcedParticipants', 'priorityCandidates', 'dramaCandidates', 'forbiddenParticipants'].forEach((key) => {
      if (Array.isArray(guidance?.[key])) randomOptions[key] = guidance[key];
    });
    const randomActiveCandidates = !forceFinal ? (config.ctx.randomActiveEventCandidates?.(store, action, randomOptions) || []) : [];
    const randomActiveCandidateText = randomActiveCandidates.length
      ? randomActiveCandidates.map((item, index) => `${index + 1}. ${item.name || item.id}`).join('；')
      : '无';
    const commonVars = {
      本次行动: actionText,
      当前步骤: forceFinal ? '收敛/final' : this.guidedStepText(store, step, config),
      最大步骤: this.guidedMaxStepText(store, config),
      推演自由度规则: config.mode === 'story' ? this.storyFreedomRule(store) : (store.realWorldFreedomRule?.() || '推演自由度：行动范围内。只推演玩家本次输入行动自然抵达的直接结果。'),
      当前步骤输出要求: this.stepOutputRule(step, forceFinal),
      随机场外角色候选: randomActiveCandidateText,
      ['\u8d44\u6599\u8fed\u4ee3\u9650\u5236\u89c4\u5219']: this.stage1IterationRule(store),
    };
    if (!forceFinal) {
      const stage1RoutingContext = config.ctx.buildStage1RoutingContext?.({ store, action: actionText, loaded, materialSession, config }) || [
        `模式：${config.label}`,
        `本次行动：${actionText}`,
        '已加载资料摘要：无',
        '可请求资料目录：无',
      ].join('\n');
      const previousGuidance = this.previousGuidanceSummary(guidance);
      const loadedRoutingSummary = config.ctx.loadedRoutingSummary?.(loaded) || '无';
      const materialCatalog = config.ctx.stage1MaterialCatalogText?.(config.mode) || '无';
      const rulesText = [
        '# Stage1 查询规划：紧凑 JSON 资料路由',
        '任务：只输出一个合法 JSON 对象，不输出中文 K:V、Markdown、正文或解释。',
        '你只负责判断本次行动生成正文前还需要哪些已有资料；不得写正文，不得锚定场景，不得结算状态，不得推进后续结果。',
        '资料请求规则：',
        '- 使用中文资料请求，不得输出英文 skill/method。',
        '- 资料请求最多 Top3；超过 Top3 的候选必须丢弃，不得输出资料请求4或更多编号。',
        '- 角色卡请求只代表可作为参考资料；不得因此把角色写入强制出场。',
        '- 已加载资料摘要已经覆盖的人物、地点、路线不得重复请求。',
        '- 不得请求衣着、鞋袜、随身物品等细节；这些细节不属于本阶段必要资料。',
        '- 不得照抄示例中的占位词；角色全称、世界全称、地点全称、人物全称、作品全称都必须替换为本次行动中的真实名称。',
        '- 资料请求示例：资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界',
        '- 资料请求示例：资料请求1：地点查询，查询附近地点，锦苑小区3栋2单元',
        '- 资料请求示例：资料请求1：作品设定查询，搜索人物，阿尔托莉雅·潘德拉贡，Fate/stay night',
        '随机事件规则：',
        '- 随机主动事件默认是场外背景，不自动入场。',
        '- 随机场外角色候选不等于禁止出场；不得仅因角色出现在随机场外角色候选中，就写入禁止出场。',
        '- 若随机角色已在强制出场、高优先候选、戏剧候选或禁止出场中，必须移除该随机事件。',
        '- 无明确自然闯入条件时，随机事件闯入条件必须写“无明确条件则禁止闯入”。',
        '出场边界规则：',
        '- 本轮必须基于上一轮查询规划摘要继续收敛；若候选层发生变化，以本轮字段作为当前判断，不要无理由重置候选层。',
        '- 玩家/当前被控主体由系统最终兜底为强制出场；强制出场允许多人，表示本次行动必然涉及、出现、回应或受影响的人物集合。',
        '- 不强制出场不等于禁止出场；禁止出场只用于明确场外、明确不可到达或被用户/资料规则明确禁止进入当前场景的角色。',
        '- 同地点/同住/相邻候选不得仅因未强制出场而写入禁止出场；可按相关性放入高优先候选或戏剧候选，或写“无”。',
        '- 玩家行动明确目标不得写入禁止出场，除非已加载资料明确显示其场外、不可到达或被规则禁止进入当前场景。',
      ].join('\n');
      const contextText = [
        `本次行动：${actionText}`,
        `当前步骤：${commonVars.当前步骤} / ${commonVars.最大步骤}`,
        '路由上下文：',
        stage1RoutingContext,
        '本轮上一轮查询规划摘要（同轮 Stage1 步骤间）：',
        previousGuidance,
        '已加载资料摘要：',
        loadedRoutingSummary,
        '可请求资料目录：',
        materialCatalog,
        '推演自由度规则：',
        commonVars.推演自由度规则,
        `随机场外角色候选：${randomActiveCandidateText}`,
      ].join('\n');
      const requestText = [
        '当前步骤输出要求：',
        commonVars.当前步骤输出要求,
        '固定输出规则：',
        '- 只输出一个紧凑 JSON 对象，首字符必须是 {，末字符必须是 }。',
        '- 不要 Markdown，不要 ```json 代码块，不要换行解释。',
        '- status 只能二选一：资料已足够 / 继续请求资料。',
        '- sceneQueries.location / sceneQueries.causality / sceneQueries.conflict 必须是字符串数组；没有则 []。',
        '- 若 status 为“继续请求资料”，优先输出 materialRequests，最多 3 条；没有可执行资料请求时 materialRequests 输出 []，但必须保留 sceneQueries 理由或明确参与者候选。',
        this.stage1IterationRule(store),
        '- participants.forced / priority / drama / forbidden 都必须是字符串数组；没有则 []。',
        '- randomEvents 必须是字符串数组；randomIntrusionCondition 没有明确条件时写“无明确条件则禁止闯入”。',
        '- 资料请求只能使用中文结构，不得输出英文 skill/method。',
        'JSON schema：',
        '{"plan":"查询规划摘要","status":"继续请求资料|资料已足够","sceneQueries":{"location":["地点查询理由"],"causality":["因果查询理由"],"conflict":["冲突查询理由"]},"participants":{"forced":["姓名"],"priority":["姓名"],"drama":["姓名"],"forbidden":["姓名"]},"randomEvents":["候选事件"],"randomIntrusionCondition":"无明确条件则禁止闯入","materialRequests":["角色查询，搜索角色卡，刘思琪，2026现代都市现实世界"]}',
        '【AI自检】：',
        '- 输出前必须自检 status 与 materialRequests、sceneQueries、participants 是否一致。',
        '- 若 materialRequests、sceneQueries、participants.forced、participants.priority、participants.drama 全为空，status 必须为“资料已足够”。',
        '- 不得输出旧 K:V 字段，例如“资料状态：”“资料请求1：”。',
      ].join('\n');
      return [
        { role: 'user', content: rulesText },
        { role: 'assistant', content: contextText },
        { role: 'user', content: requestText },
      ];
    }
    return this.renderPrompt(config.templateId, {
      ...commonVars,
      基础上下文: base,
      动态载入资料: [loadedText, materialText].filter(Boolean).join('\n\n'),
      动态Skills: skills,
    });
  },

  guidedMaxSteps(store = {}, config = this.realConfig()) {
    if (!store?.settingsState?.stage1MaterialIterationLimited) return this.maxSteps;
    const configured = Math.max(1, Math.min(8, Math.round(Number(store?.settingsState?.stage1MaterialMaxIterations) || 2)));
    return configured;
  },

  guidedMaxStepText(store = {}, config = this.realConfig()) {
    return store?.settingsState?.stage1MaterialIterationLimited ? String(this.guidedMaxSteps(store, config)) : '不限制';
  },

  guidedStepText(store = {}, step, config = this.realConfig()) {
    return `${step}/${this.guidedMaxStepText(store, config)}`;
  },

  stage1IterationRule(store = {}) {
    if (!store?.settingsState?.stage1MaterialIterationLimited) {
      return '- 资料收集迭代默认不限制；只要仍有必要且有可执行资料请求，可以继续请求资料。若资料足够、无法继续获取或请求开始重复，必须进入场景锚定。';
    }
    const max = Math.max(1, Math.min(8, Math.round(Number(store?.settingsState?.stage1MaterialMaxIterations) || 2)));
    return `- 最多${max}步后进入场景锚定；第${max}步不得为了重复确认而继续扩展资料循环。`;
  },

  storyFreedomRule(store) {
    return store.online ? '操控剧情自由度：玩家输入是本回合对被操控者身体或行动方向的控制；正文只能推进到本次行动自然抵达的结果点，不替玩家完成后续长期行动。' : '离线剧情自由度：玩家输入是建议或态度；角色按性格、记忆、处境自主行动。';
  },

  stepOutputRule(step, forceFinal = false) {
    if (forceFinal) {
      return '当前为收敛步骤：禁止继续请求资料。只输出一个紧凑 JSON 对象；status 必须为“资料已足够”，materialRequests 必须为 []，sceneQueries 与 participants 按已确认事实填写；不得输出正文、旁白、Markdown、代码块或 final JSON。';
    }
    if (step === 1) {
      return '当前是第1步：你是上下文路由器，只判断为了准确生成本次行动范围内正文需要载入哪些已有资料，并尽可能多而全地列出 sceneQueries 中的地点/因果/冲突查询理由。只输出 Stage1 JSON schema；不要写正文，不要结算状态，不要推演后续结果。';
    }
    if (step >= 2) {
      return `当前是第${step}步/后续资料路由步骤：继续使用 Stage1 JSON schema 收敛资料需求。达到设置的资料收集迭代最大次数后，系统会带着已加载资料与 sceneQueries 进入场景锚定；若没有可执行 materialRequests，允许 materialRequests 为 [] 但保留 sceneQueries 或 participants 候选。不要输出中文 K:V、正文、旁白、Markdown、代码块和 final JSON。`;
    }
    return '当前只负责判断是否继续收集资料：只输出 Stage1 JSON schema。仍缺关键资料就写 status“继续请求资料”并列出 materialRequests；资料足够或无法继续获取时写 status“资料已足够”且 materialRequests 为 []。不要输出中文 K:V、正文、旁白、Markdown、代码块和 final JSON。';
  },

  stage1JsonRetryInstruction(err = {}, semanticSelfCheckFailed = false) {
    const droppedSummary = this.summarizeDroppedMaterialRequests(err.parseResult?.droppedMaterialRequests || []);
    const parseDetail = err.parseResult
      ? `score=${err.parseResult.score}/${err.parseResult.maxScore} successRate=${err.parseResult.successRate} missing=${err.parseResult.missing?.join('、') || '无'} droppedMaterialRequests=${droppedSummary}`
      : '';
    return [
      `上次 Stage1 JSON ${semanticSelfCheckFailed ? '语义自检失败' : '解析失败'}：${err.message}${parseDetail ? `（${parseDetail}）` : ''}`,
      `已确认字段：${err.parseResult?.keyHits?.join('、') || '无'}`,
      `已确认字段值：\n${this.confirmedKvValuesText(err.parseResult)}`,
      `缺失字段：${err.parseResult?.missing?.join('、') || '未知'}`,
      `已丢弃资料请求：${droppedSummary}`,
      '请重新输出完整 Stage1 JSON 对象；必须保留已确认字段值，只补齐或修正缺失/错误字段；不得删除用户明确约束、forbidden 或已确认 forced；不要重复输出已丢弃 materialRequests。',
      '【AI自检】若 status 为“继续请求资料”，优先输出最多 3 条 materialRequests 或明确 participants 候选；若没有可执行 materialRequests，必须保留尽可能多而全的 sceneQueries，系统会带着这些理由进入场景锚定。不得输出中文 K:V 或旧字段“资料状态：”“资料请求1：”。',
    ].join('\n\n');
  },

  previousGuidanceSummary(guidance = null) {
    const ctx = window.GameModules.realWorldAgentContext;
    if (ctx?.stage1GuidanceSummary) return ctx.stage1GuidanceSummary(guidance);
    if (!guidance) return '无';
    const names = (group = [], reasonLabel = '理由') => (Array.isArray(group) ? group : []).map((item) => {
      const name = item.name || item.idOrName || item.id || item.characterName;
      return `${name}${item.reason ? `（${reasonLabel}：${item.reason}）` : ''}`;
    }).join('、') || '无';
    const random = (Array.isArray(guidance.randomActiveEvents) ? guidance.randomActiveEvents : [])
      .map((item) => `${item.characterName || item.name}：${item.eventType || item.actionMethod || '背景行动'}｜${item.motivation || item.reason || ''}`)
      .join('；') || '无';
    const queryReasons = (label, key) => {
      const items = [...new Set(Array.isArray(guidance.sceneQueries?.[key]) ? guidance.sceneQueries[key] : [])];
      return items.length ? items.map((item, index) => `${label}${index + 1}：${item}`).join('\n') : `${label}1：无`;
    };
    return [
      `资料状态：${guidance.type === 'context_done' ? '资料已足够' : '继续请求资料'}`,
      queryReasons('地点查询理由', 'location'),
      queryReasons('因果查询理由', 'causality'),
      queryReasons('冲突查询理由', 'conflict'),
      `强制出场：${names(guidance.forcedParticipants, '出场理由')}`,
      `高优先候选：${names(guidance.priorityCandidates, '候选理由')}`,
      `戏剧候选：${names(guidance.dramaCandidates, '候选理由')}`,
      `禁止出场：${names(guidance.forbiddenParticipants, '不在场理由')}`,
      `随机主动事件：${random}`,
      `随机事件闯入条件：${guidance.randomIntrusionCondition || '无明确条件则禁止闯入'}`,
    ].join('\n');
  },

  async buildNarrationPrompt(args) {
    return await this.buildConfiguredNarrationPrompt({ ...args, config: this.realConfig() });
  },

  actionText(action, fallback = '') {
    if (action && typeof action === 'object') return String(window.GameModules.ai?.choiceText?.(action) || '').trim() || fallback;
    const text = String(action || '').trim();
    if (!text || /^\[object Object\]?$/u.test(text) || /^(?:undefined|null)$/iu.test(text) || /^[\[{][\s\S]*[\]}]$/u.test(text)) return fallback;
    return text;
  },

  continuityFallbackRule() {
    return '连续性兜底规则（最高优先级）：如果“本次行动”为空、无效、明显是 [object Object]、undefined、null、JSON对象或无法解释为玩家意图，则不要另起新场景，不要发明新行动；应把本次行动视为“继续承接最近世界线”，严格从最近世界线最后一幕、当前人物位置、动作状态和对话状态自然续写。若本次行动是有效自然语言，即使与前文弱相关，也必须先承接当前场景，再自然执行该行动。';
  },

  invisibleCharsPattern() {
    return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/gu;
  },

  compactAiReturn(text = '', options = {}) {
    const raw = String(text || '')
      .replace(this.invisibleCharsPattern(), '')
      .replace(/```(?:json)?|```/giu, '')
      .trim();
    if (!raw) return '';
    if (options.json) return this.compactJsonWhitespace(raw);
    return raw.replace(/[\r\n\t]+/gu, '').replace(/ {2,}/gu, ' ').trim();
  },

  compactJsonWhitespace(text = '') {
    const raw = String(text || '').trim();
    if (!raw) return '';
    try {
      const extracted = window.GameModules.jsonUtils?.extractJson ? window.GameModules.jsonUtils.extractJson(raw) : raw;
      const repaired = window.GameModules.jsonUtils?.repairJson ? window.GameModules.jsonUtils.repairJson(extracted) : extracted;
      return JSON.stringify(JSON.parse(repaired));
    } catch (_) {
      return raw.replace(/[\r\n\t]+/gu, '').trim();
    }
  },

  compactJsonReturn(text = '') {
    return this.compactAiReturn(text, { json: true });
  },

  compactReturnRule() {
    return '返回必须紧凑：不要Markdown、不要标题、不要任务说明、不要换行符、不要制表符、不要不可见字符，只输出单行正文文本。';
  },

  participantDisplayName(item = {}) {
    if (typeof item === 'string') return item.trim();
    return String(item?.name || item?.characterName || item?.idOrName || item?.id || '').trim();
  },

  participantKey(item = {}) {
    if (typeof item === 'string') return item.trim();
    return String(item?.id || item?.idOrName || item?.name || item?.characterName || '').trim();
  },

  dedupeParticipants(items = [], options = {}) {
    const seen = new Set();
    const blockedNames = options.blockedNames || new Set();
    return (Array.isArray(items) ? items : []).filter((item) => {
      const name = this.participantDisplayName(item);
      const key = this.participantKey(item) || name;
      if (!name || blockedNames.has(name) || blockedNames.has(key) || seen.has(key) || seen.has(name)) return false;
      seen.add(key);
      seen.add(name);
      return true;
    });
  },

  currentForcedParticipants(store = null, config = this.realConfig()) {
    const forced = [this.currentPlayerParticipant(store)];
    const shared = store?.sharedControlState?.();
    const sharedName = String(shared?.profile?.name || shared?.name || '').trim();
    const sharedId = String(shared?.id || shared?.characterId || sharedName || '').trim();
    if (sharedName || sharedId) {
      forced.push({
        type: 'character',
        id: sharedId || sharedName,
        name: sharedName || sharedId,
        role: config?.mode === 'story' ? 'controlled-subject' : 'shared-control-subject',
        canSettle: true,
        reason: '玩家当前控制主体',
      });
    }
    return this.dedupeParticipants(forced);
  },

  latestLayer(items = [], key) {
    for (let i = items.length - 1; i >= 0; i -= 1) {
      if (Array.isArray(items[i]?.[key])) return items[i][key];
    }
    return [];
  },

  isEffectiveSceneLayers(value = null) {
    return !!value && !Array.isArray(value) && ['forcedParticipants', 'priorityCandidates', 'dramaCandidates', 'forbiddenParticipants', 'randomActiveEvents'].some((key) => Array.isArray(value?.[key]));
  },

  resolveEffectiveSceneLayers(trace = [], store = null, config = this.realConfig()) {
    const items = Array.isArray(trace) ? trace : (trace ? [trace] : []);
    const forcedBase = this.latestLayer(items, 'forcedParticipants').map((item) => ({ ...item, role: item.role || 'forced', canSettle: item.canSettle === false ? false : true }));
    const systemForced = this.currentForcedParticipants(store, config).map((item) => ({ ...item, role: item.role || 'actor', canSettle: true, reason: item.reason || '系统固定强制出场' }));
    const forcedParticipants = this.dedupeParticipants([...forcedBase, ...systemForced]);
    const forcedNames = new Set(forcedParticipants.flatMap((item) => [this.participantDisplayName(item), this.participantKey(item)]).filter(Boolean));

    const forbiddenRaw = this.latestLayer(items, 'forbiddenParticipants').map((item) => ({ ...item, role: item.role || 'forbidden', canLoadRoleCard: false, canEnterNarration: false, canSettle: false }));
    const forbiddenParticipants = this.dedupeParticipants(forbiddenRaw, { blockedNames: forcedNames });
    const forbiddenNames = new Set(forbiddenParticipants.flatMap((item) => [this.participantDisplayName(item), this.participantKey(item)]).filter(Boolean));

    const priorityBlocked = new Set([...forcedNames, ...forbiddenNames]);
    const priorityCandidates = this.dedupeParticipants(this.latestLayer(items, 'priorityCandidates').map((item) => ({ ...item, role: item.role || 'priority-candidate', canSettle: false })), { blockedNames: priorityBlocked });
    const priorityNames = new Set(priorityCandidates.flatMap((item) => [this.participantDisplayName(item), this.participantKey(item)]).filter(Boolean));

    const dramaBlocked = new Set([...priorityBlocked, ...priorityNames]);
    const dramaCandidates = this.dedupeParticipants(this.latestLayer(items, 'dramaCandidates').map((item) => ({ ...item, role: item.role || 'drama-candidate', canSettle: false })), { blockedNames: dramaBlocked });
    const dramaNames = new Set(dramaCandidates.flatMap((item) => [this.participantDisplayName(item), this.participantKey(item)]).filter(Boolean));

    const randomBlocked = new Set([...dramaBlocked, ...dramaNames]);
    const randomActiveEvents = this.dedupeParticipants(this.latestLayer(items, 'randomActiveEvents'), { blockedNames: randomBlocked });
    const latestCondition = [...items].reverse().find((item) => item?.randomIntrusionCondition)?.randomIntrusionCondition || '无明确条件则禁止闯入';
    const query = (key) => [...new Set(items.flatMap((item) => Array.isArray(item?.sceneQueries?.[key]) ? item.sceneQueries[key] : []))];

    return {
      forcedParticipants,
      priorityCandidates,
      dramaCandidates,
      forbiddenParticipants,
      randomActiveEvents,
      randomIntrusionCondition: latestCondition,
      sceneQueries: { location: query('location'), causality: query('causality'), conflict: query('conflict') },
    };
  },

  sceneLayerSummary(trace = [], store = null, config = this.realConfig()) {
    const layers = this.isEffectiveSceneLayers(trace) ? trace : this.resolveEffectiveSceneLayers(trace, store, config);
    const names = (group = [], reasonLabel = '理由') => group.map((item) => {
      const name = item.name || item.idOrName || item.id || item.characterName;
      return `${name}${item.reason ? `（${reasonLabel}：${item.reason}）` : `（${reasonLabel}：需在场景锚定中明确）`}`;
    }).join('、') || '无';
    const random = (layers.randomActiveEvents || []).map((item) => `${item.characterName || item.name}：${item.eventType || item.actionMethod || '背景行动'}｜${item.motivation || item.reason || ''}`).join('；') || '无';
    const query = (label, key) => {
      const items = [...new Set(Array.isArray(layers.sceneQueries?.[key]) ? layers.sceneQueries[key] : [])];
      return items.length ? items.map((item, index) => `${label}${index + 1}：${item}`).join('\n') : `${label}1：无`;
    };
    return [`强制出场：${names(layers.forcedParticipants, '出场理由')}`, `高优先候选：${names(layers.priorityCandidates, '出场或不出场理由')}`, `戏剧候选：${names(layers.dramaCandidates, '出场或不出场理由')}`, `禁止出场：${names(layers.forbiddenParticipants, '不出场理由')}`, query('地点查询理由', 'location'), query('因果查询理由', 'causality'), query('冲突查询理由', 'conflict'), `随机主动事件：${random}`, `随机事件闯入条件：${layers.randomIntrusionCondition || '无明确条件则禁止闯入'}`].join('\n');
  },

  async buildConfiguredSceneAnchorPrompt({ store, action, base, loaded, trace = [], effectiveSceneLayers = null, materialSession = null, config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const layers = effectiveSceneLayers || this.resolveEffectiveSceneLayers(trace, store, config);
    const anchorContext = config.ctx.buildSceneAnchorContext?.({ store, action: actionText, loaded, trace, effectiveSceneLayers: layers, materialSession, config }) || [
      `模式：${config.label}`,
      `本次行动：${actionText}`,
      `参与者边界：\n${this.sceneLayerSummary(layers, store, config)}`,
    ].join('\n');
    const body = await this.renderPrompt('inference-stage2-scene-anchor', {
      模式标签: config.label,
      本次行动: actionText,
      场景锚定上下文: anchorContext,
      紧凑返回规则: this.compactReturnRule('prose'),
    });
    return body;
  },

  parseSceneAnchorReport(raw, config = this.realConfig()) {
    const jsonData = this.parseSceneAnchorJson(raw, config);
    if (jsonData) return jsonData;
    const parsed = this.parseChineseKvBlock(raw, this.sceneAnchorFields(), { config });
    const hardAnchors = ['当前地点', '当前时间', '空间状态', '当前动作'];
    const missingHardAnchor = hardAnchors.some((key) => !String(parsed.values?.[key] || '').trim());
    if (parsed.successRate < 0.8 || missingHardAnchor) throw new Error('场景锚定报告解析错误请重试');
    const v = parsed.values;
    this.assertSceneParticipantBoundary(v);
    const currentSceneImpactObjects = v['当前场景影响对象'] || '';
    const orderedText = this.sceneAnchorFields().map((key) => `${key}：${v[key] || ''}`).join('\n');
    return { text: orderedText, currentLocation: v['当前地点'] || '', currentTime: v['当前时间'] || '', writingFocus: v['正文写作重点'] || '', currentSceneImpactObjects, settlementBoundary: currentSceneImpactObjects, values: v, parseScore: { score: parsed.score, maxScore: parsed.maxScore, successRate: parsed.successRate }, parseDegraded: parsed.successRate < 1 };
  },

  parseSceneAnchorJson(raw, config = this.realConfig()) {
    const data = this.parseCompactSettlementJson(raw);
    if (!data || Array.isArray(data) || typeof data !== 'object') return null;
    const pick = (...keys) => {
      for (const key of keys) {
        const value = data[key];
        const text = this.sceneAnchorJsonText(value);
        if (text) return text;
      }
      return '';
    };
    const impactValue = data.currentSceneImpactObjects ?? data.impactObjects ?? data.settlementBoundary ?? data['当前场景影响对象'];
    const sceneImpactObjects = this.sceneAnchorImpactGroups(impactValue);
    const values = {
      '场景锚定报告': pick('sceneAnchorReport', 'report', '场景锚定报告'),
      '当前地点': pick('currentLocation', 'location', '当前地点'),
      '当前时间': pick('currentTime', 'time', '当前时间'),
      '空间状态': pick('spatialState', 'spaceState', '空间状态'),
      '当前动作': pick('currentAction', 'action', '当前动作'),
      '强制出场': pick('forcedParticipants', 'forced', '强制出场'),
      '高优先候选': pick('priorityCandidates', 'priority', '高优先候选'),
      '戏剧候选': pick('dramaCandidates', 'drama', '戏剧候选'),
      '禁止出场': pick('forbiddenParticipants', 'forbidden', '禁止出场'),
      '随机事件影响': pick('randomEventImpact', 'randomEvent', '随机事件影响'),
      '正文写作重点': pick('writingFocus', 'focus', '正文写作重点'),
      '当前场景影响对象': this.sceneAnchorJsonText(impactValue) || pick('currentSceneImpactObjects', 'impactObjects', 'settlementBoundary', '当前场景影响对象'),
    };
    const hardAnchors = ['当前地点', '当前时间', '空间状态', '当前动作'];
    const missingHardAnchor = hardAnchors.some((key) => !String(values[key] || '').trim());
    if (missingHardAnchor || !values['正文写作重点'] || !values['当前场景影响对象']) throw new Error('场景锚定报告解析错误请重试');
    this.assertSceneParticipantBoundary(values);
    const orderedText = this.sceneAnchorFields().map((key) => `${key}：${values[key] || ''}`).join('\n');
    const currentSceneImpactObjects = values['当前场景影响对象'] || '';
    return { text: orderedText, currentLocation: values['当前地点'] || '', currentTime: values['当前时间'] || '', writingFocus: values['正文写作重点'] || '', currentSceneImpactObjects, settlementBoundary: currentSceneImpactObjects, sceneImpactObjects, values, parseScore: { score: this.sceneAnchorFields().length, maxScore: this.sceneAnchorFields().length, successRate: 1 }, parseDegraded: false, format: 'json' };
  },

  sceneAnchorJsonText(value) {
    if (value === undefined || value === null) return '';
    if (Array.isArray(value)) return value.map((item) => this.sceneAnchorJsonText(item)).filter(Boolean).join('、');
    if (typeof value === 'object') {
      const direct = value.name || value.characterName || value.idOrName || value.id || value.text || value.value || value.summary || value.description;
      const reason = value.reason || value.evidence || value.rationale || value['理由'];
      if (direct && !this.sceneAnchorHasImpactGroups(value)) return reason ? `${String(direct).trim()}（${String(reason).trim()}）` : String(direct).trim();
      const groups = [
        ['people', '人物'], ['persons', '人物'], ['characters', '人物'],
        ['locations', '地点'], ['places', '地点'],
        ['items', '物品'], ['objects', '物品'],
        ['systems', '系统'], ['facts', '事实'],
      ].map(([key, label]) => {
        const text = this.sceneAnchorJsonText(value[key]);
        return text ? `${label}：${text}` : '';
      }).filter(Boolean);
      const summary = this.sceneAnchorJsonText(value.summary || value.description);
      if (summary && !groups.some((item) => item.includes(summary))) groups.push(`摘要：${summary}`);
      return groups.join('；') || JSON.stringify(value);
    }
    return String(value ?? '').trim();
  },

  sceneAnchorHasImpactGroups(value = {}) {
    return ['people', 'persons', 'characters', 'locations', 'places', 'items', 'objects', 'systems', 'facts'].some((key) => Array.isArray(value?.[key]) || String(value?.[key] ?? '').trim());
  },

  sceneAnchorImpactGroups(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const read = (...keys) => keys.flatMap((key) => {
      const raw = value[key];
      if (raw === undefined || raw === null) return [];
      return (Array.isArray(raw) ? raw : [raw]).map((item) => this.sceneAnchorJsonText(item)).filter(Boolean);
    });
    const groups = {
      people: read('people', 'persons', 'characters'),
      locations: read('locations', 'places'),
      items: read('items', 'objects'),
      systems: read('systems'),
      facts: read('facts'),
      summary: this.sceneAnchorJsonText(value.summary || value.description),
    };
    return Object.values(groups).some((item) => Array.isArray(item) ? item.length : Boolean(item)) ? groups : null;
  },

  sceneAnchorNameSet(value = '') {
    return new Set(this.splitNameList(value).map((item) => String(this.parseParticipantToken(item)?.name || item || '').replace(/[（(].*$/u, '').trim()).filter(Boolean));
  },

  assertSceneParticipantBoundary(values = {}) {
    const forbidden = this.sceneAnchorNameSet(values['禁止出场']);
    if (!forbidden.size) return;
    const conflicted = ['强制出场', '高优先候选', '戏剧候选'].flatMap((key) => [...this.sceneAnchorNameSet(values[key])].filter((name) => forbidden.has(name)));
    if (conflicted.length) throw new Error(`同一角色不能同时出现在候选/强制出场和禁止出场：${[...new Set(conflicted)].join('、')}`);
  },

  async completeSceneAnchorReport(store, prompt, logId, config = this.realConfig()) {
    let best = null;
    let lastErr = null;
    for (let i = 0; i < 2; i += 1) {
      const raw = await this.completeConfiguredStep(store, prompt, logId, false, { ...config, sourceTitle: `${config.label}场景锚定`, promptId: 'inference-stage2-scene-anchor' });
      try {
        const data = this.parseSceneAnchorReport(raw, config);
        if (!best || data.parseScore.successRate >= best.data.parseScore.successRate) best = { raw, data, text: data.text };
        return best;
      } catch (err) {
        lastErr = err;
        prompt = `${prompt}\n\n上次场景锚定 JSON 解析失败：${err.message}。请重新输出一个合法 JSON object，必须包含 currentLocation、currentTime、spatialState、currentAction、writingFocus、currentSceneImpactObjects。`;
      }
    }
    if (best) return best;
    throw lastErr || new Error('场景锚定报告解析错误请重试');
  },

  buildConfiguredNarrationMessages({ store, action, prompt = '', config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const priorKvCount = config.kvCacheSession?.messages?.length || 0;
    const recent = priorKvCount ? '' : this.recentNarrationForMessages(store, config);
    const messages = [{ role: 'user', content: String(prompt || '') }];
    if (recent) messages.push({ role: 'assistant', content: recent });
    messages.push({ role: 'user', content: `根据前面的规则与资料，推演“本次行动”，字数必须在1000 - 1400字之间。\n本次行动：${actionText}` });
    return messages;
  },

  recentNarrationForMessages(store = null, config = this.realConfig()) {
    const limitText = (text = '', max = 900) => String(text || '').trim().slice(0, max);
    const rows = config.mode === 'story'
      ? (store?.log || []).filter((entry) => entry.kind === 'novel' && String(entry.storyText || '').trim()).slice(-3)
      : (store?.realWorldLog || []).filter((entry) => entry.type === 'ai' && !entry.streaming && String(entry.narration || entry.text || '').trim()).slice(-3);
    const text = rows.map((entry, index) => {
      const body = config.mode === 'story' ? entry.storyText : (entry.narration || entry.text || '');
      const action = entry.playerText || entry.actionText || '';
      return [`最近已发生正文${index + 1}：`, action ? `对应行动：${action}` : '', limitText(body)].filter(Boolean).join('\n');
    }).join('\n---\n');
    return text || '暂无最近已发生正文；请以第一条 user 消息中的摘要和资料为准。';
  },

  async buildConfiguredNarrationPrompt({ store, action, base, loaded, skills, materialSession = null, sceneAnchorReport = '', config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const narrationContext = config.ctx.buildNarrationContext?.({ store, action: actionText, config }) || this.compactUpdatePromptText(base, 1600);
    const loadedText = config.ctx.loadedNarrationSummary?.(loaded) || config.ctx.buildLoadedText(loaded) || '无';
    const writingStyle = store.selectedWritingStylePrompt?.() || store.writingStylePrompt?.() || '正文采用小说文风，重视画面、动作、感官和心理反应，避免复述玩家指令。';
    const modeRule = config.mode === 'story'
      ? `推演自由度：${this.storyFreedomRule(store)}\n玩家不是角色本人，而是操控/影响被操控者行动的存在；正文必须写出本次行动的动作过程、环境变化、其他人物反应、被操控者身体与心理张力、直接结果。`
      : `推演自由度：${store.realWorldFreedomRule?.() || '只推演玩家本次输入行动自然抵达的直接结果。'}${store.sharedControlState?.() ? '\n同世界附身控制规则：玩家意识附身接管被控角色身体，同时玩家现实本体仍由同一个意识维持控制；正文以第二人称“你”的附身镜头为主，不要让同一角色在两个地点同时出现。' : ''}`;
    const narrationRules = '行动范围内充分推演：写出本次行动的动作过程、身体感受、周围环境变化、可见细节、他人反应、对话回应和直接短期连锁影响；场景锚定报告中的强制出场必须在正文中实际出现、行动或回应；不替玩家执行下一步新行动；不把亲吻、抚摸、摩擦、按住等行为自动扩展为脱衣、转移地点、插入、高潮等未输入的新阶段。';
    const completenessRules = [
      '正文完整性规则：',
      '- 正文必须形成完整小段落：进入动作 → 现场反馈 → 对方反应 → 短期结果落点。',
      '- 即使本次行动因边界、consent、年龄、关系或安全限制不能继续描写，也不得短输出。',
      '- 若不能描写玩家输入中的某些肢体或性化细节，必须改写为允许描写的现场反应：角色察觉、制止、后退、质问、沉默、情绪变化、房间环境声响变化、进入方式、触发反应、双方距离变化、语言/沉默、身体姿态，但必须根据已有资料符合逻辑。',
      '- 不要只写“她在房间里”或只写场景开头；必须把本次行动推演到一个明确的即时落点。',
      '- 目标长度 1000-1400 中文字符；低于 1000 汉字视为不合格，不要提前停止。',
      '- 强制输出结构只作为内部写作配比，最终正文仍必须是无标题、无编号、无换行的单段小说正文。',
      '- 环境五感渲染约100-150字：写出此刻场景中的气味、光线、触感。',
      '- 角色内心独白约200-250字：围绕上一轮事件或本次行动带来的心理挣扎、试探或算计展开，必须使用比喻句。',
      '- 对话与动作细节约400-450字：放慢动作，写清楚衣料摩擦声、眼神偏移、手部小动作、距离变化和对话回应。',
      '- 悬念/决策钩子约150字：本轮结束时写出心理转向或下一步压力，但不替玩家执行下一步行动。',
      '- 若动作本身很短，就按上述四块扩展当前阶段内部细节，而不是开启下一步新行动。',
      '- 禁止把“NPC反问玩家/等待玩家说明来意/门口刚打开”当作最终落点；必须继续写到进入、被拒、落座、对峙、距离变化或关系张力变化等本次行动的直接结果。',
      '禁止越界不是禁止写长：不允许为了字数推进到新阶段；但必须充分描写当前阶段内部细节。',
    ].join('\n');
    return this.renderPrompt('inference-stage3-narration', {
      模式标签: config.label,
      本次行动: actionText,
      基础上下文: [this.continuityFallbackRule(), `小说笔风：${writingStyle}`, modeRule, narrationRules, completenessRules, narrationContext].join('\n'),
      场景锚定报告: sceneAnchorReport || '无',
      已动态载入资料: loadedText || '无',
      紧凑返回规则: this.compactReturnRule('prose'),
    });
  },

  settlementEligibleParticipant(p = {}) {
    if (!p || p.canSettle === false) return false;
    const role = String(p.role || '').toLowerCase();
    if (/loaded-role-card|priority-candidate|drama-candidate|candidate|forbidden|background|random/u.test(role)) return false;
    if (p.type === 'player') return true;
    if (p.canSettle === true) return true;
    return /actor|direct|forced|participant|current-scene/u.test(role);
  },

  currentPlayerParticipant(store = null) {
    const name = String(store?.playerName || store?.playerProfile?.name || store?.realWorldPlayerSettlementName?.() || '玩家').trim() || '玩家';
    return { type: 'player', id: 'player-self', name, role: 'actor', canSettle: true };
  },

  stageParticipants(trace = [], loaded = [], store = null) {
    const sourceItems = Array.isArray(trace) ? trace : (trace ? [{ ...trace, participants: [], characters: [] }] : []);
    const seen = new Set();
    const blocked = new Set();
    const forced = new Set();
    const forbidden = new Set();
    const out = [];
    const nameOf = (p = {}) => String(p?.name || p?.characterName || p?.idOrName || p?.id || '').trim();
    sourceItems.forEach((item) => {
      (Array.isArray(item?.forcedParticipants) ? item.forcedParticipants : []).forEach((p) => { const name = nameOf(p); if (name) forced.add(name); });
      (Array.isArray(item?.forbiddenParticipants) ? item.forbiddenParticipants : []).forEach((p) => { const name = nameOf(p); if (name) forbidden.add(name); });
      ['priorityCandidates', 'dramaCandidates', 'backgroundParticipants'].forEach((key) => {
        (Array.isArray(item?.[key]) ? item[key] : []).forEach((p) => { const name = nameOf(p); if (name) blocked.add(name); });
      });
      (Array.isArray(item?.randomActiveEvents) ? item.randomActiveEvents : []).forEach((p) => { const name = nameOf(p); if (name) blocked.add(name); });
    });
    const add = (p = {}) => {
      if (out.length >= 12 || !this.settlementEligibleParticipant(p)) return;
      const target = p.id || p.idOrName || p.name;
      const targetText = String(target || '').trim();
      const name = nameOf(p);
      const isForced = forced.has(targetText) || (name && forced.has(name));
      if (!target || forbidden.has(targetText) || (name && forbidden.has(name))) return;
      if (!isForced && (blocked.has(targetText) || (name && blocked.has(name)))) return;
      const key = `${p.type || ''}:${target}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(p);
    };
    sourceItems.forEach((item) => {
      (Array.isArray(item?.participants) ? item.participants : []).forEach(add);
      (Array.isArray(item?.forcedParticipants) ? item.forcedParticipants : []).forEach((p) => add({ ...p, role: p.role || 'forced', canSettle: p.canSettle === false ? false : true }));
      this.characterParticipants(item?.characters, store).forEach((p) => add({ ...p, canSettle: true }));
    });
    add(this.currentPlayerParticipant(store));
    return out.slice(0, 12);
  },

  mergeNarrationParticipants(participants = [], narration = '', store = null, sceneAnchor = null) {
    const out = Array.isArray(participants) ? participants.slice() : [];
    const seen = new Set(out.map((p) => `${p?.type || ''}:${p?.id || p?.idOrName || p?.name || ''}`));
    const text = String(narration || '');
    const addCharacter = (id = '', name = '', role = 'narration-mentioned') => {
      const p = this.characterParticipant({ id, name }, store);
      const key = `${p?.type || ''}:${p?.id || p?.idOrName || p?.name || ''}`;
      if (p && !seen.has(key) && this.settlementEligibleParticipant({ ...p, canSettle: true })) {
        seen.add(key);
        out.push({ ...p, role, canSettle: true });
      }
    };
    this.sceneAnchorParticipants(sceneAnchor, store).forEach((item) => addCharacter(item.id || item.idOrName, item.name, 'current-scene'));
    Object.values(store?.rpgStates || {}).forEach((state) => {
      const name = String(state?.profile?.name || state?.name || '').trim();
      if (!name || !text.includes(name)) return;
      addCharacter(state.id, name, 'narration-mentioned');
    });
    return out.slice(0, 12);
  },

  sceneAnchorParticipants(sceneAnchor = null, store = null) {
    const values = sceneAnchor?.values || sceneAnchor || {};
    const playerName = String(store?.playerName || store?.playerProfile?.name || store?.realWorldPlayerSettlementName?.() || '').trim();
    const fields = ['强制出场', '当前场景影响对象'];
    return fields.flatMap((key) => this.splitNameList(values[key] || '').map((raw) => {
      const parsed = this.parseParticipantToken(raw);
      const name = String(parsed?.name || raw || '').replace(/[（(].*$/u, '').trim();
      return name && !['无', '玩家', '系统', playerName].includes(name) ? { type: 'character', idOrName: name, name, role: 'current-scene', canSettle: true } : null;
    }).filter(Boolean));
  },

  characterParticipants(characters = [], store = null) {
    return (Array.isArray(characters) ? characters : []).map((item) => this.characterParticipant(item, store)).filter(Boolean);
  },

  characterParticipant(item = {}, store = null) {
    const raw = typeof item === 'string' ? { name: item } : item;
    const id = String(raw?.id || raw?.idOrName || '').trim();
    const name = String(raw?.name || raw?.id || raw?.idOrName || '').trim();
    if (id === 'player-self') return { type: 'player', id: 'player-self', name: name || '玩家', role: 'actor' };
    const state = this.findParticipantState(store, id, name);
    if (!state) return null;
    return { type: 'character', id: state.id || id || name, name: state.profile?.name || state.name || name || id, role: 'character-role-card' };
  },

  findParticipantState(store = null, id = '', name = '') {
    if (!store) return null;
    const candidates = [id, name].map((value) => String(value || '').trim()).filter(Boolean);
    for (const key of candidates) {
      const byId = store.itemSkillState?.(key) || store.rpgStates?.[key];
      if (byId) return byId;
      const byName = store.sqliteSave?.getCharacterStateByName?.(key) || store.getCharacterStateByName?.(key) || window.GameModules.sqliteSave?.getCharacterStateByName?.(key);
      if (byName) return byName;
    }
    const states = Object.values(store.rpgStates || {});
    return states.find((state) => candidates.includes(String(state?.profile?.name || state?.name || '').trim())) || null;
  },

  loadedRoleCardParticipants(loaded = []) {
    return (Array.isArray(loaded) ? loaded : []).flatMap((item) => {
      if (Array.isArray(item?.participants) && item.participants.length) return item.participants;
      const text = [item?.title, item?.text, item?.content, item?.summary].map((part) => String(part || '').trim()).filter(Boolean).join('\n');
      if (!/角色卡/u.test(text)) return [];
      const id = text.match(/角色ID[:：]\s*([^\s｜|，,；;\n]+)/u)?.[1] || '';
      const name = text.match(/姓名[:：]\s*([^\s｜|，,；;\n]+)/u)?.[1] || text.match(/自动资料[:：]\s*([^\s｜|，,；;\n]+?)角色卡/u)?.[1] || '';
      const target = id || name;
      if (!target) return [];
      return [{ type: 'character', id: target, name, role: 'loaded-role-card' }];
    });
  },

  compactUpdatePromptText(text = '', limit = 1600, keepTail = false) {
    const raw = String(text || '').replace(/\s+/g, ' ').trim();
    if (raw.length <= limit) return raw;
    if (keepTail) return `…${raw.slice(-limit)}`;
    const head = Math.ceil(limit * 0.65);
    const tail = Math.max(0, limit - head - 1);
    return `${raw.slice(0, head)}…${tail ? raw.slice(-tail) : ''}`;
  },

  settlementTypeQueue(config = this.realConfig()) {
    const base = ['基础结算', '情绪', '感觉', '生命体征', '身体状态', '穿着状态', '性经历', '性历史', '关系', '角色卡', '物品', '地图', '领土控势', '人事安排', '势力总览', '政体状态', '势力结构', '组织能力', '人事归属', '系统记录', '通用固化'];
    return config.mode === 'story' ? base.concat(['操控体验']) : base;
  },

  settlementTypeWindows(allTypes = []) {
    const types = (Array.isArray(allTypes) ? allTypes : []).filter(Boolean);
    return types.length ? [types] : [];
  },

  nextSettlementWindow(allTypes = [], completedTypes = [], currentIncompleteTypes = []) {
    const completed = new Set(completedTypes);
    const unfinished = allTypes.filter((type) => !completed.has(type));
    const retry = (currentIncompleteTypes || []).filter((type) => unfinished.includes(type));
    if (retry.length) return retry;
    return this.settlementTypeWindows(allTypes).find((group) => group.some((type) => unfinished.includes(type)))?.filter((type) => unfinished.includes(type)) || [];
  },

  settlementTypeContracts() {
    return {
      '基础结算': { title: '基础结算', format: '经过时间：秒数\n当前状态：状态文本\n当前目标：目标文本\n场景标题：标题\n地点名称：地点全称\n备选行动1：行动文本\n备选行动2：行动文本\n备选行动3：行动文本\n备选行动4：行动文本' },
      '情绪': { title: '情绪结算', format: '更新N：结算主体，情绪名，+/-数值，变化原因' },
      '感觉': { title: '感觉结算', format: '更新N：结算主体，感觉名，+/-数值，变化原因' },
      '生命体征': { title: '生命体征结算', format: '更新N：结算主体，字段名，+/-数值，变化原因' },
      '身体状态': { title: '身体状态结算', format: '更新N：结算主体，部位或状态键，新状态，变化原因' },
      '穿着状态': { title: '穿着状态结算', format: '更新N：结算主体，穿着部位，衣物名称，当前状态，变化原因' },
      '性经历': { title: '性经历结算', format: '更新N：结算主体，分类，+/-数值，变化原因' },
      '性历史': { title: '性历史结算', format: '更新N：结算主体，状态转移，性对象，原因与证据' },
      '关系': { title: '关系结算', format: '更新N：结算主体，甲方(称谓)，乙方(称谓)，维度，当前状态，变化原因，根据性格造成结果' },
      '角色卡': { title: '角色卡结算', format: '更新N：结算主体，字段，替换/增加，新值，原因，根据性格造成结果' },
      '物品': { title: '物品结算', format: '更新N：结算主体，物品类型，物品名，事实或变化，变化原因' },
      '地图': { title: '地图结算', format: '更新N：结算主体，当前位置/上级地点/地点事实/地图节点/路线事实，事实，原因' },
      '领土控势': { title: '领土控势结算', format: '更新N：地点名，实控组织/宣称组织/控势状态，事实，原因' },
      '人事安排': { title: '人事安排结算', format: '更新N：结算主体，当前地点/当前行动/可用状态，新值，变化原因' },
      '势力总览': { title: '势力总览结算', format: '更新N：结算主体，新增势力/上层势力归属/势力APP归属，事实，原因' },
      '政体状态': { title: '政体状态结算', format: '更新N：组织名，status/legitimacy/successorId，事实，原因' },
      '势力结构': { title: '势力结构结算', format: '更新N：结算主体，部门角色/职位/成员地位，事实，原因' },
      '组织能力': { title: '组织能力结算', format: '更新N：结算主体，能力维度/条目名称/条目状态/上级归属，事实，原因' },
      '人事归属': { title: '人事归属结算', format: '更新N：角色名，组织/部门/职位，事实，原因' },
      '系统记录': { title: '系统记录结算', format: '更新N：结算主体，事件/记录/通信消息/剧情记录/状态，事实，原因' },
      '通用固化': { title: '通用固化结算', format: '更新N：结算主体，字段，稳定事实，变化原因' },
      '操控体验': { title: '操控体验结算', format: '更新N：操控感觉/适应度，字段，+/-数值或新值，变化原因' },
    };
  },

  settlementUpdateCatalog() {
    return {
      '情绪': { updateType: 'emotion', fieldPrefix: 'metrics.emotions' },
      '感觉': { updateType: 'feeling', fieldPrefix: 'metrics.playerFeelings' },
      '生命体征': { updateType: 'vital', fieldMap: { '生命力': 'vitals.vitality', '精力': 'vitals.stamina_pool', '饱食度': 'vitals.satiety', '水分': 'vitals.hydration', '疲劳': 'vitals.fatigue', '精神稳定': 'vitals.mental_stability' } },
      '身体状态': { updateType: 'body-status', fieldPrefix: 'bodyStatus' },
      '穿着状态': { updateType: 'wearing-state', fieldPrefix: 'values.wearing' },
      '性经历': { updateType: 'sexual-experience', fieldPrefix: 'intimacy.sexualExperienceParts' },
      '性历史': { updateType: 'sexual-history', fieldPrefix: 'intimacy.sexualHistory' },
      '关系': { updateType: 'relationship', fieldPrefix: 'relationships' },
      '角色卡': { updateType: 'role-card', fieldPrefix: 'profile' },
      '物品': { updateType: 'item', fieldPrefix: 'inventory' },
      '地图': { updateType: 'map', fieldMap: { '当前位置': 'current', '上级地点': 'parent', '地点事实': 'descriptionFacts', '地图节点': 'mapNodes', '路线事实': 'routeLinks' } },
      '领土控势': { updateType: 'territory-control', fieldPrefix: 'control' },
      '势力总览': { updateType: 'faction-overview', fieldPrefix: 'overview.factions' },
      '政体状态': { updateType: 'org-status', fieldPrefix: 'status' },
      '势力结构': { updateType: 'faction-structure', fieldPrefix: 'structure' },
      '组织能力': { updateType: 'org-capability-entry', fieldPrefix: 'solid.capabilities' },
      '人事归属': { updateType: 'membership', fieldPrefix: 'values.memberships' },
      '系统记录': { updateType: 'system', fieldPrefix: 'events' },
      '通用固化': { updateType: 'generic', fieldPrefix: 'status_tags' },
    };
  },

  participantAllowedForSettlement(name = '', participants = []) {
    const clean = String(name || '').trim();
    return Boolean(clean) && participants.some((p) => [p.name, p.id, p.idOrName].map((x) => String(x || '').trim()).includes(clean));
  },

  subjectForSettlement(name = '', participants = []) {
    const clean = String(name || '').trim();
    const found = participants.find((p) => [p.name, p.id, p.idOrName].map((x) => String(x || '').trim()).includes(clean));
    return found ? { type: found.type || 'character', id: found.id || found.idOrName || found.name, name: found.name || clean } : null;
  },

  defaultSubjectForSettlement(participants = []) {
    const people = (Array.isArray(participants) ? participants : []).filter((p) => ['character', 'player'].includes(p?.type));
    const names = [...new Set(people.map((p) => String(p?.name || p?.id || p?.idOrName || '').trim()).filter(Boolean))];
    const characterNames = [...new Set(people.filter((p) => p.type === 'character').map((p) => String(p?.name || p?.id || p?.idOrName || '').trim()).filter(Boolean))];
    if (characterNames.length === 1) return this.subjectForSettlement(characterNames[0], participants);
    if (names.length === 1) return this.subjectForSettlement(names[0], participants);
    return null;
  },

  parseStandardSettlementLine(typeName = '', line = '', subject = null, participants = [], store = null) {
    let parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    const catalog = this.settlementUpdateCatalog();
    if (!catalog[parts[0]] && parts.length >= 4) {
      const inlineSubject = this.subjectForSettlement(parts[0], participants);
      if (inlineSubject) {
        subject = inlineSubject;
        parts = [typeName, ...parts.slice(1)];
      }
    }
    const [label, key, rawValue, reason] = parts;
    const type = label || typeName;
    const entry = catalog[type];
    if (!subject || !key || !rawValue || !reason) return null;
    if (!entry) return this.parseGenericSettlementLine(typeName, line, subject, { requireExplicitGeneric: true });
    let normalizedKey = type === '生命体征' ? this.vitalFieldAlias(key) : key;
    const rawValueText = String(rawValue).trim();
    const delta = Number(rawValueText.replace(/[^-+\d.]/gu, ''));
    const hasSignedDelta = Number.isFinite(delta) && /^[+-]\d/u.test(rawValueText) && delta !== 0;
    if (['情绪', '感觉'].includes(type)) {
      const allowedKeys = this.settlementMetricKeysForSubject(store, subject, type);
      normalizedKey = this.metricAliasForSettlement(type, normalizedKey);
      if (!allowedKeys.includes(normalizedKey) || !hasSignedDelta) return null;
    }
    if (entry.fieldMap && !entry.fieldMap[normalizedKey]) return null;
    if (type === '生命体征' && !hasSignedDelta) return null;
    const field = entry.fieldMap?.[normalizedKey] || `${entry.fieldPrefix}.${normalizedKey}`;
    const change = hasSignedDelta ? { mode: 'delta', value: delta } : { mode: 'set', value: rawValue };
    return { updateType: entry.updateType, subject, field, change, reasons: [{ trigger: type, evidence: reason, confidence: 'confirmed' }] };
  },

  parseMetricJsonEntry(type = '', entry = {}, subject = null, participants = [], store = null) {
    const t = (value) => this.settlementJsonText(value);
    const field = this.metricAliasForSettlement(type, t(entry.field ?? entry.字段 ?? entry.key ?? ''));
    const rawValueText = t(entry.value ?? entry.变化 ?? entry.delta ?? entry.数值 ?? '');
    const delta = Number(rawValueText.replace(/[^-+\d.]/gu, ''));
    const reason = t(entry.reason ?? entry.原因 ?? entry.evidence ?? entry.证据 ?? '');
    const status = t(entry.status ?? entry.程度 ?? entry.解释 ?? '');
    if (!subject || !field || !reason || !Number.isFinite(delta) || !/^[+-]\d/u.test(rawValueText) || delta === 0) return null;
    const allowedKeys = this.settlementMetricKeysForSubject(store, subject, type);
    if (!allowedKeys.includes(field)) return null;
    if (type === '感觉' && subject.type === 'player') return null;
    const catalog = this.settlementUpdateCatalog();
    const entryMeta = catalog[type];
    if (!entryMeta) return null;
    return {
      updateType: entryMeta.updateType,
      subject,
      field: `${entryMeta.fieldPrefix}.${field}`,
      change: { mode: 'delta', value: delta, status },
      reasons: [{ trigger: type, evidence: reason, confidence: 'confirmed' }],
    };
  },

  parseGenericSettlementLine(typeName = '', line = '', subject = null, options = {}) {
    const parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    const [label, key, rawValue, reason] = parts;
    if (!subject || !key || !rawValue || !reason) return null;
    if (options.requireExplicitGeneric && !/^(?:未知稳定事实|稳定事实|通用固化|通用事实)$/u.test(label || '')) return null;
    return { updateType: 'generic', subject, field: `status_tags.${key}`, change: { mode: 'append', value: { label: label || typeName, value: rawValue, reason } }, reasons: [{ trigger: label || typeName, evidence: reason, confidence: 'confirmed' }] };
  },

  settlementAlias(value = '', aliases = {}) {
    const clean = String(value || '').trim();
    return aliases[clean] || clean;
  },

  metricAliasForSettlement(type = '', key = '') {
    const clean = String(key || '').trim();
    const emotionAliases = {
      平静: '冷静', 镇定: '冷静', 理智: '冷静', 安定: '冷静', 淡定: '冷静', 安心: '冷静',
      害怕: '恐惧', 惊恐: '恐惧', 惊惧: '恐惧', 惧怕: '恐惧', 惊慌: '恐惧', 惶恐: '恐惧', 胆怯: '恐惧', 畏缩: '恐惧',
      忧虑: '担忧', 忧心: '担忧', 不安: '担忧', 顾虑: '担忧', 焦虑: '担忧', 挂念: '担忧', 牵挂: '担忧',
      开心: '高兴', 愉悦: '高兴', 快乐: '高兴', 欣喜: '高兴', 喜悦: '高兴', 满足: '高兴', 轻松: '高兴',
      紧绷: '紧张', 慌张: '紧张', 局促: '紧张', 压迫感: '紧张', 忐忑: '紧张',
      生气: '愤怒', 恼怒: '愤怒', 怒意: '愤怒', 怨怒: '愤怒', 气愤: '愤怒', 暴躁: '愤怒',
      羞愧: '羞耻', 害羞: '羞耻', 难堪: '羞耻', 尴尬: '羞耻', 屈辱: '羞耻', 羞辱: '羞耻',
      难过: '悲伤', 哀伤: '悲伤', 伤心: '悲伤', 失落: '悲伤', 痛苦: '悲伤', 悲痛: '悲伤',
      兴趣: '好奇', 探究: '好奇', 疑惑: '好奇', 困惑: '好奇', 在意: '好奇',
      空洞: '麻木', 呆滞: '麻木', 迟钝: '麻木', 冷漠: '麻木', 恍惚: '麻木',
      吃醋: '嫉妒', 妒忌: '嫉妒', 醋意: '嫉妒', 酸涩: '嫉妒',
      无望: '绝望', 崩溃: '绝望', 灰心: '绝望', 走投无路: '绝望',
    };
    const feelingAliases = {
      知晓: '了解', 理解: '了解', 熟悉: '了解', 认识: '了解', 洞悉: '了解', 知情: '了解',
      信赖: '信任', 相信: '信任', 放心: '信任', 可靠感: '信任',
      抵抗: '反抗', 抗拒: '反抗', 逆反: '反抗', 拒绝: '反抗', 不服: '反抗',
      亲近: '好感', 喜欢: '好感', 接纳: '好感', 善意: '好感', 顺眼: '好感',
      友好: '友情', 友谊: '友情', 伙伴感: '友情', 同伴感: '友情',
      家人感: '亲情', 亲近依附: '亲情', 亲缘: '亲情', 庇护感: '亲情',
      恋慕: '爱情', 爱慕: '爱情', 心动: '爱情', 倾心: '爱情', 眷恋: '爱情', 深爱: '爱情',
      欲望: '肉欲', 情欲: '肉欲', 渴望: '肉欲', 冲动: '肉欲', 身体吸引: '肉欲',
      害怕: '畏惧', 惧怕: '畏惧', 恐惧: '畏惧', 惧意: '畏惧', 怕: '畏惧',
      敬重: '尊敬', 敬意: '尊敬', 认可: '尊敬', 钦佩: '尊敬', 佩服: '尊敬',
      仰慕: '崇拜', 崇敬: '崇拜', 神化: '崇拜', 狂热: '崇拜',
      厌恶: '讨厌', 反感: '讨厌', 排斥: '讨厌', 嫌恶: '讨厌', 憎恶: '讨厌',
      依恋: '依赖', 依附: '依赖', 需要: '依赖', 离不开: '依赖',
      戒备: '警惕', 防备: '警惕', 怀疑: '警惕', 提防: '警惕', 疑心: '警惕',
      控制欲: '支配欲', 掌控欲: '支配欲', 主导欲: '支配欲', 控制: '支配欲',
      独占欲: '占有欲', 独占: '占有欲', 占有: '占有欲', 垄断欲: '占有欲',
      顺从: '服从', 听话: '服从', 臣服: '服从', 屈从: '服从', 驯服: '服从',
    };
    return (type === '感觉' ? feelingAliases : emotionAliases)[clean] || clean;
  },

  vitalFieldAlias(field = '') {
    return this.settlementAlias(field, { 生命力: '生命力', 生命值: '生命力', 健康: '生命力', health: '生命力', 精力: '精力', 精力池: '精力', 体力: '精力', stamina: '精力', 饱食度: '饱食度', 饱食: '饱食度', satiety: '饱食度', 水分: '水分', 口渴: '水分', 水合: '水分', hydration: '水分', 疲劳: '疲劳', 疲劳度: '疲劳', fatigue: '疲劳', 精神稳定: '精神稳定', 精神稳定度: '精神稳定', mental_stability: '精神稳定' });
  },

  allowedBodyPartKeys() { return ['overall', 'mouth', 'chest', 'genital', 'anus', 'hips', 'limbs', 'skin', 'other']; },

  allowedWearingSlots() { return ['bra', 'top', 'outerwear', 'bottom', 'legwear', 'shoes', 'panties', '饰品']; },

  allowedSexualPartKeys() { return ['genital', 'chest', 'lips', 'mouth', 'oralAction', 'oralSex', 'oralInternalFinish', 'genitalEntry', 'vaginalInsertion', 'vaginalInternalFinish', 'anus', 'analEntry', 'analSex', 'analInternalFinish', 'legs', 'hips', 'hands', 'skin', 'other']; },

  isFullBodyWearingPart(part = '') {
    const clean = String(part || '').trim();
    return /^(?:全身|整体|整身|全体|全套|全身衣物|全身穿着|整体穿着)$/u.test(clean);
  },

  wearingSlotAlias(part = '', itemName = '') {
    const clean = String(part || '').trim();
    const item = String(itemName || '').trim();
    if (this.isFullBodyWearingPart(clean)) return 'outerwear';
    if (/腿圈|项圈|手环|脚环|戒指|耳环|饰品/u.test(item)) return '饰品';
    if (/胸部|胸口|乳房|胸罩|内衣上/u.test(clean)) return 'bra';
    if (/上身|上衣|衬衫|睡衣上/u.test(clean)) return 'top';
    if (/外套|罩衫|连衣裙|睡裙|裙装/u.test(clean)) return 'outerwear';
    if (/下身|裙子|裤子|短裤/u.test(clean)) return 'bottom';
    if (/腿部|大腿|丝袜|袜裤|裤袜/u.test(clean)) return 'legwear';
    if (/足部|脚部|鞋|袜/u.test(clean)) return 'shoes';
    if (/内裤|底裤/u.test(clean)) return 'panties';
    if (/饰品|首饰|配饰/u.test(clean)) return '饰品';
    return this.settlementAlias(clean, { 胸部: 'bra', 胸口: 'bra', 乳房: 'bra', 上身: 'top', 外套: 'outerwear', 下身: 'bottom', 腿部: 'legwear', 大腿: 'legwear', 足部: 'shoes', 脚部: 'shoes', 内裤: 'panties', 饰品: '饰品' });
  },

  bodyPartAlias(part = '') {
    return this.settlementAlias(part, { 整体: 'overall', 全身: 'overall', 口部: 'mouth', 嘴唇: 'mouth', 嘴部: 'mouth', 胸部: 'chest', 胸口: 'chest', 乳房: 'chest', 阴部: 'genital', 私处: 'genital', 肛部: 'anus', 臀部: 'hips', 屁股: 'hips', 四肢: 'limbs', 手臂: 'limbs', 腿部: 'limbs', 皮肤: 'skin', 其他: 'other' });
  },

  bodyPartName(part = '', key = '') {
    const names = { overall: '整体', mouth: '口部', chest: '胸部', genital: '阴部', anus: '肛部', hips: '臀部', limbs: '四肢', skin: '皮肤', other: '其他' };
    return names[key] || String(part || '').trim();
  },

  sexualPartAlias(part = '') {
    return this.settlementAlias(part, { 阴部: 'genital', 胸部: 'chest', 胸口: 'chest', 乳房: 'chest', 唇部: 'lips', 接吻: 'lips', 口部: 'mouth', 嘴部: 'mouth', 口部行为: 'oralAction', 口交: 'oralSex', 口交中出: 'oralInternalFinish', 阴部进入: 'genitalEntry', 阴道插入: 'vaginalInsertion', 阴道中出: 'vaginalInternalFinish', 肛部: 'anus', 肛门: 'anus', 肛部进入: 'analEntry', 肛交: 'analSex', 肛交中出: 'analInternalFinish', 腿部: 'legs', 大腿: 'legs', 臀部: 'hips', 屁股: 'hips', 手部: 'hands', 手: 'hands', 皮肤: 'skin', 其他: 'other' });
  },

  parseWearingSettlementLine(line = '', subject = null, participants = []) {
    let parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    if (parts[0] !== '穿着状态') {
      const inlineSubject = this.subjectForSettlement(parts[0], participants);
      if (inlineSubject) {
        subject = inlineSubject;
        parts = ['穿着状态', ...parts.slice(1)];
      }
    }
    const [label, part, itemName, state, reason] = parts;
    if (label !== '穿着状态' || !subject || !part || !itemName || !state || !reason) return null;
    const slot = this.wearingSlotAlias(part, itemName);
    if (!this.allowedWearingSlots().includes(slot)) return null;
    return { updateType: 'wearing-state', subject, field: 'values.wearing', change: { mode: 'upsert', value: { slot, part, name: itemName, state, reason, fullBody: this.isFullBodyWearingPart(part) } }, reasons: [{ trigger: '穿着状态', evidence: reason, confidence: 'confirmed' }] };
  },

  parseBodyStatusSettlementLine(line = '', subject = null, participants = []) {
    let parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    if (parts[0] !== '身体状态') {
      const inlineSubject = this.subjectForSettlement(parts[0], participants);
      if (inlineSubject) {
        subject = inlineSubject;
        parts = ['身体状态', ...parts.slice(1)];
      }
    }
    const [label, part, status, reason] = parts;
    if (label !== '身体状态' || !subject || !part || !status || !reason) return null;
    const aliasKey = this.bodyPartAlias(part);
    const partKey = this.allowedBodyPartKeys().includes(aliasKey) ? aliasKey : part;
    return { updateType: 'body-status', subject, field: `bodyStatus.${partKey}`, change: { mode: 'merge', value: { partKey, part: this.bodyPartName(part, partKey), status, description: status, reason } }, reasons: [{ trigger: '身体状态', evidence: reason, confidence: 'confirmed' }] };
  },

  parseSexualExperienceSettlementLine(line = '', subject = null, participants = []) {
    let parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    if (parts[0] !== '性经历') {
      const inlineSubject = this.subjectForSettlement(parts[0], participants);
      if (inlineSubject) {
        subject = inlineSubject;
        parts = ['性经历', ...parts.slice(1)];
      }
    }
    const [label, part, rawValue, reason] = parts;
    if (label !== '性经历' || !subject || !part || !rawValue || !reason) return null;
    const rawValueText = String(rawValue).trim();
    const delta = Number(rawValueText.replace(/[^-+\d.]/gu, ''));
    if (!Number.isFinite(delta) || !/^[+-]\d/u.test(rawValueText) || delta === 0) return null;
    if (/^(?:总次数|总数|全部|总体|合计)$/u.test(String(part || '').trim())) {
      const value = { totalDelta: delta, parts: {} };
      return { updateType: 'sexual-experience', subject, field: 'intimacy.sexualExperienceCount', change: { mode: 'delta', value }, reasons: [{ trigger: '性经历', evidence: reason, confidence: 'confirmed' }] };
    }
    const aliasKey = this.sexualPartAlias(part);
    const key = this.allowedSexualPartKeys().includes(aliasKey) ? aliasKey : part;
    const value = { totalDelta: 0, parts: { [key]: delta } };
    return { updateType: 'sexual-experience', subject, field: `intimacy.sexualExperienceParts.${key}`, change: { mode: 'delta', value }, reasons: [{ trigger: '性经历', evidence: reason, confidence: 'confirmed' }] };
  },

  parseScheduleSettlementLine(line = '', subject = null, participants = []) {
    // 合同边界：明确通信/移动/约定涉及的人必须先由上游加入 participants；非 participants 仍会被结算对象 gate 拒绝。
    let parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    if (parts[0] !== '人事安排') {
      const inlineSubject = this.subjectForSettlement(parts[0], participants);
      if (inlineSubject) {
        subject = inlineSubject;
        parts = ['人事安排', ...parts.slice(1)];
      }
    }
    const [label, key, rawValue, reason] = parts;
    const subjectType = String(subject?.type || '').trim();
    if (label !== '人事安排' || !subject || !['character', 'player'].includes(subjectType) || !key || !rawValue || !reason) return null;
    const value = {};
    const availabilityValues = ['在场', '场外', '未知', '暂不可用'];
    if (key === '当前地点') value.currentLocation = rawValue;
    else if (key === '当前行动') value.currentAction = rawValue;
    else if (key === '可用状态') {
      value.availability = availabilityValues.includes(rawValue) ? rawValue : '未知';
      if (reason && reason.length >= 4 && !/^(?:正文|证据|明确|无变化)/u.test(reason)) value.currentAction = reason;
    } else if (/当前地点|当前行动|可用状态/u.test(rawValue) && availabilityValues.includes(reason)) {
      if (rawValue === '当前地点') value.currentLocation = key;
      else if (rawValue === '当前行动') value.currentAction = key;
      else if (rawValue === '可用状态') value.availability = availabilityValues.includes(reason) ? reason : '未知';
    } else if (key.length >= 2 && !availabilityValues.includes(key)) {
      value.currentAction = [key, rawValue].filter(Boolean).join('，');
      value.availability = availabilityValues.includes(rawValue) ? rawValue : '在场';
    } else return null;
    value.reason = reason;
    return { updateType: 'character-schedule', subject, field: 'characterSchedules', change: { mode: 'merge', value }, reasons: [{ trigger: `人事安排${key}`, evidence: reason, confidence: 'confirmed' }] };
  },

  parseSystemSettlementLine(line = '', subject = null, participants = []) {
    let parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    if (parts[0] !== '系统记录') {
      if (parts[0] === '系统') {
        parts = ['系统记录', ...parts.slice(1)];
      } else if (this.subjectForSettlement(parts[0], participants)) {
        parts = ['系统记录', ...parts.slice(1)];
      }
    }
    subject = { type: 'system', id: '系统', name: '系统' };
    const [label, key, rawValue, reason] = parts;
    if (label !== '系统记录' || !subject || !key || !rawValue || !reason) return null;
    const allowed = ['事件', '记录', '通信消息', '剧情记录', '状态'];
    if (!allowed.includes(key)) return null;
    return { updateType: 'system', subject, field: `events.${key}`, change: { mode: 'append', value: { key, value: rawValue, reason } }, reasons: [{ trigger: `系统记录${key}`, evidence: reason, confidence: 'confirmed' }] };
  },

  parseSpecialSettlementLine(typeName = '', line = '', subject = null, participants = []) {
    let parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    if (parts[0] !== typeName) {
      const inlineSubject = this.subjectForSettlement(parts[0], participants);
      if (inlineSubject) {
        subject = inlineSubject;
        parts = [typeName, ...parts.slice(1)];
      }
    }
    if (!subject || parts[0] !== typeName) return this.parseGenericSettlementLine(typeName, line, subject, { requireExplicitGeneric: true });
    if (typeName === '性历史') {
      const [, transition, partner, evidence] = parts;
      if (!transition || !partner || !evidence) return null;
      return { updateType: 'sexual-history', subject, field: 'intimacy.sexualHistory', change: { mode: 'merge', value: { transition, partner: { type: 'character', id: partner, name: partner }, evidence, historyText: [transition, partner, evidence].join('，') } }, reasons: [{ trigger: '性历史状态转移', evidence, confidence: 'confirmed' }] };
    }
    if (typeName === '关系') {
      const [, left, right, dimension, status, reason, result] = parts;
      if (!left || !right || !dimension || !status || !reason || !result) return null;
      if (/^(?:好感|好感度|信任|依赖|警惕|畏惧|反感|愤怒|恐惧|紧张|安心|悲伤|开心|高兴)$/u.test(dimension) || /^[-+]?\d/u.test(status)) return null;
      return { updateType: 'relationship', subject, field: `relationships.${dimension}`, change: { mode: 'upsert', value: { left, right, dimension, status, reason, result } }, reasons: [{ trigger: '关系变化', evidence: reason, confidence: 'confirmed' }] };
    }
    if (typeName === '角色卡') {
      const [, field, op, value, reason, result] = parts;
      const allowed = ['当前状态', '身份', '职业', '技能', '知识', '外貌', '性格', '喜好', '人物说明', '社群角色', '势力地位', '人际关系'];
      if (!field || !op || !value || !['替换', '增加'].includes(op) || !allowed.includes(field)) return null;
      return { updateType: 'role-card', subject, field: field === '当前状态' ? 'status_tags' : `profile.${field}`, change: { mode: op === '替换' ? 'set' : 'append', value: { value, reason, result } }, reasons: [{ trigger: `角色卡${op}`, evidence: reason || value, confidence: 'confirmed' }] };
    }
    return null;
  },

  parseCompactSettlementJson(raw = '') {
    const text = String(raw || '').trim().replace(/^```(?:json)?\s*/iu, '').replace(/```$/u, '').trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
  },

  settlementJsonSubject(type = '', entry = {}, participants = []) {
    const rawName = entry?.subject ?? entry?.主体 ?? entry?.name ?? entry?.名称 ?? '';
    const name = String(rawName || '').trim();
    const participant = this.subjectForSettlement(name, participants);
    if (participant) return participant;
    const defaults = {
      '地图': { type: '地点', id: name || '当前地点', name: name || '当前地点' },
      '势力总览': { type: '势力', id: name || '势力', name: name || '势力' },
      '势力结构': { type: '势力', id: name || '势力', name: name || '势力' },
      '系统记录': { type: 'system', id: name || '系统', name: name || '系统' },
      '通用固化': { type: 'system', id: name || '系统', name: name || '系统' },
      '物品': { type: '物品', id: name || '物品', name: name || '物品' },
    };
    return defaults[type] || null;
  },

  settlementJsonText(value = '') {
    return String(value ?? '').trim().replace(/[，,]/gu, '；');
  },

  settlementJsonUpdateLine(type = '', entry = {}) {
    const t = (value) => this.settlementJsonText(value);
    const field = t(entry.field ?? entry.字段 ?? entry.key ?? entry.类型 ?? entry.part ?? entry.部位 ?? '');
    const value = t(entry.value ?? entry.变化 ?? entry.新值 ?? entry.delta ?? entry.数值 ?? entry.status ?? entry.state ?? entry.事实 ?? '');
    const reason = t(entry.reason ?? entry.原因 ?? entry.evidence ?? entry.证据 ?? '');
    if (type === '穿着状态') return `更新N：穿着状态，${t(entry.part ?? entry.部位)}，${t(entry.item ?? entry.itemName ?? entry.衣物 ?? entry.衣物名称)}，${t(entry.state ?? entry.status ?? entry.状态)}，${reason}`;
    if (type === '身体状态') return `更新N：身体状态，${t(entry.part ?? entry.部位)}，${t(entry.status ?? entry.value ?? entry.状态)}，${reason}`;
    if (type === '性经历') return `更新N：性经历，${t(entry.part ?? entry.部位)}，${t(entry.delta ?? entry.value ?? entry.变化)}，${reason}`;
    if (type === '性历史') return `更新N：性历史，${t(entry.transition ?? entry.状态转移 ?? entry.field ?? entry.字段)}，${t(entry.partner ?? entry.对象 ?? entry.value)}，${t(entry.evidence ?? entry.reason ?? entry.证据)}`;
    if (type === '关系') return `更新N：关系，${t(entry.left ?? entry.左方 ?? entry.subject ?? entry.主体)}，${t(entry.right ?? entry.右方 ?? entry.target ?? entry.对象)}，${t(entry.dimension ?? entry.维度 ?? entry.field)}，${t(entry.status ?? entry.状态 ?? entry.value)}，${reason}，${t(entry.result ?? entry.结果 ?? entry.value)}`;
    if (type === '角色卡') return `更新N：角色卡，${field}，${t(entry.op ?? entry.操作 ?? '增加')}，${value}，${reason}，${t(entry.result ?? entry.结果 ?? value)}`;
    return `更新N：${type}，${field}，${value}，${reason}`;
  },

  parseRelationshipJsonEntry(entry = {}, subject = null, participants = []) {
    const t = (value) => this.settlementJsonText(value);
    const player = (participants || []).find((p) => p?.type === 'player');
    const left = t(entry.left ?? entry.左方 ?? entry.actor ?? entry.甲方 ?? player?.name ?? player?.id ?? '');
    const right = t(entry.right ?? entry.右方 ?? entry.target ?? entry.对象 ?? entry.乙方 ?? subject?.name ?? subject?.id ?? '');
    const dimension = t(entry.dimension ?? entry.维度 ?? entry.field ?? entry.字段 ?? '');
    const status = t(entry.status ?? entry.状态 ?? entry.value ?? entry.关系状态 ?? '');
    const reason = t(entry.reason ?? entry.原因 ?? entry.evidence ?? entry.证据 ?? '');
    const result = t(entry.result ?? entry.结果 ?? status);
    if (!subject || !left || !right || !dimension || !status || !reason || !result) return null;
    if (/^(?:好感|好感度|信任|依赖|警惕|畏惧|反感|愤怒|恐惧|紧张|安心|悲伤|开心|高兴)$/u.test(dimension) || /^[-+]?\d/u.test(status)) return null;
    return { updateType: 'relationship', subject, field: `relationships.${dimension}`, change: { mode: 'upsert', value: { left, right, dimension, status, reason, result } }, reasons: [{ trigger: '关系变化', evidence: reason, confidence: 'confirmed' }] };
  },

  parseSettlementJson(raw, { requestedTypes = [], participants = [], store = null, config = this.realConfig() } = {}) {
    const data = this.parseCompactSettlementJson(raw);
    if (!data || Array.isArray(data) || typeof data !== 'object') return null;
    const patchesByType = {};
    const completeTypes = [];
    const incompleteTypes = [];
    const baseFields = {};
    const baseKeys = ['经过时间', '当前状态', '当前目标', '场景标题', '地点名称', '备选行动1', '备选行动2', '备选行动3', '备选行动4'];
    const specialParsers = {
      '人事安排': (line, subject) => this.parseScheduleSettlementLine(line, subject, participants),
      '系统记录': (line, subject) => this.parseSystemSettlementLine(line, subject, participants),
      '穿着状态': (line, subject) => this.parseWearingSettlementLine(line, subject, participants),
      '身体状态': (line, subject) => this.parseBodyStatusSettlementLine(line, subject, participants),
      '性经历': (line, subject) => this.parseSexualExperienceSettlementLine(line, subject, participants),
    };
    requestedTypes.forEach((type) => {
      const value = data[type];
      const patch = { genericUpdates: [], baseFields: {}, __updateLines: 0, __parsedUpdates: 0, __lines: [JSON.stringify({ [type]: value })], __closedByBrace: value !== undefined };
      if (value === undefined) {
        incompleteTypes.push(type);
        patchesByType[type] = patch;
        return;
      }
      if (type === '基础结算') {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          ['经过时间', '当前状态', '当前目标', '场景标题', '地点名称'].forEach((key) => { if (value[key] !== undefined) patch.baseFields[key] = String(value[key]).trim(); });
          const choices = Array.isArray(value['备选行动']) ? value['备选行动'] : [];
          [1, 2, 3, 4].forEach((index) => {
            const key = `备选行动${index}`;
            const choice = value[key] ?? choices[index - 1];
            if (choice !== undefined) patch.baseFields[key] = String(choice).trim();
          });
        }
      } else if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            if (entry !== undefined && entry !== null) patch.__updateLines += 1;
            return;
          }
          patch.__updateLines += 1;
          const subject = this.settlementJsonSubject(type, entry, participants) || this.defaultSubjectForSettlement(participants);
          const line = this.settlementJsonUpdateLine(type, entry);
          const update = type === '关系'
            ? this.parseRelationshipJsonEntry(entry, subject, participants)
            : (['情绪', '感觉'].includes(type)
              ? this.parseMetricJsonEntry(type, entry, subject, participants, store)
              : (specialParsers[type]
              ? specialParsers[type](line, subject)
              : (['性历史', '角色卡'].includes(type) ? this.parseSpecialSettlementLine(type, line, subject, participants) : this.parseStandardSettlementLine(type, line, subject, participants, store))));
          if (update) {
            patch.__parsedUpdates += 1;
            patch.genericUpdates.push(update);
          }
        });
      }
      const hasParsedAllUpdates = !patch.__updateLines || patch.__parsedUpdates === patch.__updateLines;
      const hasRequiredBaseFields = type !== '基础结算' || baseKeys.every((key) => String(patch.baseFields[key] || '').trim());
      patchesByType[type] = patch;
      if (hasParsedAllUpdates && hasRequiredBaseFields && (type === '基础结算' || Array.isArray(value))) {
        completeTypes.push(type);
        if (type === '基础结算') Object.assign(baseFields, patch.baseFields);
      } else incompleteTypes.push(type);
    });
    const genericUpdates = completeTypes.flatMap((type) => patchesByType[type]?.genericUpdates || []);
    return { format: 'json', patchesByType, completeTypes, incompleteTypes, genericUpdates, baseFields };
  },

  parseSettlementKv(raw, { requestedTypes = [], participants = [], store = null, config = this.realConfig() } = {}) {
    const contracts = this.settlementTypeContracts();
    const labelsForType = ([type, c]) => [c.title, type];
    const headingPrefix = (line = '') => Object.entries(contracts).find((entry) => labelsForType(entry).some((label) => line === `${label}：` || line === `${label}:` || line === `${label}{` || line === `${label} {` || line.startsWith(`${label}：`) || line.startsWith(`${label}:`)));
    const lines = String(raw || '').replace(/；/gu, '\n').split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
      const hit = headingPrefix(line);
      if (!hit) return [line];
      const labels = labelsForType(hit);
      const braceLabel = labels.find((item) => line === `${item}{` || line === `${item} {`);
      if (braceLabel) return [`${hit[1].title}{`];
      const label = labels.find((item) => line.startsWith(`${item}：`) || line.startsWith(`${item}:`));
      const rest = line.slice(String(label || '').length + 1).trim();
      return rest ? [`${hit[1].title}：`, rest] : [`${hit[1].title}：`];
    });
    const patchesByType = {};
    const completeTypes = [];
    const incompleteTypes = [];
    const baseFields = {};
    const blocksByType = {};
    let currentBlock = null;
    const baseKeys = ['经过时间', '当前状态', '当前目标', '场景标题', '地点名称', '备选行动1', '备选行动2', '备选行动3', '备选行动4'];
    const settlementTypeFromHeading = (line) => Object.entries(contracts).find((entry) => labelsForType(entry).some((label) => line === `${label}：` || line === `${label}:` || line === `${label}{` || line === `${label} {`));
    for (const line of lines) {
      const typeHit = settlementTypeFromHeading(line);
      if (typeHit) {
        if (currentBlock) currentBlock.closedByNextHeading = true;
        const type = typeHit[0];
        currentBlock = { type, lines: [line], closedByNextHeading: false, closedByBrace: false };
        blocksByType[type] = blocksByType[type] || [];
        blocksByType[type].push(currentBlock);
        continue;
      }
      if (line === '}') {
        if (currentBlock) currentBlock.closedByBrace = true;
        currentBlock = null;
        continue;
      }
      if (currentBlock) currentBlock.lines.push(line);
    }
    const parseBlock = (type, block = { lines: [] }, blockCount = 1) => {
      const blockLines = block.lines || [];
      const patch = { genericUpdates: [], baseFields: {}, __updateLines: 0, __parsedUpdates: 0, __lines: blockLines.slice(), __headingCount: blockCount, __closedByNextHeading: Boolean(block.closedByNextHeading), __closedByBrace: Boolean(block.closedByBrace) };
      let currentSubject = null;
      const subjectFallbackTypes = ['情绪', '感觉', '生命体征', '身体状态', '穿着状态', '性经历', '性历史', '关系', '角色卡', '物品'];
      const defaultSubject = subjectFallbackTypes.includes(type) ? this.defaultSubjectForSettlement(participants) : null;
      const normalizeLegacySubjectLine = (line) => {
        const match = String(line || '').match(/^([^：:]+)[：:]\s*(.+)$/u);
        if (!match || /^结算状态$/u.test(match[1])) return null;
        const subject = this.subjectForSettlement(match[1].trim(), participants);
        if (!subject) return null;
        const rest = match[2].trim();
        const first = rest.split(/[，,]/u)[0]?.trim();
        if (!first || (first !== type && first !== contracts[type]?.title?.replace(/结算$/u, ''))) return null;
        return { subject, line: `更新N：${rest}` };
      };
      blockLines.slice(1).forEach((line) => {
        if (type === '基础结算') {
          const base = this.splitKvLine(line);
          if (base && baseKeys.includes(base.key)) {
            patch.baseFields[base.key] = base.value;
            return;
          }
        }
        if (/^(?:结算对象|参与者)[：:]/u.test(line)) {
          const [name, objectType, allowed] = line.replace(/^(?:结算对象|参与者)[：:]/u, '').split(/[｜|]/u).map((x) => x.trim());
          const isSceneParticipant = this.participantAllowedForSettlement(name, participants);
          const isScheduleSubject = type === '人事安排' && ['角色', '玩家'].includes(objectType);
          const isNonCharacterSystem = type !== '人事安排' && ['地点', '势力', '世界', '系统'].includes(objectType);
          currentSubject = allowed === '允许结算' && ((type === '人事安排' && isScheduleSubject && isSceneParticipant) || (type !== '人事安排' && (isSceneParticipant || isNonCharacterSystem))) ? (this.subjectForSettlement(name, participants) || { type: objectType || 'system', id: name, name }) : null;
          return;
        }
        const legacy = normalizeLegacySubjectLine(line);
        const updateLine = legacy?.line || line;
        const updateSubject = legacy?.subject || currentSubject || defaultSubject;
        if (/^更新(?:\d+|N)[：:]/u.test(updateLine)) {
          patch.__updateLines += 1;
          const specialParsers = {
            '人事安排': () => this.parseScheduleSettlementLine(updateLine, updateSubject, participants),
            '系统记录': () => this.parseSystemSettlementLine(updateLine, updateSubject, participants),
            '穿着状态': () => this.parseWearingSettlementLine(updateLine, updateSubject, participants),
            '身体状态': () => this.parseBodyStatusSettlementLine(updateLine, updateSubject, participants),
            '性经历': () => this.parseSexualExperienceSettlementLine(updateLine, updateSubject, participants),
          };
          const update = specialParsers[type]
            ? specialParsers[type]()
            : (['性历史', '关系', '角色卡'].includes(type) ? this.parseSpecialSettlementLine(type, updateLine, updateSubject, participants) : this.parseStandardSettlementLine(type, updateLine, updateSubject, participants, store));
          if (update) {
            patch.__parsedUpdates += 1;
            patch.genericUpdates.push(update);
          }
          return;
        }
        if (/^类型完成[：:]是$/u.test(line)) { patch.__typeDone = true; return; }
        if (/^结算结束[：:]是$/u.test(line)) patch.__settlementDone = true;
      });
      return patch;
    };
    const patchIsComplete = (type, patch) => {
      const hasParsedAllUpdates = !patch?.__updateLines || patch.__parsedUpdates === patch.__updateLines;
      const hasRequiredBaseFields = type !== '基础结算' || baseKeys.every((key) => String(patch?.baseFields?.[key] || '').trim());
      const hasBraceCompletion = Boolean(patch?.__closedByBrace);
      return Boolean(hasBraceCompletion && hasParsedAllUpdates && hasRequiredBaseFields);
    };
    const patchScore = (type, patch) => {
      const malformedUpdates = Math.max(0, (patch?.__updateLines || 0) - (patch?.__parsedUpdates || 0));
      return (patchIsComplete(type, patch) ? 10000 : 0)
        + (patch?.__closedByBrace ? 300 : 0)
        + (patch?.__typeDone ? 100 : 0)
        + (patch?.__settlementDone ? 100 : 0)
        + ((patch?.__parsedUpdates || 0) * 100)
        + (Object.keys(patch?.baseFields || {}).length * 20)
        + ((!patch?.__updateLines || patch.__parsedUpdates === patch.__updateLines) ? 50 : 0)
        - (malformedUpdates * 200);
    };
    requestedTypes.forEach((type) => {
      const blocks = blocksByType[type] || [];
      const candidates = blocks.map((block) => parseBlock(type, block, blocks.length));
      let patch = null;
      if (candidates.length > 1 && candidates.every((item) => patchIsComplete(type, item))) {
        patch = candidates.reduce((merged, item) => ({
          ...merged,
          baseFields: { ...(merged.baseFields || {}), ...(item.baseFields || {}) },
          genericUpdates: [...(merged.genericUpdates || []), ...(item.genericUpdates || [])],
          __parsedUpdates: (merged.__parsedUpdates || 0) + (item.__parsedUpdates || 0),
          __updateLines: (merged.__updateLines || 0) + (item.__updateLines || 0),
          __lines: [...(merged.__lines || []), ...(item.__lines || [])],
          __closedByBrace: true,
        }), { genericUpdates: [], baseFields: {}, __updateLines: 0, __parsedUpdates: 0, __lines: [], __headingCount: candidates.length, __closedByBrace: true });
      } else {
        patch = candidates.sort((a, b) => patchScore(type, b) - patchScore(type, a))[0];
      }
      if (patch) patchesByType[type] = patch;
      if (patchIsComplete(type, patch)) {
        completeTypes.push(type);
        if (type === '基础结算') Object.assign(baseFields, patch.baseFields);
      } else incompleteTypes.push(type);
    });
    const genericUpdates = completeTypes.flatMap((type) => patchesByType[type]?.genericUpdates || []);
    return { patchesByType, completeTypes, incompleteTypes, genericUpdates, baseFields };
  },

  settlementTypeShortRule(type = '') {
    const contracts = this.settlementTypeContracts();
    const c = contracts[type] || { title: `${type}结算`, format: '更新N：类型，字段，变化，原因' };
    const rules = {
      '情绪': '字段只能使用本轮“当前情绪基线”里已有指标名；value 必须是 +N/-N 且不能为 0；可把愉悦/开心映射为高兴、惊慌映射为恐惧、不安映射为紧张；没有对应已有指标或无稳定变化时输出空数组。字段含义：field=情绪指标名，value=本回合变化量，reason=正文中的具体行为/对话证据，status=变化后该情绪在角色内心的程度描写（12-50字，站在角色角度写体感，禁止抽象阶段词）；reason 只写证据，status 只写程度。',
      '感觉': '主体只能是出场 NPC，不能是玩家；字段只能使用“出场角色对玩家感觉基线”里已有指标名；value 必须是 +N/-N 且不能为 0；可把信赖映射为信任、亲近映射为好感、害怕映射为畏惧、厌恶映射为反感。字段含义：field=感觉指标名，value=本回合变化量，reason=正文中证明该 NPC 对玩家态度变化的具体证据，status=变化后该感觉对玩家本人的程度描写（12-50字，站在角色角度写内心体感，如高肉欲可写身体反应与难以拒绝；禁止写“几乎压倒性支配”等模板句）；reason 只写证据，status 只写程度。',
      '生命体征': '字段只能是：生命力、精力、饱食度、水分、疲劳、精神稳定；允许别名输入但最终字段写这 6 个中文名；禁止心率、体温、呼吸频率、血压、血氧、瞳孔、激素、行动能力、肌肉紧张度等新指标；变化必须是 +N/-N 且不能为 0；健康正常或无稳定变化时输出空数组。',
      '身体状态': '部位只能是：整体/全身、口部/嘴部/嘴唇、胸部/胸口/乳房、阴部/私处、肛部、臀部/屁股、四肢/手臂/腿部、皮肤、其他；整体/全身与局部部位互不冲突，同轮同人可写多条，正文中有就应全部写入；整体写全身综合状态，局部写对应部位细节；禁止把坐姿、可用状态、手指动作等写成新部位字段；全身发颤/肌肉反应等写整体或四肢，不要写进生命体征。',
      '穿着状态': '穿着部位只能是：全身/整体、胸部/胸口/乳房、上身、外套、下身、腿部/大腿、足部/脚部、内裤、饰品；全身/整体会按外套处理并清空其他衣物槽；同轮若还有局部部位，先应用全身再覆盖局部部位；禁止肩部、腰部、衣领、吊带位置等非槽位字段；必须包含衣物名称和当前状态。',
      '性经历': '分类只能是：阴部、胸部/胸口/乳房、唇部/接吻、口部/嘴部、口部行为、口交、口交中出、阴部进入、阴道插入、阴道中出、肛部/肛门、肛部进入、肛交、肛交中出、腿部/大腿、臀部/屁股、手部/手、皮肤、其他；delta 必须是 +N/-N 且不能为 0；禁止写总次数/总数/全部；无相关行为时输出空数组。',
      '关系': '只记录稳定关系维度，如亲属、朋友、同事、师生、雇佣、敌对、同居、恋人；好感、信任、依赖、警惕等数值态度写“感觉”，不要写关系。',
      '角色卡': '只写稳定角色卡字段：当前状态、身份、职业、技能、知识、外貌、性格、喜好、人物说明、社群角色、势力地位、人际关系；临时情绪、生命体征、身体、穿着、关系、物品有专门类型时不得写角色卡。',
      '地图': '字段只能是：当前位置、上级地点、地点事实、地图节点、路线事实；角色当前所在地优先写人事安排，不要把角色行动写成地图事实。地图节点最小颗粒度为建筑物（如3栋2单元）或小区级POI（公园、商店）；走廊、楼梯间、单个房间只写当前位置，不要作为地图节点。禁止在本类型写 effectiveOrgId/控势，那属于领土控势。',
      '领土控势': '仅当正文确认已揭示地点的夺控、解放、移交、占领或争议状态时更新；字段：地点名、实控组织、宣称组织、控势状态；未 revealed 地点不得写；同轮同一地点最多一条；普通到达/看见不写本类型。',
      '人事安排': '只更新本回合 participants 中的参与者；field 只能是 当前地点、当前行动、可用状态；正在做什么必须写 当前行动，value 用短句写具体动作（如「从背后抱住刘思琪并揉捏胸部」）；可用状态 value 只能是 在场/场外/暂不可用/未知，禁止把动作或身体反应写进可用状态；reason 只写正文证据，不要重复 value；同一人可写多条（地点、行动、可用状态各一条）；弱推测不更新。',
      '势力总览': '字段只能是：新增势力、上层势力归属、势力APP归属；组织内部部门、职位、成员地位写势力结构。',
      '政体状态': '字段：组织名、status（active/rebel/independent/dissolved/merged）、legitimacy、successorId；合并/解散须写 successor；地图控势另写领土控势。',
      '势力结构': '字段只能是：部门角色、职位、成员地位；势力是否存在或隶属关系写势力总览。新建 fog 节点只写名称与意图，上级未明写「迷雾」，禁止猜国防部等。',
      '组织能力': '字段：能力维度（政治/经济/资产/军事）、条目名称、条目状态、上级归属；新设条目无草案时 state=fog 且上级=迷雾；部门/职位/任职写势力结构，不要混用。',
      '人事归属': '字段：组织名/orgId、部门、职位；对应 values.memberships；部门未明写 departmentFog；与势力 structure 占坑可同时存在但需一致；抽象「公民/居民」不得写。',
      '系统记录': '只写系统级、跨角色、且没有专门类型承载的长期事实：日历变更、微信/短信通信、世界线节点、不可逆公共事件、全局状态。禁止把角色当前行动、所在地点、身体反应、感觉、关系、场景描写复述写进系统记录；这些必须分别写人事安排、身体状态、感觉、关系。若正文事实已被世界线记录覆盖，系统记录写空数组 []。',
      '通用固化': '只能写没有专门类型承载的长期稳定标签；情绪、感觉、生命体征、身体、穿着、性经历、性历史、关系、物品、地图、人事、势力、系统记录有专门类型时不得写通用固化。',
    };
    return [
      `${c.title}规则：`,
      rules[type] || '只有本轮稳定事实明确支持时才更新；弱氛围、猜测或未确认变化不更新。',
    ].join('\n');
  },

  settlementMetricExample(store = {}, participants = [], metricType = '') {
    const rows = (Array.isArray(participants) ? participants : []).filter((p) => metricType !== '感觉' || p?.type === 'character');
    for (const participant of rows) {
      const keys = this.settlementMetricKeysForSubject(store, participant, metricType);
      if (keys.length) return { subject: participant.name || participant.id, field: keys[0] };
    }
    return null;
  },

  settlementTypeJsonExample(type = '', participants = [], store = {}) {
    const chars = (Array.isArray(participants) ? participants : []).filter((p) => p?.type === 'character');
    const player = (Array.isArray(participants) ? participants : []).find((p) => p?.type === 'player');
    const subject = chars[0]?.name || chars[0]?.id || player?.name || player?.id || '角色名';
    const playerName = player?.name || player?.id || '玩家名';
    const otherName = chars[1]?.name || chars[1]?.id || subject;
    if (type === '基础结算') return '"基础结算":{"经过时间":60,"当前状态":"当前稳定状态","当前目标":"下一步目标","场景标题":"场景标题","地点名称":"地点名","备选行动":["行动一","行动二","行动三","行动四"]}';
    if (type === '情绪') {
      const ex = this.settlementMetricExample(store, participants, '情绪');
      return ex ? `"情绪":[{"subject":"${ex.subject}","field":"${ex.field}","value":"+1","reason":"正文中的明确行为或对话证据","status":"站在角色角度写变化后该情绪的内心程度"}]` : '"情绪":[]';
    }
    if (type === '感觉') {
      const ex = this.settlementMetricExample(store, participants, '感觉');
      return ex ? `"感觉":[{"subject":"${ex.subject}","field":"${ex.field}","value":"+1","reason":"该 NPC 对玩家态度变化的明确证据","status":"站在角色角度写变化后对玩家该感觉的内心程度"}]` : '"感觉":[]';
    }
    if (type === '生命体征') return `"生命体征":[{"subject":"${subject}","field":"疲劳","value":"+1","reason":"正文明确出现持续消耗或疲惫证据"}]`;
    if (type === '身体状态') return `"身体状态":[{"subject":"${subject}","part":"整体","status":"全身综合状态","reason":"正文明确全身状态证据"},{"subject":"${subject}","part":"胸部","status":"局部部位状态","reason":"正文明确该部位证据"}]`;
    if (type === '穿着状态') return `"穿着状态":[{"subject":"${subject}","part":"外套","item":"衣物名称","state":"当前状态","reason":"正文明确穿着变化证据"}]`;
    if (type === '性经历') return `"性经历":[{"subject":"${subject}","part":"分类","delta":"+1","reason":"正文明确性相关行为证据"}]`;
    if (type === '性历史') return `"性历史":[{"subject":"${subject}","transition":"状态转移","partner":"对象","evidence":"正文明确证据"}]`;
    if (type === '关系') return `"关系":[{"subject":"${subject}","left":"${playerName}","right":"${subject}","dimension":"亲属关系","status":"稳定亲密","reason":"正文中能证明关系状态的具体证据","result":"维持稳定亲密关系"}]`;
    if (type === '角色卡') return `"角色卡":[{"subject":"${subject}","field":"当前状态","op":"增加","value":"稳定状态标签","reason":"正文明确且可长期固化的证据","result":"加入状态标签"}]`;
    if (type === '物品') return `"物品":[{"subject":"${subject}","field":"持有物","value":"物品状态","reason":"正文明确物品变化证据"}]`;
    if (type === '地图') return '"地图":[{"subject":"地点名","field":"地点事实","value":"稳定地点事实","reason":"正文明确地点证据"}]';
    if (type === '人事安排') return `"人事安排":[{"subject":"${subject}","field":"当前行动","value":"正在做的具体动作","reason":"正文明确行动证据"},{"subject":"${subject}","field":"可用状态","value":"在场","reason":"正文明确在场证据"}]`;
    if (type === '势力总览') return '"势力总览":[{"subject":"势力名","field":"新增势力","value":"势力事实","reason":"正文明确势力证据"}]';
    if (type === '势力结构') return `"势力结构":[{"subject":"势力名","field":"成员地位","value":"${subject}的稳定地位","reason":"正文明确组织证据"}]`;
    if (type === '系统记录') return '"系统记录":[{"subject":"系统","field":"通信消息","value":"已确认的系统级通信或日程事实","reason":"正文明确且不属于角色卡/人事安排的证据"}]';
    if (type === '通用固化') return `"通用固化":[{"subject":"${subject}","field":"长期标签","value":"稳定标签","reason":"正文明确且无专门类型承载"}]`;
    if (type === '操控体验') return '"操控体验":[{"subject":"系统","field":"体验","value":"稳定体验变化","reason":"正文明确体验证据"}]';
    return `"${type}":[]`;
  },

  settlementTypeAntiExample(type = '') {
    const map = {
      '情绪': '反例：{"field":"惊慌","value":"+0"}（新造字段或 0 变化）；正确：用基线已有字段且 +N/-N，或 []。',
      '感觉': '反例：{"subject":"玩家","field":"警戒"}（玩家不能是感觉主体，警戒不是基线字段）；正确：NPC subject + 基线已有字段，或 []。',
      '生命体征': '反例：{"field":"心率","value":"98/100"}、{"field":"精神稳定","value":"+0"}；正确：六个允许字段 + 非零增减，或 []。',
      '身体状态': '反例：正文同时有全身发颤和胸部被触碰，却只写一条或省略整体；正确：整体与局部各写一条（或多条局部），或确实无变化时 []。',
      '性经历': '反例：把共处、拥抱、照顾写成性经历；正确：没有明确性相关行为就 []。',
      '关系': '反例：{"dimension":"好感","status":"+5"}、缺 right/result；正确：dimension 写亲属/朋友/恋人/敌对等稳定关系，status 写关系状态。',
      '角色卡': '反例：{"op":"保持"}、把临时情绪/穿着写入角色卡；正确：op 只能 替换/增加，且必须是长期稳定字段。',
      '系统记录': '反例：{"field":"事件","value":"刘悠进入房间并抱住对方"}（这是人事/感觉/正文复述）；正确：写微信消息、日历事项、世界线节点，或 []。',
    };
    return map[type] || '';
  },

  settlementParticipantMetrics(store = {}, participant = {}) {
    const state = participant?.type === 'player'
      ? store?.playerIdentityState?.()
      : (store?.itemSkillState?.(participant.id) || store?.itemSkillState?.(participant.idOrName) || store?.rpgStates?.[participant.id]);
    return state?.metrics || (state ? store?.ensureStateMetrics?.(state) : null) || {};
  },

  settlementMetricKeysForSubject(store = {}, subject = {}, metricType = '') {
    if (metricType === '感觉' && subject?.type === 'player') return [];
    const participant = { type: subject?.type, id: subject?.id, idOrName: subject?.id, name: subject?.name };
    const metrics = this.settlementParticipantMetrics(store, participant);
    const group = metricType === '感觉' ? metrics.playerFeelings : metrics.emotions;
    return Object.keys(group || {}).filter((key) => String(key || '').trim());
  },

  settlementParticipantContextText(store = {}, participants = []) {
    const playerName = String(store?.playerName || store?.playerProfile?.name || store?.realWorldPlayerSettlementName?.() || '玩家').trim() || '玩家';
    const chars = (Array.isArray(participants) ? participants : []).filter((p) => p?.type === 'character');
    const roleRows = chars.map((participant) => {
      const state = store?.itemSkillState?.(participant.id) || store?.itemSkillState?.(participant.idOrName) || store?.rpgStates?.[participant.id];
      const profile = state?.profile || {};
      const facts = [profile.role || state?.role, profile.relationship || profile.identity, profile.age ? `${profile.age}岁` : ''].filter(Boolean).join('；') || '角色卡已加载';
      return `${participant.name || participant.id}：${facts}`;
    }).join('\n') || '无';
    const bindings = [`你=${playerName}（玩家）`].concat(chars.map((p) => `${p.name || p.id}=出场角色，结算主体必须直接写姓名`)).join('\n');
    return [
      '玩家与出场人物标注：',
      `玩家：${playerName}`,
      `出场角色：${chars.map((p) => p.name || p.id).filter(Boolean).join('、') || '无'}`,
      '指代绑定：',
      bindings,
      '出场人物角色卡摘要：',
      roleRows,
    ].join('\n');
  },

  settlementMetricBaselineText(store = {}, participants = []) {
    const emotionKeys = new Set();
    const feelingKeys = new Set();
    const format = (group = {}, keySet = null) => Object.entries(group || {}).filter(([, value]) => value !== undefined && value !== null && value !== '').map(([key, value]) => {
      if (keySet) keySet.add(key);
      return `${key}=${value}`;
    }).join('、') || '无';
    const rows = (Array.isArray(participants) ? participants : []).map((participant) => {
      const metrics = this.settlementParticipantMetrics(store, participant);
      const state = participant?.type === 'player'
        ? store?.playerIdentityState?.()
        : (store?.itemSkillState?.(participant.id) || store?.itemSkillState?.(participant.idOrName) || store?.rpgStates?.[participant.id]);
      const label = participant?.name || state?.profile?.name || participant?.id || '';
      if (!label) return null;
      return { type: participant?.type, label, emotions: format(metrics.emotions, emotionKeys), playerFeelings: format(metrics.playerFeelings, participant?.type === 'character' ? feelingKeys : null) };
    }).filter(Boolean);
    const characterRows = rows.filter((row) => row.type === 'character');
    const playerRows = rows.filter((row) => row.type === 'player');
    const emotionRows = characterRows.map((row) => `${row.label}：情绪：${row.emotions}`).join('\n') || '无';
    const playerEmotionRows = playerRows.map((row) => `${row.label}：玩家自我情绪：${row.emotions}`).join('\n') || '无';
    const feelingRows = characterRows.map((row) => `${row.label}：对玩家感觉：${row.playerFeelings}`).join('\n') || '无';
    const emotionWhitelist = [...emotionKeys].join('、') || '无';
    const feelingWhitelist = [...feelingKeys].join('、') || '无';
    return [
      '出场角色当前情绪基线：',
      emotionRows,
      '玩家自我状态基线：',
      playerEmotionRows,
      `情绪指标只能使用上述情绪基线中已经存在的指标名：${emotionWhitelist}`,
      '出场角色对玩家感觉基线：',
      feelingRows,
      `感觉指标只能使用出场角色对玩家感觉基线中已经存在的指标名：${feelingWhitelist}`,
      '若稳定事实不对应上述已有指标名，必须写“无变化”，不得新造情绪/感觉指标。',
      '边界：情绪是对应主体当前内在情绪；感觉只表示出场角色对玩家的感觉，玩家本人不得作为“对玩家感觉”的结算主体。',
    ].join('\n');
  },

  async buildSettlementTypeWindowMessages({ requestedTypes = [], completedTypes = [], incompleteTypes = [], partialByType = {}, store, action, base, loaded, materialSession = null, narration, trace = [], participants = [], config = this.realConfig() }) {
    const contracts = this.settlementTypeContracts();
    const totalTypes = requestedTypes.length;
    const jsonContracts = requestedTypes.map((type) => {
      const c = contracts[type];
      if (type === '基础结算') return '基础结算：对象，必须含 keys：经过时间、当前状态、当前目标、场景标题、地点名称、备选行动；备选行动必须是 4 个字符串数组。';
      if (type === '穿着状态') return '穿着状态：数组；每项 {"subject":"姓名","part":"部位","item":"衣物名称","state":"当前状态","reason":"证据"}；无变化 []。';
      if (type === '身体状态') return '身体状态：数组；每项 {"subject":"姓名","part":"部位","status":"状态","reason":"证据"}；同轮可有多条，整体/全身与局部部位互不冲突；无变化 []。';
      if (type === '性经历') return '性经历：数组；每项 {"subject":"姓名","part":"分类","delta":"+N/-N","reason":"证据"}；无变化 []。';
      if (type === '性历史') return '性历史：数组；每项 {"subject":"姓名","transition":"状态转移","partner":"对象","evidence":"证据"}；无变化 []。';
      if (type === '情绪') return '情绪：数组；每项 {"subject":"姓名","field":"情绪指标名","value":"+N/-N","reason":"正文中的具体行为或对话证据","status":"12-50字角色内心程度描写"}；无变化 []。status 必填且须站在角色角度写体感，禁止抽象阶段模板句。';
      if (type === '感觉') return '感觉：数组；每项 {"subject":"出场NPC姓名","field":"感觉指标名","value":"+N/-N","reason":"正文证据证明该NPC对玩家态度变化","status":"12-50字角色对玩家该感觉的内心程度"}；无变化 []。status 必填且须站在角色角度写对玩家的体感，禁止抽象阶段模板句。';
      if (type === '关系') return '关系：数组；每项 {"subject":"姓名","left":"关系左方","right":"关系右方","dimension":"稳定关系维度","status":"关系状态","reason":"证据","result":"结算结果"}；无变化 []。';
      if (type === '角色卡') return '角色卡：数组；每项 {"subject":"姓名","field":"字段","op":"替换/增加","value":"内容","reason":"证据","result":"结果"}；无变化 []。';
      return `${type}：数组；每项 {"subject":"结算主体","field":"字段","value":"变化或新值","reason":"证据"}；无变化 []。原合约：${c?.format || '更新N：结算主体，字段，变化，原因'}`;
    }).join('\n');
    const globalShortReason = String(partialByType.__shortOutputReason || '').trim();
    const incompleteReason = [globalShortReason, incompleteTypes.map((type) => {
      const detail = String(partialByType[type] || '').trim();
      const safeDetail = /(?:结算状态|结算对象|更新\d*|更新N|结算结束|类型完成|[{}\n\r])/u.test(detail) ? '' : detail;
      return `${type}：${safeDetail || '上轮 JSON 缺失或字段未通过解析，本轮必须重新输出该 key 的完整 JSON 值'}`;
    }).join('；')].filter(Boolean).join('\n') || '无';
    const stableFactRules = [
      '内部提取“本轮稳定事实”：只在内部完成，不输出事实列表。',
      '明确事实：可直接结算。',
      '强暗示事实：可保守结算，但必须有明确行为、对话或连续动作支撑。',
      '弱氛围暗示：不得结算。',
    ].join('\n');
    const requiredKeyOrder = requestedTypes.join(' → ');
    const jsonExamples = `{${requestedTypes.map((type) => this.settlementTypeJsonExample(type, participants, store)).join(',')}}`;
    const antiExamples = requestedTypes.map((type) => this.settlementTypeAntiExample(type)).filter(Boolean).join('\n') || '无';
    const rulesText = [
      '你正在执行 Stage4 紧凑 JSON 滑动结算。',
      '只输出一个合法 JSON 对象；不要 Markdown；不要 ```json 代码块；不要换行；不要解释；不要内部分析。',
      '上一条 assistant 消息是本轮正文材料；只能依据该正文和本条要求中的材料结算。',
      'JSON 顶层 key 只能是“本次必须返回的类型”列出的类型；已完成类型不得重复输出；未列入类型不得输出。',
      '无稳定变化的非基础类型必须输出空数组 []，不要写“无变化”。',
      '情绪、感觉、生命体征、性经历的 value/delta 必须写 +N 或 -N；禁止写 0、+0、100、98/100、正常、无变化。',
      '字段名必须使用合约中的中文 key；禁止输出英文顶层 key，例如 life_signs、relationship、role_card。',
      '感觉主体只能是出场 NPC；玩家本人不得输出感觉更新。',
      '关系 dimension 必须是稳定关系类别，禁止写好感、信任、依赖、警惕、开心、恐惧等数值态度或情绪。',
      '每条更新只能写一个字段，禁止把字段合并成“当前地点/当前行动/可用状态”或“事件/记录/状态”。',
    ].join('\n');
    const requestText = [
      '任务：输出 Stage4 结算紧凑 JSON。',
      `本次必须返回的类型：${requestedTypes.join('、')}`,
      `已完成类型：${completedTypes.join('、') || '无'}`,
      `未完成类型：${incompleteTypes.join('、') || '无'}`,
      `必须输出 key 数量：${totalTypes}`,
      `必须输出 key 顺序：${requiredKeyOrder || '无'}`,
      `未完成类型原因：${incompleteReason}`,
      `本回合参与者：${JSON.stringify(participants)}`,
      '本轮结算材料：',
      [`行动：${this.actionText(action)}`, this.settlementParticipantContextText(store, participants), this.settlementMetricBaselineText(store, participants), stableFactRules].join('\n'),
      '类型短规则：',
      requestedTypes.map((type) => this.settlementTypeShortRule(type)).join('\n\n'),
      'JSON 合约：',
      jsonContracts,
      '本次窗口合法 JSON 示例，只能参考结构；没有正文证据时对应数组必须改成 []：',
      jsonExamples,
      '本次窗口常见错误反例，必须避免：',
      antiExamples,
      '输出硬规则：',
      '- 只输出一个紧凑 JSON 对象，首字符必须是 {，末字符必须是 }。',
      '- 顶层 key 必须且只能包含本次必须返回的类型；按必须输出 key 顺序排列。',
      '- 基础结算必须输出完整对象；非基础类型必须输出数组，有变化写对象数组，无变化写 []。',
      '- subject 必须直接写本回合参与者姓名、明确地点名、明确势力名或“系统”；不要写代词。',
      '- reason/evidence 必须写具体行为、对话或连续动作证据；弱氛围暗示不得结算。',
      '- 情绪、感觉、生命体征、性经历的 value/delta 必须是带符号非零变化，例如 +2 或 -1；没有变化输出 []。',
      '- 感觉数组中 subject 只能写出场 NPC，不能写玩家姓名。',
      '- 关系数组中 left/right/dimension/status/reason/result 都必须有；dimension 不能是好感/信任/依赖/警惕等感觉指标。',
      '- 角色卡 op 只能写“替换”或“增加”；不能写保持、无变化、更新。',
      '- 字符串中不要使用英文逗号或中文逗号分隔多字段；必要时用顿号或分号。',
      '- 不要为了凑长度创造更新；空数组是合法完整输出。',
      '合法形态示例：{"情绪":[],"身体状态":[{"subject":"角色名","part":"整体","status":"全身状态","reason":"证据"},{"subject":"角色名","part":"胸部","status":"局部状态","reason":"证据"}],"系统记录":[]}',
    ].join('\n');
    return [
      { role: 'user', content: rulesText },
      { role: 'assistant', content: `本轮正文：\n${this.compactUpdatePromptText(narration, 1800, true)}` },
      { role: 'user', content: requestText },
    ];
  },

  async completeConfiguredSettlementKvWindow({ store, action, base, loaded, materialSession = null, narration, trace = [], participants = [], logId = null, config = this.realConfig() }) {
    const allTypes = this.settlementTypeQueue(config);
    const completedTypes = [];
    const partialByType = {};
    const patchesByType = {};
    let requestedTypes = this.nextSettlementWindow(allTypes, completedTypes, []);
    let shortOutputRetries = 0;
    const maxAttempts = Math.max(8, allTypes.length + 2);
    for (let attempt = 0; attempt < maxAttempts && requestedTypes.length; attempt += 1) {
      const messages = await this.buildSettlementTypeWindowMessages({ requestedTypes, completedTypes, incompleteTypes: requestedTypes.filter((type) => partialByType[type]), partialByType, store, action, base, loaded, materialSession, narration, trace, participants, config });
      const raw = await this.completeConfiguredStep(store, messages, logId, false, { ...config, sourceTitle: `${config.label}Stage4滑动结算`, promptId: 'inference-stage4-settlement-window', settlementAttempt: attempt });
      const jsonParsed = this.parseSettlementJson(raw, { requestedTypes, participants, store, config });
      const parsed = jsonParsed && (jsonParsed.completeTypes.length || jsonParsed.incompleteTypes.length)
        ? jsonParsed
        : this.parseSettlementKv(raw, { requestedTypes, participants, store, config });
      const compactRawLength = String(raw || '').replace(/\s+/gu, '').length;
      const isFinalBatch = requestedTypes.length <= 1 || parsed.incompleteTypes.length === 0;
      const shortOutputThreshold = parsed.format === 'json' ? 0 : 300;
      const isShortPartial = shortOutputThreshold > 0 && !isFinalBatch && compactRawLength < shortOutputThreshold;
      const hasCompleteBlocksInShortOutput = isShortPartial && parsed.completeTypes.length > 0;
      if (isShortPartial && !hasCompleteBlocksInShortOutput) {
        shortOutputRetries += 1;
        partialByType.__shortOutputReason = `上轮返回过短：${compactRawLength}/${shortOutputThreshold}；整轮已丢弃，必须按本次必须返回的类型顺序完整重输全部类型。`;
        if (shortOutputRetries > 1) throw new Error(`Stage4滑动结算返回过短且无完整类型：${compactRawLength}/${shortOutputThreshold}，未完成类型：${requestedTypes.join('、')}`);
        requestedTypes.forEach((type) => { partialByType[type] = '上轮返回过短且无完整类型；本轮必须重新输出该 key 的完整 JSON 值。'; });
        continue;
      }
      shortOutputRetries = 0;
      const acceptedShortReason = hasCompleteBlocksInShortOutput
        ? `上轮返回过短：${compactRawLength}/${shortOutputThreshold}；长度不足，但已验收完整块：${parsed.completeTypes.join('、')}；剩余类型必须完整补齐。`
        : '';
      delete partialByType.__shortOutputReason;
      parsed.completeTypes.forEach((type) => {
        if (!completedTypes.includes(type)) completedTypes.push(type);
        patchesByType[type] = parsed.patchesByType[type];
        delete partialByType[type];
      });
      parsed.incompleteTypes.forEach((type) => {
        const parsedLines = parsed.patchesByType[type]?.__lines || [];
        const parsedCount = parsed.patchesByType[type]?.__parsedUpdates || 0;
        const updateCount = parsed.patchesByType[type]?.__updateLines || 0;
        const cause = updateCount && parsedCount !== updateCount
          ? `字段未通过解析：${parsedCount}/${updateCount} 条有效；请检查 subject、field、value 与合约。`
          : '上轮 JSON 缺失或字段未通过解析。';
        partialByType[type] = parsedLines.length ? `${cause} 本轮必须重新输出该 key 的完整 JSON 值。` : `${cause} 本轮未返回该类型。`;
      });
      if (acceptedShortReason && parsed.incompleteTypes.length) partialByType.__shortOutputReason = acceptedShortReason;
      requestedTypes = this.nextSettlementWindow(allTypes, completedTypes, parsed.incompleteTypes);
    }
    requestedTypes = this.nextSettlementWindow(allTypes, completedTypes, []);
    if (requestedTypes.length) throw new Error(`Stage4结算类型未完成：${requestedTypes.join('、')}`);
    return this.mergeGroupedUpdatePatches(Object.values(patchesByType), {});
  },

  mergeGroupedUpdatePatches(patches = [], route = {}) {
    const merged = { type: 'final', genericUpdates: [] };
    const applyBaseFields = (baseFields = {}) => {
      const choices = ['备选行动1', '备选行动2', '备选行动3', '备选行动4'].map((key) => String(baseFields[key] || '').trim()).filter(Boolean);
      const elapsed = Number(baseFields['经过时间']);
      if (Number.isFinite(elapsed) && elapsed > 0) merged.elapsedSeconds = Math.max(1, Math.round(elapsed));
      if (baseFields['当前状态']) merged.status = String(baseFields['当前状态']).slice(0, 60);
      if (baseFields['当前目标']) merged.quest = String(baseFields['当前目标']).slice(0, 40);
      if (baseFields['场景标题']) merged.sceneTitle = String(baseFields['场景标题']).slice(0, 40);
      if (baseFields['地点名称']) merged.locationName = String(baseFields['地点名称']).slice(0, 60);
      if (choices.length === 4) merged.choices = choices.slice(0, 4);
    };
    ['sceneTitle', 'locationName', 'status', 'quest', 'elapsedSeconds', 'choices'].forEach((key) => {
      if (route[key] !== undefined && route[key] !== null && route[key] !== '') merged[key] = route[key];
    });
    (Array.isArray(patches) ? patches : []).forEach((patch) => {
      if (!patch || typeof patch !== 'object') return;
      applyBaseFields(patch.baseFields || {});
      if (Array.isArray(patch.genericUpdates)) merged.genericUpdates.push(...patch.genericUpdates);
    });
    return merged;
  },

  fallbackUpdateJson(store, action = '', config = this.realConfig()) {
    if (config.mode === 'story') {
      return {
        type: 'final',
        sceneTitle: store.sceneTitle || '剧情继续',
        elapsedSeconds: 60,
        mood: store.mood || '冷静',
        quest: store.quest || '继续观察',
        choices: Array.isArray(store.choices) && store.choices.length ? store.choices.slice(0, 4) : ['观察四周', '尝试行动', '与人交谈', '隐藏异样'],
        statChanges: { health: 0, stamina: 0, mental_stability: 0 },
        metricUpdates: { emotions: [], playerFeelings: [] },
      };
    }
    return {
      type: 'final',
      sceneTitle: store.realWorldSceneTitle || '现实世界',
      locationName: store.realWorldLocationName || store.realWorldMap?.current || '',
      elapsedSeconds: 300,
      status: store.realWorldStatus || '现实推演继续中',
      quest: store.realWorldQuest || '确认现实处境',
      choices: Array.isArray(store.realWorldChoices) && store.realWorldChoices.length ? store.realWorldChoices.slice(0, 4) : ['观察手机异常', '处理现实事务', '联系熟人', '暂时休息'],
      vitalUpdates: [
        { key: 'vitality', delta: 0, reason: '结算保留。' },
        { key: 'stamina_pool', delta: 0, reason: '结算保留。' },
        { key: 'satiety', delta: 0, reason: '结算保留。' },
        { key: 'hydration', delta: 0, reason: '结算保留。' },
        { key: 'fatigue', delta: 0, reason: '结算保留。' },
        { key: 'mental_stability', delta: 0, reason: '结算保留。' },
      ],
    };
  },

  guidedStepFields() {
    return ['查询规划', '资料状态', '地点查询理由', '因果查询理由', '冲突查询理由', '强制出场', '高优先候选', '戏剧候选', '禁止出场', '随机事件候选', '随机事件闯入条件', '资料请求', '资料请求结束', '地点查询', '因果查询', '冲突查询'];
  },

  sceneAnchorFields() {
    return ['场景锚定报告', '当前地点', '当前时间', '空间状态', '当前动作', '强制出场', '高优先候选', '戏剧候选', '禁止出场', '随机事件影响', '正文写作重点', '当前场景影响对象'];
  },

  settlementBaseFields() {
    return ['基础结算', '结算状态', '经过时间', '当前状态', '当前目标', '场景标题', '地点名称', '备选行动1', '备选行动2', '备选行动3', '备选行动4', '结算结束'];
  },

  kvFieldAliases() {
    return {
      '必须出场': '强制出场',
      '当前参与者': '强制出场',
      '不能出场': '禁止出场',
      '禁止角色': '禁止出场',
      '场外随机事件': '随机事件候选',
      '随机主动事件': '随机事件候选',
      '随机主动事件影响': '随机事件影响',
      '写作重点': '正文写作重点',
      '正文重点': '正文写作重点',
      '结算限制': '当前场景影响对象',
      '结算边界': '当前场景影响对象',
      '资料是否足够': '资料状态',
    };
  },

  normalizeKvKey(key = '', allowed = []) {
    const clean = String(key || '').trim().replace(/[\s　]+/gu, '');
    const numberedReason = clean.replace(/^(地点查询理由|因果查询理由|冲突查询理由)\d+$/u, '$1');
    const direct = allowed.find((item) => item === clean || item === numberedReason);
    if (direct) return direct;
    const alias = this.kvFieldAliases()[clean];
    return allowed.includes(alias) ? alias : '';
  },

  splitKvLine(line = '') {
    const text = String(line || '').trim();
    const match = text.match(/^([^：:\n]{1,40})[：:]\s*([\s\S]*)$/u);
    return match ? { key: match[1].trim(), value: match[2].trim() } : null;
  },

  requiredKvFields(allowed = []) {
    const sceneAnchorRequired = ['场景锚定报告', '当前地点', '当前时间', '空间状态', '当前动作', '强制出场', '禁止出场', '随机事件影响', '正文写作重点', '当前场景影响对象'];
    if (sceneAnchorRequired.every((key) => allowed.includes(key))) return sceneAnchorRequired;
    const preferred = ['资料状态', '强制出场', '禁止出场', '随机事件闯入条件', '正文写作重点', '结算边界'];
    const required = preferred.filter((key) => allowed.includes(key));
    return required.length ? required : allowed.slice(0, Math.min(allowed.length, 6));
  },

  materialRequestPlaceholderReason(line = '') {
    const placeholders = ['角色全称', '世界全称', '地点全称', '人物全称', '作品全称'];
    const body = String(line || '').replace(/^资料请求\d+\s*[：:]/u, '').trim();
    const parts = body.split(/[，,、；;]/u).map((part) => part.trim()).filter(Boolean).slice(2);
    const hit = parts.find((part) => placeholders.includes(part));
    return hit ? `资料请求包含未替换占位词：${hit}` : '';
  },

  fallbackChineseMaterialRequest(line = '', options = {}) {
    if (this.materialRequestPlaceholderReason(line)) return null;
    const ctx = options.config?.ctx || window.GameModules.realWorldAgentContext;
    if (typeof ctx?.parseChineseMaterialRequest === 'function') return ctx.parseChineseMaterialRequest(line, { mode: options.config?.mode, store: options.store });
    const body = String(line || '').replace(/^资料请求\d+\s*[：:]/u, '').trim();
    const parts = body.split(/[，,、；;]/u).map((part) => part.trim()).filter(Boolean);
    if (parts[0] === '角色查询' && parts[1] === '搜索角色卡' && parts[2]) {
      return { skill: 'character.query', method: 'searchCharacterProfile', params: { name: parts[2], world: parts[3] || window.GameModules.realWorld2026?.label || '2026现代都市现实世界' }, sourceText: String(line || '').trim() };
    }
    return null;
  },

  scoreChineseKvParse(values = {}, allowed = [], materialLines = [], materialRequests = []) {
    const required = this.requiredKvFields(allowed);
    const isGuidedStep = this.guidedStepFields().every((key) => allowed.includes(key));
    const hasCoreGuidedValues = isGuidedStep && ['资料状态', '随机事件闯入条件'].every((key) => String(values[key] || '').trim());
    const hasUsefulValue = (key) => {
      const value = String(values[key] || '').trim();
      if (value) return true;
      return hasCoreGuidedValues && ['强制出场', '禁止出场'].includes(key) && Object.prototype.hasOwnProperty.call(values, key);
    };
    const criticalHits = required.filter((key) => Object.prototype.hasOwnProperty.call(values, key) && hasUsefulValue(key));
    const uniqueValidRequests = [...new Set((materialRequests || []).map((item) => JSON.stringify([item.skill, item.method, item.params])))];
    const maxScore = Math.max(1, required.length + uniqueValidRequests.length);
    const score = criticalHits.length + uniqueValidRequests.length;
    return { score, maxScore, successRate: score / maxScore, criticalHits };
  },

  summarizeDroppedMaterialRequests(lines = [], limit = 3) {
    const unique = [...new Set((lines || []).map((line) => String(line || '').trim()).filter(Boolean))];
    if (!unique.length) return '无';
    const shown = unique.slice(0, limit).join('；');
    return unique.length > limit ? `${shown}；等${unique.length}条` : shown;
  },

  parseChineseKvBlock(raw, fields = [], options = {}) {
    const allowed = fields.slice();
    const values = {};
    const keyHits = new Set();
    const lines = String(raw || '').replace(/```[\s\S]*?```/gu, (block) => block.replace(/```(?:text|markdown|json)?|```/gu, '')).split(/\r?\n/u);
    const materialLines = [];
    const droppedMaterialRequests = [];
    lines.forEach((line) => {
      const parsed = this.splitKvLine(line);
      if (!parsed) return;
      if (/^资料请求\d+$/u.test(parsed.key)) {
        materialLines.push(`${parsed.key}：${parsed.value}`);
        return;
      }
      const key = this.normalizeKvKey(parsed.key, allowed);
      if (!key) return;
      const existing = String(values[key] || '').trim();
      const next = String(parsed.value || '').trim();
      values[key] = existing && next && existing !== '无' ? `${existing}；${next}` : parsed.value;
      keyHits.add(key);
    });
    const materialRequestErrors = [];
    const materialRequests = options.parseMaterialRequests ? materialLines.map((line) => {
      const placeholderReason = this.materialRequestPlaceholderReason(line);
      const req = this.fallbackChineseMaterialRequest(line, options);
      if (!req) {
        droppedMaterialRequests.push(line);
        if (placeholderReason) materialRequestErrors.push(placeholderReason);
      }
      return req;
    }).filter(Boolean) : [];
    const scored = this.scoreChineseKvParse(values, allowed, materialLines, materialRequests);
    return { values, lines, missing: allowed.filter((key) => !keyHits.has(key)), score: scored.score, maxScore: scored.maxScore, successRate: scored.successRate, keyHits: [...keyHits], criticalHits: scored.criticalHits, parseDegraded: scored.successRate < 1, droppedMaterialRequests, materialRequestErrors, materialRequests };
  },

  confirmedKvValuesText(parsed = {}) {
    const values = parsed.values || {};
    const keys = parsed.keyHits || Object.keys(values);
    const lines = keys
      .filter((key) => Object.prototype.hasOwnProperty.call(values, key))
      .map((key) => `${key}：${String(values[key] ?? '').trim()}`)
      .filter((line) => line.trim());
    return lines.length ? lines.join('\n') : '无';
  },

  mergeGuidedParseResults(primary = {}, secondary = {}) {
    const values = { ...(primary.values || {}) };
    const mergeConflicts = [...(primary.mergeConflicts || [])];
    Object.entries(secondary.values || {}).forEach(([key, value]) => {
      const primaryValue = String(values[key] || '').trim();
      const secondaryValue = String(value || '').trim();
      if (!Object.prototype.hasOwnProperty.call(values, key) || !primaryValue || (primaryValue === '无' && secondaryValue && secondaryValue !== '无')) values[key] = value;
      else if (value && values[key] !== value) mergeConflicts.push({ key, primary: values[key], secondary: value });
    });
    const requests = [...(primary.materialRequests || [])];
    const seenRequests = new Set(requests.map((item) => JSON.stringify([item.skill, item.method, item.params])));
    (secondary.materialRequests || []).forEach((item) => {
      const key = JSON.stringify([item.skill, item.method, item.params]);
      if (!seenRequests.has(key)) {
        seenRequests.add(key);
        requests.push(item);
      }
    });
    const fields = [...new Set([...(primary.keyHits || []), ...(primary.missing || []), ...(secondary.keyHits || []), ...(secondary.missing || [])])];
    const materialLines = [...(primary.lines || []), ...(secondary.lines || [])].filter((line) => /^资料请求\d+[：:]/u.test(String(line || '').trim()));
    const scored = this.scoreChineseKvParse(values, fields, materialLines, requests);
    return { ...primary, values, materialRequests: requests, droppedMaterialRequests: [...(primary.droppedMaterialRequests || []), ...(secondary.droppedMaterialRequests || [])], keyHits: fields.filter((key) => Object.prototype.hasOwnProperty.call(values, key)), missing: fields.filter((key) => !Object.prototype.hasOwnProperty.call(values, key)), score: scored.score, maxScore: scored.maxScore, successRate: scored.successRate, criticalHits: scored.criticalHits, parseDegraded: scored.successRate < 1, mergeConflicts };
  },

  bestGuidedParseResult(results = []) {
    return results.filter(Boolean).sort((a, b) => (b.successRate - a.successRate) || (b.score - a.score))[0] || null;
  },

  async completeParsedStep(store, prompt, logId, streamToUi = false, allowProseFinal = false) {
    return await this.completeConfiguredParsedStep(store, prompt, logId, streamToUi, allowProseFinal, this.realConfig());
  },

  async completeConfiguredParsedStep(store, prompt, logId, streamToUi = false, allowProseFinal = false, config = this.realConfig(), allowContextDoneOnProse = false) {
    let lastRaw = '';
    let bestRaw = '';
    let lastErr = null;
    const parseResults = [];
    for (let i = 0; i < 2; i += 1) {
      const stageStep = Math.max(1, Number(config.guidedStep) || 1);
      lastRaw = await this.completeConfiguredStep(store, prompt, logId, streamToUi, { ...config, guidedStep: stageStep, promptId: config.firstTemplateId || 'inference-stage1-guided-query' });
      if (this.fallbackScore(lastRaw) >= this.fallbackScore(bestRaw)) bestRaw = lastRaw;
      if (allowContextDoneOnProse && this.looksLikeProseInsteadOfStepJson(lastRaw)) {
        console.warn(`${config.label}资料阶段误返回正文，视为资料已足够并进入正文阶段。`);
        return { raw: lastRaw, data: this.contextDoneFromProse(lastRaw) };
      }
      try {
        const data = this.parseStep(lastRaw, config);
        if (data) {
          if (!parseResults.length) return { raw: lastRaw, data };
          const current = this.parseChineseKvBlock(lastRaw, this.guidedStepFields(), { parseMaterialRequests: true, config });
          const mergedParsed = [...parseResults.map((item) => item.parsed), current].reduce((merged, item) => this.mergeGuidedParseResults(merged, item));
          return { raw: [...parseResults.map((item) => item.raw), lastRaw].join('\n\n'), data: this.guidedStepDataFromParsed(mergedParsed, [...parseResults.map((item) => item.raw), lastRaw].join('\n\n')) };
        }
        if (i === 1) return { raw: lastRaw, data: allowProseFinal ? this.proseFinal(store, bestRaw || lastRaw) : null };
        console.warn(`${config.label}格式不完整，自动重试一次`);
      } catch (err) {
        lastErr = err;
        if (err.parseResult && !err.skipMerge && !this.isGuidedStepSemanticSelfCheckError(err)) parseResults.push({ raw: lastRaw, parsed: err.parseResult });
        if (allowContextDoneOnProse && this.looksLikeProseInsteadOfStepJson(lastRaw)) {
          console.warn(`${config.label}资料阶段解析到正文内容，视为资料已足够并进入正文阶段。`);
          return { raw: lastRaw, data: this.contextDoneFromProse(lastRaw) };
        }
        if (!this.isRetryableParseError(err) || i === 1) break;
        const semanticSelfCheckFailed = this.isGuidedStepSemanticSelfCheckError(err);
        const parseDetail = err.parseResult ? `score=${err.parseResult.score}/${err.parseResult.maxScore} successRate=${err.parseResult.successRate} missing=${err.parseResult.missing?.join('、') || '无'} droppedMaterialRequests=${this.summarizeDroppedMaterialRequests(err.parseResult?.droppedMaterialRequests || [])}` : '';
        console.warn(`${config.label}${semanticSelfCheckFailed ? '语义自检失败' : '解析异常'}，自动重试一次:`, err.message, parseDetail);
        const retryInstruction = this.stage1JsonRetryInstruction(err, semanticSelfCheckFailed);
        prompt = Array.isArray(prompt)
          ? [...prompt, { role: 'user', content: retryInstruction }]
          : [prompt, retryInstruction].join('\n\n');
      }
    }
    const mergeableParseResults = lastErr?.parseResult && !lastErr?.skipMerge ? [...parseResults, { raw: lastRaw, parsed: lastErr.parseResult }] : parseResults;
    if (mergeableParseResults.length >= 2) {
      const merged = mergeableParseResults.map((item) => item.parsed).reduce((out, item) => this.mergeGuidedParseResults(out, item));
      if (merged.successRate >= 0.8) {
        const raw = mergeableParseResults.map((item) => item.raw).join('\n\n');
        try {
          return { raw, data: this.guidedStepDataFromParsed(merged, raw) };
        } catch (_) {
          // 合并后仍未通过语义自检，继续走原失败路径。
        }
      }
    }
    if (allowProseFinal) return { raw: bestRaw || lastRaw, data: this.proseFinal(store, bestRaw || lastRaw) };
    if (lastErr) throw lastErr;
    return { raw: lastRaw, data: null };
  },

  looksLikeProseInsteadOfStepJson(raw = '') {
    const text = String(raw || '').trim();
    if (!text || text.startsWith('{') || text.startsWith('```')) return false;
    if (text.includes(this.finalSeparator)) return false;
    if (/"type"\s*:\s*"(?:request_context|context_done|final)"/u.test(text)) return false;
    return text.length >= 80 && /[。！？!?]/u.test(text);
  },

  contextDoneFromProse() {
    return {
      type: 'context_done',
      reason: '模型在资料收集阶段误返回正文，停止请求资料并进入正文推演',
      requests: [],
      characters: [],
    };
  },

  fallbackScore(raw) {
    const text = String(raw || '').trim();
    if (!text) return 0;
    const sepAt = text.indexOf(this.finalSeparator);
    return text.length + (sepAt >= 0 ? 10000 : 0);
  },

  proseFinal(store, raw) {
    const narration = this.cleanProseNarration(raw);
    if (!narration) return null;
    const repaired = this.repairedFinalJson(raw) || {};
    const base = {
      type: 'final',
      sceneTitle: repaired.sceneTitle || store.realWorldSceneTitle || '现实世界',
      locationName: repaired.locationName || store.realWorldLocationName || store.realWorldMap?.current || '',
      parentLocationName: repaired.parentLocationName || '',
      locationDescription: repaired.locationDescription || '',
      mapNodes: Array.isArray(repaired.mapNodes) ? repaired.mapNodes : [],
      newLocations: Array.isArray(repaired.newLocations) ? repaired.newLocations : [],
      locationDescriptionUpdates: Array.isArray(repaired.locationDescriptionUpdates) ? repaired.locationDescriptionUpdates : [],
      narration,
      elapsedSeconds: Math.max(1, Number(repaired.elapsedSeconds) || 300),
      status: repaired.status || store.realWorldStatus || '现实推演继续中',
      quest: repaired.quest || store.realWorldQuest || '确认现实处境',
      choices: Array.isArray(repaired.choices) && repaired.choices.length ? repaired.choices.slice(0, 4) : (store.realWorldChoices || ['观察手机异常', '处理现实事务', '联系熟人', '暂时休息']),
      vitalUpdates: Array.isArray(repaired.vitalUpdates) ? repaired.vitalUpdates : [],
      metricUpdates: repaired.metricUpdates && typeof repaired.metricUpdates === 'object' ? repaired.metricUpdates : {},
      wechatActions: Array.isArray(repaired.wechatActions) ? repaired.wechatActions : [],
      itemActions: Array.isArray(repaired.itemActions) ? repaired.itemActions : [],
      lexiconUpdates: Array.isArray(repaired.lexiconUpdates) ? repaired.lexiconUpdates : [],
      genericUpdates: Array.isArray(repaired.genericUpdates) ? repaired.genericUpdates : [],
    };
    return window.GameModules.updateRegistry?.finalizeGenericUpdates?.(base, repaired, store)
      || window.GameModules.updateRegistry?.migrateLegacyFactionUpdates?.(base) || base;
  },

  repairedFinalJson(raw) {
    const text = String(raw || '');
    const sepAt = text.indexOf(this.finalSeparator);
    if (sepAt < 0) return null;
    const jsonRaw = text.slice(sepAt + this.finalSeparator.length).trim();
    if (!jsonRaw || window.GameModules.aiRequest?.outputTailLooksTruncated?.(jsonRaw)) return null;
    try { return window.GameModules.jsonUtils.parseLoose(jsonRaw); }
    catch (_) { return null; }
  },

  cleanProseNarration(raw) {
    const text = this.compactAiReturn(raw);
    if (!text) return '';
    const sepAt = text.indexOf(this.finalSeparator);
    const prose = sepAt >= 0 ? text.slice(0, sepAt) : text;
    return this.compactAiReturn(prose);
  },

  async completeUpdateJson(store, prompt, logId) {
    return await this.completeConfiguredUpdateJson(store, prompt, logId, this.realConfig());
  },

  async completeConfiguredUpdateJson(store, prompt, logId, config = this.realConfig()) {
    let nextPrompt = prompt, lastErr = null, partial = '';
    for (let i = 0; i < 3; i += 1) {
      const raw = await this.completeConfiguredStep(store, nextPrompt, logId, false, { ...config, promptId: 'inference-stage4-settlement-window' });
      const merged = partial ? this.mergeJsonContinuation(partial, raw) : raw;
      try { return this.parseCompleteUpdateJson(merged); }
      catch (err) {
        lastErr = err;
        partial = merged;
        if (i === 2) break;
        console.warn(`${config.label}更新 JSON 不完整，自动重试:`, err.message);
        nextPrompt = this.updateJsonRetryPrompt('', partial, err);
      }
    }
    throw lastErr || new Error(`${config.label}更新 JSON 生成失败`);
  },

  mergeJsonContinuation(partial = '', continuation = '') {
    const base = this.compactJsonReturn(partial);
    const next = this.compactJsonReturn(continuation);
    if (!next) return base;
    return this.compactJsonReturn(window.GameModules.jsonUtils?.mergeStreamText?.(base, next) || `${base}${next}`);
  },

  parseCompleteUpdateJson(raw) {
    const text = this.compactJsonReturn(raw);
    if (window.GameModules.aiRequest?.outputTailLooksTruncated?.(text)) throw new Error('现实更新 JSON 疑似被截断');
    const extracted = window.GameModules.jsonUtils.extractJson(text);
    const data = JSON.parse(window.GameModules.jsonUtils.repairJson(extracted));
    if (!data || typeof data !== 'object') throw new Error('现实更新 JSON 不是对象');
    return data;
  },

  updateJsonRetryPrompt(prompt, raw, err) {
    const tail = String(raw || '').replace(/\s+/gu, '').slice(-900);
    return `上次JSON未完成:${err?.message || 'JSON不完整'}。已输出尾部:${tail}。仅输出从尾部最后一个字符之后继续的JSON后续内容suffix；禁止重复已输出前缀；禁止Markdown；禁止解释；禁止换行、空格、制表符和不可见字符。`;
  },

  parseUpdateJson(raw) {
    return raw && typeof raw === 'object' ? raw : this.parseCompleteUpdateJson(raw);
  },

  configuredCharacterWorld(store, config = this.realConfig()) {
    if (config.mode === 'real') return window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    return store.currentWorldTag?.() || store.character?.work || store.selectedWork || '原创世界';
  },

  normalizeConfiguredCharacters(items = [], store, config = this.realConfig()) {
    const world = this.configuredCharacterWorld(store, config);
    return (Array.isArray(items) ? items : []).slice(0, 8).map((item) => window.GameModules.ai.normalizeCharacter(item, store, world)).filter(Boolean);
  },

  normalizeConfiguredSolidifiableCharacters(items = [], appeared = [], store, config = this.realConfig()) {
    const appearedByName = new Map(this.normalizeConfiguredCharacters(appeared, store, config).map((item) => [item.name, item]));
    return (Array.isArray(items) ? items : []).slice(0, 8).map((item) => {
      if (typeof item === 'string') return appearedByName.get(item.slice(0, 16)) || window.GameModules.ai.normalizeCharacter(item, store, this.configuredCharacterWorld(store, config));
      return window.GameModules.ai.normalizeCharacter(item, store, this.configuredCharacterWorld(store, config));
    }).filter(Boolean);
  },

  mergeNarrationAndUpdates(store, narration, updates = {}, config = this.realConfig()) {
    const payload = {
      type: 'final',
      sceneTitle: updates.sceneTitle || store.realWorldSceneTitle || '现实世界',
      locationName: updates.locationName || store.realWorldLocationName || store.realWorldMap?.current || '',
      parentLocationName: updates.parentLocationName || '',
      locationDescription: updates.locationDescription || '',
      mapNodes: Array.isArray(updates.mapNodes) ? updates.mapNodes : [],
      newLocations: Array.isArray(updates.newLocations) ? updates.newLocations : [],
      locationDescriptionUpdates: Array.isArray(updates.locationDescriptionUpdates) ? updates.locationDescriptionUpdates : [],
      narration: this.formatConfiguredNarration(narration),
      elapsedSeconds: Math.max(1, Number(updates.elapsedSeconds) || 300),
      status: updates.status || store.realWorldStatus || '现实推演继续中',
      quest: updates.quest || store.realWorldQuest || '确认现实处境',
      choices: window.GameModules.ai.normalizeChoices?.(updates.choices, store.realWorldChoices || ['观察手机异常', '处理现实事务', '联系熟人', '暂时休息']) || [],
      vitalUpdates: Array.isArray(updates.vitalUpdates) ? updates.vitalUpdates : [],
      metricUpdates: updates.metricUpdates && typeof updates.metricUpdates === 'object' ? updates.metricUpdates : {},
      appearedCharacters: this.normalizeConfiguredCharacters(updates.appearedCharacters, store, config),
      solidifiableCharacters: this.normalizeConfiguredSolidifiableCharacters(updates.solidifiableCharacters, updates.appearedCharacters, store, config),
      wechatActions: Array.isArray(updates.wechatActions) ? updates.wechatActions : [],
      itemActions: Array.isArray(updates.itemActions) ? updates.itemActions : [],
      lexiconUpdates: Array.isArray(updates.lexiconUpdates) ? updates.lexiconUpdates : [],
      genericUpdates: Array.isArray(updates.genericUpdates) ? updates.genericUpdates : [],
      profilePatches: Array.isArray(updates.profilePatches) ? updates.profilePatches : [],
    };
    return window.GameModules.updateRegistry?.finalizeGenericUpdates?.({
      ...payload,
      factionUpdates: Array.isArray(updates.factionUpdates) ? updates.factionUpdates : [],
    }, { ...updates, genericUpdates: payload.genericUpdates }, store) || payload;
  },

  mergeStoryNarrationAndUpdates(store, narration, updates = {}, config = this.storyConfig()) {
    const fallback = window.GameModules.createFallbackResult?.(store, store.lastAction || '') || {};
    const payload = {
      type: 'final',
      sceneTitle: String(updates.sceneTitle || fallback.sceneTitle || store.sceneTitle || '剧情继续').slice(0, 12),
      narration: this.formatConfiguredNarration(narration),
      elapsedSeconds: Math.max(1, Number(updates.elapsedSeconds) || fallback.elapsedSeconds || 60),
      thinking: store.thinkingMode ? String(updates.thinking || '').slice(0, 220) : '',
      speech: String(updates.speech || ''),
      mind: String(updates.mind || fallback.mind || ''),
      mood: String(updates.mood || fallback.mood || store.mood || '冷静').slice(0, 12),
      trust: Number.isFinite(updates.trust) ? updates.trust : store.trust,
      resistance: Number.isFinite(updates.resistance) ? updates.resistance : store.resistance,
      quest: String(updates.quest || fallback.quest || store.quest || '').slice(0, 24),
      characterIntent: String(updates.characterIntent || '').slice(0, 80),
      controlFeeling: String(updates.controlFeeling || fallback.controlFeeling || '疑惑').slice(0, 40),
      controlAdaptation: window.GameModules.ai.clampNumber?.(updates.controlAdaptation, fallback.controlAdaptation || 0) ?? 0,
      controlExperienceSummary: String(updates.controlExperienceSummary || fallback.controlExperienceSummary || '').slice(0, 80),
      metricUpdates: window.GameModules.ai.normalizeMetricUpdates?.(updates.metricUpdates) || {},
      choices: window.GameModules.ai.normalizeChoices?.(updates.choices, fallback.choices) || fallback.choices || [],
      appearedCharacters: this.normalizeConfiguredCharacters(updates.appearedCharacters, store, config),
      solidifiableCharacters: this.normalizeConfiguredSolidifiableCharacters(updates.solidifiableCharacters, updates.appearedCharacters, store, config),
      statChanges: { health: window.GameModules.ai.clampVitalDelta?.(updates.statChanges?.health) || 0, stamina: window.GameModules.ai.clampVitalDelta?.(updates.statChanges?.stamina) || 0, mental_stability: window.GameModules.ai.clampVitalDelta?.(updates.statChanges?.mental_stability) || 0 },
      combatEvent: window.GameModules.ai.normalizeCombatEvent?.(updates.combatEvent) || null,
      lexiconUpdates: window.GameModules.ai.normalizeLexiconUpdates?.(updates.lexiconUpdates, store) || [],
      itemActions: Array.isArray(updates.itemActions) ? updates.itemActions.slice(0, 20) : [],
    };
    const migrated = window.GameModules.updateRegistry?.finalizeGenericUpdates?.(payload, updates, store) || payload;
    migrated.genericUpdates = window.GameModules.orgTerritory?.filterUpdatesForStoryWorld?.(migrated.genericUpdates || [], store) || migrated.genericUpdates;
    return migrated;
  },

  cleanPhasedNarration(raw) {
    return this.stripNarrationInstructionLeak(this.compactAiReturn(String(raw || '').replace(this.finalSeparator, ''))).trim();
  },

  formatConfiguredNarration(raw, limit = 100) {
    return window.GameModules.realWorldAi?.formatNarration?.(raw, limit) || String(raw || '').trim();
  },

  stripNarrationInstructionLeak(text = '') {
    return String(text || '')
      .replace(/<\/?正文尾部>/gu, '')
      .replace(/\n*\s*(?:你能)?请从上述正文最后一个字符之后继续[\s\S]*?完整句号、问号、感叹号或右引号结束。?/gu, '')
      .replace(/\n*\s*现在仅输出正文后续suffix。?\s*$/gu, '')
      .trim();
  },

  chineseCharCount(text = '') {
    return (String(text || '').match(/[\u3400-\u9fff]/gu) || []).length;
  },

  narrationTailLooksIncomplete(text = '') {
    const raw = String(text || '').trim();
    if (!raw) return true;
    const tail = raw.slice(-80);
    const quoteCount = (raw.match(/[“”"『』「」]/g) || []).length;
    return /[，、：:；;（(《「『“—…-]$/u.test(tail) || quoteCount % 2 === 1 || !/[。！？!?」』”）)]$/u.test(tail);
  },

  trimIncompleteNarrationTail(text = '') {
    const raw = String(text || '').trim();
    if (!raw || !this.narrationTailLooksIncomplete(raw)) return raw;
    const quotePairs = { '“': '”', '「': '」', '『': '』', '"': '"' };
    const stack = [];
    for (let i = 0; i < raw.length; i += 1) {
      const ch = raw[i];
      if (ch === '”' && stack.at(-1)?.ch === '“') stack.pop();
      else if (ch === '」' && stack.at(-1)?.ch === '「') stack.pop();
      else if (ch === '』' && stack.at(-1)?.ch === '『') stack.pop();
      else if (ch === '"' && stack.at(-1)?.ch === '"') stack.pop();
      else if (quotePairs[ch]) stack.push({ ch, index: i });
    }
    const openQuoteIndex = stack.length ? stack[stack.length - 1].index : -1;
    const sentenceEndPattern = /[。！？!?]/gu;
    let lastEnd = -1;
    let match;
    while ((match = sentenceEndPattern.exec(raw))) {
      if (openQuoteIndex >= 0 && match.index > openQuoteIndex) continue;
      lastEnd = match.index + match[0].length;
      while (/[”」』）)]/u.test(raw[lastEnd] || '')) lastEnd += 1;
    }
    const cutIndex = Math.max(lastEnd, openQuoteIndex > 0 ? openQuoteIndex : -1);
    if (cutIndex <= 0) return raw;
    const trimmed = raw.slice(0, cutIndex).trim();
    return trimmed || raw;
  },

  async ensurePhasedNarrationLength(store, action, prompt, narration, logId) {
    return await this.ensureConfiguredNarrationLength(store, action, prompt, narration, logId, this.realConfig());
  },

  async ensureConfiguredNarrationLength(store, action, prompt, narration, logId, config = this.realConfig()) {
    const text = this.cleanPhasedNarration(narration);
    const trimmed = this.trimIncompleteNarrationTail(text);
    if (trimmed !== text) console.warn(`${config.label}正文疑似截断，已本地丢弃最后未完整句段。`, { beforeLength: text.length, afterLength: trimmed.length, tail: text.slice(-80) });
    return this.formatConfiguredNarration(trimmed);
  },

  mergeNarrationContinuation(text = '', continuation = '') {
    const base = this.compactAiReturn(text);
    const next = this.cleanPhasedNarration(continuation);
    if (!next) return base;
    return (window.GameModules.jsonUtils?.mergeStreamText?.(base, next) || `${base}${next}`).trim();
  },

  async completeConfiguredNarrationContinuation(store, action, prompt, narration, logId, reason = {}, config = this.realConfig()) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const continuationPrompt = [
      '# 现实推演正文补全任务',
      reason.shortOutput
        ? `任务:只输出补全文本本身；从<正文尾部>最后一个字符之后继续，把本次行动范围内的环境、动作过程、可见反应、短期结果补写完整；禁止重复正文尾部；禁止输出任何任务说明、JSON、Markdown、标题；${this.compactReturnRule('prose')}结尾必须是。！？或右引号。`
        : `任务:只输出补全文本本身；从<正文尾部>最后一个字符之后继续；只补完当前截断句并自然收束；禁止重复正文尾部；禁止输出任何任务说明、JSON、Markdown、标题；${this.compactReturnRule('prose')}结尾必须是。！？或右引号。`,
      `本次行动:${actionText}`,
      this.continuityFallbackRule(),
      reason.shortOutput ? '边界:补足已经开始的本次行动直接过程，不开启下一步新行动，不转移地点，不扩展到未输入的新阶段；如果原动作因边界、consent、年龄、关系或安全限制不能继续描写，改写为角色察觉、制止、后退、质问、沉默、情绪变化、环境声响变化、双方距离变化、语言/沉默、身体姿态和即时落点。' : '边界:只补当前句或收束当前动作，不扩展新动作阶段，不为了字数追加新情节，不替玩家执行下一步。',
      `问题:汉字数=${reason.count || 0};最低目标=${reason.minChars || 0};正文过短=${reason.shortOutput ? '是' : '否'};句尾未完成=${reason.tailIncomplete ? '是' : '否'}`,
      `<正文尾部>${String(narration || '').slice(-1600)}</正文尾部>`,
      '现在仅输出正文后续suffix。',
    ].join('\n');
    const output = await window.GameModules.aiRequest.complete({
      source: `${config.mode}-agent-narration-continuation`,
      model: store.modelId,
      prompt: continuationPrompt,
      timeoutMs: 120000,
      requireDone: true,
      maxAttempts: 2,
      maxTokens: 900,
      ...(window.GameModules.promptSkills?.completionOptions?.('inference-stage3-narration') || { jsonMode: false, outputLimitKind: 'stage3' }),
      outputLengthThreshold: 1200,
    });
    return this.cleanPhasedNarration(output);
  },

  async completeStep(store, prompt, logId, streamToUi = false) {
    return await this.completeConfiguredStep(store, prompt, logId, streamToUi, this.realConfig());
  },

  configuredCompletionOptions(config = this.realConfig(), streamToUi = false) {
    const promptId = config.promptId || (streamToUi ? config.templateId : '');
    const has = (key) => Object.prototype.hasOwnProperty.call(config || {}, key);
    const overrides = {};
    if (has('jsonMode')) overrides.jsonMode = config.jsonMode;
    if (has('responseFormat')) overrides.responseFormat = config.responseFormat;
    if (has('outputLimitKind')) overrides.outputLimitKind = config.outputLimitKind;
    if (promptId && window.GameModules.promptSkills?.completionOptions) {
      return window.GameModules.promptSkills.completionOptions(promptId, overrides);
    }
    const jsonMode = has('jsonMode') ? Boolean(config.jsonMode) : false;
    return {
      jsonMode,
      responseFormat: has('responseFormat') ? config.responseFormat : (jsonMode ? { type: 'json_object' } : undefined),
      outputLimitKind: config.outputLimitKind || (streamToUi ? 'stage3' : 'other'),
    };
  },

  async completeConfiguredStep(store, prompt, logId, streamToUi = false, config = this.realConfig()) {
    const requestId = config.mode === 'story' ? window.GameModules.ai.latestRequestId : window.GameModules.realWorldAi.latestRequestId;
    const kvCacheSession = config.kvCacheSession || null;
    const currentMessages = Array.isArray(prompt) ? prompt : null;
    const kvMessages = kvCacheSession ? this.messagesForDeepSeekKvCache(kvCacheSession, prompt) : null;
    let buffer = '';
    let doneSeen = false;
    let doneInfo = {};
    let lastPaint = 0;
    let lastReasoningPaint = 0;
    const reasoningMeta = this.reasoningSectionMeta(config);
    const reasoningKey = String(config.reasoningKey || reasoningMeta.id);
    try {
      const completionOptions = this.configuredCompletionOptions(config, streamToUi);
      const isJsonMode = Boolean(completionOptions.jsonMode);
      const requestOptions = {
        source: config.sourceTitle || (streamToUi ? `${config.mode}-agent-loop` : `${config.mode}-agent-context`),
        model: store.modelId,
        ...(kvMessages ? { messages: kvMessages } : (currentMessages ? { messages: currentMessages } : { prompt })),
        deepThinking: !isJsonMode,
        deepThinkingEffort: 'high',
        jsonMode: isJsonMode,
        responseFormat: completionOptions.responseFormat,
        stream: !isJsonMode,
        timeoutMs: 240000,
        requireDone: true,
        outputLengthThreshold: 2600,
        outputLimitKind: completionOptions.outputLimitKind,
        maxAttempts: 3,
        onChunk: async (chunk, done, info) => {
          const latest = config.mode === 'story' ? window.GameModules.ai.latestRequestId : window.GameModules.realWorldAi.latestRequestId;
          if (requestId !== latest) return;
          buffer = info.buffer;
          doneSeen = info.doneSeen;
          doneInfo = info || doneInfo;
          const now = performance.now();
          const reasoningText = info.deepseekReasoning?.text || '';
          if (reasoningText && (done || now - lastReasoningPaint > 180)) {
            lastReasoningPaint = now;
            this.patchConfiguredReasoning(store, logId, reasoningText, { ...config, ...reasoningMeta, reasoningKey, livePatch: true });
          }
          if (!streamToUi || !logId) return;
          if (!done && now - lastPaint <= 120) return;
          lastPaint = now;
          const changed = config.mode === 'story' ? store.updateStoryAgentStream?.(logId, buffer) : store.updateRealWorldStream?.(logId, buffer, { live: true });
          if (changed) {
            lastPaint = performance.now();
            await new Promise((resolve) => (window.requestAnimationFrame || setTimeout)(resolve));
          }
        },
      };
      if (config.maxTokens !== undefined && config.maxTokens !== null) requestOptions.maxTokens = config.maxTokens;
      const output = await window.GameModules.aiRequest.complete(requestOptions);
      if (streamToUi && logId && buffer) {
        if (config.mode === 'story') store.updateStoryAgentStream?.(logId, buffer);
        else store.updateRealWorldStream?.(logId, buffer, { live: true });
      }
      if (kvMessages) this.rememberDeepSeekKvCache(kvCacheSession, kvMessages, output, doneInfo);
      return output;
    } catch (err) {
      console.warn(`${config.label} Loop Agent 请求未完成，拒绝使用未完成内容:`, { code: err.code, message: err.message, doneSeen, length: buffer.length, stack: err.stack });
      throw err;
    }
  },

  splitNameList(value = '') {
    return String(value || '').split(/[；;、,，|｜]/u).map((name) => name.trim()).filter((name) => name && name !== '无').slice(0, 12);
  },

  isUsefulQueryReason(value = '') {
    const text = String(value || '').trim();
    if (!text || text === '无') return false;
    return !/(?:无需|不需要|不用|已明确|无需进一步|无因果|无潜在冲突|无冲突|当前路线无|没有必要)/u.test(text);
  },

  splitQueryReasonList(value = '') {
    return String(value || '').split(/[；;|｜\n]/u).map((item) => item.trim()).filter((item) => this.isUsefulQueryReason(item)).slice(0, 12);
  },

  parseParticipantToken(value = '') {
    const text = String(value || '').trim();
    if (!text || text === '无') return null;
    const paren = text.match(/^(.+?)[（(]([^（）()]*)[）)]$/u);
    const dashed = text.match(/^(.+?)\s*(?:[-—－]|：|:)\s*(.+)$/u);
    const name = String((paren || dashed)?.[1] || text).trim().replace(/^\d+[.、]\s*/u, '').slice(0, 80);
    const reason = String((paren || dashed)?.[2] || '').trim().slice(0, 160);
    return name && name !== '无' ? { name, reason } : null;
  },

  normalizeParticipantList(value = [], defaultRole = 'mentioned') {
    const list = Array.isArray(value) ? value : this.splitNameList(value);
    return list.map((item) => {
      if (typeof item === 'string') {
        const parsed = this.parseParticipantToken(item);
        return parsed ? { type: 'character', idOrName: parsed.name, name: parsed.name, role: defaultRole, reason: parsed.reason || undefined } : null;
      }
      const parsed = this.parseParticipantToken(item?.name || item?.characterName || item?.idOrName || item?.id || '');
      const name = parsed?.name || '';
      return name ? { type: String(item?.type || 'character').slice(0, 20), id: item?.id, idOrName: item?.idOrName || name, name, role: String(item?.role || defaultRole).slice(0, 40), reason: item?.reason ? String(item.reason).slice(0, 160) : parsed.reason || undefined, canLoadRoleCard: item?.canLoadRoleCard === false ? false : undefined, canEnterNarration: item?.canEnterNarration === false ? false : undefined, canSettle: typeof item?.canSettle === 'boolean' ? item.canSettle : undefined } : null;
    }).filter(Boolean).slice(0, 12);
  },

  normalizeRandomActiveEvents(value = '', blockedNames = new Set()) {
    const parts = Array.isArray(value) ? value : String(value || '').split(/[；;\n]/u);
    const seen = new Set();
    return parts.map((raw) => {
      const text = typeof raw === 'string' ? raw.trim() : `${raw?.characterName || raw?.name || ''}｜${raw?.eventType || raw?.actionMethod || ''}｜${raw?.motivation || raw?.reason || ''}`;
      if (!text || text === '无') return null;
      const segs = text.split(/[｜|]/u).map((x) => x.trim()).filter(Boolean);
      const characterName = segs[0]?.replace(/[：:].*$/u, '').trim();
      return { characterName, eventType: segs[1] || 'background_only', motivation: segs[2] || text, actionMethod: segs[1] || '背景行动', impactTiming: 'background', canEnterCurrentScene: false, canSettleCurrentScene: false };
    }).filter((item) => {
      if (!item?.characterName || blockedNames.has(item.characterName) || seen.has(item.characterName)) return false;
      seen.add(item.characterName);
      return true;
    }).slice(0, 3);
  },

  participantNameSet(...groups) {
    const set = new Set();
    groups.flat().forEach((item) => { const name = String(item?.name || item?.characterName || item?.idOrName || item?.id || '').trim(); if (name) set.add(name); });
    return set;
  },

  guidedStepDataFromParsed(parsed = {}, raw = '') {
    const v = parsed.values || {};
    const forcedParticipants = this.normalizeParticipantList(v['强制出场'], 'forced');
    const priorityCandidates = this.normalizeParticipantList(v['高优先候选'], 'priority-candidate').map((item) => ({ ...item, canSettle: false }));
    const dramaCandidates = this.normalizeParticipantList(v['戏剧候选'], 'drama-candidate').map((item) => ({ ...item, canSettle: false }));
    const forbiddenParticipants = this.normalizeParticipantList(v['禁止出场'], 'forbidden').map((item) => ({ ...item, canLoadRoleCard: false, canEnterNarration: false, canSettle: false }));
    const blocked = this.participantNameSet(forcedParticipants, priorityCandidates, dramaCandidates, forbiddenParticipants);
    const status = String(v['资料状态'] || '').trim();
    const requestText = String(v['资料请求'] || '').trim();
    const sceneQueries = {
      location: this.splitQueryReasonList(v['地点查询理由'] || v['地点查询']),
      causality: this.splitQueryReasonList(v['因果查询理由'] || v['因果查询']),
      conflict: this.splitQueryReasonList(v['冲突查询理由'] || v['冲突查询']),
    };
    const hasActionableRequests = Array.isArray(parsed.materialRequests) && parsed.materialRequests.length > 0;
    const hasRoleCardCandidates = forcedParticipants.length > 0 || priorityCandidates.length > 0 || dramaCandidates.length > 0;
    const hasSceneQueryReasons = Object.values(sceneQueries).some((items) => items.length > 0);
    const hasDeclaredRequests = Boolean(requestText && requestText !== '无' && !/^无(?:\s*\/\s*0)?$/u.test(requestText));
    if (status === '继续请求资料' && hasDeclaredRequests && !hasActionableRequests && !hasRoleCardCandidates && !hasSceneQueryReasons) {
      const err = new Error('解析错误请重试');
      err.parseResult = parsed;
      err.skipMerge = true;
      throw err;
    }
    const isContextDone = status === '资料已足够' || (!hasRoleCardCandidates && !hasActionableRequests && !hasSceneQueryReasons && (!requestText || requestText === '无'));
    return {
      type: isContextDone ? 'context_done' : 'request_context',
      guidanceText: String(raw || '').trim(),
      reason: v['查询规划'] || '',
      requests: parsed.materialRequests || [],
      needed: [],
      characters: [],
      participants: forcedParticipants,
      forcedParticipants,
      priorityCandidates,
      dramaCandidates,
      forbiddenParticipants,
      randomActiveEvents: this.normalizeRandomActiveEvents(v['随机事件候选'], blocked),
      sceneQueries,
      sceneQueriesAreReasons: true,
      randomIntrusionCondition: v['随机事件闯入条件'] || '无明确条件则禁止闯入',
      parseScore: { score: parsed.score, maxScore: parsed.maxScore, successRate: parsed.successRate },
      parseDegraded: parsed.successRate < 1,
      droppedMaterialRequests: parsed.droppedMaterialRequests || [],
      mergeConflicts: parsed.mergeConflicts || [],
      missingContext: status === '继续请求资料' && (hasActionableRequests || hasRoleCardCandidates),
    };
  },

  parseGuidedStepJson(raw, config = this.realConfig()) {
    const data = this.parseCompactSettlementJson(raw);
    if (!data || Array.isArray(data) || typeof data !== 'object') return null;
    const sceneQueries = data.sceneQueries && typeof data.sceneQueries === 'object' ? data.sceneQueries : {};
    const participants = data.participants && typeof data.participants === 'object' ? data.participants : {};
    const arrayText = (value, sep = '；') => (Array.isArray(value) ? value : this.splitQueryReasonList(value)).map((item) => String(item || '').trim()).filter(Boolean).join(sep) || '无';
    const nameText = (value) => (Array.isArray(value) ? value : this.splitNameList(value)).map((item) => typeof item === 'string' ? item : (item?.name || item?.characterName || item?.idOrName || item?.id || '')).map((item) => String(item || '').trim()).filter(Boolean).join('、') || '无';
    const requestRows = (Array.isArray(data.materialRequests) ? data.materialRequests : []).map((item, index) => {
      const body = typeof item === 'string'
        ? item
        : [item?.type || item?.skill || item?.kind, item?.method, item?.name || item?.target || item?.keyword, item?.world || item?.scope].filter(Boolean).join('，');
      return `资料请求${index + 1}：${String(body || '').trim()}`;
    }).filter((line) => !/^资料请求\d+[：:]\s*$/u.test(line)).slice(0, 3);
    const materialRequestErrors = [];
    const droppedMaterialRequests = [];
    const materialRequests = requestRows.map((line) => {
      const placeholderReason = this.materialRequestPlaceholderReason(line);
      const req = this.fallbackChineseMaterialRequest(line, { config });
      if (!req) {
        droppedMaterialRequests.push(line);
        if (placeholderReason) materialRequestErrors.push(placeholderReason);
      }
      return req;
    }).filter(Boolean);
    const values = {
      '查询规划': String(data.plan || data['查询规划'] || 'JSON资料路由').trim(),
      '资料状态': String(data.status || data['资料状态'] || '').trim(),
      '地点查询理由': arrayText(sceneQueries.location ?? data.locationReasons ?? data['地点查询理由']),
      '因果查询理由': arrayText(sceneQueries.causality ?? data.causalityReasons ?? data['因果查询理由']),
      '冲突查询理由': arrayText(sceneQueries.conflict ?? data.conflictReasons ?? data['冲突查询理由']),
      '强制出场': nameText(participants.forced ?? data.forcedParticipants ?? data['强制出场']),
      '高优先候选': nameText(participants.priority ?? data.priorityCandidates ?? data['高优先候选']),
      '戏剧候选': nameText(participants.drama ?? data.dramaCandidates ?? data['戏剧候选']),
      '禁止出场': nameText(participants.forbidden ?? data.forbiddenParticipants ?? data['禁止出场']),
      '随机事件候选': arrayText(data.randomEvents ?? data.randomActiveEvents ?? data['随机事件候选']),
      '随机事件闯入条件': String(data.randomIntrusionCondition || data['随机事件闯入条件'] || '无明确条件则禁止闯入').trim(),
      '资料请求': requestRows.length ? `${requestRows.length}条` : '无',
      '资料请求结束': '是',
    };
    if (!values['资料状态']) {
      const hasQueryReason = ['地点查询理由', '因果查询理由', '冲突查询理由'].some((key) => this.isUsefulQueryReason(values[key]));
      const hasParticipants = ['强制出场', '高优先候选', '戏剧候选'].some((key) => String(values[key] || '').trim() && values[key] !== '无');
      values['资料状态'] = requestRows.length || hasQueryReason || hasParticipants ? '继续请求资料' : '资料已足够';
    }
    const keyHits = Object.keys(values).filter((key) => String(values[key] || '').trim());
    const scored = this.scoreChineseKvParse(values, this.guidedStepFields(), requestRows, materialRequests);
    const parsed = { values, lines: requestRows, missing: this.guidedStepFields().filter((key) => !keyHits.includes(key)), score: scored.score, maxScore: scored.maxScore, successRate: scored.successRate, keyHits, criticalHits: scored.criticalHits, parseDegraded: scored.successRate < 1, droppedMaterialRequests, materialRequestErrors, materialRequests };
    if (materialRequestErrors.length) {
      const err = new Error(materialRequestErrors[0]);
      err.parseResult = parsed;
      throw err;
    }
    return this.guidedStepDataFromParsed(parsed, JSON.stringify(data));
  },

  normalizeGuidedStepText(raw = '') {
    const text = String(raw || '').replace(this.invisibleCharsPattern(), '').replace(/```(?:text|markdown|json)?|```/giu, '').trim();
    if (!text) return '';
    const fields = this.guidedStepFields();
    const allowed = fields.slice();
    const values = {};
    const lines = text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
    lines.forEach((line) => {
      const parsed = this.splitKvLine(line);
      const key = parsed ? this.normalizeKvKey(parsed.key, allowed) : '';
      if (key && !Object.prototype.hasOwnProperty.call(values, key)) values[key] = parsed.value;
    });
    const hasGuidedField = fields.some((key) => Object.prototype.hasOwnProperty.call(values, key)) || lines.some((line) => /^资料请求\d+[：:]/u.test(line));
    if (!hasGuidedField) return text;
    const out = lines.slice();
    const addIfMissing = (key, value) => {
      if (!Object.prototype.hasOwnProperty.call(values, key)) {
        values[key] = value;
        out.push(`${key}：${value}`);
      }
    };
    const isNone = (value) => !String(value || '').trim() || String(value || '').trim() === '无';
    const numberedRequests = lines.filter((line) => /^资料请求\d+[：:]/u.test(line));
    const hasExplicitRequestField = Object.prototype.hasOwnProperty.call(values, '资料请求') || numberedRequests.length > 0;
    const requestText = String(values['资料请求'] || '').trim();
    const hasQueryReason = ['地点查询理由', '因果查询理由', '冲突查询理由'].some((key) => this.isUsefulQueryReason(values[key]));
    if (!hasExplicitRequestField) return out.join('\n');
    addIfMissing('查询规划', requestText === '无' && !hasQueryReason ? '资料已足够，进入正文推演' : '补齐资料路由字段');
    if (!Object.prototype.hasOwnProperty.call(values, '资料状态')) {
      const shouldContinue = numberedRequests.length > 0 || hasQueryReason || (requestText && requestText !== '无' && !/^无(?:\s*\/\s*0)?$/u.test(requestText));
      addIfMissing('资料状态', shouldContinue ? '继续请求资料' : '资料已足够');
    }
    ['地点查询理由', '因果查询理由', '冲突查询理由', '强制出场', '高优先候选', '戏剧候选', '禁止出场', '随机事件候选'].forEach((key) => addIfMissing(key, '无'));
    addIfMissing('随机事件闯入条件', '无明确条件则禁止闯入');
    if (!Object.prototype.hasOwnProperty.call(values, '资料请求')) addIfMissing('资料请求', `${numberedRequests.length}条`);
    addIfMissing('资料请求结束', '是');
    return out.join('\n');
  },

  parseGuidedStepKv(raw, config = this.realConfig(), options = {}) {
    const normalized = options.normalized ? String(raw || '').trim() : this.normalizeGuidedStepText(raw);
    const parsed = this.parseChineseKvBlock(normalized, this.guidedStepFields(), { parseMaterialRequests: true, config });
    if (parsed.materialRequestErrors?.length || parsed.successRate < 0.8) {
      const detail = parsed.materialRequestErrors?.[0] || '解析错误请重试';
      const err = new Error(detail);
      err.parseResult = parsed;
      throw err;
    }
    return this.guidedStepDataFromParsed(parsed, normalized);
  },

  parseStep(raw, config = this.realConfig()) {
    const jsonData = this.parseGuidedStepJson(raw, config);
    if (jsonData) return jsonData;
    const text = this.normalizeGuidedStepText(raw);
    if (!/查询规划[：:]|资料状态[：:]/u.test(text)) {
      throw new Error(`${config.label}返回缺少 Stage1 JSON 或中文 K:V 查询规划字段`);
    }
    return this.parseGuidedStepKv(text, config, { normalized: true });
  },

  isGuidedStepSemanticSelfCheckError(err) {
    return String(err?.message || '').includes('资料状态为继续请求资料时，必须输出可执行的资料请求1、结构化查询或明确参与者候选');
  },

  isRetryableParseError(err) {
    return this.isGuidedStepSemanticSelfCheckError(err) || ['截断', '分隔符后缺少 JSON', '缺少正文', 'JSON missing', '解析错误请重试'].some((text) => String(err?.message || '').includes(text));
  },
  traceItem(step, data, raw, ctx = window.GameModules.realWorldAgentContext) {
    const limiter = typeof ctx?.limit === 'function' ? ctx.limit.bind(ctx) : (text, max = 1200) => String(text || '').slice(0, max);
    return {
      step,
      type: data?.type || 'parse_failed',
      thinking: data?.thinking || '',
      reason: data?.reason || '',
      characters: data?.characters || [],
      participants: data?.participants || [],
      forcedParticipants: data?.forcedParticipants || [],
      priorityCandidates: data?.priorityCandidates || [],
      dramaCandidates: data?.dramaCandidates || [],
      forbiddenParticipants: data?.forbiddenParticipants || [],
      randomActiveEvents: data?.randomActiveEvents || [],
      sceneQueries: data?.sceneQueries || { location: [], causality: [], conflict: [] },
      sceneQueriesAreReasons: data?.sceneQueriesAreReasons ?? false,
      randomIntrusionCondition: data?.randomIntrusionCondition || '',
      parseScore: data?.parseScore || null,
      parseDegraded: data?.parseDegraded ?? false,
      droppedMaterialRequests: data?.droppedMaterialRequests || [],
      requests: data?.requests || [],
      needed: data?.needed || [],
      missingContext: data?.missingContext ?? false,
      raw: limiter(raw, 1200),
      loaded: [],
    };
  },
  stepText(step, config = this.realConfig()) {
    return step === 1 ? `${config.label}正在识别相关角色与资料需求…（${step}/${this.maxSteps}）` : `${config.label}正在推演…（${step}/${this.maxSteps}）`;
  },
  updateAgentTrace(store, logId, trace = []) {
    this.updateConfiguredTrace(store, logId, trace, this.realConfig());
  },
  updateConfiguredTrace(store, logId, trace = [], config = this.realConfig()) {
    if (!logId) return;
    if (config.mode === 'story') {
      store.updateNovelEntry?.(logId, { agentTrace: trace.slice(), streaming: true });
      return;
    }
    store.patchRealWorldLogEntry?.(logId, { agentTrace: trace.slice(), streaming: true });
  },
  showFinalNarration(store, logId, narration) {
    this.showConfiguredNarration(store, logId, narration, this.realConfig());
  },
  showConfiguredNarration(store, logId, narration, config = this.realConfig()) {
    if (!logId || !narration) return;
    const formatted = this.formatConfiguredNarration(narration);
    if (config.mode === 'story') {
      store.updateNovelEntry?.(logId, { storyText: formatted, streaming: true, streamTrace: [] });
      return;
    }
    store.patchRealWorldLogEntry?.(logId, { narration: formatted, streaming: true, streamTrace: [] });
    store.scrollRealWorldLogBottom?.();
  },
  markStep(store, logId, text, options = {}) {
    this.markConfiguredStep(store, logId, text, this.realConfig(), options);
  },
  markConfiguredStep(store, logId, text, config = this.realConfig(), options = {}) {
    if (!logId) return;
    if (config.mode === 'story') {
      const entry = (store.log || []).find((item) => item.id === logId);
      const patch = { streaming: true, statusText: text };
      if (!options.keepNarration && this.shouldUseStatusAsStoryText(entry)) patch.storyText = text;
      store.updateNovelEntry?.(logId, patch);
      return;
    }
    const entry = (store.realWorldLog || []).find((item) => item.id === logId) || window.GameModules.sqliteSave.getRealWorldLogEntry?.(logId) || {};
    const patch = { streaming: true, statusText: text };
    if (!options.keepNarration && this.shouldUseStatusAsRealNarration(entry)) patch.narration = text;
    store.patchRealWorldLogEntry?.(logId, patch);
    store.scrollRealWorldLogBottom?.();
  },

  shouldUseStatusAsStoryText(entry = {}) {
    const text = String(entry?.storyText || '').trim();
    return !text || /^作者正在续写这一段剧情|操控剧情正在识别|操控剧情正在推演|已识别相关角色|已追加资料/u.test(text);
  },

  shouldUseStatusAsRealNarration(entry = {}) {
    const text = String(entry?.narration || '').trim();
    return !text || /^现实世界正在推演|现实正在识别|现实正在推演|已识别相关角色|已追加资料/u.test(text);
  },
  loadedContextText(data = {}, loaded = [], step = 1, config = this.realConfig()) {
    const fallback = config.mode === 'story' ? '被操控角色' : '玩家本人';
    const chars = (data.characters || []).map((item) => item.name || item.id || item).filter(Boolean).join('、') || fallback;
    const titles = loaded.map((item) => item.title).join('、') || '角色记忆';
    return `${step === 1 ? '已识别相关角色' : '已追加资料'}：${chars}；已载入${titles}${data.reason ? `：${data.reason}` : ''}`;
  },
};


;// ---- real-world-json-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.realWorldJsonActions = {
  async completeConfiguredUpdateJson(store, prompt, logId, config = this.realConfig()) {
    let combined = await this.completeConfiguredStep(store, prompt, logId, false, { ...config, promptId: 'inference-stage4-settlement-window' });
    let lastErr = null;
    for (let i = 0; i < 6; i += 1) {
      try { return this.parseCompleteUpdateJson(combined); }
      catch (err) {
        lastErr = err;
        if (!this.updateJsonNeedsCompletion(combined, err) || i === 5) break;
        console.warn(`${config.label}更新 JSON 被截断，补全重试 ${i + 1}/5:`, err.message);
        const next = await this.completeConfiguredStep(store, this.updateJsonContinuationPrompt(prompt, combined, err), logId, false, { ...config, promptId: 'inference-stage4-settlement-window' });
        combined = this.mergeUpdateJsonContinuation(combined, next);
      }
    }
    return await this.regenerateCompactUpdateJson(store, prompt, logId, config, combined, lastErr);
  },

  async regenerateCompactUpdateJson(store, prompt, logId, config, badRaw, err) {
    let nextPrompt = this.updateJsonRetryPrompt(prompt, badRaw, err);
    let combined = '';
    let lastErr = err;
    for (let i = 0; i < 3; i += 1) {
      const raw = await this.completeConfiguredStep(store, nextPrompt, logId, false, { ...config, promptId: 'inference-stage4-settlement-window' });
      combined = combined ? this.mergeUpdateJsonContinuation(combined, raw) : raw;
      try { return this.parseCompleteUpdateJson(combined); }
      catch (e) {
        lastErr = e;
        if (!this.updateJsonNeedsCompletion(combined, e)) break;
        nextPrompt = this.updateJsonContinuationPrompt(prompt, combined, e);
      }
    }
    throw lastErr || new Error(`${config.label}更新 JSON 生成失败`);
  },

  updateJsonNeedsCompletion(raw = '', err = null) {
    const text = this.cleanUpdateJsonText(raw);
    return /截断|incomplete|Unexpected end|unterminated/i.test(String(err?.message || '')) || window.GameModules.aiRequest?.outputTailLooksTruncated?.(text);
  },

  cleanUpdateJsonText(raw = '') {
    return String(raw || '').replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  },

  mergeUpdateJsonContinuation(base = '', next = '') {
    const a = this.cleanUpdateJsonText(base);
    const b = this.cleanUpdateJsonText(next);
    if (!b) return a;
    try { this.parseCompleteUpdateJson(b); return b; }
    catch (_) {}
    if (b.startsWith('{') && b.length > a.length * 0.7) return b;
    const fieldStart = /^"[\w\u4e00-\u9fa5-]+"\s*[:：]/u.test(b);
    const valueStart = /^"/u.test(b);
    const danglingKey = /"[\w\u4e00-\u9fa5-]+"\s*$/u.test(a) && !this.jsonStringOpen(a);
    const inString = this.jsonStringOpen(a);
    const continuation = danglingKey && valueStart ? `:${b}` : (inString && fieldStart ? `",${b}` : ((/["}\]]$/u.test(a) && fieldStart) ? `,${b}` : b));
    return window.GameModules.jsonUtils?.mergeStreamText?.(a, continuation) || (a + continuation);
  },

  jsonStringOpen(text = '') {
    let open = false;
    let escaped = false;
    for (const char of String(text || '')) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === '"') open = !open;
    }
    return open;
  },

  updateJsonContinuationPrompt(prompt, raw, err) {
    const partial = this.cleanUpdateJsonText(raw);
    return [
      '# JSON 补全任务',
      '上一次输出的 JSON 被截断。你必须只输出“从上次最后一个字符之后开始”的剩余 JSON 字符。',
      '禁止重复已经输出的前缀；禁止解释；禁止 Markdown；禁止代码块；禁止重新从 { 开始，除非上次内容完全不可续写。',
      '补全文本也必须保持紧凑 JSON：不要换行、不要缩进、不要多余空格。',
      `错误：${err?.message || 'JSON不完整'}`,
      `原始要求：${String(prompt || '').slice(0, 2200)}`,
      `已输出完整前缀：${partial.slice(0, 9000)}`,
      '补全必须从上述完整前缀的最后一个字符之后开始。',
    ].join('\n\n');
  },
};

Object.assign(window.GameModules.realWorldAgentLoop || {}, window.GameModules.realWorldJsonActions);


;// ---- database/sqlite-real-world-log.js ----
window.GameModules = window.GameModules || {};

(() => {
  const save = window.GameModules.sqliteSave;
  const baseMigrate = save.migrate.bind(save);
  const baseReadFallbackState = save.readFallbackState.bind(save);

  save.readFallbackState = function readFallbackState(raw) {
    const state = baseReadFallbackState(raw);
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      state.realWorldLogEntries = parsed?.realWorldLogEntries || {};
    } catch (_) {
      state.realWorldLogEntries = {};
    }
    return state;
  };

  save.migrate = function migrate() {
    baseMigrate();
    this.db.run(`
      CREATE TABLE IF NOT EXISTS real_world_log(
        id TEXT PRIMARY KEY,
        entry_json TEXT NOT NULL,
        entry_type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_real_world_log_created ON real_world_log(created_at);
    `);
  };

  save.saveRealWorldLogEntry = async function saveRealWorldLogEntry(entry = {}) {
    if (!entry.id) return;
    const now = new Date().toISOString();
    if (this.fallback) {
      this.fallbackState = this.fallbackState || { version: 1, main: null, updatedAt: '' };
      this.fallbackState.realWorldLogEntries = { ...(this.fallbackState.realWorldLogEntries || {}), [entry.id]: { ...entry, updatedAt: now } };
      await this.persist();
      return;
    }
    if (!this.db) return;
    const createdAt = entry.createdAt || entry.time?.iso || now;
    const next = { ...entry, createdAt, updatedAt: now };
    this.db.run(
      'INSERT OR REPLACE INTO real_world_log(id,entry_json,entry_type,created_at,updated_at) VALUES (?,?,?,?,?)',
      [String(next.id), JSON.stringify(next), String(next.type || 'ai'), createdAt, now],
    );
    await this.persist();
  };

  save.saveRealWorldLogEntries = async function saveRealWorldLogEntries(entries = []) {
    if (!Array.isArray(entries) || !entries.length) return;
    const baseTime = Date.now();
    if (this.fallback) {
      this.fallbackState = this.fallbackState || { version: 1, main: null, updatedAt: '' };
      const old = this.fallbackState.realWorldLogEntries || {};
      const rows = entries.filter((entry) => entry?.id).map((entry, index) => {
        const now = new Date(baseTime + index).toISOString();
        return [entry.id, { ...entry, createdAt: entry.createdAt || entry.time?.iso || now, updatedAt: now }];
      });
      this.fallbackState.realWorldLogEntries = { ...old, ...Object.fromEntries(rows) };
      await this.persist();
      return;
    }
    if (!this.db) return;
    for (const [index, entry] of entries.entries()) {
      if (!entry?.id) continue;
      const now = new Date(baseTime + index).toISOString();
      const createdAt = entry.createdAt || entry.time?.iso || now;
      const next = { ...entry, createdAt, updatedAt: now };
      this.db.run(
        'INSERT OR REPLACE INTO real_world_log(id,entry_json,entry_type,created_at,updated_at) VALUES (?,?,?,?,?)',
        [String(next.id), JSON.stringify(next), String(next.type || 'ai'), createdAt, now],
      );
    }
    await this.persist();
  };

  save.getRealWorldLogEntry = function getRealWorldLogEntry(id = '') {
    const key = String(id || '');
    if (!key) return null;
    if (this.fallback) return this.fallbackState?.realWorldLogEntries?.[key] || null;
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT entry_json FROM real_world_log WHERE id=? LIMIT 1');
    stmt.bind([key]);
    const entry = stmt.step() ? JSON.parse(stmt.getAsObject().entry_json) : null;
    stmt.free();
    return entry;
  };

  save.deleteRealWorldLogEntry = async function deleteRealWorldLogEntry(id = '') {
    const key = String(id || '');
    if (!key) return;
    if (this.fallback) {
      const old = this.fallbackState?.realWorldLogEntries || {};
      const { [key]: _removed, ...rest } = old;
      this.fallbackState.realWorldLogEntries = rest;
      await this.persist();
      return;
    }
    if (!this.db) return;
    this.db.run('DELETE FROM real_world_log WHERE id=?', [key]);
    await this.persist();
  };

  save.countRealWorldLogEntries = function countRealWorldLogEntries() {
    if (this.fallback) return Object.keys(this.fallbackState?.realWorldLogEntries || {}).length;
    if (!this.db) return 0;
    const row = this.db.exec('SELECT COUNT(*) FROM real_world_log')?.[0]?.values?.[0];
    return Number(row?.[0] || 0);
  };

  save.realWorldLogSortKey = function realWorldLogSortKey(entry = {}) {
    const timeKey = () => {
      const parsed = Date.parse(entry.createdAt || entry.time?.iso || '');
      if (Number.isFinite(parsed)) return String(parsed).padStart(16, '0');
      const idNumber = Number(entry.id);
      if (Number.isFinite(idNumber)) return String(idNumber).padStart(16, '0');
      return `zzzz-${String(entry.time?.label || entry.id || '')}`;
    };
    if (entry.type === 'system' && entry.narration && !entry.text) return `0000-${timeKey()}-${String(entry.id || '')}`;
    const id = String(entry.id || '');
    const match = id.match(/^(real-(\d+)-[a-z0-9]+)-(user|ai)$/u);
    if (match) return `1000-${String(match[2]).padStart(16, '0')}-${match[1]}-${match[3] === 'user' ? '0' : '1'}`;
    return `1000-${timeKey()}-2-${String(entry.id || '')}`;
  };

  save.sortedRealWorldLogEntries = function sortedRealWorldLogEntries(entries = []) {
    return (Array.isArray(entries) ? entries : []).slice().sort((a, b) => this.realWorldLogSortKey(a).localeCompare(this.realWorldLogSortKey(b)));
  };

  save.listRealWorldLogEntries = function listRealWorldLogEntries(page = 1, pageSize = 12) {
    const size = Math.max(1, Math.min(30, Number(pageSize) || 12));
    const offset = Math.max(0, ((Number(page) || 1) - 1) * size);
    if (this.fallback) {
      return this.sortedRealWorldLogEntries(Object.values(this.fallbackState?.realWorldLogEntries || {})).slice(offset, offset + size);
    }
    if (!this.db) return [];
    const rows = [];
    const stmt = this.db.prepare('SELECT entry_json FROM real_world_log');
    while (stmt.step()) rows.push(JSON.parse(stmt.getAsObject().entry_json));
    stmt.free();
    return this.sortedRealWorldLogEntries(rows).slice(offset, offset + size);
  };
})();


;// ---- real-world-profile-stage5.js ----
window.GameModules = window.GameModules || {};

window.GameModules.realWorldProfileStage5 = {
  DRESSED_DESC_MIN: 120,
  DRESSED_DESC_MAX: 170,

  bodyParts() {
    return window.GameModules.characterProfile?.bodyProfileParts?.() || [];
  },

  formatParticipants(participants = [], store = null) {
    return (Array.isArray(participants) ? participants : []).slice(0, 12).map((item) => {
      const name = String(item?.name || item?.idOrName || item?.id || '').trim();
      const role = String(item?.role || '').trim();
      return role ? `${name}（${role}）` : name;
    }).filter(Boolean).join('、') || '无';
  },

  resolveCharacterState(store, subject = '') {
    const key = String(subject || '').trim();
    if (!key) return null;
    return store?.itemSkillState?.(key)
      || window.GameModules.sqliteSave?.getCharacterStateByName?.(key)
      || null;
  },

  hasDressedProfile(state) {
    const list = state?.profile?.dressedProfile;
    return Array.isArray(list) && list.some((item) => String(item?.description || '').trim());
  },

  summarizeDressedProfiles(store, participants = []) {
    const cp = window.GameModules.characterProfile;
    return (Array.isArray(participants) ? participants : []).slice(0, 8).map((item) => {
      const name = String(item?.name || item?.idOrName || item?.id || '').trim();
      if (!name) return '';
      const state = this.resolveCharacterState(store, name);
      if (!this.hasDressedProfile(state)) return `${name}：未初始化盛装`;
      const brief = (state.profile.dressedProfile || [])
        .filter((entry) => String(entry?.description || '').trim())
        .slice(0, 4)
        .map((entry) => `${entry.part}=${String(entry.description).slice(0, 36)}`)
        .join('；');
      return `${name}：${brief || '无摘要'}`;
    }).filter(Boolean).join('\n') || '无';
  },

  summarizeWearingChanges(genericUpdates = []) {
    const rows = (Array.isArray(genericUpdates) ? genericUpdates : [])
      .filter((item) => item?.updateType === 'wearing-state')
      .slice(0, 8)
      .map((item) => {
        const subject = String(item?.subject?.name || item?.subject?.id || '').trim();
        const field = String(item?.field || '').trim();
        const value = item?.change?.value ?? item?.change?.after ?? item?.value ?? '';
        const reason = (item?.reasons || []).map((r) => r?.evidence || r?.trigger).filter(Boolean).join('；');
        return `${subject || '未知'} ${field} → ${typeof value === 'object' ? JSON.stringify(value).slice(0, 80) : String(value).slice(0, 80)}${reason ? `（${reason.slice(0, 60)}）` : ''}`;
      });
    return rows.length ? rows.join('\n') : '无（与 Stage4 并行，请主要依据正文）';
  },

  wearingSlotToParts(slot = '') {
    const map = {
      head: ['头发', '脸部', '耳朵'],
      neck: ['脖颈', '脸部'],
      innerwearTop: ['胸部', '双臂'],
      top: ['胸部', '双臂', '小腹'],
      outerwear: ['胸部', '双臂', '小腹'],
      gloves: ['双臂'],
      waist: ['小腹', '臀部'],
      innerwearBottom: ['臀部', '神秘花园'],
      bottom: ['臀部', '双大腿', '双小腿'],
      socks: ['双小腿', '双大腿'],
      shoes: ['双小腿'],
    };
    const key = String(slot || '').trim();
    return map[key] || ['头发', '脸部'];
  },

  normalizeGateTargets(gate = {}, store = null) {
    const allowed = new Set(this.bodyParts());
    return (Array.isArray(gate?.targets) ? gate.targets : [])
      .filter((item) => !item?.profileType || item.profileType === 'dressedProfile')
      .slice(0, 2)
      .map((item) => {
        const subject = String(item?.subject || '').trim();
        const state = this.resolveCharacterState(store, subject);
        const parts = (Array.isArray(item?.parts) ? item.parts : [])
          .filter((part) => allowed.has(part))
          .slice(0, 3);
        if (!subject || !parts.length || !this.hasDressedProfile(state)) return null;
        return {
          subject,
          subjectId: state?.id || subject,
          profileType: 'dressedProfile',
          parts,
          reason: String(item?.reason || '').slice(0, 120),
          evidence: String(item?.evidence || '').slice(0, 200),
        };
      })
      .filter(Boolean);
  },

  inferTargetsFromWearing(store, genericUpdates = [], existingSubjects = new Set()) {
    const allowed = new Set(this.bodyParts());
    const out = [];
    (Array.isArray(genericUpdates) ? genericUpdates : [])
      .filter((item) => item?.updateType === 'wearing-state')
      .slice(0, 4)
      .forEach((item) => {
        const subject = String(item?.subject?.name || item?.subject?.id || '').trim();
        if (!subject || existingSubjects.has(subject)) return;
        const state = this.resolveCharacterState(store, subject);
        if (!this.hasDressedProfile(state)) return;
        const field = String(item?.field || '');
        const slotMatch = field.match(/\.(\w+)$/u) || field.match(/(\w+)$/u);
        const slot = slotMatch?.[1] || '';
        const parts = this.wearingSlotToParts(slot).filter((part) => allowed.has(part)).slice(0, 3);
        if (!parts.length) return;
        existingSubjects.add(subject);
        out.push({
          subject,
          subjectId: state?.id || subject,
          profileType: 'dressedProfile',
          parts,
          reason: '穿着状态已变化',
          evidence: this.summarizeWearingChanges([item]),
        });
      });
    return out.slice(0, 2);
  },

  mergeTargetsFromWearing(store, gateTargets = [], genericUpdates = []) {
    const seen = new Set(gateTargets.map((item) => item.subject));
    const extra = this.inferTargetsFromWearing(store, genericUpdates, seen);
    return [...gateTargets, ...extra].slice(0, 2);
  },

  async runGate({ store, narration, participants, logId, config, loop }) {
    const agentLoop = loop || window.GameModules.realWorldAgentLoop;
    const prompt = await agentLoop.renderPrompt('inference-stage5-profile-gate', {
      本回合参与者: this.formatParticipants(participants, store),
      穿着状态变化: '无（与 Stage4 并行，请主要依据正文）',
      当前盛装摘要: this.summarizeDressedProfiles(store, participants),
      本轮正文: String(narration || '').slice(0, 2400),
    });
    agentLoop.markConfiguredStep(store, logId, `${config.label}并行判定盛装外观更新…`, config, { keepNarration: true });
    const raw = await agentLoop.completeConfiguredStep(store, prompt, logId, false, {
      ...config,
      sourceTitle: `${config.label}Stage5盛装判定`,
      promptId: 'inference-stage5-profile-gate',
      reasoningPhase: 'stage5',
      jsonMode: true,
    });
    return window.GameModules.jsonUtils.parseLoose(raw);
  },

  validatePatchData(data, base = {}, targetParts = []) {
    if (!data || String(data.name || '').trim() !== String(base.name || '').trim()) throw new Error('姓名不匹配');
    const list = Array.isArray(data.dressedProfile) ? data.dressedProfile : [];
    const returnedParts = list.map((item) => String(item?.part || '').trim()).filter(Boolean);
    const missing = targetParts.filter((part) => !returnedParts.includes(part));
    if (missing.length) throw new Error(`缺少部位：${missing.join('、')}`);
    const extra = returnedParts.filter((part) => !targetParts.includes(part));
    if (extra.length) throw new Error(`多余部位：${extra.join('、')}`);
    list.forEach((item) => {
      const desc = String(item?.description || '').trim();
      const len = [...desc].length;
      if (len < this.DRESSED_DESC_MIN || len > this.DRESSED_DESC_MAX) {
        throw new Error(`${item.part} 描写应为 ${this.DRESSED_DESC_MIN}-${this.DRESSED_DESC_MAX} 汉字（当前 ${len}）`);
      }
    });
    return data;
  },

  patchDescriptionText(dressedProfile = [], parts = []) {
    return (Array.isArray(parts) ? parts : [])
      .map((part) => {
        const item = (Array.isArray(dressedProfile) ? dressedProfile : []).find((entry) => entry?.part === part);
        const desc = String(item?.description || '').trim();
        return desc ? `${part}：${desc}` : '';
      })
      .filter(Boolean)
      .join('\n');
  },

  async patchSubject({ store, target, narration, wearingSummary, logId, config, loop }) {
    const agentLoop = loop || window.GameModules.realWorldAgentLoop;
    const cp = window.GameModules.characterProfile;
    const stage5Config = config;
    const state = this.resolveCharacterState(store, target.subject);
    if (!state?.profile) return null;
    agentLoop.markConfiguredStep(store, logId, `${config.label}更新${target.subject}盛装（${target.parts.join('、')}）…`, stage5Config, { keepNarration: true });
    const profile = state.profile;
    const base = { id: state.id, name: profile.name || state.name };
    const allowedParts = cp.bodyProfileParts();
    const targetParts = (Array.isArray(target.parts) ? target.parts : []).filter((part) => allowedParts.includes(part)).slice(0, 3);
    if (!targetParts.length) return null;
    const existing = Array.isArray(profile.dressedProfile) ? profile.dressedProfile : [];
    const currentLines = targetParts.map((part) => {
      const item = existing.find((entry) => entry?.part === part);
      const idx = allowedParts.indexOf(part) + 1;
      return `${idx}.${part}：${String(item?.description || '暂无').slice(0, 100)}`;
    }).join('\n');
    const vars = {
      part1Summary: cp.part1Summary(profile),
      part4Summary: cp.part4Summary(profile),
      part5Summary: cp.bodyProfileSummary(profile.bodyProfile),
      角色姓名: base.name,
      更新部位: targetParts.join('、'),
      当前部位描写: currentLines,
      更新原因: String(target.reason || '穿着或外观变化').slice(0, 200),
      更新证据: String(target.evidence || '').slice(0, 400),
      穿着变化摘要: String(wearingSummary || '无').slice(0, 400),
      本轮正文摘要: String(narration || '').slice(0, 800),
    };
    const promptId = 'inference-stage5-dressed-profile-patch';
    const prompt = await window.GameModules.renderPrompt(promptId, vars);
    const partialTemplate = {
      name: base.name,
      dressedProfile: targetParts.map((part) => ({ index: allowedParts.indexOf(part) + 1, part, description: '' })),
    };
    const format = [prompt, '', '## 局部模板（只输出以下部位）', JSON.stringify(partialTemplate, null, 2)].join('\n');
    let raw = '';
    try {
      raw = await agentLoop.completeConfiguredStep(store, format, logId, false, {
        ...stage5Config,
        sourceTitle: `${config.label}Stage5盛装Patch`,
        promptId,
        reasoningPhase: 'stage5',
        jsonMode: true,
      });
      let data;
      try {
        data = this.validatePatchData(cp.parse(raw), base, targetParts);
      } catch (validationErr) {
        const repairFormat = `${format}\n\n## 修复要求\n${validationErr.message}；每项 description 必须 ${this.DRESSED_DESC_MIN}-${this.DRESSED_DESC_MAX} 汉字，写造型、妆容、饰品、面料、位移与遮挡效果。`;
        raw = await agentLoop.completeConfiguredStep(store, repairFormat, logId, false, {
          ...stage5Config,
          sourceTitle: `${config.label}Stage5盛装Patch重试`,
          promptId,
          reasoningPhase: 'stage5',
          jsonMode: true,
        });
        data = this.validatePatchData(cp.parse(raw), base, targetParts);
      }
      const merged = cp.mergeDressedProfilePatch(existing, data.dressedProfile);
      return {
        subject: target.subject,
        subjectId: target.subjectId || state.id,
        parts: targetParts,
        reason: target.reason,
        evidence: target.evidence,
        dressedProfile: merged,
        descriptionText: this.patchDescriptionText(merged, targetParts),
      };
    } catch (err) {
      console.warn('Stage5 patch 解析失败:', err.message, raw ? raw.slice(0, 120) : '');
      return null;
    }
  },

  async run({ store, narration, participants, genericUpdates = [], logId, config, loop }) {
    if (config?.mode === 'story') return { patches: [], gate: null, skipped: true };
    try {
      const gate = await this.runGate({ store, narration, participants, logId, config, loop });
      let targets = this.normalizeGateTargets(gate, store);
      if (!gate?.needsUpdate && !targets.length) {
        return { patches: [], gate, skipped: true };
      }
      if (!targets.length && gate?.needsUpdate) {
        return { patches: [], gate, skipped: true };
      }
      const wearingSummary = this.summarizeWearingChanges(genericUpdates);
      const patches = [];
      for (const target of targets) {
        const patch = await this.patchSubject({ store, target, narration, wearingSummary, logId, config, loop });
        if (patch) patches.push(patch);
      }
      return { patches, gate, skipped: !patches.length };
    } catch (err) {
      console.warn('Stage5 盛装更新失败:', err.message);
      return { patches: [], gate: null, skipped: true, error: err.message };
    }
  },

  async runParallelWithStage4({ store, narration, participants, logId, config, loop, stage4Promise }) {
    if (config?.mode === 'story') {
      const updates = await stage4Promise;
      return { patches: [], gate: null, skipped: true, updates };
    }
    const gatePromise = this.runGate({ store, narration, participants, logId, config, loop });
    const [gate, updates] = await Promise.all([gatePromise, stage4Promise]);
    let targets = this.normalizeGateTargets(gate, store);
    targets = this.mergeTargetsFromWearing(store, targets, updates?.genericUpdates || []);
    const wearingChanged = (updates?.genericUpdates || []).some((item) => item?.updateType === 'wearing-state');
    if (!targets.length && !gate?.needsUpdate && !wearingChanged) {
      return { patches: [], gate, skipped: true, updates };
    }
    if (!targets.length) {
      return { patches: [], gate, skipped: true, updates };
    }
    const wearingSummary = this.summarizeWearingChanges(updates?.genericUpdates || []);
    const patches = [];
    for (const target of targets) {
      const patch = await this.patchSubject({ store, target, narration, wearingSummary, logId, config, loop });
      if (patch) patches.push(patch);
    }
    return { patches, gate, skipped: !patches.length, updates };
  },

  async applyPatches(store, patches = []) {
    const settlement = window.GameModules.realWorldSettlementActions;
    const rows = [];
    for (const patch of Array.isArray(patches) ? patches : []) {
      const state = store?.itemSkillState?.(patch?.subjectId || patch?.subject);
      if (!state?.profile || !Array.isArray(patch?.dressedProfile)) continue;
      state.profile.dressedProfile = patch.dressedProfile;
      if (store?.rpgStates && state.id) store.rpgStates[state.id] = state;
      await window.GameModules.sqliteSave?.saveCharacterState?.(state);
      const subjectName = patch.subject || state.profile?.name || state.name || '角色';
      const card = settlement?.resolveCharacterSettlementCard?.(store, state.id || patch.subjectId || patch.subject, subjectName)
        || { id: `role:${state.id}`, title: subjectName, section: '角色卡' };
      const reason = [patch.reason, patch.evidence].map((item) => String(item || '').trim()).filter(Boolean).join('；') || '本轮正文确认的外观变化';
      if (settlement?.realWorldSettlementRecordForCharacter) {
        rows.push(settlement.realWorldSettlementRecordForCharacter(
          '盛装外观',
          (patch.parts || []).join('、'),
          patch.descriptionText || this.patchDescriptionText(patch.dressedProfile, patch.parts),
          reason,
          store,
          state.id || patch.subjectId || patch.subject,
          subjectName,
        ));
      } else if (settlement?.realWorldSettlementRecord) {
        rows.push(settlement.realWorldSettlementRecord(
          '盛装外观',
          (patch.parts || []).join('、'),
          patch.descriptionText || this.patchDescriptionText(patch.dressedProfile, patch.parts),
          reason,
          card.title,
          card,
        ));
      } else {
        rows.push(`外观更新：${subjectName}（${(patch.parts || []).join('、')}）`);
      }
    }
    return rows;
  },
};


;// ---- rag.js ----
/**
 * 前端资料查询：以 assets/作品名/AI设定库/README.md 为入口，按索引精确加载本地设定卡。
 */
window.GameModules = window.GameModules || {};

window.GameModules.rag = {
  sources: null, fileCache: {}, sourceCache: {},

  async load() {
    if (window.GameModules.cache.enabled('files') && this.sources) return this.sources;
    const sources = window.GameData?.loreSources || [];
    if (window.GameModules.cache.enabled('files')) this.sources = sources;
    if (!sources.length) throw new Error('资料入口未配置');
    return sources;
  },

  async search(query, options = {}) {
    const sources = await this.load();
    const source = this.pickSource(sources, query, options.sourceHint);
    if (!source) return [];
    const cfg = window.GameModules.config.rag || {};
    const terms = this.expandTerms(`${query} ${options.sourceHint || ''}`);
    const candidates = await this.candidateFiles(source, terms);
    const maxFiles = options.maxFiles || cfg.maxCandidateFiles || 8;
    const results = [];
    this.log('候选资料文件', source.name, candidates.slice(0, maxFiles));
    for (const path of candidates.slice(0, maxFiles)) {
      const text = await this.fetchText(`${source.base}/${path}`);
      const score = this.score(`${path}\n${text}`, terms) + (path === 'README.md' ? 2 : 0);
      if (score > 0 || path === 'README.md') results.push(this.result(source, path, text, score));
    }
    results.sort((a, b) => b.ragScore - a.ragScore);
    return results.slice(0, options.limit || cfg.defaultResultLimit || 3);
  },

  async expandKnownRefs(refs, options = {}) {
    if (!refs?.length) return [];
    return this.search(refs.map((ref) => `${ref.title || ''} ${ref.text || ''}`).join(' '), options);
  },

  pickSource(sources, query, sourceHint = '') {
    const text = this.normalize(`${sourceHint} ${query}`);
    return sources.find((source) => [source.name, ...(source.aliases || [])].some((name) => text.includes(this.normalize(name))))
      || (sourceHint ? null : sources[0]);
  },

  async candidateFiles(source, terms) {
    const cfg = window.GameModules.config.rag || {};
    const readme = await this.fetchText(`${source.base}/README.md`);
    const files = ['README.md', ...this.extractPaths(readme)];
    const indexes = files.filter((p) => /索引\.md$/.test(p))
      .sort((a, b) => this.score(b, terms) - this.score(a, terms))
      .slice(0, cfg.maxIndexFiles || 3);
    this.log('读取资料索引', source.name, indexes);
    for (const indexPath of indexes) {
      const text = await this.fetchText(`${source.base}/${indexPath}`);
      files.push(...this.extractPaths(text, indexPath));
    }
    return this.unique(files).sort((a, b) => this.score(b, terms) - this.score(a, terms));
  },

  extractPaths(text, from = '') {
    const paths = [];
    const re = /`([^`]+\.md)`|(?:^|[\s|：:])([^\s|`]+\.md)/gm;
    let match;
    while ((match = re.exec(String(text || '')))) {
      const raw = (match[1] || match[2] || '').trim();
      const path = this.resolvePath(raw, from);
      if (path && !path.includes('..')) paths.push(path);
    }
    return paths;
  },

  resolvePath(raw, from) {
    let path = raw.replace(/^AI设定库\//, '').replace(/^\.\//, '');
    if (!path.endsWith('.md')) return '';
    if (path.startsWith('../')) return '';
    if (!path.includes('/') && from.includes('/')) path = `${from.split('/').slice(0, -1).join('/')}/${path}`;
    const stack = [];
    for (const part of path.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') stack.pop(); else stack.push(part);
    }
    return stack.join('/');
  },

  async fetchText(url) {
    const useCache = window.GameModules.cache.enabled('files');
    if (useCache && this.fileCache[url] !== undefined) return this.fileCache[url];
    const cached = await this.fetchCachedText(url);
    if (cached !== null) {
      if (useCache) this.fileCache[url] = cached;
      return cached;
    }
    let text = '';
    for (const candidate of this.urlCandidates(url)) {
      try {
        this.log('读取资料文件', candidate);
        const res = await fetch(encodeURI(candidate));
        if (res.ok) {
          text = await res.text();
          break;
        }
        console.warn('资料文件读取失败:', candidate, res.status);
      } catch (err) {
        console.warn('资料文件读取失败:', candidate, err.message);
      }
    }
    if (useCache) this.fileCache[url] = text;
    return text;
  },

  roots(type) {
    const cfg = window.GameModules.config || {};
    const env = cfg.assetEnv || 'dev';
    const roots = cfg.assetRoots?.[env]?.[type] || cfg.assetRoots?.dev?.[type] || [''];
    return Array.isArray(roots) && roots.length ? roots : [''];
  },

  joinRoot(root, value) {
    if (!root) return value;
    return `${String(root).replace(/\/$/, '')}/${String(value).replace(/^\.\//, '').replace(/^\//, '')}`;
  },

  urlCandidates(url) {
    const values = [url];
    const rel = url.replace(/^\.\.\//, '').replace(/^\//, '');
    if (rel.startsWith('assets/')) {
      const withoutAssets = rel.replace(/^assets\//, '');
      for (const root of this.roots('sourceRoots')) {
        values.push(this.joinRoot(root, withoutAssets));
      }
      values.push(rel);
    }
    if (url.startsWith('../assets/')) {
      values.push(url.replace(/^\.\.\//, ''));
      values.push(url.replace(/^\.\./, ''));
    }
    return this.unique(values);
  },

  result(source, path, text, score) {
    return { novel: source.name, title: path, path, chunk: 'file', text: this.paragraphExcerpt(text), ragScore: score };
  },

  paragraphExcerpt(text, fallback = '') {
    const lines = this.cleanLines(text);
    const picked = lines.slice(0, 8).join('\n');
    return picked || this.sentenceExcerpt(text) || this.cleanLines(fallback).slice(0, 8).join('\n') || this.sentenceExcerpt(fallback);
  },

  cleanLines(text) {
    return String(text || '').replace(/\r/g, '').split('\n')
      .map((x) => x.trim()).filter((x) => x.length >= 8 && this.isCleanStart(x) && this.isCleanEnd(x));
  },

  sentenceExcerpt(text) {
    const sentences = String(text || '').replace(/\s+/g, ' ').match(/[^。！？]+[。！？]/g) || [];
    return sentences.map((x) => x.trim()).filter((x) => x.length >= 8 && this.isCleanStart(x) && this.isCleanEnd(x)).slice(0, 6).join('\n');
  },

  isCleanStart(text) { return !/^[，。！？、；：」”）\]】]|^(的|了|的话|但是|而且|因为|所以|这种|那人|她|他|我|不|总之|因此)[^。！？]{0,18}[，。]/.test(text); },
  isCleanEnd(text) { return /[。！？」”）\]】]$/.test(text) && !/[，、：；]$/.test(text); },
  sameSource(novel, sourceHint) { return this.normalize(novel) === this.normalize(sourceHint); },
  hasAny(text, terms) { return terms.some((term) => term && text.includes(term)); },

  expandTerms(query) {
    return this.unique(String(query || '').split(/[\s,，。！？、：:；;《》「」『』（）()\[\]]+/).filter((x) => x.length >= 2)).slice(0, 18);
  },

  score(text, terms) {
    const raw = String(text || '');
    return terms.reduce((sum, term) => sum + this.countMatches(raw, term) * (term.length >= 3 ? 8 : 2), 0);
  },

  countMatches(text, term) {
    let count = 0, pos = String(text).indexOf(term);
    while (pos !== -1 && count < 8) { count += 1; pos = text.indexOf(term, pos + term.length); }
    return count;
  },

  formatContext(results) {
    if (!results?.length) return '未检索到可用原作资料。';
    return results.map((item, index) => `[资料${index + 1}] 来源=${item.novel}/${item.title}\n${item.text}`).join('\n\n');
  },

  normalize(text) { return String(text || '').replace(/[\s·・／/【】\[\]（）()「」『』:：-]+/g, '').toLowerCase(); },
  unique(list) { return [...new Set(list.filter(Boolean))]; },

  log(message, ...args) {
    if (window.GameModules.config.rag?.logFiles) console.log(`[资料读取] ${message}:`, ...args);
  },
};


;// ---- rag-cache.js ----
window.GameModules = window.GameModules || {};
window.GameModules.rag = window.GameModules.rag || {};

Object.assign(window.GameModules.rag, {
  async fetchCachedText(url) {
    const source = this.sourceForUrl(url);
    if (!source?.cache) return null;
    const rel = this.relativePath(source, url);
    if (!rel) return null;
    const cache = await this.loadSourceCache(source);
    if (!cache) return null;
    const text = cache.files?.[rel];
    if (typeof text !== 'string') return null;
    this.log('读取资料快照', source.name, rel);
    return text;
  },

  sourceForUrl(url) {
    return (window.GameData?.loreSources || []).find((source) => url.startsWith(`${source.base}/`));
  },

  relativePath(source, url) {
    return url.slice(source.base.length + 1).replace(/^AI设定库\//, '').replace(/^\.\//, '');
  },

  async loadSourceCache(source) {
    const useCache = window.GameModules.cache.enabled('files');
    if (useCache && this.sourceCache[source.name]) return this.sourceCache[source.name];
    for (const url of this.cacheUrlCandidates(source.cache)) {
      try {
        this.log('读取资料快照文件', url);
        const res = await fetch(encodeURI(url));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (useCache) this.sourceCache[source.name] = data;
        return data;
      } catch (err) {
        console.warn('资料快照读取失败:', source.name, url, err.message);
      }
    }
    const embedded = this.embeddedSourceCache(source);
    if (embedded) {
      if (useCache) this.sourceCache[source.name] = embedded;
      return embedded;
    }
    if (useCache) this.sourceCache[source.name] = null;
    return null;
  },

  embeddedSourceCache(source) {
    const key = String(source.cache || '').split('/').pop();
    const data = window.GameData?.loreCache?.[key];
    if (data) this.log('读取内联资料快照', source.name, key);
    return data || null;
  },

  cacheUrlCandidates(cachePath) {
    return this.roots('cacheRoots').map((root) => this.joinRoot(root, cachePath));
  },
});


;// ---- real-world-vitals.js ----
window.GameModules = window.GameModules || {};

window.GameModules.realWorldVitals = {
  keys: ['vitality', 'stamina_pool', 'satiety', 'hydration', 'fatigue', 'mental_stability'],
  labels: { vitality: '生命力', stamina_pool: '精力', satiety: '饱食度', hydration: '水分', fatigue: '疲劳', mental_stability: '精神稳定' },

  normalize(value, elapsedSeconds = 300, action = '', target = 'player-self', fillMissing = true) {
    const list = Array.isArray(value) ? value : [];
    const targetText = String(target || 'player-self');
    const scoped = list.filter((item) => {
      const itemTarget = String(item?.target || item?.subject?.id || '').trim();
      return itemTarget ? itemTarget === targetText : fillMissing;
    });
    const byKey = new Map(scoped.map((item) => [String(item?.key || ''), item]));
    const pickedKeys = fillMissing ? this.keys : this.keys.filter((key) => byKey.has(key));
    return pickedKeys.map((key) => this.normalizeOne(key, byKey.get(key), elapsedSeconds, action, targetText));
  },

  normalizeOne(key, item, elapsedSeconds, action, target) {
    const source = item || this.fallback(key, elapsedSeconds, action);
    const delta = Math.max(-60, Math.min(60, Math.round(Number(source.delta) || 0)));
    const reason = String(source.reason || `${this.labels[key]}本次基本不变。`).slice(0, 120);
    return { key, delta, reason, target };
  },

  fallback(key, elapsedSeconds = 300, action = '') {
    const hours = Math.max(0, Number(elapsedSeconds) || 0) / 3600;
    const text = String(action || '现实行动');
    if (/睡|休息|躺|补觉/.test(text)) return this.restFallback(key, hours);
    if (/吃|饭|餐|外卖|食物/.test(text) && key === 'satiety') return { key, delta: 20, reason: '进食直接提高了饱食度。' };
    if (/喝|水|饮料|咖啡|奶茶/.test(text) && key === 'hydration') return { key, delta: 18, reason: '补充饮品提高了水分。' };
    if (key === 'vitality') return { key, delta: /受伤|摔|撞|流血|疼痛|疾病|损害|恢复|治疗|包扎/.test(text) ? (/恢复|治疗|包扎/.test(text) ? 3 : -3) : 0, reason: '本次行动对生命力没有明确额外影响。' };
    if (key === 'stamina_pool') return { key, delta: hours >= 0.5 ? -Math.min(12, Math.ceil(hours * 6)) : -1, reason: '现实行动和时间流逝消耗了精力。' };
    if (key === 'satiety') return { key, delta: hours >= 0.5 ? -Math.min(10, Math.ceil(hours * 3)) : 0, reason: '时间较短，饱食度变化有限。' };
    if (key === 'hydration') return { key, delta: hours >= 0.5 ? -Math.min(12, Math.ceil(hours * 4)) : 0, reason: '时间流逝带来少量水分消耗。' };
    if (key === 'fatigue') return { key, delta: hours >= 0.5 ? Math.min(14, Math.ceil(hours * 5)) : 1, reason: '持续行动带来疲劳累积。' };
    return { key, delta: /异常|害怕|恐惧|冲突|压力|慌/.test(text) ? -3 : 0, reason: '本次行动对精神稳定没有明显额外冲击。' };
  },

  restFallback(key, hours) {
    const rest = Math.max(1, Math.round(hours * 18));
    if (key === 'stamina_pool') return { key, delta: Math.min(45, rest), reason: '休息让体能逐步恢复。' };
    if (key === 'fatigue') return { key, delta: -Math.min(45, rest), reason: '休息降低了累积疲劳。' };
    if (key === 'mental_stability') return { key, delta: Math.min(12, Math.ceil(rest / 4)), reason: '休息让精神状态稍微稳定。' };
    return { key, delta: 0, reason: `${this.labels[key]}本次基本不变。` };
  },
};


;// ---- real-world-ai.js ----
/**
 * 现实世界 AI 推演请求。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldAi = {
  latestRequestId: 0,

  async generate(store, prompt, action, logId = null) {
    const requestId = ++this.latestRequestId;
    try {
      const agentLoop = await window.GameModules.realWorldAgentLoader?.ensure?.() || window.GameModules.realWorldAgentLoop;
      if (!agentLoop?.run) throw new Error('现实推演 Loop Agent 未加载');
      const loop = await agentLoop.run(store, action, logId);
      if (requestId !== this.latestRequestId) throw new Error('现实推演请求已被新请求取代');
      const result = this.parse(loop.result, store, action);
      result.promptPack = {
        systemPrompt: loop.prompt || prompt || '',
        userPrompt: action,
        model: store.modelId,
        promptTokens: Math.ceil(String(loop.prompt || prompt || '').length / 2),
        loadedContext: loop.loaded || [],
      };
      result.agentTrace = loop.trace || [];
      result.deepseekCache = loop.deepseekCache || null;
      return result;
    } catch (err) {
      console.error('现实世界推演失败:', err.code, err.message, err.stack);
      throw err;
    }
  },


  parse(content, store, action) {
    try {
      const raw = content && typeof content === 'object' ? content : window.GameModules.jsonUtils.parseLoose(content);
      const genericUpdates = window.GameModules.updateRegistry?.ensureNormalizedUpdates?.(raw, store)
        || (Array.isArray(raw.genericUpdates) ? raw.genericUpdates : []);
      const data = window.GameModules.updateRegistry?.migrateLegacyFactionUpdates?.({ ...raw, genericUpdates }) || { ...raw, genericUpdates };
      if (!data.narration) throw new Error('现实推演缺少正文结果');
      return {
        sceneTitle: String(data.sceneTitle || '现实世界').slice(0, 14),
        locationName: this.normalizeLocationName(data.locationName || store.realWorldLocationName),
        parentLocationName: String(data.parentLocationName || data.parentLocation || '').slice(0, 28),
        locationDescription: String(data.locationDescription || data.locationSummary || '').slice(0, 160),
        mapNodes: Array.isArray(data.mapNodes) ? data.mapNodes.slice(0, 8) : [],
        mapLinks: Array.isArray(data.mapLinks) ? data.mapLinks.slice(0, 4) : [],
        newLocations: Array.isArray(data.newLocations) ? data.newLocations.slice(0, 8) : [],
        locationDescriptionUpdates: Array.isArray(data.locationDescriptionUpdates) ? data.locationDescriptionUpdates.slice(0, 12) : [],
        thinking: '',
        narration: this.formatNarration(data.narration),
        status: String(data.status || '现实推演继续中').slice(0, 40),
        quest: String(data.quest || '确认现实处境').slice(0, 24),
        choices: this.normalizeChoices(data.choices),
        elapsedSeconds: window.GameModules.ai.clampElapsed?.(data.elapsedSeconds, 300) || 300,
        vitalUpdates: window.GameModules.realWorldVitals.normalize(data.vitalUpdates, data.elapsedSeconds, action),
        metricUpdates: window.GameModules.ai.normalizeMetricUpdates?.(data.metricUpdates, store.playerIdentityState?.()) || {},
        appearedCharacters: this.normalizeRealCharacters(data.appearedCharacters, store),
        solidifiableCharacters: this.normalizeRealSolidifiableCharacters(data.solidifiableCharacters, data.appearedCharacters, store),
        itemActions: Array.isArray(data.itemActions) ? data.itemActions.slice(0, 8) : [],
        wechatActions: this.normalizeWechatActions(data.wechatActions),
        lexiconUpdates: window.GameModules.ai.normalizeLexiconUpdates?.(data.lexiconUpdates, store) || [],
        genericUpdates: data.genericUpdates || [],
        profilePatches: Array.isArray(data.profilePatches) ? data.profilePatches.slice(0, 4) : [],
        initUpdates: Array.isArray(data.initUpdates) ? data.initUpdates.slice(0, 20) : [],
      };
    } catch (err) {
      console.warn('现实世界返回解析失败:', err.message);
      throw err;
    }
  },

  normalizeLocationName(value) {
    const name = String(value || '').trim().slice(0, 28);
    return /^(玩家住处|住处|现实地点|当前位置|未知地点|现实起点)$/u.test(name) || /现实起点$/u.test(name) ? '' : name;
  },

  realCharacterWorld() {
    return window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
  },

  normalizeRealCharacters(items = [], store) {
    return (Array.isArray(items) ? items : []).slice(0, 8).map((item) => window.GameModules.ai.normalizeCharacter(item, store, this.realCharacterWorld())).filter(Boolean);
  },

  normalizeRealSolidifiableCharacters(items = [], appeared = [], store) {
    const appearedByName = new Map(this.normalizeRealCharacters(appeared, store).map((item) => [item.name, item]));
    return (Array.isArray(items) ? items : []).slice(0, 8).map((item) => {
      if (typeof item === 'string') return appearedByName.get(item.slice(0, 16)) || window.GameModules.ai.normalizeCharacter(item, store, this.realCharacterWorld());
      return window.GameModules.ai.normalizeCharacter(item, store, this.realCharacterWorld());
    }).filter(Boolean);
  },

  normalizeCharacterMetricUpdates(value, store) {
    return (Array.isArray(value) ? value : []).map((item) => {
      const target = String(item?.target || item?.targetId || item?.characterId || item?.character || item?.name || item?.subject?.characterId || item?.subject?.id || item?.subject?.name || '').trim();
      const state = store?.itemSkillState?.(target);
      if (!target) return null;
      const legacyEmotions = (Array.isArray(item.emotions) ? item.emotions : []).filter((entry) => entry?.key || entry?.delta !== undefined || entry?.status || entry?.reason);
      const legacyFeelings = (Array.isArray(item.playerFeelings) ? item.playerFeelings : []).filter((entry) => entry?.key || entry?.delta !== undefined || entry?.status || entry?.reason);
      if (!legacyEmotions.length && !legacyFeelings.length) return null;
      return { target: state?.id || target, emotions: window.GameModules.ai.normalizeMetricGroup(legacyEmotions, window.GameModules.metrics.emotionKeys, state?.metrics?.emotions), playerFeelings: window.GameModules.ai.normalizeMetricGroup(legacyFeelings, window.GameModules.metrics.playerKeys, state?.metrics?.playerFeelings) };
    }).filter(Boolean);
  },

  formatNarration(value, limit = 100) {
    const text = String(value || '').replace(/\s*\n+\s*/g, '').trim();
    if (!text) return '';
    const sentences = this.splitNarrationSentences(text);
    const grouped = [];
    let current = '';
    for (const sentence of sentences) {
      if (!current) { current = sentence; continue; }
      if ((current + sentence).length > limit && !/^[”’"』」）】》〕〉〗,，]/u.test(sentence)) {
        grouped.push(current);
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current) grouped.push(current);
    const parts = [];
    for (const chunk of grouped) parts.push(...this.wrapNarrationChunk(chunk, limit));
    return parts.join('\n\n');
  },

  wrapNarrationChunk(text = '', limit = 100) {
    const chunk = String(text || '').trim();
    if (!chunk) return [];
    if (chunk.length <= limit) return [chunk];
    const parts = [];
    let rest = chunk;
    const softBreak = /[。！？!?；;，、,.]/u;
    const minBreak = Math.max(24, Math.floor(limit * 0.35));
    while (rest.length > limit) {
      let breakAt = limit;
      const head = rest.slice(0, limit);
      for (let i = head.length - 1; i >= minBreak; i -= 1) {
        if (softBreak.test(head[i])) {
          breakAt = i + 1;
          break;
        }
      }
      parts.push(rest.slice(0, breakAt).trim());
      rest = rest.slice(breakAt).trim();
    }
    if (rest) parts.push(rest);
    return parts.filter(Boolean);
  },

  splitNarrationSentences(text) {
    const sentences = [];
    const closingMarks = /[”’"』」）】》〕〉〗]/u;
    let current = '';
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      current += char;
      if (!/[。！？!?；;]/u.test(char)) continue;

      let next = i + 1;
      while (closingMarks.test(text[next] || '')) {
        current += text[next];
        next += 1;
      }
      if (/\s/u.test(text[next] || '')) {
        while (/\s/u.test(text[next] || '')) next += 1;
      }
      if (/[,，]/u.test(text[next] || '')) continue;
      sentences.push(current.trim());
      current = '';
      i = next - 1;
    }
    if (current.trim()) sentences.push(current.trim());
    return sentences.filter(Boolean);
  },

  normalizeChoices(value) {
    const list = Array.isArray(value) ? value : [];
    return [...new Set(list.map((x) => String(x || '').trim().slice(0, 14)).filter(Boolean).concat(['观察手机异常', '处理现实事务', '联系熟人', '暂时休息']))].slice(0, 4);
  },

  normalizeWechatActions(value) {
    return (Array.isArray(value) ? value : []).map((item) => {
      const action = String(item?.action || item?.method || '').trim();
      if (!['sendIncomingNow', 'sendIncomingPast'].includes(action)) return null;
      const contactId = String(item.contactId || item.characterId || item.target || item.name || '').trim().slice(0, 40);
      const text = String(item.text || item.message || '').trim().slice(0, 180);
      if (!contactId || !text) return null;
      return { action, contactId, text, timeIso: String(item.timeIso || item.time || '').trim(), reason: String(item.reason || '').slice(0, 120) };
    }).filter(Boolean).slice(0, 6);
  },

  fallback(store, action) {
    const text = action || '继续观察现实世界';
    return {
      sceneTitle: store.realWorldSceneTitle || '现实世界',
      locationName: this.normalizeLocationName(store.realWorldLocationName || store.realWorldMap?.current),
      parentLocationName: '',
      locationDescription: '现实推演暂时无法生成新地点说明，保留当前位置。',
      mapNodes: [],
      mapLinks: [],
      newLocations: [],
      locationDescriptionUpdates: [],
      thinking: '',
      narration: `你暂时把「${window.GameModules.gamePremise?.appName || '我要狠狠操控的'}」的界面收起，现实里的光线、空气和细碎声响重新占据感官。你按照“${text}”开始行动，先确认周围没有立刻失控的变化，再把注意力落回自己的住处、身份与眼前必须处理的事务上。那台刚同步完的新手机安静地躺在一旁，像是什么都没有发生，却又让现实边缘多出一层无法忽视的裂痕。`,
      status: '现实稳定，手机异常仍在',
      quest: '确认手机异常与现实处境',
      choices: ['检查手机记录', '观察居住环境', '联系熟人确认', '暂时休息'],
      elapsedSeconds: 300,
      vitalUpdates: window.GameModules.realWorldVitals.normalize([], 300, text),
      itemActions: [],
    };
  },
};


;// ---- update/update-registry.js ----
window.GameModules = window.GameModules || {};
window.GameModules.updateRules = window.GameModules.updateRules || {};
window.GameModules.updateRules.sexualExperience = {
  partPrompts: {
    genital: '仅在成人身份且明确稳定事实确认该部位相关经历时计数；禁止过程描写。',
    chest: '仅记录成人抽象经历中胸部相关次数，不记录触碰细节或感官描写。',
    lips: '仅记录接吻或唇部相关抽象次数，不展开亲密过程。',
    mouth: '仅记录口部相关抽象次数；如会变成露骨过程，必须跳过。',
    oralAction: '仅记录成人抽象口部行为次数，不描述动作、过程或感官细节。',
    oralSex: '仅记录成人抽象口交次数，不描述动作、过程或感官细节。',
    oralInternalFinish: '仅记录成人抽象口交中出次数，只作计数，不写过程、体液或感官描写。',
    genitalEntry: '仅记录成人抽象阴部进入次数，不描述进入过程、姿势或感官细节。',
    vaginalInsertion: '仅记录成人抽象阴部插入次数，不描述进入过程、姿势或感官细节。',
    vaginalInternalFinish: '仅记录成人抽象阴部中出次数，只作计数，不写过程、体液或感官描写。',
    anus: '仅在成人身份且明确事实确认时记录肛门相关次数，不写具体行为。',
    analEntry: '仅记录成人抽象肛部进入次数，不描述进入过程、姿势或感官细节。',
    analSex: '仅记录成人抽象肛交次数，不描述动作、过程或感官细节。',
    analInternalFinish: '仅记录成人抽象肛交中出次数，只作计数，不写过程、体液或感官描写。',
    legs: '记录腿部相关亲密接触的抽象次数，保持中性统计。',
    hips: '记录臀部相关抽象次数，避免任何露骨描述。',
    hands: '记录手部相关次数，只作统计。',
    skin: '记录皮肤接触相关抽象次数，避免感官化描述。',
    other: '其他无法归类但合规的成人抽象经历次数。',
  },
};

window.GameModules.updateRegistry = {
  types: [], prompts: {}, skills: {}, uis: {},
  skillAliases: {
    'emotional-feeling-wearing.updateEmotionFeelingWearing': ['emotion', 'feeling'],
  },
  operations: ['delta', 'set', 'append', 'remove', 'merge', 'upsert', 'create', 'delete', 'transfer', 'link', 'unlink'],

  parseSkill(text = '') {
    const raw = String(text || '');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    const meta = {};
    if (match) match[1].split(/\n+/).forEach((line) => {
      const at = line.indexOf(':');
      if (at > 0) meta[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    });
    return { name: meta.name || '', description: meta.description || '', body: match ? match[2].trim() : raw.trim(), raw };
  },

  registerPrompt(id, text) {
    if (!id || !text) return;
    const skill = this.parseSkill(text);
    this.prompts[id] = skill.body || String(text);
    this.skills[id] = { id, ...skill };
  },

  register(type) {
    if (!type?.id) return;
    this.types = this.types.filter((item) => item.id !== type.id).concat(type);
  },

  registerUi(id, ui) {
    if (!id || !ui) return;
    this.uis[id] = ui;
  },

  uiForChange(change = {}) {
    const type = this.typeForChange(change);
    return type?.ui || this.uis[type?.id] || null;
  },

  skillSummaries() {
    return this.types.map((type) => {
      const skill = this.skills[type.promptId] || {};
      const description = skill.description || type.description || type.section || '';
      return `- ${type.id}：${description}`;
    }).join('\n');
  },

  promptText() {
    const base = this.prompts['generic-update'] || '';
    const summaries = this.skillSummaries();
    return [base, summaries ? `## 可用更新 Skills 摘要\n\n${summaries}` : ''].filter(Boolean).join('\n\n');
  },

  skillText(ids = null) {
    const wanted = this.normalizedSkillNameSet(ids);
    const selected = Array.isArray(ids) ? this.types.filter((type) => wanted.has(type.id) || wanted.has(type.promptId) || wanted.has(this.skills[type.promptId]?.name)) : this.types;
    return selected.map((type) => {
      const skill = this.skills[type.promptId] || {};
      const title = skill.name || type.id;
      const body = skill.body || this.prompts[type.promptId] || type.extraPrompt || '';
      return `## ${title}\n\n${body}`;
    }).filter(Boolean).join('\n\n');
  },

  skillsText(ids = null) {
    return this.skillText(ids);
  },

  selectByNames(names = []) {
    const wanted = this.normalizedSkillNameSet(names);
    return this.types.filter((type) => wanted.has(type.id) || wanted.has(type.promptId) || wanted.has(this.skills[type.promptId]?.name));
  },

  canonicalSkillIds(names = []) {
    const wanted = this.normalizedSkillNameSet(names);
    return this.types
      .filter((type) => wanted.has(type.id) || wanted.has(type.promptId) || wanted.has(this.skills[type.promptId]?.name))
      .map((type) => type.id);
  },

  normalizedSkillNameSet(names = []) {
    const out = new Set();
    for (const raw of Array.isArray(names) ? names : []) {
      const name = String(raw || '').trim();
      if (!name) continue;
      const aliases = this.skillAliases?.[name] || [];
      [name, ...aliases].forEach((item) => out.add(item));
      const dotted = name.match(/^([a-z0-9-]+)\.[A-Za-z0-9_]+$/u)?.[1];
      if (dotted) out.add(dotted);
    }
    return out;
  },

  schemaFor(ids = null) {
    const selected = Array.isArray(ids) ? this.selectByNames(ids) : this.types;
    return { genericUpdates: selected.flatMap((type) => type.examples || []) };
  },

  schema() {
    return { genericUpdates: this.types.flatMap((type) => type.examples || []) };
  },

  genericLike(raw = {}, keys = []) {
    return keys.flatMap((key) => (Array.isArray(raw?.[key]) ? raw[key] : []))
      .filter((item) => item && typeof item === 'object' && item.field && item.change && typeof item.change === 'object');
  },

  ensureNormalizedUpdates(raw = {}, store = null) {
    if (raw?._genericUpdatesNormalized) return Array.isArray(raw.genericUpdates) ? raw.genericUpdates : [];
    return this.normalizeUpdates(raw, store);
  },

  finalizeGenericUpdates(payload = {}, rawUpdates = {}, store = null) {
    const migrated = this.migrateLegacyFactionUpdates?.(payload) || payload;
    if (migrated._genericUpdatesNormalized) return migrated;
    return {
      ...migrated,
      genericUpdates: this.normalizeUpdates({ ...rawUpdates, genericUpdates: migrated.genericUpdates ?? payload.genericUpdates }, store) || [],
      _genericUpdatesNormalized: true,
    };
  },

  normalizeUpdates(raw = {}, store = null) {
    const base = Array.isArray(raw?.genericUpdates) ? raw.genericUpdates.map((item) => this.normalizeUpdateAlias(item)) : [];
    const legacyMetrics = this.metricGenericFromLegacy?.(raw, store) || [];
    const extras = [];
    this.types.forEach((type) => {
      if (typeof type.normalize !== 'function') return;
      try {
        const items = type.normalize(raw, store) || [];
        if (Array.isArray(items)) extras.push(...items);
      } catch (err) {
        console.warn(`[UpdateRegistry] ${type.id} normalize failed:`, err.message, err.stack);
      }
    });
    return window.GameModules.orgTerritory?.dedupeOrgTerritoryUpdates?.(
      this.uniqueUpdates([...base, ...legacyMetrics, ...extras]),
      store,
    ).slice(0, 80) || this.uniqueUpdates([...base, ...legacyMetrics, ...extras]).slice(0, 80);
  },

  normalizeUpdateAlias(update = {}) {
    if (!update || typeof update !== 'object') return update;
    const value = update.change?.value;
    const hasSexualCountValue = value && typeof value === 'object' && !Array.isArray(value) && (value.totalDelta !== undefined || value.partKey || value.parts);
    const looksLikeSexualExperience = hasSexualCountValue && (/^intimacy(?:\.|$)/u.test(String(update.field || '')) || update.updateType === 'intimacy-body');
    if (!looksLikeSexualExperience || update.updateType === 'sexual-experience') return update;
    return { ...update, updateType: 'sexual-experience', field: update.field === 'intimacy.bodyStatus' ? 'intimacy.sexualExperienceParts' : update.field };
  },

  uniqueUpdates(updates = []) {
    const seen = new Set();
    return (Array.isArray(updates) ? updates : []).filter((item) => {
      if (!item || typeof item !== 'object') return false;
      const key = JSON.stringify(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  typeForChange(change = {}) {
    const text = `${change.updateType || ''} ${change.field || ''} ${change.section || ''} ${change.subject?.type || ''} ${change.group || ''}`;
    return this.types.find((type) => type.match?.(change, text)) || null;
  },

  cardForChange(change = {}, store = null) {
    const type = this.typeForChange(change);
    const card = type?.card ? type.card(change, store) : this.defaultCard(change, store);
    return this.normalizeCard(card, change, store);
  },

  normalizeCard(card = {}, change = {}, store = null) {
    const subject = change.subject || {};
    const candidates = [
      subject.characterId,
      subject.playerId,
      subject.id,
      subject.name,
      change.target,
      card.title,
      String(card.id || '').replace(/^role:/, ''),
    ].map((item) => String(item || '').trim()).filter(Boolean);
    let state = null;
    for (const key of candidates) {
      state = store?.itemSkillState?.(key) || window.GameModules.sqliteSave?.getCharacterStateByName?.(key) || null;
      if (state?.id) break;
    }
    if (!state?.id) return card;
    const title = store?.itemSkillStateLabel?.(state) || subject.name || card.title || state.id;
    return { ...card, id: `role:${state.id}`, title, section: '角色卡' };
  },

  normalizeSettlementCardRow(row = {}, store = null) {
    if (!row || typeof row !== 'object') return row;
    const card = this.normalizeCard(
      {
        id: row.cardId,
        title: row.cardTitle || row.group || row.name,
        section: row.section || '角色卡',
      },
      {
        subject: { id: row.subjectId, name: row.cardTitle || row.group || row.name },
        target: row.subjectId || row.group || row.name,
        field: row.field,
      },
      store,
    );
    return {
      ...row,
      cardId: card.id || row.cardId,
      cardTitle: card.title || row.cardTitle || row.group,
      section: card.section || row.section || '角色卡',
      group: card.title || row.group,
    };
  },

  defaultCard(change = {}, store = null) {
    const subject = change.subject || {};
    const label = subject.name || subject.id || change.group || change.target || '';
    if (change.updateType === 'character-schedule') return { id: 'schedule:real-world', title: '人事安排', section: '人事安排' };
    const playerName = store?.realWorldPlayerSettlementName?.() || '玩家';
    if (!label || label === 'player-self' || label === '玩家' || label === playerName) return { id: 'role:player-self', title: playerName, section: '角色卡' };
    return { id: `misc:${label}`, title: label, section: '其他' };
  },

  reasonText(update = {}, fallback = '现实推演结算。') {
    const reasons = typeof update.reasons === 'string' ? [update.reasons] : (Array.isArray(update.reasons) ? update.reasons : []);
    return this.normalizeSettlementText(reasons
      .map((item) => String(typeof item === 'string' ? item : (item?.evidence || item?.trigger || item?.reason || '')).trim())
      .filter(Boolean)
      .join('；') || String(update.reason || update.evidence || update.trigger || update.description || update.summary || fallback)).slice(0, 240);
  },

  normalizeSettlementText(text = '') {
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') return text;
    let out = String(text).replace(/\s+/g, ' ').trim();
    if (!out) return '';
    out = out
      .replace(/,/g, '，')
      .replace(/;/g, '；')
      .replace(/!/g, '！')
      .replace(/\?/g, '？')
      .replace(/([\u4e00-\u9fff\d）」』])\s*\.\s*(?=[\u4e00-\u9fff「"'（]|$)/g, '$1。')
      .replace(/([\u4e00-\u9fffA-Za-z\d）」』])\s*:\s*(?=[\u4e00-\u9fff「"'（])/g, '$1：');
    out = out.replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, '$1');
    out = out.replace(/[。.!！?？]+[，,、]+/g, '。');
    out = out.replace(/([，。；：！？、])\s+/g, '$1');
    out = out.replace(/\s+([，。；：！？、])/g, '$1');
    return out.replace(/；{2,}/g, '；').trim();
  },

  displayValue(value) {
    if (value && typeof value === 'object') return JSON.stringify(value);
    return this.normalizeSettlementText(String(value ?? ''));
  },

  decorateRow(row = {}) {
    const norm = (value) => (typeof value === 'string' ? this.normalizeSettlementText(value) : value);
    const detailLines = Array.isArray(row.detailLines) ? row.detailLines.map((line) => norm(line)).filter(Boolean) : [];
    return {
      ...row,
      uiTitle: norm(row.uiTitle || row.field || row.group || row.section || '结算'),
      uiName: norm(row.uiName || row.name || ''),
      uiValue: norm(row.uiValue || this.displayValue(row.value)),
      value: norm(row.value),
      reason: norm(row.reason),
      settlementAt: norm(row.settlementAt || ''),
      detailLines,
    };
  },

  rowFromGeneric(update = {}, store = null, entry = null) {
    const card = this.cardForChange(update, store);
    const change = update.change || {};
    const ui = this.uiForChange(update);
    const rawValue = change.value ?? change.toValue ?? change.mode ?? '';
    const settlementAt = update.settlementAt || (change.value && typeof change.value === 'object' ? change.value.updatedAt : '') || entry?.time?.label || '';
    const row = {
      at: entry?.time?.iso || new Date().toISOString(),
      settlementAt,
      cardId: card.id, cardTitle: card.title, section: card.section,
      field: update.field || update.updateType || '通用更新', name: update.name || this.leafName(update.field) || change.mode || '',
      value: this.displayValue(rawValue),
      reason: this.reasonText(update),
      applied: true,
    };
    const patched = typeof ui?.row === 'function' ? { ...row, ...ui.row(update, store, row, entry) } : row;
    return this.decorateRow(patched);
  },

  settlementRows(entry = {}, store = null) {
    const keepSystemUpdate = (item) => {
      if (item?.updateType !== 'system') return true;
      const raw = item?.change?.value;
      const payload = this.systemRecordPayload?.(raw) || {};
      const key = payload.key || this.leafName?.(item.field) || '';
      const value = payload.value || '';
      return !this.isNarrativeSystemEvent?.(key, value);
    };
    return [
      ...(entry.characterCardChanges || []).map((item) => this.decorateRow(this.normalizeSettlementCardRow(item, store))),
      ...((entry.genericUpdates || []).filter(keepSystemUpdate).map((item) => this.decorateRow(this.normalizeSettlementCardRow(this.rowFromGeneric(item, store, entry), store))).filter(Boolean)),
    ];
  },

  settlementGroups(entry = {}, store = null) {
    const groups = new Map();
    for (const item of this.settlementRows(entry, store)) {
      const title = item.cardTitle || item.group || store?.realWorldSettlementGroup?.(item.field, item.name) || item.section || '其他';
      const id = item.cardId || `legacy:${title}`;
      if (!groups.has(id)) groups.set(id, { id, title, section: item.section || item.group || title, items: [] });
      groups.get(id).items.push(item);
    }
    return Array.from(groups.values());
  },

  leafName(path = '') {
    const parts = String(path || '').split('.').filter(Boolean);
    return parts.at(-1) || '';
  },
};


;// ---- update/generic-update-applier.js ----
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry = window.GameModules.updateRegistry || {};
Object.assign(window.GameModules.updateRegistry, {
  targetState(store, update = {}) {
    const subject = update.subject || {};
    const id = this.normalizeSubjectId(store, subject.characterId || subject.playerId || subject.id || update.target || 'player-self', subject);
    return store?.itemSkillState?.(id) || (id === 'player-self' ? store?.playerIdentityState?.() : null);
  },

  normalizeSubjectId(store, rawId = 'player-self', subject = {}) {
    const id = String(rawId || '').trim() || 'player-self';
    if (store?.itemSkillState?.(id) || id === 'player-self') return id;
    const candidates = [subject.name, subject.characterName, this.stripInventedRolePrefix(id)].map((x) => String(x || '').trim()).filter(Boolean);
    for (const candidate of [...new Set(candidates)]) {
      const state = store?.itemSkillState?.(candidate) || window.GameModules.sqliteSave?.getCharacterStateByName?.(candidate);
      if (state?.id) return state.id;
      const bySuffix = this.findStateByNameSuffix(store, candidate);
      if (bySuffix?.id) return bySuffix.id;
    }
    return id;
  },

  stripInventedRolePrefix(id = '') {
    return String(id || '').replace(/^(?:role|char|character|角色|人物|r|c)[-_：:]?/iu, '').trim();
  },

  findStateByNameSuffix(store, name = '') {
    const value = String(name || '').trim();
    if (!value) return null;
    return Object.values(store?.rpgStates || {}).find((state) => {
      const label = String(state?.profile?.name || state?.name || '').trim();
      return label && (label === value || label.endsWith(value));
    }) || null;
  },

  genericTarget(store, update = {}) {
    const state = store?.playerIdentityState?.();
    if (!state?.values) return null;
    const card = this.cardForChange?.(update, store) || { id: `generic:${update.updateType || update.subject?.type || 'misc'}`, title: update.updateType || '通用更新', section: '通用' };
    state.values.genericUpdateStates = state.values.genericUpdateStates || {};
    state.values.genericUpdateStates[card.id] = state.values.genericUpdateStates[card.id] || { title: card.title, section: card.section };
    return { state, root: state.values.genericUpdateStates[card.id] };
  },

  get(obj, path = '', fallback = undefined) {
    return String(path || '').split('.').filter(Boolean).reduce((acc, key) => acc?.[key], obj) ?? fallback;
  },

  set(obj, path = '', value) {
    const keys = String(path || '').split('.').filter(Boolean), last = keys.pop();
    if (!last) return false;
    const target = keys.reduce((acc, key) => (acc[key] = acc[key] || {}), obj);
    target[last] = value;
    return true;
  },

  changeValue(update = {}) { return update.change?.value ?? update.value; },

  leafName(field = '') {
    return String(field || '').split('.').filter(Boolean).at(-1) || '';
  },

  metricKeyFromUpdate(update = {}) {
    return String(update.key || update.name || this.leafName(update.field)).trim();
  },

  isTemporaryMetricUpdate(update = {}) {
    return update.temporary === true || /(^|\.)temporary(?:Emotions|PlayerFeelings|\.|$)/u.test(String(update.field || ''));
  },

  applyMetricUpdate(store, update = {}) {
    const state = this.targetState(store, update);
    if (!state?.id) return false;
    const metrics = store.ensureStateMetrics?.(state) || state.metrics;
    if (!metrics) return false;
    const key = this.metricKeyFromUpdate(update);
    if (!key) return false;
    const group = update.updateType === 'feeling' ? 'player' : 'emotion';
    const fixedTarget = group === 'player' ? metrics.playerFeelings : metrics.emotions;
    const tempTarget = group === 'player' ? metrics.temporaryPlayerFeelings : metrics.temporaryEmotions;
    const temporary = this.isTemporaryMetricUpdate(update) || !Object.prototype.hasOwnProperty.call(fixedTarget || {}, key);
    const target = temporary ? tempTarget : fixedTarget;
    if (!target) return false;
    const before = window.GameModules.metrics.clamp(target[key] || 0);
    const rawDelta = window.GameModules.metrics.clampDelta(this.deltaValue(update));
    const delta = group === 'player' && !temporary ? window.GameModules.metrics.lockedPlayerDelta(key, rawDelta, before) : rawDelta;
    const next = window.GameModules.metrics.clamp(before + delta);
    const reason = this.metricReasonText(update);
    const rawStatus = String(update.change?.status ?? update.status ?? update.程度 ?? update.解释 ?? '').trim();
    window.GameModules.metrics.writeMetric(target, metrics.notes || (metrics.notes = {}), group, { key, delta, status: rawStatus, reason, temporary }, next, '现实推演结算。');
    return next !== before || Boolean(reason);
  },

  normalizeBodyStatusValue(update = {}) {
    const value = this.changeValue(update);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const partKey = value.partKey || this.leafName(update.field) || 'other';
    return {
      ...value,
      partKey,
      part: value.part || partKey,
      description: value.description || value['描述状态'] || value.desc || '',
      reason: value.reason || this.reasonText(update, '现实推演确认身体状态变化。'),
      updatedAt: value.updatedAt || new Date().toISOString(),
    };
  },

  nextValue(current, update = {}) {
    const mode = update.change?.mode || 'set', raw = this.changeValue(update);
    if (mode === 'delta') {
      if (raw && typeof raw === 'object' && raw.parts && typeof raw.parts === 'object') {
        const next = { ...(current && typeof current === 'object' ? current : {}) };
        Object.entries(raw.parts).forEach(([key, value]) => { next[key] = Math.max(0, Math.round((Number(next[key]) || 0) + (Number(value) || 0))); });
        return next;
      }
      if (raw && typeof raw === 'object' && raw.totalDelta !== undefined) return Math.max(0, Math.round((Number(current) || 0) + (Number(raw.totalDelta) || 0)));
      return Math.max(0, Math.min(100, Math.round((Number(current) || 0) + (Number(raw) || 0))));
    }
    if (mode === 'append') return [...new Set([...(Array.isArray(current) ? current : []), ...(Array.isArray(raw) ? raw : [raw])].filter(Boolean))];
    if (mode === 'remove') return Array.isArray(current) ? current.filter((item) => item !== raw) : current;
    if ((mode === 'merge' || mode === 'upsert') && current && typeof current === 'object' && raw && typeof raw === 'object') return { ...current, ...raw };
    if (mode === 'upsert' && raw && typeof raw === 'object') return raw;
    return raw;
  },

  notePath(field = '') {
    const parts = String(field || '').split('.').filter(Boolean), leaf = parts.at(-1);
    if (!parts.length) return '';
    if (parts[0] === 'metrics' && parts.length >= 3) return `${parts[0]}.notes.${parts[1]}.${leaf}`;
    return `${parts.slice(0, -1).join('.')}.reason`.replace(/^\./, '');
  },

  noteValue(field = '', value, reason = '') {
    return String(field || '').startsWith('metrics.') ? { value, reason, at: new Date().toISOString() } : reason;
  },

  applyOne(store, update = {}) {
    if (update.updateType === 'character-schedule') return this.applyCharacterScheduleUpdate(store, update);
    if (update.updateType === 'system') return this.applySystemUpdate(store, update);
    if (update.updateType === 'relationship') return this.applyRelationshipUpdate(store, update);
    if (update.updateType === 'body-status') return this.applyBodyStatusUpdate(store, update);
    if (update.updateType === 'sexual-experience') return this.applySexualExperienceUpdate(store, update);
    if (update.updateType === 'wearing-state') return this.applyWearingStateUpdate(store, update);
    if (update.updateType === 'emotion' || update.updateType === 'feeling') return this.applyMetricUpdate(store, update);
    const direct = this.targetState(store, update), generic = direct ? null : this.genericTarget(store, update);
    const state = direct || generic?.state, field = String(update.field || '').trim();
    if (!state || !field) return false;
    const root = generic?.root || (field.startsWith('metrics.') ? state : (field.startsWith('profile.') ? state : state.values));
    const path = field.startsWith('profile.') ? field.replace(/^profile\./, 'profile.') : field.replace(/^values\./, '');
    if (!root) return false;
    const current = this.get(root, path), next = this.nextValue(current, update);
    if (next === undefined || JSON.stringify(current) === JSON.stringify(next)) return false;
    this.set(root, path, next);
    const note = this.notePath(path), reason = this.reasonText(update, '现实推演确认状态变化。');
    if (note) this.set(root, note, this.noteValue(path, next, reason));
    if (/^(values\.)?wearing$/u.test(field) && state.profile) {
      state.profile.wearingItems = next;
      state.profile.wearing = next;
      state.profile.roleCardUpdatedAt = new Date().toISOString();
    }
    return true;
  },

  normalizeWearingSlot(raw = {}) {
    const part = String(raw.part || raw.slot || '').trim();
    const slot = String(raw.slot || '').trim();
    if (/^(?:全身|整体|整身|全体|全套|全身衣物|全身穿着|整体穿着)$/u.test(part)) return 'outerwear';
    if (['bra', 'top', 'outerwear', 'bottom', 'legwear', 'shoes', 'panties', '饰品'].includes(slot)) return slot;
    if (/胸部|胸口|乳房|胸罩|内衣上/u.test(part)) return 'bra';
    if (/上身|上衣|衬衫|睡衣上/u.test(part)) return 'top';
    if (/外套|罩衫|连衣裙|睡裙|裙装/u.test(part)) return 'outerwear';
    if (/下身|裙子|裤子|短裤/u.test(part)) return 'bottom';
    if (/腿部|大腿|丝袜|袜裤|裤袜/u.test(part)) return 'legwear';
    if (/足部|脚部|鞋|袜/u.test(part)) return 'shoes';
    if (/内裤|底裤/u.test(part)) return 'panties';
    if (/饰品|首饰|配饰/u.test(part)) return '饰品';
    return slot || '饰品';
  },

  applyWearingStateUpdate(store, update = {}) {
    const state = this.targetState(store, update);
    if (!state?.values) return false;
    const raw = this.changeValue(update);
    let next;
    const current = Array.isArray(state.values.wearing) ? state.values.wearing : [];
    if (Array.isArray(raw)) next = raw;
    else if (raw && typeof raw === 'object') {
      const slot = this.normalizeWearingSlot(raw);
      next = raw.fullBody
        ? current.filter((item) => String(item?.slot || '').trim() === '饰品')
        : current.slice();
      const index = next.findIndex((item) => String(item?.slot || '').trim() === slot && (slot !== '饰品' || String(item?.name || '').trim() === String(raw.name || '').trim()));
      const item = { ...(index >= 0 ? next[index] : {}), ...raw, slot };
      if (index >= 0) next[index] = item;
      else next.push(item);
    } else return false;
    if (JSON.stringify(current) === JSON.stringify(next)) return false;
    state.values.wearing = next;
    if (state.profile) {
      state.profile.wearingItems = next;
      state.profile.wearing = next;
      state.profile.roleCardUpdatedAt = new Date().toISOString();
    }
    return true;
  },

  applyBodyStatusUpdate(store, update = {}) {
    const state = this.targetState(store, update);
    if (!state?.values) return false;
    window.GameModules.initPromptRegistry?.ensureTemplateState?.('intimacyBody', state);
    const value = this.normalizeBodyStatusValue(update);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const partKey = value.partKey || this.leafName(update.field) || 'other';
    const path = `bodyStatus.${partKey}`;
    const current = this.get(state.values, path);
    const next = { ...(current && typeof current === 'object' ? current : {}), ...value, initializedByAi: true, source: 'AI更新' };
    if (JSON.stringify(current) === JSON.stringify(next)) return false;
    this.set(state.values, path, next);
    return true;
  },

  scheduleUpdatedAt(store = {}) {
    return [store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ') || new Date().toISOString();
  },

  normalizeScheduleAvailability(value = '') {
    const clean = String(value || '').trim();
    return ['在场', '场外', '未知', '暂不可用'].includes(clean) ? clean : '未知';
  },

  systemRecordPayload(raw = {}) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return {
        key: String(raw.key || '').trim(),
        value: String(raw.value ?? '').trim(),
        reason: String(raw.reason || '').trim(),
      };
    }
    return { key: '', value: String(raw || '').trim(), reason: '' };
  },

  isNarrativeSystemEvent(key = '', value = '') {
    if (key !== '事件') return false;
    const text = String(value || '').trim();
    if (!text || text.length < 24) return false;
    return /(?:进入|房间|抱住|揉|摸|亲|推|默许|颤抖|隔着|衣服|身体|反应|行动|地点|当前)/u.test(text);
  },

  legacySystemRecords(store = {}) {
    const buckets = store?.playerIdentityState?.()?.values?.genericUpdateStates || {};
    return Object.values(buckets).flatMap((bucket) => {
      const events = bucket?.events;
      if (!events || typeof events !== 'object') return [];
      return Object.entries(events).flatMap(([key, list]) => (Array.isArray(list) ? list : [list]).filter(Boolean).map((item) => {
        const payload = this.systemRecordPayload(item);
        return {
          key: payload.key || key,
          value: payload.value || String(item?.value || item || ''),
          reason: payload.reason || String(item?.reason || ''),
          at: String(item?.updatedAt || item?.at || ''),
          legacy: true,
        };
      }));
    });
  },

  applySystemUpdate(store, update = {}) {
    if (!store) return false;
    const raw = this.changeValue(update);
    const payload = this.systemRecordPayload(raw);
    const fieldKey = payload.key || this.leafName(update.field) || '记录';
    const text = payload.value || (typeof raw === 'string' ? raw : '');
    if (!text) return false;
    if (this.isNarrativeSystemEvent(fieldKey, text)) return false;
    const updatedAt = this.scheduleUpdatedAt(store);
    const reason = payload.reason || this.reasonText(update, '');
    const entry = { key: fieldKey, value: text.slice(0, 500), reason: reason.slice(0, 240), at: updatedAt };
    store.realWorldSystemRecords = Array.isArray(store.realWorldSystemRecords) ? store.realWorldSystemRecords : [];
    const dup = store.realWorldSystemRecords.some((item) => item.key === entry.key && item.value === entry.value && item.at === entry.at);
    if (dup) return false;
    store.realWorldSystemRecords = [...store.realWorldSystemRecords, entry].slice(-60);
    update.settlementAt = updatedAt;
    if (update.change?.value && typeof update.change.value === 'object' && !Array.isArray(update.change.value)) {
      update.change.value = { ...update.change.value, key: fieldKey, value: text, reason, updatedAt };
    }
    return true;
  },

  applyCharacterScheduleUpdate(store, update = {}) {
    const subject = update.subject || {};
    const id = this.normalizeSubjectId(store, subject.characterId || subject.playerId || subject.id || update.target || 'player-self', subject);
    if (!store || !id) return false;
    const raw = this.changeValue(update);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const current = store.characterSchedules?.[id] || {};
    const patch = { ...raw };
    const updatedAt = this.scheduleUpdatedAt(store);
    const next = {
      ...current,
      ...patch,
      characterId: id,
      characterName: current.characterName || subject.name || subject.characterName || id,
      availability: this.normalizeScheduleAvailability(patch.availability ?? current.availability),
      confidence: '确认',
      source: '结算事件',
      stability: '事件锁定',
      updatedAt,
    };
    if (JSON.stringify(current) === JSON.stringify(next)) return false;
    const prevLoc = String(current.currentLocation || '').trim();
    const nextLoc = String(next.currentLocation || '').trim();
    store.characterSchedules = { ...(store.characterSchedules || {}), [id]: next };
    if (nextLoc && nextLoc !== prevLoc) {
      window.GameModules.orgTerritory?.bumpOrgExposureOnScheduleLocation?.(store, nextLoc);
    }
    update.settlementAt = updatedAt;
    if (update.change?.value && typeof update.change.value === 'object' && !Array.isArray(update.change.value)) {
      update.change.value = { ...update.change.value, updatedAt };
    }
    return true;
  },

  applySexualExperienceUpdate(store, update = {}) {
    const state = this.targetState(store, update);
    if (!state?.values) return false;
    window.GameModules.initPromptRegistry?.ensureTemplateState?.('intimacyBody', state);
    const raw = this.changeValue(update);
    const current = state.values.intimacy || {};
    const next = { ...current, sexualExperienceParts: { ...(current.sexualExperienceParts || {}) }, initializedByAi: true, source: 'AI更新' };
    if (update.change?.mode === 'set') {
      if (raw && typeof raw === 'object' && raw.parts) next.sexualExperienceParts = { ...next.sexualExperienceParts, ...raw.parts };
      else if (raw && typeof raw === 'object' && raw.partKey) next.sexualExperienceParts[raw.partKey] = Math.max(0, Math.round(Number(raw.count) || 0));
      else next.sexualExperienceCount = Math.max(0, Math.round(Number(raw) || 0));
    } else {
      const fieldPart = String(update.field || '').match(/sexualExperienceParts\.([^\.]+)/u)?.[1] || '';
      const total = raw && typeof raw === 'object' ? (raw.totalDelta ?? raw.count ?? 0) : (fieldPart ? 0 : raw);
      next.sexualExperienceCount = Math.max(0, Math.round((Number(next.sexualExperienceCount) || 0) + (Number(total) || 0)));
      const parts = raw && typeof raw === 'object' ? (raw.parts || (raw.partKey ? { [raw.partKey]: raw.count ?? 1 } : {})) : (fieldPart ? { [fieldPart]: raw } : {});
      Object.entries(parts).forEach(([key, value]) => { next.sexualExperienceParts[key] = Math.max(0, Math.round((Number(next.sexualExperienceParts[key]) || 0) + (Number(value) || 0))); });
    }
    next.reason = this.reasonText(update, '现实推演确认性经验次数变化。');
    next.updatedAt = new Date().toISOString();
    if (JSON.stringify(current) === JSON.stringify(next)) return false;
    state.values.intimacy = next;
    return true;
  },

  applyRelationshipUpdate(store, update = {}) {
    const state = this.targetState(store, update);
    if (!state?.profile) return false;
    const field = String(update.field || '').trim();
    if (field === 'profile.relationships') return this.applyRelationshipText(state, update);
    return this.applyRelationshipEntry(state, update);
  },

  applyRelationshipText(state, update = {}) {
    const next = String(this.changeValue(update) || '').trim().slice(0, 1200);
    if (!next || state.profile.relationships === next) return false;
    state.profile.relationships = next;
    state.profile.roleCardUpdatedAt = new Date().toISOString();
    return true;
  },

  applyRelationshipEntry(state, update = {}) {
    const value = this.changeValue(update), mode = update.change?.mode || 'upsert';
    const relation = String(value?.relation || this.leafName(update.field) || update.name || '关系').trim().slice(0, 60);
    const name = String(value?.name || value || '').trim().slice(0, 60);
    const detail = String(value?.detail || value?.summary || this.reasonText(update, '') || '').trim().slice(0, 500);
    if (!relation || (!name && mode !== 'remove')) return false;
    const oldText = String(state.profile.relationships || '').trim();
    const entries = this.relationshipEntriesFromText(oldText);
    const index = entries.findIndex((item) => item.relation === relation && (!name || item.name === name));
    if (mode === 'remove') {
      if (index < 0) return false;
      entries.splice(index, 1);
    } else {
      const next = { relation, name, detail };
      if (index >= 0) entries[index] = { ...entries[index], ...next, detail: detail || entries[index].detail };
      else entries.push(next);
    }
    const nextText = entries.map((item) => `${item.relation}：${item.name}${item.detail ? `（${item.detail}）` : ''}`).join('；').slice(0, 1200);
    if (!nextText || nextText === oldText) return false;
    state.profile.relationships = nextText;
    state.profile.roleCardUpdatedAt = new Date().toISOString();
    return true;
  },

  relationshipEntriesFromText(text = '') {
    return String(text || '').split(/[；;\n]+/).map((part) => {
      const raw = String(part || '').trim();
      if (!raw) return null;
      const match = raw.match(/^([^：:]+)[：:](.*?)(?:[（(]([^（）()]*)[）)])?$/u);
      if (!match) return { relation: '关系', name: raw, detail: '' };
      return { relation: match[1].trim(), name: match[2].trim().replace(/[（(][^（）()]*[）)]$/u, ''), detail: String(match[3] || '').trim() };
    }).filter(Boolean);
  },

  async applyGeneric(store, updates = []) {
    const changed = new Set();
    const ordered = (Array.isArray(updates) ? updates : []).slice().sort((a, b) => {
      const aFull = a?.updateType === 'wearing-state' && this.changeValue(a)?.fullBody;
      const bFull = b?.updateType === 'wearing-state' && this.changeValue(b)?.fullBody;
      return aFull === bFull ? 0 : (aFull ? -1 : 1);
    });
    for (const update of ordered) {
      if (!this.applyOne(store, update)) continue;
      if (update.updateType === 'character-schedule') continue;
      if (update.updateType === 'system') continue;
      const state = this.targetState(store, update);
      if (state?.id) changed.add(state.id);
    }
    for (const id of changed) {
      const state = store.rpgStates?.[id] || window.GameModules.sqliteSave.getCharacterState?.(id);
      if (state) {
        store.rpgStates = { ...(store.rpgStates || {}), [id]: state };
        await window.GameModules.sqliteSave.saveCharacterState?.(state);
      }
    }
  },
});


;// ---- update/emotion-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'emotion', promptId: 'emotion-update', section: '情绪',
  match: (change, text) => /emotion|emotions|情绪/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.type === 'player' ? (subject.playerId || subject.id || 'player-self') : (subject.characterId || subject.id || subject.name || 'player-self');
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  normalize(raw = {}) {
    return window.GameModules.updateRegistry.genericLike(raw, ['characterMetricUpdates'])
      .filter((item) => /(^|\.)emotions\./u.test(String(item.field || '')) || item.updateType === 'emotion')
      .map((item) => ({ ...item, updateType: 'emotion' }));
  },
  examples: [{ updateType: 'emotion', subject: { type: 'player', id: 'player-self' }, field: 'metrics.emotions.紧张', change: { mode: 'delta', value: 3, status: '胸口发紧，呼吸不自觉变浅' }, reasons: [{ trigger: '受到现实压力刺激', evidence: '正文确认紧张反应', confidence: 'confirmed' }] }],
});


;// ---- update/feeling-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'feeling', promptId: 'feeling-update', section: '感觉',
  match: (change, text) => /playerFeelings|feeling|感觉|对玩家/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.type === 'player' ? (subject.playerId || subject.id || 'player-self') : (subject.characterId || subject.id || subject.name || 'player-self');
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  normalize(raw = {}) {
    return window.GameModules.updateRegistry.genericLike(raw, ['characterMetricUpdates'])
      .filter((item) => /(^|\.)playerFeelings\./u.test(String(item.field || '')) || item.updateType === 'feeling')
      .map((item) => ({ ...item, updateType: 'feeling' }));
  },
  examples: [{ updateType: 'feeling', subject: { type: 'character', id: '角色ID' }, field: 'metrics.playerFeelings.信任', change: { mode: 'delta', value: 2, status: '更愿意把秘密和脆弱交给对方' }, reasons: [{ trigger: '玩家兑现承诺或提供帮助', evidence: '正文确认角色因此更信任玩家', confidence: 'confirmed' }] }],
});


;// ---- update/vital-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'vital', promptId: 'vital-update', section: '生命体征',
  match: (change, text) => /vital|vitals|生命体征|生命力|vitality|stamina_pool|satiety|hydration|fatigue|mental_stability/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  examples: [{ updateType: 'vital', subject: { type: 'player', id: 'player-self' }, field: 'vitals.fatigue', change: { mode: 'delta', value: 4, unit: '%' }, reasons: [{ trigger: '长时间行动或缺乏休息', evidence: '正文确认疲劳累积', confidence: 'confirmed' }] }],
});


;// ---- update/role-card-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'role-card', promptId: 'role-card-update', section: '角色卡字段',
  match: (change, text) => change.updateType !== 'relationship' && !/(^|\.)relationships?(\.|$)|人际关系/u.test(String(change.field || '')) && /角色卡|profile|identity|skill|职业|身份|外貌|性格|技能|wearing|穿着|status_tags|盛装|dressedProfile/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  examples: [{ updateType: 'role-card', subject: { type: 'player', id: 'player-self' }, field: 'profile.refinedRole', change: { mode: 'set', value: '新的现实身份' }, reasons: [{ trigger: '现实资料确认身份变化', evidence: '正文或资料明确确认新身份', confidence: 'confirmed' }] }],
});


;// ---- update/relationship-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'relationship', promptId: 'relationship-update', section: '人际关系',
  match: (change, text) => /relationship|relationships|人际关系|关系名|亲属|恋人|朋友|同事|师生|雇佣|敌对|同居/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  normalize(raw = {}) {
    const direct = window.GameModules.updateRegistry.genericLike(raw, ['relationshipUpdates'])
      .filter((item) => item.updateType === 'relationship' || /(^|\.)relationships?\./u.test(String(item.field || '')));
    const legacy = (Array.isArray(raw.relationshipUpdates) ? raw.relationshipUpdates : []).map((item) => {
      if (item?.field && item?.change) return { ...item, updateType: item.updateType || 'relationship' };
      const subject = item.subject || { type: item.target === 'player-self' ? 'player' : 'character', id: item.target || item.targetId || item.characterId || 'player-self' };
      const relation = item.relation || item.relationship || item.name || '关系';
      return {
        updateType: 'relationship',
        subject,
        field: item.field || `relationships.${relation}`,
        change: item.change && typeof item.change === 'object' ? item.change : { mode: item.mode || 'upsert', value: { relation, name: item.personName || item.to || item.value || '', detail: item.detail || item.reason || '' } },
        reasons: Array.isArray(item.reasons) ? item.reasons : [{ trigger: item.reason || '关系变化', evidence: item.detail || item.reason || '', confidence: 'confirmed' }],
      };
    });
    return [...direct, ...legacy];
  },
  examples: [{ updateType: 'relationship', subject: { type: 'character', id: '角色ID' }, field: 'relationships.恋人', change: { mode: 'upsert', value: { relation: '恋人', name: '玩家姓名', detail: '双方确认稳定恋爱关系' } }, reasons: [{ trigger: '双方确认关系', evidence: '正文明确确认双方以恋人身份相处', confidence: 'confirmed' }] }],
});


;// ---- update/sexual-experience-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'sexual-experience', promptId: 'sexual-experience-update', section: '角色卡字段',
  match: (change, text) => /sexual-experience|sexualExperienceCount|sexualExperienceParts|性经验总次数|分类次数/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  examples: [{ updateType: 'sexual-experience', subject: { type: 'player', id: 'player-self' }, field: 'intimacy.sexualExperienceParts.chest', change: { mode: 'delta', value: { totalDelta: 1, parts: { chest: 1, skin: 1 } } }, reasons: [{ trigger: '成人身份且稳定事实确认抽象经历次数变化', evidence: '只记录总数与分类次数，不记录过程', confidence: 'confirmed' }] }],
});


;// ---- update/sexual-history-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'sexual-history',
  promptId: 'sexual-history-update',
  section: '角色卡字段',
  match: (change, text) => /sexual-history|sexualHistory|sexualStatus|sexualPartnerCount|sexualPartners|virginityStatus|firstVaginalPartner|defloweredPartners|性经历|经历人数|经历人列表|处女|非处女|破处|初体验/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  examples: [
    { updateType: 'sexual-history', subject: { type: 'player', id: 'player-self' }, field: 'intimacy.sexualHistory', change: { mode: 'merge', value: { virginityStatus: '处女', virginityEvidence: '正文明确建立此前处女事实' } }, reasons: [{ trigger: '此前处女事实确认', evidence: '正文明确建立此前处女事实', confidence: 'confirmed' }] },
    { updateType: 'sexual-history', subject: { type: 'player', id: 'player-self' }, field: 'intimacy.sexualHistory', change: { mode: 'merge', value: { virginityStatus: '非处女', firstVaginalPartner: { type: 'character', id: '角色id', name: '姓名' }, firstVaginalAt: '当前回合', firstVaginalEvidence: '正文明确确认首次事实' } }, reasons: [{ trigger: '首次阴道插入或处女膜破裂事实确认', evidence: '正文明确确认', confidence: 'confirmed' }] },
    { updateType: 'sexual-history', subject: { type: 'player', id: 'player-self' }, field: 'intimacy.sexualHistory.defloweredPartners', change: { mode: 'append', value: { type: 'character', id: '角色id', name: '姓名', at: '当前回合' } }, reasons: [{ trigger: '成为对方初体验对象', evidence: '正文明确确认', confidence: 'confirmed' }] },
    { updateType: 'sexual-history', subject: { type: 'player', id: 'player-self' }, field: 'intimacy.sexualPartnerCount', change: { mode: 'set', value: 1 }, reasons: [{ trigger: '成人身份且稳定事实确认阴部插入经历', evidence: '与已确认经历人列表保持一致', confidence: 'confirmed' }] },
  ],
});


;// ---- update/body-status-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'body-status', promptId: 'body-status-update', section: '角色卡字段',
  match: (change, text) => /body-status|bodyStatus|身体状态|部位状态|口部|胸部|阴部|肛部|臀部/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  normalize(raw = {}) {
    const direct = window.GameModules.updateRegistry.genericLike(raw, ['bodyStatusUpdates'])
      .filter((item) => String(item.field || '').startsWith('bodyStatus.') || item.updateType === 'body-status');
    const nested = raw.bodyStatus && typeof raw.bodyStatus === 'object' ? raw.bodyStatus : {};
    const converted = [];
    Object.entries(nested).forEach(([target, parts]) => {
      if (!parts || typeof parts !== 'object') return;
      Object.entries(parts).forEach(([key, value]) => {
        if (!value || typeof value !== 'object') return;
        converted.push({
          updateType: 'body-status', subject: { type: target === 'player-self' ? 'player' : 'character', id: target },
          field: `bodyStatus.${value.partKey || key}`, change: { mode: 'set', value },
          reasons: [{ trigger: '身体状态变化', evidence: value.reason || value['变化原因'] || value['描述状态'] || value.description || value.status || '', confidence: 'confirmed' }],
        });
      });
    });
    return [...direct, ...converted];
  },
  examples: [{ updateType: 'body-status', subject: { type: 'player', id: 'player-self' }, field: 'bodyStatus.mouth', change: { mode: 'set', value: { partKey: 'mouth', part: '口部', status: '稳定', '描述状态': '口部清洁，状态稳定' } }, reasons: [{ trigger: '明确护理、受伤、疾病或恢复事实', evidence: '只记录中性短状态与描述状态', confidence: 'confirmed' }] }],
});


;// ---- update/wearing-state-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'wearing-state', promptId: 'wearing-state-update', section: '角色卡字段',
  match: (change, text) => /wearing-state|values\.wearing|profile\.wearing|穿着|衣物|胸罩|衬衫|裙子|连裤袜/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  normalize(raw = {}) {
    const direct = window.GameModules.updateRegistry.genericLike(raw, ['wearingUpdates'])
      .map((item) => ({ ...item, updateType: 'wearing-state', field: item.field || 'values.wearing' }));
    return direct;
  },
  examples: [{
    updateType: 'wearing-state',
    subject: { type: 'character', id: '角色id', name: '姓名' },
    field: 'values.wearing',
    change: { mode: 'set', value: [{ slot: 'bra', name: '胸罩', state: '仍穿着但被推开，胸部外露' }] },
    reasons: [{ trigger: '衣物局部状态变化', evidence: '正文确认衣物被推开但未脱下', confidence: 'confirmed' }],
  }, {
    updateType: 'wearing-state',
    subject: { type: 'character', id: '角色id', name: '姓名' },
    field: 'values.wearing',
    change: { mode: 'merge', value: { outerwear: '衬衫仍穿着但纽扣解开' } },
    reasons: [{ trigger: '衣物细节变化', evidence: '正文确认衬衫纽扣被解开', confidence: 'confirmed' }],
  }],
});


;// ---- update/item-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'item', promptId: 'item-update', section: '物品与穿着',
  match: (change, text) => /item|inventory|物品|装备|穿着|购买|转交|丢弃|消耗/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  examples: [{ updateType: 'item', subject: { type: 'inventory', id: 'player-self' }, field: 'inventory.wallet.quantity', change: { mode: 'delta', value: -1 }, reasons: [{ trigger: '确认消耗或转移物品', evidence: '正文确认物品数量变化', confidence: 'confirmed' }] }],
});


;// ---- update/faction-structure-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'faction-structure', promptId: 'faction-structure-update', section: '组织架构',
  match: (change, text) => /faction.*structure|structure|组织架构|职位|部门|岗位|成员/u.test(text),
  card(change) {
    const subject = change.subject || {};
    const id = subject.factionId || subject.id || subject.name || 'faction';
    const title = subject.name || subject.id || '势力卡';
    return { id: `faction:${id}`, title, section: '势力卡' };
  },
  examples: [{ updateType: 'faction-structure', subject: { type: 'faction', id: '势力ID', factionId: '势力ID' }, field: 'structure.department.roles', change: { mode: 'upsert', value: { title: '职位', characters: ['角色名'] } }, reasons: [{ trigger: '确认组织内职位或成员变化', evidence: '正文或资料确认组织架构调整', confidence: 'confirmed' }] }],
});


;// ---- update/territory-control-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'territory-control',
  promptId: 'territory-control-update',
  section: '领土控势',
  match: (change, text) => /territory.*control|控势|夺控|占领|解放|移交/u.test(text),
  card(change) {
    const subject = change.subject || {};
    const id = subject.locationName || subject.id || subject.name || 'map-node';
    const title = subject.locationName || subject.name || '地图地点';
    return { id: `map-control:${id}`, title, section: '地图控势' };
  },
  examples: [{
    updateType: 'territory-control',
    subject: { type: 'map', id: 'loc_xxx', locationName: '地点名' },
    field: 'control',
    change: {
      mode: 'set',
      value: {
        effectiveOrgId: 'country-china',
        claimOrgId: 'country-china',
        status: 'stable',
        reason: '正文确认控势变化',
        inherit: false,
      },
    },
    reasons: [{ trigger: '正文确认夺控、解放或行政归属变化', evidence: '结算依据来自 Stage2 正文硬事实', confidence: 'confirmed' }],
  }],
});


;// ---- update/org-capability-entry-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'org-capability-entry',
  promptId: 'org-capability-entry-update',
  section: '组织能力',
  match: (change, text) => /org-capability|capability-entry|能力条目|兵种|科室|产线|资产包/u.test(text),
  card(change) {
    const subject = change.subject || {};
    const id = subject.factionId || subject.id || subject.name || 'faction';
    const title = subject.name || subject.id || '势力卡';
    return { id: `faction:${id}`, title, section: '势力能力' };
  },
  examples: [{
    updateType: 'org-capability-entry',
    subject: { type: 'faction', id: '势力ID', factionId: '势力ID', name: '势力名' },
    field: 'solid.capabilities.military.entries',
    change: {
      mode: 'upsert',
      value: {
        name: '黑盾特遣队',
        kind: '兵种',
        state: 'fog',
        parentRef: { fog: true, label: '迷雾' },
        sketchNote: '正文仅确认存在该单位，隶属未明',
      },
    },
    reasons: [{ trigger: '正文确认新设组织内具体能力条目', evidence: 'Stage2 硬事实 + 同轮结算', confidence: 'confirmed' }],
  }],
});


;// ---- update/org-capability-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'org-capability',
  promptId: 'org-capability-update',
  section: '组织维度',
  match: (change, text) => /org-capability(?!-entry)|组织(政治|经济|资产|军事)能力/u.test(text),
  card(change) {
    const subject = change.subject || {};
    const id = subject.factionId || subject.id || subject.name || 'faction';
    return { id: `faction:${id}`, title: subject.name || '势力卡', section: '势力能力' };
  },
  examples: [{
    updateType: 'org-capability',
    subject: { type: 'faction', id: '势力ID', name: '势力名' },
    field: 'solid.capabilities.economic',
    change: {
      mode: 'merge',
      value: { dimension: 'economic', note: '涉及经营与雇佣事实', entries: [] },
    },
    reasons: [{ trigger: '正文确认该势力在经济维度的稳定事实', evidence: '结算依据', confidence: 'confirmed' }],
  }],
});


;// ---- update/membership-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'membership',
  promptId: 'membership-update',
  section: '人事归属',
  match: (change, text) => /membership|人事归属|入职|任职|force_positions/u.test(text),
  card(change) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.id || subject.name || 'character';
    const title = subject.name || subject.characterName || '角色';
    return { id: `membership:${id}`, title, section: '人事归属' };
  },
  examples: [{
    updateType: 'membership',
    subject: { type: 'character', id: 'player-self', name: '角色名' },
    field: 'values.memberships',
    change: {
      mode: 'upsert',
      value: {
        orgId: 'company-main',
        orgName: '成都星河云栈科技有限公司',
        title: '高级后端工程师',
        department: '产品研发部',
        departmentFog: false,
        state: 'sketch',
      },
    },
    reasons: [{ trigger: '正文确认角色在某组织的职位或部门', evidence: 'Stage2 硬事实', confidence: 'confirmed' }],
  }],
});


;// ---- update/org-status-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'org-status',
  promptId: 'org-status-update',
  section: '政体状态',
  match: (change, text) => /org-status|政体|独立|起义|解散|合并|rebel|merged|dissolved/u.test(text),
  card(change) {
    const subject = change.subject || {};
    const id = subject.factionId || subject.orgId || subject.id || 'faction';
    return { id: `faction:${id}`, title: subject.name || id, section: '势力政体' };
  },
  examples: [{
    updateType: 'org-status',
    subject: { type: 'faction', id: 'force-rebel-1', name: '某某自治会' },
    field: 'status',
    change: {
      mode: 'set',
      value: {
        status: 'rebel',
        legitimacy: 'contested',
        reason: '正文确认局部起义成立',
      },
    },
    reasons: [{ trigger: '正文确认独立、起义、解散、合并', evidence: 'Stage2 硬事实', confidence: 'confirmed' }],
  }],
});


;// ---- update/faction-overview-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'faction-overview', promptId: 'faction-overview-update', section: '势力总览',
  match: (change, text) => /faction_overview|faction_parent|parentFaction|势力总览|上层势力|新增势力|势力增加/u.test(text),
  card(change) {
    const subject = change.subject || {};
    const id = subject.parentFactionId || subject.factionId || subject.id || 'faction-overview';
    const title = subject.name || '势力总览';
    return { id: `faction-overview:${id}`, title, section: '势力总览卡' };
  },
  examples: [{ updateType: 'faction-overview', subject: { type: 'faction_parent', id: '上层势力ID', parentFactionId: '上层势力ID' }, field: 'children.factions', change: { mode: 'append', value: { name: '新增势力名', type: '公司/学校/组织' } }, reasons: [{ trigger: '现实确认新势力存在', evidence: '正文或资料明确出现新组织', confidence: 'confirmed' }] }],
});


;// ---- update/map-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'map', promptId: 'map-update', section: '地点地图',
  match: (change, text) => /location|map|地点|地图|路线|parentLocation|descriptionFacts/u.test(text),
  card() { return { id: 'map:real-world', title: '地图', section: '地图卡' }; },
  examples: [{ updateType: 'map', subject: { type: 'location', id: '地点名' }, field: 'descriptionFacts', change: { mode: 'append', value: '玩家新确认的地点事实' }, reasons: [{ trigger: '玩家到达或观察地点', evidence: '正文确认新地点事实', confidence: 'confirmed' }] }],
});


;// ---- update/system-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'system', promptId: 'system-update', section: '系统记录',
  match: (change, text) => /company|calendar|worldline|wechat|system|公司|日历|世界线|微信/u.test(text),
  card(change) {
    const subject = change.subject || {};
    const name = subject.name || subject.type || '系统记录';
    return { id: `system:${subject.type || name}`, title: name, section: '系统卡' };
  },
  examples: [{ updateType: 'system', subject: { type: 'calendar', id: 'calendar' }, field: 'events', change: { mode: 'append', value: '新增日程或世界线记录' }, reasons: [{ trigger: '现实确认系统级记录变化', evidence: '正文或资料确认应写入系统记录', confidence: 'confirmed' }] }],
});


;// ---- update/character-schedule-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'character-schedule',
  section: '人事安排',
  match: (change, text) => change.updateType === 'character-schedule' || /characterSchedules?|人事安排/u.test(text),
  card() {
    return { id: 'schedule:real-world', title: '人事安排', section: '人事安排' };
  },
  examples: [{
    updateType: 'character-schedule',
    subject: { type: 'character', id: '角色id', name: '角色名' },
    field: 'characterSchedules',
    change: { mode: 'merge', value: { currentAction: '正在做的事', reason: '正文明确行动证据' } },
    reasons: [{ trigger: '人事安排当前行动', evidence: '正文明确行动证据', confidence: 'confirmed' }],
  }],
});


;// ---- update/generic-update.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'generic', promptId: 'generic-update', section: '通用固化',
  match: (change) => change.updateType === 'generic' || change.updateType === 'generic-update' || change.updateType === 'lexicon' || change.updateType === 'status-tag' || change.updateType === 'skill-or-profession',
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || subject.name || 'generic';
    const field = String(change.field || '');
    if (/^status_tags(?:\.|$)/u.test(field)) {
      const card = store?.resolveCharacterSettlementCard?.(id, subject.name || id);
      if (card) return card;
    }
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `generic:${id}`, title, section: '通用固化' };
  },
  examples: [{
    updateType: 'generic',
    subject: { type: 'character', id: '角色ID', name: '角色名' },
    field: 'status_tags',
    change: { mode: 'append', value: ['Master', '令咒3划', '供魔链稳定'] },
    reasons: [{ trigger: '正文或资料确认稳定状态', evidence: '已明确确认该角色具备这些状态标签', confidence: 'confirmed' }],
  }],
});


;// ---- update/emotion-update-ui.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('emotion', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = Number(change.value ?? update.value) || 0;
    const sign = change.mode === 'delta' && value > 0 ? '+' : '';
    const reasons = Array.isArray(update.reasons) ? update.reasons : [];
    const first = reasons.find(Boolean) || {};
    const evidence = window.GameModules.updateRegistry.normalizeSettlementText(window.GameModules.metrics.cleanMetricReason(first.evidence || update.reason || update.evidence || '', row.name || window.GameModules.updateRegistry.leafName(update.field)));
    return {
      field: '情绪变化',
      name: row.name || window.GameModules.updateRegistry.leafName(update.field),
      value: change.mode === 'delta' ? `${sign}${value}` : (change.value ?? ''),
      reason: evidence || window.GameModules.updateRegistry.normalizeSettlementText(row.reason),
      trigger: first.trigger || '',
      confidence: first.confidence || '',
      detailLines: [
        evidence ? `说明：${evidence}` : '',
        first.trigger ? `触发：${window.GameModules.updateRegistry.normalizeSettlementText(first.trigger)}` : '',
        first.confidence ? `确认：${window.GameModules.updateRegistry.normalizeSettlementText(first.confidence)}` : '',
      ].filter(Boolean),
    };
  },
});


;// ---- update/feeling-update-ui.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('feeling', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = Number(change.value ?? update.value) || 0;
    const sign = change.mode === 'delta' && value > 0 ? '+' : '';
    const reasons = Array.isArray(update.reasons) ? update.reasons : [];
    const first = reasons.find(Boolean) || {};
    const evidence = window.GameModules.updateRegistry.normalizeSettlementText(window.GameModules.metrics.cleanMetricReason(first.evidence || update.reason || update.evidence || '', row.name || window.GameModules.updateRegistry.leafName(update.field)));
    return {
      field: '感觉变化',
      name: row.name || window.GameModules.updateRegistry.leafName(update.field),
      value: change.mode === 'delta' ? `${sign}${value}` : (change.value ?? ''),
      reason: evidence || window.GameModules.updateRegistry.normalizeSettlementText(row.reason),
      trigger: first.trigger || '',
      confidence: first.confidence || '',
      detailLines: [
        evidence ? `说明：${evidence}` : '',
        first.trigger ? `触发：${window.GameModules.updateRegistry.normalizeSettlementText(first.trigger)}` : '',
        first.confidence ? `确认：${window.GameModules.updateRegistry.normalizeSettlementText(first.confidence)}` : '',
      ].filter(Boolean),
    };
  },
});


;// ---- update/vital-update-ui.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('vital', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = Number(change.value ?? update.value) || 0;
    const sign = value > 0 ? '+' : '';
    return {
      field: '生命体征',
      name: row.name || window.GameModules.updateRegistry.leafName(update.field),
      value: change.mode === 'delta' ? `变化${sign}${value}${change.unit || ''}` : (change.value ?? ''),
    };
  },
});


;// ---- update/role-card-update-ui.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('role-card', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    const field = String(update.field || row.field || '');
    const rawValue = change.value ?? row.value ?? '';
    const isStatusTags = field === 'status_tags' || /^status_tags(?:\.|$)/u.test(field);
    const displayValue = (() => {
      if (!isStatusTags || !rawValue || typeof rawValue !== 'object') {
        return rawValue && typeof rawValue === 'object' ? JSON.stringify(rawValue) : rawValue;
      }
      const tag = String(rawValue.value || rawValue.label || '').trim();
      const result = String(rawValue.result || change.mode || '').trim();
      return [tag, result ? `（${result}）` : ''].filter(Boolean).join('');
    })();
    return {
      field: isStatusTags ? '状态标签' : '角色卡字段',
      uiTitle: isStatusTags ? '状态标签' : (row.uiTitle || row.field || '角色卡字段'),
      name: isStatusTags ? '当前状态' : (row.name || window.GameModules.updateRegistry.leafName(update.field)),
      value: displayValue,
      uiValue: displayValue,
      detailLines: [change.mode ? `方式：${change.mode}` : '', first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});


;// ---- update/relationship-update-ui.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('relationship', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = change.value ?? row.value ?? '';
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    const relation = value && typeof value === 'object' ? (value.relation || row.name || window.GameModules.updateRegistry.leafName(update.field)) : (row.name || window.GameModules.updateRegistry.leafName(update.field));
    const targetName = value && typeof value === 'object' ? value.name : value;
    return {
      field: '人际关系',
      name: relation,
      value: targetName && typeof targetName === 'object' ? JSON.stringify(targetName) : targetName,
      detailLines: [change.mode ? `方式：${change.mode}` : '', value?.detail ? `设定：${value.detail}` : '', first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});


;// ---- update/sexual-experience-update-ui.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('sexual-experience', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = change.value || {};
    const total = value.totalDelta ?? change.value ?? row.value;
    const parts = value.parts && typeof value.parts === 'object' ? Object.entries(value.parts).map(([k, v]) => `${k}${Number(v) >= 0 ? '+' : ''}${v}`).join('、') : '';
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    return {
      field: '经历次数',
      name: row.name || window.GameModules.updateRegistry.leafName(update.field),
      value: change.mode === 'delta' ? `变化${Number(total) >= 0 ? '+' : ''}${total}` : total,
      detailLines: [parts ? `分类：${parts}` : '', first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});


;// ---- update/sexual-history-update-ui.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('sexual-history', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = change.value ?? row.value ?? '';
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    return {
      field: '经历记录',
      name: row.name || window.GameModules.updateRegistry.leafName(update.field),
      value: value && typeof value === 'object' ? JSON.stringify(value) : value,
      detailLines: [change.mode ? `方式：${change.mode}` : '', first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});


;// ---- update/body-status-update-ui.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('body-status', {
  row(update = {}, store = {}, row = {}) {
    const value = update.change?.value || {};
    const part = value.part || value.partKey || row.name || window.GameModules.updateRegistry.leafName(update.field);
    const status = value.status || value['状态'] || '状态更新';
    const desc = value.description || value['描述状态'] || '';
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    return {
      field: '身体状态',
      name: part,
      value: desc ? `${status}｜${desc}` : status,
      detailLines: [first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});


;// ---- update/wearing-state-update-ui.js ----
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerUi?.('wearing-state', {
  row(update = {}, _store = null, row = {}) {
    return {
      ...row,
      uiTitle: '穿着/外观状态',
      uiName: update.subject?.name || row.cardTitle || row.name || '穿着',
      uiValue: window.GameModules.updateRegistry.displayValue(update.change?.value ?? update.value ?? ''),
    };
  },
});


;// ---- update/item-update-ui.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('item', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = change.value ?? row.value ?? '';
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    return {
      field: '物品与穿着',
      name: row.name || window.GameModules.updateRegistry.leafName(update.field),
      value: value && typeof value === 'object' ? JSON.stringify(value) : value,
      detailLines: [change.mode ? `方式：${change.mode}` : '', first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});


;// ---- update/faction-structure-update-ui.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('faction-structure', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = change.value ?? row.value ?? '';
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    return {
      field: '组织架构',
      name: row.name || window.GameModules.updateRegistry.leafName(update.field),
      value: value && typeof value === 'object' ? JSON.stringify(value) : value,
      detailLines: [change.mode ? `方式：${change.mode}` : '', first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});


;// ---- update/faction-overview-update-ui.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('faction-overview', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = change.value ?? row.value ?? '';
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    return {
      field: '势力总览',
      name: row.name || window.GameModules.updateRegistry.leafName(update.field),
      value: value && typeof value === 'object' ? JSON.stringify(value) : value,
      detailLines: [change.mode ? `方式：${change.mode}` : '', first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});


;// ---- update/map-update-ui.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('map', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = change.value ?? row.value ?? '';
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    return {
      field: '地点地图',
      name: row.name || window.GameModules.updateRegistry.leafName(update.field),
      value: value && typeof value === 'object' ? JSON.stringify(value) : value,
      detailLines: [change.mode ? `方式：${change.mode}` : '', first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});


;// ---- update/system-update-ui.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('system', {
  row(update = {}, store = {}, row = {}, entry = null) {
    const registry = window.GameModules.updateRegistry;
    const change = update.change || {};
    const raw = change.value ?? row.value ?? '';
    const payload = registry.systemRecordPayload?.(raw) || {};
    const fieldKey = payload.key || registry.leafName(update.field) || '记录';
    const text = registry.normalizeSettlementText(payload.value || (typeof raw === 'string' ? raw : ''));
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    const norm = (value) => registry.normalizeSettlementText(String(value || ''));
    const timeLabel = norm(payload.updatedAt || update.settlementAt || row.settlementAt || entry?.time?.label || '');
    const reason = norm(first.evidence || payload.reason || update.reason || row.reason || '');
    return {
      field: '系统记录',
      uiTitle: '系统记录',
      name: fieldKey,
      uiName: fieldKey,
      value: text,
      uiValue: text,
      reason,
      settlementAt: timeLabel,
      detailLines: [
        timeLabel ? `时间：${timeLabel}` : '',
        change.mode ? `方式：${change.mode}` : '',
        first.trigger ? `触发：${norm(first.trigger)}` : '',
        first.confidence ? `确认：${norm(first.confidence)}` : '',
      ].filter(Boolean),
    };
  },
});


;// ---- update/character-schedule-update-ui.js ----
window.GameModules = window.GameModules || {};

(function installCharacterScheduleUi() {
  const registry = window.GameModules.updateRegistry;
  if (!registry) return;

  const scheduleKey = (update = {}, raw = {}) => {
    const trigger = String((Array.isArray(update.reasons) ? update.reasons.find(Boolean) : null)?.trigger || '');
    const fromTrigger = trigger.match(/^人事安排(.+)$/u)?.[1];
    if (fromTrigger) return fromTrigger;
    if (raw.currentLocation) return '当前地点';
    if (raw.currentAction) return '当前行动';
    if (raw.availability) return '可用状态';
    return '状态';
  };

  const scheduleDisplay = (store = {}, subjectId = '', raw = {}, key = '', value = '', evidence = '') => {
    const norm = (text) => registry.normalizeSettlementText(String(text || ''));
    const stored = store?.characterSchedules?.[subjectId] || {};
    const merged = { ...stored, ...raw };
    const parts = [];
    if (merged.currentLocation) parts.push(`地点：${norm(merged.currentLocation)}`);
    const action = merged.currentAction || (key === '当前行动' ? value : '');
    if (action && !/^(?:按角色日常安排活动|由玩家当前行动决定)$/u.test(action)) parts.push(`行动：${norm(action)}`);
    else if (key === '可用状态' && evidence && evidence.length >= 4 && !/^(?:正文|证据|明确)/u.test(evidence)) parts.push(`行动：${norm(evidence)}`);
    const availability = merged.availability || (key === '可用状态' ? value : '');
    if (availability) parts.push(`可用：${norm(availability)}`);
    return parts.join('｜') || norm(value) || norm(evidence);
  };

  registry.registerUi?.('character-schedule', {
    row(update = {}, store = {}, row = {}, entry = null) {
      const subject = update.subject || {};
      const subjectId = subject.characterId || subject.playerId || subject.id || update.target || 'player-self';
      const subjectName = store?.realWorldSettlementTargetGroup?.(subjectId, subject.name || '') || subject.name || subjectId;
      const raw = update.change?.value && typeof update.change.value === 'object' ? update.change.value : {};
      const key = scheduleKey(update, raw);
      const value = key === '当前地点' ? raw.currentLocation || '' : key === '当前行动' ? raw.currentAction || '' : key === '可用状态' ? raw.availability || '' : raw.currentAction || raw.currentLocation || raw.availability || '';
      const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
      const evidence = registry.normalizeSettlementText(first.evidence || raw.reason || update.reason || row.reason || '');
      const norm = (text) => registry.normalizeSettlementText(String(text || ''));
      const timeLabel = norm(raw.updatedAt || update.settlementAt || row.settlementAt || entry?.time?.label || '');
      const composite = scheduleDisplay(store, subjectId, raw, key, value, evidence);
      return {
        field: '人事安排',
        uiTitle: '人事安排',
        name: subjectName,
        uiName: subjectName,
        value: norm(value),
        uiValue: composite,
        reason: evidence,
        settlementAt: timeLabel,
        detailLines: [
          timeLabel ? `时间：${timeLabel}` : '',
          first.trigger ? `触发：${norm(first.trigger)}` : '',
          first.confidence ? `确认：${norm(first.confidence)}` : '',
        ].filter(Boolean),
      };
    },
  });
}());


;// ---- update/generic-update-ui.js ----
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('generic', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = change.value ?? row.value ?? '';
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    const field = String(update.field || row.field || '');
    const isStatusTags = /^status_tags(?:\.|$)/u.test(field);
    const displayValue = (() => {
      if (!isStatusTags) return value && typeof value === 'object' ? JSON.stringify(value) : value;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return String(value.value || value.label || JSON.stringify(value));
      }
      return value;
    })();
    return {
      field: isStatusTags ? '状态标签' : (row.field || update.field || '通用固化'),
      uiTitle: isStatusTags ? '状态标签' : (row.uiTitle || row.field || update.field || '通用固化'),
      name: isStatusTags ? (window.GameModules.updateRegistry.leafName(field) || '状态标签') : (row.name || update.name || window.GameModules.updateRegistry.leafName(update.field) || update.updateType || '通用固化'),
      value: displayValue,
      uiValue: displayValue,
      detailLines: [change.mode ? `方式：${change.mode}` : '', first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});


;// ---- update/generic-update-compat.js ----
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry = window.GameModules.updateRegistry || {};

Object.assign(window.GameModules.updateRegistry, {
  vitalKeyFromField(field = '') {
    const key = String(field || '').split('.').filter(Boolean).at(-1) || '';
    const aliases = { vitality: 'vitality', 生命力: 'vitality', 生命值: 'vitality', 健康: 'vitality', health: 'vitality', stamina: 'stamina_pool', 精力: 'stamina_pool', 精力池: 'stamina_pool', 体力: 'stamina_pool', 饱食度: 'satiety', 饱食: 'satiety', satiety: 'satiety', 水分: 'hydration', 口渴: 'hydration', 水合: 'hydration', hydration: 'hydration', 疲劳: 'fatigue', 疲劳度: 'fatigue', fatigue: 'fatigue', 精神稳定: 'mental_stability', 精神稳定度: 'mental_stability', mental_stability: 'mental_stability' };
    return aliases[key] || key;
  },

  cleanReasonText(value = '') {
    return String(value || '').trim().replace(/^(?:证据|evidence)[:：]\s*/iu, '');
  },

  reasonTexts(update = {}) {
    const list = Array.isArray(update.reasons) ? update.reasons : [];
    const texts = list.flatMap((item) => {
      if (!item) return [];
      if (typeof item === 'object') return [item.trigger, item.evidence];
      return [item];
    });
    texts.push(update.reason, update.trigger, update.evidence, update.description, update.summary);
    return [...new Set(texts.map((item) => this.cleanReasonText(item)).filter(Boolean))];
  },

  reasonObject(update = {}) {
    const texts = this.reasonTexts(update);
    return { trigger: texts[0] || '', evidence: texts.slice(1).join('，') || texts[0] || '' };
  },

  reasonText(update = {}, fallback = '现实推演结算。') {
    return this.reasonTexts(update).join('，').slice(0, 180) || fallback;
  },

  metricReasonText(update = {}, fallback = '现实推演结算。') {
    const key = String(update.field || '').split('.').filter(Boolean).at(-1) || update.name || '';
    return window.GameModules.metrics?.cleanMetricReason?.(this.reasonText(update, fallback), key) || this.reasonText(update, fallback);
  },

  metricStatusText(update = {}) {
    return String(update.change?.status ?? update.status ?? update.程度 ?? update.解释 ?? '').trim().slice(0, 180);
  },

  deltaValue(update = {}) {
    const value = update.change?.value ?? update.value ?? 0;
    return Number(value) || 0;
  },

  genericToVitalUpdates(updates = [], store = null) {
    return (Array.isArray(updates) ? updates : []).filter((item) => item?.updateType === 'vital').map((item) => {
      const subject = item.subject || {};
      const rawTarget = subject.type === 'player' ? (subject.playerId || subject.id || 'player-self') : (subject.characterId || subject.id || subject.name || item.target || 'player-self');
      const target = this.canonicalSubjectId(store, rawTarget);
      return { key: this.vitalKeyFromField(item.field), delta: this.deltaValue(item), reason: this.reasonText(item), target, subject: { ...subject, id: target } };
    }).filter((item) => ['vitality', 'stamina_pool', 'satiety', 'hydration', 'fatigue', 'mental_stability'].includes(item.key));
  },

  canonicalSubjectId(store = null, id = 'player-self') {
    const state = store?.itemSkillState?.(id) || (id === 'player-self' ? store?.playerIdentityState?.() : null);
    return state?.id || id || 'player-self';
  },

  metricGenericFromLegacy(result = {}) {
    const out = [];
    for (const group of Array.isArray(result.characterMetricUpdates) ? result.characterMetricUpdates : []) {
      if (!group || typeof group !== 'object' || (group.field && group.change)) continue;
      const rawTarget = group.target || group.targetId || group.characterId || group.character || group.name || group.subject?.characterId || group.subject?.id || group.subject?.name || 'player-self';
      const subject = { ...(group.subject || {}), type: group.subject?.type || (rawTarget === 'player-self' ? 'player' : 'character'), id: rawTarget, name: group.subject?.name || group.name || group.character || '' };
      (Array.isArray(group.emotions) ? group.emotions : []).forEach((item) => {
        if (!item?.key) return;
        out.push({ updateType: 'emotion', subject, field: `metrics.emotions.${item.key}`, change: { mode: 'delta', value: window.GameModules.metrics.metricDeltaValue?.(item) ?? item.delta ?? 0, status: String(item.status || '').slice(0, 180) }, reasons: [{ trigger: item.trigger || item.reason || '现实推演情绪变化', evidence: item.reason || item.evidence || '', confidence: 'confirmed' }] });
      });
      (Array.isArray(group.playerFeelings) ? group.playerFeelings : []).forEach((item) => {
        if (!item?.key) return;
        out.push({ updateType: 'feeling', subject, field: `metrics.playerFeelings.${item.key}`, change: { mode: 'delta', value: window.GameModules.metrics.metricDeltaValue?.(item) ?? item.delta ?? 0, status: String(item.status || '').slice(0, 180) }, reasons: [{ trigger: item.trigger || item.reason || '现实推演感觉变化', evidence: item.reason || item.evidence || '', confidence: 'confirmed' }] });
      });
    }
    return out;
  },

  genericToMetricUpdates(updates = [], type = 'emotion', store = null) {
    const grouped = new Map();
    const wanted = type === 'feeling' ? 'feeling' : 'emotion';
    const bucket = wanted === 'feeling' ? 'playerFeelings' : 'emotions';
    for (const item of Array.isArray(updates) ? updates : []) {
      if (item?.updateType !== wanted) continue;
      const subject = item.subject || {};
      const rawTarget = subject.type === 'player' ? (subject.playerId || subject.id || 'player-self') : (subject.characterId || subject.id || subject.name || item.target || item.character || item.name || 'player-self');
      const target = this.canonicalSubjectId(store, rawTarget);
      const key = String(item.field || '').split('.').filter(Boolean).at(-1) || item.name;
      if (!key) continue;
      if (!grouped.has(target)) grouped.set(target, { target, subject: { ...subject, id: target }, emotions: [], playerFeelings: [] });
      const temporary = item.temporary === true || /(^|\.)temporary(?:Emotions|PlayerFeelings|\.|$)/u.test(String(item.field || ''));
      grouped.get(target)[bucket].push({ key, delta: this.deltaValue(item), status: this.metricStatusText(item), reason: this.metricReasonText(item), temporary });
    }
    return Array.from(grouped.values());
  },

  genericToItemActions(updates = []) {
    return (Array.isArray(updates) ? updates : []).filter((item) => item?.updateType === 'item').map((item) => {
      const subject = item.subject || {}, change = item.change || {}, value = change.value;
      const name = item.name || String(item.field || '').split('.').filter(Boolean).at(-1) || value?.name || '物品变化';
      return {
        action: change.mode || 'upsert', target: subject.characterId || subject.playerId || subject.id || 'player-self', from: change.fromValue, to: change.toValue,
        itemName: name, quantity: value?.quantity || 1, item: value && typeof value === 'object' ? value : { name, kind: /wearing|穿着/u.test(item.field || '') ? '穿着' : '物品', description: String(value ?? '') },
        reason: this.reasonText(item),
      };
    });
  },

  genericToFactionUpdates(updates = []) {
    return (Array.isArray(updates) ? updates : []).filter((item) => /^faction-/u.test(item?.updateType || '')).map((item) => {
      const subject = item.subject || {}, change = item.change || {}, value = change.value;
      const name = subject.name || subject.factionId || subject.id || item.name || '势力变化';
      return {
        action: item.updateType === 'faction-structure' ? 'updateStructure' : (change.mode || 'upsert'), factionName: name,
        name, type: value?.type || subject.type || '势力', position: value?.title || value?.position || value?.name || '', value,
        reason: this.reasonText(item),
      };
    });
  },

  legacyFactionUpdateToGeneric(item = {}) {
    const action = String(item?.action || item?.method || 'upsert').trim();
    const name = String(item.factionName || item.name || '势力变化').trim();
    const reason = this.reasonText(item, String(item.reason || 'legacy factionUpdates 迁移'));
    const reasons = [{ trigger: reason, evidence: reason, confidence: 'confirmed' }];
    if (action === 'updateStructure') {
      return {
        updateType: 'faction-structure',
        subject: { type: 'faction', name, factionId: name },
        field: 'structure',
        change: { mode: 'upsert', value: item.value || item.structure || item },
        reasons,
      };
    }
    if (action === 'addFactionPosition') {
      return {
        updateType: 'membership',
        subject: { type: 'character', characterName: item.characterName || item.character || '未知', name: item.characterName || item.character },
        field: 'values.memberships',
        change: {
          mode: 'upsert',
          value: {
            orgName: name,
            factionName: name,
            title: item.position || item.title || '成员',
            department: item.department || '',
          },
        },
        reasons,
      };
    }
    return {
      updateType: 'faction-overview',
      subject: { type: 'faction', name, factionId: name },
      field: 'overview',
      change: { mode: action === 'upsert' ? 'upsert' : 'set', value: item.value || item },
      reasons,
    };
  },

  migrateLegacyFactionUpdates(result = {}) {
    const legacy = Array.isArray(result.factionUpdates) ? result.factionUpdates.filter(Boolean) : [];
    if (!legacy.length) return result;
    console.warn('[orgTerritory] factionUpdates 已废弃，已自动迁移为 genericUpdates：', legacy.length, '条');
    const generic = Array.isArray(result.genericUpdates) ? result.genericUpdates.slice() : [];
    const keys = new Set(generic.map((item) => `${item.updateType}:${JSON.stringify(item.subject || {})}:${item.field || ''}`));
    legacy.forEach((item) => {
      const converted = this.legacyFactionUpdateToGeneric(item);
      const key = `${converted.updateType}:${JSON.stringify(converted.subject || {})}:${converted.field || ''}`;
      if (keys.has(key)) return;
      generic.push(converted);
      keys.add(key);
    });
    return { ...result, genericUpdates: generic, factionUpdates: [] };
  },

  orgNamesFromGenericUpdates(updates = [], store = null) {
    const names = [];
    const ot = window.GameModules.orgTerritory;
    (Array.isArray(updates) ? updates : []).forEach((item) => {
      const type = String(item?.updateType || '');
      const subject = item.subject || {};
      const value = item.change?.value || {};
      if (/^faction-|org-status|membership|territory-control/u.test(type)) {
        [subject.name, subject.factionName, subject.factionId, subject.orgId, value.name, value.factionName].filter(Boolean).forEach((n) => names.push(String(n)));
      }
      if (type === 'territory-control') {
        const eff = ot?.orgNameById?.(store, value.effectiveOrgId || value.effective);
        const claim = ot?.orgNameById?.(store, value.claimOrgId || value.claim);
        if (eff) names.push(eff);
        if (claim && claim !== eff) names.push(claim);
      }
      if (type === 'membership') {
        [value.orgName, value.factionName, ot?.orgNameById?.(store, value.orgId)].filter(Boolean).forEach((n) => names.push(String(n)));
      }
    });
    return [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  },

  expandGenericForLegacy(result = {}, store = null) {
    const updates = Array.isArray(result.genericUpdates) ? result.genericUpdates : [];
    if (!updates.length && !(result.factionUpdates || []).length) return result;
    const emotions = this.genericToMetricUpdates(updates, 'emotion', store);
    const feelings = this.genericToMetricUpdates(updates, 'feeling', store);
    const byTarget = new Map();
    [...emotions, ...feelings].forEach((group) => {
      const old = byTarget.get(group.target) || { target: group.target, subject: group.subject, emotions: [], playerFeelings: [] };
      old.emotions.push(...(group.emotions || []));
      old.playerFeelings.push(...(group.playerFeelings || []));
      byTarget.set(group.target, old);
    });
    return {
      ...result,
      vitalUpdates: [...(result.vitalUpdates || []), ...this.genericToVitalUpdates(updates, store)],
      characterMetricUpdates: Array.from(byTarget.values()),
      itemActions: [...(result.itemActions || []), ...this.genericToItemActions(updates)],
      factionUpdates: [],
    };
  },
});


;// ---- update/generic-update-template.js ----
window.GameModules = window.GameModules || {};

window.GameModules.genericUpdateTemplate = {
  patchLoop(loop) {
    if (!loop || loop.updateRegistryPatched) return;
    const basePrompt = loop.buildUpdateJsonPrompt;
    const baseSchema = loop.updateJsonSchema;
    const baseProse = loop.proseFinal;
    const baseMerge = loop.mergeNarrationAndUpdates;
    loop.buildUpdateSkillSelectPrompt = async function buildUpdateSkillSelectPrompt({ action, base, loaded, materialSession = null, narration }) {
      const loadedText = window.GameModules.realWorldAgentContext.buildLoadedText(loaded);
      const materialText = window.GameModules.realWorldMaterials?.summary?.(materialSession) || '';
      const summaries = window.GameModules.updateRegistry?.skillSummaries?.() || '';
      const initSummaries = window.GameModules.initPromptRegistry?.skillSummaries?.(this) || '';
      return [
        '# 现实推演阶段3：只选择更新与初始化 Skills',
        '你不是正文作者，不要续写剧情，不要输出旁白，不要输出行动结果。',
        '你只做分类选择，只输出一个 JSON 对象；第一个字符必须是 {，最后一个字符必须是 }。',
        `本次行动：${action || '继续观察现实世界'}`,
        `基础上下文摘要：\n${String(base || '').slice(0, 1200)}`,
        `已动态载入资料摘要：\n${[loadedText, materialText].filter(Boolean).join('\n\n').slice(0, 1600) || '无'}`,
        `已生成正文事实：\n${String(narration || '').slice(0, 2200)}`,
        `可选更新 Skills：\n${summaries || '无'}`,
        `可选初始化 Skills：\n${initSummaries || '无'}`,
        '任务：仅根据“已生成正文事实”和资料摘要，选择需要进入下一阶段处理的 skill 名称。只选择有明确变化证据的 skill。',
        '禁止输出正文、分析过程、Markdown、代码块、额外说明。',
        '输出格式：{"skillNames":["skill-name"],"initSkillNames":["skill-name"],"reason":"选择原因"}。如果没有需要的通用更新或初始化，数组返回空。',
      ].join('\n\n');
    };

    loop.selectUpdateSkills = async function selectUpdateSkills({ store, action, base, loaded, materialSession, narration, narrationPrompt = '', logId }) {
      const registry = window.GameModules.updateRegistry;
      if (!registry?.skillSummaries?.()) return [];
      try {
        const prompt = await this.buildUpdateSkillSelectPrompt({ store, action, base, loaded, materialSession, narration, narrationPrompt });
        this.markStep(store, logId, '现实正文已完成，正在选择更新技能…', { keepNarration: true });
        const raw = await this.completeConfiguredStep(store, prompt, logId, false, { ...this.realConfig(), promptId: 'inference-stage4-settlement-window' });
        if (!String(raw || '').includes('{')) return { updateSkillIds: null, initSkillIds: [] };
        const data = window.GameModules.jsonUtils.parseLoose(raw);
        const names = Array.isArray(data?.skillNames) ? data.skillNames : [];
        const initNames = Array.isArray(data?.initSkillNames) ? data.initSkillNames : [];
        return { updateSkillIds: registry.selectByNames(names).map((type) => type.id), initSkillIds: initNames };
      } catch (err) {
        console.warn('现实更新 skill 选择失败，退回全部更新 skill:', err.message);
        return { updateSkillIds: null, initSkillIds: [] };
      }
    };

    loop.buildUpdateJsonPrompt = async function patchedBuildUpdateJsonPrompt(...args) {
      const options = args[0] || {};
      const registry = window.GameModules.updateRegistry;
      const selected = Array.isArray(options.updateSkillIds) ? options.updateSkillIds : null;
      const initSelected = Array.isArray(options.initSkillIds) ? options.initSkillIds : [];
      const prompt = await basePrompt.apply(this, args);
      const skillText = registry?.skillText?.(selected) || '';
      const initText = window.GameModules.initPromptRegistry?.skillText?.(initSelected, options.store) || '';
      const examples = JSON.stringify({
        type: 'final', sceneTitle: '标题', locationName: '具体地点', elapsedSeconds: 300, status: '状态', quest: '目标',
        choices: ['行动一', '行动二', '行动三', '行动四'],
        ...(registry?.schemaFor?.(selected) || { genericUpdates: [] }),
        ...(window.GameModules.initPromptRegistry?.schema?.(initSelected, options.store) || {}),
      });
      const phaseTitle = selected?.length || initSelected.length ? '# 现实推演阶段4：按已选 Skills 生成更新JSON' : '# 现实推演阶段4：生成更新JSON';
      const strictPrompt = prompt
        .replace('# 现实推演阶段3：只生成更新JSON', phaseTitle)
        .replace('输出最小补丁 JSON：必须包含 type、sceneTitle、locationName、elapsedSeconds、status、quest、choices、vitalUpdates。其他字段只有明确变化才输出，否则省略或用空数组。', '输出最小补丁 JSON：必须包含 type、sceneTitle、locationName、elapsedSeconds、status、quest、choices、genericUpdates。除 initUpdates 外，禁止输出 vitalUpdates、metricUpdates、characterMetricUpdates、lexiconUpdates、itemActions、factionUpdates、wechatActions 等旧字段。')
        .replace('生命体征、情绪、感觉、身体状态、物品、势力、地图、系统等变化全部写入 genericUpdates；choices 必须4个；所有 reason/status 不超过24个汉字；每个主体同类变化最多4条；没有明确变化则 genericUpdates 返回空数组。', '生命体征、情绪、感觉、身体状态、物品、势力、地图、系统等变化全部写入 genericUpdates；禁止输出 characterMetricUpdates；choices 必须4个；所有 reason/status 不超过24个汉字；每个主体同类变化最多4条；没有明确变化则 genericUpdates 返回空数组。')
        .replace(/最小示例：\{[\s\S]*$/, `reasons 必须写成对象数组："reasons":[{"trigger":"触发","evidence":"依据","confidence":"confirmed"}]；禁止写成 "reasons":["trigger":"...","evidence":"..."]。\n最小示例：${examples}`);
      return [strictPrompt, skillText ? `## 已加载更新 Skills 全文\n\n${skillText}` : '', initText ? `## 已加载初始化 Skills 全文\n\n${initText}` : ''].filter(Boolean).join('\n\n');
    };

    loop.generatePhasedFinal = async function patchedGeneratePhasedFinal(options) {
      const narrationPrompt = await this.buildNarrationPrompt(options);
      this.markStep(options.store, options.logId, '现实资料已足够，正在生成正文…');
      const narrationRaw = await this.completeStep(options.store, narrationPrompt, options.logId, true);
      const narration = await this.ensurePhasedNarrationLength(options.store, options.action, narrationPrompt, this.cleanPhasedNarration(narrationRaw), options.logId);
      if (!narration) throw new Error('现实推演正文为空');
      this.showFinalNarration(options.store, options.logId, narration);
      const selectedSkills = await this.selectUpdateSkills({ ...options, narration, narrationPrompt });
      const updateSkillIds = selectedSkills?.updateSkillIds ?? null;
      const initSkillIds = selectedSkills?.initSkillIds || [];
      const jsonPrompt = await this.buildUpdateJsonPrompt({ ...options, narration, updateSkillIds, initSkillIds });
      this.markStep(options.store, options.logId, '现实更新与初始化技能已加载，正在生成状态更新…', { keepNarration: true });
      const jsonRaw = await this.completeUpdateJson(options.store, jsonPrompt, options.logId);
      const updates = this.parseUpdateJson(jsonRaw) || {};
      const result = this.mergeNarrationAndUpdates(options.store, narration, updates);
      return { result, prompt: `---NARRATION---\n${narrationPrompt}\n\n---UPDATE_SKILLS---\n${Array.isArray(updateSkillIds) ? updateSkillIds.join(', ') : 'ALL_FALLBACK'}\n\n---INIT_SKILLS---\n${initSkillIds.join(', ')}\n\n---UPDATE_JSON---\n${jsonPrompt}`, loaded: options.loaded, raw: `${narrationRaw}\n\n${jsonRaw}`, trace: options.trace };
    };

    loop.updateJsonSchema = function patchedUpdateJsonSchema(...args) {
      return { ...baseSchema.apply(this, args), ...(window.GameModules.updateRegistry?.schema?.() || { genericUpdates: [] }) };
    };
    loop.proseFinal = function patchedProseFinal(...args) {
      const result = baseProse.apply(this, args);
      if (result && !Array.isArray(result.genericUpdates)) result.genericUpdates = [];
      return result;
    };
    loop.mergeNarrationAndUpdates = function patchedMergeNarrationAndUpdates(...args) {
      const result = baseMerge.apply(this, args);
      delete result.characterMetricUpdates;
      return result;
    };
    loop.updateRegistryPatched = true;
  },

  patchAi(ai) {
    if (!ai || ai.updateRegistryPatched) return;
    const baseParse = ai.parse;
    ai.parse = function patchedParse(...args) {
      return baseParse.apply(this, args);
    };
    ai.updateRegistryPatched = true;
  },

  install() {
    this.patchLoop(window.GameModules.realWorldAgentLoop);
    this.patchAi(window.GameModules.realWorldAi);
  },
};

window.GameModules.genericUpdateTemplate.install();


;// ---- update/settlement-ui-bridge.js ----
window.GameModules = window.GameModules || {};

(function installSettlementUiBridge() {
  const registry = window.GameModules.updateRegistry;
  if (!registry || registry.settlementUiBridgeInstalled) return;

  registry.legacySettlementType = function legacySettlementType(row = {}) {
    const text = `${row.updateType || ''} ${row.field || ''} ${row.name || ''} ${row.group || ''} ${row.section || ''}`;
    if (/临时情绪|临时感觉/u.test(text)) return 'system';
    if (/人事安排|characterSchedules?/u.test(text)) return 'character-schedule';
    if (/情绪/u.test(text)) return 'emotion';
    if (/感觉/u.test(text)) return 'feeling';
    if (/人际关系|关系名|relationships?|亲属|恋人|朋友|同事|师生|同居/u.test(text)) return 'relationship';
    if (/生命体征|生命力|生命值|健康|精力|饱食|水分|疲劳|精神稳定/u.test(text)) return 'vital';
    if (/物品|装备|穿着|购买|转交|丢弃|消耗/u.test(text)) return 'item';
    if (/地图|地点|路线/u.test(text)) return 'map';
    if (/控势|夺控|占领|领土|territory/u.test(text)) return 'territory-control';
    if (/政体|独立|起义|解散|合并|org-status/u.test(text)) return 'org-status';
    if (/能力条目|兵种|科室|产线|capability/u.test(text)) return 'org-capability-entry';
    if (/人事归属|membership|入职|任职/u.test(text)) return 'membership';
    if (/组织架构|职位|部门|岗位|成员/u.test(text)) return 'faction-structure';
    if (/势力|公司|社群|社区|家庭|组织/u.test(text)) return 'faction-overview';
    if (/身份|角色卡|职业|外貌|性格|技能|状态|盛装|status_tags/u.test(text)) return 'role-card';
    return 'system';
  };

  registry.legacySettlementSubject = function legacySettlementSubject(row = {}) {
    const cardId = String(row.cardId || '');
    const title = row.cardTitle || row.group || row.name || '';
    if (cardId.startsWith('schedule:')) return { type: 'character', id: cardId.slice(9) || 'real-world', name: title || '人事安排' };
    if (cardId.startsWith('role:')) return { type: 'player', id: cardId.slice(5) || 'player-self', name: title };
    if (cardId.startsWith('faction:')) return { type: 'faction', id: cardId.slice(8), name: title };
    if (cardId.startsWith('map:')) return { type: 'location', id: title || 'real-world-map', name: title };
    if (cardId.startsWith('system:')) return { type: title || 'system', id: cardId.slice(7), name: title };
    return { type: 'player', id: 'player-self', name: title };
  };

  registry.legacySettlementField = function legacySettlementField(type = '', row = {}) {
    const name = row.name || this.leafName?.(row.field) || type || '结算';
    if (type === 'emotion') return `metrics.emotions.${name}`;
    if (type === 'feeling') return `metrics.playerFeelings.${name}`;
    if (type === 'vital') return `vitals.${name}`;
    if (type === 'item') return `inventory.${name}`;
    if (type === 'map') return `map.${name}`;
    if (type === 'faction-overview') return `factions.${name}`;
    if (type === 'faction-structure') return `structure.${name}`;
    if (type === 'role-card') return row.field || `profile.${name}`;
    if (type === 'character-schedule') return 'characterSchedules';
    return row.field || `system.${name}`;
  };

  registry.legacySettlementUpdate = function legacySettlementUpdate(row = {}) {
    if (row && typeof row === 'object' && row.updateType && row.change) return row;
    const source = row && typeof row === 'object' ? row : {
      field: '系统记录', name: '结算', value: String(row || ''), reason: String(row || ''), group: '系统记录', section: '系统卡',
    };
    const updateType = this.legacySettlementType(source);
    const value = source.uiValue ?? source.value ?? '';
    const reason = source.reason || '本轮正文确认的变化。';
    const trigger = source.field === '盛装外观' ? '盛装外观更新'
      : (source.field === '状态标签' || /^status_tags/u.test(String(source.field || '')) ? '状态标签更新' : '结算确认');
    return {
      updateType,
      subject: this.legacySettlementSubject(source),
      field: this.legacySettlementField(updateType, source),
      name: source.uiName || source.name || this.leafName?.(source.field) || source.field || '结算',
      change: { mode: 'set', value },
      reasons: [{ trigger, evidence: reason, confidence: 'settled' }],
      __settlementRow: source,
    };
  };

  registry.rowFromSettlement = function rowFromSettlement(row = {}, store = null, entry = null) {
    const source = row && typeof row === 'object' ? row : null;
    const isTemporaryMetricRow = /^(临时情绪|临时感觉)$/u.test(source?.field || '');
    const rendered = this.rowFromGeneric(this.legacySettlementUpdate(row), store, entry);
    if (!source || source.updateType) return rendered;
    return this.decorateRow({
      ...rendered,
      at: source.at || rendered.at,
      group: source.group || rendered.group,
      cardId: rendered.cardId,
      cardTitle: rendered.cardTitle,
      section: rendered.section || source.section,
      field: isTemporaryMetricRow ? source.field : rendered.field,
      name: isTemporaryMetricRow ? (source.uiName || source.name || source.field || rendered.name) : rendered.name,
      value: isTemporaryMetricRow ? (source.uiValue ?? source.value ?? rendered.value) : rendered.value,
      uiTitle: isTemporaryMetricRow ? source.field : rendered.uiTitle,
      uiName: isTemporaryMetricRow ? (source.uiName || source.name || source.field || rendered.uiName) : rendered.uiName,
      uiValue: isTemporaryMetricRow ? (source.uiValue ?? source.value ?? rendered.uiValue) : rendered.uiValue,
      applied: source.applied !== undefined ? source.applied : rendered.applied,
    });
  };

  registry.settlementRows = function settlementRows(entry = {}, store = null) {
    const keepSystemUpdate = (item) => {
      if (item?.updateType !== 'system') return true;
      const raw = item?.change?.value;
      const payload = this.systemRecordPayload?.(raw) || {};
      const key = payload.key || this.leafName?.(item.field) || '';
      const value = payload.value || '';
      return !this.isNarrativeSystemEvent?.(key, value);
    };
    const vitalAliases = { 生命力: 'vitality', 生命值: 'vitality', 健康: 'vitality', health: 'vitality', 精力池: 'stamina_pool', 精力: 'stamina_pool', 体力: 'stamina_pool', stamina: 'stamina_pool', 饱食度: 'satiety', 饱食: 'satiety', 水分: 'hydration', 水合: 'hydration', 疲劳度: 'fatigue', 疲劳: 'fatigue', 精神稳定: 'mental_stability', 精神稳定度: 'mental_stability' };
    const appliedMetricKeys = new Set((entry.characterCardChanges || []).filter((item) => /^(情绪|感觉|临时情绪|临时感觉)$/u.test(item?.field || '')).map((item) => `${item.cardId || item.group || ''}:${item.field}:${item.name}`));
    const appliedVitalKeys = new Set((entry.characterCardChanges || []).filter((item) => item?.field === '生命体征').map((item) => `${item.cardId || item.group || ''}:vital:${vitalAliases[item.name] || item.name}`));
    const genericRows = (entry.genericUpdates || [])
      .filter((item) => {
        if (/^(emotion|feeling)$/u.test(item?.updateType || '')) {
          const name = this.leafName?.(item.field) || item.name || '';
          const fixedKeys = item.updateType === 'feeling' ? window.GameModules.metrics?.playerKeys : window.GameModules.metrics?.emotionKeys;
          const isTemporary = /(^|\.)temporary(\.|$)/u.test(item?.field || '') || item?.temporary === true || (Array.isArray(fixedKeys) && name && !fixedKeys.includes(name));
          const type = item.updateType === 'feeling' ? (isTemporary ? '临时感觉' : '感觉') : (isTemporary ? '临时情绪' : '情绪');
          const card = this.cardForChange(item, store);
          return !appliedMetricKeys.has(`${card.id || card.title || ''}:${type}:${name}`);
        }
        if (item?.updateType === 'vital') {
          const card = this.cardForChange(item, store);
          const key = this.vitalKeyFromField?.(item.field) || this.leafName?.(item.field) || item.name || '';
          return !appliedVitalKeys.has(`${card.id || card.title || ''}:vital:${key}`);
        }
        return true;
      })
      .filter(keepSystemUpdate)
      .map((item) => this.rowFromGeneric(item, store, entry));
    return [
      ...(entry.characterCardChanges || []).map((item) => {
        if (item?.field && !item?.updateType) {
          return this.decorateRow(this.normalizeSettlementCardRow(item, store));
        }
        return this.rowFromSettlement(item, store, entry);
      }),
      ...genericRows.map((row) => this.decorateRow(this.normalizeSettlementCardRow(row, store))),
    ].filter(Boolean);
  };

  registry.settlementUiBridgeInstalled = true;
}());


;// ---- real-world-clock-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.realWorldClockActions = {
  startPhoneClock() { this.ensurePhoneFixedTime(); },

  ensurePhoneFixedTime() {
    const initialized = new Date(this.playerProfile?.initializedAt || Date.now()).getTime();
    const base = Number.isFinite(initialized) && initialized > 946684800000 ? initialized : Date.now();
    const current = Number(this.phoneFixedTime);
    if (!Number.isFinite(current) || current <= 946684800000) this.phoneFixedTime = base;
  },

  advancePhoneTime(seconds = 60) {
    this.ensurePhoneFixedTime();
    const delta = Math.max(0, Math.min(2592000, Math.round(Number(seconds) || 0))) * 1000;
    this.phoneFixedTime += delta;
  },

  phoneDate() { this.ensurePhoneFixedTime(); return new Date(this.phoneFixedTime); },

  phoneTimeText() {
    const d = this.phoneDate();
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map((x) => String(x).padStart(2, '0')).join(':');
  },

  phoneDateText() {
    const d = this.phoneDate();
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${week}`;
  },

  openRealWorldPanel() {
    if (!this.isRealCurrentWorld?.()) return this.routeCurrentWorldAction?.();
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    this.collapseRealWorldThinking?.();
    this.realWorldOpen = true;
    this.checkWorkReminder?.();
    window.GameModules.sqliteSave.saveRealWorldLogEntries?.(this.realWorldLog).then(() => this.refreshRealWorldLogPage?.(999999)).catch((err) => console.warn('[现实日志] 分页刷新失败:', err.message, err.stack));
    this.refreshRealWorldLogPage?.(999999);
    if (!this.realWorldLog.length) {
      if (map.current) this.seedRealWorldLog();
      else this.submitRealWorldAction('根据我的现实资料确认当前所在的具体地点，并建立电子地图根节点');
    }
  },

  closeRealWorldPanel() {
    this.collapseRealWorldThinking?.();
    this.realWorldOpen = false;
    this.realWorldFunctionOpen = false;
    this.sharedControlActive = false;
  },

  openRealWorldFunctionPanel(view = 'menu') {
    this.realWorldFunctionView = view;
    this.realWorldFunctionOpen = true;
    if (view === 'map') {
      requestAnimationFrame(() => {
        this.fitRealWorldMapView?.();
        this.renderRealWorldMapGraph?.();
      });
    }
    if (view === 'layouts') {
      this.backRealWorldLayoutCatalogList?.();
    }
  },
  closeRealWorldFunctionPanel() {
    this.realWorldFunctionOpen = false;
    this.realWorldFunctionView = 'menu';
    this.backRealWorldLayoutCatalogList?.();
  },
  openPhoneFromRealWorld() { this.realWorldFunctionOpen = false; this.closeRealWorldPanel(); },

  realWorldFunctionTitle() {
    if (this.realWorldFunctionView === 'layouts' && this.realWorldLayoutCatalogTemplateId) {
      return this.realWorldLayoutCatalogSelected()?.name || '户型预览';
    }
    return { inventory: '背包', wearing: '穿着', map: '电子地图', generation: 'AI生成范围', layouts: '户型介绍' }[this.realWorldFunctionView] || '现实功能';
  },
  realWorldFunctionEyebrow() {
    if (this.realWorldFunctionView === 'layouts' && this.realWorldLayoutCatalogTemplateId) return 'LAYOUT PREVIEW';
    return { inventory: 'INVENTORY', wearing: 'WEARING', map: 'E-MAP', generation: 'AI RANGE', layouts: 'LAYOUT GUIDE' }[this.realWorldFunctionView] || 'REAL WORLD';
  },
  realWorldFunctionHint() {
    if (this.realWorldFunctionView === 'layouts' && this.realWorldLayoutCatalogTemplateId) {
      return String(this.realWorldLayoutCatalogSelected()?.desc || '预置 Canvas 户型示意，AI 解锁地图时可选用。');
    }
    return {
      inventory: '查看玩家本人当前持有或可调用的装备与物品。',
      wearing: '查看内衣、上衣、下衣、鞋子、饰品和装备槽位等当前穿戴。',
      map: '查看当前现实地点树，展开子地点或查看地点说明。',
      generation: '设置现实推演的行动边界、自由发挥或字数要求。',
      layouts: '浏览全部预置户型模板，点击查看 Canvas 布局示意。',
    }[this.realWorldFunctionView] || '选择现实世界中要执行的功能。';
  },

  seedRealWorldLog() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    if (!map.current) return;
    const now = this.phoneDate();
    const entry = {
      id: this.nextId++, type: 'system', locationName: map.current, time: { label: `${this.phoneDateText()} ${this.phoneTimeText()}`, iso: now.toISOString() }, createdAt: now.toISOString(),
      narration: '你把手机屏幕压暗，现实世界的声音重新浮上来。熟悉的空间仍保持着原本的秩序，但那台新手机带来的异常感并没有消失。',
      thinking: '现实世界推演已接入玩家本人资料，只追踪手机外的现实行动。',
    };
    this.assignRealWorldlineEntry(entry);
    this.realWorldLog = [entry];
    window.GameModules.sqliteSave.saveRealWorldLogEntry?.(entry).then(() => this.refreshRealWorldLogPage?.(999999)).catch((err) => console.warn('[现实日志] 初始记录保存失败:', err.message, err.stack));
  },
};


;// ---- real-world-stream-actions.js ----
window.GameModules = window.GameModules || {};
window.GameModules.realWorldStreamActions = {
  updateRealWorldStream(id, raw, options = {}) {
    const entry = (this.realWorldLog || []).find((item) => item.id === id) || window.GameModules.sqliteSave.getRealWorldLogEntry?.(id);
    if (!entry) return false;
    const pick = (key) => this.pickRealWorldStreamField(raw, key);
    const thinking = this.realWorldThinkMode ? (pick('thinking') || '') : '';
    const narration = this.realWorldStreamNarration(raw, pick);
    const streamTrace = this.realWorldStreamTrace(raw, pick);
    const patch = { streaming: true };
    let changed = !entry.streaming;
    if (thinking && thinking !== entry.thinking) { patch.thinking = thinking; changed = true; }
    if (narration && narration !== entry.narration) { patch.narration = narration; changed = true; }
    if (streamTrace.length && JSON.stringify(streamTrace) !== JSON.stringify(entry.streamTrace || [])) { patch.streamTrace = streamTrace; changed = true; }
    if (!changed) return false;
    return this.patchRealWorldLogEntry?.(id, patch, { live: Boolean(options.live) }) || false;
  },

  realWorldStreamNarration(raw = '', pick = () => '') {
    const text = String(raw || '');
    const sep = window.GameModules.realWorldAgentLoop?.finalSeparator || '<!--REAL_WORLD_JSON-->';
    const sepAt = text.indexOf(sep);
    if (sepAt >= 0) return this.formatRealWorldStreamNarration(text.slice(0, sepAt));
    const field = pick('narration');
    if (field) return this.formatRealWorldStreamNarration(field);
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('```')) return '';
    const markerAt = text.indexOf('<!--REAL_WORLD_JSON');
    return this.formatRealWorldStreamNarration(markerAt >= 0 ? text.slice(0, markerAt) : text);
  },

  formatRealWorldStreamNarration(value = '') {
    return window.GameModules.realWorldAi?.formatNarration?.(value, 100) || String(value || '').trim();
  },

  pickRealWorldStreamField(raw = '', key = '') {
    const next = 'type|thinking|reason|narration|sceneTitle|locationName|parentLocationName|locationDescription|status|quest|choices|characters|requests|mapNodes|newLocations|locationDescriptionUpdates|elapsedSeconds|metricUpdates|genericUpdates|lexiconUpdates';
    const text = String(raw || '');
    const loose = text.match(new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)(?:"\\s*,\\s*"(?:${next})"\\s*:|"\\s+"(?:${next})"\\s*:|"\\s*[,}])`));
    if (loose) return loose[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
    const strict = text.match(new RegExp(`"${key}"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)`));
    return strict ? strict[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim() : '';
  },

  realWorldStreamTrace(raw = '', pick = () => '') {
    const type = pick('type');
    const reason = pick('reason');
    const lines = ['步骤进行中｜正在推演'];
    if (type) lines[0] = `步骤进行中｜${this.realWorldTraceType?.(type) || type}`;
    if (reason) lines.push(`原因：${reason}`);
    if (!reason && !type && String(raw || '').trim()) lines.push('正在接收现实 AI 的推演内容。');
    return lines;
  },
};


;// ---- real-world-style-polish.js ----
window.GameModules = window.GameModules || {};

window.GameModules.realWorldStylePolish = {
  async polish(store, result = {}, action = '') {
    const style = String(store.selectedWritingStylePrompt?.() || store.writingStylePrompt?.() || '').trim();
    const narration = String(result.narration || '').trim();
    if (!style || !narration) return result;
    try {
      const prompt = await this.prompt(style, result, action);
      const raw = await window.GameModules.aiRequest.complete({
        source: 'real-world-final-style',
        model: store.modelId,
        prompt,
        timeoutMs: 90000,
        requireDone: true,
        maxAttempts: 2,
        ...(window.GameModules.promptSkills?.completionOptions?.('real-world-final-style-polish') || { jsonMode: true, responseFormat: { type: 'json_object' }, outputLimitKind: 'other' }),
      });
      const data = this.parse(raw);
      if (!data.narration) return result;
      return { ...result, narration: data.narration };
    } catch (err) {
      console.warn('现实推演笔风润色失败:', err.code, err.message, err.stack);
      return result;
    }
  },

  async prompt(style, result, action) {
    const count = (String(result.narration || '').match(/[\u3400-\u9fff]/gu) || []).length;
    return window.GameModules.renderPrompt('real-world-final-style-polish', {
      style,
      action: action || '继续观察现实世界',
      finalJson: JSON.stringify(result),
      minChineseChars: Math.max(200, Math.floor(count * 0.9)),
    });
  },

  parse(raw = '') {
    try {
      const data = window.GameModules.jsonUtils.parseLoose(raw);
      const text = String(data?.narration || '').trim();
      return { narration: text ? window.GameModules.realWorldAi.formatNarration(text, 120) : '' };
    } catch (err) {
      console.warn('现实推演笔风润色解析失败:', err.message, err.stack);
      return { narration: '' };
    }
  },
};


;// ---- real-world-target-updates.js ----
window.GameModules = window.GameModules || {};

window.GameModules.realWorldTargetUpdates = {
  targetKey(item = {}) {
    return String(item.target || item.targetId || item.characterId || item.character || item.name || item.subject?.characterId || item.subject?.id || item.subject?.name || item.owner || item.to || 'player-self').trim() || 'player-self';
  },

  targetState(store, target = 'player-self') {
    return store.itemSkillState?.(target) || (target === 'player-self' ? store.playerIdentityState?.() : null);
  },

  metricUpdateGroups(result = {}) {
    const direct = result.metricUpdates || {};
    const groups = [];
    if ((direct.emotions?.length || 0) || (direct.playerFeelings?.length || 0)) groups.push({ target: direct.target || direct.targetId || 'player-self', updates: direct });
    for (const item of Array.isArray(result.characterMetricUpdates) ? result.characterMetricUpdates : []) {
      if (item?.field && item?.change) continue;
      groups.push({ target: this.targetKey(item), updates: { emotions: item.emotions || [], playerFeelings: item.playerFeelings || [] } });
    }
    return groups;
  },

  normalizeMetricUpdatesForState(updates = {}, metrics = null) {
    return {
      emotions: window.GameModules.ai.normalizeMetricGroup?.(updates.emotions, window.GameModules.metrics.emotionKeys, metrics?.emotions) || [],
      playerFeelings: window.GameModules.ai.normalizeMetricGroup?.(updates.playerFeelings, window.GameModules.metrics.playerKeys, metrics?.playerFeelings) || [],
    };
  },

  async applyMetrics(store, result = {}) {
    const settlement = [];
    const groups = [];
    const groupMap = new Map();
    const addGroup = (group = {}) => {
      const target = String(group.target || 'player-self');
      const state = this.targetState(store, target);
      const key = state?.id ? `state:${state.id}` : `target:${target}`;
      const updates = group.updates || {};
      if (!groupMap.has(key)) {
        const next = { target, updates: { emotions: [], playerFeelings: [] } };
        groupMap.set(key, next);
        groups.push(next);
      }
      const current = groupMap.get(key).updates;
      current.emotions.push(...(Array.isArray(updates.emotions) ? updates.emotions : []));
      current.playerFeelings.push(...(Array.isArray(updates.playerFeelings) ? updates.playerFeelings : []));
    };
    this.metricUpdateGroups(result).forEach((group) => addGroup(group));
    const targets = new Set(groups.map((group) => String(group.target || 'player-self')));
    const targetStateIds = new Set(groups.map((group) => this.targetState(store, group.target)?.id).filter(Boolean));
    const addDecayTarget = (target, state) => {
      const metrics = state?.metrics;
      const hasTemporary = Object.keys(metrics?.temporaryEmotions || {}).length || Object.keys(metrics?.temporaryPlayerFeelings || {}).length;
      if (state?.id && hasTemporary && !targets.has(target) && !targetStateIds.has(state.id)) {
        targets.add(target);
        targetStateIds.add(state.id);
        groups.push({ target, updates: { emotions: [], playerFeelings: [] } });
      }
    };
    addDecayTarget('player-self', store.playerIdentityState?.());
    Object.values(store.rpgStates || {}).forEach((state) => addDecayTarget(state?.id, state));
    for (const group of groups) {
      const state = this.targetState(store, group.target);
      const metrics = state?.id ? store.ensureStateMetrics?.(state) : null;
      const updates = this.normalizeMetricUpdatesForState(group.updates, metrics);
      const fallback = state?.id === 'player-self' ? '' : (store.itemSkillStateLabel?.(state) || state?.id || group.target);
      const title = state?.id ? (store.realWorldSettlementTargetGroup?.(state.id, fallback) || fallback) : (store.realWorldSettlementTargetGroup?.(group.target, group.target) || group.target || '角色');
      settlement.push(...(store.realWorldMetricSettlement?.(state, updates, title) || []));
      if (state?.id) await store.applyMetricUpdatesToState?.(state, updates);
    }
    return settlement;
  },

  groupedLexicon(updates = []) {
    const map = new Map();
    for (const item of Array.isArray(updates) ? updates : []) {
      const key = this.targetKey(item);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return Array.from(map, ([target, items]) => ({ target, items }));
  },

  async applyLexicon(store, updates = []) {
    const settlement = [];
    const generic = [];
    for (const group of this.groupedLexicon(updates)) {
      const state = this.targetState(store, group.target);
      const cardItems = group.items.filter((item) => item?.kind === '角色卡' || item?.kind === '角色技能');
      const inventoryItems = group.items.filter((item) => ['物品', '装备', '穿着'].includes(item?.kind));
      const targetItems = group.items.map((item) => ({ ...item, target: state?.id || group.target }));
      if (state?.id && cardItems.length) {
        const cardChanges = await window.GameModules.characterCardLexicon?.applyToState?.(state, targetItems.filter((item) => item.kind === '角色卡' || item.kind === '角色技能')) || [];
        settlement.push(...(store.realWorldCardChangeSettlement?.(cardChanges.map((item) => ({ ...item, target: state.id }))) || []));
      }
      if (state?.id && inventoryItems.length) await store.applyInventoryUpdatesToState?.(state, targetItems.filter((item) => ['物品', '装备', '穿着'].includes(item.kind)));
      generic.push(...targetItems.filter((item) => !['角色卡', '角色技能', '物品', '装备', '穿着'].includes(item?.kind)));
      if (inventoryItems.length) settlement.push(...(store.realWorldInventorySettlement?.(targetItems.filter((item) => ['物品', '装备', '穿着'].includes(item.kind))) || []));
    }
    const lexiconChanges = await window.GameModules.rpgLexicon.applyLexiconSkill?.(generic) || [];
    settlement.push(...(store.realWorldLexiconSettlement?.(lexiconChanges.length ? lexiconChanges : generic) || []));
    return settlement;
  },
};


;// ---- real-world-thinking-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.realWorldThinkingActions = {
  toggleRealWorldThinking(entry) {
    if (!entry) return;
    const id = String(entry.id || '');
    this.realWorldLog = (this.realWorldLog || []).map((item) => (
      item?.id === id ? { ...item, thinkingOpen: !item.thinkingOpen } : item
    ));
  },

  toggleRealWorldThinkingSection(entry, sectionId) {
    this.toggleRealWorldThinkingStageGroup(entry, sectionId);
  },

  toggleRealWorldThinkingStageGroup(entry, groupId) {
    if (!entry || !groupId) return;
    const id = String(entry.id || '');
    const key = String(groupId);
    this.realWorldLog = (this.realWorldLog || []).map((item) => {
      if (item?.id !== id) return item;
      const groups = this.realWorldThinkingStageGroups(item);
      const index = groups.findIndex((group) => group.id === key);
      const stageOpen = { ...(item.thinkingStageOpen || {}) };
      const currentlyOpen = this.realWorldThinkingStageOpen(item, key, index);
      stageOpen[key] = !currentlyOpen;
      return { ...item, thinkingStageOpen: stageOpen };
    });
  },

  realWorldThinkingStageOpen(entry, groupId, index = 0) {
    const key = String(groupId || '');
    const stageOpen = entry?.thinkingStageOpen && typeof entry.thinkingStageOpen === 'object' ? entry.thinkingStageOpen : {};
    if (Object.prototype.hasOwnProperty.call(stageOpen, key)) return stageOpen[key] !== false;
    if (index < 0) return false;
    const total = this.realWorldThinkingStageGroups(entry).length;
    return total > 0 && index === total - 1;
  },

  realWorldThinkingStageGroupKey(meta = {}) {
    return window.GameModules.realWorldAgentLoop?.reasoningStageGroupKey?.(meta) || String(meta.phase || 'unknown');
  },

  realWorldThinkingStageGroups(entry = {}) {
    const loop = window.GameModules.realWorldAgentLoop;
    const groupMap = new Map();
    const ensureGroup = (meta = {}) => {
      const key = this.realWorldThinkingStageGroupKey(meta);
      const existing = groupMap.get(key) || {
        id: key,
        phase: meta.phase || 'unknown',
        step: Number(meta.step) || 0,
        label: meta.label || '未知阶段',
        reasoningParts: [],
        traceLines: [],
      };
      groupMap.set(key, existing);
      return existing;
    };

    const assigned = loop?.assignReasoningSectionMetas?.(entry?.thinkingSections || [], entry) || [];
    assigned.forEach(({ meta, section }) => {
      const text = String(section?.text || '').trim();
      if (!text) return;
      ensureGroup(meta).reasoningParts.push(text);
    });

    const legacyText = String(entry?.thinking || '').trim();
    if (!assigned.length && legacyText) {
      ensureGroup({ phase: 'unknown', step: 0, label: '现实推演', id: 'legacy-thinking' }).reasoningParts.push(legacyText);
    }

    (Array.isArray(entry?.agentTrace) ? entry.agentTrace : []).forEach((item) => {
      const step = Number(item?.step) || 1;
      const group = ensureGroup({ phase: 'stage1', step, label: `Stage1 - ${step}`, id: `stage1-${step}` });
      group.traceLines.push(...this.realWorldTraceItemLines(item));
    });

    const order = { stage1: 10, stage2: 20, stage3: 30, stage4: 40, stage5: 50, unknown: 90 };
    return [...groupMap.values()]
      .map((group) => ({
        ...group,
        reasoning: group.reasoningParts.join('\n\n').trim(),
        traceText: group.traceLines.map((line, index) => `${index + 1}. ${line}`).join('\n'),
        hasContent: Boolean(group.reasoningParts.length || group.traceLines.length),
      }))
      .filter((group) => group.hasContent)
      .sort((a, b) => (order[a.phase] - order[b.phase]) || (a.step - b.step));
  },

  collapseRealWorldThinking() {
    this.realWorldLog = (this.realWorldLog || []).map((entry) => (entry?.thinkingOpen ? { ...entry, thinkingOpen: false } : entry));
  },

  hasRealWorldThinking(entry) {
    return this.realWorldThinkingStageGroups(entry).length > 0 || Boolean(entry?.streaming);
  },

  realWorldThinkingLines(entry = {}) {
    const groups = this.realWorldThinkingStageGroups(entry);
    return groups.map((group, index) => ({
      id: group.id,
      label: group.label,
      text: [group.reasoning, group.traceText].filter(Boolean).join('\n\n'),
      open: this.realWorldThinkingStageOpen(entry, group.id, index),
    }));
  },

  realWorldSystemTraceLines(entry = {}) {
    return this.realWorldTraceLines(entry).map((text) => ({ label: '系统提示', text }));
  },

  realWorldEntryCacheText(entry = {}) {
    const cache = entry?.deepseekCache || entry?.cacheStats || {};
    const hit = Math.max(0, Math.round(Number(cache.promptCacheHitTokens ?? cache.hitTokens) || 0));
    const miss = Math.max(0, Math.round(Number(cache.promptCacheMissTokens ?? cache.missTokens) || 0));
    const requests = Math.max(0, Math.round(Number(cache.requestCount) || 0));
    if (!hit && !miss && !requests) return '';
    const total = hit + miss;
    if (!total) return `缓存命中：${hit} tokens`;
    const ratio = Math.round((hit / total) * 100);
    return `缓存命中：${hit} / ${total} tokens（${ratio}%）`;
  },

  realWorldEntryPlayerText(entry = {}) {
    if (entry?.type !== 'ai') return '';
    const previousId = String(entry.id || '').replace(/-ai$/, '-user');
    const hasUserEntry = (this.realWorldLog || []).some((item) => item.id === previousId && item.type === 'user');
    return hasUserEntry ? '' : String(entry.playerText || entry.actionText || '').trim();
  },

  normalizeRealWorldLog(log = []) {
    const raw = Array.isArray(log) ? log : [];
    const ids = new Set(raw.map((entry) => String(entry?.id || '')));
    const expanded = raw.flatMap((entry) => {
      const id = String(entry?.id || '');
      const userId = id.replace(/-ai$/, '-user');
      const playerText = String(entry?.playerText || entry?.actionText || '').trim();
      if (entry?.type === 'ai' && /-ai$/u.test(id) && playerText && !ids.has(userId)) {
        return [{ id: userId, type: 'user', text: playerText, time: entry.time, createdAt: entry.createdAt }, entry];
      }
      return [entry];
    });
    return expanded.map((entry, index) => {
      const solidifyCards = Array.isArray(entry?.solidifyCards) ? entry.solidifyCards : [];
      return {
        ...entry,
        id: entry?.id || `real-log-${index}`,
        type: entry?.type || 'ai',
        thinkingOpen: Boolean(entry?.thinkingOpen),
        thinkingStageOpen: entry?.thinkingStageOpen && typeof entry.thinkingStageOpen === 'object' ? { ...entry.thinkingStageOpen } : {},
        cardChangesOpen: Boolean(entry?.cardChangesOpen),
        settlementTab: entry?.settlementTab || '',
        thinkingSections: Array.isArray(entry?.thinkingSections)
          ? entry.thinkingSections.map((item) => {
            const label = String(item?.label || '');
            const parsed = window.GameModules.realWorldAgentLoop?.parseReasoningLabel?.(label);
            return {
              ...item,
              id: String(item?.id || ''),
              phase: String(item?.phase || parsed?.phase || ''),
              step: Number.isFinite(Number(item?.step)) ? Number(item.step) : (parsed?.step || 0),
              label: parsed?.label || label || '现实推演',
              open: item?.open !== false,
            };
          })
          : [],
        characterCardChanges: Array.isArray(entry?.characterCardChanges) ? entry.characterCardChanges : [],
        solidifyCards,
        solidifyUserClosed: Boolean(entry?.solidifyUserClosed),
        solidifyOpen: Boolean(entry?.solidifyOpen),
        solidifySelectedKey: entry?.solidifySelectedKey || this.solidifyKey?.(solidifyCards[0]) || '',
        streamTrace: Array.isArray(entry?.streamTrace) ? entry.streamTrace : [],
        agentTrace: Array.isArray(entry?.agentTrace) ? entry.agentTrace : [],
      };
    }).sort((a, b) => this.realWorldLogSortKey(a).localeCompare(this.realWorldLogSortKey(b)));
  },

  realWorldLogPairSortKey(entry = {}) {
    const id = String(entry.id || '');
    const match = id.match(/^(real-(\d+)-[a-z0-9]+)-(user|ai)$/u);
    if (!match) return '';
    const [, base, ms, kind] = match;
    return `${String(ms).padStart(16, '0')}-${base}-${kind === 'user' ? '0' : '1'}`;
  },

  realWorldLogSortKey(entry = {}) {
    const timeKey = () => {
      const parsed = Date.parse(entry.createdAt || entry.time?.iso || '');
      if (Number.isFinite(parsed)) return String(parsed).padStart(16, '0');
      const label = String(entry.time?.label || '');
      const match = label.match(/(\d{4})年(\d{1,2})月(\d{1,2})日.*?(\d{1,2}):(\d{1,2}):(\d{1,2})/);
      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        const at = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)).getTime();
        if (Number.isFinite(at)) return String(at).padStart(16, '0');
      }
      const idNumber = Number(entry.id);
      if (Number.isFinite(idNumber)) return String(idNumber).padStart(16, '0');
      return `zzzz-${String(entry.id || '')}`;
    };
    if (entry.type === 'system' && entry.narration && !entry.text) return `0000-${timeKey()}-${String(entry.id || '')}`;
    const pairKey = this.realWorldLogPairSortKey(entry);
    if (pairKey) return `1000-${pairKey}`;
    return `1000-${timeKey()}-2-${String(entry.id || '')}`;
  },

  patchRealWorldLogEntry(id, patch = {}, options = {}) {
    const key = String(id || '');
    if (!key) return false;
    let found = false;
    const current = this.realWorldLog || [];
    if (options.live) {
      const entry = current.find((item) => item?.id === key);
      if (!entry) return false;
      Object.assign(entry, patch);
      this.realWorldLog = current.slice();
      return true;
    }
    const patched = current.map((entry) => {
      if (entry?.id !== key) return entry;
      found = true;
      return { ...entry, ...patch };
    });
    if (!found) {
      const saved = window.GameModules.sqliteSave.getRealWorldLogEntry?.(key);
      if (!saved) return false;
      patched.push({ ...saved, ...patch });
    }
    this.realWorldLog = this.normalizeRealWorldLog(patched).slice(-Math.max(1, Number(this.realWorldLogPageSize) || 12));
    return true;
  },

  refreshRealWorldLogPage(page = this.realWorldLogPage || 1) {
    const total = window.GameModules.sqliteSave.countRealWorldLogEntries?.() || 0;
    if (!total) {
      this.realWorldLog = this.normalizeRealWorldLog(this.realWorldLog || []);
      this.realWorldLogTotal = this.realWorldLog.length;
      this.realWorldLogPage = 1;
      return;
    }
    const maxPage = Math.max(1, Math.ceil(total / this.realWorldLogPageSize));
    this.realWorldLogTotal = total;
    this.realWorldLogPage = Math.max(1, Math.min(maxPage, Number(page) || 1));
    let rows = window.GameModules.sqliteSave.listRealWorldLogEntries?.(this.realWorldLogPage, this.realWorldLogPageSize) || [];
    if (rows[0]?.type === 'ai' && this.realWorldLogPage > 1) {
      const prevRows = window.GameModules.sqliteSave.listRealWorldLogEntries?.(this.realWorldLogPage - 1, this.realWorldLogPageSize) || [];
      const prev = prevRows[prevRows.length - 1];
      if (prev?.type === 'user' && rows[0]?.id?.startsWith(String(prev.id || '').replace(/-user$/, '-ai'))) rows = [prev, ...rows];
    }
    const last = rows[rows.length - 1];
    if (last?.type === 'user' && this.realWorldLogPage < maxPage) {
      const nextRows = window.GameModules.sqliteSave.listRealWorldLogEntries?.(this.realWorldLogPage + 1, this.realWorldLogPageSize) || [];
      const next = nextRows[0];
      if (next?.type === 'ai' && next.id?.startsWith(String(last.id || '').replace(/-user$/, '-ai'))) rows = [...rows, next];
    }
    this.realWorldLog = this.normalizeRealWorldLog(rows);
  },

  realWorldLogMaxPage() {
    return Math.max(1, Math.ceil((this.realWorldLogTotal || this.realWorldLog.length || 0) / this.realWorldLogPageSize));
  },

  realWorldLogPageLabel() {
    return `第 ${this.realWorldLogPage || 1} / ${this.realWorldLogMaxPage()} 页，共 ${this.realWorldLogTotal || this.realWorldLog.length} 条`;
  },

  changeRealWorldLogPage(delta) {
    this.refreshRealWorldLogPage((this.realWorldLogPage || 1) + delta);
  },

  scrollRealWorldLogBottom() {
    const run = () => {
      const el = document.querySelector('[data-section-title="现实记录列表"]') || document.querySelector('.real-world-dialog .story-log');
      if (el) el.scrollTop = el.scrollHeight;
    };
    requestAnimationFrame(run);
    setTimeout(run, 60);
  },

  realWorldTraceLines(entry) {
    const stream = Array.isArray(entry?.streamTrace) ? entry.streamTrace : [];
    const trace = Array.isArray(entry?.agentTrace) ? entry.agentTrace : [];
    const fallback = entry?.streaming && !entry?.thinking && !stream.length && !trace.length ? ['步骤进行中｜正在推演', '正在接收现实 AI 的推演内容。'] : [];
    return stream.concat(fallback, trace.flatMap((item) => this.realWorldTraceItemLines(item))).map((line, index) => `${index + 1}. ${line}`);
  },

  realWorldTraceItemLines(item = {}) {
    const head = [`阶段 ${item.step || '?'}｜${this.realWorldTraceType(item.type)}`];
    if (item.reason) head.push(`reason：${item.reason}`);
    const requests = (item.requests || []).map((req) => {
      const params = req.params ? JSON.stringify(req.params) : '{}';
      return `调用：${req.skill || 'unknown'}.${req.method || 'unknown'} ${params}`;
    });
    const loaded = (item.loaded || []).map((ctx) => `载入：${ctx.title}`);
    if (!requests.length && !loaded.length && item.raw) head.push(`返回：${item.raw}`);
    return head.concat(requests, loaded);
  },

  realWorldTraceType(type) {
    if (type === 'request_context') return '请求外部资料';
    if (type === 'context_done') return '资料已足够';
    if (type === 'final') return '生成最终内容';
    if (type === 'parse_failed') return '解析失败';
    return type || '未知步骤';
  },
};


;// ---- real-world-settlement-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.realWorldSettlementActions = {
  realWorldSettlementRecord(field, name, value, reason, group = '', card = null) {
    const fallback = group || this.realWorldSettlementGroup(field, name);
    const inferred = card || this.realWorldSettlementCardForGroup?.(fallback);
    return { at: new Date().toISOString(), group: fallback, cardId: inferred?.id || `legacy:${fallback}`, cardTitle: inferred?.title || fallback, section: inferred?.section || fallback, field, name, value, reason: reason || '本轮正文确认的变化。', applied: true };
  },

  resolveCharacterSettlementCard(store = null, target = '', fallbackName = '') {
    const state = store?.itemSkillState?.(target)
      || window.GameModules.sqliteSave?.getCharacterStateByName?.(String(target || '').trim())
      || null;
    if (!state?.id) {
      const name = String(fallbackName || target || '').trim();
      if (!name) return null;
      return { id: `role:${name}`, title: name, section: '角色卡' };
    }
    const title = store?.itemSkillStateLabel?.(state) || state.profile?.name || state.name || state.id;
    return { id: `role:${state.id}`, title, section: '角色卡' };
  },

  realWorldSettlementRecordForCharacter(field, name, value, reason, store, target = '', fallbackName = '') {
    const card = this.resolveCharacterSettlementCard(store, target, fallbackName);
    const group = card?.title || fallbackName || target || '角色';
    return this.realWorldSettlementRecord(field, name, value, reason, group, card);
  },

  realWorldSettlementCardForGroup(group = '') {
    const text = String(group || '');
    const playerName = this.realWorldPlayerSettlementName?.() || '玩家';
    if (!text || text === playerName || text === '玩家' || text === '玩家本人') return { id: 'role:player-self', title: playerName, section: '角色卡' };
    if (/势力|公司/u.test(text)) return { id: `faction:${text}`, title: text, section: '势力卡' };
    if (/地图|地点/u.test(text)) return { id: 'map:real-world', title: '地图', section: '地图卡' };
    if (/物品|装备|穿着/u.test(text)) return { id: `role:player-self`, title: playerName, section: '角色卡' };
    if (/玩家|角色|生命体征|情绪|感觉|身份|职业|状态/u.test(text)) return { id: `role:${text}`, title: text, section: '角色卡' };
    const state = this.itemSkillState?.(text);
    if (state?.id) return { id: `role:${state.id}`, title: this.itemSkillStateLabel?.(state) || text, section: '角色卡' };
    return { id: `system:${text || 'other'}`, title: text || '其他', section: '系统卡' };
  },

  realWorldPlayerSettlementName() {
    const display = this.playerDisplayCharacter?.();
    const state = this.playerIdentityState?.();
    return display?.name || state?.profile?.name || state?.name || this.playerProfile?.name || this.playerName || '手机主人';
  },

  realWorldSettlementTargetGroup(target = '', fallback = '') {
    const value = String(target || '').trim();
    const player = this.playerIdentityState?.();
    const playerName = this.realWorldPlayerSettlementName();
    if (!value || value === 'player-self' || value === 'player' || value === '玩家' || value === '玩家本人' || value === player?.id || value === this.playerProfile?.name || value === playerName) return playerName;
    const state = this.itemSkillState?.(value);
    if (state?.id) return this.itemSkillStateLabel?.(state) || state.profile?.name || state.name || state.id;
    return fallback && fallback !== '玩家' ? fallback.replace(/^角色[:：]/u, '') : value;
  },

  realWorldSettlementGroup(field = '', name = '') {
    const text = `${field} ${name}`;
    if (/公司|岗位|职级|员工|老板/.test(text)) return '公司';
    if (/势力|社群|社区|家庭|组织|部门/.test(text)) return '势力';
    if (/生命体征|情绪|感觉|玩家|身份|职业|状态|阵营/.test(text)) return '玩家';
    if (/物品|装备|穿着/.test(text)) return '物品';
    return /角色|关系|技能/.test(text) ? '角色' : '其他';
  },

  realWorldSettlementTabs(entry = {}) {
    return this.realWorldSettlementGroups(entry).map((group) => ({ id: group.id, title: group.title, section: group.section, count: group.items.length }));
  },

  activeRealWorldSettlementTab(entry = {}) {
    const tabs = this.realWorldSettlementTabs(entry);
    if (!tabs.length) return '';
    return tabs.some((tab) => tab.id === entry.settlementTab) ? entry.settlementTab : tabs[0].id;
  },

  selectRealWorldSettlementTab(entry, tab = '') {
    if (!entry || !tab) return;
    entry.settlementTab = tab;
    this.realWorldLog = [...(this.realWorldLog || [])];
  },

  realWorldSettlementGroups(entry = {}) {
    return window.GameModules.updateRegistry?.settlementGroups?.(entry, this) || [];
  },

  visibleRealWorldSettlementGroups(entry = {}) {
    const active = this.activeRealWorldSettlementTab(entry);
    return this.realWorldSettlementGroups(entry).filter((group) => group.id === active);
  },

  realWorldMetricSettlement(state, updates = {}, group = '') {
    group = group || this.realWorldSettlementTargetGroup(state?.id || 'player-self', '');
    const metrics = state ? this.ensureStateMetrics(state) : null;
    const card = state?.id ? { id: `role:${state.id}`, title: group, section: '角色卡' } : null;
    const rows = [];
    const add = (field, list, current = {}) => (Array.isArray(list) ? list : []).forEach((item) => {
      const before = Number(current?.[item.key] || 0);
      const decayedBefore = item.temporary ? Math.max(0, window.GameModules.metrics.clamp(before) - 1) : before;
      const rawDelta = window.GameModules.metrics.metricDeltaValue?.(item) ?? item.delta;
      const isFeeling = field === '感觉' || field === '临时感觉';
      const delta = isFeeling && !item.temporary ? window.GameModules.metrics.lockedPlayerDelta(item.key, window.GameModules.metrics.clampDelta(rawDelta), decayedBefore) : window.GameModules.metrics.clampDelta(rawDelta);
      const after = Math.max(0, Math.min(100, decayedBefore + delta));
      rows.push(this.realWorldSettlementRecord(field, item.key, `${decayedBefore} → ${after}（${window.GameModules.updateRegistry.normalizeSettlementText(window.GameModules.metrics.cleanMetricStatus(item.status || '状态更新'))}）`, window.GameModules.updateRegistry.normalizeSettlementText(window.GameModules.metrics.cleanMetricReason(item.reason, item.key)), group, card));
    });
    add('情绪', (updates.emotions || []).filter((item) => !item?.temporary), metrics?.emotions);
    add('感觉', (updates.playerFeelings || []).filter((item) => !item?.temporary), metrics?.playerFeelings);
    add('临时情绪', (updates.emotions || []).filter((item) => item?.temporary), metrics?.temporaryEmotions);
    add('临时感觉', (updates.playerFeelings || []).filter((item) => item?.temporary), metrics?.temporaryPlayerFeelings);
    return rows;
  },

  realWorldVitalSettlement(state, updates = []) {
    const labels = { vitality: '生命力', stamina_pool: '精力', satiety: '饱食度', hydration: '水分', fatigue: '疲劳', mental_stability: '精神稳定' };
    const values = state?.values || {};
    const group = this.realWorldSettlementTargetGroup(state?.id || 'player-self', '');
    return (Array.isArray(updates) ? updates : []).map((item) => {
      const pool = values[item.key];
      const before = pool?.max ? window.GameModules.progression.percent(pool) : null;
      const afterValue = before === null ? null : Math.max(0, Math.min(100, before + (Number(item.delta) || 0)));
      const after = afterValue === null ? '' : `：${before} → ${afterValue}%`;
      return {
        ...this.realWorldSettlementRecord('生命体征', labels[item.key] || item.key, `变化${Number(item.delta) || 0}${after}`, item.reason, group),
        detailLines: [before === null ? '' : `前后：${before}% → ${afterValue}%`].filter(Boolean),
      };
    });
  },

  realWorldCardChangeSettlement(changes = []) {
    return (Array.isArray(changes) ? changes : []).map((item) => this.realWorldSettlementRecord(`身份/${item.field || '角色卡'}`, item.name || item.field, typeof item.value === 'object' ? JSON.stringify(item.value) : item.value, item.reason, this.realWorldSettlementTargetGroup(item.target || item.targetId || item.characterId, '')));
  },

  realWorldLexiconSettlement(changes = []) {
    return (Array.isArray(changes) ? changes : []).map((item) => this.realWorldSettlementRecord(item.kind || '词条', item.name || item.term || item.field, item.value ?? item.definition ?? item.description ?? item.summary, item.meta?.modifyReason || item.reason || item.changeMode, this.realWorldSettlementTargetGroup(item.target || item.targetId || item.characterId, this.realWorldSettlementGroup(item.kind, item.name || item.term))));
  },

  realWorldInventorySettlement(updates = []) {
    return (Array.isArray(updates) ? updates : []).filter((item) => ['物品', '装备', '穿着'].includes(item?.kind)).map((item) => this.realWorldSettlementRecord(item.kind, item.name || item.value?.name, item.value?.description || item.description || item.summary || item.value, item.reason || item.changeMode, this.realWorldSettlementTargetGroup(item.target || item.owner || item.characterId, '物品')));
  },

  realWorldItemActionSettlement(results = []) {
    return (Array.isArray(results) ? results : []).filter(Boolean).map((item) => this.realWorldSettlementRecord('物品动作', item.name || item.itemName || item.item?.name || item.action || '物品变化', item.summary || item.description || item.result || item.status || item.message || (item.ok === false ? '未执行，仅记录' : '已处理'), item.reason || (item.ok === false ? '未知物品动作未执行。' : ''), this.realWorldSettlementTargetGroup(item.target || item.owner || item.characterId, '物品')));
  },

  realWorldFactionSettlement(updates = []) {
    return (Array.isArray(updates) ? updates : []).map((item) => {
      const name = item.factionName || item.name || item.action || item.location || '势力变化';
      const group = /公司|岗位|职级|员工|老板/.test(`${name || ''} ${item.action || ''}`) ? '公司' : '势力';
      const value = item.position || item.status || item.value || item.action || item.timeEvent || item.room || item.location || item.type || '已记录';
      const reason = item.reason || item.timeEvent || item.description || item.summary || '现实推演确认势力或地点结构变化。';
      return this.realWorldSettlementRecord(group, name, value, reason, group);
    });
  },

  async applyRealWorldVitalUpdates(state, updates = []) {
    if (!state?.values || !Array.isArray(updates)) return;
    const values = state.values;
    window.GameModules.progression.ensureStateMechanics(state, state.profile || {});
    values.vital_update_notes = values.vital_update_notes || {};
    const apply = (key, delta) => {
      const pool = values[key];
      if (!pool?.max) return null;
      const before = window.GameModules.progression.percent(pool);
      window.GameModules.progression.deltaPool(pool, delta);
      return { before, after: window.GameModules.progression.percent(pool) };
    };
    for (const item of updates) {
      const key = String(item?.key || '');
      if (!['vitality', 'stamina_pool', 'satiety', 'hydration', 'fatigue', 'mental_stability'].includes(key)) continue;
      const changed = apply(key, Number(item.delta) || 0);
      if (!changed) continue;
      values.vital_update_notes[key] = { ...changed, delta: Math.round(Number(item.delta) || 0), reason: String(item.reason || '').slice(0, 120), at: this.phoneDate().toISOString() };
    }
    values.health = window.GameModules.progression.percent(values.vitality);
    values.stamina = window.GameModules.progression.percent(values.stamina_pool);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    await window.GameModules.sqliteSave.saveCharacterState(state);
  },
};


;// ---- real-world-utility-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.realWorldUtilityActions = {
  async assignRealWorldlineEntry(entry) {
    this.realWorldlineState = this.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    const event = { eventId: `real_${entry.id}`, name: entry.sceneTitle || entry.locationName || this.realWorldSceneTitle || '现实事件', time: entry.time?.label || '', detail: String(entry.narration || entry.thinking || entry.text || ''), status: entry.streaming ? '记录中' : '已记录' };
    this.realWorldlineState.events = [...(this.realWorldlineState.events || []).filter((item) => item.eventId !== event.eventId), event].slice(-40);
    const assigned = window.GameModules.worldlinePlots.assign(this, this.realWorldlineState, event, '现实情节');
    entry.plotId = event.plotId;
    await assigned;
  },

  realWorldMemoryTargetState(value = '') {
    const key = String(value || '').trim();
    if (!key) return null;
    return this.rpgStates?.[key]
      || Object.values(this.rpgStates || {}).find((state) => state?.id === key || state?.name === key || state?.profile?.name === key)
      || this.itemSkillState?.(key)
      || null;
  },

  realWorldMemoryTargetIds(result = {}) {
    const ids = new Set(['player-self']);
    const add = (value) => {
      const state = this.realWorldMemoryTargetState(value);
      if (state?.id) ids.add(String(state.id));
    };
    const shared = this.sharedControlState?.();
    if (shared?.id) ids.add(String(shared.id));
    [result.appearedCharacters, result.solidifiableCharacters].forEach((list) => (Array.isArray(list) ? list : []).forEach((item) => add(item?.id || item?.characterId || item?.name || item)));
    (Array.isArray(result.genericUpdates) ? result.genericUpdates : []).forEach((item) => add(item?.subject?.id || item?.subject?.name || item?.target || item?.characterId));
    (Array.isArray(result.vitalUpdates) ? result.vitalUpdates : []).forEach((item) => add(item?.target || item?.subject?.id || item?.subject?.name));
    (Array.isArray(result.itemActions) ? result.itemActions : []).forEach((item) => [item?.target, item?.owner, item?.characterId, item?.from, item?.to].forEach(add));
    return [...ids];
  },

  realWorldMemoryTextFor(targetId, action, result = {}) {
    const base = [`现实行动：${action}`, `发生：${result.narration || ''}`, result.thinking ? `推演：${result.thinking}` : '', `目标：${result.quest || this.realWorldQuest}`].filter(Boolean).join('\n');
    if (targetId === 'player-self') return base;
    const state = this.realWorldMemoryTargetState(targetId) || {};
    const name = state.profile?.name || state.name || targetId;
    return [`现实推演相关记忆：${name}参与或目睹了本次现实事件。`, base].join('\n');
  },

  async recordRealWorldMemory(action, result) {
    const store = { ...this, sceneTitle: result.sceneTitle || this.realWorldSceneTitle, entryTime: null, entryTimeLabel: () => `${this.phoneDateText()} ${this.phoneTimeText()}` };
    for (const targetId of this.realWorldMemoryTargetIds(result)) {
      const text = this.realWorldMemoryTextFor(targetId, action, result);
      const memory = window.GameModules.characterMemory.ensure(targetId);
      const item = window.GameModules.characterMemory.memoryItem(store, { text, source: 'real-world', impression: targetId === 'player-self' ? 55 : 48 });
      memory.shortTerm.recent.push(item);
      window.GameModules.characterMemory.promote(memory, item);
      await window.GameModules.characterMemory.compact(targetId, memory);
    }
  },

  async recordPlayerRealWorldMemory(action, result) {
    return await this.recordRealWorldMemory(action, result);
  },

  realWorldWordCountValue() {
    return Math.floor(Number(this.realWorldWordCount) || 0);
  },

  realWorldWordCountValid() {
    return this.realWorldFreedomMode !== 'words' || this.realWorldWordCountValue() >= 200;
  },

  validateRealWorldFreedom() {
    if (this.realWorldWordCountValid()) return true;
    window.dzmm?.toast?.error?.('要求字数最少 200') || console.warn('要求字数最少 200');
    return false;
  },

  realWorldFreedomRule() {
    const mode = this.realWorldFreedomMode || 'scope';
    if (mode === 'free') return '推演自由度：AI自由发挥。final 不受玩家本次行动边界约束，不设置字数上限，narration 不得少于 300 个汉字；AI 应根据当前已知场景、时间、地点、人物状态、现实因果、生命体征和已载入资料，尽可能输出其能够合理推演的最大内容量。允许连续推进环境变化、他人反应、事件连锁、阶段性结果和后续影响，直到当前场景在逻辑上达到可停顿的最大推演点；但不得无依据篡改已知设定、无中生有关键旧事实或违背现实因果。';
    if (mode === 'words') return `推演自由度：要求字数。final 的 narration 不得少于 ${Math.max(200, this.realWorldWordCountValue())} 个汉字；这是提示词层面的生成要求，不要追加额外文本处理阶段。仍需遵守本次行动边界和现实因果，必须把行动过程、环境、身体状态影响、人物反应和直接结果写充分。`;
    return '推演自由度：行动范围内。只推演玩家本次输入行动自然抵达的过程和直接结果，不替玩家继续追问、离开、处理后续长期事务或完成未输入的下一步行动；不设置字数上限，narration 不得少于 300 个汉字。必须在该行动范围内尽可能充分推演，包括玩家动作过程、身体感受、周围环境变化、可见细节、他人反应、对话回应、短期连锁影响和结果落点。narration 不要写成简略总结。';
  },

  realWorldNarrationHint() {
    if (this.realWorldFreedomMode === 'words') return `以第二人称续写现实世界中的行动过程和直接结果，不少于 ${Math.max(200, this.realWorldWordCountValue())} 个汉字，现实、克制、细节充分，并体现具体动作、环境变化、他人反应和生命体征影响`;
    if (this.realWorldFreedomMode === 'free') return '以第二人称续写现实世界中的行动过程、场景连锁和阶段性结果，不少于300字且不设字数上限，按当前场景和已载入资料尽可能输出可合理推演的最大内容量，连续呈现具体动作、环境变化、他人反应、事件连锁、后续影响和生命体征影响';
    return '以第二人称续写现实世界中的行动过程和直接结果，不少于300字且不设字数上限，在行动范围内充分描写动作过程、周围情况、别人反应、短期影响和生命体征影响';
  },

  async copyRealWorldPlayerText(text = '') {
    const value = String(text || '').trim();
    if (!value) return;
    const current = String(this.realWorldInput || '').trimEnd();
    this.realWorldInput = current ? `${current} ${value}` : value;
    window.dzmm?.toast?.success?.('已追加到输入框') || console.info('已追加到输入框');
  },

  openRealWorldPrompt(id) {
    const entry = this.realWorldLog.find((item) => item.id === id);
    if (!entry?.promptPack) return;
    this.promptDialogEntry = entry;
    this.promptDialogTab = 'system';
    this.promptDialogOpen = true;
  },
};


;// ---- real-world-actions.js ----
/**
 * 手机时间与现实世界推演界面。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldActions = {
  realWorldActionText(value) {
    if (value && typeof value === 'object') return String(window.GameModules.ai?.choiceText?.(value) || '').trim();
    return String(value || '').trim();
  },

  async submitRealWorldAction(action = '') {
    if (!this.isRealCurrentWorld?.()) {
      const text = this.realWorldActionText(action) || this.realWorldActionText(this.realWorldInput);
      if (text) {
        this.realWorldInput = '';
        return this.submitAction?.(text);
      }
      return this.routeCurrentWorldAction?.();
    }
    const rawText = this.realWorldActionText(action) || this.realWorldActionText(this.realWorldInput);
    const text = this.realWorldActionWithMatter?.(rawText) || rawText;
    if (!rawText || this.realWorldBusy || !this.validateRealWorldFreedom?.()) return;
    this.realWorldInput = '';
    this.realWorldBusy = true;
    const start = this.phoneDate();
    const startMs = start.getTime();
    const baseId = `real-${startMs}-${Math.random().toString(36).slice(2, 8)}`;
    const startTime = { label: `${this.phoneDateText()} ${this.phoneTimeText()}`, iso: start.toISOString() };
    const responseCreatedAt = new Date(startMs + 1).toISOString();
    const savedTotalBeforeAppend = window.GameModules.sqliteSave.countRealWorldLogEntries?.() || this.realWorldLogTotal || 0;
    if (savedTotalBeforeAppend > 0) this.refreshRealWorldLogPage?.(Math.max(1, Math.ceil(savedTotalBeforeAppend / (Number(this.realWorldLogPageSize) || 12))));
    const userEntry = { id: `${baseId}-user`, type: 'user', text: rawText, matter: this.activeRealWorldMatter?.() || null, time: startTime, createdAt: start.toISOString() };
    const entry = { id: `${baseId}-ai`, type: 'ai', narration: '现实世界正在推演…', thinking: '', streaming: true, playerText: rawText, actionText: text, time: startTime, createdAt: responseCreatedAt };
    entry.promptPack = { systemPrompt: '现实世界 Loop Agent 将按步骤动态载入上下文。', userPrompt: text, model: this.modelId, promptTokens: 0 };
    this.realWorldLog = this.normalizeRealWorldLog([...(this.realWorldLog || []), userEntry, entry]).slice(-Math.max(1, Number(this.realWorldLogPageSize) || 12));
    this.realWorldLogTotal = Math.max(this.realWorldLogTotal || 0, window.GameModules.sqliteSave.countRealWorldLogEntries?.() || 0) + 2;
    this.realWorldLogPage = this.realWorldLogMaxPage?.() || this.realWorldLogPage || 1;
    this.scrollRealWorldLogBottom?.();
    try {
      await window.GameModules.sqliteSave.saveRealWorldLogEntry?.(userEntry);
      await window.GameModules.sqliteSave.saveRealWorldLogEntry?.(entry);
      const savedTotal = window.GameModules.sqliteSave.countRealWorldLogEntries?.() || this.realWorldLogTotal;
      this.realWorldLogTotal = savedTotal;
      this.realWorldLogPage = this.realWorldLogMaxPage?.() || this.realWorldLogPage || 1;
      this.scrollRealWorldLogBottom?.();
      const result = await window.GameModules.realWorldAi.generate(this, '', text, entry.id);
      if (result.promptPack) entry.promptPack = result.promptPack;
      const currentUserEntry = window.GameModules.sqliteSave.getRealWorldLogEntry?.(userEntry.id) || userEntry;
      await this.applyRealWorldResult(entry.id, { ...result, playerEntry: currentUserEntry });
      window.GameModules.factionArchive?.recordRealWorld?.(this, text, result);
      await this.recordPlayerRealWorldMemory(text, result);
      await this.save();
    } catch (err) {
      console.error('现实推演请求失败:', err.code, err.message, err.stack);
      await this.markRealWorldActionFailed(entry.id);
    } finally {
      this.realWorldBusy = false;
    }
  },

  async markRealWorldActionFailed(id) {
    await window.GameModules.sqliteSave.deleteRealWorldLogEntry?.(id);
    this.realWorldLogTotal = Math.max(0, (this.realWorldLogTotal || 1) - 1);
    this.realWorldLog = (this.realWorldLog || []).map((entry) => (entry.id === id ? { ...entry, narration: 'AI请求失败，请重试', thinking: '', streaming: false, transientError: true, characterCardChanges: [], agentTrace: [] } : entry));
    this.scrollRealWorldLogBottom?.();
  },

  async applyRealWorldResult(id, result) {
    result = window.GameModules.updateRegistry?.migrateLegacyFactionUpdates?.(result) || result;
    if (!result._genericUpdatesNormalized) {
      result = {
        ...result,
        genericUpdates: window.GameModules.updateRegistry?.normalizeUpdates?.(result, this) || result.genericUpdates || [],
        _genericUpdatesNormalized: true,
      };
    }
    const legacyResult = window.GameModules.updateRegistry?.expandGenericForLegacy?.(result, this) || result;
    const state = this.playerIdentityState?.();
    const settlement = [];
    settlement.push(...await window.GameModules.realWorldTargetUpdates.applyMetrics(this, legacyResult));
    settlement.push(...await window.GameModules.realWorldTargetUpdates.applyLexicon(this, legacyResult.lexiconUpdates || []));
    result.solidifyCards = await this.collectSolidifiableCharacters?.(result, 'real') || [];
    await this.syncNarrationWearing?.(result);
    result.solidifyOpen = false;
    result.solidifySelectedKey = this.solidifyKey?.(result.solidifyCards[0]) || '';
    result.itemActionResults = await this.applyRealWorldItemActions?.(legacyResult.itemActions || []) || [];
    settlement.push(...this.realWorldItemActionSettlement(result.itemActionResults));
    const elapsedSeconds = window.GameModules.ai.clampElapsed?.(result.elapsedSeconds, 300) || 300;
    result.elapsedSeconds = elapsedSeconds;
    const allVitalUpdates = Array.isArray(legacyResult.vitalUpdates) ? legacyResult.vitalUpdates : [];
    const playerTarget = state?.id || 'player-self';
    result.vitalUpdates = window.GameModules.realWorldVitals.normalize(allVitalUpdates, elapsedSeconds, result.narration || '', playerTarget, true);
    settlement.push(...this.realWorldVitalSettlement(state, result.vitalUpdates));
    await this.applyRealWorldVitalUpdates(state, result.vitalUpdates);
    const vitalTargets = [...new Set(allVitalUpdates.map((item) => String(item?.target || item?.subject?.id || '').trim()).filter((target) => target && target !== playerTarget && target !== 'player-self'))];
    for (const target of vitalTargets) {
      const targetState = this.itemSkillState?.(target);
      const targetUpdates = window.GameModules.realWorldVitals.normalize(allVitalUpdates, elapsedSeconds, result.narration || '', target, false);
      if (!targetState || !targetUpdates.length) continue;
      settlement.push(...this.realWorldVitalSettlement(targetState, targetUpdates));
      await this.applyRealWorldVitalUpdates(targetState, targetUpdates);
    }
    settlement.push(...this.realWorldFactionSettlement(
      window.GameModules.updateRegistry?.orgNamesFromGenericUpdates?.(result.genericUpdates, this)?.map((name) => ({ factionName: name, action: 'generic' })) || [],
    ));
    const orgTerritoryTypes = new Set(['territory-control', 'org-structure-node', 'org-capability-entry', 'org-capability', 'membership', 'org-status', 'faction-structure', 'faction-overview']);
    const orgTerritoryUpdates = (result.genericUpdates || []).filter((item) => orgTerritoryTypes.has(item?.updateType));
    const legacyHandled = new Set(['vital', 'emotion', 'feeling', 'item', 'faction-structure', 'faction-overview', 'territory-control', 'org-structure-node', 'org-capability-entry', 'org-capability', 'membership', 'org-status']);
    if (orgTerritoryUpdates.length) {
      const orgLines = window.GameModules.orgTerritoryActions?.applySettlementUpdates?.(this, orgTerritoryUpdates) || [];
      orgLines.forEach((line) => { if (line) settlement.push(line); });
    }
    const remainingGeneric = (result.genericUpdates || []).filter((item) => !legacyHandled.has(item?.updateType));
    await window.GameModules.updateRegistry?.applyGeneric?.(this, remainingGeneric);
    settlement.push(...(await window.GameModules.realWorldProfileStage5?.applyPatches?.(this, result.profilePatches || []) || []));
    const initApplied = await window.GameModules.initPromptRegistry?.apply?.(this, result.initUpdates || []) || [];
    if (initApplied.length) settlement.push(`初始化：已写入${initApplied.length}条初始化记录。`);
    delete result.characterMetricUpdates;
    result.characterCardChanges = settlement;
    const startedAt = this.phoneDate().toISOString();
    this.advancePhoneTime(elapsedSeconds);
    await this.applyWechatActions?.(result.wechatActions || []);
    const longingEvents = await this.settleRealWorldLongingMeters?.(elapsedSeconds, new Date(startedAt).getTime(), this.phoneDate().getTime()) || [];
    if (longingEvents.length) settlement.push(`角色思念：${longingEvents.length}次思念事件等待下次现实推演体现。`);
    this.clearPreparedRealWorldLongingEvents?.();
    this.refreshRealWorldMatterStatus?.();
    this.checkWorkReminder?.();
    window.GameModules.realWorldMap.update(this, result.locationName || this.realWorldLocationName, result);
    const fogResult = await window.GameModules.realWorldMapFog?.afterLocationUpdate?.(this, result) || {};
    if (fogResult.unlocked?.length) settlement.push(`地图解锁：${fogResult.unlocked.join('、')}`);
    this.ensureControlRoleLocation?.(state, '现实推演后更新玩家当前位置。');
    if (state?.values?.current_location) state.values.current_location.name = this.realWorldLocationName || result.locationName || state.values.current_location.name;
    const shared = this.sharedControlState?.();
    if (shared) {
      this.ensureControlRoleLocation?.(shared, '共享感官现实推演后同步位置。');
      shared.values.current_location = { ...(shared.values.current_location || {}), name: this.realWorldLocationName || result.locationName || '现实当前位置', worldTag: window.GameModules.realWorld2026?.label || '2026 现代都市现实世界', updatedAt: this.phoneDateText?.() || '', reason: '共享感官控制中与玩家同处现实推演位置。' };
      await window.GameModules.sqliteSave.saveCharacterState?.(shared);
    }
    if (state) await window.GameModules.sqliteSave.saveCharacterState?.(state);
    await this.refreshControlLinkStates?.();
    this.realWorldSceneTitle = result.sceneTitle || this.realWorldSceneTitle;
    this.realWorldQuest = result.quest || this.realWorldQuest;
    this.realWorldStatus = result.status || this.realWorldStatus;
    this.realWorldChoices = result.choices || this.realWorldChoices;
    const time = { label: `${this.phoneDateText()} ${this.phoneTimeText()}`, iso: this.phoneDate().toISOString(), startedAt, elapsedSeconds };
    const { playerEntry, ...cleanResult } = result;
    const existingEntry = this.realWorldLog.find((entry) => entry.id === id) || {};
    const nextThinkingSections = Array.isArray(cleanResult.thinkingSections) && cleanResult.thinkingSections.length ? cleanResult.thinkingSections : (existingEntry.thinkingSections || []);
    const nextThinking = String(cleanResult.thinking || '').trim() || String(existingEntry.thinking || '').trim();
    const next = { ...existingEntry, ...cleanResult, thinking: nextThinking, thinkingSections: nextThinkingSections, type: 'ai', streaming: false, statusText: '', streamTrace: [], time, agentTrace: result.agentTrace || [] };
    await this.assignRealWorldlineEntry(next);
    if (playerEntry?.id) await window.GameModules.sqliteSave.saveRealWorldLogEntry?.(playerEntry);
    await window.GameModules.sqliteSave.saveRealWorldLogEntry?.(next);
    this.realWorldLog = this.normalizeRealWorldLog([...this.realWorldLog.filter((entry) => entry.id !== playerEntry?.id && entry.id !== id), ...(playerEntry?.id ? [playerEntry] : []), next]);
    this.realWorldLogTotal = window.GameModules.sqliteSave.countRealWorldLogEntries?.() || this.realWorldLogTotal;
    this.refreshRealWorldLogPage?.(this.realWorldLogMaxPage?.() || this.realWorldLogPage || 1);
    this.scrollRealWorldLogBottom?.();
  },
};


;// ---- real-world-map-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.realWorldMapActions = {
  ensureMapView(map = {}) {
    if (!map.view || typeof map.view !== 'object') {
      map.view = { x: 0, y: 0, scale: 1 };
    }
    return map.view;
  },

  realWorldMapGraph() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    return window.GameModules.realWorldMapGraph.build(map);
  },

  realWorldMapGraphSignature() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const graph = window.GameModules.realWorldMapGraph.build(map);
    return `${map.currentId}|${map.mapAnchorId || ''}|${(map.revealedIds || []).join(',')}|${graph.nodes.map((node) => `${node.id}:${node.x}:${node.y}:${node.current}:${node.visited}`).join(';')}`;
  },

  renderRealWorldMapGraph() {
    const stage = document.querySelector('.real-world-map-stage');
    if (!stage || this.realWorldFunctionView !== 'map') return;
    const signature = this.realWorldMapGraphSignature();
    if (stage.dataset.signature === signature) return;
    stage.dataset.signature = signature;

    const graph = this.realWorldMapGraph();
    const ns = 'http://www.w3.org/2000/svg';
    stage.replaceChildren();

    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'real-world-map-svg');
    svg.setAttribute('viewBox', `0 0 ${graph.width} ${graph.height}`);
    svg.setAttribute('width', String(graph.width));
    svg.setAttribute('height', String(graph.height));

    const defs = document.createElementNS(ns, 'defs');
    const gradient = document.createElementNS(ns, 'linearGradient');
    gradient.setAttribute('id', 'realWorldMapEdge');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '100%');
    ['0%', '100%'].forEach((offset, index) => {
      const stop = document.createElementNS(ns, 'stop');
      stop.setAttribute('offset', offset);
      stop.setAttribute('stop-color', index ? 'rgba(116,246,255,0.18)' : 'rgba(116,246,255,0.55)');
      gradient.appendChild(stop);
    });
    defs.appendChild(gradient);
    svg.appendChild(defs);

    graph.edges.forEach((edge) => {
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('class', 'real-world-map-edge');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'url(#realWorldMapEdge)');
      path.setAttribute('stroke-width', '2');
      const mid = (edge.y1 + edge.y2) / 2;
      path.setAttribute('d', `M ${edge.x1} ${edge.y1} C ${edge.x1} ${mid}, ${edge.x2} ${mid}, ${edge.x2} ${edge.y2}`);
      svg.appendChild(path);
    });
    stage.appendChild(svg);

    const layer = document.createElement('div');
    layer.className = 'real-world-map-nodes-layer';
    graph.nodes.forEach((node) => {
      const card = document.createElement('article');
      const fogClass = node.visited ? '' : ' fog-tile';
      card.className = `real-world-map-node-card${node.current ? ' current' : ''}${fogClass}`;
      card.style.width = `${node.w}px`;
      card.style.height = `${node.h}px`;
      card.style.transform = `translate(${node.x}px, ${node.y}px)`;

      const label = document.createElement('p');
      label.className = 'real-world-map-node-label';
      label.textContent = node.name;
      card.appendChild(label);

      const controlLine = this.realWorldMapNodeControlLine(node.id);
      if (controlLine) {
        const control = document.createElement('small');
        control.className = 'real-world-map-node-control';
        control.textContent = controlLine;
        card.appendChild(control);
      }

      const info = document.createElement('button');
      info.type = 'button';
      info.className = 'real-world-map-node-info-btn';
      info.textContent = '说明';
      info.addEventListener('click', (event) => {
        event.stopPropagation();
        this.showRealWorldMapInfo(node.id);
      });

      card.addEventListener('click', () => this.showRealWorldMapInterior(node.id));
      card.appendChild(info);
      layer.appendChild(card);
    });
    stage.appendChild(layer);
  },

  realWorldMapViewBox() {
    const graph = this.realWorldMapGraph();
    return `0 0 ${graph.width} ${graph.height}`;
  },

  realWorldMapStageStyle() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const view = this.ensureMapView(map);
    return `transform: translate(${view.x}px, ${view.y}px) scale(${view.scale}); transform-origin: 0 0;`;
  },

  realWorldMapRows() {
    return window.GameModules.realWorldMap.visibleNodes(window.GameModules.realWorldMap.ensure(this, this.playerProfile || {}));
  },

  resetRealWorldMapView() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    map.view = { x: 0, y: 0, scale: 1 };
    const stage = document.querySelector('.real-world-map-stage');
    if (stage) delete stage.dataset.signature;
    this.fitRealWorldMapView();
    this.renderRealWorldMapGraph();
  },

  fitRealWorldMapView() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const view = this.ensureMapView(map);
    const graph = window.GameModules.realWorldMapGraph.build(map);
    const viewport = this._realWorldMapViewportSize();
    if (!viewport.width || !viewport.height) return;
    const scaleX = (viewport.width - 24) / Math.max(graph.width, 1);
    const scaleY = (viewport.height - 24) / Math.max(graph.height, 1);
    view.scale = Math.min(1.2, Math.max(0.45, Math.min(scaleX, scaleY)));
    view.x = (viewport.width - graph.width * view.scale) / 2;
    view.y = Math.max(12, (viewport.height - graph.height * view.scale) / 2);
  },

  _realWorldMapViewportSize() {
    const el = document.querySelector('.real-world-map-viewport');
    if (!el) return { width: 640, height: 420 };
    return { width: el.clientWidth || 640, height: el.clientHeight || 420 };
  },

  realWorldMapWheel(event) {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const view = this.ensureMapView(map);
    const factor = event.deltaY > 0 ? 0.92 : 1.08;
    const next = Math.min(2.4, Math.max(0.35, view.scale * factor));
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const ratio = next / view.scale;
    view.x = px - (px - view.x) * ratio;
    view.y = py - (py - view.y) * ratio;
    view.scale = next;
  },

  realWorldMapZoomBy(delta) {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const view = this.ensureMapView(map);
    const viewport = this._realWorldMapViewportSize();
    const cx = viewport.width / 2;
    const cy = viewport.height / 2;
    const next = Math.min(2.4, Math.max(0.35, view.scale * delta));
    const ratio = next / view.scale;
    view.x = cx - (cx - view.x) * ratio;
    view.y = cy - (cy - view.y) * ratio;
    view.scale = next;
  },

  realWorldMapPanStart(event) {
    if (event.button !== 0 || event.target.closest('.real-world-map-node-card')) return;
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const view = this.ensureMapView(map);
    this._realWorldMapPan = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origX: view.x,
      origY: view.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  },

  realWorldMapPanMove(event) {
    const pan = this._realWorldMapPan;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const view = this.ensureMapView(map);
    view.x = pan.origX + (event.clientX - pan.startX);
    view.y = pan.origY + (event.clientY - pan.startY);
  },

  realWorldMapPanEnd(event) {
    const pan = this._realWorldMapPan;
    if (!pan || (event && pan.pointerId !== event.pointerId)) return;
    this._realWorldMapPan = null;
  },

  openRealWorldMapGraph() {
    this.openRealWorldFunctionPanel?.('map');
    requestAnimationFrame(() => this.fitRealWorldMapView());
  },

  toggleRealWorldMapNode(id) {
    window.GameModules.realWorldMap.toggle(this, id);
  },

  showRealWorldMapInfo(id) {
    window.GameModules.realWorldMap.showInfo(this, id);
  },

  closeRealWorldMapInfo() {
    window.GameModules.realWorldMap.closeInfo(this);
  },

  showRealWorldMapInterior(id) {
    window.GameModules.realWorldMap.showInterior(this, id);
    this.realWorldMap = { ...this.realWorldMap };
  },

  closeRealWorldMapInterior() {
    window.GameModules.realWorldMap.closeInterior(this);
    this.realWorldMap = { ...this.realWorldMap };
  },

  toggleRealWorldMapInteriorFloor(floorId) {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    if (!map.interiorFloorOpen || typeof map.interiorFloorOpen !== 'object') map.interiorFloorOpen = {};
    const key = String(floorId || '');
    map.interiorFloorOpen[key] = !map.interiorFloorOpen[key];
    this.realWorldMap = { ...map };
  },

  realWorldMapInteriorFloorOpen(floorId) {
    const map = this.realWorldMap || {};
    const key = String(floorId || '');
    if (!map.interiorFloorOpen || typeof map.interiorFloorOpen !== 'object') return true;
    return map.interiorFloorOpen[key] !== false;
  },

  realWorldMapRoomResidentsLabel(room = {}) {
    const text = String(room?.residentsText || '').trim();
    return text ? `居住人：${text}` : '居住人：—';
  },

  openRealWorldMapRoom(roomId) {
    const { room } = window.GameModules.realWorldMapInterior.findRoom(this.realWorldMapInteriorFloors(), roomId);
    if (!room?.hasLayout && !room?.layout) return;
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    map.interiorRoomId = String(roomId || '');
    this.realWorldMap = { ...map };
    requestAnimationFrame(() => this.renderRealWorldMapRoomCanvas());
  },

  realWorldMapInteriorNode() {
    return window.GameModules.realWorldMap.interiorNode(this.realWorldMap);
  },

  realWorldMapInteriorView() {
    const map = this.realWorldMap || {};
    return map.interiorRoomId ? 'room' : 'tree';
  },

  realWorldMapInteriorTitle() {
    const node = this.realWorldMapInteriorNode();
    if (!node) return '';
    const map = this.realWorldMap || {};
    if (map.interiorRoomId) {
      const { room } = window.GameModules.realWorldMapInterior.findRoom(this.realWorldMapInteriorFloors(), map.interiorRoomId);
      return room ? `${room.number || room.name} 房间布局` : node.name;
    }
    return node.name;
  },

  realWorldMapInteriorFloors() {
    const node = this.realWorldMapInteriorNode();
    if (!node) return [];
    return window.GameModules.realWorldMapInterior.ensureFloors(node, this);
  },

  realWorldMapInteriorZones() {
    const node = this.realWorldMapInteriorNode();
    return Array.isArray(node?.interiorLayout?.zones) ? node.interiorLayout.zones : [];
  },

  realWorldMapInteriorSummary() {
    return '';
  },

  backRealWorldMapInteriorTree() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    map.interiorRoomId = '';
    this.realWorldMap = { ...map };
  },

  realWorldMapSelectedRoom() {
    const map = this.realWorldMap || {};
    return window.GameModules.realWorldMapInterior.findRoom(this.realWorldMapInteriorFloors(), map.interiorRoomId).room;
  },

  realWorldMapSelectedRoomResidentsLine() {
    const room = this.realWorldMapSelectedRoom();
    if (!room?.residentsText) return '';
    return `居住人：${room.residentsText}`;
  },

  renderRealWorldMapRoomCanvas() {
    const room = this.realWorldMapSelectedRoom();
    const canvas = document.querySelector('.real-world-map-room-canvas');
    if (!room || !canvas) return;
    const layout = window.GameModules.realWorldMapInterior.resolveRoomLayout(room)
      || window.GameModules.realWorldMapInterior.defaultRoom202Layout();
    window.GameModules.realWorldMapInterior.drawRoomLayout(canvas, layout);
  },

  realWorldMapSelectedRoomTemplateLabel() {
    const room = this.realWorldMapSelectedRoom();
    if (!room?.layoutTemplateId) return '';
    const item = window.GameModules.realWorldMapInteriorTemplates?.list?.().find((row) => row.id === room.layoutTemplateId);
    return item ? `布局：${item.name}` : '';
  },

  realWorldMapZoneGridClass(position = '') {
    const map = { 北: 'zone-n', 南: 'zone-s', 东: 'zone-e', 西: 'zone-w', 中: 'zone-c' };
    return map[String(position || '中').trim()] || 'zone-c';
  },

  realWorldMapInfoControlLine() {
    const node = this.realWorldMapInfoNode();
    if (!node?.revealed) return '';
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    return window.GameModules.orgTerritory?.resolveControlLabel?.(map, node, this) || '';
  },

  realWorldMapInfoControlHistory() {
    const node = this.realWorldMapInfoNode();
    if (!node?.revealed) return [];
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    return window.GameModules.orgTerritory?.controlHistoryForNode?.(map, node, this) || [];
  },

  realWorldMapNodeControlLine(nodeId = '') {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    const node = (map.nodes || []).find((item) => item.id === nodeId);
    if (!node?.revealed) return '';
    return window.GameModules.orgTerritory?.resolveControlLabel?.(map, node, this) || '';
  },

  realWorldMapInfoNode() {
    return window.GameModules.realWorldMap.infoNode(this.realWorldMap);
  },

  realWorldMapInfoFacts() {
    const node = this.realWorldMapInfoNode();
    if (!node) return [];
    return window.GameModules.realWorldMapFacts?.normalizeFacts?.(node, node.description, window.GameModules.realWorldMapFacts.nowLabel(this)) || [];
  },

  realWorldMapFactText(fact, index) {
    return window.GameModules.realWorldMapFacts?.formatFact?.(fact, index) || '';
  },
};


;// ---- real-world-layout-catalog-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.realWorldLayoutCatalogActions = {
  realWorldLayoutCatalogTemplateId: '',

  layoutTemplatesApi() {
    return window.GameModules.realWorldMapInteriorTemplates;
  },

  realWorldLayoutCatalogItems() {
    return this.layoutTemplatesApi()?.list?.() || [];
  },

  realWorldLayoutCatalogBasicItems() {
    return this.realWorldLayoutCatalogItems().filter((item) => !item.category || item.category !== 'luxury');
  },

  realWorldLayoutCatalogLuxuryItems() {
    return this.realWorldLayoutCatalogItems().filter((item) => item.category === 'luxury');
  },

  realWorldLayoutCatalogSelected() {
    const id = String(this.realWorldLayoutCatalogTemplateId || '');
    if (!id) return null;
    return this.realWorldLayoutCatalogItems().find((item) => item.id === id) || null;
  },

  realWorldLayoutCatalogCategoryLabel(item = {}) {
    return item.category === 'luxury' ? '豪宅/高端' : '普通住宅';
  },

  realWorldLayoutCatalogSlotsText(item = {}) {
    return (item.slots || []).join('、') || '—';
  },

  openRealWorldLayoutCatalog(templateId = '') {
    this.realWorldLayoutCatalogTemplateId = String(templateId || '');
    requestAnimationFrame(() => this.renderRealWorldLayoutCatalogCanvas());
  },

  backRealWorldLayoutCatalogList() {
    this.realWorldLayoutCatalogTemplateId = '';
  },

  demoLayoutForTemplate(templateId = '') {
    const tpl = this.layoutTemplatesApi();
    const item = this.realWorldLayoutCatalogItems().find((row) => row.id === templateId);
    if (!item) return null;
    const demoResidents = (item.slots || [])
      .filter((slot) => /^(bed_\d+|master|suite_\d+)$/u.test(slot))
      .map((slot, index) => `示例${index + 1}`);
    return tpl?.build?.(templateId, {
      residents: demoResidents,
      slotAssignments: {},
    });
  },

  renderRealWorldLayoutCatalogCanvas() {
    const id = String(this.realWorldLayoutCatalogTemplateId || '');
    const canvas = document.querySelector('.real-world-layout-catalog-canvas');
    if (!id || !canvas) return;
    const layout = this.demoLayoutForTemplate(id)
      || window.GameModules.realWorldMapInteriorTemplates?.materialize?.(id, {});
    if (!layout) return;
    window.GameModules.realWorldMapInterior?.drawRoomLayout?.(canvas, layout);
  },
};


;// ---- real-world-matter-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.realWorldMatterActions = {
  realWorldAvailableMatters() {
    this.initCalendar?.();
    const now = this.phoneDate?.() || new Date();
    const rows = (this.calendarState?.events || []).filter((event) => event?.matterType && event.status !== 'done')
      .filter((event) => new Date(new Date(event.time).getTime() + (Number(event.durationMinutes) || 60) * 60000) >= now)
      .sort((a, b) => new Date(a.time) - new Date(b.time));
    if (this.realWorldMatterState?.activeId && !rows.some((item) => item.id === this.realWorldMatterState.activeId)) this.realWorldMatterState.activeId = '';
    return rows;
  },

  activeRealWorldMatter() {
    const id = this.realWorldMatterState?.activeId || '';
    return this.realWorldAvailableMatters().find((item) => item.id === id) || null;
  },

  openRealWorldMatterPanel() {
    this.realWorldMatterState = this.realWorldMatterState || { open: false, activeId: '' };
    this.realWorldMatterState.open = true;
  },

  closeRealWorldMatterPanel() {
    if (this.realWorldMatterState) this.realWorldMatterState.open = false;
  },

  selectRealWorldMatter(id) {
    this.realWorldMatterState = this.realWorldMatterState || { open: false, activeId: '' };
    this.realWorldMatterState.activeId = id;
    this.realWorldMatterState.open = false;
  },

  clearRealWorldMatter() {
    if (this.realWorldMatterState) this.realWorldMatterState.activeId = '';
  },

  realWorldMatterText(matter = this.activeRealWorldMatter()) {
    if (!matter) return '无当前事项';
    return `${matter.title}｜${this.formatCalendarTime?.(matter.time) || matter.time}｜${matter.note || '无备注'}`;
  },

  realWorldMatterAction(matter = this.activeRealWorldMatter()) {
    if (!matter) return '';
    if (matter.type === '面试') return `去参加${matter.company || ''}${matter.jobTitle || ''}面试`;
    if (matter.type === '到岗上班') return `按预约去${matter.company || ''}${matter.jobTitle || ''}到岗上班`;
    if (matter.type === '投稿通知') return `处理${matter.company || ''}${matter.jobTitle || ''}投稿通知`;
    return `处理事项：${matter.title}`;
  },

  realWorldChoicesWithMatters() {
    const matter = this.activeRealWorldMatter();
    const matterAction = this.realWorldMatterAction(matter);
    return [...new Set([matterAction, ...(this.realWorldChoices || [])].filter(Boolean))].slice(0, 5);
  },

  realWorldActionWithMatter(action) {
    const matter = this.activeRealWorldMatter();
    if (!matter) return action;
    const detail = this.realWorldMatterText(matter);
    return `【当前事项】${detail}\n【玩家行动】${action}`;
  },

  refreshRealWorldMatterStatus() {
    const matter = this.activeRealWorldMatter();
    if (!matter) return;
    const now = this.phoneDate?.() || new Date();
    const end = new Date(new Date(matter.time).getTime() + (Number(matter.durationMinutes) || 60) * 60000);
    if (now >= end) {
      matter.status = 'done';
      this.realWorldMatterState.activeId = '';
    }
  },
};
