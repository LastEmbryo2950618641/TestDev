window.GameModules = window.GameModules || {};

window.GameModules.homeActions = {
  hasContinueSave() {
    return Boolean(this.latestSaveSlot());
  },

  latestSaveSlot() {
    const slots = this.saveSlots || [];
    const ranked = slots
      .map((slot) => ({ slot, meta: this.saveMeta(slot) }))
      .filter((item) => item.meta.exists && item.meta.phoneSetupDone)
      .sort((a, b) => new Date(b.meta.savedAt || 0) - new Date(a.meta.savedAt || 0));
    return ranked[0]?.slot || null;
  },

  saveSlotLabel(slot) {
    const meta = this.saveMeta(slot);
    if (!meta.exists) return '空存档位';
    if (meta.playerName) return meta.playerName;
    if (meta.phoneSetupDone) return '已激活存档';
    return '未完成激活';
  },

  async openHomeSavePanel() {
    this.homeMessage = '';
    await this.refreshSaveMetas?.();
    this.homeSavePanelOpen = true;
  },

  closeHomeSavePanel() {
    this.homeSavePanelOpen = false;
  },

  async startNewGame() {
    if (this.busy) return;
    this.homeMessage = '';
    this.homeSavePanelOpen = false;
    let emptySlot = this.findEmptySaveSlot?.() || null;
    if (!emptySlot) {
      await this.refreshSaveMetas?.();
      emptySlot = this.findEmptySaveSlot?.() || null;
    }
    if (!emptySlot) {
      this.homeMessage = '没有空存档位，请先在「打开存档」中删除不需要的存档。';
      return;
    }
    this.busy = true;
    this.homeScreenView = 'new-game';
    try {
      this.phoneSetupDone = false;
      this.phoneActivationChoice = '';
      this.playerProfileTraitDefaultsApplied = false;
      this.desktopUnlocked = false;
      this.started = false;
      await this.newSlot?.(emptySlot);
      this.playerName = '';
      this.playerProfile = {
        ...this.playerProfile,
        name: '',
        birthday: '',
        gender: '',
        city: '',
        dailyRole: '',
        livingStatus: '',
        relationships: '',
        relationshipEntries: [],
        notes: '',
      };
      this.setupError = '';
      this.playerAspiration = null;
      this.aspirationSetupOpen = false;
      this.log = [];
      this.turn = 1;
      await this.refreshSaveMeta?.(emptySlot);
    } catch (err) {
      console.error('[首页] 开始新游戏失败:', err.message, err.stack);
      this.homeMessage = err.message || '开始新游戏失败';
      this.homeScreenView = 'menu';
    } finally {
      this.busy = false;
    }
  },

  backToHomeMenu() {
    this.homeMessage = '';
    this.homeSavePanelOpen = false;
    this.homeScreenView = 'menu';
    this.phoneActivationChoice = '';
    this.setupError = '';
  },

  async continueGame() {
    if (this.busy) return;
    this.homeMessage = '';
    if (!Object.keys(this.saveMetas || {}).length) await this.refreshSaveMetas?.();
    const slot = this.latestSaveSlot();
    if (!slot) {
      this.homeMessage = '没有可继续的存档，请先开始新游戏。';
      return;
    }
    await this.loadSlotFromHome(slot);
  },

  async loadSlotFromHome(slot) {
    if (this.busy || !this.saveMeta(slot).exists) return;
    this.busy = true;
    try {
      this.selectedSlot = slot;
      await window.GameModules.storage.open(slot);
      const save = await window.GameModules.storage.get();
      if (!save) throw new Error(`${slot} 没有可读取的存档数据`);
      window.GameModules.storage.restore(this, save);
      await this.loadWritingStyles?.({ readOnly: true });
      const storedStates = window.GameModules.characterStateStore?.list?.() || [];
      const nextStates = { ...(this.rpgStates || {}) };
      const ensureIds = new Set(['player-self', this.selectedCharacterId, this.rpgPanelCharacterId].filter(Boolean));
      storedStates.forEach((state) => {
        if (!state?.id) return;
        const profile = state.profile || {};
        const solidified = profile.roleCard === true || profile.roleCardSource || profile.roleCardUpdatedAt;
        if (ensureIds.has(state.id) || solidified) nextStates[state.id] = state;
      });
      ensureIds.forEach((id) => {
        if (nextStates[id]) return;
        const state = window.GameModules.characterStateStore?.get?.(id);
        if (state?.id) nextStates[state.id] = state;
      });
      this.rpgStates = nextStates;
      Object.values(nextStates).forEach((state) => {
        if (!state?.values) return;
        if (window.GameModules.progression?.ensureStateMechanics?.(state, state.profile || {})) {
          window.GameModules.characterStateStore?.save?.(state, this);
        }
      });
      this.rpgPanelCharacterId = this.rpgPanelCharacterId || this.selectedCharacterId || 'player-self';
      if (!this.phoneSetupDone) {
        this.homeMessage = `${slot} 尚未完成手机激活，请从新游戏继续设置。`;
        this.homeScreenView = 'new-game';
        return;
      }
      this.homeScreenView = 'playing';
      this.homeSavePanelOpen = false;
      this.aspirationSetupOpen = false;
      this.desktopUnlocked = false;
      this.saveMessage = `已载入 ${slot}`;
      this.scheduleIdleLoad?.(() => {
        this.ensureCatalogSelection?.();
        if (!this.roleCardSetup?.loaded) void this.initPredefinedRoleCards?.();
        this.startStartupWarmup?.();
      }, 1200);
      this.scheduleIdleLoad?.(() => void this.refreshSaveMetas?.(), 1600);
    } catch (err) {
      console.error('[首页] 载入存档失败:', err.message, err.stack);
      this.homeMessage = err.message || '载入存档失败';
    } finally {
      this.busy = false;
    }
  },

  async deleteSaveSlot(slot) {
    if (this.busy || !this.saveMeta(slot).exists) return;
    this.busy = true;
    try {
      await window.GameModules.storage.remove(slot);
      if (this.selectedSlot === slot) {
        await window.GameModules.storage.open(slot);
        this.phoneSetupDone = false;
        this.phoneActivationChoice = '';
        this.started = false;
        this.rpgStates = {};
        this.playerName = '';
        this.playerProfile = { ...this.playerProfile, name: '', birthday: '', relationships: '', relationshipEntries: [] };
      }
      await this.refreshSaveMetas?.();
      this.saveMessage = `已删除 ${slot}`;
      if (!this.hasContinueSave() && this.homeScreenView === 'menu') this.homeMessage = '';
    } catch (err) {
      console.error('[首页] 删除存档失败:', err.message, err.stack);
      this.homeMessage = err.message || '删除存档失败';
    } finally {
      this.busy = false;
    }
  },

  async enterPlayingFromSetup() {
    this.aspirationSetupOpen = false;
    this.homeScreenView = 'playing';
    this.homeSavePanelOpen = false;
    this.homeMessage = '';
    this.desktopUnlocked = false;
    this.wechatAppOpen = false;
    this.identityAppOpen = false;
    this.entrySetupOpen = false;
    this.entryIdentityOpen = false;
  },
};
