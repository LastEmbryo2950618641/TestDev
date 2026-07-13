window.GameModules = window.GameModules || {};

window.GameModules.wechatChangePanelActions = {
  toggleWechatChangePanel(msg) {
    if (!msg) return;
    msg.changeReasonsOpen = !msg.changeReasonsOpen;
  },

  wechatHasChangeReasons(msg) {
    return window.GameModules.wechatViewHelpers.wechatHasChangeReasons.call(this, msg);
  },

  wechatChangeGroups(msg = {}) {
    return window.GameModules.wechatViewHelpers.wechatChangeGroups.call(this, msg);
  },

  wechatMetricState(msg = {}) {
    return window.GameModules.wechatDomainHelpers.wechatMetricState.call(this, msg);
  },

  usefulMetricText(text = '', key = '') {
    return window.GameModules.wechatDomainHelpers.usefulMetricText.call(this, text, key);
  },

  metricProfileItem(state, group, key) {
    return window.GameModules.wechatDomainHelpers.metricProfileItem.call(this, state, group, key);
  },

  wechatMetricReasonItems(list = [], group = 'emotions', msg = {}) {
    return window.GameModules.wechatViewHelpers.wechatMetricReasonItems.call(this, list, group, msg);
  },

  wechatWearingReasonItems(list = []) {
    return window.GameModules.wechatViewHelpers.wechatWearingReasonItems.call(this, list);
  },
};
