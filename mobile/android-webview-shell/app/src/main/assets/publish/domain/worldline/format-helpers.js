window.GameModules = window.GameModules || {};
window.GameModules.domain = window.GameModules.domain || {};
window.GameModules.domain.worldline = window.GameModules.domain.worldline || {};

window.GameModules.domain.worldline.formatHelpers = {
  worldlineSafeId(value = '') {
    return String(value || '').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');
  },

  worldlineTurnEventId(result = {}) {
    const time = this.worldlineSafeId(this.entryTimeLabel?.() || this.sceneTitle || 'time').slice(0, 40) || 'time';
    const name = this.worldlineSafeId(this.character?.id || this.character?.name || 'character').slice(0, 24) || 'character';
    const title = this.worldlineSafeId(result.sceneTitle || this.sceneTitle || 'scene').slice(0, 24) || 'scene';
    return `turn_${name}_${time}_${title}_${this.turn || 1}`.slice(0, 120);
  },

  worldlineTurnDetail(result = {}) {
    return [
      `玩家：${this.playerName || this.playerProfile?.name || '玩家'}`,
      `操控对象：${this.character?.name || '未知角色'}｜作品：${this.character?.work || '原创世界'}｜模式：${this.online ? 'online' : 'offline'}｜${this.controlMode || 'possess'}`,
      `玩家行动：${this.lastAction || this.entryCurrentAction || ''}`,
      `正文：${String(result.narration || '')}`,
      result.mind ? `被操控者心理：${result.mind}` : '',
      result.quest ? `结果目标：${result.quest}` : '',
    ].filter(Boolean).join('\n');
  },

  connectionWorldlineEvent(line = {}, context = '') {
    const eventId = `connection_${this.worldlineSafeId(this.character?.id || this.character?.name || 'character')}_${this.worldlineSafeId(this.entryTimeLabel?.() || this.sceneTitle || 'time')}_${this.turn || 1}`.slice(0, 120);
    return {
      eventId,
      name: '玩家上线连接',
      time: this.entryTimeLabel?.() || this.sceneTitle || '当前时间',
      detail: [
        `玩家：${this.playerName || this.playerProfile?.name || '玩家'}`,
        `操控对象：${this.character?.name || '未知角色'}｜作品：${this.character?.work || '原创世界'}｜模式：${this.online ? 'online' : 'offline'}｜${this.controlMode || 'possess'}`,
        `进入上下文：${String(context || this.entryCurrentAction || '玩家连接角色，世界线开始记录偏移。')}`,
      ].join('\n'),
      storyIndexes: line.storyIndexes || ['默认剧情起点'],
      factionIds: Object.keys(line.factions || {}).slice(0, 2),
      status: '进行中',
    };
  },

  factionAttrs(faction) {
    return Object.entries(faction?.属性 || {}).map(([key, value]) => `${key}:${value}`).join('；') || '无';
  },

  factionRelations(faction) {
    return Object.entries(faction?.关系网 || {}).map(([key, value]) => `${key}:${value}`).join('；') || '无';
  },
};
