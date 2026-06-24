window.GameModules = window.GameModules || {};
window.GameModules.initTemplateSources = window.GameModules.initTemplateSources || {};

window.GameModules.initTemplateSources.intimacyBody = {
  id: 'intimacy-body',
  title: '亲密与身体状态初始化模板',

  defaults() {
    return window.GameModules.initDefaults?.intimacyBody || {};
  },

  clone(value) {
    return JSON.parse(JSON.stringify(value ?? null));
  },

  fields() {
    const d = this.defaults();
    return {
      partLabels: { defaultValue: this.clone(d.partLabels), meaning: '身体状态部位键与中文显示名。' },
      sexPartLabels: { defaultValue: this.clone(d.sexPartLabels), meaning: '性经验分类键与中文显示名。' },
      bodyDescriptions: { defaultValue: this.clone(d.bodyDescriptions), meaning: '每个身体部位的默认中性状态描述。' },
      valueDefaults: { defaultValue: this.clone(d.valueDefaults), meaning: '亲密与身体状态通用缺省值。' },
      displayTexts: { defaultValue: this.clone(d.displayTexts), meaning: 'UI 展示和无记录状态的缺省文案。' },
      sexualExperiencePartDefaults: { defaultValue: this.clone(d.sexualExperiencePartDefaults), meaning: '每个性经验分类的默认次数。' },
      sexualHistoryDefaults: { defaultValue: this.clone(d.sexualHistoryDefaults), meaning: '性经历当前状态、经历人数和经历人列表的默认值。' },
      intimacyDefaults: { defaultValue: this.clone(d.intimacyDefaults), meaning: '完整亲密经历初始化对象。' },
      bodyStatusDefaults: { defaultValue: this.clone(d.bodyStatusDefaults), meaning: '完整身体各部位状态初始化对象。' },
      fieldMeta: { defaultValue: this.clone(d.fieldMeta), meaning: '每个 UI 字段的名称、类型、说明、限制和缺省原因。' },
    };
  },

  editableFields() {
    const f = this.fields();
    return {
      intimacy: {
        meaning: '玩家或角色的亲密经历初始化，只保存中性元数据。',
        defaults: f.intimacyDefaults.defaultValue,
        fields: {
          sexualStatus: { defaultValue: f.sexualHistoryDefaults.defaultValue?.sexualStatus, meaning: '性经历当前状态；只写稳定状态值。' },
          sexualPartnerCount: { defaultValue: f.sexualHistoryDefaults.defaultValue?.sexualPartnerCount, meaning: '经历人数；仅稳定确认阴部插入时计入。' },
          sexualPartners: { defaultValue: f.sexualHistoryDefaults.defaultValue?.sexualPartners, meaning: '经历对象列表；只写已确认计入人数的对象。' },
          sexualExperienceCount: { defaultValue: f.intimacyDefaults.defaultValue?.sexualExperienceCount, meaning: '抽象性经验总次数；只做计数。' },
          sexualExperienceParts: { defaultValue: f.sexualExperiencePartDefaults.defaultValue, meaning: '分部位抽象次数统计；每个分类默认 0。' },
          updatedAt: { defaultValue: f.intimacyDefaults.defaultValue?.updatedAt, meaning: '初始化时间；无明确时间可留空。' },
          reason: { defaultValue: f.intimacyDefaults.defaultValue?.reason, meaning: '初始化依据；引用现实推演正文事实。' },
        },
      },
      bodyStatus: {
        meaning: '各身体部位当前状态初始化，只保存中性短状态和描述。',
        defaults: f.bodyStatusDefaults.defaultValue,
        fields: {
          partKey: { defaultValue: 'overall', meaning: '部位键；只能使用 bodyStatusDefaults 中存在的键。' },
          part: { defaultValue: f.partLabels.defaultValue?.overall, meaning: '部位中文名。' },
          status: { defaultValue: f.valueDefaults.defaultValue?.bodyStatus, meaning: '短状态，如稳定、疲劳、不适、受伤、清洁、需要护理。' },
          description: { defaultValue: f.valueDefaults.defaultValue?.bodyDescription, meaning: '中性状态描述；不要写过程描写。' },
          reason: { defaultValue: f.valueDefaults.defaultValue?.bodyReason, meaning: '初始化依据；引用现实推演正文事实。' },
          updatedAt: { defaultValue: f.valueDefaults.defaultValue?.updatedAt, meaning: '初始化时间；无明确时间可留空。' },
        },
      },
    };
  },

  jsonFormat() {
    const editable = this.editableFields();
    return {
      initUpdates: [
        {
          target: 'player-self 或角色id/姓名',
          subject: { type: 'player 或 character', id: 'player-self 或角色id', name: '玩家或角色名' },
          section: '亲密与身体状态初始化',
          fields: {
            intimacy: editable.intimacy.defaults,
            bodyStatus: editable.bodyStatus.defaults,
          },
          reason: '正文中的初始化依据',
        },
      ],
    };
  },

  promptText() {
    return [
      '### 亲密与身体状态初始化字段模板',
      '只在现实推演正文明确支持初始化时填写；没有依据的字段保持缺省值或不返回。',
      `全部默认配置与含义：${JSON.stringify(this.fields())}`,
      `可填写字段与含义：${JSON.stringify(this.editableFields())}`,
      `规范 JSON 格式：${JSON.stringify(this.jsonFormat())}`,
    ].join('\n\n');
  },
};
