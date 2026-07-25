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

  playerControlIdentity() {
    const storeApi = window.GameModules.characterStateStore;
    const live = storeApi?.get?.('player-self', this) || this.rpgStates?.['player-self'] || null;
    const name = String(
      this.playerName
      || this.playerProfile?.name
      || live?.profile?.name
      || live?.name
      || '玩家',
    ).trim() || '玩家';
    return { id: 'player-self', name };
  },

  targetControlIdentity(state = null) {
    const name = String(
      this.sharedControlTargetName?.(state)
      || state?.profile?.name
      || state?.name
      || '目标',
    ).trim() || '目标';
    const id = String(state?.id || state?.profile?.id || '').trim();
    return { id, name };
  },

  roleLabel(id = '', name = '') {
    return window.GameModules.narrationRoleMarkup?.roleTag?.(id, name) || String(name || '').trim();
  },

  buildOnlineControlLogText(state = null) {
    const api = window.GameModules.domain.control.onlineControlHelpers;
    const player = api.playerControlIdentity.call(this);
    const target = api.targetControlIdentity.call(this, state);
    const playerTag = api.roleLabel(player.id, player.name);
    const targetTag = api.roleLabel(target.id, target.name);
    return `你已上线附身控制${targetTag}。${playerTag}的意识可以一心二用，同时控制自己的现实本体与被控者身体，并同时感受两个肉体的全部感官；被控者无法控制身体，但意识清醒，能感觉自己身体的所有反馈。后续正文会以你在被控者身体内的附身视角为主：凡该身体的触碰、受力、疼痛、敏感、舒服与疲惫等，都作为“你”即时收到的感官回流来写，并保留被控者的内心想法与感受。玩家没有明确指定${playerTag}本体、现实身体、外部的我或其他执行者时，所有身体行动都默认由被控者身体亲自执行。`;
  },
};
