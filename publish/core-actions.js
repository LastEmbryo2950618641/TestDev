/**
 * 核心交互动作。
 */
window.GameModules = window.GameModules || {};

window.GameModules.coreActions = {
  openDesktopApp() {
    this.appClosing = false;
    this.appSwitcherOpen = false;
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    this.appHasOpened = true;
    this.desktopUnlocked = true;
  },

  appGestureStart(event) {
    const fromGestureZone = event.target.closest('.app-home-gesture');
    if (this.loading || (!fromGestureZone && event.target.closest('input, textarea, select'))) return;
    const y = event.clientY || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    if (!fromGestureZone && viewportHeight && y < viewportHeight - 88) return;
    event.preventDefault();
    if (this.appDragging) return;
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    this.appGesturePointerId = event.pointerId;
    this.appDragStartY = y;
    this.appDragY = 0;
    this.appDragPeakY = 0;
    this.appGestureFromHomeZone = Boolean(fromGestureZone);
    this.appDragging = true;
  },

  appGestureMove(event) {
    if (!this.appDragging || (this.appGesturePointerId !== null && event.pointerId !== this.appGesturePointerId)) return;
    event.preventDefault();
    this.appDragY = Math.min(0, (event.clientY || 0) - this.appDragStartY);
    this.appDragPeakY = Math.min(this.appDragPeakY || 0, this.appDragY);
  },

  appGestureEnd(event = null) {
    if (!this.appDragging || (event && this.appGesturePointerId !== null && event.pointerId !== this.appGesturePointerId)) return;
    const distance = Math.abs(Math.min(this.appDragY, this.appDragPeakY || 0));
    const threshold = this.appGestureFromHomeZone ? 28 : 88;
    const shouldClose = distance >= threshold;
    if (shouldClose) {
      this.closeAppToDesktop();
      return;
    }
    this.appDragging = false;
    this.appGesturePointerId = null;
    this.appDragY = 0;
    this.appDragPeakY = 0;
    this.appGestureFromHomeZone = false;
  },

  appWindowStyle() {
    const y = this.appDragging ? this.appDragY : 0;
    const scale = this.appDragging ? Math.max(.76, 1 - Math.abs(y) / 560) : 1;
    return `transform: translateY(${y}px) scale(${scale});`;
  },

  closeAppToDesktop(keepBackground = true) {
    if (this.appClosing) return;
    this.appDragging = false;
    this.appGesturePointerId = null;
    this.appDragY = 0;
    this.appDragPeakY = 0;
    this.appGestureFromHomeZone = false;
    this.desktopUnlocked = false;
    this.appHasOpened = keepBackground;
    this.appClosing = true;
    window.setTimeout(() => {
      this.appClosing = false;
      this.appSwitcherOpen = false;
      this.identityAppOpen = false;
      this.wechatAppOpen = false;
    }, 260);
  },

  hasBackgroundApp() {
    return Boolean(this.appHasOpened || this.started || this.entrySetupOpen);
  },

  desktopGestureStart(event) {
    if (this.desktopUnlocked || event.target.closest('button')) return;
    this.desktopDragStartY = event.clientY || 0;
    this.desktopDragY = 0;
    this.desktopDragging = true;
  },

  desktopGestureMove(event) {
    if (!this.desktopDragging) return;
    this.desktopDragY = Math.min(0, (event.clientY || 0) - this.desktopDragStartY);
  },

  desktopGestureEnd() {
    if (!this.desktopDragging) return;
    const shouldShowSwitcher = this.desktopDragY < -70 && this.hasBackgroundApp();
    this.desktopDragging = false;
    this.desktopDragY = 0;
    if (shouldShowSwitcher) this.appSwitcherOpen = true;
  },

  restoreBackgroundApp() {
    this.appSwitcherOpen = false;
    this.openDesktopApp();
  },

  closeSwitcher() {
    this.appSwitcherOpen = false;
  },

  selectWork(name) {
    this.selectedWork = name;
    this.selectedCharacterId = window.GameModules.catalog.firstCharacter(name) || this.selectedCharacterId;
    this.resetEntryTime();
    this.resetMetricsForCharacter();
    window.GameModules.characterBrief.ensure(this);
    this.prepareRpgSchemaForSelectedWork();
  },

  selectCharacter(id) {
    this.selectedCharacterId = id;
    this.resetEntryTime();
    this.resetMetricsForCharacter();
    window.GameModules.characterBrief.ensure(this);
    this.prepareRpgSchemaForSelectedWork();
  },

  resetMetricsForCharacter() {
    const metrics = window.GameModules.metrics.fresh();
    this.emotions = metrics.emotions;
    this.playerFeelings = metrics.playerFeelings;
    this.metricsReady = false;
    this.metricNotes = {};
    this.trust = this.playerFeelings.信任;
    this.resistance = this.playerFeelings.反抗;
    this.expandedMetricKey = '';
  },

  resetEntryTime() {
    this.entryCalendar = null;
    this.characterAge = '';
    this.entryTime = { year: '', month: '', day: '', hour: '', minute: '', second: '' };
    this.entryTimeOptions = { years: [], months: [], days: [], hours: [], minutes: [], seconds: [], start: null };
    this.entryCurrentAction = '';
    this.entrySetupOpen = false;
  },

  openCharacterDetail() {
    window.GameModules.characterBrief.ensure(this);
    this.characterDetailOpen = true;
  },

  backToHome() {
    if (this.busy) return;
    this.entrySetupOpen = false;
    this.entryCurrentAction = '';
  },

  entryAgeLabel() {
    if (this.characterAge) return this.characterAge;
    if (this.busy || !this.entryTimeOptions.start) return '计算中…';
    return '出生日期缺失';
  },

  async start() {
    await this.prepareEntrySetup();
  },

  async setOnline(value) {
    if (this.online === value || this.busy) return;
    this.online = value;
    if (value && this.controlMode === 'possess') {
      this.metricsReady = false;
      const feedback = await window.GameModules.characterFeedback.initial(this);
      this.mood = feedback.mood;
      this.resistance = feedback.resistance;
      this.mindText = feedback.mind;
      this.feedbackSource = feedback.source || 'fallback';
      this.characterIntent = feedback.intent;
      console.log('[角色反馈] 切换在线生成结果:', { source: this.feedbackSource, mindLength: String(this.mindText || '').length, intentLength: String(this.characterIntent || '').length });
      this.choices = feedback.choices || this.choices;
      this.applyInitialMetrics(feedback.metricUpdates);
      await window.GameModules.characterFeedback.applyExperience(this, feedback);
    }
    this.save();
  },

  async submitFreeInput() {
    const action = this.input.trim();
    if (!action) return;
    this.input = '';
    await this.submitAction(action);
  },

  async autoplay() {
    await this.submitAction(this.online ? '按照当前局势做最有效的行动' : '让角色完全自主决定下一步');
  },
};
