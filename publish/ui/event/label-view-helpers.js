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

  eventHeaderDescription() {
    return '熟人入队 · 场外事件 · 推进节奏';
  },

  eventBackButtonText() {
    return '回到桌面';
  },

  selectedEventEmptyText() {
    return '选择左侧事件查看详情。';
  },
};
