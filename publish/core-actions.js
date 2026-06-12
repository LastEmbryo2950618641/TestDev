/**
 * 核心交互动作。
 */
window.GameModules = window.GameModules || {};

window.GameModules.coreActions = {
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
