/**
 * 进入时机：为每个世界固化历法，默认取小说最开始的剧情时间。
 */
window.GameModules = window.GameModules || {};

window.GameModules.entryTime = {
  async ensureCalendar(store) {
    const start = await this.storyStart(store);
    if (!start) throw new Error('剧情索引缺少可用的默认进入时间');
    const calendar = this.modernCalendar();
    store.entryTimeOptions = { ...store.entryTimeOptions, start };
    await this.persistCalendar(store, calendar);
    return calendar;
  },

  async persistCalendar(store, calendar) {
    const save = window.GameModules.sqliteSave;
    if (!save?.db) return;
    const worldTag = store.character.work || '原创世界';
    const lore = save.getWorldLore(worldTag);
    if (!lore) return;
    lore.calendar = calendar;
    await save.saveWorldLore(worldTag, lore);
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
    let start = store.entryTimeOptions.start || await this.storyStart(store);
    if (start) {
      const birth = await this.birthDateFor(store);
      if (birth && this.dateValue([birth.year, birth.month, birth.day, 0, 0, 0]) > this.dateValue([start.year, start.month, start.day, start.hour, start.minute, start.second])) {
        start = { year: birth.year, month: birth.month, day: birth.day, ...this.randomClock() };
      }
      store.entryCalendar = this.modernCalendar();
      return {
        years: this.unique([`${start.year}年`, ...this.nearYears({ units: { year: '年' } }, start.year)]),
        months: Array.from({ length: 12 }, (_, i) => `${i + 1}月`),
        days: Array.from({ length: 31 }, (_, i) => `${i + 1}日`),
        hours: this.unique([`${String(start.hour).padStart(2, '0')}时`, ...Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}时`)]),
        minutes: this.unique([`${String(start.minute).padStart(2, '0')}分`, ...Array.from({ length: 12 }, (_, i) => `${String(i * 5).padStart(2, '0')}分`)]),
        seconds: this.unique([`${String(start.second).padStart(2, '0')}秒`, ...Array.from({ length: 12 }, (_, i) => `${String(i * 5).padStart(2, '0')}秒`)]),
        start,
      };
    }
    throw new Error('剧情索引缺少可用的默认进入时间');
  },

  async storyStart(store) {
    const source = window.GameModules.characterBrief.sourceFor(store.character.work);
    console.log('[剧情起点] 查找剧情起点:', store.character.work, 'source=', source?.name || '未匹配');
    const precomputed = this.precomputedStart(store.character.work, source);
    if (precomputed) {
      console.log('[剧情起点] 使用预计算剧情起点:', precomputed);
      return precomputed;
    }
    if (!source) return null;
    const url = `${source.base}/02_按需加载_剧情/剧情索引.md`;
    console.log('[剧情起点] 读取剧情索引:', url);
    const text = await window.GameModules.rag.fetchText(url);
    const head = String(text || '').split('\n').slice(0, 50).join('\n');
    console.log('[剧情起点] 剧情索引读取完成:', { totalLength: String(text || '').length, headLength: head.length, preview: head.slice(0, 220) });
    const defaultTime = head.match(/默认进入剧情起始时间[:：]\s*(\d{3,4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
    if (defaultTime) {
      const parts = defaultTime.slice(1).map(Number);
      const result = { year: parts[0], month: parts[1], day: parts[2], hour: parts[3], minute: parts[4], second: parts[5] };
      console.log('[剧情起点] 命中默认进入剧情起始时间:', result);
      return result;
    }
    const times = [...head.matchAll(/\|\s*\d+\s*\|[^|]*\|\s*(\d{3,4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})\s*\|/g)];
    console.log('[剧情起点] 表格时间候选数量:', times.length);
    if (!times.length) return null;
    const first = times.map((m) => m.slice(1).map(Number)).sort((a, b) => this.dateValue(a) - this.dateValue(b))[0];
    const result = { year: first[0], month: first[1], day: first[2], hour: first[3], minute: first[4], second: first[5] };
    console.log('[剧情起点] 使用最早表格时间:', result);
    return result;
  },

  precomputedStart(work, source) {
    const starts = window.GameData?.storyStarts || {};
    const names = [work, source?.name, ...(source?.aliases || [])].filter(Boolean);
    return names.map((name) => starts[name]).find(Boolean) || null;
  },

  dateValue(parts) {
    return parts[0] * 1e10 + parts[1] * 1e8 + parts[2] * 1e6 + parts[3] * 1e4 + parts[4] * 100 + parts[5];
  },

  randomClock() {
    return {
      hour: Math.floor(Math.random() * 24),
      minute: Math.floor(Math.random() * 60),
      second: Math.floor(Math.random() * 60),
    };
  },

  async applyStart(store) {
    const start = store.entryTimeOptions.start;
    if (!start) return false;
    store.entryTime.year = `${start.year}年`;
    store.entryTime.month = `${start.month}月`;
    store.entryTime.day = `${start.day}日`;
    store.entryTime.hour = `${String(start.hour).padStart(2, '0')}时`;
    store.entryTime.minute = `${String(start.minute).padStart(2, '0')}分`;
    store.entryTime.second = `${String(start.second).padStart(2, '0')}秒`;
    await this.applyCharacterAge(store);
    return true;
  },

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
    store.characterAge = `${age}岁`;
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
    return dates[character.id] || dates[`${character.work}::${character.name}`] || null;
  },

  birthDate(profile) {
    const rows = profile?.basics || [];
    const value = rows.find((x) => /出生|生日|生年月日/.test(x.label))?.value || '';
    const source = value || profile?.raw || '';
    const match = String(source).match(/(\d{3,4})\s*[年\/-]\s*(\d{1,2})\s*[月\/-]\s*(\d{1,2})/);
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

  async storyContextFor(store) {
    const source = window.GameModules.characterBrief.sourceFor(store.character.work);
    const start = store.entryTimeOptions.start || await this.storyStart(store);
    const current = this.selectedDate(store.entryTime);
    if (!source || !start || !current) return '未读取到剧情索引上下文。';
    const url = `${source.base}/02_按需加载_剧情/剧情索引.md`;
    const text = await window.GameModules.rag.fetchText(url);
    const rows = this.storyIndexRows(text)
      .filter((row) => row.value >= this.dateValue([start.year, start.month, start.day, start.hour, start.minute, start.second]) && row.value <= this.dateValue(current))
      .sort((a, b) => a.value - b.value);
    const picked = this.pickStoryContextRows(rows, store.character);
    console.log('[剧情上下文] 起点到当前时间索引:', { total: rows.length, used: picked.length, current: store.entryTimeLabel(), character: store.character.name });
    if (!picked.length) return '剧情索引中没有命中起点到当前时间范围内的条目。';
    return `剧情索引范围：从小说起点到${store.entryTimeLabel()}，共${rows.length}条，以下为用于推演的摘要：\n${picked.map((row) => `${row.time}｜${row.title}｜人物:${row.people || '未标注'}｜${row.intro}`).join('\n')}`.slice(0, 4800);
  },

  pickStoryContextRows(rows, character) {
    if (rows.length <= 40) return rows;
    const names = [character.name, ...(character.aliases || [])].filter(Boolean);
    const related = rows.filter((row) => names.some((name) => `${row.title} ${row.intro} ${row.people || ''}`.includes(name)));
    const map = new Map();
    [...rows.slice(0, 8), ...related, ...rows.slice(-24)].forEach((row) => map.set(row.no, row));
    return [...map.values()].sort((a, b) => a.value - b.value).slice(-60);
  },

  storyIndexRows(markdown) {
    return String(markdown || '').split('\n').map((line) => {
      if (!/^\|\s*\d+\s*\|/.test(line)) return null;
      const cells = line.split('|').slice(1, -1).map((x) => x.trim());
      const time = cells[2] || '';
      const parts = (time.match(/(\d{3,4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/) || []).slice(1).map(Number);
      if (parts.length !== 6) return null;
      return { no: cells[0], title: cells[1], time, intro: cells[3] || '无摘要', people: cells[4] || '', file: cells[6], value: this.dateValue(parts) };
    }).filter(Boolean);
  },

  selectedDate(time) {
    const nums = [time.year, time.month, time.day, time.hour, time.minute, time.second].map((x) => parseInt(String(x || '').replace(/\D/g, ''), 10));
    return nums.every((x) => Number.isFinite(x)) ? nums : null;
  },

  unique(list) { return [...new Set(list.filter(Boolean))]; },
};
