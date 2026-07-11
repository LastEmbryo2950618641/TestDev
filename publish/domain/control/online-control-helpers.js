window.GameModules = window.GameModules || {};
window.GameModules.domain = window.GameModules.domain || {};
window.GameModules.domain.control = window.GameModules.domain.control || {};

window.GameModules.domain.control.onlineControlHelpers = {
  buildOnlineControlLinkPatch(state = null) {
    return {
      ...(state?.values?.control_link || {}),
      linked: true,
      lastAction: '上线附身控制',
      checkedAt: this.phoneDateText?.() || '',
    };
  },

  buildOnlineControlLogText(state = null) {
    const name = this.sharedControlTargetName?.(state) || '目标';
    return `你已上线附身控制${name}。慎二的意识可以一心二用，同时控制自己的现实本体与被控者身体，并同时感受两个肉体的全部感官；被控者无法控制身体，但意识清醒，能感觉自己身体的所有反馈。后续正文会以你在被控者身体内的附身视角为主，同时保留被控者的内心想法与感受。玩家没有明确指定慎二本体、现实身体、外部的我或其他执行者时，所有身体行动都默认由被控者身体亲自执行。`;
  },
};
