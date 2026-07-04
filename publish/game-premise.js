window.GameModules = window.GameModules || {};

window.GameModules.gamePremise = {
  appName: '我要狠狠操控的',
  homeTitle: '现实互动',
  homeIntro: '你的旧手机已经坏了。换购新机、激活账号、同步数据——一切看似平常，直到桌面多了一个从未安装过的应用。通过它，你可以操控异世界与现实世界中的人；满足条件后可将二者连接，并随时召唤。',
  activationIntro: '某天你的手机坏了。你买来新手机，按平常流程激活账号、同步旧数据。通讯录、照片、微信记录都回来了——但回到桌面时，多了一个你从未安装过的图标：「我要狠狠操控的」。',
  aspirationIntro: '同步刚完成，那个陌生图标还在桌面上等着你。在点开它之前，先回答：你想成为什么样子的人？',
  desktopWidgetTask: '陌生图标',
  desktopWidgetTaskHint: '同步后才出现',
  desktopWidgetStatus: '隐秘连接',
  desktopWidgetStatusHint: '双界操控可用',
  controlAppIntro: '通过此应用，你可以接管异世界与现实世界中的特定人物。满足连接条件后，可将两个世界的对象绑定，并随时召唤。',
  controlAppHint: '选择当前已固化的可上线角色，或新增一个控制角色。',
  realWorldSummary: '玩家即手机主人本人。旧手机损坏后换购新机，激活并同步数据完毕；桌面随即出现神秘应用「我要狠狠操控的」。玩家生活在 2026 年高度移动互联网化的现代都市，可通过该应用操控现实人物与异世界人物，并在条件满足后建立连接与召唤。外卖、社交平台、即时通讯与职场/校园压力构成日常背景。',
  aiPremiseLine: '背景设定：玩家即「我」。旧手机损坏后激活新手机并同步数据，桌面出现神秘应用「我要狠狠操控的」；可通过该应用操控现实与异世界人物，条件满足后可连接并召唤。',
};

if (window.GameModules.realWorld2026) {
  window.GameModules.realWorld2026.summary = window.GameModules.gamePremise.realWorldSummary;
  window.GameModules.realWorld2026.defaults.device = '一台刚激活、刚完成数据同步的新手机；桌面出现陌生应用「我要狠狠操控的」';
}
