window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.orgTerritory = window.GameModules.app.orgTerritory || {};

(function registerOrgTerritoryFamilyActions() {
  const territory = () => window.GameModules.orgTerritory;

  window.GameModules.app.orgTerritory.familyActions = {
    /** Look up AI-created family org only — never invent stubs from profile. */
    ensureFamilyOrg(store, options = {}) {
      store.initFactionSystem?.();
      const ot = territory();
      const id = 'family-player-home';
      const byId = (store.factionState?.factions || []).find((f) => f.id === id);
      if (byId) {
        this.syncFamilyTerritoryAnchor(store, byId, options.activeMap || null);
        return byId;
      }
      const name = ot.inferFamilyOrgName?.(store.playerProfile || {}) || '';
      const byName = name
        ? (store.factionState?.factions || []).find((f) => f.name === name || f.kind === 'family')
        : (store.factionState?.factions || []).find((f) => f.kind === 'family');
      if (byName) {
        this.syncFamilyTerritoryAnchor(store, byName, options.activeMap || null);
        return byName;
      }
      return null;
    },

    syncFamilyTerritoryAnchor(store, family = null, activeMap = null) {
      const ot = territory();
      const item = family || this.ensureFamilyOrg(store, { activeMap });
      if (!item) return null;
      const node = ot.resolveHomeMapNode?.(store, activeMap);
      if (!node?.id) return item;
      const anchors = Array.isArray(item.territoryAnchors) ? item.territoryAnchors.slice() : [];
      if (!anchors.includes(node.id)) anchors.unshift(node.id);
      item.territoryAnchors = anchors.slice(0, 8);
      if (node.name) item.location = node.name;
      Object.assign(item, ot.normalizeFaction(item, store));
      return item;
    },

    /** Look up AI-created admin/community org only — never invent stubs. */
    ensureAdminOrgStub(store, item = {}, parentOrgId = '') {
      const ot = territory();
      store.initFactionSystem?.();
      const kind = item.kind || 'admin';
      const slug = String(item.name || '').replace(/[^\w\u4e00-\u9fa5]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 48) || 'region';
      const id = kind === 'community' ? `community-${slug}` : `admin-${slug}`;
      const faction = (store.factionState?.factions || []).find((f) => f.id === id || f.name === item.name);
      if (!faction) return null;
      if (parentOrgId && !faction.parentId) {
        const parentFaction = (store.factionState?.factions || []).find((f) => f.id === parentOrgId);
        faction.parentId = parentOrgId;
        faction.parentName = parentFaction?.name || faction.parentName || '无势力归属';
        Object.assign(faction, ot.normalizeFaction(faction, store));
      }
      return faction;
    },

    linkFamilyToCommunity(store, communityOrgId = '', activeMap = null) {
      const family = this.ensureFamilyOrg(store, { activeMap });
      if (!family || !communityOrgId) return family;
      const community = (store.factionState?.factions || []).find((f) => f.id === communityOrgId);
      if (!community) return family;
      family.parentId = community.id;
      family.parentName = community.name;
      Object.assign(family, territory().normalizeFaction(family, store));
      return family;
    },
  };
})();
