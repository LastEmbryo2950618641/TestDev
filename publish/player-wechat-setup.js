window.GameModules = window.GameModules || {};

(function attachPlayerWechatSetup() {
  const actions = window.GameModules.playerSetupActions;
  if (!actions) return;
  const originalComplete = actions.completePlayerSetup;
  const originalPrompt = actions.enrichPlayerProfile;

  actions.enrichPlayerProfile = async function enrichPlayerProfileWithRelations(base) {
    if (!window.dzmm?.completions) throw new Error('dzmm.completions unavailable');
    const relationHint = '关系整理规则：玩家relationships是微信联系人推断的重要上下文；必须整理为“关系：姓名”，不要照抄长描述；不要擅自新增未填写的人际关系；若同类关系有多个独立个体，例如双胞胎之一/之二、两名妹妹、妹妹A/妹妹B，必须保留相同数量的独立关系条目，不能合并成一个人。';
    const data = await originalPrompt.call(this, { ...base, relationshipRule: relationHint });
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
