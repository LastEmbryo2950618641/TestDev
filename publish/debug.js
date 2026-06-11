/**
 * 调试日志工具：统一输出阶段、耗时和错误信息。
 */
window.GameModules = window.GameModules || {};

window.GameModules.debug = {
  start(label, data = {}) {
    const token = { label, startedAt: performance.now() };
    console.log(`${label} 开始:`, data);
    return token;
  },

  done(token, data = {}) {
    console.log(`${token.label} 完成:`, { ...data, ms: Math.round(performance.now() - token.startedAt) });
  },

  fail(token, err, data = {}) {
    console.warn(`${token.label} 失败:`, { ...data, code: err?.code, message: err?.message, stack: err?.stack, ms: Math.round(performance.now() - token.startedAt) });
  },

  step(label, data = {}) {
    console.log(`${label}:`, data);
  },
};
