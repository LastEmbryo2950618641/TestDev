window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.settings = window.GameModules.ui.settings || {};

window.GameModules.ui.settings.viewHelpers = {
  textModelOptionLabel(model = {}) {
    const name = model.displayName || model.internalName || '未知模型';
    const price = model.price || '未知';
    const thinking = model.thinkingSupported === true ? 'true' : 'false';
    const description = String(model.description || '').trim();
    return `${name} - 系数 ${price} - 支持深度思考 ${thinking}${description ? ` - ${description}` : ""}`;
  },

  aiOutputLimitEffectiveText(kind = 'other') {
    const mode = this.aiOutputLimitMode(kind);
    if (mode === 'unlimited') return '无限制';
    if (mode === 'limited') return `限制 ${this.aiOutputLimitMax(kind)} tokens`;
    const globalMode = this.aiOutputLimitMode('global');
    return globalMode === 'limited' ? `跟随统一：限制 ${this.aiOutputLimitMax('global')} tokens` : '跟随统一：无限制';
  },

  selectedDrawModelId() {
    if (this.settingsState?.drawProvider === 'pixai') return this.settingsState?.pixaiModelVersionId || window.GameModules.config?.drawProviders?.pixai?.defaultModel || '1983308862240288769';
    return this.settingsState?.drawModelId || 'anime';
  },

  selectedDrawProviderId() {
    return this.settingsState?.drawProvider || 'pixai';
  },

  drawModelOptionLabel(model = {}) {
    return `${model.displayName || model.name || model.id} - ${model.description || model.id}`;
  },

  stage1MaterialMaxIterations() {
    return Math.max(1, Math.min(8, Math.round(Number(this.settingsState?.stage1MaterialMaxIterations) || 2)));
  },

  stage1MaterialIterationLimitText() {
    return this.settingsState?.stage1MaterialIterationLimited ? `${this.stage1MaterialMaxIterations()} 次` : "不限制";
  },
};
window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.settings = window.GameModules.ui.settings || {};

window.GameModules.ui.settings.viewHelpers = Object.assign(window.GameModules.ui.settings.viewHelpers || {}, {
  aiOutputLimitKinds() {
    return [
      { kind: 'global', title: '统一配置', desc: '作为各阶段选择跟随统一时的默认输出限制。' },
      { kind: 'stage1', title: 'Stage1 资料路由', desc: '资料请求规划、人物、地点、记忆加载等路由。' },
      { kind: 'stage2', title: 'Stage2 场景锚定', desc: '场景锚定报告与 JSON 生成。' },
      { kind: 'stage3', title: 'Stage3 正文阶段', desc: '最终正文生成与正文补全。默认限制 3000。' },
      { kind: 'stage4', title: 'Stage4 结算', desc: '状态更新、滑动结算与结果 JSON 更新。' },
      { kind: 'other', title: '其他 AI 响应', desc: '微信、角色资料、BOSS、势力、标签等未显式归类请求。' },
    ];
  },

  aiOutputLimitPrefix(kind = 'other') {
    return {
      global: 'aiOutputLimitGlobal',
      stage1: 'aiOutputLimitStage1',
      stage2: 'aiOutputLimitStage2',
      stage3: 'aiOutputLimitStage3',
      stage4: 'aiOutputLimitStage4',
      other: 'aiOutputLimitOther',
    }[kind] || 'aiOutputLimitOther';
  },

  currentDrawModels() {
    const providerId = this.settingsState?.drawProvider || 'pixai';
    return this.drawModelsForProvider(providerId, { models: this.settingsState?.drawModels || [] });
  },
});
window.GameModules.ui.settings.viewHelpers = Object.assign(window.GameModules.ui.settings.viewHelpers || {}, {
  stage1MaterialIterationModeText() {
    return this.settingsState?.stage1MaterialIterationLimited ? "限制迭代" : "不限迭代";
  },

  textProviderSummaryLabel() {
    return this.settingsState?.textProvider || window.GameModules.aiProvider?.currentProviderId?.() || 'deepseek';
  },

  textModelSummaryLabel() {
    return this.modelId || this.settingsState?.textModelId || '未选择';
  },

  drawProviderSummaryLabel() {
    return this.selectedDrawProviderId();
  },

  drawModelSummaryLabel() {
    return this.selectedDrawModelId();
  },

  stage3OutputSummaryLabel() {
    return this.aiOutputLimitEffectiveText('stage3');
  },
});window.GameModules.ui.settings.viewHelpers = Object.assign(window.GameModules.ui.settings.viewHelpers || {}, {
  aiOutputLimitRows() {
    return this.aiOutputLimitKinds().map((item) => ({
      key: item.kind,
      kind: item.kind,
      title: item.title,
      desc: item.desc,
      effectiveText: this.aiOutputLimitEffectiveText(item.kind),
      mode: this.aiOutputLimitMode(item.kind),
      max: this.aiOutputLimitMax(item.kind),
      canFollowGlobal: item.kind !== 'global',
      inputDisabled: this.aiOutputLimitMode(item.kind) !== 'limited',
    }));
  },
});
window.GameModules.ui.settings.viewHelpers = Object.assign(window.GameModules.ui.settings.viewHelpers || {}, {
  currentSettingsSummaryRows() {
    return [
      { key: 'text-provider', label: '文本提供方', value: this.textProviderSummaryLabel() },
      { key: 'text-model', label: '文本模型', value: this.textModelSummaryLabel() },
      { key: 'draw-provider', label: '绘图平台', value: this.drawProviderSummaryLabel() },
      { key: 'draw-model', label: '绘图模型', value: this.drawModelSummaryLabel() },
      { key: 'writing-style', label: '笔风', value: this.allWritingStyles().find((style) => style.id === this.selectedWritingStyleId())?.name || '未选择' },
      { key: 'stage1-iteration', label: 'Stage1资料迭代', value: this.stage1MaterialIterationLimitText() },
      { key: 'stage3-output', label: '正文输出', value: this.stage3OutputSummaryLabel() },
    ];
  },
});
window.GameModules.ui.settings.viewHelpers = Object.assign(window.GameModules.ui.settings.viewHelpers || {}, {
  currentDrawModelRows() {
    return this.currentDrawModels().map((model) => ({
      key: model.id,
      id: model.id,
      label: this.drawModelOptionLabel(model),
    }));
  },
});
window.GameModules.ui.settings.viewHelpers = Object.assign(window.GameModules.ui.settings.viewHelpers || {}, {
  currentTextModelRows() {
    return (Array.isArray(this.settingsState?.textModels) ? this.settingsState.textModels : []).map((model) => ({
      key: model.internalName,
      id: model.internalName,
      label: this.textModelOptionLabel(model),
    }));
  },
});



window.GameModules.ui.settings.viewHelpers = Object.assign(window.GameModules.ui.settings.viewHelpers || {}, {
});

window.GameModules.ui.settings.viewHelpers = Object.assign(window.GameModules.ui.settings.viewHelpers || {}, {
  textModelSectionView() {
    return {
      title: '文本模型',
      description: '用于剧情推演、微信回复、角色资料补全等文字 AI 请求。',
      rows: this.currentTextModelRows(),
      selectedId: this.modelId || '',
    };
  },

  drawModelSectionView() {
    const isPixai = (this.settingsState?.drawProvider || '') === 'pixai';
    return {
      title: 'AI 生成图模型',
      description: '用于微信相册等图片生成请求。',
      rows: this.currentDrawModelRows(),
      selectedId: this.selectedDrawModelId(),
      showPixaiModelVersion: isPixai,
      pixaiModelVersionTitle: 'PixAI modelVersionId',
      pixaiModelVersionDescription: '可覆盖 PixAI 默认模型版本 ID，用于精确指定图片生成模型。',
      pixaiModelVersionValue: this.settingsState?.pixaiModelVersionId || '',
      showPixaiMode: isPixai,
      pixaiModeTitle: 'PixAI 模式',
      pixaiModeDescription: '对应 PixAI v2 mode，可选 lite / standard / pro / ultra。',
      pixaiModeValue: this.settingsState?.pixaiMode || 'standard',
      pixaiModeOptions: [
        { key: 'lite', value: 'lite', label: 'lite' },
        { key: 'standard', value: 'standard', label: 'standard' },
        { key: 'pro', value: 'pro', label: 'pro' },
        { key: 'ultra', value: 'ultra', label: 'ultra' },
      ],
    };
  },
});

window.GameModules.ui.settings.viewHelpers = Object.assign(window.GameModules.ui.settings.viewHelpers || {}, {
  textProviderSectionView() {
    return {
      title: '文本 AI 提供方',
      description: '可在 dzmm 和 DeepSeek 之间切换文字请求来源。',
      selectedId: this.settingsState?.textProvider || 'dzmm',
      options: [
        { key: 'dzmm', value: 'dzmm', label: 'dzmm' },
        { key: 'deepseek', value: 'deepseek', label: 'DeepSeek' },
      ],
      showDeepseekConfig: (this.settingsState?.textProvider || '') === 'deepseek',
      deepseekBaseTitle: 'DeepSeek Base URL',
      deepseekBaseDescription: '默认官方地址即可。文本接口使用 OpenAI 兼容 Chat Completions。',
      deepseekKeyTitle: 'DeepSeek API Key',
      deepseekKeyDescription: '仅保存在当前浏览器存档环境，用于文本模型请求。',
    };
  },

  drawProviderSectionView() {
    return {
      title: '绘图平台',
      description: '可在 dzmm 和 PixAI 之间切换图片生成请求来源。',
      selectedId: this.settingsState?.drawProvider || 'pixai',
      options: [
        { key: 'pixai', value: 'pixai', label: 'PixAI' },
        { key: 'dzmm', value: 'dzmm', label: 'dzmm' },
      ],
      showPixaiConfig: (this.settingsState?.drawProvider || '') === 'pixai',
      pixaiBaseTitle: 'PixAI API Root',
      pixaiBaseDescription: '默认官方地址即可，代码会分别调用 v2/image/create 与 v1/task。',
      pixaiKeyTitle: 'PixAI API Key',
      pixaiKeyDescription: '仅保存在当前浏览器存档环境，用于 PixAI 图片生成请求。',
    };
  },
});


