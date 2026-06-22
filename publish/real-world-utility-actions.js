window.GameModules = window.GameModules || {};

window.GameModules.realWorldUtilityActions = {
  async assignRealWorldlineEntry(entry) {
    this.realWorldlineState = this.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    const event = { eventId: `real_${entry.id}`, name: entry.sceneTitle || entry.locationName || this.realWorldSceneTitle || '现实事件', time: entry.time?.label || '', detail: String(entry.narration || entry.thinking || entry.text || ''), status: entry.streaming ? '记录中' : '已记录' };
    this.realWorldlineState.events = [...(this.realWorldlineState.events || []).filter((item) => item.eventId !== event.eventId), event].slice(-40);
    const assigned = window.GameModules.worldlinePlots.assign(this, this.realWorldlineState, event, '现实情节');
    entry.plotId = event.plotId;
    await assigned;
  },

  async recordPlayerRealWorldMemory(action, result) {
    const text = [`现实行动：${action}`, `发生：${result.narration || ''}`, result.thinking ? `推演：${result.thinking}` : '', `目标：${result.quest || this.realWorldQuest}`].filter(Boolean).join('\n');
    const store = { ...this, sceneTitle: result.sceneTitle || this.realWorldSceneTitle, entryTime: null, entryTimeLabel: () => `${this.phoneDateText()} ${this.phoneTimeText()}` };
    const memory = window.GameModules.characterMemory.ensure('player-self');
    const item = window.GameModules.characterMemory.memoryItem(store, { text, source: 'real-world', impression: 55 });
    memory.shortTerm.recent.push(item);
    window.GameModules.characterMemory.promote(memory, item);
    await window.GameModules.characterMemory.compact('player-self', memory);
  },

  async copyRealWorldPlayerText(text = '') {
    const value = String(text || '').trim();
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const el = document.createElement('textarea');
        el.value = value;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        el.remove();
      }
      window.dzmm?.toast?.success?.('已复制');
    } catch (err) {
      console.warn('复制现实行动失败:', err.message, err.stack);
      window.dzmm?.toast?.error?.('复制失败');
    }
  },

  openRealWorldPrompt(id) {
    const entry = this.realWorldLog.find((item) => item.id === id);
    if (!entry?.promptPack) return;
    this.promptDialogEntry = entry;
    this.promptDialogTab = 'system';
    this.promptDialogOpen = true;
  },
};
