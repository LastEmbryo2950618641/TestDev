window.GameModules = window.GameModules || {};

(function attachPlayerWechatSetup() {
  const actions = window.GameModules.playerSetupActions;
  if (!actions) return;
  const originalComplete = actions.completePlayerSetup;
  const originalPrompt = actions.enrichPlayerProfile;

  actions.enrichPlayerProfile = async function enrichPlayerProfileWithRelations(base) {
    if (!window.dzmm?.completions) throw new Error('dzmm.completions unavailable');
    const relationHint = '玩家relationships是微信联系人推断的重要上下文：必须整理为“关系：姓名”，不要照抄长描述；关系由AI按世界观和社会关系推理或调整，不要擅自新增未填写的人际关系。';
    const data = await originalPrompt.call(this, { ...base, relationHint });
    return data;
  };

  actions.completePlayerSetup = async function completePlayerSetupWithWechat(options = {}) {
    const result = await originalComplete.call(this, options);
    if (!this.phoneSetupDone) return result;
    await this.syncRelationshipWechatUsers?.();
    await this.save?.();
    return result;
  };
})();
