window.GameModules = window.GameModules || {};

(function attachPlayerWechatSetup() {
  const actions = window.GameModules.playerSetupActions;
  if (!actions) return;
  const originalComplete = actions.completePlayerSetup;
  const originalPrompt = actions.enrichPlayerProfile;

  actions.enrichPlayerProfile = async function enrichPlayerProfileWithRelations(base) {
    if (!window.dzmm?.completions) throw new Error('dzmm.completions unavailable');
    const relationHint = '玩家relationships是微信联系人推断的重要上下文：请保留玩家明写的人名、关系和可能互有微信的现实联系，不要擅自新增未填写的人际关系。';
    const data = await originalPrompt.call(this, { ...base, relationHint });
    return data;
  };

  actions.completePlayerSetup = async function completePlayerSetupWithWechat(options = {}) {
    const result = await originalComplete.call(this, options);
    if (!this.phoneSetupDone) return result;
    this.syncRelationshipWechatUsers?.();
    await this.save?.();
    return result;
  };
})();
