window.GameModules = window.GameModules || {};

window.GameModules.realWorldUtilityActions = {
  async assignRealWorldlineEntry(entry) {
    this.realWorldlineState = this.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    const event = { eventId: `real_${entry.id}`, name: entry.sceneTitle || entry.locationName || this.realWorldSceneTitle || '现实事件', time: entry.time?.label || '', detail: String(entry.narration || entry.thinking || entry.text || ''), status: entry.streaming ? '记录中' : '已记录' };
    this.realWorldlineState.events = [...(this.realWorldlineState.events || []).filter((item) => item.eventId !== event.eventId), event].slice(-40);
    const assigned = window.GameModules.worldlinePlots.assign(this, this.realWorldlineState, event, '现实情节');
    entry.plotId = event.plotId;
    await assigned;
  },

  realWorldMemoryTargetState(value = '') {
    const key = String(value || '').trim();
    if (!key) return null;
    return this.rpgStates?.[key]
      || Object.values(this.rpgStates || {}).find((state) => state?.id === key || state?.name === key || state?.profile?.name === key)
      || this.itemSkillState?.(key)
      || null;
  },

  realWorldMemoryTargetIds(result = {}) {
    const ids = new Set(['player-self']);
    const add = (value) => {
      const state = this.realWorldMemoryTargetState(value);
      if (state?.id) ids.add(String(state.id));
    };
    const shared = this.sharedControlState?.();
    if (shared?.id) ids.add(String(shared.id));
    [result.appearedCharacters, result.solidifiableCharacters].forEach((list) => (Array.isArray(list) ? list : []).forEach((item) => add(item?.id || item?.characterId || item?.name || item)));
    (Array.isArray(result.genericUpdates) ? result.genericUpdates : []).forEach((item) => add(item?.subject?.id || item?.subject?.name || item?.target || item?.characterId));
    (Array.isArray(result.vitalUpdates) ? result.vitalUpdates : []).forEach((item) => add(item?.target || item?.subject?.id || item?.subject?.name));
    (Array.isArray(result.itemActions) ? result.itemActions : []).forEach((item) => [item?.target, item?.owner, item?.characterId, item?.from, item?.to].forEach(add));
    return [...ids];
  },

  realWorldMemoryTextFor(targetId, action, result = {}) {
    const base = [`现实行动：${action}`, `发生：${result.narration || ''}`, result.thinking ? `推演：${result.thinking}` : '', `目标：${result.quest || this.realWorldQuest}`].filter(Boolean).join('\n');
    if (targetId === 'player-self') return base;
    const state = this.realWorldMemoryTargetState(targetId) || {};
    const name = state.profile?.name || state.name || targetId;
    return [`现实推演相关记忆：${name}参与或目睹了本次现实事件。`, base].join('\n');
  },

  async recordRealWorldMemory(action, result) {
    const store = { ...this, sceneTitle: result.sceneTitle || this.realWorldSceneTitle, entryTime: null, entryTimeLabel: () => `${this.phoneDateText()} ${this.phoneTimeText()}` };
    for (const targetId of this.realWorldMemoryTargetIds(result)) {
      const text = this.realWorldMemoryTextFor(targetId, action, result);
      const memory = window.GameModules.characterMemory.ensure(targetId);
      const item = window.GameModules.characterMemory.memoryItem(store, { text, source: 'real-world', impression: targetId === 'player-self' ? 55 : 48 });
      memory.shortTerm.recent.push(item);
      window.GameModules.characterMemory.promote(memory, item);
      await window.GameModules.characterMemory.compact(targetId, memory);
    }
  },

  async recordPlayerRealWorldMemory(action, result) {
    return await this.recordRealWorldMemory(action, result);
  },

  realWorldWordCountValue() {
    return Math.floor(Number(this.realWorldWordCount) || 0);
  },

  realWorldWordCountValid() {
    return this.realWorldFreedomMode !== 'words' || this.realWorldWordCountValue() >= 200;
  },

  validateRealWorldFreedom() {
    if (this.realWorldWordCountValid()) return true;
    window.dzmm?.toast?.error?.('要求字数最少 200') || console.warn('要求字数最少 200');
    return false;
  },

  realWorldFreedomRule() {
    const mode = this.realWorldFreedomMode || 'scope';
    if (mode === 'free') return '推演自由度：AI自由发挥。final 不受玩家本次行动边界约束，不设置字数上限，narration 不得少于 300 个汉字；AI 应根据当前已知场景、时间、地点、人物状态、现实因果、生命体征和已载入资料，尽可能输出其能够合理推演的最大内容量。允许连续推进环境变化、他人反应、事件连锁、阶段性结果和后续影响，直到当前场景在逻辑上达到可停顿的最大推演点；但不得无依据篡改已知设定、无中生有关键旧事实或违背现实因果。';
    if (mode === 'words') return `推演自由度：要求字数。final 的 narration 不得少于 ${Math.max(200, this.realWorldWordCountValue())} 个汉字；这是提示词层面的生成要求，不要追加额外文本处理阶段。仍需遵守本次行动边界和现实因果，必须把行动过程、环境、身体状态影响、人物反应和直接结果写充分。`;
    return '推演自由度：行动范围内。只推演玩家本次输入行动自然抵达的过程和直接结果，不替玩家继续追问、离开、处理后续长期事务或完成未输入的下一步行动；不设置字数上限，narration 不得少于 300 个汉字。必须在该行动范围内尽可能充分推演，包括玩家动作过程、身体感受、周围环境变化、可见细节、他人反应、对话回应、短期连锁影响和结果落点。narration 不要写成简略总结。';
  },

  realWorldNarrationHint() {
    if (this.realWorldFreedomMode === 'words') return `以第二人称续写现实世界中的行动过程和直接结果，不少于 ${Math.max(200, this.realWorldWordCountValue())} 个汉字，现实、克制、细节充分，并体现具体动作、环境变化、他人反应和生命体征影响`;
    if (this.realWorldFreedomMode === 'free') return '以第二人称续写现实世界中的行动过程、场景连锁和阶段性结果，不少于300字且不设字数上限，按当前场景和已载入资料尽可能输出可合理推演的最大内容量，连续呈现具体动作、环境变化、他人反应、事件连锁、后续影响和生命体征影响';
    return '以第二人称续写现实世界中的行动过程和直接结果，不少于300字且不设字数上限，在行动范围内充分描写动作过程、周围情况、别人反应、短期影响和生命体征影响';
  },

  realWorldNarrationHtml(entry = {}) {
    const raw = entry?.narration || entry?.statusText || entry?.text || '';
    return window.GameModules.narrationRoleMarkup?.toSafeHtml?.(raw)
      || String(raw || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  novelStoryHtml(entry = {}) {
    const raw = entry?.storyText || '';
    return window.GameModules.narrationRoleMarkup?.toSafeHtml?.(raw)
      || String(raw || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  /**
   * Scene header / 当前位置: full profile chain of the active body.
   * Possessing → controlled character; otherwise → player-self.
   */
  realWorldSceneLocationText() {
    const locField = window.GameModules.currentLocationField;
    const shared = this.sharedControlState?.();
    const subject = shared
      || this.playerIdentityState?.()
      || this.rpgStates?.['player-self']
      || null;
    const candidates = [
      locField?.displayFromCharacterState?.(subject),
      locField?.fromCharacterState?.(subject),
      subject?.profile?.currentLocation,
    ];
    for (const item of candidates) {
      const text = locField?.normalize?.(item) || String(item || '').trim();
      if (text) return text;
    }
    return '';
  },

  realWorldChoiceIcon(choice = '') {
    const text = String(choice || '');
    if (/手机|记录|信息|屏幕|通讯|微信/u.test(text)) return '📱';
    if (/观察|查看|环境|周围|居住|地图|地点/u.test(text)) return '🔎';
    if (/联系|熟人|确认|电话|消息/u.test(text)) return '💬';
    if (/休息|暂停|等待|睡|坐/u.test(text)) return '🕯️';
    if (/检查|处理|整理|搜索/u.test(text)) return '🧭';
    if (/行动|前往|进入|离开/u.test(text)) return '👣';
    return '✦';
  },

  realWorldEntryIcon(entry = {}) {
    if (entry?.type === 'user') return '🧍';
    if (entry?.transientError) return '⚠️';
    if (entry?.streaming) return '🔮';
    return '📜';
  },

  realWorldStatusIcon(text = '') {
    const value = String(text || '');
    if (/失败|错误|异常|危险|警/u.test(value)) return '⚠️';
    if (/目标|任务|确认|处理/u.test(value)) return '🎯';
    if (/地点|位置|现实|世界/u.test(value)) return '🗺️';
    if (/稳定|安全|正常/u.test(value)) return '🛡️';
    return '✧';
  },

  realWorldMatterButtonText() {
    const matter = this.activeRealWorldMatter?.();
    return matter ? `📌 事项：${matter.type || matter.title || '进行中'}` : '📌 事项';
  },

  async copyRealWorldPlayerText(text = '') {
    const value = String(text || '').trim();
    if (!value) return;
    const current = String(this.realWorldInput || '').trimEnd();
    this.realWorldInput = current ? `${current} ${value}` : value;
    window.dzmm?.toast?.success?.('已追加到输入框') || console.info('已追加到输入框');
  },

  openRealWorldPrompt(id) {
    const entry = this.realWorldLog.find((item) => item.id === id);
    if (!entry?.promptPack) return;
    const runtimeRecordId = entry.promptPack.runtimeRecordId || entry.promptPack.tokenRecordId;
    if (runtimeRecordId) {
      this.openTokenStatsApp?.();
      this.openTokenPromptDetail?.(runtimeRecordId);
      return;
    }
    this.promptDialogEntry = entry;
    this.promptDialogTab = 'system';
    this.promptDialogOpen = true;
  },
};
