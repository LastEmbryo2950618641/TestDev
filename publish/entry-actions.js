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
    console.log('[进入流程] 阶段开始:', key, detail);
    this.setEntryStage(key, 'running', detail);
    try {
      const result = await fn();
      console.log('[进入流程] 阶段完成:', key);
      this.setEntryStage(key, 'done', detail);
      return result;
    } catch (err) {
      console.warn('[进入流程] 阶段失败:', key, err.message, err.stack);
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
    console.log('[进入流程] 打开进入配置:', this.selectedWork, this.character?.name, this.character?.id);
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
      await this.runEntryStage('time', '正在定位默认进入时间并校正角色出生日期。', async () => this.prepareEntryTimeOptions(calendar));
      await this.runEntryStage('rpg', '正在准备被控制角色的完整 RPG 状态。', async () => {
        await this.ensureRpgForCurrentCharacter();
        await window.GameModules.entryTime.applyCharacterAge(this);
      });
      await this.runEntryStage('action', '正在推演角色当前行动。', async () => this.generateEntryAction('默认进入时机'));
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
    await window.GameModules.entryTime.applyStart(this);
  },

  entryTimeLabel() {
    return this.entryCalendar ? window.GameModules.entryTime.format(this.entryTime, this.entryCalendar) : '未选择时间';
  },

  async generateEntryAction(reason) {
    this.entryCurrentAction = '正在根据世界观和角色性格推演当前行动…';
    try {
      await window.GameModules.entryTime.applyCharacterAge(this);
      this.entryCurrentAction = await this.requestEntryAction(reason);
    } catch (err) {
      console.warn('进入行动生成失败:', err.code, err.message, err.stack);
      this.entryCurrentAction = `${this.character.name}正在按自己的日常节奏行动，尚未察觉操控者即将介入。`;
    }
  },

  async requestEntryAction(reason) {
    if (!window.dzmm?.completions) return `${this.character.name}正在处理与身份相关的日常事务。`;
    const storyContext = await window.GameModules.entryTime.storyContextFor(this);
    console.log('[进入行动] 请求开始:', reason, this.entryTimeLabel(), this.character.name, this.character.work, 'storyContextLength=', storyContext.length);
    let buffer = '';
    await window.dzmm.completions({
      model: this.modelId,
      maxTokens: 220,
      messages: [{ role: 'user', content: this.entryPrompt(reason, storyContext) }],
    }, (chunk, done) => {
      buffer = this.mergeStreamText(buffer, chunk);
      const latest = this.cleanEntryAction(buffer);
      if (latest) this.entryCurrentAction = latest;
      if (done) console.log('[进入行动] 生成完成:', { length: buffer.length, text: latest });
    });
    return this.cleanEntryAction(buffer) || `${this.character.name}正在观察周围变化。`;
  },

  mergeStreamText(buffer, chunk) {
    const text = String(chunk || '');
    if (!text) return buffer;
    if (!buffer || text.startsWith(buffer)) return text;
    if (buffer.endsWith(text)) return buffer;
    const overlap = Math.min(buffer.length, text.length);
    for (let size = overlap; size > 0; size -= 1) {
      if (buffer.endsWith(text.slice(0, size))) return buffer + text.slice(size);
    }
    return buffer + text;
  },

  cleanEntryAction(text) {
    return String(text || '').replace(/[“”"']/g, '').replace(/\s+/g, '')
      .replace(/^(.*?)(\1)+/, '$1').slice(0, 90);
  },

  entryPrompt(reason, storyContext) {
    const lore = window.GameModules.cache.enabled('generatedLore') ? window.GameModules.sqliteSave.getWorldLore(this.character.work || '原创世界') : null;
    return `基于剧情索引、世界观和人物性格，推演角色在当前时间正在发生的事情。必须优先依据剧情索引范围，不要凭空捏造；如果当前角色未出现在索引摘要中，则根据其身份推断她此刻与主线的合理关系，并明确保持克制。只输出一句中文，60字内，不要JSON，不要重复词句。原因：${reason}。时间：${this.entryTimeLabel()}。角色：${this.character.name}｜${this.character.role}｜${this.character.personality || ''}。世界观：${lore?.background || this.character.work}。剧情索引上下文：${storyContext}`;
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
    const possessText = '第二人称上线：操控者的“我”直接附到角色肉体上行动；对角色本人来说，身体是突然不受控制的，她不知道控制来源，只能像旁观者一样看着身体行动，但视觉、听觉、嗅觉、味觉、触觉等身体感觉仍然存在。';
    const feedback = await window.GameModules.characterFeedback.initial(this);
    this.mood = feedback.mood;
    this.resistance = feedback.resistance;
    this.mindText = feedback.mind;
    this.characterIntent = feedback.intent;
    this.choices = feedback.choices || this.choices;
    this.applyInitialMetrics(feedback.metricUpdates);
    await window.GameModules.characterFeedback.applyExperience(this, feedback);
    const mode = this.controlMode === 'possess' ? `附身方式：${possessText}` : 'RPG方式：第三人称通过手机式界面控制。';
    this.addLog('system', '进入时机', `${this.sceneTitle}｜${mode}`);
    this.addLog('story', '旁白', this.entryCurrentAction || `${this.character.name}正在行动。`);
    this.addLog('system', '系统', `操控链路已连接：${this.playerName} → ${this.character.name}`);
    this.addLog('mind', `${this.character.name}的心理`, this.mindText);
    await this.save();
  },
};
