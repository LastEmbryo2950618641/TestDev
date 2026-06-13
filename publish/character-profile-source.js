window.GameModules = window.GameModules || {};

window.GameModules.characterProfileSource = {
  async resolve(raw, store) {
    const known = this.findKnown(raw, store);
    if (!known?.profilePath) return { raw, preset: null };
    const merged = typeof raw === 'object' && raw ? { ...known, ...raw, aliases: [...(known.aliases || []), ...(raw.aliases || [])] } : known;
    try {
      const profile = await window.GameModules.characterBrief?.loadProfile?.(merged);
      if (profile?.path) return { raw: merged, preset: profile };
    } catch (err) {
      console.warn('[角色卡] 预设资料读取失败，改用上下文生成:', err.message, err.stack);
    }
    return { raw, preset: null };
  },

  findKnown(raw, store) {
    const name = typeof raw === 'string' ? raw : raw?.name;
    if (!name) return null;
    const workHint = typeof raw === 'object' ? raw?.work : store?.character?.work;
    const works = Array.isArray(store?.works) ? store.works : window.GameModules.catalog?.works?.() || [];
    const candidates = works.flatMap((work) => (work.characters || []).map((char) => ({ ...char, work: char.work || work.name })));
    return candidates.find((char) => this.sameWork(char.work, workHint) && this.sameName(char, name)) || null;
  },

  sameWork(a, b) {
    if (!a || !b) return true;
    return window.GameModules.rag?.normalize?.(a) === window.GameModules.rag?.normalize?.(b);
  },

  sameName(char, name) {
    return char.name === name || (char.aliases || []).includes(name);
  },

  presetText(profile) {
    if (!profile?.path) return '无预设人物 md：必须只根据人物基础区、玩家资料区、关系事件区和世界观资料生成。';
    const basics = (profile.basics || []).map((row) => `${row.label}：${row.value}`).join('\n');
    const sections = (profile.sections || []).map((section) => `【${section.title}】\n${section.body || (section.items || []).join('\n')}`).join('\n');
    return [`预设人物 md：${profile.path}`, profile.summary, basics, sections].filter(Boolean).join('\n').slice(0, 1800);
  },
};
