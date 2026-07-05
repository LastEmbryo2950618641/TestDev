/**
 * 分块加载清单（逻辑分块名）。实际脚本由 boot/script-manifest.js 按桶动态加载。
 */
window.GameModules = window.GameModules || {};

window.GameModules.bootManifest = {
  chunks: {},
  labels: {
    onboarding: '角色卡与引导模块',
    gameplay: '现实推演与地图模块',
    wechat: '微信应用模块',
    apps: '公司与势力等应用模块',
    prompts: '提示词扩展模块',
  },
  /** 进入首页后在后台预加载的分块 */
  prefetchAfterHome: ['apps', 'wechat'],
  /** 进入玩法 / 继续游戏前需要就绪的分块 */
  gameplayReady: ['gameplay', 'apps', 'wechat'],
  /** 新游戏流程额外需要的分块 */
  newGameReady: ['prompts', 'onboarding'],
};
