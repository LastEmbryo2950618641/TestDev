window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.realWorld = window.GameModules.ui.realWorld || {};

window.GameModules.ui.realWorld.panelViewHelpers = {
  choiceIcon() {
    return '✦';
  },

  entryIcon(entry = {}) {
    return entry?.type === 'user' ? '🧍' : (entry?.transientError ? '⚠️' : '📜');
  },

  statusIcon(text = '') {
    const value = String(text || '');
    if (/目标|任务/u.test(value)) return '🎯';
    if (/地点|位置|现实/u.test(value)) return '🗺️';
    return '✧';
  },

  matterButtonText() {
    return this.activeRealWorldMatter?.() ? '📌 事项：进行中' : '📌 事项';
  },

  functionEyebrow() {
    return 'FUNCTION';
  },

  functionTitle() {
    return '功能面板';
  },

  functionHint() {
    return '相关模块加载完成后可用。';
  },

  choicesWithMatters() {
    return Array.isArray(this.realWorldChoices) ? this.realWorldChoices : [];
  },
};