window.GameModules = window.GameModules || {};

window.GameModules.playerSetupActions = {
  playerSetupSummary() {
    const p = this.playerProfile || {};
    return [
      `姓名/代号：${p.name || this.playerName || '未填写'}`,
      `城市：${p.city || '未填写'}`,
      `身份：${p.dailyRole || '未填写'}`,
      `居住：${p.livingStatus || '未填写'}`,
      `关系：${p.relationships || '由玩家自行设定，暂无补充'}`,
      `备注：${p.notes || '无'}`,
    ].join('\n');
  },

  completePlayerSetup() {
    const name = (this.playerProfile.name || this.playerName || '').trim();
    if (!name) return;
    this.playerProfile = {
      ...this.playerProfile,
      name,
      city: (this.playerProfile.city || '').trim(),
      dailyRole: (this.playerProfile.dailyRole || '').trim(),
      livingStatus: (this.playerProfile.livingStatus || '').trim(),
      relationships: (this.playerProfile.relationships || '').trim(),
      notes: (this.playerProfile.notes || '').trim(),
      initializedAt: this.playerProfile.initializedAt || new Date().toISOString(),
    };
    this.playerName = name;
    this.phoneSetupDone = true;
    this.save();
  },

  reopenPlayerSetup() {
    this.phoneSetupDone = false;
  },
};
