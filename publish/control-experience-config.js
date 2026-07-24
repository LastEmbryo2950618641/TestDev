window.GameModules = window.GameModules || {};

(function attachControlExperienceConfig(modules) {
  const DEFAULT_MASTER_PROMPT = `你正在生成\${被控制者}在“被玩家上线操控”相关情境中的反应。

请先读取当前阶段信息：
- 上线次数：\${上线次数}
- 适应度：\${适应度}
- 当前阶段：\${上线阶段}
- 阶段说明：\${阶段说明}
- 对控制者了解等级：\${对控制者了解等级}
- 对控制者了解：\${对控制者了解}

写作使用规则：
1. 上线次数与阶段说明用于判断她对这种身体控制变化的经历深度、熟悉程度与预期程度。
2. 适应度用于判断她对这种状态的承受与应对是否已经形成稳定经验。
3. 当上线次数为 0 时，应体现这是首次经历这种状态；当上线次数大于 0 时，可体现她对这种状态已存在历史记忆。
4. “对控制者了解”决定她是否知道控制者是谁：不知身份时不得点名；仅知品行时只写性格印象；自认知晓身份时允许猜测，且不必与真实身份完全一致。
5. 最终反应必须结合角色性格、身份、当前场景、当前目标和既有关系自然生成。
6. 不要直接复述阶段说明原文，而是把这些信息转化为角色此刻的感受重点、认知变化、应对倾向和行为反应。
7. 只把阶段信息当作“经历结构”使用，不要把它写成固定句式标签。`;

  const DEFAULT_CONFIG = Object.freeze({
    enabled: true,
    masterPrompt: DEFAULT_MASTER_PROMPT,
  });

  const PREVIEW_CASES = Object.freeze([
    {
      key: 'first-contact',
      label: '首次 + 极低适应',
      onlineCount: 0,
      adaptation: 8,
      variables: {
        被控制者: '林夏',
        角色性格: '冷静克制',
        角色身份: '调查记者',
        当前场景: '深夜办公室',
      },
    },
    {
      key: 'repeat-contact',
      label: '重复早期 + 低适应',
      onlineCount: 6,
      adaptation: 22,
      variables: {
        被控制者: '周宁',
        角色性格: '敏感谨慎',
        角色身份: '医学生',
        当前场景: '医院值班室',
      },
    },
    {
      key: 'familiar-contact',
      label: '熟悉中段 + 中适应',
      onlineCount: 18,
      adaptation: 52,
      variables: {
        被控制者: '许真',
        角色性格: '理性强硬',
        角色身份: '刑警',
        当前场景: '案发现场外围',
      },
    },
    {
      key: 'seasoned-contact',
      label: '高频 + 高适应',
      onlineCount: 40,
      adaptation: 78,
      variables: {
        被控制者: '顾遥',
        角色性格: '从容细致',
        角色身份: '商业谈判顾问',
        当前场景: '商务酒会后台',
      },
    },
  ]);

  function normalizeEnabled(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return DEFAULT_CONFIG.enabled;
      if (['false', '0', 'off', 'no', 'disabled'].includes(normalized)) return false;
      if (['true', '1', 'on', 'yes', 'enabled'].includes(normalized)) return true;
    }
    if (value == null) return DEFAULT_CONFIG.enabled;
    return Boolean(value);
  }

  function normalizeMasterPrompt(value) {
    return typeof value === 'string' && value.trim() ? value : DEFAULT_CONFIG.masterPrompt;
  }

  function defaultConfig() {
    return {
      enabled: DEFAULT_CONFIG.enabled,
      masterPrompt: DEFAULT_CONFIG.masterPrompt,
    };
  }

  function normalize(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
      enabled: normalizeEnabled(source.enabled),
      masterPrompt: normalizeMasterPrompt(source.masterPrompt),
    };
  }

  function previewCases() {
    return PREVIEW_CASES.map((item) => ({
      ...item,
      variables: { ...(item.variables || {}) },
    }));
  }

  modules.controlExperienceConfig = {
    defaultConfig,
    normalize,
    previewCases,
    normalizeConfig: normalize,
  };
})(window.GameModules);
