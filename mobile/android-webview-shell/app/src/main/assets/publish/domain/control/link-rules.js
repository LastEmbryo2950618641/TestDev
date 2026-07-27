window.GameModules = window.GameModules || {};
window.GameModules.domain = window.GameModules.domain || {};
window.GameModules.domain.control = window.GameModules.domain.control || {};

window.GameModules.domain.control.linkRules = {
  controlLinkMetricKeys: ['好感', '信任', '依赖', '爱情', '亲情', '友情', '欲望', '服从'],

  controlLinkState(idOrState) {
    const id = typeof idOrState === 'string' ? idOrState : idOrState?.id;
    return id ? this.rpgStates?.[id] : idOrState;
  },

  controlLinkId(item = {}) {
    return item.character?.id || item.state?.id || item.id || '';
  },

  controlLinkHasHighMetric(state = null) {
    const feelings = state?.metrics?.playerFeelings || {};
    return this.controlLinkMetricKeys.some((key) => Number(feelings[key]) >= 90);
  },

  controlLinkHasPlayerIntimacy(state = null) {
    const intimacy = state?.values?.intimacy || {};
    const status = String(intimacy.sexualStatus || intimacy.status || '');
    const partnerText = JSON.stringify([intimacy.sexualPartners, intimacy.partners, intimacy.experiencePeople, intimacy.historyPeople]);
    const names = [this.playerProfile?.name, this.playerName, '玩家', 'player-self'].filter(Boolean);
    const hasPlayer = names.some((name) => partnerText.includes(String(name)));
    const explicitExperienced = /非处女|非童贞|已破身|有经验|已有经历/.test(status);
    return explicitExperienced || hasPlayer;
  },

  isControlRoleLinked(state = null) {
    const target = this.controlLinkState(state);
    if (!target || target.id === 'player-self') return false;
    return Boolean(target.values?.control_link?.linked || (this.controlLinkHasHighMetric(target) && this.controlLinkHasPlayerIntimacy(target)));
  },

  isSameWorldControlTarget(state = null) {
    const target = this.controlLinkState(state);
    const realWorld = window.GameModules.realWorld2026?.label || '';
    const worldTag = String(target?.worldTag || target?.profile?.work || '').trim();
    return Boolean(target && realWorld && worldTag && worldTag === realWorld);
  },

  sharedControlState() {
    return this.activeControlTargetState?.() || null;
  },

  sharedControlTargetName(state = null) {
    const target = this.controlLinkState(state) || this.sharedControlState?.() || null;
    return target?.name || target?.profile?.name || '被控制者';
  },

  canDirectlyOnlineControl(state = null) {
    const target = this.controlLinkState(state);
    return Boolean(target && this.isSameWorldControlTarget(target));
  },

  sharedControlStatusLabel(state = null) {
    const target = this.controlLinkState(state) || this.sharedControlState?.() || null;
    if (!target) return '';
    if (this.isControlRoleCurrentlyActive?.(target)) return '已连接';
    if (this.hasAnotherActiveControlTarget?.(target)) return '已有其他连接';
    if (this.canDirectlyOnlineControl?.(target)) return '可上线';
    if (this.isControlRoleLinked?.(target)) return '可连接';
    return '未满足条件';
  },

  controlLinkPrimaryLabel(state = null) {
    return this.isControlRoleCurrentlyActive?.(state) ? '已连接' : '连接';
  },

  controlLinkPrimaryDisabled(state = null) {
    return Boolean(this.busy || this.isControlRoleCurrentlyActive?.(state));
  },

  controlLinkMenuOpenable(state = null) {
    return !this.controlLinkPrimaryDisabled?.(state);
  },

  controlLinkSummonDisabled(state = null) {
    return Boolean(this.busy || !this.isControlRoleLinked?.(state));
  },

  controlLinkOnlineDisabled(state = null) {
    const target = this.controlLinkState(state);
    return Boolean(this.busy || !target || this.isControlRoleCurrentlyActive?.(target) || this.hasAnotherActiveControlTarget?.(target));
  },

  hasAnotherActiveControlTarget(state = null) {
    const target = this.controlLinkState(state);
    if (!this.sharedControlActive || !this.sharedControlTargetId) return false;
    if (!target?.id) return false;
    return target.id !== this.sharedControlTargetId;
  },

  canSwitchControlTarget(state = null) {
    return Boolean(!this.busy && !this.hasAnotherActiveControlTarget?.(state));
  },

  sharedControlLabel() {
    return this.sharedControlState?.() ? '附身控制中' : '';
  },

  realWorldDisplayState() {
    return this.sharedControlState?.() || this.playerIdentityState?.();
  },

  realWorldDisplayCharacter() {
    return this.sharedControlState?.()?.profile || this.playerDisplayCharacter?.();
  },
};
