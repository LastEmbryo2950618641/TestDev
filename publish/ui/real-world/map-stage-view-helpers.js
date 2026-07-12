window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.realWorld = window.GameModules.ui.realWorld || {};

window.GameModules.ui.realWorld.mapStageViewHelpers = {
  stageStyle() {
    return '';
  },
  stageElement() {
    return this.realWorldMapCanvasElement();
  },

  canvasElement() {
    return document.querySelector('.real-world-map-canvas');
  },

  wrapText(ctx, text = '', maxWidth = 220, maxLines = 2) {
    const source = String(text || '').trim();
    if (!source) return [];
    const chars = Array.from(source);
    const lines = [];
    let line = '';
    chars.forEach((ch) => {
      const next = line + ch;
      if (ctx.measureText(next).width <= maxWidth || !line) {
        line = next;
        return;
      }
      lines.push(line);
      line = ch;
    });
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      const clipped = lines.slice(0, maxLines);
      let last = clipped[maxLines - 1] || '';
      while (last && ctx.measureText(`${last}...`).width > maxWidth) last = last.slice(0, -1);
      clipped[maxLines - 1] = `${last}...`;
      return clipped;
    }
    return lines;
  },

  shortLabel(text = '', maxChars = 18) {
    const source = String(text || '').trim();
    if (!source) return '';
    const chars = Array.from(source);
    if (chars.length <= maxChars) return source;
    return `${chars.slice(0, Math.max(1, maxChars - 1)).join('')}…`;
  },
};

