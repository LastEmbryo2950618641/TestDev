window.GameModules = window.GameModules || {};

window.GameModules.companyFactionActions = {
  upsertCompanyFromBossJob(job = {}) {
    if (!job?.company) return null;
    if (!this.companyState) this.initCompanySystem?.();
    const now = new Date().toISOString();
    let company = this.companyState.companies.find((item) => item.name === job.company || item.id === `company-${job.id}`);
    if (!company) {
      company = window.GameModules.companySystem.defaultCompany(job.company, this.playerProfile || {});
      company.id = `company-${job.id || Date.now()}`;
      this.companyState.companies.push(company);
    }
    Object.assign(company, {
      name: job.company,
      type: job.payType === '创作者' ? '文创机构' : '公司',
      industry: job.industry || company.industry,
      scale: job.scale || company.scale,
      location: job.address || company.location,
      updatedAt: now,
    });
    company.openings = [{ id: job.id || `job-${now}`, name: job.title || '招聘岗位', type: job.payType || '员工', desc: job.desc || '由Boss招聘记录同步。' }, ...(company.openings || []).filter((item) => item.name !== job.title)].slice(0, 12);
    this.ensureCompanyFaction(company, `Boss招聘出现公司“${job.company}”，公司APP与势力系统必须同步。`);
    return company;
  },

  ensureAllCompanyFactions() {
    if (!this.companyState) this.initCompanySystem?.();
    (this.companyState?.companies || []).forEach((company) => this.ensureCompanyFaction(company, '公司APP已有公司，势力系统必须存在对应势力。'));
  },

  ensureCompanyFaction(company = {}, reason = '公司APP同步到势力系统。') {
    if (!company?.name) return null;
    if (!this.factionState) this.initFactionSystem?.();
    if (!this.factionState?.factions) return null;
    const id = company.id === 'main-company' ? 'company-main' : this.factionIdByName?.(company.name);
    const now = new Date().toISOString();
    const expectedTop = window.GameModules.factionSystem.countryFaction(this.playerProfile || {});
    const top = this.factionState.factions.find((item) => item.id === expectedTop.id || item.name === expectedTop.name) || this.factionState.factions.find((item) => item.type === '国家' && !item.parentId) || expectedTop;
    let faction = this.factionState.factions.find((item) => item.id === id || item.name === company.name);
    if (!faction) {
      const forest = window.GameModules.factionOrgForest;
      const corpRootId = forest?.domainRootId?.(top.id, 'corp') || top.id;
      const corpRoot = this.factionState.factions.find((item) => item.id === corpRootId);
      faction = this.normalizeFactionStructure?.({ id, name: company.name, type: company.type || '公司', orgDomain: 'corp', ownership: 'private', foundingType: 'independent', parentId: corpRootId, parentName: corpRoot?.name || forest?.DOMAIN_LABELS?.corp || '经济组织', level: '公司级别', location: company.location || '未知', domain: company.industry || '现代职场', scale: company.scale || '未知', stance: '现实职场势力', influence: 35, description: `公司APP记录的现实公司：${company.name}。`, structure: [], rules: [], resources: [], relations: [], fixed: true, updatedAt: now }) || {};
      this.factionState.factions.push(faction);
    }
    const forestSync = window.GameModules.factionOrgForest;
    const corpRootIdSync = forestSync?.domainRootId?.(top.id, 'corp') || top.id;
    const corpRootSync = this.factionState.factions.find((item) => item.id === corpRootIdSync);
    Object.assign(faction, { name: company.name, type: company.type || faction.type || '公司', location: company.location || faction.location, domain: company.industry || faction.domain, scale: company.scale || faction.scale, orgDomain: faction.orgDomain || 'corp', ownership: faction.ownership || 'private', foundingType: faction.foundingType || 'independent', parentId: corpRootIdSync, parentName: corpRootSync?.name || forestSync?.DOMAIN_LABELS?.corp || '经济组织', updatedAt: now });
    this.syncCompanyOrganizationToFaction(faction, company, reason, now);
    window.GameModules.orgTerritoryActions?.syncCompanyEconomicEntry?.(this, faction, company, reason);
    Object.assign(faction, window.GameModules.orgTerritory?.normalizeFaction?.(faction, this) || faction);
    faction.fieldReasons = this.completeFactionReasons?.(faction, faction.fieldReasons, reason) || faction.fieldReasons || {};
    faction.changeLog = [{ field: 'company-sync', reason, at: now, action: 'sync' }, ...(faction.changeLog || [])].slice(0, 50);
    return faction;
  },

  syncCompanyOrganizationToFaction(faction, company, reason, now) {
    faction.structure = faction.structure || [];
    const org = Array.isArray(company.organization) ? company.organization : [];
    for (const dept of org) {
      let node = faction.structure.find((item) => item.name === dept.name);
      if (!node) {
        node = { name: dept.name, level: '部门级别', roles: [] };
        faction.structure.push(node);
      }
      node.level = node.level || '部门级别';
      node.roles = this.normalizeFactionRoles?.(node.roles) || node.roles || [];
      for (const job of dept.jobs || []) {
        let role = node.roles.find((item) => item.title === job.title);
        if (!role) {
          role = { title: job.title, count: job.people?.length || '未知', characters: [] };
          node.roles.push(role);
        }
        role.characters = Array.from(new Set([...(role.characters || []), ...(job.people || ['未知'])]));
        role.count = role.count || role.characters.length || '未知';
      }
    }
  },

  ensureBossJobFaction(job = {}, event = {}) {
    const company = this.upsertCompanyFromBossJob(job);
    const faction = this.ensureCompanyFaction(company, `申请岗位并约定${event.type || '面试'}，招聘公司进入势力系统。`);
    if (faction) this.addFactionRoleOccupant(faction, job.title || '招聘岗位', this.playerProfile?.name || '玩家本人', `玩家已申请该岗位，当前为候选/待${event.type || '面试'}状态。`);
  },

  addPlayerForcePosition(entry = {}) {
    const state = this.playerIdentityState?.();
    if (!state?.values || !entry.force || !entry.position) return;
    const ot = window.GameModules.orgTerritory;
    const orgId = entry.orgId || ot?.resolveOrgIdByName?.(this, entry.force) || '';
    const row = { name: `${entry.force} / ${entry.position}`, force: entry.force, position: entry.position, orgId, reason: entry.reason || '由现实职场事项确认。', changeMode: 'Boss招聘同步' };
    const list = Array.isArray(state.values.force_positions) ? state.values.force_positions : [];
    if (!list.some((item) => item.force === row.force && item.position === row.position)) state.values.force_positions = [...list, row];
    ot?.upsertCharacterMembership?.(state, { orgId, orgName: entry.force, title: entry.position, reason: row.reason, since: this.phoneDate?.()?.toISOString?.() || new Date().toISOString() }, this);
    if (state.profile) {
      const profileList = Array.isArray(state.profile.force_positions) ? state.profile.force_positions : [];
      if (!profileList.some((item) => item.force === row.force && item.position === row.position)) state.profile.force_positions = [...profileList, row];
    }
    window.GameModules.sqliteSave.saveCharacterState?.(state).catch((err) => console.warn('[势力地位] 保存失败:', err.message, err.stack));
  },
};
