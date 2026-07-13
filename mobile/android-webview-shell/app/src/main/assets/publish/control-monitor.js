/**
 * 控制上线监视器：确认点击、Alpine 方法和全局错误是否触发。
 */
window.GameModules = window.GameModules || {};
console.log('[控制监视] 脚本已加载', { readyState: document.readyState, time: new Date().toISOString() });

window.addEventListener('error', (event) => {
  console.error('[控制监视] window error:', event.message, event.filename, event.lineno, event.colno, event.error?.stack);
});

window.addEventListener('unhandledrejection', (event) => {
  const err = event.reason;
  console.error('[控制监视] unhandledrejection:', err?.code, err?.message || err, err?.stack);
});

document.addEventListener('click', (event) => {
  const el = event.target?.closest?.('button');
  if (!el) return;
  const text = String(el.textContent || '').trim();
  const expr = el.getAttribute('@click') || el.getAttribute('x-on:click') || '';
  if (!/开始连接|控制|confirmControl|start\(\)/.test(`${text} ${expr}`)) return;
  const store = window.Alpine?.store?.('game');
  console.log('[控制监视] 捕获按钮点击:', {
    text,
    expr,
    disabled: el.disabled,
    hasStore: Boolean(store),
    busy: store?.busy,
    loading: store?.loading,
    started: store?.started,
    entrySetupOpen: store?.entrySetupOpen,
    hasStart: typeof store?.start,
    hasConfirmControl: typeof store?.confirmControl,
    entryStartReady: Boolean(store?.entryTimeOptions?.start),
  });
}, true);

document.addEventListener('alpine:init', () => {
  console.log('[控制监视] alpine:init 已触发');
  queueMicrotask(() => setTimeout(() => {
    const store = window.Alpine?.store?.('game');
    console.log('[控制监视] store 检查:', {
      hasStore: Boolean(store),
      hasStart: typeof store?.start,
      hasConfirmControl: typeof store?.confirmControl,
      hasRunLoggedControlTask: typeof store?.runLoggedControlTask,
    });
    if (store) window.GameModules.controlMonitor.wrap(store);
  }, 0));
});

window.GameModules.controlMonitor = {
  wrap(store) {
    ['start', 'prepareEntrySetup', 'confirmControl', 'runLoggedControlTask'].forEach((name) => {
      if (typeof store[name] !== 'function' || store[name].__monitored) return;
      const original = store[name];
      store[name] = async function monitoredMethod(...args) {
        console.log(`[控制监视] 方法进入 ${name}:`, { args, busy: this.busy, started: this.started, entrySetupOpen: this.entrySetupOpen });
        try {
          const result = await original.apply(this, args);
          console.log(`[控制监视] 方法完成 ${name}:`, { busy: this.busy, started: this.started, entrySetupOpen: this.entrySetupOpen, logCount: this.log?.length });
          return result;
        } catch (err) {
          console.error(`[控制监视] 方法异常 ${name}:`, err?.code, err?.message, err?.stack);
          throw err;
        }
      };
      store[name].__monitored = true;
    });
  },
};
