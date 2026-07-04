window.GameBootActions = {
  afterCoreHooks: [
    () => window.GameModules.penStyleRegistry?.registerAll?.(),
    () => window.GameModules.initPromptRegistry?.registerAll?.(),
  ],

  setBootMessage(text, detail = '') {
    const root = document.getElementById('boot-fallback');
    if (!root) return;
    const title = root.querySelector('p');
    const sub = root.querySelector('small');
    if (title && text) title.textContent = text;
    if (sub && detail) sub.textContent = detail;
  },

  async loadCore(urls = []) {
    const list = Array.isArray(urls) ? urls : [];
    this.setBootMessage('正在加载核心模块…', `0 / ${list.length}`);
    await window.GameBoot.loadScripts(list, ({ index, total, url, done }) => {
      if (done) return;
      const name = String(url || '').split('/').pop() || url;
      this.setBootMessage('正在加载核心模块…', `${index + 1} / ${total} · ${name}`);
    });
    this.afterCoreHooks.forEach((hook) => {
      try { hook(); } catch (err) { console.warn('[boot] afterCore hook failed:', err?.message || err); }
    });
  },

  async loadChunkUrls(urls = [], label = '模块') {
    const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
    if (!list.length) return;
    await window.GameBoot.loadScripts(list);
    window.GameModules.remergeGameStore?.();
    console.log(`[boot] ${label} 已加载 (${list.length})`);
  },
};
