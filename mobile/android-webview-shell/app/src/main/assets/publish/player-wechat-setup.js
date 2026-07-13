window.GameModules = window.GameModules || {};

(function attachPlayerWechatSetup() {
  const actions = window.GameModules.playerSetupActions;
  if (!actions) return;
  const originalComplete = actions.completePlayerSetup;
  const originalPrompt = actions.enrichPlayerProfile;

  actions.enrichPlayerProfile = async function enrichPlayerProfileWithRelations(base) {
    const relationHint = '关系整理规则：必须从玩家填写的全量上下文综合整理微信联系人，包括relationships、livingStatus、parents、notes等字段；只要某个现实人物或关系角色能从输入确认存在，即使不在relationships字段、即使没有姓名，也要整理为“关系：姓名”并由AI补正式姓名；不要照抄长描述，不要擅自新增输入中不存在的人；若同类关系有多个独立个体，例如双胞胎之一/之二、两名妹妹、妹妹A/妹妹B，必须保留相同数量的独立关系条目，不能合并成一个人。';
    const data = await originalPrompt.call(this, { ...base, relationshipRule: relationHint });
    return data;
  };

  actions.completePlayerSetup = async function completePlayerSetupWithWechat(options = {}) {
    const result = await originalComplete.call(this, options);
    if (!this.phoneSetupDone) return result;
    await this.syncRelationshipWechatUsers?.({ generateProfile: false, save: false });
    await this.save?.();
    return result;
  };
})();
