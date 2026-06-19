window.GameModules = window.GameModules || {};

window.GameModules.roleCardLoadingActions = {
  startRoleCardLoadingBatch(cards = []) {
    const now = Date.now();
    const normalized = cards.map((card, index) => this.normalizeRoleCardLoadingCard(card, index, now));
    this.roleCardLoadingState = { open: true, expanded: true, cards: normalized, startedAt: now };
    this.roleCardLoadingRetryQueue = {};
    this.startLoadingTimer?.();
  },

  normalizeRoleCardLoadingCard(card = {}, index = 0, now = Date.now()) {
    const steps = card.steps || this.roleCardLoadingDefaultSteps(card.type);
    return {
      id: card.id || `role-card-${now}-${index}`,
      name: card.name || '发现新角色',
      type: card.type || '角色卡',
      status: 'waiting',
      expanded: true,
      startedAt: 0,
      finishedAt: 0,
      source: card.source || null,
      context: card.context || '',
      steps: steps.map((step) => ({ done: 0, total: step.total || 1, startedAt: 0, finishedAt: 0, retrying: false, ...step })),
    };
  },

  addRoleCardLoadingCard(card = {}) {
    const cards = this.roleCardLoadingState.cards || [];
    const normalized = this.normalizeRoleCardLoadingCard(card, cards.length);
    if (cards.some((item) => item.id === normalized.id)) return;
    this.roleCardLoadingState = { ...this.roleCardLoadingState, open: true, expanded: true, cards: [...cards, normalized], startedAt: this.roleCardLoadingState.startedAt || Date.now() };
    this.startLoadingTimer?.();
  },

  closeRoleCardLoading() {
    this.roleCardLoadingState.open = false;
  },

  toggleRoleCardLoadingPanel() {
    this.roleCardLoadingState.expanded = !this.roleCardLoadingState.expanded;
  },

  toggleRoleCardLoadingCard(id) {
    this.roleCardLoadingState.cards = this.roleCardLoadingState.cards.map((card) => (
      card.id === id ? { ...card, expanded: !card.expanded } : card
    ));
  },

  roleCardLoadingFindId(id) {
    if (this.roleCardLoadingCard(id)) return id;
    return (this.roleCardLoadingState.cards || []).find((card) => card.name === id)?.id || id;
  },

  updateRoleCardLoading(id, patch = {}) {
    const targetId = this.roleCardLoadingFindId(id);
    const cards = this.roleCardLoadingState.cards || [];
    this.roleCardLoadingState.cards = cards.map((card) => (card.id === targetId ? { ...card, ...patch } : card));
  },

  updateRoleCardLoadingStep(id, stepKey, status, text = '', progress = null) {
    const targetId = this.roleCardLoadingFindId(id);
    const now = Date.now();
    this.roleCardLoadingState.cards = (this.roleCardLoadingState.cards || []).map((card) => {
      if (card.id !== targetId) return card;
      const steps = (card.steps || []).map((step) => {
        if (step.key !== stepKey) return step;
        const total = Number(progress?.total ?? step.total ?? 1) || 1;
        const done = status === 'done' ? total : Math.min(total, Number(progress?.done ?? step.done ?? 0) || 0);
        return {
          ...step,
          status,
          text: text || step.text,
          total,
          done,
          startedAt: step.startedAt || (status === 'running' ? now : 0),
          finishedAt: ['done', 'error'].includes(status) ? now : step.finishedAt,
          retrying: status === 'running' ? false : step.retrying,
        };
      });
      const cardStartedAt = card.startedAt || (status === 'running' ? now : 0);
      const nextStatus = status === 'error' ? 'error' : (card.status === 'waiting' && status === 'running' ? 'running' : card.status);
      return { ...card, status: nextStatus, startedAt: cardStartedAt, steps };
    });
  },

  finishRoleCardLoading(id, profile = null) {
    const targetId = this.roleCardLoadingFindId(id);
    const now = Date.now();
    const card = this.roleCardLoadingCard(targetId);
    this.updateRoleCardLoading(targetId, {
      name: profile?.name || card?.name || '角色卡',
      status: 'done',
      finishedAt: now,
      steps: (card?.steps || []).map((step) => {
        const total = Number(step.total || 1);
        return { ...step, status: step.status === 'error' ? 'error' : 'done', done: total, total, finishedAt: step.finishedAt || now };
      }),
    });
    this.closeRoleCardLoadingIfComplete();
  },

  closeRoleCardLoadingIfComplete() {
    const cards = this.roleCardLoadingState.cards || [];
    if (cards.length && cards.every((card) => card.status === 'done')) {
      this.roleCardLoadingState.open = false;
    }
  },

  failRoleCardLoading(id, message = '生成失败') {
    const targetId = this.roleCardLoadingFindId(id);
    const card = this.roleCardLoadingCard(targetId);
    const steps = card?.steps || [];
    const failed = [...steps].reverse().find((step) => step.status === 'running') || steps.find((step) => step.status !== 'done') || steps[0];
    this.updateRoleCardLoading(targetId, { status: 'error', finishedAt: Date.now() });
    this.updateRoleCardLoadingStep(targetId, failed?.key || 'profile', 'error', message);
  },

  roleCardStepCanRetry(card = {}, step = {}) {
    return ['profile', 'feeling', 'abilities', 'inventory', 'bodyProfile', 'dressedProfile', 'rpgField', 'state'].includes(step.key)
      && card.status !== 'running'
      && step.status !== 'running'
      && !step.retrying;
  },

  async retryRoleCardLoadingStep(cardId, stepKey) {
    const targetId = this.roleCardLoadingFindId(cardId);
    const card = this.roleCardLoadingCard(targetId);
    if (!card || this.roleCardLoadingRetryQueue?.[targetId]) return;
    const step = (card.steps || []).find((item) => item.key === stepKey);
    if (!this.roleCardStepCanRetry(card, step)) return;
    const source = card.source || this.roleCardRetrySource(targetId);
    if (!source) {
      this.updateRoleCardLoadingStep(targetId, stepKey, 'error', '没有可重试的角色来源');
      return;
    }
    this.roleCardLoadingRetryQueue = { ...(this.roleCardLoadingRetryQueue || {}), [targetId]: true };
    this.markRoleCardStepRetrying(targetId, stepKey);
    try {
      const retrySource = { ...source, forceRoleCardRegenerate: true };
      if (card.type === '玩家卡' || source.id === 'player-self') await this.ensurePlayerRpgState?.(true, true);
      else await this.ensureRpgForCharacter?.(retrySource, card.context || this.entryCurrentAction || this.sceneTitle || '', { loadMetrics: source.id === this.character?.id });
    } catch (err) {
      console.warn('[角色卡] 手动重试失败:', err.message, err.stack);
      this.updateRoleCardLoadingStep(targetId, stepKey, 'error', err.message || '重试失败');
      this.updateRoleCardLoading(targetId, { status: 'error', finishedAt: Date.now() });
    } finally {
      const { [targetId]: _done, ...rest } = this.roleCardLoadingRetryQueue || {};
      this.roleCardLoadingRetryQueue = rest;
      this.clearRoleCardStepRetrying(targetId, stepKey);
    }
  },

  markRoleCardStepRetrying(id, stepKey) {
    const now = Date.now();
    this.roleCardLoadingState.cards = (this.roleCardLoadingState.cards || []).map((card) => {
      if (card.id !== id) return card;
      return {
        ...card,
        status: 'running',
        finishedAt: 0,
        expanded: true,
        startedAt: card.startedAt || now,
        steps: (card.steps || []).map((step) => step.key === stepKey ? { ...step, status: 'running', done: 0, retrying: true, startedAt: now, finishedAt: 0 } : step),
      };
    });
  },

  clearRoleCardStepRetrying(id, stepKey) {
    this.roleCardLoadingState.cards = (this.roleCardLoadingState.cards || []).map((card) => {
      if (card.id !== id) return card;
      return { ...card, steps: (card.steps || []).map((step) => step.key === stepKey ? { ...step, retrying: false } : step) };
    });
  },

  roleCardRetrySource(id) {
    if (id === 'player-self') return this.playerCharacterBase?.();
    if (this.character?.id === id) return this.character;
    return (this.characters || []).find((item) => item.id === id || item.name === id)
      || (this.wechatUsers || []).find((item) => item.id === id || item.name === id)
      || null;
  },

  roleCardLoadingCard(id) {
    return (this.roleCardLoadingState.cards || []).find((card) => card.id === id) || null;
  },

  roleCardLoadingDefaultSteps(type = '角色卡') {
    const first = type === '玩家卡' ? '生成玩家身份 Part1' : '生成角色身份 Part1';
    return [
      { key: 'profile', text: first, status: 'waiting', total: 19 },
      { key: 'feeling', text: '生成情感数值 Part2', status: 'waiting', total: 29 },
      { key: 'abilities', text: '生成能力职业 Part3', status: 'waiting', total: 3 },
      { key: 'inventory', text: '生成物品穿着 Part4', status: 'waiting', total: 13 },
      { key: 'bodyProfile', text: '生成身体原貌 Part5', status: 'waiting', total: 11 },
      { key: 'dressedProfile', text: '生成盛装状态 Part6', status: 'waiting', total: 11 },
      { key: 'rpgField', text: '生成 RPG 字段 Part7', status: 'waiting', total: 8 },
      { key: 'state', text: '固化 RPG 状态', status: 'waiting', total: 1 },
    ];
  },

  roleCardLoadingSummary() {
    const cards = this.roleCardLoadingState.cards || [];
    const player = cards.filter((card) => card.type === '玩家卡');
    const role = cards.filter((card) => card.type !== '玩家卡');
    const done = (items) => items.filter((card) => card.status === 'done').length;
    return `正在加载(${done(player)}/${player.length} 玩家卡, ${done(role)}/${role.length} 角色卡) ${this.roleCardLoadingProgressText()}`;
  },

  roleCardLoadingProgressText() {
    const cards = this.roleCardLoadingState.cards || [];
    const totals = cards.flatMap((card) => card.steps || []).reduce((acc, step) => ({ done: acc.done + (Number(step.done) || 0), total: acc.total + (Number(step.total) || 0) }), { done: 0, total: 0 });
    return totals.total ? `(${totals.done}/${totals.total})` : '';
  },

  roleCardLoadingCardProgress(card = {}) {
    const totals = (card.steps || []).reduce((acc, step) => ({ done: acc.done + (Number(step.done) || 0), total: acc.total + (Number(step.total) || 0) }), { done: 0, total: 0 });
    return totals.total ? `(${totals.done}/${totals.total})` : '';
  },

  roleCardLoadingStepProgress(step = {}) {
    return `(${Number(step.done) || 0}/${Number(step.total) || 0})`;
  },

  roleCardLoadingStatusText(status) {
    return { waiting: '等待', running: '加载中', done: '完成', error: '失败' }[status] || status;
  },
};
