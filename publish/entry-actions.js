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
      await this.runEntryStage('action', '正在推演角色当前行动。', async () => this.generateEntryAction('默认进入时机'));
      await this.runEntryStage('rpg', '正在结合人物资料、当前状态与上下文固化 RPG 数值。', async () => {
        await window.GameModules.entryTime.applyCharacterAge(this);
        await this.ensureRpgForCurrentCharacter({ refresh: true });
      });
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
      messages: [{ role: 'user', content: await this.entryPrompt(reason, storyContext) }],
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
    return window.GameModules.promptTemplates.render('entry-action', { 原因: reason, 时间: this.entryTimeLabel(), 角色: `${this.character.name}｜${this.character.role}｜${this.character.personality || ''}`, 世界观: lore?.background || this.character.work, 剧情索引: storyContext });
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
    if (this.busy) return;
    this.busy = true;
    try {
      this.started = true;
      this.entrySetupOpen = false;
      this.log = [];
      this.turn = 1;
      this.sceneTitle = this.entryTimeLabel();
      this.online = true;
      this.metricsReady = false;
      const action = `你在手机上的《我狠狠控制》APP里选中${this.character.name}，按下连接按钮。意识陷入黑暗后，你在${this.entryTimeLabel()}醒来，发现自己已经附身到${this.character.name}身上。当前场景：${this.entryCurrentAction || `${this.character.name}正在行动。`}`;
      const logId = this.addNovelEntry(action, { playerVisible: false });
      console.log('[控制上线] 已创建开场日志，开始生成:', { logId, character: this.character.name });
      const feedbackTask = window.GameModules.characterFeedback.initial(this);
      try {
        await Promise.race([this.refreshRagContext(action), new Promise((_, reject) => setTimeout(() => reject(new Error('资料检索超时')), 8000))]);
      } catch (err) {
        console.warn('[控制上线] 资料检索跳过:', err.message, err.stack);
        this.ragContext = '';
        this.ragResults = [];
      }
      try {
        this.memoryContext = await window.GameModules.characterMemory.contextFor(this, action);
      } catch (err) {
        console.warn('[控制上线] 记忆上下文跳过:', err.message, err.stack);
        this.memoryContext = '暂无人物记忆。';
      }
      const feedback = await feedbackTask;
      this.mood = feedback.mood;
      this.resistance = feedback.resistance;
      this.mindText = feedback.mind;
      this.feedbackSource = feedback.source || 'fallback';
      this.characterIntent = feedback.intent;
      console.log('[角色反馈] 初始生成结果:', { source: this.feedbackSource, mindLength: String(this.mindText || '').length, intentLength: String(this.characterIntent || '').length });
      this.choices = feedback.choices || this.choices;
      this.applyInitialMetrics(feedback.metricUpdates);
      await window.GameModules.characterFeedback.applyExperience(this, feedback);
      await window.GameModules.ai.generate(this, action, logId);
      await this.save();
    } finally {
      this.busy = false;
    }
  },
};
