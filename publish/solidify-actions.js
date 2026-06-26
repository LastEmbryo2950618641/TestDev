window.GameModules = window.GameModules || {};

window.GameModules.solidifyActions = {
  async collectSolidifiableCharacters(result = {}, mode = 'story') {
    const source = [
      ...(Array.isArray(result.appearedCharacters) ? result.appearedCharacters : []),
      ...(Array.isArray(result.solidifiableCharacters) ? result.solidifiableCharacters : []),
    ];
    const cards = await window.GameModules.characterIntroCard.ensureMany(this, source, mode);
    await this.syncSolidifyWearing?.(cards);
    return this.solidifyDisplayCards(cards);
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

  selectedSolidifyCard(entry = null) {
    const cards = this.solidifyEntryCards(entry);
    const key = entry ? (entry.solidifySelectedKey || this.solidifyKey(cards[0])) : (this.solidifyState?.selectedKey || this.solidifyKey(cards[0]));
    return cards.find((card) => this.solidifyKey(card) === key) || cards[0] || null;
  },

  solidifyEntryCards(entry = null) { return entry ? this.solidifyDisplayCards(entry.solidifyCards || []) : this.solidifyDisplayCards(); },

  solidifyPanelTitle(card = this.selectedSolidifyCard()) { return card?.displayType === 'role' ? '角色卡查看' : '介绍卡固化'; },

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
    const list = this.solidifyWearingItems(source);
    if (list.length) return list.map((item) => this.solidifyWearingItemText(item)).filter(Boolean).join('；') || '当前无明确穿着记录。';
    const raw = this.solidifyRawWearing(source);
    return String(raw || '当前无明确穿着记录。').slice(0, 260);
  },

  solidifyRawWearing(source = {}) {
    const values = source.values || {};
    const profile = source.profile || {};
    return values.wearing || source.wearingItems || source.wearing || profile.wearingItems || profile.wearing || source.clothing || source.outfit || source.dressedProfile || profile.dressedProfile || '';
  },

  solidifyWearingItems(source = {}, state = null) {
    const raw = this.solidifyRawWearing(source);
    const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw).flat() : []);
    if (list.length) return list.map((item) => this.solidifyNormalizeWearingItem(item, state)).filter(Boolean);
    const text = String(raw || '').trim();
    if (!text || /^当前无明确|未记录|无$/u.test(text)) return [];
    return [this.solidifyNormalizeWearingItem({ name: text, slot: this.solidifyInferWearSlot(text), description: text, reason: '现实推演正文确认的当前穿着。' }, state)].filter(Boolean);
  },

  solidifyNormalizeWearingItem(item, state = null) {
    if (!item) return null;
    const p = window.GameModules.progression;
    const raw = typeof item === 'string' ? { name: item } : { ...item };
    const name = String(raw.name || raw.label || raw.description || '').trim();
    if (!name || name === '未穿戴' || name === '未记录') return null;
    const slot = p.canonicalWearSlot?.({ ...raw, slot: raw.slot || this.solidifyInferWearSlot(name) }) || raw.slot || '装备';
    return p.normalizeCarryItem?.({ ...raw, name, slot, description: raw.description || name, reason: raw.reason || '现实推演正文确认的当前穿着。', changeMode: '现实推演', source: 'AI生成' }, '穿着', state?.id || raw.ownerId || raw.characterId || '') || { ...raw, name, slot, type: '穿着' };
  },

  solidifyInferWearSlot(text = '') {
    if (/睡裙|连衣裙|裙|衬衫|T恤|上衣|背心|吊带/u.test(text)) return 'top';
    if (/裤|短裤|长裤|下装/u.test(text)) return 'bottom';
    if (/内衣|胸衣|文胸/u.test(text)) return 'innerwearTop';
    if (/内裤|底裤/u.test(text)) return 'innerwearBottom';
    if (/袜/u.test(text)) return 'socks';
    if (/鞋|靴/u.test(text)) return 'shoes';
    if (/外套|大衣|风衣/u.test(text)) return 'outerwear';
    return '装备';
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

  selectEntrySolidifyCard(entry, card) {
    if (!entry || !card) return;
    entry.solidifySelectedKey = this.solidifyKey(card);
    entry.solidifyOpen = true;
    this.log = [...(this.log || [])];
    this.realWorldLog = [...(this.realWorldLog || [])];
  },

  closeSolidifyPanel() { this.solidifyState.open = false; },

  closeEntrySolidifyPanel(entry) {
    if (!entry) return;
    entry.solidifyOpen = false;
    this.log = [...(this.log || [])];
    this.realWorldLog = [...(this.realWorldLog || [])];
  },

  async solidifySelectedIntroCard(card = this.selectedSolidifyCard(), entry = null) {
    if (!card || card.displayType === 'role' || this.busy) return;
    const source = { id: `npc-${window.GameModules.characterProfile.slug(card.worldTag)}-${window.GameModules.characterProfile.slug(card.name)}`, name: card.name, work: card.worldTag, role: card.role, detail: card.intro, importance: 'support', isMinor: false };
    this.startRoleCardLoadingBatch?.([{ id: source.id, name: card.name, type: '角色卡', source, context: card.intro }]);
    await this.ensureRpgForCharacter(source, card.intro, { loadMetrics: false, allowManualSolidify: true });
    if (entry) {
      entry.solidifyCards = this.solidifyDisplayCards(entry.solidifyCards || []);
      entry.solidifySelectedKey = this.solidifyKey(card);
      entry.solidifyOpen = true;
      this.log = [...(this.log || [])];
      this.realWorldLog = [...(this.realWorldLog || [])];
    } else {
      this.solidifyState = { ...(this.solidifyState || {}), selectedKey: this.solidifyKey(card), open: true };
    }
  },
};
