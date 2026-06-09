/**
 * 进入时机：为每个世界固化历法，选择进入时间并生成角色当前行动。
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
    if (/Fate|现代|公元|圣杯|魔术/.test(text)) return this.modernCalendar();
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
    const base = await window.GameModules.entryYear.baseYear(calendar, store);
    return {
      years: [await window.GameModules.entryYear.targetYear(calendar, store, base), ...this.nearYears(calendar, base)],
      months: calendar.months,
      days: Array.from({ length: Math.min(calendar.days || 30, 31) }, (_, i) => `${i + 1}${calendar.units.day}`),
      hours: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}时`),
      minutes: Array.from({ length: 12 }, (_, i) => `${String(i * 5).padStart(2, '0')}分`),
      seconds: Array.from({ length: 12 }, (_, i) => `${String(i * 5).padStart(2, '0')}秒`),
    };
  },

  nearYears(calendar, base) {
    const unit = calendar.units.year || '年';
    return [-1, 1, 3].map((delta) => `${base + delta}${unit}`);
  },

  format(time, calendar) {
    return `${calendar.label}｜${time.year} ${time.month} ${time.day} ${time.hour}${time.minute}${time.second}`;
  },
};
