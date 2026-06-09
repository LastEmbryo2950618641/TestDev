/**
 * 进入配置动作：选择时机、推进时间、选择操控方式后进入。
 */
window.GameModules = window.GameModules || {};

window.GameModules.entryActions = {
  async prepareEntrySetup() {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.ensureRpgForCurrentCharacter();
      const calendar = await window.GameModules.entryTime.ensureCalendar(this);
      this.entryCalendar = calendar;
      this.entryTimeOptions = window.GameModules.entryTime.options(calendar);
      this.entryTime = {
        year: this.entryTime.year || this.entryTimeOptions.years[0],
        month: this.entryTime.month || this.entryTimeOptions.months[0],
        day: this.entryTime.day || this.entryTimeOptions.days[0],
        hour: this.entryTime.hour || this.entryTimeOptions.hours[0],
      };
      this.entrySetupOpen = true;
      await this.generateEntryAction('初始进入时机');
    } finally {
      this.busy = false;
    }
  },

  entryTimeLabel() {
    return this.entryCalendar ? window.GameModules.entryTime.format(this.entryTime, this.entryCalendar) : '未选择时间';
  },

  async generateEntryAction(reason) {
    this.entryCurrentAction = '正在根据世界观和角色性格推演当前行动…';
    try {
      this.entryCurrentAction = await this.requestEntryAction(reason);
    } catch (err) {
      console.warn('进入行动生成失败:', err.code, err.message, err.stack);
      this.entryCurrentAction = `${this.character.name}正在按自己的日常节奏行动，尚未察觉操控者即将介入。`;
    }
  },

  async requestEntryAction(reason) {
    if (!window.dzmm?.completions) return `${this.character.name}正在处理与身份相关的日常事务。`;
    let buffer = '';
    await window.dzmm.completions({
      model: this.modelId,
      maxTokens: 260,
      messages: [{ role: 'user', content: this.entryPrompt(reason) }],
    }, (chunk) => { buffer += chunk; });
    return (buffer.trim() || `${this.character.name}正在观察周围变化。`).slice(0, 180);
  },

  entryPrompt(reason) {
    const lore = window.GameModules.sqliteSave.getWorldLore(this.character.work || '原创世界');
    return `基于世界观和人物性格，生成角色当前正在做的事情。只输出一句中文，80字内，不要JSON。原因：${reason}。时间：${this.entryTimeLabel()}。角色：${this.character.name}｜${this.character.role}｜${this.character.personality || ''}。世界观：${lore?.background || this.character.work}`;
  },

  async advanceEntryTime() {
    if (this.busy) return;
    const minutes = Math.max(1, Math.min(1440, parseInt(this.entryAdvanceInput, 10) || 10));
    this.busy = true;
    try {
      await this.generateEntryAction(`时间推进${minutes}分钟`);
    } finally {
      this.busy = false;
    }
  },

  async confirmControl() {
    this.started = true;
    this.entrySetupOpen = false;
    this.log = [];
    this.turn = 1;
    this.sceneTitle = this.entryTimeLabel();
    this.mindText = `${this.character.name}在这一刻感觉到意识深处出现了陌生的操控链路。`;
    const mode = this.controlMode === 'possess' ? '附身方式：第二人称直接控制人物。' : 'RPG方式：第三人称通过手机式界面控制。';
    this.addLog('system', '进入时机', `${this.sceneTitle}｜${mode}`);
    this.addLog('story', '旁白', this.entryCurrentAction || `${this.character.name}正在行动。`);
    this.addLog('system', '系统', `操控链路已连接：${this.playerName} → ${this.character.name}`);
    this.addLog('mind', `${this.character.name}的心理`, this.mindText);
    await this.save();
  },
};
