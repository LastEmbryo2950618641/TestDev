/**
 * 核心交互动作。
 */
window.GameModules = window.GameModules || {};

window.GameModules.coreActions = {
  selectWork(name) {
    this.selectedWork = name;
    this.selectedCharacterId = window.GameModules.catalog.firstCharacter(name) || this.selectedCharacterId;
  },

  selectCharacter(id) {
    this.selectedCharacterId = id;
  },

  async start() {
    this.started = true;
    this.log = [];
    this.turn = 1;
    await this.ensureRpgForCurrentCharacter();
    this.mindText = `${this.character.name}感觉到意识深处多了一道陌生的注视。`;
    this.addLog('system', '系统', `操控链路已连接：${this.playerName} → ${this.character.name}`);
    this.addLog('story', '旁白', `${this.character.name}在一座异常安静的前厅醒来。视野边缘闪烁着「上线」标记。`);
    this.addLog('mind', `${this.character.name}的心理`, this.mindText);
    await this.save();
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
