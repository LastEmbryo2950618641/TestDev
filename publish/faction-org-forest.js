/**
 * 势力组织 · 森林模型（数据层）
 * 设计依据：docs/schemas/faction-org-forest-design.md v1.3.3
 */
window.GameModules = window.GameModules || {};

window.GameModules.factionOrgForest = {
  DOMAIN_KEYS: ['gov', 'geo', 'corp', 'community'],

  DOMAIN_LABELS: {
    gov: '国家机构',
    geo: '行政区划',
    corp: '经济组织',
    community: '社群',
  },

  domainRootId(sovereignId, domain) {
    return `${sovereignId}-domain-${domain}`;
  },

  isDomainRootId(id = '') {
    return /-domain-(gov|geo|corp|community)$/.test(String(id || ''));
  },

  resolveViewportRoot(factions = []) {
    const list = Array.isArray(factions) ? factions : [];
    const sovereigns = list.filter((f) => f.sovereign === true || (f.orgDomain === 'country' && f.type === '国家' && !f.parentId));
    if (sovereigns.length) {
      const ranked = sovereigns.sort((a, b) => {
        if (a.parentId && !b.parentId) return 1;
        if (!a.parentId && b.parentId) return -1;
        return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
      });
      return ranked[0];
    }
    return list.find((f) => f.type === '国家' && !f.parentId) || list.find((f) => f.orgDomain === 'country') || null;
  },

  inferOrgDomain(faction = {}) {
    if (faction.orgDomain) return faction.orgDomain;
    if (faction.type === '国家' || faction.sovereign) return 'country';
    if (faction.isDomainRoot) {
      const m = String(faction.id || '').match(/-domain-(gov|geo|corp|community)$/);
      if (m) return m[1];
    }
    if (faction.kind === 'admin' || /^admin-/.test(String(faction.id || ''))) return 'geo';
    if (faction.kind === 'community' || /^community-/.test(String(faction.id || ''))) return 'community';
    if (faction.ownership === 'state' || faction.type === '政府' || faction.type === '机关') return 'gov';
    if (['公司', '工作室', '企业'].includes(faction.type) || faction.ownership === 'private') return 'corp';
    return 'corp';
  },

  inferOwnership(faction = {}) {
    if (faction.ownership === 'state' || faction.ownership === 'private') return faction.ownership;
    if (faction.orgDomain === 'geo' || faction.orgDomain === 'community' || faction.kind === 'admin' || faction.kind === 'community') return null;
    if (faction.type === '国家') return null;
    if (faction.ownership === 'state' || ['政府', '机关', '学校'].includes(faction.type) && faction.description?.includes('国立')) return 'state';
    return 'private';
  },

  inferFoundingType(faction = {}, allFactions = []) {
    if (faction.foundingType === 'independent' || faction.foundingType === 'subordinate') return faction.foundingType;
    const parent = allFactions.find((f) => f.id === faction.parentId);
    if (!parent || parent.isDomainRoot || this.isDomainRootId(parent.id)) return 'independent';
    if (parent.orgDomain === 'country') return 'independent';
    return 'subordinate';
  },

  makeDomainRoot(sovereign = {}, domain = 'corp', labels = {}) {
    const id = this.domainRootId(sovereign.id, domain);
    const labelMap = { ...this.DOMAIN_LABELS, ...labels };
    return {
      id,
      name: labelMap[domain] || domain,
      type: '域根',
      orgDomain: domain,
      ownership: null,
      sovereign: false,
      isDomainRoot: true,
      parentId: sovereign.id,
      parentName: sovereign.name || '',
      level: '域级',
      location: sovereign.location || '',
      domain: labelMap[domain],
      scale: '抽象层',
      stance: '中立',
      influence: 10,
      description: `${labelMap[domain]}域根（森林模型占位节点）`,
      resolution: 'L1',
      stub: { oneLine: `${labelMap[domain]}（域根）` },
      status: 'active',
      structure: [],
      rules: [],
      resources: [],
      relations: [],
      fixed: true,
    };
  },

  ensureDomainRoots(factions = [], sovereign = null) {
    const list = [...factions];
    const root = sovereign || this.resolveViewportRoot(list);
    if (!root?.id) return { factions: list, created: [] };
    const created = [];
    this.DOMAIN_KEYS.forEach((domain) => {
      const id = this.domainRootId(root.id, domain);
      if (!list.some((f) => f.id === id)) {
        const node = this.makeDomainRoot(root, domain);
        list.push(node);
        created.push(node);
      }
    });
    return { factions: list, created };
  },

  stripDuplicateStructureRoot(faction = {}) {
    if (!faction?.structure?.length) return faction;
    const fname = String(faction.name || '').trim();
    faction.structure = faction.structure.filter((node, index) => {
      if (index === 0 && String(node.name || '').trim() === fname) return false;
      return true;
    });
    return faction;
  },

  isAdminGeoParent(parentId = '') {
    return /^admin-|^community-/.test(String(parentId || ''));
  },

  corpDomainRootId(factions = [], sovereignId = '') {
    const sid = sovereignId || this.resolveViewportRoot(factions)?.id;
    return sid ? this.domainRootId(sid, 'corp') : '';
  },

  govDomainRootId(factions = [], sovereignId = '') {
    const sid = sovereignId || this.resolveViewportRoot(factions)?.id;
    return sid ? this.domainRootId(sid, 'gov') : '';
  },

  geoDomainRootId(factions = [], sovereignId = '') {
    const sid = sovereignId || this.resolveViewportRoot(factions)?.id;
    return sid ? this.domainRootId(sid, 'geo') : '';
  },

  sanitizeFactionParentDomain(faction = {}, allFactions = [], log = []) {
    if (!faction?.id) return faction;
    const forest = this;
    faction.orgDomain = forest.inferOrgDomain(faction);
    faction.ownership = forest.inferOwnership(faction);
    faction = forest.stripDuplicateStructureRoot(faction);

    const sovereign = forest.resolveViewportRoot(allFactions);
    if (!sovereign?.id) return faction;

    const corpRoot = forest.domainRootId(sovereign.id, 'corp');
    const govRoot = forest.domainRootId(sovereign.id, 'gov');
    const geoRoot = forest.domainRootId(sovereign.id, 'geo');

    const isCompany = faction.orgDomain === 'corp' || ['公司', '工作室', '企业'].includes(faction.type);
    const isPrivate = faction.ownership === 'private' || (isCompany && faction.ownership !== 'state');

    if (isPrivate && (forest.isAdminGeoParent(faction.parentId) || faction.parentId === sovereign.id)) {
      log.push({ kind: 'parent-reparent', factionId: faction.id, from: faction.parentId, to: corpRoot });
      faction.parentId = corpRoot;
      const root = allFactions.find((f) => f.id === corpRoot);
      faction.parentName = root?.name || forest.DOMAIN_LABELS.corp;
    }

    if (faction.ownership === 'state' && forest.isAdminGeoParent(faction.parentId)) {
      log.push({ kind: 'state-to-gov-root', factionId: faction.id, from: faction.parentId, to: govRoot });
      faction.parentId = govRoot;
      const root = allFactions.find((f) => f.id === govRoot);
      faction.parentName = root?.name || forest.DOMAIN_LABELS.gov;
    }

    if (faction.kind === 'admin' && faction.parentId === sovereign.id) {
      faction.parentId = geoRoot;
      const root = allFactions.find((f) => f.id === geoRoot);
      faction.parentName = root?.name || forest.DOMAIN_LABELS.geo;
      faction.orgDomain = 'geo';
    }

    if (!faction.foundingType) {
      faction.foundingType = forest.inferFoundingType(faction, allFactions);
    }

    return faction;
  },

  migrateFactionForest(store) {
    const log = [];
    store.initFactionSystem?.();
    let factions = [...(store.factionState?.factions || [])];

    factions = factions.map((f) => {
      if (f.type === '国家' && !f.parentId) {
        f.orgDomain = 'country';
        f.sovereign = true;
      }
      return f;
    });

    const sovereign = this.resolveViewportRoot(factions);
    if (sovereign) {
      sovereign.orgDomain = 'country';
      sovereign.sovereign = true;
      const ensured = this.ensureDomainRoots(factions, sovereign);
      factions = ensured.factions;
      if (ensured.created.length) {
        log.push({ kind: 'domain-roots-created', count: ensured.created.length, sovereignId: sovereign.id });
      }
    }

    factions = factions.map((f) => this.sanitizeFactionParentDomain(f, factions, log));

    factions.forEach((f) => {
      if (!f.foundingType) f.foundingType = this.inferFoundingType(f, factions);
    });

    if (store.factionState) store.factionState.factions = factions;
    if (log.length && store.pushAlertLog) {
      store.pushAlertLog({
        level: 'info',
        category: '势力系统',
        title: '森林模型迁移',
        message: `migrateFactionForest: ${log.length} 项调整`,
        source: 'factionOrgForest.migrate',
      });
    }
    store.orgTerritoryReconciliationLog = [...(store.orgTerritoryReconciliationLog || []), ...log.map((item) => ({ ...item, at: store.phoneDate?.()?.toISOString?.() || new Date().toISOString() }))].slice(-50);
    return { factions, log };
  },

  resolveAffiliatedFaction(faction = {}, allFactions = []) {
    if (!faction?.id) return null;
    if (faction.foundingType === 'independent') return null;
    const parent = allFactions.find((f) => f.id === faction.parentId);
    if (!parent || parent.isDomainRoot || this.isDomainRootId(parent.id) || parent.orgDomain === 'country') return null;
    if (faction.foundingType === 'subordinate') return parent;
    return parent.isDomainRoot ? null : parent;
  },

  affiliatedFactionLabel(faction = {}, allFactions = []) {
    const aff = this.resolveAffiliatedFaction(faction, allFactions);
    if (!aff) return '';
    return aff.name || '';
  },

  factionHasExposure(faction = {}, store) {
    const ot = window.GameModules.orgTerritory;
    const score = ot?.factionExposureScore?.(faction, store) ?? 0;
    if (score > 0) return true;
    if (faction.fixed || faction.id === 'company-main') return true;
    if (faction.resolution && String(faction.resolution).toUpperCase() !== 'L1') return true;
    return false;
  },

  filterForestByExposure(factions = [], store) {
    return factions.filter((f) => {
      if (f.isDomainRoot) return true;
      if (f.orgDomain === 'country' || f.sovereign) return true;
      return this.factionHasExposure(f, store);
    });
  },

  canIntroduceOrg({ archive = [], worldLore = '', exposureHint = false } = {}) {
    const hasArchive = Array.isArray(archive) ? archive.length > 0 : Boolean(archive);
    if (!hasArchive && !exposureHint && !worldLore) {
      return { allowed: false, reason: '无 archive/正文/资料锚点', maxResolution: 'L1' };
    }
    if (exposureHint && !hasArchive) {
      return { allowed: true, reason: '听说过锚点', maxResolution: 'L1' };
    }
    return { allowed: true, reason: '有 archive 依据', maxResolution: 'L2' };
  },
};
