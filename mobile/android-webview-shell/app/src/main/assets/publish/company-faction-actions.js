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
      type: job.payType === '鍒涗綔鑰? ? '鏂囧垱鏈烘瀯' : '鍏徃',
      industry: job.industry || company.industry,
      scale: job.scale || company.scale,
      location: job.address || company.location,
      updatedAt: now,
    });
    company.openings = [{ id: job.id || `job-${now}`, name: job.title || '鎷涜仒宀椾綅', type: job.payType || '鍛樺伐', desc: job.desc || '鐢盉oss鎷涜仒璁板綍鍚屾銆? }, ...(company.openings || []).filter((item) => item.name !== job.title)].slice(0, 12);
    this.ensureCompanyFaction(company, `Boss鎷涜仒鍑虹幇鍏徃鈥?{job.company}鈥濓紝鍏徃APP涓庡娍鍔涚郴缁熷繀椤诲悓姝ャ€俙);
    return company;
  },

  ensureAllCompanyFactions() {
    if (!this.companyState) this.initCompanySystem?.();
    (this.companyState?.companies || []).forEach((company) => this.ensureCompanyFaction(company, '鍏徃APP宸叉湁鍏徃锛屽娍鍔涚郴缁熷繀椤诲瓨鍦ㄥ搴斿娍鍔涖€?));
  },

  ensureCompanyFaction(company = {}, reason = '鍏徃APP鍚屾鍒板娍鍔涚郴缁熴€?) {
    if (!company?.name) return null;
    if (!this.factionState) this.initFactionSystem?.();
    if (!this.factionState?.factions) return null;
    const id = company.id === 'main-company' ? 'company-main' : this.factionIdByName?.(company.name);
    const now = new Date().toISOString();
    const expectedTop = window.GameModules.factionSystem.countryFaction(this.playerProfile || {});
    const top = (expectedTop && this.factionState.factions.find((item) => item.id === expectedTop.id || item.name === expectedTop.name))
      || this.factionState.factions.find((item) => item.type === '鍥藉' && !item.parentId)
      || expectedTop
      || null;
    let faction = this.factionState.factions.find((item) => item.id === id || item.name === company.name);
    if (!faction) {
      const forest = window.GameModules.factionOrgForest;
      const corpRootId = top?.id ? (forest?.domainRootId?.(top.id, 'corp') || top.id) : '';
      const corpRoot = corpRootId ? this.factionState.factions.find((item) => item.id === corpRootId) : null;
      faction = this.normalizeFactionStructure?.({ id, name: company.name, type: company.type || '鍏徃', classification: 'faction', orgDomain: 'corp', ownership: 'private', foundingType: 'independent', parentId: corpRootId, parentName: corpRoot?.name || (corpRootId ? (forest?.DOMAIN_LABELS?.corp || '缁忔祹缁勭粐') : '鏃犲娍鍔涘綊灞?), level: '鍏徃绾у埆', location: company.location || '鏈煡', domain: company.industry || '', scale: company.scale || '', stance: '', influence: 0, description: `鍏徃APP璁板綍鐨勭粍缁?stub锛?{company.name}銆俙, structure: [], rules: [], resources: [], relations: [], fixed: true, updatedAt: now }) || {};
      this.factionState.factions.push(faction);
    }
    const forestSync = window.GameModules.factionOrgForest;
    const corpRootIdSync = top?.id ? (forestSync?.domainRootId?.(top.id, 'corp') || top.id) : '';
    const corpRootSync = corpRootIdSync ? this.factionState.factions.find((item) => item.id === corpRootIdSync) : null;
    Object.assign(faction, { name: company.name, type: company.type || faction.type || '鍏徃', classification: faction.classification || 'faction', location: company.location || faction.location, domain: company.industry || faction.domain, scale: company.scale || faction.scale, orgDomain: faction.orgDomain || 'corp', ownership: faction.ownership || 'private', foundingType: faction.foundingType || 'independent', parentId: corpRootIdSync, parentName: corpRootSync?.name || (corpRootIdSync ? (forestSync?.DOMAIN_LABELS?.corp || '缁忔祹缁勭粐') : '鏃犲娍鍔涘綊灞?), updatedAt: now });
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
        node = { name: dept.name, level: '閮ㄩ棬绾у埆', roles: [] };
        faction.structure.push(node);
      }
      node.level = node.level || '閮ㄩ棬绾у埆';
      node.roles = this.normalizeFactionRoles?.(node.roles) || node.roles || [];
      for (const job of dept.jobs || []) {
        let role = node.roles.find((item) => item.title === job.title);
        if (!role) {
          role = { title: job.title, count: job.people?.length || '鏈煡', characters: [] };
          node.roles.push(role);
        }
        role.characters = Array.from(new Set([...(role.characters || []), ...(job.people || ['鏈煡'])]));
        role.count = role.count || role.characters.length || '鏈煡';
      }
    }
  },

  ensureBossJobFaction(job = {}, event = {}) {
    const company = this.upsertCompanyFromBossJob(job);
    const faction = this.ensureCompanyFaction(company, `鐢宠宀椾綅骞剁害瀹?{event.type || '闈㈣瘯'}锛屾嫑鑱樺叕鍙歌繘鍏ュ娍鍔涚郴缁熴€俙);
    if (faction) this.addFactionRoleOccupant(faction, job.title || '鎷涜仒宀椾綅', this.playerProfile?.name || '鐜╁鏈汉', `鐜╁宸茬敵璇疯宀椾綅锛屽綋鍓嶄负鍊欓€?寰?{event.type || '闈㈣瘯'}鐘舵€併€俙);
  },

  addPlayerForcePosition(entry = {}) {
    const state = this.playerIdentityState?.();
    if (!state?.values || !entry.force || !entry.position) return;
    const ot = window.GameModules.orgTerritory;
    const orgId = entry.orgId || ot?.resolveOrgIdByName?.(this, entry.force) || '';
    const row = {
      orgId,
      orgName: entry.force,
      title: entry.position,
      reason: entry.reason || '鐢辩幇瀹炶亴鍦轰簨椤圭‘璁ゃ€?,
      since: this.phoneDate?.()?.toISOString?.() || new Date().toISOString(),
      source: 'Boss鎷涜仒鍚屾',
    };
    const mem = ot?.upsertCharacterMembership?.(state, row, this) || row;
    if (state.profile) {
      const profileList = Array.isArray(state.profile.memberships) ? state.profile.memberships : [];
      if (!profileList.some((item) => (mem.orgId && item.orgId === mem.orgId) || (item.orgName === mem.orgName && item.title === mem.title))) state.profile.memberships = [...profileList, mem];
    }
    window.GameModules.characterStateStore?.save?.(state).catch((err) => console.warn('[浜轰簨褰掑睘] 淇濆瓨澶辫触:', err.message, err.stack));
  },
};
