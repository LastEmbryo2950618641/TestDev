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
      await this.runLoggedControlTask('玩法资源加载', () => window.GameModules.assetLoader?.ensureGameplayReady?.(this) || Promise.resolve());
      const markup = window.GameModules.narrationRoleMarkup;
      const playerName = String(this.playerName || this.playerProfile?.name || this.rpgStates?.['player-self']?.profile?.name || '玩家').trim() || '玩家';
      const targetName = String(this.character?.name || '被控者').trim();
      const targetId = String(this.character?.id || this.selectedCharacterId || '').trim();
      const playerTag = markup?.roleTag?.('player-self', playerName) || playerName;
      const targetTag = markup?.roleTag?.(targetId, targetName) || targetName;
      const action = `你在手机上的《我狠狠控制》APP里选中${targetTag}，按下连接按钮。意识陷入黑暗后，你在${this.entryTimeLabel()}醒来，发现自己已经附身到${targetTag}身上。上线规则：${playerTag}可以一心二用，同时控制自己的现实本体与${targetTag}的身体，并同时感受两个肉体的所有感官；${targetTag}无法控制自己的身体，但意识清醒，能感觉身体全部反馈。AI正文必须以玩家在${targetTag}身体内的第二人称附身视角为主，同时保留${targetTag}的心理想法与感受。正文除“你”外每次写角色姓名必须使用 <role id="真实ID">姓名</role>。动作归属规则：玩家未明确指定${playerTag}本体、现实身体、外部的我或其他执行者时，所有“你/我/手/身体/伸手/触碰/捏/按/移动/说话”等行动都默认由${targetTag}的身体亲自执行，不要写成${playerTag}现实本体从外部对${targetTag}行动。当前场景：${this.entryCurrentAction || `${targetName}正在行动。`}`;
      const logId = this.addNovelEntry(action, { playerVisible: false });
      debug.step('[控制上线] 开场日志已创建', { logId, actionLength: action.length });

      this.runBestEffortControlTask('世界线生成', () => this.ensureWorldline(action));
      const feedbackTask = this.runLoggedControlTask('角色反馈', () => window.GameModules.characterFeedback.initial(this));
      this.ragContext = '';
      this.ragResults = [];
      this.memoryContext = '由分阶段 Loop Agent 按需动态载入。';

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
