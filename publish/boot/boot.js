(function startBoot() {
  const ALPINE_URL = 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js';
  const LOCAL_ALPINE_URL = 'vendor/alpinejs-3.14.9-cdn.min.js';

  function closeFactionDetailNative(event) {
    const target = event?.target?.closest?.('[data-faction-close-detail], .faction-rpg-close');
    if (event && !target) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const hideCurrentBackdrop = () => {
      const root = target?.closest?.('.faction-modal-backdrop');
      const roots = root ? [root] : Array.from(document.querySelectorAll('.faction-modal-backdrop'));
      roots.forEach((backdrop) => {
        if (backdrop.querySelector('.faction-detail, .faction-org-modal')) {
          backdrop.style.setProperty('display', 'none', 'important');
          backdrop.setAttribute('data-fallback-closed', 'true');
        }
      });
    };

    const store = window.Alpine?.store?.('game');
    if (store?.closeFactionDetail) {
      store.closeFactionDetail();
      hideCurrentBackdrop();
      return true;
    }
    if (store?.factionState) {
      store.factionState.detailOpen = false;
      store.factionState.orgChartOpen = false;
      store.factionState.selectedArchiveDocId = '';
      hideCurrentBackdrop();
      return true;
    }
    hideCurrentBackdrop();
    return true;
  }

  function openFactionDetailNative(event) {
    const row = event.target?.closest?.('[data-faction-id]');
    if (!row || !row.classList?.contains('faction-row')) return;
    const factionId = row.getAttribute('data-faction-id') || '';
    const store = window.Alpine?.store?.('game');
    if (store?.selectFaction && factionId) {
      store.selectFaction(factionId);
      store.closeFactionArchiveDoc?.();
      document.querySelectorAll('.faction-modal-backdrop[data-fallback-closed="true"]').forEach((backdrop) => {
        backdrop.style.removeProperty('display');
        backdrop.removeAttribute('data-fallback-closed');
      });
      return;
    }
    const detail = Array.from(document.querySelectorAll('.faction-modal-backdrop'))
      .find((backdrop) => backdrop.querySelector('.faction-detail'));
    if (detail) {
      event.preventDefault();
      detail.style.removeProperty('display');
      detail.removeAttribute('data-fallback-closed');
      detail.scrollTop = 0;
    }
  }

  window.closeFactionDetailNative = closeFactionDetailNative;

  function installFactionDetailCloseFallback() {
    if (window.__factionDetailCloseFallbackInstalled) return;
    window.__factionDetailCloseFallbackInstalled = true;
    if (document.documentElement?.dataset) {
      document.documentElement.dataset.factionNativeNav = 'force-hide-v4';
    }

    document.addEventListener('pointerdown', closeFactionDetailNative, true);
    document.addEventListener('mousedown', closeFactionDetailNative, true);
    document.addEventListener('click', closeFactionDetailNative, true);
    document.addEventListener('click', openFactionDetailNative, true);
  }

  async function loadAlpine() {
    try {
      await window.GameBoot.loadScript(LOCAL_ALPINE_URL, { defer: true });
    } catch (localErr) {
      console.warn('[boot] local Alpine load failed, falling back to CDN:', localErr?.message || localErr);
      await window.GameBoot.loadScript(ALPINE_URL, { defer: true });
    }
    if (!window.Alpine) throw new Error('Alpine.js loaded but window.Alpine is unavailable');
  }

  async function bootGame() {
    const manifest = window.GameScriptManifest;
    if (!manifest?.chunks?.core?.length) {
      console.error('[boot] script-manifest missing or core is empty');
      window.GameBootActions?.setBootMessage?.('Boot failed', 'Missing boot/script-manifest.js');
      return;
    }
    try {
      window.GameBootActions.setBootMessage('Starting game...', 'Loading core scripts');
      await window.GameBootActions.loadCore(manifest.chunks.core);
      window.GameBootActions.setBootMessage('Starting game...', 'Loading game.js');
      await window.GameBoot.loadScript('game.js');
      window.GameBootActions.setBootMessage('Starting game...', 'Loading Alpine.js');
      await loadAlpine();
      window.GameBoot.bootComplete = true;
      document.getElementById('boot-fallback')?.remove();
    } catch (err) {
      console.error('[boot] failed:', err?.message || err, err?.stack);
      window.GameBootActions?.setBootMessage?.('Boot failed', err?.message || 'Unknown error');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      installFactionDetailCloseFallback();
      bootGame();
    });
  } else {
    installFactionDetailCloseFallback();
    bootGame();
  }
})();
