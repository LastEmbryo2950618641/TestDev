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
  },

  selectCharacter(id) {
    this.selectedCharacterId = id;
    this.resetEntryTime();
    window.GameModules.characterBrief.ensure(this);
  },

  resetEntryTime() {
    this.entryCalendar = null;
    this.entryTime.year = '';
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
    const rows = this.characterProfiles[this.character.id]?.basics || [];
    const age = rows.find((x) => /年龄|年纪|岁数/.test(x.label))?.value;
    const detailAge = (String(this.character.detail || '').match(/(?:年龄[:：|｜\s]*)?([^｜|，,。\s]*\d+[^｜|，,。\s]*)/) || [])[1];
    return age || detailAge || '未知';
  },

  async start() {
    await this.prepareEntrySetup();
  },

  setOnline(value) {
    if (this.online === value) return;
    this.online = value;
    const text = value ? '操控者上线，角色身体行动权被接管。' : '操控者下线，角色重新获得身体控制权。';
    this.addLog('system', '控制权', text);
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
