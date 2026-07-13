/**
 * Temporary compatibility facade. New consumers must use app.orgTerritory modules directly.
 */
window.GameModules = window.GameModules || {};

window.GameModules.orgTerritoryActions = {
  ot() {
    return window.GameModules.orgTerritory;
  },

  reasonText(update = {}) {
    return window.GameModules.app.orgTerritory.settlementActions.reasonText(update);
  },

  appendOrgTerritorySystemRecord(store, key, value, reason = '') {
    return window.GameModules.app.orgTerritory.recordHelpers.appendOrgTerritorySystemRecord(store, key, value, reason);
  },

  ensureFaction(store, name = '') {
    return window.GameModules.app.orgTerritory.settlementActions.ensureFaction(store, name);
  },

  applyTerritoryControl(store, update = {}) {
    return window.GameModules.app.orgTerritory.settlementActions.applyTerritoryControl(store, update);
  },

  parseStructurePath(field = '') {
    return window.GameModules.domain.orgTerritory.updateRules.parseStructurePath(field);
  },

  applyFactionStructureUpdate(store, update = {}, legacyItem = {}) {
    return window.GameModules.app.orgTerritory.settlementActions.applyFactionStructureUpdate(store, update, legacyItem);
  },

  ensureFactionSolid(faction = {}) {
    return window.GameModules.app.orgTerritory.recordHelpers.ensureFactionSolid(faction);
  },

  overviewEntryKey(panel = '', entry = {}) {
    return window.GameModules.app.orgTerritory.recordHelpers.overviewEntryKey(panel, entry);
  },

  upsertOverviewEntry(faction = {}, panelKey = 'economy', patch = {}, meta = {}) {
    return window.GameModules.app.orgTerritory.recordHelpers.upsertOverviewEntry(faction, panelKey, patch, meta);
  },

  parseOverviewPanel(update = {}, patch = {}) {
    return window.GameModules.domain.orgTerritory.updateRules.parseOverviewPanel(update, patch);
  },

  applyOrgOverviewPanel(store, update = {}) {
    return window.GameModules.app.orgTerritory.settlementActions.applyOrgOverviewPanel(store, update);
  },

  applyMembershipUpdate(store, update = {}) {
    return window.GameModules.app.orgTerritory.settlementActions.applyMembershipUpdate(store, update);
  },

  syncCompanyEconomicEntry(store, faction = {}, company = {}, reason = '') {
    return window.GameModules.app.orgTerritory.economyActions.syncCompanyEconomicEntry(store, faction, company, reason);
  },

  ensureFamilyOrg(store, options = {}) {
    return window.GameModules.app.orgTerritory.familyActions.ensureFamilyOrg(store, options);
  },

  syncFamilyTerritoryAnchor(store, family = null, activeMap = null) {
    return window.GameModules.app.orgTerritory.familyActions.syncFamilyTerritoryAnchor(store, family, activeMap);
  },

  syncPlayerWealthAsset(store, wealth = null) {
    return window.GameModules.app.orgTerritory.economyActions.syncPlayerWealthAsset(store, wealth);
  },

  applyOrgStatus(store, update = {}) {
    return window.GameModules.app.orgTerritory.settlementActions.applyOrgStatus(store, update);
  },

  applyOrgStatusEconomicCascade(store, faction, reason = '', now = '') {
    return window.GameModules.app.orgTerritory.economyActions.applyOrgStatusEconomicCascade(store, faction, reason, now);
  },

  adminSlug(name = '') {
    return String(name || '').replace(/[^\w\u4e00-\u9fa5]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 48) || 'region';
  },

  ensureAdminOrgStub(store, item = {}, parentOrgId = '') {
    return window.GameModules.app.orgTerritory.familyActions.ensureAdminOrgStub(store, item, parentOrgId);
  },

  linkFamilyToCommunity(store, communityOrgId = '', activeMap = null) {
    return window.GameModules.app.orgTerritory.familyActions.linkFamilyToCommunity(store, communityOrgId, activeMap);
  },

  syncEmploymentOnOrgDissolved(store, faction, reason = '') {
    return window.GameModules.app.orgTerritory.economyActions.syncEmploymentOnOrgDissolved(store, faction, reason);
  },

  applySettlementUpdates(store, updates = []) {
    return window.GameModules.app.orgTerritory.settlementActions.applySettlementUpdates(store, updates);
  },

  applyLegacyStructure(store, item = {}) {
    return window.GameModules.app.orgTerritory.settlementActions.applyLegacyStructure(store, item);
  },
};
