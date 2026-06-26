window.GameModules = window.GameModules || {};

window.GameModules.solidifyActions = {
  async collectSolidifiableCharacters(result = {}, mode = 'story') {
    const source = [
      ...(Array.isArray(result.appearedCharacters) ? result.appearedCharacters : []),
      ...(Array.isArray(result.solidifiableCharacters) ? result.solidifiableCharacters : []),
    ];
    const cards = await window.GameModules.characterIntroCard.ensureMany(this, source, mode);
    const existing = this.solidifyState?.candidates || [];
    const merged = [...existing];
    for (const card of cards) {
      if (!merged.some((item) => item.name === card.name && item.worldTag === card.worldTag)) merged.push(card);
    }
    const visible = this.solidifyDisplayCards(merged);
    this.solidifyState = { ...(this.solidifyState || {}), candidates: merged, open: Boolean(this.solidifyState?.open), selectedKey: this.solidifyState?.selectedKey || this.solidifyKey(visible[0]) || '' };
  },

  solidifyKey(card = {}) { return card?.name ? `${card.worldTag || ''}::${card.name}` : ''; },

  solidifyDisplayCards(list = this.solidifyState?.candidates || []) {
    return (Array.isArray(list) ? list : []).map((card) => this.solidifyDisplayCard(card)).filter(Boolean);
  },

  solidifyDisplayCard(card = {}) {
    if (!card?.name) return null;
    const state = window.GameModules.characterIntroCard.roleCardState(card);
    if (state) return { ...card, displayType: 'role', roleState: state, profile: state.profile || {}, role: state.profile?.role || card.role || '角色卡', intro: state.profile?.detail || card.intro || '完整角色卡已固化。' };
    return { ...card, displayType: 'intro' };
  },

  solidifyCandidates() { return this.solidifyDisplayCards(); },

  selectedSolidifyCard() {
    const cards = this.solidifyCandidates();
    const key = this.solidifyState?.selectedKey || this.solidifyKey(cards[0]);
    return cards.find((card) => this.solidifyKey(card) === key) || cards[0] || null;
  },

  solidifyPanelTitle() { return this.selectedSolidifyCard()?.displayType === 'role' ? '角色卡查看' : '介绍卡固化'; },

  solidifyTypeLabel(card = this.selectedSolidifyCard()) { return card?.displayType === 'role' ? '角色卡' : '介绍卡'; },

  solidifyDetailRows(card = this.selectedSolidifyCard()) {
    if (!card) return [];
    if (card.displayType !== 'role') return [
      ['世界', card.worldTag || '未知世界'],
      ['身份', card.role || '出场人物'],
      ['穿着', this.solidifyWearingText(card)],
      ['介绍', card.intro || '暂无介绍。'],
    ];
    const profile = card.profile || card.roleState?.profile || {};
    return [
      ['世界', card.roleState?.worldTag || card.worldTag || profile.work || '未知世界'],
      ['身份', profile.role || card.role || '角色卡'],
      ['穿着', this.solidifyWearingText(card.roleState || profile)],
      ['外貌', profile.appearance || '未记录'],
      ['性格', profile.personality || '未记录'],
      ['详情', profile.detail || card.intro || '完整角色卡已固化。'],
    ];
  },

  solidifyWearingText(source = {}) {
    const values = source.values || {};
    const profile = source.profile || {};
    const raw = values.wearing || source.wearingItems || source.wearing || profile.wearingItems || profile.wearing || source.clothing || source.outfit || source.dressedProfile || profile.dressedProfile || '';
    const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw).flat() : []);
    if (list.length) return list.map((item) => this.solidifyWearingItemText(item)).filter(Boolean).join('；') || '当前无明确穿着记录。';
    return String(raw || '当前无明确穿着记录。').slice(0, 260);
  },

  solidifyWearingItemText(item) {
    if (!item) return '';
    if (typeof item === 'string') return item;
    const name = item.name || item.label || item.description || '';
    if (!name || name === '未穿戴' || name === '未记录') return '';
    const slot = item.slotLabel || item.clothing_position || item.slot || item.part || '';
    return `${slot ? `${slot}：` : ''}${name}`;
  },

  selectSolidifyCard(card) { this.solidifyState.selectedKey = this.solidifyKey(card); },

  closeSolidifyPanel() { this.solidifyState.open = false; },

  async solidifySelectedIntroCard(card = this.selectedSolidifyCard()) {
    if (!card || card.displayType === 'role' || this.busy) return;
    const source = { id: `npc-${window.GameModules.characterProfile.slug(card.worldTag)}-${window.GameModules.characterProfile.slug(card.name)}`, name: card.name, work: card.worldTag, role: card.role, detail: card.intro, importance: 'support', isMinor: false };
    this.startRoleCardLoadingBatch?.([{ id: source.id, name: card.name, type: '角色卡', source, context: card.intro }]);
    await this.ensureRpgForCharacter(source, card.intro, { loadMetrics: false, allowManualSolidify: true });
    this.solidifyState = { ...(this.solidifyState || {}), selectedKey: this.solidifyKey(card), open: true };
  },
};
