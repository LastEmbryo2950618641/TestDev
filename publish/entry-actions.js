/**
 * 进入配置动作：选择时机、推进时间、选择操控方式后进入。
 */
window.GameModules = window.GameModules || {};

window.GameModules.entryActions = {
  resetEntryStages() {
    this.entryStages = [
      { key: 'calendar', name: '世界历法', status: 'waiting', detail: '等待固化世界时间规则。' },
      { key: 'time', name: '时间选项', status: 'waiting', detail: '等待生成可选日期。' },
      { key: 'rpg', name: '角色状态', status: 'waiting', detail: '等待准备 RPG 属性。' },
      { key: 'action', name: '当前行动', status: 'waiting', detail: '等待推演角色正在做什么。' },
      { key: 'ready', name: '控制准备', status: 'waiting', detail: '等待进入控制确认。' },
    ];
  },

  setEntryStage(key, status, detail = '') {
    this.entryStages = this.entryStages.map((x) => (x.key === key ? { ...x, status, detail: detail || x.detail } : x));
  },

  async runEntryStage(key, detail, fn) {
    this.setEntryStage(key, 'running', detail);
    try {
      const result = await fn();
      this.setEntryStage(key, 'done', detail);
      return result;
    } catch (err) {
      this.setEntryStage(key, 'error', `${detail}失败：${err.message || '未知错误'}`);
      throw err;
    }
  },

  entryStageDetail() {
    const current = this.entryStages.find((x) => ['running', 'error'].includes(x.status)) || this.entryStages.find((x) => x.status === 'waiting') || this.entryStages.at(-1);
    return current?.detail || '正在准备进入配置。';
  },

  async prepareEntrySetup() {
    if (this.busy) return;
    this.entrySetupOpen = true;
    this.characterAge = '';
    this.entryTime = { year: '', month: '', day: '', hour: '', minute: '', second: '' };
    this.entryTimeOptions = { years: [], months: [], days: [], hours: [], minutes: [], seconds: [], start: null };
    this.entryCurrentAction = '';
    this.resetEntryStages();
    this.busy = true;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    try {
      await window.GameModules.characterBrief.ensure(this);
      const calendar = await this.runEntryStage('calendar', '正在生成或读取当前世界的固化历法。', () => window.GameModules.entryTime.ensureCalendar(this));
      this.entryCalendar = calendar;
      await this.runEntryStage('time', '正在读取剧情索引前50行并定位最早剧情时间。', async () => this.prepareEntryTimeOptions(calendar));
      await this.runEntryStage('rpg', '正在准备被控制角色的完整 RPG 状态。', () => this.ensureRpgForCurrentCharacter());
      await this.runEntryStage('ready', '进入配置已准备好，可以选择操控方式。', async () => true);
    } finally {
      this.busy = false;
    }
  },

  async prepareEntryTimeOptions(calendar) {
    this.entryTimeOptions = await window.GameModules.entryTime.options(calendar, this);
    this.entryTime = {
      year: this.entryTimeOptions.years[0],
      month: this.entryTimeOptions.months[0],
      day: this.entryTimeOptions.days[0],
      hour: this.entryTimeOptions.hours[9],
      minute: this.entryTimeOptions.minutes[0],
      second: this.entryTimeOptions.seconds[0],
    };
    window.GameModules.entryTime.applyStart(this);
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
    let latest = '';
    await window.dzmm.completions({
      model: this.modelId,
      maxTokens: 220,
      messages: [{ role: 'user', content: this.entryPrompt(reason) }],
    }, (chunk) => {
      latest = this.cleanEntryAction(chunk);
      if (latest) this.entryCurrentAction = latest;
    });
    return latest || `${this.character.name}正在观察周围变化。`;
  },

  cleanEntryAction(text) {
    return String(text || '').replace(/[“”"']/g, '').replace(/\s+/g, '')
      .replace(/^(.*?)(\1)+/, '$1').slice(0, 90);
  },

  entryPrompt(reason) {
    const lore = window.GameModules.sqliteSave.getWorldLore(this.character.work || '原创世界');
    return `基于世界观和人物性格，生成角色当前正在做的事情。只输出一句中文，60字内，不要JSON，不要重复词句。原因：${reason}。时间：${this.entryTimeLabel()}。角色：${this.character.name}｜${this.character.role}｜${this.character.personality || ''}。世界观：${lore?.background || this.character.work}`;
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
