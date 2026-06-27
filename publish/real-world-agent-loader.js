window.GameModules = window.GameModules || {};

window.GameModules.realWorldAgentLoader = {
  async ensure() {
    if (window.GameModules.realWorldAgentLoop?.run) return window.GameModules.realWorldAgentLoop;
    await this.loadScriptOnce('real-world-agent-loop.js');
    this.reapplyExtensions();
    if (window.GameModules.realWorldAgentLoop?.run) return window.GameModules.realWorldAgentLoop;
    throw new Error('现实推演 Loop Agent 未加载，请刷新预览后重试');
  },

  reapplyExtensions() {
    const loop = window.GameModules.realWorldAgentLoop;
    if (!loop) return;
    if (window.GameModules.realWorldJsonActions) Object.assign(loop, window.GameModules.realWorldJsonActions);
    window.GameModules.genericUpdateTemplate?.patchLoop?.(loop);
  },

  loadScriptOnce(src) {
    const existing = [...document.scripts].find((script) => script.getAttribute('src') === src);
    if (existing?.dataset.loaded === 'true') return Promise.resolve();
    if (existing?.dataset.loading === 'true') return this.waitForScript(existing, src);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.dataset.loading = 'true';
      script.onload = () => { script.dataset.loaded = 'true'; resolve(); };
      script.onerror = () => reject(new Error(`脚本加载失败：${src}`));
      document.head.appendChild(script);
    });
  },

  waitForScript(script, src) {
    return new Promise((resolve, reject) => {
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error(`脚本加载失败：${src}`)), { once: true });
    });
  },
};
