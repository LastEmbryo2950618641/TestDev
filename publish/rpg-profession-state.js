window.GameModules = window.GameModules || {};

window.GameModules.rpgProfessionState = {
  normalizeProfessions(state) {
    const jobs = state.values?.professions || [];
    if (!jobs.length) return false;
    let changed = false;
    jobs.forEach((job) => {
      const clean = window.GameModules.professionInfo.normalizeJobName(job.name);
      if (job.name !== clean) { job.name = clean; changed = true; }
    });
    return changed;
  },

  async ensureInfo(state, character, schema) {
    this.normalizeProfessions(state);
    const job = state.values?.professions?.[0];
    if (!job?.name) return false;
    const worldFields = schema.sections.find((section) => section.title === '世界固有属性')?.fields || [];
    const info = await window.GameModules.professionInfo.ensure(state.worldTag, job.name, {
      characterName: state.name,
      role: character?.role || state.profile?.role,
      detail: character?.detail || state.profile?.detail,
      skills: state.values.skills,
      worldFields,
    });
    if (!info) return false;
    const before = JSON.stringify(job.info || null);
    job.name = info.name;
    job.info = info;
    job.linkedStats = info.intrinsicStats;
    return before !== JSON.stringify(info);
  },
};
