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
    await this.refreshSaveMetas?.();
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
    this.homeLoadSlot = slot;
    this.setHomeLoadProgress(2, `准备载入 ${slot}…`);
    try {
      await this.yieldHomeLoadUi?.();
      await this.loadGameplayAssetsWithHomeProgress?.(8, 22);
      await this.yieldHomeLoadUi?.();
      this.setHomeLoadProgress(32, '合并应用能力…');
      window.GameModules.remergeGameStore?.();
      await this.yieldHomeLoadUi?.();
      this.setHomeLoadProgress(38, '读取存档并初始化世界…');
      await this.openSlot(slot);
      await this.yieldHomeLoadUi?.();
      this.setHomeLoadProgress(52, '存档已读取');
      await this.refreshSaveMetas?.();
      if (!this.phoneSetupDone) {
        this.setHomeLoadProgress(60, '加载新游戏资源…');
        await this.ensureNewGameAssetsReady?.();
        this.homeMessage = `${slot} 尚未完成手机激活，请从新游戏继续设置。`;
        this.homeScreenView = 'new-game';
        return;
      }
      this.setHomeLoadProgress(58, '恢复角色与玩法状态…');
      this.loadSavedRpgStates?.();
      this.ensureCatalogSelection?.();
      await this.yieldHomeLoadUi?.();
      this.setHomeLoadProgress(68, '加载角色卡…');
      await this.initPredefinedRoleCards?.();
      await this.yieldHomeLoadUi?.();
      if (!this.hasPlayerAspiration?.()) {
        this.setHomeLoadProgress(100, '载入完成');
        this.saveMessage = `已载入 ${slot}`;
        this.openPlayerAspirationWizard?.();
      } else {
        this.saveMessage = `已载入 ${slot}`;
        await this.enterPlayingFromSetup?.();
      }
    } catch (err) {
      console.error('[首页] 载入存档失败:', err.message, err.stack);
      this.homeMessage = err.message || '载入存档失败';
    } finally {
      this.clearHomeLoadProgress?.();
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
    if (this._enterPlayingPromise) return this._enterPlayingPromise;
    this._enterPlayingPromise = (async () => {
      this.phoneDesktopBooting = true;
      this.aspirationSetupOpen = false;
      if (!this.homeLoadActive) {
        this.setHomeLoadProgress?.(5, '正在进入手机桌面…');
      } else {
        this.setHomeLoadProgress?.(12, '正在进入手机桌面…');
      }
      await this.yieldHomeLoadUi?.();
      try {
        await this.loadGameplayAssetsWithHomeProgress?.(12, 72);
      } catch (err) {
        console.warn('[首页] 玩法资源加载失败:', err?.message || err);
      }
      this._desktopModulesReady = true;
      this.setHomeLoadProgress?.(88, '初始化应用模块…');
      window.GameModules.remergeGameStore?.();
      this.runDeferredInits?.();
      await this.yieldHomeLoadUi?.();
      this.homeScreenView = 'playing';
      this.homeSavePanelOpen = false;
      this.homeMessage = '';
      this.desktopUnlocked = false;
      this.setHomeLoadProgress?.(96, '即将完成…');
      await this.yieldHomeLoadUi?.();
      this.phoneDesktopBooting = false;
      this.setHomeLoadProgress?.(100, '载入完成');
      await this.yieldHomeLoadUi?.();
      this.clearHomeLoadProgress?.();
      this.startStartupWarmup?.();
      if (this.phoneSetupDone && this.hasPlayerAspiration?.() && this.character?.id && !this.started && !this.entryTimeOptions?.start && !this.entrySetupOpen) {
        try {
          await this.prepareEntrySetup?.();
        } catch (err) {
          console.warn('[首页] 自动准备控制入口失败:', err?.message || err);
        }
      }
    })().finally(() => {
      this._enterPlayingPromise = null;
    });
    return this._enterPlayingPromise;
  },
};
