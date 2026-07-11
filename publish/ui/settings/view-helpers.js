window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.settings = window.GameModules.ui.settings || {};

window.GameModules.ui.settings.viewHelpers = {
  textModelOptionLabel(model = {}) {
    const name = model.displayName || model.internalName || '鏈煡妯″瀷';
    const price = model.price || '鏈煡';
    const thinking = model.thinkingSupported === true ? 'true' : 'false';
    const description = String(model.description || '').trim();
    return `${name} - 系数 ${price} - 支持深度思考 ${thinking}${description ? ` - ${description}` : ""}`;
  },

  aiOutputLimitEffectiveText(kind = 'other') {
    const mode = this.aiOutputLimitMode(kind);
    if (mode === 'unlimited') return '无限制';
    if (mode === 'limited') return `闄愬埗 ${this.aiOutputLimitMax(kind)} tokens`;
    const globalMode = this.aiOutputLimitMode('global');
    return globalMode === 'limited' ? `璺熼殢缁熶竴锛氶檺鍒?${this.aiOutputLimitMax('global')} tokens` : '璺熼殢缁熶竴锛氭棤闄愬埗';
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
    return this.modelId || this.settingsState?.textModelId || '鏈€夋嫨';
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

  currentSettingsSummaryParts() {
    return [
      `鏂囨湰鎻愪緵鏂?${this.textProviderSummaryLabel()}`,
      `鏂囨湰 ${this.textModelSummaryLabel()}`,
      `缁樺浘骞冲彴 ${this.drawProviderSummaryLabel()}`,
      `缁樺浘 ${this.drawModelSummaryLabel()}`,
      `Stage1璧勬枡杩唬 ${this.stage1MaterialIterationLimitText()}`,
      `姝ｆ枃杈撳嚭 ${this.stage3OutputSummaryLabel()}`,
    ];
  },

  currentSettingsSummaryText() {
    return this.currentSettingsSummaryParts().join("；");
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
      { key: 'text-model', label: '鏂囨湰妯″瀷', value: this.textModelSummaryLabel() },
      { key: 'draw-provider', label: '缁樺浘骞冲彴', value: this.drawProviderSummaryLabel() },
      { key: 'draw-model', label: '缁樺浘妯″瀷', value: this.drawModelSummaryLabel() },
      { key: 'writing-style', label: '绗旈', value: this.allWritingStyles().find((style) => style.id === this.selectedWritingStyleId())?.name || '鏈€夋嫨' },
      { key: 'stage1-iteration', label: 'Stage1璧勬枡杩唬', value: this.stage1MaterialIterationLimitText() },
      { key: 'stage3-output', label: '姝ｆ枃杈撳嚭', value: this.stage3OutputSummaryLabel() },
    ];
  },

  settingsSummaryView() {
    return {
      rows: this.currentSettingsSummaryRows(),
      text: this.currentSettingsSummaryText(),
    };
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
  currentModelSummaryView() {
    return {
      textProvider: this.settingsState?.textProvider || '',
      textModel: this.modelId || '',
      drawProvider: this.selectedDrawProviderId(),
      drawModel: this.selectedDrawModelId(),
      textLabel: '文本',
      routeLabel: ' / ',
      drawLabel: '绘图',
    };
  },

  stage1MaterialSettingView() {
    return {
      title: 'Stage1 资料收集迭代最大次数',
      description: '用于现实与异世界推演的 Stage1 资料路由。默认不限制，只在需要控制请求时开启。',
      toggleLabel: '限制迭代次数',
      limited: !!this.settingsState?.stage1MaterialIterationLimited,
      maxIterations: this.stage1MaterialMaxIterations(),
    };
  },

  aiOutputLimitSectionView() {
    return {
      title: 'AI 输出长度限制',
      description: '无限制时不发送 max_tokens；限制时作为该次 AI 响应的最大输出预算。Stage3 正文默认限制 3000 tokens，其它默认跟随统一。',
      rows: this.aiOutputLimitRows(),
      followGlobalLabel: '跟随统一',
      unlimitedLabel: '无限制',
      limitedLabel: '限制为指定 tokens',
    };
  },
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
    return {
      title: 'AI 生成图模型',
      description: '用于微信相册等图片生成请求。',
      rows: this.currentDrawModelRows(),
      selectedId: this.selectedDrawModelId(),
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
