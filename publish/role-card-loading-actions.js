window.GameModules = window.GameModules || {};

window.GameModules.roleCardLoadingActions = {
  startRoleCardLoadingBatch(cards = []) {
    const normalized = cards.map((card, index) => ({
      id: card.id || `role-card-${Date.now()}-${index}`,
      name: card.name || '发现新角色',
      type: card.type || '角色卡',
      status: 'waiting',
      expanded: true,
      steps: card.steps || this.roleCardLoadingDefaultSteps(card.type),
    }));
    this.roleCardLoadingState = { open: true, expanded: true, cards: normalized };
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

  updateRoleCardLoadingStep(id, stepKey, status, text = '') {
    const targetId = this.roleCardLoadingFindId(id);
    this.roleCardLoadingState.cards = (this.roleCardLoadingState.cards || []).map((card) => {
      if (card.id !== targetId) return card;
      const steps = (card.steps || []).map((step) => (
        step.key === stepKey ? { ...step, status, text: text || step.text } : step
      ));
      return { ...card, status: status === 'error' ? 'error' : card.status, steps };
    });
  },

  finishRoleCardLoading(id, profile = null) {
    const targetId = this.roleCardLoadingFindId(id);
    this.updateRoleCardLoading(targetId, {
      name: profile?.name || this.roleCardLoadingCard(targetId)?.name || '角色卡',
      status: 'done',
      steps: (this.roleCardLoadingCard(targetId)?.steps || []).map((step) => ({ ...step, status: step.status === 'error' ? 'error' : 'done' })),
    });
  },

  failRoleCardLoading(id, message = '生成失败') {
    this.updateRoleCardLoading(id, { status: 'error' });
    this.updateRoleCardLoadingStep(id, 'profile', 'error', message);
  },

  roleCardLoadingCard(id) {
    return (this.roleCardLoadingState.cards || []).find((card) => card.id === id) || null;
  },

  roleCardLoadingDefaultSteps(type = '角色卡') {
    const first = type === '玩家卡' ? '生成玩家身份 Part1' : '生成角色身份 Part1';
    return [
      { key: 'profile', text: first, status: 'waiting' },
      { key: 'feeling', text: '生成情感数值 Part2', status: 'waiting' },
      { key: 'abilities', text: '生成能力职业 Part3', status: 'waiting' },
      { key: 'inventory', text: '生成物品穿着 RPG Part4', status: 'waiting' },
      { key: 'state', text: '固化 RPG 状态', status: 'waiting' },
    ];
  },

  roleCardLoadingSummary() {
    const cards = this.roleCardLoadingState.cards || [];
    const player = cards.filter((card) => card.type === '玩家卡');
    const role = cards.filter((card) => card.type !== '玩家卡');
    const done = (items) => items.filter((card) => card.status === 'done').length;
    return `正在加载(${done(player)}/${player.length} 玩家卡, ${done(role)}/${role.length} 角色卡)`;
  },

  roleCardLoadingStatusText(status) {
    return { waiting: '等待', running: '加载中', done: '完成', error: '失败' }[status] || status;
  },
};
