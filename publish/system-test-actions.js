window.GameModules = window.GameModules || {};

window.GameModules.systemTestActions = {
  initSystemTestApp() {
    this.systemTestState = {
      open: false,
      loading: false,
      result: '',
      error: '',
      systemText: '你是一个测试助手。无论用户输入什么，只回答：SYSTEM_OK。',
      userText: '请测试 system role 是否生效。',
      ...(this.systemTestState || {}),
    };
  },

  openSystemTestApp() {
    this.initSystemTestApp();
    this.closeDesktopApps?.();
    this.systemTestState.open = true;
    this.desktopUnlocked = true;
  },

  closeSystemTestApp() {
    if (this.systemTestState) this.systemTestState.open = false;
    this.closeAppToDesktop?.();
  },

  async runSystemRoleTest() {
    this.initSystemTestApp();
    const state = this.systemTestState;
    if (state.loading) return;
    state.loading = true;
    state.result = '';
    state.error = '';
    let fullText = '';
    try {
      await window.dzmm.completions({
        model: this.modelId || this.settingsState?.textModelId || window.GameModules.config?.defaultModelId || 'nalang-turbo-0826',
        messages: [
          { role: 'system', content: state.systemText || '' },
          { role: 'user', content: state.userText || '' },
        ],
        maxTokens: 200,
      }, (content, done) => {
        fullText += content || '';
        state.result = fullText;
        if (done && !state.result.trim()) state.result = '请求成功，但返回为空。';
      });
      if (!state.result.trim()) state.result = fullText || '请求成功，但返回为空。';
    } catch (err) {
      state.error = [err?.code, err?.message].filter(Boolean).join('｜') || '请求失败';
      console.error('[system role 测试] 失败:', err?.code, err?.message, err?.stack);
    } finally {
      state.loading = false;
    }
  },
};
