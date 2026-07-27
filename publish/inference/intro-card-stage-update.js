window.GameModules = window.GameModules || {};

window.GameModules.introCardStageUpdate = {
  text(value = '') {
    return String(value ?? '').trim();
  },

  participantIdentity(participant = {}) {
    return {
      id: this.text(participant.id || participant.idOrName),
      name: this.text(participant.name || participant.characterName),
    };
  },

  findIntroCard(participant = {}) {
    const introStore = window.GameModules.characterIntroStore;
    const subject = this.participantIdentity(participant);
    return (subject.id && introStore?.getById?.(subject.id))
      || (subject.name && introStore?.get?.(subject.name))
      || null;
  },

  completeRoleState(card = null) {
    if (!card) return null;
    const introCard = window.GameModules.characterIntroCard;
    const roleState = introCard?.roleCardState?.(card) || null;
    if (!roleState || introCard?.isIncompleteRoleStub?.(roleState)) return null;
    return roleState;
  },

  collect(participants = []) {
    const aiCandidates = [];
    const syncTargets = [];
    const seen = new Set();
    for (const participant of Array.isArray(participants) ? participants : []) {
      if (!participant || participant.type === 'player') continue;
      const card = this.findIntroCard(participant);
      if (!card) continue;
      const key = this.text(card.id) || `${this.text(card.worldTag)}:${this.text(card.name)}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const roleState = this.completeRoleState(card);
      if (roleState) syncTargets.push({ card, roleState });
      else aiCandidates.push(card);
    }
    return { aiCandidates, syncTargets };
  },

  candidatePayload(cards = []) {
    return JSON.stringify((Array.isArray(cards) ? cards : []).map((card) => ({
      id: card.id,
      name: card.name,
      worldTag: card.worldTag,
      presenceKind: card.presenceKind,
      identity: card.identity || {},
      persona: card.persona || {},
      social: card.social || {},
      agenda: card.agenda || {},
      routine: card.routine || {},
      memory: card.memory || {},
    })), null, 2);
  },

  actionText(action = '') {
    if (typeof action === 'string') return this.text(action);
    return this.text(action?.text || action?.action || action?.content || action?.input || JSON.stringify(action || {}));
  },

  parsePayload(raw = '') {
    const jsonUtils = window.GameModules.jsonUtils;
    let parsed = null;
    if (jsonUtils?.parseLoose) parsed = jsonUtils.parseLoose(raw);
    else {
      const text = this.text(raw).replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '');
      parsed = JSON.parse(text);
    }
    return parsed && typeof parsed === 'object' && Array.isArray(parsed.ops) ? parsed.ops : [];
  },

  operationBelongsToCandidates(operation = {}, candidates = []) {
    const subject = operation?.subject || {};
    const id = this.text(subject.id);
    const name = this.text(subject.name);
    return (Array.isArray(candidates) ? candidates : []).some((card) => (
      (id && id === this.text(card.id))
      || (name && name === this.text(card.name))
    ));
  },

  operationLine(result = {}, prefix = '') {
    const operation = result.operation || {};
    const subject = operation.subject || {};
    const name = this.text(subject.name || subject.id) || '未知人物';
    const field = this.text(operation.field) || '未知字段';
    const status = result.applied ? '已更新' : `已拒绝：${this.text(result.reason) || '操作无效'}`;
    return `${prefix}[介绍卡] ${name} · ${field} ${status}`;
  },

  async syncCompleteRoleCards(store, syncTargets = []) {
    const operations = window.GameModules.characterIntroUpdateOperations;
    const synced = [];
    for (const target of Array.isArray(syncTargets) ? syncTargets : []) {
      const card = await operations?.syncRoleToIntro?.(target.roleState, target.card, store);
      if (card) synced.push(card);
    }
    return synced;
  },

  async runAfterStage4({ store = null, action = '', narration = '', participants = [], logId = null, config = {}, loop = null } = {}) {
    const { aiCandidates, syncTargets } = this.collect(participants);
    const synced = await this.syncCompleteRoleCards(store, syncTargets);
    const baseResult = {
      aiRequested: false,
      candidateCount: aiCandidates.length,
      synced,
      ops: [],
      applied: [],
      rejected: [],
      lines: [],
      raw: '',
    };
    if (!aiCandidates.length) return { ...baseResult, skipped: true };
    if (!loop?.renderPrompt || !loop?.completeConfiguredStep) throw new Error('Stage5 介绍卡更新缺少推演循环能力');

    loop.markConfiguredStep?.(store, logId, `${config.label || ''}Stage5 正在更新介绍卡…`, config, { keepNarration: true });
    const prompt = await loop.renderPrompt('inference-stage5-intro-card-update', {
      '介绍卡候选资料': this.candidatePayload(aiCandidates),
      '玩家行动': this.actionText(action),
      '本轮正文': this.text(narration),
    });
    const requestConfig = {
      ...config,
      sourceTitle: `${config.label || ''}Stage5 介绍卡更新`,
      promptId: 'inference-stage5-intro-card-update',
      reasoningPhase: 'stage5',
      jsonMode: true,
      responseFormat: { type: 'json_object' },
      outputLimitKind: 'stage4',
    };
    const raw = await loop.completeConfiguredStep(store, prompt, logId, false, requestConfig);
    const ops = this.parsePayload(raw).filter((operation) => this.operationBelongsToCandidates(operation, aiCandidates));
    const outcome = await window.GameModules.characterIntroUpdateOperations?.applyMany?.(store, ops)
      || { applied: [], rejected: [] };
    const applied = Array.isArray(outcome.applied) ? outcome.applied : [];
    const rejected = Array.isArray(outcome.rejected) ? outcome.rejected : [];
    return {
      ...baseResult,
      aiRequested: true,
      skipped: false,
      raw,
      ops,
      applied,
      rejected,
      lines: [
        ...applied.map((result) => this.operationLine(result)),
        ...rejected.map((result) => this.operationLine(result)),
      ],
    };
  },
};
