/**
 * 核心交互动作。
 */
window.GameModules = window.GameModules || {};

window.GameModules.coreActions = {
  selectWork(name) {
    this.selectedWork = name;
    this.selectedCharacterId = window.GameModules.catalog.firstCharacter(name) || this.selectedCharacterId;
    this.resetEntryTime();
    window.GameModules.characterBrief.ensure(this);
    this.prepareRpgForSelectedCharacter();
  },

  selectCharacter(id) {
    this.selectedCharacterId = id;
    this.resetEntryTime();
    window.GameModules.characterBrief.ensure(this);
    this.prepareRpgForSelectedCharacter();
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
    const text = value && this.controlMode === 'possess'
      ? '第二人称上线：身体突然不受角色控制；角色不知道控制来源，只能旁观身体行动但五感仍在。'
      : (value ? '操控者上线，角色身体行动权被接管。' : '操控者下线，角色重新获得身体控制权。');
    this.addLog('system', '控制权', text);
    if (value && this.controlMode === 'possess') {
      const feedback = await window.GameModules.characterFeedback.initial(this);
      this.mood = feedback.mood;
      this.resistance = feedback.resistance;
      this.mindText = feedback.mind;
      this.characterIntent = feedback.intent;
      this.choices = feedback.choices || this.choices;
      this.applyInitialMetrics(feedback.metricUpdates);
      await window.GameModules.characterFeedback.applyExperience(this, feedback);
      this.addLog('mind', `${this.character.name}的心理`, this.mindText);
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
