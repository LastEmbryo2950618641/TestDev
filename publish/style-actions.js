/**
 * 小说文风：默认预设、多选、自定义，并写入 SQLite metadata。
 */
window.GameModules = window.GameModules || {};

window.GameModules.styleActions = {
  defaultWritingStyles: [
    { id: 'literary', name: '文学细腻', prompt: '正文使用细腻文学文风，重视感官、动作细节和心理余波，避免口号式总结。' },
    { id: 'dark', name: '黑暗压抑', prompt: '正文氛围偏阴冷压抑，描写痛感、窒息感、阴影和危险，但不堆砌血腥。' },
    { id: 'light-novel', name: '轻小说节奏', prompt: '正文节奏清晰，场景推进明确，角色反应鲜明，句子易读但不口语化。' },
    { id: 'epic', name: '史诗庄重', prompt: '正文语言庄重、有命运感，强调时代、仪式、魔术体系和抉择重量。' },
    { id: 'suspense', name: '悬疑紧张', prompt: '正文保持悬疑张力，逐步揭示信息，用细节暗示危险，不直接解释全部真相。' },
  ],

  async loadWritingStyles() {
    const registered = window.GameModules.penStyleRegistry?.list?.() || [];
    if (registered.length) this.defaultWritingStyles = registered;
    const saved = window.GameModules.sqliteSave.getMetaJson?.('writing_styles');
    this.customWritingStyles = Array.isArray(saved?.custom) ? saved.custom : [];
    const availableIds = new Set(this.allWritingStyles().map((style) => style.id));
    const active = Array.isArray(saved?.active) ? saved.active.filter((id) => availableIds.has(id)) : [];
    const preferredDefault = availableIds.has('spring-heart') ? 'spring-heart' : (this.defaultWritingStyles[0]?.id || 'literary');
    this.activeStyleIds = (!saved || (active.length === 1 && active[0] === 'literary')) ? [preferredDefault] : (active.length ? active : [preferredDefault]);
    this.customStyleName = '';
    this.customStylePrompt = '';
    await this.saveWritingStyles();
  },

  selectedWritingStyleId() {
    return this.activeStyleIds[0] || this.defaultWritingStyles[0]?.id || 'literary';
  },

  async selectWritingStyle(id) {
    if (!id) return;
    this.activeStyleIds = [id];
    await this.saveWritingStyles();
  },

  allWritingStyles() {
    return [...this.defaultWritingStyles, ...this.customWritingStyles];
  },

  isStyleActive(id) {
    return this.activeStyleIds.includes(id);
  },

  async toggleWritingStyle(id, enabled) {
    const ids = new Set(this.activeStyleIds);
    if (enabled) ids.add(id); else ids.delete(id);
    this.activeStyleIds = [...ids];
    await this.saveWritingStyles();
  },

  async addCustomWritingStyle() {
    const name = this.customStyleName.trim().slice(0, 18);
    const prompt = this.customStylePrompt.trim().slice(0, 500);
    if (!name || !prompt) return;
    const item = { id: `custom-${Date.now()}`, name, prompt };
    this.customWritingStyles = [...this.customWritingStyles, item];
    this.activeStyleIds = [...new Set([...this.activeStyleIds, item.id])];
    this.customStyleName = '';
    this.customStylePrompt = '';
    await this.saveWritingStyles();
  },

  async removeCustomWritingStyle(id) {
    this.customWritingStyles = this.customWritingStyles.filter((x) => x.id !== id);
    this.activeStyleIds = this.activeStyleIds.filter((x) => x !== id);
    await this.saveWritingStyles();
  },

  async saveWritingStyles() {
    await window.GameModules.sqliteSave.saveMetaJson?.('writing_styles', {
      active: this.activeStyleIds,
      defaults: this.defaultWritingStyles,
      custom: this.customWritingStyles,
    });
  },

  writingStylePrompt() {
    const active = this.allWritingStyles().filter((style) => this.activeStyleIds.includes(style.id));
    return active.map((style) => `【${style.name}】${style.prompt}`).join('\n');
  },
};
