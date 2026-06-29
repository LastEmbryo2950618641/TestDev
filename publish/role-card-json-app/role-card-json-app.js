window.GameModules = window.GameModules || {};

window.GameModules.roleCardJsonApp = {
  clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  },

  normalizeCharacter(state = {}) {
    return {
      id: state.id || state.profile?.id || '',
      name: state.name || state.profile?.name || '',
      worldTag: state.worldTag || state.profile?.work || state.values?.world_tag || '',
      profile: this.clone(state.profile || {}),
      values: this.clone(state.values || {}),
      metrics: this.clone(state.metrics || {}),
      memory: this.clone(state.memory || {}),
      schema: this.clone(state.schema || null),
      updatedAt: state.updatedAt || '',
    };
  },

  buildPayload({ slot = '', states = [], exportedAt = new Date().toISOString() } = {}) {
    const characters = (Array.isArray(states) ? states : []).map((state) => this.normalizeCharacter(state));
    return {
      slot,
      exportedAt,
      count: characters.length,
      characters,
    };
  },

  formatPayload(payload) {
    return JSON.stringify(payload, null, 2);
  },

  actions: {
    openRoleCardJsonApp() {
      this.closeDesktopApps?.();
      this.roleCardJsonAppOpen = true;
      this.desktopUnlocked = true;
      this.refreshRoleCardJsonText?.();
    },

    closeRoleCardJsonApp() {
      this.roleCardJsonAppOpen = false;
      this.closeAppToDesktop?.();
    },

    async refreshRoleCardJsonText() {
      const app = window.GameModules.roleCardJsonApp;
      try {
        const save = window.GameModules.sqliteSave;
        const states = save?.listCharacterStates ? save.listCharacterStates() : [];
        const exportedAt = new Date().toISOString();
        const slot = this.selectedSlot || save?.activeSlot || '';
        const payload = app.buildPayload({ slot, states, exportedAt });
        this.roleCardJsonText = app.formatPayload(payload);
        this.roleCardJsonMeta = { slot: payload.slot, count: payload.count, exportedAt: payload.exportedAt };
        this.roleCardJsonError = '';
      } catch (err) {
        this.roleCardJsonText = '';
        this.roleCardJsonMeta = { slot: this.selectedSlot || '', count: 0, exportedAt: '' };
        this.roleCardJsonError = err?.message || '角色卡 JSON 读取失败';
      }
    },
  },
};
