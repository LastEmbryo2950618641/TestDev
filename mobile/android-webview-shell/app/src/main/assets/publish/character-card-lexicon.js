window.GameModules = window.GameModules || {};

window.GameModules.characterCardLexicon = {
  modifySkillId: 'character.card.modify',
  addSkillId: 'character.card.add',

  fieldMap: { 濮撳悕: 'name', 鎬у埆: 'gender', 韬唤: 'role', 鑱屼笟: 'job', 浜虹墿璇存槑: 'detail', 鑳屾櫙: 'detail', 澶栬矊: 'appearance', 鍠滃ソ: 'preferences', 鍋忓ソ: 'preferences', 绌跨潃鍋忓ソ: 'preferences', 鎬ф牸: 'personality', 浜洪檯鍏崇郴: 'relationships', 鍏崇郴: 'relationships', 鎶€鑳? 'skills', essentialPreferenceLayers: 'essentialPreferenceLayers', 鏈川鍋忓ソ: 'essentialPreferenceLayers', 浠峰€肩珛鍦哄亸濂? 'essentialPreferenceLayers', 鍐崇瓥椋庢牸鍋忓ソ: 'essentialPreferenceLayers', 浜虹敓鍏淮鍋忓ソ: 'essentialPreferenceLayers', 搴曠嚎閿氱偣鍋忓ソ: 'essentialPreferenceLayers', 蹇冪悊鍋忓ソ: 'essentialPreferenceLayers' },

  isImmutableProfileUpdate(update = {}) {
    const tool = window.GameModules.playerAspirationPreferenceLayers;
    if (update.field === 'essentialPreferenceLayers') return true;
    if (tool?.isImmutableFieldName?.(update.field) || tool?.isImmutableFieldName?.(update.name)) return true;
    return false;
  },

  normalizeField(raw) {
    const text = String(raw || '').trim();
    return this.fieldMap[text] || text;
  },

  displayField(field) {
    return Object.entries(this.fieldMap).find(([, key]) => key === field)?.[0] || field;
  },

  normalizeKind(raw) {
    const text = String(raw || '').trim();
    if (text.includes('瑙掕壊鎶€鑳?)) return '瑙掕壊鎶€鑳?;
    if (text.includes('瑙掕壊鍗?)) return '瑙掕壊鍗?;
    return text;
  },

  normalizeUpdate(raw = {}) {
    const kind = this.normalizeKind(raw.kind);
    const field = this.normalizeField(raw.field || raw.name);
    const reason = String(raw.reason || raw.modifyReason || '').trim().slice(0, 160);
    if (!reason || !['瑙掕壊鍗?, '瑙掕壊鎶€鑳?].includes(kind)) return null;
    const value = Object.prototype.hasOwnProperty.call(raw, 'value') ? raw.value : raw.description;
    if (!field || value === undefined || value === null) return null;
    return { ...raw, kind, field, value, reason };
  },

  async applyToState(state, updates = []) {
    if (!Array.isArray(updates)) return [];
    const records = [];
    let changed = false;
    for (const raw of updates) {
      const update = this.normalizeUpdate(raw);
      if (!update) continue;
      const applied = state?.profile ? this.applyOne(state.profile, update) : false;
      if (applied) changed = true;
      records.push(this.changeRecord(update, applied));
    }
    if (!records.length) return [];
    if (state?.profile) {
      const reasons = { ...(state.profile.roleCardFieldReasons || {}) };
      records.forEach((item) => { reasons[item.field] = item.reason; });
      state.profile.roleCardFieldReasons = reasons;
    }
    if (changed && state?.profile) {
      state.profile.roleCardUpdatedAt = new Date().toISOString();
      state.profile.roleCardChangeLog = [...(state.profile.roleCardChangeLog || []), ...records.filter((item) => item.applied)].slice(-30);
      window.GameModules.rpgInitializer?.touch?.(state.values, window.Alpine?.store?.('game'));
      await window.GameModules.characterStateStore?.save?.(state);
    } else if (records.length && state?.profile) {
      await window.GameModules.characterStateStore?.save?.(state);
    }
    return records;
  },

  applyOne(profile, update) {
    if (this.isImmutableProfileUpdate(update)) return false;
    if (update.kind === '瑙掕壊鎶€鑳? || update.field === 'skills') return this.applySkill(profile, update);
    const key = update.field;
    if (!['name', 'gender', 'role', 'job', 'detail', 'appearance', 'preferences', 'personality', 'relationships'].includes(key)) return false;
    const next = String(update.value || '').trim().slice(0, key === 'detail' ? 180 : 120);
    if (!next || profile[key] === next) return false;
    profile[key] = next;
    return true;
  },

  applySkill(profile, update) {
    const value = update.value && typeof update.value === 'object' ? update.value : { name: update.name, desc: update.value || update.description || update.summary };
    const name = String(value.name || update.skillName || update.name || '').trim().slice(0, 16);
    const desc = String(value.desc || value.description || update.description || update.summary || update.reason).trim().slice(0, 80);
    if (!name) return false;
    const skills = Array.isArray(profile.skills) ? [...profile.skills] : [];
    const index = skills.findIndex((item) => item?.name === name);
    const next = { name, desc, reason: update.reason, changeMode: update.reason };
    if (index >= 0) skills[index] = next;
    else skills.push(next);
    profile.skills = skills.slice(0, 8);
    return true;
  },

  changeRecord(update, applied = true) {
    return { at: new Date().toISOString(), skillId: update.kind === '瑙掕壊鎶€鑳? ? this.addSkillId : this.modifySkillId, field: this.displayField(update.field), name: update.name || update.field, value: update.value, reason: update.reason, applied };
  },
};
