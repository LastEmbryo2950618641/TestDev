window.GameModules = window.GameModules || {};

window.GameModules.promptSkills = {
  namespace: 'prompt',

  templateEngine: {
    variablePattern: /\{\{\s*([^{}]+?)\s*\}\}/g,
    legacyVariablePattern: /\{([^{}\n]+?)\}/g,

    variables(source = '') {
      const found = [];
      String(source || '').replace(this.variablePattern, (_match, key) => {
        const name = String(key || '').trim();
        if (name && !found.includes(name)) found.push(name);
        return '';
      });
      String(source || '').replace(this.legacyVariablePattern, (_match, key) => {
        const name = String(key || '').trim();
        if (this.legacyVariableName(name) && !found.includes(name)) found.push(name);
        return '';
      });
      return found;
    },

    legacyVariableName(name = '') {
      return /^[\p{L}\p{N}_-]+$/u.test(String(name || '').trim());
    },

    missing(source = '', vars = {}) {
      return this.variables(source).filter((key) => !Object.prototype.hasOwnProperty.call(vars, key));
    },

    render(source = '', vars = {}, options = {}) {
      const keepMissing = options.keepMissing !== false;
      const rendered = String(source || '').replace(this.variablePattern, (match, key) => {
        const name = String(key || '').trim();
        return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : (keepMissing ? match : '');
      });
      return rendered.replace(this.legacyVariablePattern, (match, key) => {
        const name = String(key || '').trim();
        if (!this.legacyVariableName(name)) return match;
        return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : (keepMissing ? match : '');
      });
    },
  },

  sourceItems() {
    return window.GameModules.promptTemplates?.items || [];
  },

  promptId(id = '') {
    const raw = String(id || '').trim();
    return raw.startsWith(`${this.namespace}.`) ? raw : `${this.namespace}.${raw}`;
  },

  templateId(id = '') {
    return String(id || '').trim().replace(new RegExp(`^${this.namespace}\\.`), '');
  },

  list() {
    return this.sourceItems().map((item) => this.toSkill(item));
  },

  find(id) {
    const templateId = this.templateId(id);
    const item = this.sourceItems().find((entry) => entry.id === templateId);
    return item ? this.toSkill(item) : null;
  },

  toSkill(item = {}) {
    const behavior = this.behavior(item.id);
    return {
      id: this.promptId(item.id),
      templateId: item.id,
      category: `Prompt/${item.category || '通用'}`,
      name: item.title || item.id,
      method: `promptSkills.render("${item.id}", vars)`,
      params: '{{变量}} 模板变量，由模板内容自动提取',
      returns: item.summary || '渲染后的提示词文本',
      description: item.summary || item.title || item.id,
      file: item.file || '',
      source: item.file || '',
      kind: 'prompt-template',
      ...behavior,
    };
  },

  behavior(id = '') {
    const templateId = this.templateId(id);
    const stageMatch = templateId.match(/^inference-stage(\d+)-/u);
    if (stageMatch) {
      const n = Number(stageMatch[1]) || 0;
      const stage = `stage${n}`;
      // Stage3 正文是散文；其余推演阶段（含势力更新）一律强制 JSON，才能与 DeepSeek 前缀缓存同模型路径。
      const jsonMode = n !== 3;
      return {
        stage,
        outputLimitKind: n === 1 || n === 2 || n === 4 ? stage : (n === 3 ? 'stage3' : 'other'),
        jsonMode,
        responseFormat: jsonMode ? { type: 'json_object' } : undefined,
      };
    }
    const jsonPrompts = new Set([
      'json-repair',
      'player-profile-enrichment',
      'player-aspiration-goals',
      'player-aspiration-summary',
      'player-aspiration-psych-tags',
      'character-feedback',
      'faction-audit',
      'boss-jobs',
      'world-lore',
      'profession-info',
      'entry-year-audit',
      'wechat-chat-reply',
      'wechat-behavior-short',
      'wechat-history-decision',
      'worldline-plot-summary',
      'real-world-final-style-polish',
      'taobao-product-generate',
      'character-profile-part1-base-identity',
      'character-profile-essential-preference-layers',
      'character-profile-part2-feeling',
      'character-profile-part3-abilities-professions',
      'character-profile-part4-inventory-wearing-rpg',
      'character-profile-part5-body-profile',
      'character-profile-part6-dressed-profile',
      'character-profile-missing-fields',
      'character-profile-part7-rpg-field',
      'character-profile-metric-group',
      'character-profile-csv-fix',
      'character-profile-part2-feeling-fix',
      'character-profile-part3-abilities-professions-fix',
    ]);
    if (jsonPrompts.has(templateId) || templateId.startsWith('real-world-map-')) {
      return { stage: 'other', outputLimitKind: 'other', jsonMode: true, responseFormat: { type: 'json_object' } };
    }
    return { stage: 'other', outputLimitKind: 'other', jsonMode: false };
  },

  completionOptions(id, overrides = {}) {
    const behavior = this.behavior(id);
    const jsonMode = overrides.jsonMode !== undefined ? Boolean(overrides.jsonMode) : Boolean(behavior.jsonMode);
    const narrationThinking = behavior.stage === 'stage3' && !jsonMode;
    return {
      outputLimitKind: overrides.outputLimitKind || behavior.outputLimitKind || 'other',
      jsonMode,
      responseFormat: overrides.responseFormat || (jsonMode ? { type: 'json_object' } : undefined),
      deepThinking: narrationThinking && overrides.deepThinking !== false,
    };
  },

  async load(id) {
    return window.GameModules.promptTemplates.load(this.templateId(id));
  },

  async variables(id) {
    return this.templateEngine.variables(await this.load(id));
  },

  async missing(id, vars = {}) {
    return this.templateEngine.missing(await this.load(id), vars);
  },

  async render(id, vars = {}, options = {}) {
    const source = await this.load(id);
    return this.templateEngine.render(source, vars, options);
  },

  registerDefinitions() {
    const existing = new Set((window.GameModules.skillsDefinitions || []).map((skill) => skill.id));
    const additions = this.list().filter((skill) => !existing.has(skill.id));
    if (!additions.length) return window.GameModules.skillsDefinitions || [];
    window.GameModules.skillsDefinitions = (window.GameModules.skillsDefinitions || []).concat(additions);
    return window.GameModules.skillsDefinitions;
  },
};

window.GameModules.promptSkills.registerDefinitions();
