window.GameModules = window.GameModules || {};

window.GameModules.penStyleRegistry = {
  styles: [],
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
  list() {
    return this.styles.slice();
  },
};
