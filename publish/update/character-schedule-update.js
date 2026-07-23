window.GameModules = window.GameModules || {};

window.GameModules.characterScheduleUpdates = {
  subjectKey(update = {}) {
    const subject = update?.subject || {};
    return String(subject.characterId || subject.playerId || subject.id || subject.name || update.target || '').trim();
  },

  mergeValue(target = {}, source = {}) {
    const next = { ...(target || {}) };
    const patch = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
    ['currentLocation', 'currentAction', 'availability', 'currentNodeId', 'currentLocationIdentityKey', 'characterName', 'reason'].forEach((key) => {
      if (patch[key] !== undefined && patch[key] !== null && String(patch[key]).trim() !== '') next[key] = patch[key];
    });
    return next;
  },

  /** One schedule update per subject: merge location/action/availability fragments. */
  coalesce(updates = []) {
    const list = Array.isArray(updates) ? updates : [];
    const merged = [];
    const indexByKey = new Map();
    list.forEach((update) => {
      if (!update || update.updateType !== 'character-schedule') {
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
          field: 'characterSchedules',
          change: { mode: 'merge', value: this.mergeValue({}, raw) },
          reasons: reasons.length ? reasons.slice() : [{ trigger: '人事安排', evidence: raw.reason || update.reason || '正文明确证据', confidence: 'confirmed' }],
        });
        return;
      }
      const prev = merged[existingIndex];
      const prevValue = prev.change?.value && typeof prev.change.value === 'object' ? prev.change.value : {};
      const nextReasons = [...(Array.isArray(prev.reasons) ? prev.reasons : []), ...reasons]
        .filter((item, index, arr) => {
          const text = `${item?.trigger || ''}|${item?.evidence || ''}`;
          return text && arr.findIndex((other) => `${other?.trigger || ''}|${other?.evidence || ''}` === text) === index;
        });
      merged[existingIndex] = {
        ...prev,
        ...update,
        subject: prev.subject || update.subject,
        field: 'characterSchedules',
        change: { mode: 'merge', value: this.mergeValue(prevValue, raw) },
        reasons: nextReasons.length ? nextReasons : prev.reasons,
      };
    });
    return merged;
  },
};

window.GameModules.updateRegistry?.register?.({
  id: 'character-schedule',
  section: '人事安排',
  match: (change, text) => change.updateType === 'character-schedule' || /characterSchedules?|人事安排/u.test(text),
  card() {
    return { id: 'schedule:real-world', title: '人事安排', section: '人事安排' };
  },
  examples: [{
    updateType: 'character-schedule',
    subject: { type: 'character', id: '角色id', name: '角色名' },
    field: 'characterSchedules',
    change: { mode: 'merge', value: { currentLocation: '地点', currentAction: '正在做的事', availability: '在场', reason: '正文明确行动证据' } },
    reasons: [{ trigger: '人事安排', evidence: '正文明确行动证据', confidence: 'confirmed' }],
  }],
});
