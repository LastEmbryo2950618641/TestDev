window.GameModules = window.GameModules || {};

window.GameModules.companyFactionActions = {
  upsertCompanyFromBossJob(job = {}) {
    if (!job?.company) return null;
    if (!this.companyState) this.initCompanySystem?.();
    const now = new Date().toISOString();
    const company = {
      id: `company-${job.id || Date.now()}`,
      factionId: this.factionIdByName?.(job.company) || '',
      name: job.company,
      type: job.payType === '创作者' ? '文创机构' : '公司',
      industry: job.industry || '',
      scale: job.scale || '',
      location: job.address || '',
      openings: [{ id: job.id || `job-${now}`, name: job.title || '招聘岗位', type: job.payType || '员工', desc: job.desc || '由 BOSS 招聘记录同步。' }],
      organization: [],
      updatedAt: now,
      source: 'boss-job',
    };
    const faction = this.ensureCompanyFaction(company, `BOSS招聘出现单位“${job.company}”，需与势力系统同步。`);
    if (faction) {
      this.companyState.currentCompanyId = faction.id;
      this.companyState.employment.activeCompanyId = faction.id;
      if (this.companyState.unitProfilesByFactionId?.[faction.id]) delete this.companyState.unitProfilesByFactionId[faction.id];
    }
    return company;
  },

  ensureAllCompanyFactions() {
    // No-op: 工作 App 不再凭空创建单位；组织主体只来自势力系统。
  },

  ensureCompanyFaction(company = {}, reason = '工作 App 与势力系统同步。') {
    if (!company?.name) return null;
    if (!this.factionState) this.initFactionSystem?.();
    if (!this.factionState?.factions) return null;
    const id = String(company.factionId || this.factionIdByName?.(company.name) || '').trim();
    const faction = this.factionState.factions.find((item) => (id && item.id === id) || item.name === company.name);
    if (!faction) return null;
    const now = new Date().toISOString();
    const top = this.factionState.factions.find((item) => item.type === '国家' && !item.parentId) || null;
    const forest = window.GameModules.factionOrgForest;
    const corpRootId = top?.id ? forest?.domainRootId?.(top.id, 'corp') || '' : '';
    const corpRoot = corpRootId ? this.factionState.factions.find((item) => item.id === corpRootId) : null;
    Object.assign(faction, {
      name: company.name,
      type: company.type || faction.type || '公司',
      classification: faction.classification || 'faction',
      location: company.location || faction.location,
      domain: company.industry || faction.domain,
      scale: company.scale || faction.scale,
      orgDomain: faction.orgDomain || 'corp',
      ownership: faction.ownership || 'private',
      foundingType: faction.foundingType || 'independent',
      parentId: corpRoot ? corpRootId : (faction.parentId || ''),
      parentName: corpRoot?.name || faction.parentName || '无势力归属',
      updatedAt: now,
    });
    this.syncCompanyOrganizationToFaction(faction, company, reason, now);
    window.GameModules.app?.orgTerritory?.economyActions?.syncCompanyEconomicEntry?.(this, faction, company, reason);
    Object.assign(faction, window.GameModules.orgTerritory?.normalizeFaction?.(faction, this) || faction);
    faction.fieldReasons = this.completeFactionReasons?.(faction, faction.fieldReasons, reason) || faction.fieldReasons || {};
    faction.changeLog = [{ field: 'work-app-sync', reason, at: now, action: 'sync' }, ...(faction.changeLog || [])].slice(0, 50);
    return faction;
  },

  syncCompanyOrganizationToFaction(faction, company) {
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
    const faction = this.ensureCompanyFaction(company, `申请岗位并约定${event.type || '面试'}，招聘单位进入势力系统。`);
    if (faction) this.addFactionRoleOccupant(faction, job.title || '招聘岗位', this.playerProfile?.name || '玩家本人', `玩家已申请该岗位，当前为候选/待${event.type || '面试'}状态。`);
  },

  addPlayerForcePosition(entry = {}) {
    const state = this.playerIdentityState?.();
    if (!state?.profile || !entry.force || !entry.position) return;
    const ot = window.GameModules.orgTerritory;
    const orgId = entry.orgId || ot?.resolveOrgIdByName?.(this, entry.force) || '';
    const row = {
      orgId,
      orgName: entry.force,
      title: entry.position,
      reason: entry.reason || '由现实职场事项确认。',
      since: this.phoneDate?.()?.toISOString?.() || new Date().toISOString(),
      source: 'Boss招聘同步',
    };
    ot?.upsertCharacterMembership?.(state, row, this);
    window.GameModules.rpgState?.syncSocialFields?.(state, 'profile', this);
    window.GameModules.characterStateStore?.save?.(state).catch((err) => console.warn('[人事归属] 保存失败:', err.message, err.stack));
  },
};
