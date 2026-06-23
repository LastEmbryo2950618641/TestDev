window.GameModules = window.GameModules || {};

window.GameModules.penStyleRegistry = {
  styles: [],
  definitions: [
    { id: 'literary', name: '文学细腻', sourceKey: 'literary', file: 'prompts/pen_style/literary.md', prompt: '正文使用细腻文学文风，重视感官、动作细节和心理余波，避免口号式总结。' },
    { id: 'dark', name: '黑暗压抑', sourceKey: 'dark', file: 'prompts/pen_style/dark.md', prompt: '正文氛围偏阴冷压抑，描写痛感、窒息感、阴影和危险，但不堆砌血腥。' },
    { id: 'light-novel', name: '轻小说节奏', sourceKey: 'lightNovel', file: 'prompts/pen_style/light-novel.md', prompt: '正文节奏清晰，场景推进明确，角色反应鲜明，句子易读但不口语化。' },
    { id: 'epic', name: '史诗庄重', sourceKey: 'epic', file: 'prompts/pen_style/epic.md', prompt: '正文语言庄重、有命运感，强调时代、仪式、魔术体系和抉择重量。' },
    { id: 'suspense', name: '悬疑紧张', sourceKey: 'suspense', file: 'prompts/pen_style/suspense.md', prompt: '正文保持悬疑张力，逐步揭示信息，用细节暗示危险，不直接解释全部真相。' },
    { id: 'spring-heart', name: '春心萌动', sourceKey: 'springHeart', file: 'prompts/pen_style/spring-heart.md', prompt: '正文带有春心萌动的暧昧张力，重视心跳、羞意、靠近冲动与亲密氛围，但不脱离剧情行动。' },
  ],

  register(style) {
    if (!style?.id || !style?.name || !style?.prompt) return;
    const item = {
      id: String(style.id),
      name: String(style.name),
      prompt: String(style.prompt).trim(),
      file: style.file || `prompts/pen_style/${style.id}.md`,
    };
    const index = this.styles.findIndex((old) => old.id === item.id);
    if (index >= 0) this.styles.splice(index, 1, item);
    else this.styles.push(item);
  },

  registerAll() {
    const inline = window.GameModules.inlineMd || {};
    this.styles = [];
    for (const item of this.definitions) {
      this.register({ ...item, prompt: inline[item.sourceKey] || item.prompt || '' });
    }
  },

  list() {
    if (!this.styles.length) this.registerAll();
    return this.styles.slice();
  },
};
