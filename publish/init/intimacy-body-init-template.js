window.GameModules = window.GameModules || {};
window.GameModules.initTemplateSources = window.GameModules.initTemplateSources || {};

window.GameModules.initTemplateSources.intimacyBody = {
  id: 'intimacy-body',
  title: '亲密与身体状态初始化模板',

  fields: {
    intimacy: {
      meaning: '玩家或角色的亲密经历初始化，只保存中性元数据。',
      defaults: window.GameModules.initDefaults?.intimacyBody?.intimacyDefaults || {},
      editableFields: {
        sexualStatus: { defaultValue: '处女', meaning: '性经历当前状态；只写稳定状态值。' },
        sexualPartnerCount: { defaultValue: 0, meaning: '经历人数；仅稳定确认阴部插入时计入。' },
        sexualPartners: { defaultValue: [], meaning: '经历对象列表；只写已确认计入人数的对象。' },
        sexualExperienceCount: { defaultValue: 0, meaning: '抽象性经验总次数；只做计数。' },
        sexualExperienceParts: { defaultValue: window.GameModules.initDefaults?.intimacyBody?.sexualExperiencePartDefaults || {}, meaning: '分部位抽象次数统计；每个分类默认 0。' },
        updatedAt: { defaultValue: '', meaning: '初始化时间；无明确时间可留空。' },
        reason: { defaultValue: '默认未记录', meaning: '初始化依据；引用现实推演正文事实。' },
      },
    },

    bodyStatus: {
      meaning: '各身体部位当前状态初始化，只保存中性短状态和描述。',
      defaults: window.GameModules.initDefaults?.intimacyBody?.bodyStatusDefaults || {},
      editableFields: {
        partKey: { defaultValue: 'overall', meaning: '部位键；只能使用模板列出的 bodyStatusDefaults 键。' },
        part: { defaultValue: '整体', meaning: '部位中文名。' },
        status: { defaultValue: '稳定', meaning: '短状态，如稳定、疲劳、不适、受伤、清洁、需要护理。' },
        description: { defaultValue: '状态稳定', meaning: '中性状态描述；不要写过程描写。' },
        reason: { defaultValue: '初始默认状态', meaning: '初始化依据；引用现实推演正文事实。' },
        updatedAt: { defaultValue: '', meaning: '初始化时间；无明确时间可留空。' },
      },
    },
  },

  jsonFormat() {
    return {
      initUpdates: [
        {
          target: 'player-self 或角色id/姓名',
          subject: { type: 'player 或 character', id: 'player-self 或角色id', name: '玩家或角色名' },
          section: '亲密与身体状态初始化',
          fields: {
            intimacy: this.fields.intimacy.defaults,
            bodyStatus: this.fields.bodyStatus.defaults,
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
      `可初始化字段与含义：${JSON.stringify(this.fields)}`,
      `规范 JSON 格式：${JSON.stringify(this.jsonFormat())}`,
    ].join('\n\n');
  },
};
