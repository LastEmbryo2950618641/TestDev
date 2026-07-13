window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.orgTerritory = window.GameModules.app.orgTerritory || {};

(function registerOrgTerritoryRecordHelpers() {
  const territory = () => window.GameModules.orgTerritory;

  window.GameModules.app.orgTerritory.recordHelpers = {
    appendOrgTerritorySystemRecord(store, key, value, reason = '') {
      if (!store || !value) return;
      store.realWorldSystemRecords = Array.isArray(store.realWorldSystemRecords) ? store.realWorldSystemRecords : [];
      const at = store.phoneDate?.()?.toISOString?.() || new Date().toISOString();
      const entry = { key: String(key || '政体').slice(0, 24), value: String(value).slice(0, 240), reason: String(reason || '').slice(0, 120), at };
      const duplicate = store.realWorldSystemRecords.some((item) => item.key === entry.key && item.value === entry.value);
      if (duplicate) return;
      store.realWorldSystemRecords = [...store.realWorldSystemRecords, entry].slice(-60);
    },

    ensureFactionSolid(faction = {}) {
      const ot = territory();
      if (!faction.solid || typeof faction.solid !== 'object') faction.solid = {};
      faction.solid.overviewPanels = ot.normalizeOverviewPanels(faction.solid.overviewPanels || {});
      return faction.solid;
    },

    overviewEntryKey(panel = '', entry = {}) {
      const raw = String(entry.id || entry.key || entry.name || entry.title || panel || 'entry').trim();
      return raw.replace(/[^\w\u4e00-\u9fa5-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 64) || `${panel}-entry`;
    },

    upsertOverviewEntry(faction = {}, panelKey = 'economy', patch = {}, meta = {}) {
      const ot = territory();
      this.ensureFactionSolid(faction);
      const panel = faction.solid.overviewPanels[panelKey] || { entries: {} };
      panel.entries = panel.entries && typeof panel.entries === 'object' ? panel.entries : {};
      const key = this.overviewEntryKey(panelKey, patch);
      if (meta.mode === 'remove') {
        delete panel.entries[key];
        faction.solid.overviewPanels[panelKey] = panel;
        return key;
      }
      const previous = panel.entries[key] && typeof panel.entries[key] === 'object' ? panel.entries[key] : {};
      panel.entries[key] = {
        ...previous,
        ...patch,
        value: patch.value ?? patch.text ?? previous.value ?? '',
        unit: patch.unit ?? previous.unit ?? '',
        kind: patch.kind || patch.type || previous.kind || '',
        state: patch.state || previous.state || 'sketch',
        note: patch.note || patch.sketchNote || previous.note || '',
        updatedAt: meta.now || ot.nowLabel(meta.store),
        reason: patch.reason || meta.reason || previous.reason || '',
      };
      faction.solid.overviewPanels[panelKey] = panel;
      return key;
    },
  };
}());
