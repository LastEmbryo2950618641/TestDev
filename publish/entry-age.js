window.GameModules = window.GameModules || {};
window.GameModules.entryTime = window.GameModules.entryTime || {};

Object.assign(window.GameModules.entryTime, {
  async applyCharacterAge(store) {
    const at = this.selectedDate(store.entryTime) || (store.entryTimeOptions.start ? [
      store.entryTimeOptions.start.year,
      store.entryTimeOptions.start.month,
      store.entryTimeOptions.start.day,
      store.entryTimeOptions.start.hour,
      store.entryTimeOptions.start.minute,
      store.entryTimeOptions.start.second,
    ] : null);
    const birth = await this.birthDateFor(store);
    const age = this.ageAt(birth, at ? { year: at[0], month: at[1], day: at[2] } : null);
    const state = store.rpgStates[store.character.id];
    if (age === null) {
      store.characterAge = at ? '出生日期缺失' : '';
      if (state?.values) {
        delete state.values.age;
        delete state.values.age_label;
        store.rpgStates = { ...store.rpgStates, [state.id]: state };
        if (window.GameModules.sqliteSave.db) window.GameModules.sqliteSave.saveCharacterState(state);
      }
      return;
    }
    const ageLabel = birth.month && birth.day ? `${age}岁` : `约${age}岁`;
    store.characterAge = ageLabel;
    if (state?.values) {
      this.ensureAgeField(state);
      state.values.age = age;
      state.values.age_label = ageLabel;
      store.rpgStates = { ...store.rpgStates, [state.id]: state };
      if (window.GameModules.sqliteSave.db) window.GameModules.sqliteSave.saveCharacterState(state);
    }
  },

  ensureAgeField(state) {
    const section = state.schema?.sections?.[0];
    if (!section || section.fields.some((field) => field.key === 'age')) return;
    section.fields.unshift({ key: 'age', label: '年龄', type: 'number', min: 0, max: 999 });
  },

  async birthDateFor(store) {
    const character = store.character;
    const indexed = this.birthDateFromData(character);
    if (indexed) return indexed;
    const current = this.birthDate(store.characterProfiles[character.id]);
    if (current) return current;
    const profile = await window.GameModules.characterBrief.loadProfile(character);
    store.characterProfiles = { ...store.characterProfiles, [character.id]: profile };
    return this.birthDate(profile);
  },

  birthDateFromData(character) {
    const dates = window.GameData?.characterBirthDates || {};
    const date = dates[character.id] || dates[`${character.work}::${character.name}`] || null;
    return this.completeBirthDate(date);
  },

  birthDate(profile) {
    const rows = profile?.basics || [];
    const value = rows.find((x) => /出生|生日|生年月日/.test(x.label))?.value || '';
    const source = String(value || profile?.raw || '');
    if (/不明|年份不明|公元前|年-\d{3,4}年|以前/.test(source)) return null;
    if (/约/.test(source)) {
      const yearOnly = source.match(/(\d{3,4})\s*年/);
      return this.completeBirthDate(yearOnly ? { year: +yearOnly[1], precision: 'year' } : null);
    }
    const match = source.match(/(\d{3,4})\s*[年\/-]\s*(\d{1,2})\s*[月\/-]\s*(\d{1,2})/);
    return this.completeBirthDate(match ? { year: +match[1], month: +match[2], day: +match[3], precision: 'day' } : null);
  },

  completeBirthDate(date) {
    if (!date || !date.year) return null;
    const birth = { year: +date.year };
    if (date.precision === 'day' && date.month && date.day) {
      birth.month = +date.month;
      birth.day = +date.day;
    }
    return birth;
  },

  ageAt(birth, at) {
    if (!birth || !at || !birth.year) return null;
    let age = at.year - birth.year;
    if (birth.month && birth.day && (at.month < birth.month || (at.month === birth.month && at.day < birth.day))) age -= 1;
    return age >= 0 && age < 1000 ? age : null;
  },
});
