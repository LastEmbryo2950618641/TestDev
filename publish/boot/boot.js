(function startBoot() {
  const ALPINE_URL = 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js';

  async function bootGame() {
    const manifest = window.GameScriptManifest;
    if (!manifest?.chunks?.core?.length) {
      console.error('[boot] script-manifest 缺失或 core 为空');
      window.GameBootActions?.setBootMessage?.('启动失败', '缺少 boot/script-manifest.js');
      return;
    }
    try {
      window.GameBootActions.setBootMessage('正在启动游戏…', '加载核心脚本');
      await window.GameBootActions.loadCore(manifest.chunks.core);
      window.GameBootActions.setBootMessage('正在启动游戏…', '加载 game.js');
      await window.GameBoot.loadScript('game.js');
      window.GameBootActions.setBootMessage('正在启动游戏…', '加载 Alpine.js');
      await window.GameBoot.loadScript(ALPINE_URL, { defer: true });
      window.GameBoot.bootComplete = true;
      document.getElementById('boot-fallback')?.remove();
    } catch (err) {
      console.error('[boot] 启动失败:', err?.message || err, err?.stack);
      window.GameBootActions?.setBootMessage?.('启动失败', err?.message || '未知错误');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootGame);
  } else {
    bootGame();
  }
})();
