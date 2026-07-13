window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.orgTerritory = window.GameModules.app.orgTerritory || {};

(function registerOrgTerritoryFamilyActions() {
  const territory = () => window.GameModules.orgTerritory;

  window.GameModules.app.orgTerritory.familyActions = {
    ensureFamilyOrg(store, options = {}) {
      store.initFactionSystem?.();
      const ot = territory();
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
      this.syncFamilyTerritoryAnchor(store, faction, options.activeMap || null);
      return faction;
    },

    syncFamilyTerritoryAnchor(store, family = null, activeMap = null) {
      const ot = territory();
      const item = family || this.ensureFamilyOrg(store, { activeMap });
      const node = ot.resolveHomeMapNode?.(store, activeMap);
      if (!node?.id) return item;
      const anchors = Array.isArray(item.territoryAnchors) ? item.territoryAnchors.slice() : [];
      if (!anchors.includes(node.id)) anchors.unshift(node.id);
      item.territoryAnchors = anchors.slice(0, 8);
      if (node.name) item.location = node.name;
      Object.assign(item, ot.normalizeFaction(item, store));
      return item;
    },

    ensureAdminOrgStub(store, item = {}, parentOrgId = '') {
      const ot = territory();
      store.initFactionSystem?.();
      const profile = store.playerProfile || {};
      const country = (store.factionState?.factions || []).find((f) => f.type === '国家' && !f.parentId)
        || window.GameModules.factionSystem?.countryFaction?.(profile);
      const kind = item.kind || 'admin';
      const slug = String(item.name || '').replace(/[^\w\u4e00-\u9fa5]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 48) || 'region';
      const id = kind === 'community' ? `community-${slug}` : `admin-${slug}`;
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

    linkFamilyToCommunity(store, communityOrgId = '', activeMap = null) {
      if (!communityOrgId) return;
      const ot = territory();
      const community = (store.factionState?.factions || []).find((f) => f.id === communityOrgId);
      if (!community) return;
      const family = this.ensureFamilyOrg(store, { activeMap });
      family.parentId = community.id;
      family.parentName = community.name;
      Object.assign(family, ot.normalizeFaction(family, store));
    },
  };
}());
