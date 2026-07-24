window.GameModules = window.GameModules || {};

window.GameModules.characterGoalUpdates = {
  subjectKey(update = {}) {
    const subject = update?.subject || {};
    return String(subject.characterId || subject.playerId || subject.id || subject.name || update.target || '').trim();
  },

  coalesce(updates = []) {
    const list = Array.isArray(updates) ? updates : [];
    const merged = [];
    const indexByKey = new Map();
    list.forEach((update) => {
      if (!update || update.updateType !== 'character-goal') {
        merged.push(update);
        return;
      }
      const key = this.subjectKey(update);
      if (!key) {
        merged.push(update);
        return;
      }
      const raw = update.change?.value && typeof update.change.value === 'object' && !Array.isArray(update.change.value)
        ? update.change.value
        : {};
      const reasons = Array.isArray(update.reasons) ? update.reasons.filter(Boolean) : [];
      const existingIndex = indexByKey.get(key);
      if (existingIndex === undefined) {
        indexByKey.set(key, merged.length);
        merged.push({
          ...update,
          field: 'profile.goalSystem',
          change: { mode: 'merge', value: { ...raw } },
          reasons: reasons.length ? reasons.slice() : [{ trigger: '长期目标', evidence: raw.reason || update.reason || '正文明确证据', confidence: 'confirmed' }],
        });
        return;
      }
      const prev = merged[existingIndex];
      const prevValue = prev.change?.value && typeof prev.change.value === 'object' ? prev.change.value : {};
      const nextValue = { ...prevValue, ...raw };
      ['short', 'medium', 'long'].forEach((tier) => {
        if (prevValue[tier] || raw[tier]) {
          nextValue[tier] = { ...(prevValue[tier] || {}), ...(raw[tier] || {}) };
        }
      });
      const ach = [...(Array.isArray(prevValue.achievements) ? prevValue.achievements : []), ...(Array.isArray(raw.achievements) ? raw.achievements : [])];
      if (raw.achievement) ach.push(raw.achievement);
      if (ach.length) nextValue.achievements = ach;
      const nextReasons = [...(Array.isArray(prev.reasons) ? prev.reasons : []), ...reasons]
        .filter((item, index, arr) => {
          const text = `${item?.trigger || ''}|${item?.evidence || ''}`;
          return text && arr.findIndex((other) => `${other?.trigger || ''}|${other?.evidence || ''}` === text) === index;
        });
      merged[existingIndex] = {
        ...prev,
        ...update,
        subject: prev.subject || update.subject,
        field: 'profile.goalSystem',
        change: { mode: 'merge', value: nextValue },
        reasons: nextReasons.length ? nextReasons : prev.reasons,
      };
    });
    return merged;
  },
};

window.GameModules.updateRegistry?.register?.({
  id: 'character-goal',
  section: '长期目标',
  match: (change, text) => change.updateType === 'character-goal' || /goalSystem|长期目标|阶段成果/u.test(text),
  card() {
    return { id: 'goal:real-world', title: '长期目标', section: '长期目标' };
  },
  examples: [{
    updateType: 'character-goal',
    subject: { type: 'character', id: '角色id', name: '角色名' },
    field: 'profile.goalSystem',
    change: {
      mode: 'merge',
      value: {
        short: { content: '同档下一条新短期目标', deadline: '2026-08-14', progress: 10, detail: '旧目标已完成；新目标刚起步' },
        achievement: '已完成的阶段成果',
        reason: '正文确认完成；按规则生成下一条短期目标',
      },
    },
    reasons: [{ trigger: '长期目标', evidence: '正文明确证据', confidence: 'confirmed' }],
  }],
});
