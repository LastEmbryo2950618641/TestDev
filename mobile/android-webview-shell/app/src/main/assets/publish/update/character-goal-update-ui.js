window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('character-goal', {
  title: '长期目标',
  format(update = {}) {
    const subject = update.subject?.name || update.subject?.id || '角色';
    const value = update.change?.value && typeof update.change.value === 'object' ? update.change.value : {};
    const api = window.GameModules.characterGoalSystem;
    const lines = [`长期目标 · ${subject}`];
    ['short', 'medium', 'long'].forEach((key) => {
      if (!value[key]) return;
      const label = api?.TIER_LABELS?.[key] || key;
      const tier = api?.normalizeTier?.(value[key]) || value[key];
      lines.push(`${label}：${tier.content || '（保留）'}｜期限 ${tier.deadline || '—'}｜进度 ${tier.progress ?? '—'}%${tier.detail ? `（${tier.detail}）` : ''}`);
    });
    const achievements = [];
    if (Array.isArray(value.achievements)) achievements.push(...value.achievements);
    if (value.achievement) achievements.push(value.achievement);
    achievements.forEach((item, index) => {
      const text = typeof item === 'string' ? item : (item?.text || '');
      if (text) lines.push(`成果+：${text}`);
      else if (index === 0) lines.push('成果+');
    });
    const reason = update.reasons?.[0]?.evidence || value.reason || '';
    if (reason) lines.push(`依据：${reason}`);
    return lines.join('\n');
  },
});
