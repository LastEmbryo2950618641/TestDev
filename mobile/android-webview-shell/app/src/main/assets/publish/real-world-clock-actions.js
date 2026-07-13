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
    const week = ['鍛ㄦ棩', '鍛ㄤ竴', '鍛ㄤ簩', '鍛ㄤ笁', '鍛ㄥ洓', '鍛ㄤ簲', '鍛ㄥ叚'][d.getDay()];
    return `${d.getFullYear()}骞?{d.getMonth() + 1}鏈?{d.getDate()}鏃?${week}`;
  },

  openRealWorldPanel() {
    if (!this.isRealCurrentWorld?.()) return this.routeCurrentWorldAction?.();
    this.collapseRealWorldThinking?.();
    this.realWorldOpen = true;
    this.checkWorkReminder?.();
    this.runAfterRealWorldPaint?.(() => {
      const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
      window.GameModules.realWorldLogStore?.saveAll?.(this.realWorldLog).then(() => this.refreshRealWorldLogPage?.(999999)).catch((err) => console.warn('[鐜板疄鏃ュ織] 鍒嗛〉鍒锋柊澶辫触:', err.message, err.stack));
      this.refreshRealWorldLogPage?.(999999);
      if (!this.realWorldLog.length) {
        if (map.current) this.seedRealWorldLog();
        else this.submitRealWorldAction('鏍规嵁鎴戠殑鐜板疄璧勬枡纭褰撳墠鎵€鍦ㄧ殑鍏蜂綋鍦扮偣锛屽苟寤虹珛鐢靛瓙鍦板浘鏍硅妭鐐?);
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
        this.fitRealWorldMapView?.();
      });
    }
    if (view === 'layouts') {
      this.backRealWorldLayoutCatalogList?.();
    }
  },
  closeRealWorldFunctionPanel() {
    this.realWorldFunctionOpen = false;
    this.realWorldFunctionView = 'menu';
    this.backRealWorldLayoutCatalogList?.();
  },
  openPhoneFromRealWorld() {
    this.realWorldFunctionOpen = false;
    this.closeRealWorldPanel();
    this.schedulePhoneWarmup?.();
  },

  realWorldFunctionTitle() {
    if (this.realWorldFunctionView === 'layouts' && this.realWorldLayoutCatalogTemplateId) {
      return this.realWorldLayoutCatalogSelected()?.name || '鎴峰瀷棰勮';
    }
    return { inventory: '鑳屽寘', wearing: '绌跨潃', map: '鐢靛瓙鍦板浘', generation: 'AI鐢熸垚鑼冨洿', layouts: '鎴峰瀷浠嬬粛' }[this.realWorldFunctionView] || '鐜板疄鍔熻兘';
  },
  realWorldFunctionEyebrow() {
    if (this.realWorldFunctionView === 'layouts' && this.realWorldLayoutCatalogTemplateId) return 'LAYOUT PREVIEW';
    return { inventory: 'INVENTORY', wearing: 'WEARING', map: 'E-MAP', generation: 'AI RANGE', layouts: 'LAYOUT GUIDE' }[this.realWorldFunctionView] || 'REAL WORLD';
  },
  realWorldFunctionHint() {
    if (this.realWorldFunctionView === 'layouts' && this.realWorldLayoutCatalogTemplateId) {
      return String(this.realWorldLayoutCatalogSelected()?.desc || '棰勭疆 Canvas 鎴峰瀷绀烘剰锛孉I 瑙ｉ攣鍦板浘鏃跺彲閫夌敤銆?);
    }
    return {
      inventory: '鏌ョ湅鐜╁鏈汉褰撳墠鎸佹湁鎴栧彲璋冪敤鐨勮澶囦笌鐗╁搧銆?,
      wearing: '鏌ョ湅鍐呰。銆佷笂琛ｃ€佷笅琛ｃ€侀瀷瀛愩€侀グ鍝佸拰瑁呭妲戒綅绛夊綋鍓嶇┛鎴淬€?,
      map: '鏌ョ湅褰撳墠鐜板疄鍦扮偣鏍戯紝灞曞紑瀛愬湴鐐规垨鏌ョ湅鍦扮偣璇存槑銆?,
      generation: '璁剧疆鐜板疄鎺ㄦ紨鐨勮鍔ㄨ竟鐣屻€佽嚜鐢卞彂鎸ユ垨瀛楁暟瑕佹眰銆?,
      layouts: '娴忚鍏ㄩ儴棰勭疆鎴峰瀷妯℃澘锛岀偣鍑绘煡鐪?Canvas 甯冨眬绀烘剰銆?,
    }[this.realWorldFunctionView] || '閫夋嫨鐜板疄涓栫晫涓鎵ц鐨勫姛鑳姐€?;
  },

  seedRealWorldLog() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    if (!map.current) return;
    const now = this.phoneDate();
    const entry = {
      id: this.nextId++, type: 'system', locationName: map.current, time: { label: `${this.phoneDateText()} ${this.phoneTimeText()}`, iso: now.toISOString() }, createdAt: now.toISOString(),
      narration: '浣犳妸鎵嬫満灞忓箷鍘嬫殫锛岀幇瀹炰笘鐣岀殑澹伴煶閲嶆柊娴笂鏉ャ€傜啛鎮夌殑绌洪棿浠嶄繚鎸佺潃鍘熸湰鐨勭З搴忥紝浣嗛偅鍙版柊鎵嬫満甯︽潵鐨勫紓甯告劅骞舵病鏈夋秷澶便€?,
      thinking: '鐜板疄涓栫晫鎺ㄦ紨宸叉帴鍏ョ帺瀹舵湰浜鸿祫鏂欙紝鍙拷韪墜鏈哄鐨勭幇瀹炶鍔ㄣ€?,
    };
    this.assignRealWorldlineEntry(entry);
    this.realWorldLog = [entry];
    window.GameModules.realWorldLogStore?.append?.(entry).then(() => this.refreshRealWorldLogPage?.(999999)).catch((err) => console.warn('[鐜板疄鏃ュ織] 鍒濆璁板綍淇濆瓨澶辫触:', err.message, err.stack));
  },
};
