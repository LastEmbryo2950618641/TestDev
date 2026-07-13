window.GameModules = window.GameModules || {};

const wechatChangePanelFacadeGroups = [
  {
    modulePath: ['app', 'wechat', 'changePanelOrchestration'],
    methods: ['toggleWechatChangePanel'],
  },
  {
    modulePath: ['wechatViewHelpers'],
    methods: [
      'wechatHasChangeReasons',
      'wechatChangeGroups',
      'wechatMetricReasonItems',
      'wechatWearingReasonItems',
    ],
  },
  {
    modulePath: ['wechatDomainHelpers'],
    methods: [
      'wechatMetricState',
      'usefulMetricText',
      'metricProfileItem',
    ],
  },
];

function resolveWechatChangePanelModule(pathParts) {
  return pathParts.reduce((current, part) => current?.[part], window.GameModules);
}

function callWechatChangePanelModule(pathParts, methodName, context, args) {
  return resolveWechatChangePanelModule(pathParts)[methodName].call(context, ...args);
}

window.GameModules.wechatChangePanelActions = {};

for (const group of wechatChangePanelFacadeGroups) {
  for (const methodName of group.methods) {
    window.GameModules.wechatChangePanelActions[methodName] = function wechatChangePanelFacade(...args) {
      return callWechatChangePanelModule(group.modulePath, methodName, this, args);
    };
  }
}
