window.GameModules = window.GameModules || {};

window.GameModules.penStyleRegistry = {
  styles: [],
  definitions: [
    { id: 'literary', name: '文学细腻', sourceKey: 'literary', file: 'prompts/pen_style/literary.md' },
    { id: 'dark', name: '黑暗压抑', sourceKey: 'dark', file: 'prompts/pen_style/dark.md' },
    { id: 'light-novel', name: '轻小说节奏', sourceKey: 'lightNovel', file: 'prompts/pen_style/light-novel.md' },
    { id: 'epic', name: '史诗庄重', sourceKey: 'epic', file: 'prompts/pen_style/epic.md' },
    { id: 'suspense', name: '悬疑紧张', sourceKey: 'suspense', file: 'prompts/pen_style/suspense.md' },
    { id: 'spring-heart', name: '春心萌动', sourceKey: 'springHeart', file: 'prompts/pen_style/spring-heart.md' },
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
      this.register({ ...item, prompt: inline[item.sourceKey] || '' });
    }
  },

  list() {
    if (!this.styles.length) this.registerAll();
    return this.styles.slice();
  },
};
