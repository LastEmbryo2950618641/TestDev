window.GameModules = window.GameModules || {};

window.GameModules.rpgProfessionState = {
  normalizeProfessions(state) {
    const jobs = state.values?.professions || [];
    if (!jobs.length) return false;
    let changed = false;
    const normalized = jobs.map((job) => {
      const clean = window.GameModules.professionInfo.normalizeJobName(job.name);
      if (job.name !== clean) changed = true;
      return { ...job, name: clean };
    }).filter((job) => job.name);
    if (normalized.length !== jobs.length) changed = true;
    if (changed) state.values.professions = normalized;
    return changed;
  },

  async ensureInfo(state, character, schema) {
    this.normalizeProfessions(state);
    const jobs = state.values?.professions || [];
    const job = jobs.find((item) => item?.name && !item.info) || jobs[0];
    if (!job?.name || job.info) return false;
    const worldFields = schema.sections.find((section) => section.title === '世界固有属性')?.fields || [];
    const info = await window.GameModules.professionInfo.ensure(state.worldTag, job.name, {
      characterName: state.name,
      role: character?.role || state.profile?.role,
      detail: character?.detail || state.profile?.detail,
      skills: state.values.skills,
      knowledge: state.values.knowledge,
      intrinsicStats: 'strength(力量)、agility(敏捷)、constitution(体质)、intelligence(智力)、perception(感知)、willpower(意志)、charisma(魅力)',
      worldFields,
    });
    if (!info) return false;
    const before = JSON.stringify({ info: job.info || null, skills: state.values.skills, knowledge: state.values.knowledge });
    job.name = info.name;
    job.info = info;
    job.linkedStats = info.intrinsicStats;
    job.levelDescription = info.levelDescription || job.levelDescription;
    job.effect = info.effect || job.effect;
    this.ensurePrerequisites(state, info);
    return before !== JSON.stringify({ info, skills: state.values.skills, knowledge: state.values.knowledge });
  },

  ensurePrerequisites(state, info) {
    const p = window.GameModules.progression;
    const has = (list, name) => (list || []).some((item) => String(item?.name || item).includes(name) || name.includes(String(item?.name || item)));
    state.values.skills = state.values.skills || [];
    state.values.knowledge = state.values.knowledge || [];
    for (const name of info.learnedAbilities || []) {
      if (!has(state.values.skills, name)) state.values.skills.push(p.learned(name, '技能', 1, info.intrinsicStats, `${info.name}职业前置技能。`));
    }
    for (const name of info.knowledgeAreas || []) {
      if (!has(state.values.knowledge, name)) state.values.knowledge.push(p.learned(name, '知识', 1, info.intrinsicStats, `${info.name}职业前置知识。`));
    }
  },
};
