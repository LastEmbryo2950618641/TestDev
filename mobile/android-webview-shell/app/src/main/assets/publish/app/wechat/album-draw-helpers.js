window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.albumDrawHelpers = {
  async wechatDrawWithRetry(fn, max = 3, options = {}) {
    const delayMs = Number.isFinite(Number(options.delayMs)) ? Number(options.delayMs) : 1000;
    for (let i = 0; i < max; i += 1) {
      try { return await fn(); } catch (err) {
        const retryable = (window.dzmm?.errors?.isDzmmError?.(err) && err.retryable) || err?.retryable === true;
        if (!retryable || i === max - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, delayMs * (2 ** i)));
      }
    }
    return null;
  },
};
