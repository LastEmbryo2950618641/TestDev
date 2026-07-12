window.GameModules = window.GameModules || {};
window.GameModules.domain = window.GameModules.domain || {};
window.GameModules.domain.control = window.GameModules.domain.control || {};

window.GameModules.domain.control.controlPatchHelpers = {
  buildSummonLocationPatch() {
    const realWorld = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    return {
      name: this.realWorldLocationName || this.realWorldMap?.current || '玩家面前',
      worldTag: realWorld,
      updatedAt: this.phoneDateText?.() || '',
      reason: '被玩家通过链接召唤到现实当前位置，原地点自然消失。',
    };
  },

  buildSummonControlLinkPatch(state = null) {
    return {
      ...(state?.values?.control_link || {}),
      linked: true,
      summoned: true,
      lastAction: '召唤',
      checkedAt: this.phoneDateText?.() || '',
    };
  },

  buildOfflineControlLinkPatch(state = null, narration = '') {
    return {
      ...(state?.values?.control_link || {}),
      linked: true,
      lastAction: '下线交还控制权',
      checkedAt: this.phoneDateText?.() || '',
      offlineNarration: narration,
    };
  },

  buildSummonLogText(state = null) {
    const name = this.sharedControlTargetName?.(state) || '目标';
    return `${name}已被召唤到你面前。异世界与现实世界相对停止，不会同步推进。`;
  },
};
