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

  openEntryIdentityDetail() {
    this.identityTargetId = this.character?.id || 'player-self';
    this.entryIdentityOpen = true;
    this.identityMetricsOpen = false;
    this.ensureIdentityMetricSources?.(this.identityTargetId);
  },

  closeEntryIdentityDetail() {
    this.entryIdentityOpen = false;
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
      this.startRoleCardLoadingBatch?.([{ id: this.character.id, name: this.character.name, type: '角色卡', source: this.character, context: this.entryCurrentAction || this.entryTimeLabel() }]);
      await this.runEntryStage('rpg', '正在生成并固化被控制角色的角色卡与 RPG 数值。', async () => {
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
    const prompt = await this.entryPrompt(reason, storyContext);
    await window.GameModules.aiRequest.complete({
      source: 'entry-action', model: this.modelId, prompt, timeoutMs: 60000,
      ...(window.GameModules.promptSkills?.completionOptions?.('entry-action') || { jsonMode: false, outputLimitKind: 'other' }),
      onChunk: (chunk, done, info) => {
        buffer = info.buffer;
        const latest = this.cleanEntryAction(buffer);
        if (latest) this.entryCurrentAction = latest;
        if (done) console.log('[进入行动] 生成完成:', { length: buffer.length, text: latest });
      },
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
    let raw = String(text || '').replace(/```[a-z]*|```/gi, '').replace(/[“”"']/g, '').trim();
    raw = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean).find((line) => !/^#|^[-*]|^\d+[.、]/.test(line)) || raw;
    raw = raw
      .replace(/^#+\s*/, '')
      .replace(/^进入时机行动生成\s*/i, '')
      .replace(/^(任务定位|输出|回答|当前行动|行动)\s*[:：]?\s*/i, '')
      .replace(/\s+/g, '');
    raw = raw.replace(/^(.*?)(\1)+/, '$1').slice(0, 120);
    if (this.isInvalidEntryAction(raw)) return '';
    return raw;
  },

  isInvalidEntryAction(text = '') {
    const value = String(text || '').trim();
    if (!value || value.length < 6) return true;
    return /进入时机行动生成|任务定位|模板构成|上下文|原因[:：]|时间[:：]|角色[:：]|世界观[:：]|剧情索引/.test(value);
  },

  entryPrompt(reason, storyContext) {
    const lore = window.GameModules.worldLoreStore?.get?.(this.character.work || '原创世界');
    return window.GameModules.renderPrompt('entry-action', { 原因: reason, 时间: this.entryTimeLabel(), 角色: `${this.character.name}｜${this.character.role}｜${this.character.personality || ''}`, 世界观: lore?.background || this.character.work, 剧情索引: storyContext });
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
      this.loadMetricsFromCharacterState();
      const currentAction = this.cleanEntryAction(this.entryCurrentAction) || `${this.character.name}正在按当前时间点的处境行动。`;
      this.entryCurrentAction = currentAction;
      const markup = window.GameModules.narrationRoleMarkup;
      const playerName = String(this.playerName || this.playerProfile?.name || this.rpgStates?.['player-self']?.profile?.name || '玩家').trim() || '玩家';
      const targetName = String(this.character?.name || '被控者').trim();
      const targetId = String(this.character?.id || this.selectedCharacterId || '').trim();
      const playerTag = markup?.roleTag?.('player-self', playerName) || playerName;
      const targetTag = markup?.roleTag?.(targetId, targetName) || targetName;
      const action = `你在手机上的《我狠狠控制》APP里选中${targetTag}，按下连接按钮。意识陷入黑暗后，你在${this.entryTimeLabel()}醒来，发现自己已经附身到${targetTag}身上。上线规则：${playerTag}可以一心二用，同时控制自己的现实本体与${targetTag}的身体，并同时感受两个肉体的所有感官；${targetTag}无法控制自己的身体，但意识清醒，能感觉身体全部反馈。AI正文必须以玩家在${targetTag}身体内的第二人称附身视角为主，同时保留${targetTag}的心理想法与感受。正文除“你”外每次写角色姓名必须使用 <role id="真实ID">姓名</role>。动作归属规则：玩家未明确指定${playerTag}本体、现实身体、外部的我或其他执行者时，所有“你/我/手/身体/伸手/触碰/捏/按/移动/说话”等行动都默认由${targetTag}的身体亲自执行，不要写成${playerTag}现实本体从外部对${targetTag}行动。当前场景：${currentAction}`;
      const logId = this.addNovelEntry(action, { playerVisible: false });
      console.log('[控制上线] 已创建开场日志，开始生成:', { logId, character: targetName });
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
      this.mindText = feedback.mind;
      this.feedbackSource = feedback.source || 'fallback';
      this.characterIntent = feedback.intent;
      console.debug('[角色反馈] 初始生成结果:', { source: this.feedbackSource, mindLength: String(this.mindText || '').length, intentLength: String(this.characterIntent || '').length });
      this.choices = feedback.choices || this.choices;
      await window.GameModules.characterFeedback.applyExperience(this, feedback);
      await window.GameModules.ai.generate(this, action, logId);
      await this.save();
    } finally {
      this.busy = false;
    }
  },
};
