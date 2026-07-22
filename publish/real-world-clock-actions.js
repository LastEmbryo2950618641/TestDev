window.GameModules = window.GameModules || {};

window.GameModules.realWorldClockActions = {
  runAfterRealWorldPaint(callback) {
    const run = () => {
      try { callback?.(); } catch (err) { console.warn('[real-world] deferred task failed:', err?.message || err); }
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(run, 0));
    else setTimeout(run, 0);
  },

  startPhoneClock() {
    this.ensurePhoneFixedTime();
    this.phoneClockStamp = Date.now();
  },

  ensurePhoneFixedTime() {
    const initialized = new Date(this.playerProfile?.initializedAt || Date.now()).getTime();
    const base = Number.isFinite(initialized) && initialized > 946684800000 ? initialized : Date.now();
    const current = Number(this.phoneFixedTime);
    if (!Number.isFinite(current) || current <= 946684800000) this.phoneFixedTime = base;
    this.refreshPhoneClockLabels?.();
  },

  advancePhoneTime(seconds = 60) {
    this.ensurePhoneFixedTime();
    const delta = Math.max(0, Math.min(2592000, Math.round(Number(seconds) || 0))) * 1000;
    this.phoneFixedTime += delta;
    this.refreshPhoneClockLabels?.();
  },

  phoneDate() { this.ensurePhoneFixedTime(); return new Date(this.phoneFixedTime); },

  phoneTimeText() {
    const d = this.phoneDate();
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map((x) => String(x).padStart(2, '0')).join(':');
  },

  phoneTimeShortText() {
    void this.phoneClockStamp;
    return this.phoneClockLabelShort || '--:--';
  },

  phoneTimeDisplayText() {
    void this.phoneClockStamp;
    return this.phoneClockLabelFull || '--:--:--';
  },

  phoneDateText() {
    const d = this.phoneDate();
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${week}`;
  },

  openRealWorldPanel() {
    if (!this.isRealCurrentWorld?.()) return this.routeCurrentWorldAction?.();
    this.collapseRealWorldThinking?.();
    this.realWorldOpen = true;
    this.checkWorkReminder?.();
    this.runAfterRealWorldPaint?.(() => {
      const map = window.GameModules.realWorldMap.ensure(this, window.GameModules.currentLocationField?.roleProfile?.(this) || {});
      const total = window.GameModules.realWorldLogStore?.count?.() || 0;
      if (total <= 0 && (this.realWorldLog || []).length) {
        window.GameModules.realWorldLogStore?.saveAll?.(this.realWorldLog).then(() => this.refreshRealWorldLogPage?.(999999)).catch((err) => console.warn('[现实日志] 分页刷新失败:', err.message, err.stack));
      }
      const pageSize = Math.max(1, Number(this.realWorldLogPageSize) || 12);
      const maxPage = Math.max(1, Math.ceil(total / pageSize));
      const loadedLatest = total > 0
        && (this.realWorldLog || []).length > 0
        && Number(this.realWorldLogTotal || 0) === total
        && Number(this.realWorldLogPage || 1) === maxPage;
      if (!loadedLatest) this.refreshRealWorldLogPage?.(999999);
      if (!this.realWorldLog.length) {
        if (map.current) this.seedRealWorldLog();
        else this.submitRealWorldAction('根据我的现实资料确认当前所在的具体地点，并建立电子地图根节点');
      }
    });
  },

  closeRealWorldPanel() {
    this.collapseRealWorldThinking?.();
    this.realWorldOpen = false;
    this.realWorldFunctionOpen = false;
  },

  openRealWorldFunctionPanel(view = 'menu') {
    this.realWorldFunctionView = view;
    this.realWorldFunctionOpen = true;
    if (view === 'map') {
      this.runAfterRealWorldPaint?.(() => {
        this.ensureRealWorldMapNativeInput?.();
        this.refreshRealWorldMapJsonDump?.();
        this.fitRealWorldMapView?.();
      });
    }
  },
  closeRealWorldFunctionPanel() {
    this.realWorldFunctionOpen = false;
    this.realWorldFunctionView = 'menu';
  },
  openPhoneFromRealWorld() {
    this.realWorldFunctionOpen = false;
    this.closeRealWorldPanel();
    this.schedulePhoneWarmup?.();
  },

  realWorldFunctionTitle() {
    return { inventory: '背包', wearing: '穿着', map: '电子地图', generation: 'AI生成范围' }[this.realWorldFunctionView] || '现实功能';
  },
  realWorldFunctionEyebrow() {
    return { inventory: 'INVENTORY', wearing: 'WEARING', map: 'E-MAP', generation: 'AI RANGE' }[this.realWorldFunctionView] || 'REAL WORLD';
  },
  realWorldFunctionHint() {
    return {
      inventory: '查看玩家本人当前持有或可调用的装备与物品。',
      wearing: '查看内衣、上衣、下衣、鞋子、饰品和装备槽位等当前穿戴。',
      map: '查看当前现实地点树，展开子地点或查看地点说明。',
      generation: '设置现实推演的行动边界、自由发挥或字数要求。',
    }[this.realWorldFunctionView] || '选择现实世界中要执行的功能。';
  },

  seedRealWorldLog() {
    const map = window.GameModules.realWorldMap.ensure(this, window.GameModules.currentLocationField?.roleProfile?.(this) || {});
    if (!map.current) return;
    const now = this.phoneDate();
    const entry = {
      id: this.nextId++, type: 'system', locationName: map.current, time: { label: `${this.phoneDateText()} ${this.phoneTimeText()}`, iso: now.toISOString() }, createdAt: now.toISOString(),
      narration: '你把手机屏幕压暗，现实世界的声音重新浮上来。熟悉的空间仍保持着原本的秩序，但那台新手机带来的异常感并没有消失。',
      thinking: '现实世界推演已接入玩家本人资料，只追踪手机外的现实行动。',
    };
    this.assignRealWorldlineEntry(entry);
    this.realWorldLog = [entry];
    window.GameModules.realWorldLogStore?.append?.(entry).then(() => this.refreshRealWorldLogPage?.(999999)).catch((err) => console.warn('[现实日志] 初始记录保存失败:', err.message, err.stack));
  },
};
