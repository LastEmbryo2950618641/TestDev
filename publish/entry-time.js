/**
 * 进入时机：为每个世界固化历法，默认取小说最开始的剧情时间。
 */
window.GameModules = window.GameModules || {};

window.GameModules.entryTime = {
  async ensureCalendar(store) {
    const lore = await window.GameModules.worldLore.ensure(store.character.work || '原创世界', store.sceneTitle || '进入前');
    if (lore.calendar?.months?.length) return lore.calendar;
    lore.calendar = this.calendarFor(lore.worldTag, lore);
    await window.GameModules.sqliteSave.saveWorldLore(lore.worldTag, lore);
    return lore.calendar;
  },

  calendarFor(worldTag, lore) {
    const text = `${worldTag} ${lore.background || ''} ${(lore.coreRules || []).join(' ')}`;
    if (/Fate|现代|公元|圣杯|魔术|学校|都市/.test(text)) return this.modernCalendar();
    if (/五行|金|木|水|火|土|灵|仙|修/.test(text)) return this.wuxingCalendar();
    return this.fantasyCalendar(worldTag);
  },

  modernCalendar() {
    return { label: '公元纪年', units: { year: '年', month: '月', day: '日', hour: '时' }, months: Array.from({ length: 12 }, (_, i) => `${i + 1}月`), days: 31, hours: ['清晨', '上午', '午后', '黄昏', '深夜'] };
  },

  wuxingCalendar() {
    return { label: '五行轮纪', units: { year: '轮', month: '相', day: '刻日', hour: '时辰' }, months: ['木生相', '火盛相', '土衡相', '金肃相', '水藏相'], days: 30, hours: ['卯木时', '午火时', '酉金时', '子水时'] };
  },

  fantasyCalendar(worldTag) {
    const base = String(worldTag || '异界').slice(0, 4);
    return { label: `${base}历`, units: { year: '纪年', month: '月', day: '日', hour: '时段' }, months: ['新芽月', '晴火月', '长雨月', '白霜月'], days: 28, hours: ['晨祷', '正昼', '暮钟', '星夜'] };
  },

  async options(calendar, store) {
    const start = await this.storyStart(store);
    const base = start?.year || await window.GameModules.entryYear.baseYear(calendar, store);
    const unit = start ? '年' : (calendar.units.year || '年');
    const startMonth = start ? `${start.month}月` : '';
    const startDay = start ? `${start.day}日` : '';
    return {
      years: this.unique([`${base}${unit}`, ...this.nearYears({ units: { year: unit } }, base)]),
      months: this.unique([startMonth, ...calendar.months]),
      days: this.unique([startDay, ...Array.from({ length: Math.min(calendar.days || 30, 31) }, (_, i) => `${i + 1}${start ? '日' : calendar.units.day}`)]),
      hours: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}时`),
      minutes: Array.from({ length: 12 }, (_, i) => `${String(i * 5).padStart(2, '0')}分`),
      seconds: Array.from({ length: 12 }, (_, i) => `${String(i * 5).padStart(2, '0')}秒`),
      start,
    };
  },

  async storyStart(store) {
    const source = window.GameModules.characterBrief.sourceFor(store.character.work);
    if (!source) return null;
    const text = await window.GameModules.rag.fetchText(`${source.base}/02_按需加载_剧情/剧情索引.md`);
    const head = String(text || '').split('\n').slice(0, 50).join('\n');
    const times = [...head.matchAll(/(\d{3,4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/g)];
    if (!times.length) return null;
    const first = times.map((m) => m.slice(1).map(Number)).sort((a, b) => this.dateValue(a) - this.dateValue(b))[0];
    return { year: first[0], month: first[1], day: first[2], hour: first[3], minute: first[4], second: first[5] };
  },

  dateValue(parts) {
    return parts[0] * 1e10 + parts[1] * 1e8 + parts[2] * 1e6 + parts[3] * 1e4 + parts[4] * 100 + parts[5];
  },

  applyStart(store) {
    const start = store.entryTimeOptions.start;
    if (!start) return false;
    store.entryTime.month = `${start.month}月`;
    store.entryTime.day = `${start.day}日`;
    store.entryTime.hour = `${String(start.hour).padStart(2, '0')}时`;
    store.entryTime.minute = `${String(start.minute).padStart(2, '0')}分`;
    store.entryTime.second = `${String(start.second).padStart(2, '0')}秒`;
    this.applyCharacterAge(store);
    return true;
  },

  applyCharacterAge(store) {
    const start = store.entryTimeOptions.start;
    const birth = this.birthDate(store.characterProfiles[store.character.id]);
    const age = this.ageAt(birth, start);
    if (age === null) return;
    store.characterAge = `${age}岁`;
    const state = store.rpgStates[store.character.id];
    if (state?.values) {
      this.ensureAgeField(state);
      state.values.age = age;
      state.values.age_label = `${age}岁`;
      store.rpgStates = { ...store.rpgStates, [state.id]: state };
      if (window.GameModules.sqliteSave.db) window.GameModules.sqliteSave.saveCharacterState(state);
    }
  },

  ensureAgeField(state) {
    const section = state.schema?.sections?.[0];
    if (!section || section.fields.some((field) => field.key === 'age')) return;
    section.fields.unshift({ key: 'age', label: '年龄', type: 'number', min: 0, max: 999 });
  },

  birthDate(profile) {
    const rows = profile?.basics || [];
    const value = rows.find((x) => /出生|生日|生年月日/.test(x.label))?.value || '';
    const match = String(value).match(/(\d{3,4})[年\/-](\d{1,2})[月\/-](\d{1,2})/);
    return match ? { year: +match[1], month: +match[2], day: +match[3] } : null;
  },

  ageAt(birth, at) {
    if (!birth || !at) return null;
    let age = at.year - birth.year;
    if (at.month < birth.month || (at.month === birth.month && at.day < birth.day)) age -= 1;
    return age >= 0 && age < 1000 ? age : null;
  },

  nearYears(calendar, base) {
    const unit = calendar.units.year || '年';
    return [-1, 1, 3].map((delta) => `${base + delta}${unit}`);
  },

  format(time, calendar) {
    const hasRealDate = /^\d{3,4}年$/.test(time.year) && /月$/.test(time.month) && /日$/.test(time.day);
    const label = hasRealDate ? '剧情起始时间' : calendar.label;
    return `${label}｜${time.year} ${time.month} ${time.day} ${time.hour}${time.minute}${time.second}`;
  },

  unique(list) { return [...new Set(list.filter(Boolean))]; },
};
