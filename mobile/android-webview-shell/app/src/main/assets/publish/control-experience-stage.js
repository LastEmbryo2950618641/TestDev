window.GameModules = window.GameModules || {};

(function attachControlExperienceStage(modules) {
  const COUNT_TIERS = [
    { key: 'first', label: '首次上线', min: 0, max: 0 },
    { key: 'earlyRepeat', label: '早期重复上线', min: 1, max: 10 },
    { key: 'familiar', label: '熟悉上线', min: 11, max: 30 },
    { key: 'seasoned', label: '资深上线', min: 31, max: Infinity },
  ];

  const ADAPTATION_TIERS = [
    { key: 'veryLow', label: '极低适应', min: 0, max: 10 },
    { key: 'low', label: '低适应', min: 11, max: 35 },
    { key: 'medium', label: '中适应', min: 36, max: 65 },
    { key: 'high', label: '高适应', min: 66, max: 100 },
  ];

  const AWARENESS_LEVELS = Object.freeze([
    {
      key: 'unknown',
      label: '不知控制者',
      defaultSummary: '尚不知晓控制者是谁',
      guide: '被控者完全不知道是谁在控制自己；内心可写失控、恐惧、困惑，但不得点名任何真实身份。',
    },
    {
      key: 'traitKnown',
      label: '知品行不知身份',
      defaultSummary: '感到操控者冷静强势但不知是谁',
      guide: '被控者能模糊感知控制者的品行/性格倾向（如冷静、算计、强势），但仍不知道控制者的真实身份与姓名。',
    },
    {
      key: 'identityGuessed',
      label: '知晓控制者是谁',
      defaultSummary: '怀疑控制者是某熟人',
      guide: '被控者自认知晓控制者是谁，可写出其猜测的身份称呼；该猜测不必与玩家真实身份完全一致，允许误认、半对半错。',
    },
  ]);

  const COUNT_FRAGMENTS = {
    first: '这是她第一次经历这种身体控制权变化，对这一状态几乎没有既有经验。',
    earlyRepeat: '她已经经历过这种状态再次出现，对它并非完全陌生，但经验仍然有限。',
    familiar: '她对这种状态已有一段累积经历，能够意识到它的出现方式与影响范围。',
    seasoned: '她对这种状态已有较深积累，能够较稳定地识别它带来的身体与认知变化。',
  };

  const ADAPTATION_FRAGMENTS = {
    veryLow: '她尚未形成稳定的应对方式，这种变化对她的身体感和判断都会构成明显冲击。',
    low: '她开始能辨认这种状态，但仍缺乏成熟的处理节奏与稳定预期。',
    medium: '她已经具备一定适应经验，反应中可以体现出逐步形成的应对惯性。',
    high: '她对这种状态已有较高适应度，反应中可以体现出更成熟的承受、判断与调节能力。',
  };

  const CONTEXT_KEYS = ['被控制者', '角色性格', '角色身份', '当前场景'];
  const DERIVED_VARIABLES = ['上线次数', '适应度', '上线阶段', '阶段说明'];

  function normalizeInteger(value, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.floor(numeric);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeOnlineCount(value) {
    return Math.max(0, normalizeInteger(value, 0));
  }

  function normalizeAdaptation(value) {
    return clamp(normalizeInteger(value, 0), 0, 100);
  }

  function awarenessLevelMeta(level = '') {
    const key = String(level || '').trim();
    return AWARENESS_LEVELS.find((item) => item.key === key) || AWARENESS_LEVELS[0];
  }

  function normalizeControllerAwareness(input = {}, fallback = null) {
    const source = input && typeof input === 'object' ? input : {};
    const base = fallback && typeof fallback === 'object' ? fallback : {};
    const meta = awarenessLevelMeta(source.controllerAwarenessLevel || base.controllerAwarenessLevel || 'unknown');
    const rawSummary = String(
      source.controllerAwareness
      ?? source.对控制者了解
      ?? base.controllerAwareness
      ?? '',
    ).trim();
    const summary = (rawSummary || meta.defaultSummary).slice(0, 20);
    return {
      controllerAwarenessLevel: meta.key,
      controllerAwareness: summary || meta.defaultSummary,
    };
  }

  function controllerAwarenessNarrationRule(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    const awareness = normalizeControllerAwareness(source);
    const meta = awarenessLevelMeta(awareness.controllerAwarenessLevel);
    const playerName = String(source.playerName || '玩家').trim() || '玩家';
    const targetName = String(source.targetName || '被控者').trim() || '被控者';
    const lines = [
      `对控制者了解（高优先级）：等级=${meta.label}；梗概=${awareness.controllerAwareness}`,
      `- ${meta.guide}`,
      `- 写${targetName}内心与旁观反应时，必须服从上述认识程度，不得越级揭露。`,
    ];
    if (awareness.controllerAwarenessLevel === 'unknown') {
      lines.push(`- 禁止在${targetName}的内心独白、猜测或对话里点名${playerName}，也不得写“就是${playerName}在控制”。`);
    } else if (awareness.controllerAwarenessLevel === 'traitKnown') {
      lines.push(`- 可写对控制者品行/性格的模糊印象，但禁止确认其真实姓名就是${playerName}。`);
    } else {
      lines.push(`- 可写${targetName}认为自己知道控制者是谁；该判断可与真实身份不完全一致，不要自动校正为“其实就是${playerName}”。`);
    }
    return lines.join('\n');
  }

  function pickTier(value, tiers) {
    return tiers.find((item) => value >= item.min && value <= item.max) || tiers[tiers.length - 1];
  }

  function stageDescription(countTier, adaptationTier) {
    return `${COUNT_FRAGMENTS[countTier]}${ADAPTATION_FRAGMENTS[adaptationTier]}反应需继续结合角色性格、身份与当前场景自然展开。`;
  }

  function resolveStageMeta(input) {
    const source = input && typeof input === 'object' ? input : {};
    const experience = source.experience && typeof source.experience === 'object' ? source.experience : source;
    const onlineCount = normalizeOnlineCount(experience.onlineCount);
    const adaptation = normalizeAdaptation(experience.adaptation);
    const awareness = normalizeControllerAwareness(experience);
    const countTierMeta = pickTier(onlineCount, COUNT_TIERS);
    const adaptationTierMeta = pickTier(adaptation, ADAPTATION_TIERS);
    const countTier = countTierMeta.key;
    const adaptationTier = adaptationTierMeta.key;
    return {
      onlineCount,
      adaptation,
      ...awareness,
      countTier,
      adaptationTier,
      onlineTier: countTier,
      stageKey: `${countTier}.${adaptationTier}`,
      stageLabel: `${countTierMeta.label} / ${adaptationTierMeta.label}`,
      stageDescription: stageDescription(countTier, adaptationTier),
      awarenessLabel: awarenessLevelMeta(awareness.controllerAwarenessLevel).label,
    };
  }

  function normalizeConfigFallback(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    let enabled = true;
    if (typeof source.enabled === 'boolean') enabled = source.enabled;
    else if (typeof source.enabled === 'number') enabled = source.enabled !== 0;
    else if (typeof source.enabled === 'string') {
      const value = source.enabled.trim().toLowerCase();
      if (['false', '0', 'off', 'no', 'disabled'].includes(value)) enabled = false;
      else if (['true', '1', 'on', 'yes', 'enabled', ''].includes(value)) enabled = true;
    } else if (source.enabled != null) enabled = Boolean(source.enabled);
    const masterPrompt = typeof source.masterPrompt === 'string' && source.masterPrompt.trim()
      ? source.masterPrompt
      : '';
    return { enabled, masterPrompt };
  }

  function normalizeConfig(raw) {
    const configModule = modules.controlExperienceConfig;
    if (configModule && typeof configModule.normalize === 'function') return configModule.normalize(raw);
    if (configModule && typeof configModule.normalizeConfig === 'function') return configModule.normalizeConfig(raw);
    return normalizeConfigFallback(raw);
  }

  function renderTemplate(template, variables) {
    return String(template || '')
      .replace(/\$\{\s*([^{}]+?)\s*\}/g, function replaceDollar(match, key) {
        return Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : '';
      })
      .replace(/\{\{\s*([^{}]+?)\s*\}\}/g, function replaceBraces(match, key) {
        return Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : '';
      });
  }

  function contextualVariables(input) {
    const source = input && typeof input === 'object' ? input : {};
    const direct = {};
    const nested = source.variables && typeof source.variables === 'object' ? source.variables : {};
    CONTEXT_KEYS.forEach((key) => {
      if (typeof source[key] === 'string' && source[key]) direct[key] = source[key];
      if (typeof nested[key] === 'string' && nested[key]) direct[key] = nested[key];
    });
    return direct;
  }

  function buildPromptVariables(input, meta) {
    return {
      ...contextualVariables(input),
      上线次数: meta.onlineCount,
      适应度: meta.adaptation,
      上线阶段: meta.stageLabel,
      阶段说明: meta.stageDescription,
      对控制者了解等级: meta.awarenessLabel || awarenessLevelMeta(meta.controllerAwarenessLevel).label,
      对控制者了解: meta.controllerAwareness || '',
    };
  }

  function renderPromptBlock(input) {
    const source = input && typeof input === 'object' ? input : {};
    const config = normalizeConfig(source.config);
    if (!config.enabled || !String(config.masterPrompt || '').trim()) return '';
    const meta = resolveStageMeta(source);
    const variables = buildPromptVariables(source, meta);
    return renderTemplate(config.masterPrompt, variables).trim();
  }

  modules.controlExperienceStage = {
    normalizeOnlineCount,
    normalizeAdaptation,
    normalizeControllerAwareness,
    controllerAwarenessNarrationRule,
    awarenessLevels: AWARENESS_LEVELS.map((item) => ({ ...item })),
    resolveStageMeta,
    renderPromptBlock,
    buildPromptVariables,
    contextKeys: CONTEXT_KEYS.slice(),
    derivedVariables: DERIVED_VARIABLES.concat(['对控制者了解等级', '对控制者了解']),
  };
})(window.GameModules);
