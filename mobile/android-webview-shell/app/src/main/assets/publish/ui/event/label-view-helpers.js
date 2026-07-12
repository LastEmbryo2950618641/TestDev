window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.event = window.GameModules.ui.event || {};

window.GameModules.ui.event.labelViewHelpers = {
  eventListEmptyText() {
    return '暂无该类型事件。';
  },

  eventStatusFieldLabel() {
    return '状态：';
  },

  eventTriggeredCountFieldLabel() {
    return '触发：';
  },

  eventHeaderDescription() {
    return '随机事件、推演事件、周期事件';
  },

  eventProbabilityFieldLabel() {
    return '随机事件发生概率';
  },

  eventBackButtonText() {
    return '回到桌面';
  },

  selectedEventEmptyText() {
    return '选择左侧事件查看详情。';
  },
};
