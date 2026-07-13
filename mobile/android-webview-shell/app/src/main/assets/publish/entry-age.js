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
      store.characterAge = at ? '鍑虹敓鏃ユ湡缂哄け' : '';
      if (state?.values) {
        delete state.values.age;
        delete state.values.age_label;
        store.rpgStates = { ...store.rpgStates, [state.id]: state };
        if (window.GameModules.platform.storage.capabilities.isReady?.()) window.GameModules.characterStateStore?.save?.(state);
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
      if (window.GameModules.platform.storage.capabilities.isReady?.()) window.GameModules.characterStateStore?.save?.(state);
    }
  },

  ensureAgeField(state) {
    const section = state.schema?.sections?.[0];
    if (!section || section.fields.some((field) => field.key === 'age')) return;
    section.fields.unshift({ key: 'age', label: '骞撮緞', type: 'number', min: 0, max: 999 });
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
    const value = rows.find((x) => /出生|生日|生年|出生年|鍑虹敓|鐢熸棩|鐢熷勾/.test(x.label))?.value || '';
    const source = String(value || profile?.raw || '');
    if (/不明|年份不明|不详|未知|涓嶆槑|骞翠唤涓嶆槑/.test(source)) return null;
    const match = source.match(/(\d{3,4})\s*(?:年|骞碶|-|\/)\s*(\d{1,2})\s*(?:月|鏈圽|-|\/)\s*(\d{1,2})/);
    if (match) return this.completeBirthDate({ year: +match[1], month: +match[2], day: +match[3], precision: 'day' });
    if (/约|左右|绾/.test(source)) {
      const yearOnly = source.match(/(\d{3,4})\s*(?:年|骞?)/);
      return this.completeBirthDate(yearOnly ? { year: +yearOnly[1], precision: 'year' } : null);
    }
    const yearOnly = source.match(/(\d{3,4})\s*(?:年|骞?)/);
    return this.completeBirthDate(yearOnly ? { year: +yearOnly[1], precision: 'year' } : null);
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
