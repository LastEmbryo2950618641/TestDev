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
        const storage = window.GameModules.platform?.storage?.backend;
        const states = window.GameModules.characterStateStore?.list?.() || [];
        const exportedAt = new Date().toISOString();
        const slot = this.selectedSlot || storage?.currentSlot?.() || '';
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

    async exportRoleCardJson() {
      if (!String(this.roleCardJsonText || '').trim()) {
        await this.refreshRoleCardJsonText?.();
      }
      const textValue = String(this.roleCardJsonText || '').trim();
      if (!textValue) {
        this.roleCardJsonError = '当前没有可导出的角色卡 JSON。';
        return;
      }
      const slot = String(this.roleCardJsonMeta?.slot || this.selectedSlot || 'slot').trim() || 'slot';
      const exportedAt = String(this.roleCardJsonMeta?.exportedAt || new Date().toISOString()).replace(/[:]/g, '-');
      const fileName = 'role-card-json-' + slot + '-' + exportedAt.slice(0, 19).replace('T', '_') + '.json';
      try {
        await window.GameModules.platform.core.files.saveFile({
          fileName,
          path: fileName,
          content: textValue,
          mimeType: 'application/json;charset=utf-8',
        });
        this.roleCardJsonError = '';
      } catch (err) {
        this.roleCardJsonError = err?.message || '角色卡 JSON 导出失败';
      }
    },

    async importRoleCardJsonPreview() {
      try {
        const file = await window.GameModules.platform.core.files.pickFile({ accept: ['.json', 'application/json'] });
        if (!file) return;
        const payload = await window.GameModules.platform.core.files.readJson(file);
        const app = window.GameModules.roleCardJsonApp;
        const slot = String(payload?.slot || this.selectedSlot || '').trim();
        const exportedAt = String(payload?.exportedAt || '').trim();
        const characters = Array.isArray(payload?.characters) ? payload.characters : [];
        const normalized = {
          slot,
          exportedAt,
          count: Number.isFinite(Number(payload?.count)) ? Number(payload.count) : characters.length,
          characters: characters.map((state) => app.normalizeCharacter(state)),
        };
        this.roleCardJsonText = app.formatPayload(normalized);
        this.roleCardJsonMeta = { slot: normalized.slot, count: normalized.count, exportedAt: normalized.exportedAt };
        this.roleCardJsonError = '';
      } catch (err) {
        this.roleCardJsonError = err?.message || '角色卡 JSON 导入失败';
      }
    },
  },
};
