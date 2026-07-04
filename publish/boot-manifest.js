/**
 * 分块加载清单：chunk 名称 → 脚本 URL。
 */
window.GameModules = window.GameModules || {};

window.GameModules.bootManifest = {
  chunks: {
    onboarding: '__chunk-onboarding.js',
    gameplay: '__chunk-gameplay.js',
    wechat: '__chunk-wechat.js',
    apps: '__chunk-apps.js',
    prompts: '__chunk-prompts.js',
  },
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
