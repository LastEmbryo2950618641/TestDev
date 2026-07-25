window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.orgTerritory = window.GameModules.app.orgTerritory || {};

(function registerOrgTerritoryEconomyActions() {
  const territory = () => window.GameModules.orgTerritory;
  const records = () => window.GameModules.app.orgTerritory.recordHelpers;
  const families = () => window.GameModules.app.orgTerritory.familyActions;

  window.GameModules.app.orgTerritory.economyActions = {
    syncCompanyEconomicEntry(store, faction = {}, company = {}, reason = '') {
      if (!faction?.id || !company?.name) return;
      const ot = territory();
      const now = ot.nowLabel(store);
      records().ensureFactionSolid(faction);
      const previous = faction.solid?.overviewPanels?.economy?.entries?.institutions;
      const prevList = Array.isArray(previous?.value) ? previous.value.slice() : [];
      const nextItem = {
        name: company.name,
        description: [company.industry, company.scale, company.location].filter(Boolean).join(' / ').slice(0, 240),
      };
      const withoutDup = prevList.filter((item) => item?.name !== company.name);
      records().upsertOverviewEntry(faction, 'economy', {
        id: 'institutions',
        key: 'institutions',
        value: [...withoutDup, nextItem],
        kind: 'institutions',
        state: 'sketch',
        note: reason || '公司 APP 同步',
        source: 'company-app',
      }, { reason, now, store });
      Object.assign(faction, ot.normalizeFaction(faction, store));
      faction.changeLog = [{ field: 'overviewPanels.economy', reason: reason || '公司 APP 同步到势力经济面板。', at: now, action: 'sync' }, ...(faction.changeLog || [])].slice(0, 50);
    },

    syncPlayerWealthAsset(store, wealth = null) {
      if (!store?.playerProfile) return null;
      const ot = territory();
      const profile = store.playerProfile;
      const normalizedWealth = wealth || (typeof store.normalizePlayerWealth === 'function' ? store.normalizePlayerWealth(profile) : {});
      const amount = Number(normalizedWealth.wealthAmount ?? profile.wealthAmount ?? 0);
      const tier = normalizedWealth.wealthTier || profile.wealthTier || '未知';
      const family = families().ensureFamilyOrg(store);
      if (!family) return null;
      const now = ot.nowLabel(store);
      records().upsertOverviewEntry(family, 'economy', {
        id: 'assets',
        key: 'assets',
        value: amount,
        unit: '元',
        kind: 'assets',
        state: 'sketch',
        note: `${tier} / source: playerProfile.wealth`,
        source: 'playerProfile.wealth',
        wealthMirror: { tier, amount, source: profile.wealthSource || '' },
      }, { reason: 'player wealth mirror', now, store });
      Object.assign(family, ot.normalizeFaction(family, store));
      family.updatedAt = now;
      return family;
    },

    applyOrgStatusEconomicCascade(store, faction, reason = '', now = '') {
      const ot = territory();
      const isEmployer = faction.kind === 'company' || faction.orgDomain === 'corp' || /company|studio|enterprise/i.test(String(faction.type || faction.name || ''));
      if (!isEmployer) return;
      records().ensureFactionSolid(faction);
      const panel = faction.solid.overviewPanels.economy || { entries: {} };
      panel.entries = panel.entries && typeof panel.entries === 'object' ? panel.entries : {};
      const label = ot.orgStatusLabel(faction) || faction.status;
      const note = `${label}：治理/状态受扰；${String(reason || 'org status changed').slice(0, 80)}`;
      let touched = false;
      Object.entries(panel.entries).forEach(([key, entry]) => {
        const value = entry && typeof entry === 'object' ? entry : { value: entry };
        const text = `${key}${value.value || ''}${value.kind || ''}${value.note || ''}`;
        if (/payroll|salary|operation|revenue|business|income|assets|production/i.test(text)) {
          panel.entries[key] = {
            ...value,
            note: [value.note, note].filter(Boolean).join(' / ').slice(0, 240),
            state: value.state || 'sketch',
            updatedAt: now || ot.nowLabel(store),
            reason,
          };
          touched = true;
        }
      });
      if (!touched) {
        panel.entries.system = {
          ...(panel.entries.system && typeof panel.entries.system === 'object' ? panel.entries.system : {}),
          value: '受扰',
          kind: 'system',
          state: 'sketch',
          note,
          updatedAt: now || ot.nowLabel(store),
          reason,
        };
      }
      faction.solid.overviewPanels.economy = panel;
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
      const employmentRecords = store.companyState.employmentRecords || [];
      const record = employmentRecords.find((item) => item.status === '在职') || employmentRecords[0];
      if (record) {
        record.status = '已离职';
        record.endAt = endAt;
        record.duration = store.employmentDurationText?.(record.startAt, endAt) || record.duration || '';
      }
      records().appendOrgTerritorySystemRecord(store, '就业', `${companyName}：组织 ${faction.status}，同步离职`, reason || '政体状态变更');
      return true;
    },
  };
}());
