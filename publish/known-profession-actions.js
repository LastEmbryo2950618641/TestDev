window.GameModules = window.GameModules || {};

window.GameModules.knownProfessionActions = {
  initKnownProfessionApp() {
    this.knownProfessionState = { open: false, query: '', message: '', selectedName: '', detailOpen: false, ...(this.knownProfessionState || {}) };
  },

  openKnownProfessionApp() {
    this.initKnownProfessionApp();
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.promptState) this.promptState.open = false;
    if (this.tokenStatsState) this.tokenStatsState.open = false;
    this.knownProfessionState.open = true;
    this.desktopUnlocked = true;
  },

  closeKnownProfessionApp() {
    if (this.knownProfessionState) {
      this.knownProfessionState.open = false;
      this.knownProfessionState.detailOpen = false;
    }
    this.closeAppToDesktop();
  },

  knownProfessions() {
    this.initKnownProfessionApp();
    const data = window.GameModules.sqliteSave.getMetaJson?.('known_professions') || [];
    const q = String(this.knownProfessionState.query || '').trim().toLowerCase();
    return data.filter((item) => !q || [item.name, item.worldTag, item.summary, item.sourceReason].join(' ').toLowerCase().includes(q));
  },

  openKnownProfessionDetail(job) {
    this.initKnownProfessionApp();
    if (!job?.name) return;
    this.knownProfessionState.selectedName = job.name;
    this.knownProfessionState.detailOpen = true;
  },

  closeKnownProfessionDetail() {
    if (!this.knownProfessionState) return;
    this.knownProfessionState.detailOpen = false;
    this.knownProfessionState.selectedName = '';
  },

  selectedKnownProfession() {
    this.initKnownProfessionApp();
    if (!this.knownProfessionState.selectedName) return null;
    const list = this.knownProfessions();
    return list.find((item) => item.name === this.knownProfessionState.selectedName) || null;
  },

  async knowProfession(name, worldTag, context = {}) {
    const clean = window.GameModules.professionInfo.normalizeJobName(name);
    if (!clean) return null;
    const world = worldTag || this.character?.work || window.GameModules.realWorld2026?.label || '原创世界';
    const info = await window.GameModules.professionInfo.ensure(world, clean, context);
    if (!info) return null;
    const save = window.GameModules.sqliteSave;
    const list = save.getMetaJson?.('known_professions') || [];
    const next = { ...info, knownAt: new Date().toISOString(), sourceReason: context.sourceReason || '剧情中已认识该职业' };
    const merged = [next, ...list.filter((item) => !(item.worldTag === world && item.name === info.name))].slice(0, 80);
    await save.saveMetaJson?.('known_professions', merged);
    this.knownProfessionState = { ...(this.knownProfessionState || {}), message: `已认识职业：${info.name}`, selectedName: info.name };
    return next;
  },

  professionRequirementText(job) {
    if (!job) return '';
    const req = job.requirements || job;
    return [
      `身内能力：${(req.intrinsicStats || []).join('、') || '无'}`,
      `世界专属能力：${(req.worldAbilities || []).join('、') || '无'}`,
      `技能：${(req.learnedAbilities || []).join('、') || '无'}`,
      `知识储备：${(req.knowledgeAreas || []).join('、') || '无'}`,
      req.reason ? `原因：${req.reason}` : '',
    ].filter(Boolean).join('\n');
  },

  professionExamResult(job) {
    const state = this.playerIdentityState?.() || this.characterRpgState;
    const values = state?.values || {};
    const has = (list, name) => (list || []).some((item) => String(item?.name || item).includes(name) || name.includes(String(item?.name || item)));
    const req = job?.requirements || job || {};
    const missingSkills = (req.learnedAbilities || []).filter((name) => !has(values.skills, name));
    const missingKnowledge = (req.knowledgeAreas || []).filter((name) => !has(values.knowledge, name));
    const missingStats = (req.intrinsicStats || []).filter((key) => values[key] === undefined || Number(values[key]?.value ?? values[key]) <= 0);
    const missingWorld = (req.worldAbilities || []).filter((name) => values[name] === undefined && !has(values.worldValues, name));
    return { pass: !missingSkills.length && !missingKnowledge.length && !missingStats.length && !missingWorld.length, missingSkills, missingKnowledge, missingStats, missingWorld };
  },

  async addProfessionToPlayer(job) {
    const state = await this.ensurePlayerRpgState?.(true);
    if (!state?.values || !job?.name) return false;
    const result = this.professionExamResult(job);
    if (!result.pass) {
      this.knownProfessionState.message = `考核未通过：缺少 ${[...result.missingStats, ...result.missingWorld, ...result.missingSkills, ...result.missingKnowledge].join('、')}`;
      return false;
    }
    const exists = (state.values.professions || []).some((item) => item.name === job.name);
    if (!exists) state.values.professions = [...(state.values.professions || []), window.GameModules.progression.learned(job.name, '职业', 1, job.intrinsicStats || ['intelligence'], job.description || job.summary)];
    const target = state.values.professions.find((item) => item.name === job.name);
    target.info = job;
    target.linkedStats = job.intrinsicStats || target.linkedStats;
    target.levelDescription = job.levelDescription || target.levelDescription;
    target.effect = job.effect || target.effect;
    await window.GameModules.sqliteSave.saveCharacterState(state);
    await window.GameModules.rpgLexicon.syncState(state);
    this.knownProfessionState.message = `已获得职业：${job.name} lv.1`;
    return true;
  },
};
