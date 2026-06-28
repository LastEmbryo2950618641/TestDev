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
    // 首页只读取本地人物设定/目录资料，不预热 RPG schema，避免选择作品时触发 AI 请求。
    window.GameModules.characterBrief.ensure(this);
  },

  selectCharacter(id) {
    this.selectedCharacterId = id;
    this.resetEntryTime();
    this.resetMetricsForCharacter();
    // 首页只读取本地人物设定/目录资料，不生成完整角色卡，避免选择角色时消耗 token。
    window.GameModules.characterBrief.ensure(this);
  },

  resetMetricsForCharacter() {
    const metrics = window.GameModules.metrics.fresh();
    this.emotions = metrics.emotions;
    this.playerFeelings = metrics.playerFeelings;
    this.temporaryEmotions = {};
    this.temporaryPlayerFeelings = {};
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
    this.entryIdentityOpen = false;
  },

  controlRoleList() {
    return Object.values(this.rpgStates || {})
      .filter((state) => state?.id && state.id !== 'player-self')
      .map((state) => ({ state, character: window.GameModules.catalog.find(state.id) || state.profile || { id: state.id, name: state.name || state.profile?.name || '未知角色', mark: state.profile?.mark || '控', role: state.profile?.role || '可上线角色', work: state.profile?.work || state.worldTag || '未知世界' } }))
      .sort((a, b) => String(a.character.work || '').localeCompare(String(b.character.work || ''), 'zh-Hans') || String(a.character.name || '').localeCompare(String(b.character.name || ''), 'zh-Hans'));
  },

  async connectControlRole(id) {
    if (!id || this.busy) return;
    const found = window.GameModules.catalog.find(id);
    if (found) {
      this.selectedWork = found.work || this.selectedWork;
      this.selectedCharacterId = found.id;
    } else {
      this.selectedCharacterId = id;
    }
    this.started = false;
    this.controlSelectOpen = false;
    await this.start();
  },

  openControlCharacterAdd() {
    this.started = false;
    this.controlSelectOpen = false;
    this.entrySetupOpen = false;
    window.GameModules.characterBrief.ensure(this);
  },

  openCharacterDetail() {
    window.GameModules.characterBrief.ensure(this);
    this.characterDetailOpen = true;
  },

  backToHome() {
    if (this.busy) return;
    this.entrySetupOpen = false;
    this.controlSelectOpen = true;
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
      this.loadMetricsFromCharacterState();
      const feedback = await window.GameModules.characterFeedback.initial(this);
      this.mindText = feedback.mind;
      this.feedbackSource = feedback.source || 'fallback';
      this.characterIntent = feedback.intent;
      console.debug('[角色反馈] 切换在线生成结果:', { source: this.feedbackSource, mindLength: String(this.mindText || '').length, intentLength: String(this.characterIntent || '').length });
      this.choices = feedback.choices || this.choices;
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
