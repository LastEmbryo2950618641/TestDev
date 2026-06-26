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
    this.solidifyState = { ...(this.solidifyState || {}), candidates: merged, open: merged.length ? true : this.solidifyState?.open, selectedKey: this.solidifyState?.selectedKey || this.solidifyKey(merged[0]) || '' };
  },

  solidifyKey(card = {}) { return card?.name ? `${card.worldTag || ''}::${card.name}` : ''; },

  solidifyCandidates() {
    const list = this.solidifyState?.candidates || [];
    return list.filter((card) => !window.GameModules.characterIntroCard.roleCardExists(card));
  },

  selectedSolidifyCard() {
    const key = this.solidifyState?.selectedKey || this.solidifyKey(this.solidifyCandidates()[0]);
    return this.solidifyCandidates().find((card) => this.solidifyKey(card) === key) || this.solidifyCandidates()[0] || null;
  },

  selectSolidifyCard(card) { this.solidifyState.selectedKey = this.solidifyKey(card); },

  dismissSolidifyCard(card = this.selectedSolidifyCard()) {
    const key = this.solidifyKey(card);
    const left = (this.solidifyState?.candidates || []).filter((item) => this.solidifyKey(item) !== key);
    this.solidifyState = { ...(this.solidifyState || {}), candidates: left, selectedKey: this.solidifyKey(left[0]) || '', open: left.length ? this.solidifyState.open : false };
    this.save?.();
  },

  async solidifySelectedIntroCard(card = this.selectedSolidifyCard()) {
    if (!card || this.busy) return;
    const source = { id: `npc-${window.GameModules.characterProfile.slug(card.worldTag)}-${window.GameModules.characterProfile.slug(card.name)}`, name: card.name, work: card.worldTag, role: card.role, detail: card.intro, importance: 'support', isMinor: false };
    this.startRoleCardLoadingBatch?.([{ id: source.id, name: card.name, type: '角色卡', source, context: card.intro }]);
    await this.ensureRpgForCharacter(source, card.intro, { loadMetrics: false, allowManualSolidify: true });
    this.dismissSolidifyCard(card);
  },
};
