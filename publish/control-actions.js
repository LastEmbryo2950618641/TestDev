/**
 * 控制上线流程：玩家确认连接后的详细调试日志。
 */
window.GameModules = window.GameModules || {};
console.log('[控制上线] control-actions.js 已加载', { hasEntryActions: Boolean(window.GameModules.entryActions) });

Object.assign(window.GameModules.entryActions, {
  async confirmControl() {
    console.log('[控制上线] confirmControl 入口:', { busy: this.busy, started: this.started, entrySetupOpen: this.entrySetupOpen, ready: Boolean(this.entryTimeOptions?.start) });
    if (this.busy) {
      console.warn('[控制上线] confirmControl 被 busy 拦截:', { busy: this.busy });
      return;
    }
    const debug = window.GameModules.debug;
    const flow = debug.start('[控制上线] 总流程', {
      character: this.character?.name,
      characterId: this.character?.id,
      work: this.character?.work,
      slot: this.selectedSlot,
      model: this.modelId,
      controlMode: this.controlMode,
      entryTime: this.entryTimeLabel?.(),
      entryActionLength: String(this.entryCurrentAction || '').length,
    });
    this.busy = true;
    try {
      this.started = true;
      this.entrySetupOpen = false;
      this.log = [];
      this.turn = 1;
      this.sceneTitle = this.entryTimeLabel();
      this.online = true;
      this.loadMetricsFromCharacterState();
      const action = `你在手机上的《我狠狠控制》APP里选中${this.character.name}，按下连接按钮。意识陷入黑暗后，你在${this.entryTimeLabel()}醒来，发现自己已经附身到${this.character.name}身上。当前场景：${this.entryCurrentAction || `${this.character.name}正在行动。`}`;
      const logId = this.addNovelEntry(action, { playerVisible: false });
      debug.step('[控制上线] 开场日志已创建', { logId, actionLength: action.length });

      this.runBestEffortControlTask('世界线生成', () => this.ensureWorldline(action));
      const feedbackTask = this.runLoggedControlTask('角色反馈', () => window.GameModules.characterFeedback.initial(this));
      await this.runLoggedControlTask('资料检索', async () => {
        await Promise.race([this.refreshRagContext(action), new Promise((_, reject) => setTimeout(() => reject(new Error('资料检索超时')), 8000))]);
        return { results: this.ragResults?.length || 0, contextLength: String(this.ragContext || '').length };
      }, () => {
        this.ragContext = '';
        this.ragResults = [];
      });
      await this.runLoggedControlTask('记忆上下文', async () => {
        this.memoryContext = await window.GameModules.characterMemory.contextFor(this, action);
        return { length: String(this.memoryContext || '').length };
      }, () => { this.memoryContext = '暂无人物记忆。'; });

      const feedback = await feedbackTask;
      debug.step('[控制上线] 应用角色反馈', { source: feedback.source, mindLength: String(feedback.mind || '').length, intentLength: String(feedback.intent || '').length });
      this.mindText = feedback.mind;
      this.feedbackSource = feedback.source || 'fallback';
      this.characterIntent = feedback.intent;
      this.choices = feedback.choices || this.choices;
      await this.runLoggedControlTask('上线体验写入', () => window.GameModules.characterFeedback.applyExperience(this, feedback));
      await this.runLoggedControlTask('AI剧情推演', () => window.GameModules.ai.generate(this, action, logId));
      await this.runLoggedControlTask('存档保存', () => this.save());
      debug.done(flow, { logCount: this.log.length, turn: this.turn, source: this.feedbackSource });
    } catch (err) {
      debug.fail(flow, err);
      console.error('[控制上线] 总流程异常:', err.code, err.message, err.stack);
    } finally {
      this.busy = false;
      debug.step('[控制上线] busy 已释放', { busy: this.busy, started: this.started });
    }
  },

  async runLoggedControlTask(name, fn, fallback = null) {
    const debug = window.GameModules.debug;
    const token = debug.start(`[控制上线] ${name}`);
    try {
      const result = await fn();
      debug.done(token, result && typeof result === 'object' ? result : {});
      return result;
    } catch (err) {
      debug.fail(token, err);
      if (fallback) return fallback(err);
      throw err;
    }
  },

  runBestEffortControlTask(name, fn) {
    this.runLoggedControlTask(name, fn, () => null).catch((err) => {
      console.warn(`[控制上线] ${name}已跳过:`, err.code, err.message);
    });
  },
});
