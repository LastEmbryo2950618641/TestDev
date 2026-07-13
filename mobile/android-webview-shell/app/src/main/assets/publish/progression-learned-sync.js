window.GameModules = window.GameModules || {};

window.GameModules.progressionLearnedSync = {
  intrinsicKeys: ['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma'],
  intrinsicLabelByKey: {
    strength: '力量',
    agility: '敏捷',
    constitution: '体质',
    intelligence: '智力',
    perception: '感知',
    willpower: '意志',
    charisma: '魅力',
  },
  legacyIntrinsicMap: {
    学习能力: 'intelligence',
    学习: 'intelligence',
    行动能力: 'agility',
    行动: 'agility',
    精神稳定度: 'willpower',
    精神稳定: 'willpower',
    精神: 'willpower',
    成长潜力: 'charisma',
    潜力: 'charisma',
  },

  intrinsicKeyFromLabel(label = '') {
    const text = String(label || '').trim();
    if (!text) return '';
    const byKey = this.intrinsicKeys.find((key) => key === text);
    if (byKey) return byKey;
    const byLabel = Object.entries(this.intrinsicLabelByKey).find(([, name]) => name === text)?.[0];
    if (byLabel) return byLabel;
    return this.legacyIntrinsicMap[text] || '';
  },

  normalizeIntrinsicBase(list = []) {
    const keys = [];
    for (const entry of list || []) {
      const key = this.intrinsicKeyFromLabel(entry);
      if (key && !keys.includes(key)) keys.push(key);
    }
    return keys;
  },

  intrinsicLabels(keys = []) {
    return (keys || []).map((key) => this.intrinsicLabelByKey[key] || key).filter(Boolean);
  },

  normalizeProfileLevel(item = {}) {
    const lv = Number(item?.level);
    return Number.isInteger(lv) && lv >= 1 && lv <= 7 ? lv : null;
  },

  mergeProfileItem(existing, profileItem, type, seed, index = 0) {
    const p = window.GameModules.progression;
    const name = String(profileItem?.name || existing?.name || '').trim();
    if (!name || p.isStageIdentity?.(name)) return existing || null;
    const requiredSkills = Array.isArray(profileItem?.requiredSkills) ? profileItem.requiredSkills : (existing?.requiredSkills || []);
    const requiredKnowledge = Array.isArray(profileItem?.requiredKnowledge) ? profileItem.requiredKnowledge : (existing?.requiredKnowledge || []);
    const rawIntrinsic = Array.isArray(profileItem?.requiredIntrinsicBase)
      ? profileItem.requiredIntrinsicBase
      : (existing?.requiredIntrinsicBase || []);
    const linkedKeys = this.normalizeIntrinsicBase(rawIntrinsic);
    const intrinsicLabels = linkedKeys.length ? this.intrinsicLabels(linkedKeys) : [];
    let level = this.normalizeProfileLevel(profileItem);
    if (level == null) level = this.normalizeProfileLevel(existing);
    if (level == null) level = p.clamp(1 + ((seed + index) % 3), 1, 7);
    const linkedStats = linkedKeys.length
      ? linkedKeys
      : (Array.isArray(existing?.linkedStats) && existing.linkedStats.length ? existing.linkedStats : p.linkedStats(name));
    const desc = profileItem?.desc || profileItem?.description || existing?.desc || existing?.description || existing?.source;
    const reason = String(profileItem?.reason || profileItem?.changeMode || existing?.reason || existing?.changeMode || '').trim().slice(0, 120);
    const base = existing && p.hasLearnedLevel?.({ ...existing, type })
      ? { ...existing }
      : p.learned(name, type, level, linkedStats, desc || p.learnedDefinition(name, type));
    const merged = {
      ...base,
      name,
      type,
      level,
      linkedStats,
      requiredSkills: [...requiredSkills],
      requiredKnowledge: [...requiredKnowledge],
      requiredIntrinsicBase: intrinsicLabels,
      desc: profileItem?.desc || existing?.desc,
      description: desc || base.description,
      source: desc || base.source,
      levelEffects: profileItem?.levelEffects || existing?.levelEffects,
      reason: reason || base.reason,
      changeMode: reason || base.changeMode,
      info: existing?.info || profileItem?.info,
      exp: existing?.exp || base.exp || { current: 0, next: p.learnedNext[level] },
    };
    p.normalizeLearnedExp(merged);
    return merged;
  },

  ensureMissingPrerequisites(values, profileItem, type, seed) {
    const p = window.GameModules.progression;
    if (!values || !profileItem) return false;
    let changed = false;
    const has = (list, name) => (list || []).some((item) => {
      const itemName = String(item?.name || item).trim();
      return itemName === name || itemName.includes(name) || name.includes(itemName);
    });
    const add = (key, itemType, itemName) => {
      const name = String(itemName || '').trim();
      if (!name || p.isStageIdentity?.(name) || has(values[key], name)) return;
      values[key] = [...(values[key] || []), p.learned(name, itemType, 1 + (seed % 3), p.linkedStats(name), `${name}的基础掌握与实际应用。`)];
      changed = true;
    };
    for (const name of profileItem.requiredKnowledge || []) add('knowledge', '知识', name);
    for (const name of profileItem.requiredSkills || []) add('skills', '技能', name);
    return changed;
  },

  syncList(values, profile, key, type, seed) {
    const profileList = Array.isArray(profile?.[key]) ? profile[key] : [];
    if (!profileList.length) return false;
    let changed = false;
    const current = Array.isArray(values[key]) ? values[key] : [];
    const byName = new Map(current.map((item) => [String(item?.name || '').trim(), item]));
    const merged = [];
    const seen = new Set();
    for (const [index, profileItem] of profileList.entries()) {
      const name = String(profileItem?.name || '').trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      if (this.ensureMissingPrerequisites(values, profileItem, type, seed + index)) changed = true;
      const next = this.mergeProfileItem(byName.get(name), profileItem, type, seed, index);
      if (next) {
        const before = JSON.stringify(byName.get(name) || null);
        merged.push(next);
        if (before !== JSON.stringify(next)) changed = true;
      }
    }
    for (const item of current) {
      const name = String(item?.name || '').trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      merged.push(this.mergeProfileItem(item, item, type, seed, merged.length));
    }
    if (merged.length !== current.length || merged.some((item, index) => JSON.stringify(item) !== JSON.stringify(current[index]))) {
      values[key] = merged;
      changed = true;
    }
    return changed;
  },

  syncFromProfile(values, profile, seed = 0) {
    if (!values || !profile) return false;
    let changed = false;
    if (this.syncList(values, profile, 'knowledge', '知识', seed)) changed = true;
    if (this.syncList(values, profile, 'skills', '技能', seed + 11)) changed = true;
    if (this.syncList(values, profile, 'professions', '职业', seed + 23)) changed = true;
    if (changed && window.GameModules.progression?.ensureProgressionNotes) {
      window.GameModules.progression.ensureProgressionNotes(values);
    }
    return changed;
  },
};

Object.assign(window.GameModules.progression, {
  profileLearnedList(character, key, type, seed, existing = []) {
    const sync = window.GameModules.progressionLearnedSync;
    const profileList = Array.isArray(character?.[key]) ? character[key] : [];
    if (profileList.length) {
      return profileList.map((item, index) => sync.mergeProfileItem(null, item, type, seed, index)).filter(Boolean);
    }
    if (existing.length) return existing;
    if (key === 'knowledge') return this.knowledge(character, seed);
    if (key === 'skills') return this.skills(character, seed);
    if (key === 'professions') return this.professions(character, seed);
    return existing;
  },
});
