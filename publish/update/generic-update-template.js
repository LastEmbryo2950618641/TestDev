window.GameModules = window.GameModules || {};

window.GameModules.genericUpdateTemplate = {
  version: 'generic-update-v1',

  operationModes: ['delta', 'set', 'append', 'remove', 'merge', 'upsert', 'create', 'delete', 'transfer', 'link', 'unlink'],

  subjectTypes: [
    'player', 'character', 'faction', 'faction_parent', 'faction_app', 'company', 'location',
    'item', 'inventory', 'wechat', 'calendar', 'worldline', 'lexicon', 'vital', 'metric', 'system',
  ],

  schemaExample() {
    return {
      genericUpdates: [
        {
          subject: {
            type: 'player/character/faction/faction_parent/faction_app/company/location/item/inventory/wechat/calendar/worldline/lexicon/vital/metric/system',
            id: '主体ID，未知时写稳定名称；玩家本人固定 player-self',
            playerId: '可选，关联玩家ID',
            characterId: '可选，关联角色ID',
            factionId: '可选，关联势力ID',
            parentFactionId: '可选，上一层势力ID',
            appId: '可选，势力APP或系统ID',
          },
          field: '字段路径，如 vitals.fatigue、profile.age、position.title、inventory.phone.quantity',
          change: {
            mode: 'delta/set/append/remove/merge/upsert/create/delete/transfer/link/unlink',
            value: 22,
            fromValue: '可选，变化前值或来源主体',
            toValue: '可选，变化后值或目标主体',
            unit: '可选，数值单位',
          },
          reasons: [{ trigger: '触发事实', evidence: '依据', confidence: 'confirmed/inferred' }],
        },
      ],
    };
  },

  coverageText() {
    return [
      '通用更新模板覆盖现有更新：',
      '- vitalUpdates：subject.type="player"，field="vitals.<key>"，mode="delta"。',
      '- metricUpdates：subject.type="player"，field="metrics.emotions.<key>" 或 "metrics.playerFeelings.<key>"。',
      '- characterMetricUpdates：subject.type="character"，field 同 metrics，id 写角色ID或姓名。',
      '- lexiconUpdates：subject.type="lexicon" 或真实主体类型，field 写 kind/field/name 对应路径。',
      '- factionUpdates：subject.type="faction/faction_parent/faction_app"，field 写 hierarchy/position/member/app。',
      '- itemActions：subject.type="item/inventory"，mode 用 create/delete/transfer/upsert/delta。',
      '- wechatActions：subject.type="wechat"，field 写 conversations.<contactId>.messages，mode="append"。',
      '- 地点变化：subject.type="location"，field 写 current/parent/descriptionFacts/mapNodes。',
      '- companyUpdates/calendar/worldline 等：subject.type 写对应系统，field 写精确字段路径。',
      '结论：现有修改都能抽象为“主体 + 主体类型 + 字段 + 更改方式和值 + 理由数组”。',
    ].join('\n');
  },

  triggerPrompt() {
    return [
      '## 通用更新模板 genericUpdates（独立触发）',
      '阶段3除旧字段外，必须独立判断是否触发 genericUpdates；它是统一审计模板。',
      '只有阶段2正文或已载入资料确认发生“稳定状态变化”时才写，临时描写不写。',
      '每条 genericUpdates 只描述一个主体的一个字段变化；多个字段拆成多条。',
      '主体必须含 subject.type 与 subject.id。玩家本人 id 固定 player-self；角色/势力优先用ID，未知ID写稳定名称。',
      'subject 可补充 playerId、characterId、factionId、parentFactionId、appId。',
      'field 必须是可定位字段路径，不要写“资料”“状态”等泛称。',
      'change.mode 只能用 delta/set/append/remove/merge/upsert/create/delete/transfer/link/unlink。',
      'reasons 必须是数组，每项写 trigger、evidence、confidence；trigger 用于现实推演判断同类触发条件。',
      '如果没有明确稳定变化，genericUpdates 返回空数组。',
      `示例：${JSON.stringify(this.schemaExample())}`,
      this.coverageText(),
    ].join('\n');
  },

  patchLoop(loop) {
    if (!loop || loop.genericUpdateTemplatePatched) return;
    const basePrompt = loop.buildUpdateJsonPrompt;
    const baseSchema = loop.updateJsonSchema;
    const baseProse = loop.proseFinal;
    const baseMerge = loop.mergeNarrationAndUpdates;

    loop.buildUpdateJsonPrompt = async function patchedBuildUpdateJsonPrompt(...args) {
      const prompt = await basePrompt.apply(this, args);
      return `${prompt}\n\n${window.GameModules.genericUpdateTemplate.triggerPrompt()}`;
    };
    loop.updateJsonSchema = function patchedUpdateJsonSchema(...args) {
      return { ...baseSchema.apply(this, args), genericUpdates: [] };
    };
    loop.proseFinal = function patchedProseFinal(...args) {
      const result = baseProse.apply(this, args);
      if (result && !Array.isArray(result.genericUpdates)) result.genericUpdates = [];
      return result;
    };
    loop.mergeNarrationAndUpdates = function patchedMergeNarrationAndUpdates(...args) {
      const result = baseMerge.apply(this, args);
      const updates = args[2] || {};
      result.genericUpdates = Array.isArray(updates.genericUpdates) ? updates.genericUpdates : [];
      return result;
    };
    loop.genericUpdateTemplatePatched = true;
  },

  patchAi(ai) {
    if (!ai || ai.genericUpdateTemplatePatched) return;
    const baseParse = ai.parse;
    ai.parse = function patchedParse(...args) {
      const result = baseParse.apply(this, args);
      const data = args[0] && typeof args[0] === 'object' ? args[0] : {};
      result.genericUpdates = Array.isArray(data.genericUpdates) ? data.genericUpdates.slice(0, 20) : [];
      return result;
    };
    ai.genericUpdateTemplatePatched = true;
  },

  install() {
    this.patchLoop(window.GameModules.realWorldAgentLoop);
    this.patchAi(window.GameModules.realWorldAi);
  },
};

window.GameModules.genericUpdateTemplate.install();
