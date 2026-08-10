/**
 * 进入时机：为每个世界固化历法，默认取作品元数据声明的剧情开始时间。
 */
window.GameModules = window.GameModules || {};

window.GameModules.entryTime = {
  async ensureCalendar(store) {
    const start = await this.storyStart(store);
    if (!start) throw new Error('作品元数据缺少可用的默认进入时间');
    const calendar = this.modernCalendar();
    store.entryTimeOptions = { ...store.entryTimeOptions, start };
    await this.persistCalendar(store, calendar);
    return calendar;
  },

  async persistCalendar(store, calendar) {
    const loreStore = window.GameModules.worldLoreStore;
    const worldTag = store.character.work || '原创世界';
    const lore = loreStore?.get?.(worldTag);
    if (!lore) return;
    lore.calendar = calendar;
    await loreStore?.save?.(worldTag, lore);
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
    throw new Error('作品元数据缺少可用的默认进入时间');
  },

  async storyStart(store) {
    const source = window.GameModules.characterBrief.sourceFor(store.character.work);
    console.log('[剧情起点] 查找元数据剧情起点:', store.character.work, 'source=', source?.name || '未匹配');
    const precomputed = this.precomputedStart(store.character.work, source);
    if (precomputed) {
      console.log('[剧情起点] 使用元数据剧情起点:', precomputed);
      return precomputed;
    }
    console.warn('[剧情起点] 作品元数据未声明剧情起点:', store.character.work, 'source=', source?.name || '未匹配');
    return null;
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
