window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.realWorld = window.GameModules.ui.realWorld || {};

window.GameModules.ui.realWorld.logViewHelpers = {
  displayLog(log = this.realWorldLog || []) {
    const rows = Array.isArray(log) ? log : [];
    const result = [];
    let activeActionText = '';
    let activeActionPending = false;
    rows.forEach((entry) => {
      if (entry?.type === 'user') {
        const text = String(entry.text || entry.playerText || entry.actionText || '').trim();
        const prev = result[result.length - 1];
        const prevText = String(prev?.text || prev?.playerText || prev?.actionText || '').trim();
        if (prev?.type === 'user' && text && text === prevText) return;
        if (activeActionPending && text && text === activeActionText) return;
        activeActionText = text;
        activeActionPending = Boolean(text);
        result.push(entry);
        return;
      }
      if (entry?.transientError) {
        const text = String(entry.narration || entry.statusText || entry.text || '').trim();
        const prev = result[result.length - 1];
        const prevText = String(prev?.narration || prev?.statusText || prev?.text || '').trim();
        if (prev?.transientError && text && text === prevText) return;
        activeActionPending = Boolean(activeActionText);
        result.push(entry);
        return;
      }
      activeActionText = '';
      activeActionPending = false;
      result.push(entry);
    });
    return result;
  },

  choiceIcon() {
    return '✦';
  },

  entryIcon(entry = {}) {
    return entry?.type === 'user' ? '🧍' : (entry?.transientError ? '⚠️' : '📜');
  },

  statusIcon(text = '') {
    const value = String(text || '');
    if (/目标|任务/u.test(value)) return '🎯';
    if (/地点|位置|现实/u.test(value)) return '🗇';
    return '✦';
  },

  matterButtonText() {
    return this.activeRealWorldMatter?.() ? '📌 事项：进行中' : '📌 事项';
  },

  logPageLabel() {
    const total = Math.max(0, Number(this.realWorldLogTotal || this.realWorldLog?.length || 0));
    return `第${this.realWorldLogPage || 1} / ${this.realWorldLogMaxPage()} 页，共 ${total} 条`;
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
