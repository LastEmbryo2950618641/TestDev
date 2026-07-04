window.GameModules = window.GameModules || {};

window.GameModules.appSwitchActions = {
  setDesktopPage(page) { this.desktopPage = Math.max(0, Math.min(2, Number(page) || 0)); },
  startDesktopSwipe(event) { this.desktopSwipeStart = { x: event.clientX, y: event.clientY }; },
  cancelDesktopSwipe() { this.desktopSwipeStart = null; },
  endDesktopSwipe(event) {
    const start = this.desktopSwipeStart;
    this.desktopSwipeStart = null;
    if (!start) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    this.setDesktopPage(this.desktopPage + (dx < 0 ? 1 : -1));
  },

  closeDesktopApps() {
    this.identityAppOpen = false;
    this.identityReturnTo = '';
    this.wechatAppOpen = false;
    this.saveAppOpen = false;
    this.roleCardJsonAppOpen = false;
    this.worldlineAppOpen = false;
    this.savePanelOpen = false;
    this.controlSelectOpen = false;
    this.controlLinkMenuId = '';
    if (this.settingsState) this.settingsState.open = false;
    if (this.systemTestState) this.systemTestState.open = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) Object.assign(this.skillsState, { open: false, detailOpen: false });
    if (this.knownProfessionState) Object.assign(this.knownProfessionState, { open: false, detailOpen: false });
    if (this.taobaoState) Object.assign(this.taobaoState, { open: false, generatingId: '', walletOpen: false });
    if (this.promptState) Object.assign(this.promptState, { open: false, selectedId: '', selectedText: '', loading: false });
    if (this.tokenStatsState) Object.assign(this.tokenStatsState, { open: false, selectedId: '' });
  },

  closeAppToDesktop() {
    this.desktopUnlocked = false;
    this.closeDesktopApps();
  },

  openDesktopApp() {
    this.closeDesktopApps();
    this.desktopUnlocked = true;
    this.controlSelectOpen = true;
    this.entrySetupOpen = false;
    this.refreshControlLinkStates?.().catch?.((err) => console.warn('刷新控制链接状态失败:', err.message, err.stack));
  },

  closeControlApp() {
    this.controlSelectOpen = false;
    this.closeAppToDesktop();
  },

  openSaveApp() {
    this.closeDesktopApps();
    this.saveAppOpen = true;
    this.desktopUnlocked = true;
    this.refreshSaveMetas?.();
  },

  closeSaveApp() {
    this.saveAppOpen = false;
    this.closeAppToDesktop();
  },
};

(function initDesktopPagerFallback() {
  function getGameStore() {
    try { return window.Alpine?.store?.('game') || null; } catch (_) { return null; }
  }

  function applyDesktopPage(page) {
    const pages = document.querySelector('.desktop-pages');
    const dots = Array.from(document.querySelectorAll('.desktop-page-dots button'));
    if (!pages || !dots.length) return;
    const maxPage = Math.max(0, dots.length - 1);
    const nextPage = Math.max(0, Math.min(maxPage, Number(page) || 0));
    const store = getGameStore();
    if (store) store.desktopPage = nextPage;
    pages.style.transform = `translateX(-${nextPage * 100}%)`;
    dots.forEach((dot, index) => dot.classList.toggle('active', index === nextPage));
  }

  function bindDesktopPager() {
    const dots = Array.from(document.querySelectorAll('.desktop-page-dots button'));
    dots.forEach((dot, index) => {
      if (dot.dataset.desktopPagerBound) return;
      dot.dataset.desktopPagerBound = '1';
      dot.addEventListener('click', () => applyDesktopPage(index));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindDesktopPager, { once: true });
  } else {
    bindDesktopPager();
  }
})();
