window.GameModules = window.GameModules || {};

window.GameModules.characterProfileSource = {
  async resolve(raw, store) {
    const candidate = this.candidate(raw, store);
    try {
      const profile = await window.GameModules.characterBrief?.loadProfile?.(candidate);
      if (profile?.path) return { raw: candidate, preset: profile };
    } catch (err) {
      console.warn('[角色卡] 预设资料读取失败，改用上下文生成:', err.message, err.stack);
    }
    return { raw: candidate, preset: null };
  },

  candidate(raw, store) {
    const data = typeof raw === 'object' && raw ? { ...raw } : { name: String(raw || '无名路人') };
    if (!data.work) data.work = store?.character?.work || '原创世界';
    return data;
  },

  presetText(profile) {
    if (!profile?.path) return '无预设人物 md：必须只根据人物基础区、玩家资料区、关系事件区和世界观资料生成。';
    const basics = (profile.basics || []).map((row) => `${row.label}：${row.value}`).join('\n');
    const sections = (profile.sections || []).map((section) => `【${section.title}】\n${section.body || (section.items || []).join('\n')}`).join('\n');
    return [`预设人物 md：${profile.path}`, profile.summary, basics, sections].filter(Boolean).join('\n').slice(0, 1800);
  },
};
