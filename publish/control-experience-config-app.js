window.GameModules = window.GameModules || {};

(function attachControlExperienceConfigApp(modules) {
  function configModule() {
    return modules.controlExperienceConfig || {};
  }

  function stageModule() {
    return modules.controlExperienceStage || {};
  }

  function normalizeBaseConfig(raw) {
    if (typeof configModule().normalize === 'function') return configModule().normalize(raw);
    if (typeof configModule().normalizeConfig === 'function') return configModule().normalizeConfig(raw);
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
      enabled: source.enabled !== false,
      masterPrompt: typeof source.masterPrompt === 'string' ? source.masterPrompt : '',
    };
  }

  function defaultState() {
    const normalized = normalizeBaseConfig(typeof configModule().defaultConfig === 'function' ? configModule().defaultConfig() : {});
    return {
      open: false,
      enabled: normalized.enabled,
      masterPrompt: normalized.masterPrompt,
      message: '',
      error: '',
      previewItems: [],
    };
  }

  function normalizeControlExperienceConfigState(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const normalized = normalizeBaseConfig(source);
    return {
      ...defaultState(),
      ...normalized,
      open: Boolean(source.open),
      message: typeof source.message === 'string' ? source.message : '',
      error: typeof source.error === 'string' ? source.error : '',
      previewItems: Array.isArray(source.previewItems) ? source.previewItems : [],
    };
  }

  function controlExperiencePreviewItems(state = {}) {
    const config = normalizeBaseConfig(state);
    const previews = typeof configModule().previewCases === 'function' ? configModule().previewCases() : [];
    return previews.map((item, index) => {
      const meta = typeof stageModule().resolveStageMeta === 'function'
        ? stageModule().resolveStageMeta(item)
        : {
          onlineCount: Number(item.onlineCount) || 0,
          adaptation: Number(item.adaptation) || 0,
          stageLabel: '',
          stageDescription: '',
        };
      const promptText = typeof stageModule().renderPromptBlock === 'function'
        ? stageModule().renderPromptBlock({ config, ...item })
        : '';
      return {
        key: item.key || `preview-${index + 1}`,
        label: item.label || meta.stageLabel || `案例 ${index + 1}`,
        onlineCount: meta.onlineCount,
        adaptation: meta.adaptation,
        stageLabel: meta.stageLabel || '',
        stageDescription: meta.stageDescription || '',
        promptText: String(promptText || '').trim(),
      };
    });
  }

  function syncControlExperiencePreview(store) {
    if (!store) return [];
    const state = normalizeControlExperienceConfigState(store.controlExperienceConfigState);
    state.previewItems = controlExperiencePreviewItems(state);
    store.controlExperienceConfigState = state;
    return state.previewItems;
  }

  modules.controlExperienceConfigApp = {
    defaultState,
    normalizeControlExperienceConfigState,
    controlExperiencePreviewItems,
    syncControlExperiencePreview,

    initControlExperienceConfigApp() {
      this.controlExperienceConfigState = normalizeControlExperienceConfigState(this.controlExperienceConfigState);
      syncControlExperiencePreview(this);
    },

    openControlExperienceConfigApp() {
      this.initControlExperienceConfigApp?.();
      this.closeDesktopApps?.();
      this.controlExperienceConfigState.open = true;
      this.controlExperienceConfigState.message = '';
      this.controlExperienceConfigState.error = '';
      this.desktopUnlocked = true;
      syncControlExperiencePreview(this);
    },

    closeControlExperienceConfigApp() {
      if (this.controlExperienceConfigState) {
        Object.assign(this.controlExperienceConfigState, {
          open: false,
          message: '',
          error: '',
        });
      }
      this.closeAppToDesktop?.();
    },

    saveControlExperienceConfig() {
      this.initControlExperienceConfigApp?.();
      const normalized = normalizeBaseConfig(this.controlExperienceConfigState);
      this.controlExperienceConfigState = {
        ...normalizeControlExperienceConfigState(this.controlExperienceConfigState),
        ...normalized,
        open: true,
        message: '上线体验配置已保存到当前存档。',
        error: '',
      };
      this.controlExperienceConfigState.previewItems = controlExperiencePreviewItems(this.controlExperienceConfigState);
    },

    resetControlExperiencePrompt() {
      this.initControlExperienceConfigApp?.();
      const normalized = normalizeBaseConfig(typeof configModule().defaultConfig === 'function' ? configModule().defaultConfig() : {});
      this.controlExperienceConfigState = {
        ...normalizeControlExperienceConfigState(this.controlExperienceConfigState),
        ...normalized,
        open: true,
        message: '已恢复默认总提示词。',
        error: '',
      };
      this.controlExperienceConfigState.previewItems = controlExperiencePreviewItems(this.controlExperienceConfigState);
    },
  };
})(window.GameModules);
