window.GameModules = window.GameModules || {};

window.GameModules.characterCardLexicon = {
  modifySkillId: 'character.card.modify',
  addSkillId: 'character.card.add',

  fieldMap: { 姓名: 'name', 性别: 'gender', 身份: 'role', 职业: 'job', 人物说明: 'detail', 背景: 'detail', 外貌: 'appearance', 喜好: 'preferences', 偏好: 'preferences', 穿着偏好: 'preferences', 性格: 'personality', 人际关系: 'relationships', 关系: 'relationships', 技能: 'skills', essentialPreferenceLayers: 'essentialPreferenceLayers', 本质偏好: 'essentialPreferenceLayers', 价值立场偏好: 'essentialPreferenceLayers', 决策风格偏好: 'essentialPreferenceLayers', 人生六维偏好: 'essentialPreferenceLayers', 底线锚点偏好: 'essentialPreferenceLayers', 心理偏好: 'essentialPreferenceLayers' },

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
    if (text.includes('角色技能')) return '角色技能';
    if (text.includes('角色卡')) return '角色卡';
    return text;
  },

  normalizeUpdate(raw = {}) {
    const kind = this.normalizeKind(raw.kind);
    const field = this.normalizeField(raw.field || raw.name);
    const reason = String(raw.reason || raw.modifyReason || '').trim().slice(0, 160);
    if (!reason || !['角色卡', '角色技能'].includes(kind)) return null;
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
    if (update.kind === '角色技能' || update.field === 'skills') return this.applySkill(profile, update);
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
    return { at: new Date().toISOString(), skillId: update.kind === '角色技能' ? this.addSkillId : this.modifySkillId, field: this.displayField(update.field), name: update.name || update.field, value: update.value, reason: update.reason, applied };
  },
};
