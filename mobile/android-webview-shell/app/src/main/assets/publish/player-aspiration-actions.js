window.GameModules = window.GameModules || {};

window.GameModules.playerAspirationActions = {
  defaultAspirationDraft() {
    return {
      alignment: '',
      rationality: 50,
      axes: window.GameModules.playerAspirationConfig.defaultAxes(),
      guiltAxes: window.GameModules.playerAspirationConfig.defaultGuiltAxes(),
      directions: window.GameModules.playerAspirationConfig.defaultDirections(),
      psychPreferences: window.GameModules.playerAspirationConfig.defaultPsychPreferences(),
    };
  },

  hasPlayerAspiration() {
    const data = this.activePlayerLifeOrientation?.() || this.playerAspiration || {};
    return Boolean(data.completedAt && data.alignment);
  },

  cloneAspirationValue(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  },

  playerRoleCardLifeOrientation() {
    const profile = this.playerIdentityState?.()?.profile;
    return profile?.lifeOrientation || null;
  },

  activePlayerLifeOrientation() {
    const roleCardOrientation = this.playerRoleCardLifeOrientation?.();
    if (roleCardOrientation?.completedAt && roleCardOrientation?.alignment) return roleCardOrientation;
    const localOrientation = this.playerAspiration || {};
    if (localOrientation?.completedAt && localOrientation?.alignment) return localOrientation;
    return null;
  },

  async finishActivationFlow() {
    this.homeScreenView = 'playing';
    if (this.hasPlayerAspiration()) {
      await this.enterPlayingFromSetup?.();
      return;
    }
    this.openPlayerAspirationWizard();
  },

  openPlayerAspirationWizard() {
    this.aspirationSetupOpen = true;
    this.aspirationStep = 1;
    this.aspirationPsychStep = 1;
    this.aspirationPsychLoading = false;
    this.aspirationBusy = false;
    this.aspirationError = '';
    this.aspirationDraft = this.defaultAspirationDraft();
    this.aspirationGoalDraft = { short: '', medium: '', long: '', summary: '' };
    this.aspirationSummaryDraft = { portrait: '' };
    this.aspirationPsychCustomDraft = {};
    this.homeScreenView = 'playing';
    this.homeSavePanelOpen = false;
    this.desktopUnlocked = false;
  },

  closePlayerAspirationWizard() {
    this.aspirationSetupOpen = false;
  },

  selectAspirationAlignment(id) {
    if (this.aspirationBusy) return;
    this.aspirationDraft = { ...this.aspirationDraft, alignment: id };
    this.aspirationError = '';
  },

  setAspirationGuiltAxis(id, value) {
    if (this.aspirationBusy) return;
    const num = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    this.aspirationDraft = {
      ...this.aspirationDraft,
      guiltAxes: { ...(this.aspirationDraft.guiltAxes || window.GameModules.playerAspirationConfig.defaultGuiltAxes()), [id]: num },
    };
    this.aspirationError = '';
  },

  setAspirationDirectionAxis(horizon, directionId, value) {
    if (this.aspirationBusy) return;
    const num = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    const cfg = window.GameModules.playerAspirationConfig;
    const directions = { ...(this.aspirationDraft.directions || cfg.defaultDirections()) };
    directions[horizon] = { ...(directions[horizon] || cfg.defaultDirectionWeights()), [directionId]: num };
    this.aspirationDraft = { ...this.aspirationDraft, directions };
    this.aspirationError = '';
  },

  setAspirationRationality(value) {
    const num = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    this.aspirationDraft = { ...this.aspirationDraft, rationality: num };
  },

  setAspirationAxis(key, value) {
    const num = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    this.aspirationDraft = {
      ...this.aspirationDraft,
      axes: { ...(this.aspirationDraft.axes || {}), [key]: num },
    };
  },

  aspirationAlignmentLabel(id = '') {
    const item = window.GameModules.playerAspirationConfig.alignmentById(id || this.aspirationDraft?.alignment);
    return item ? `${item.label}（${item.labelEn}）` : '未选择';
  },

  aspirationPrimaryGuiltLineId(guiltAxes = this.aspirationDraft?.guiltAxes) {
    return window.GameModules.playerAspirationConfig.primaryGuiltLineId(guiltAxes);
  },

  aspirationGuiltLineLabel(id = '') {
    const cfg = window.GameModules.playerAspirationConfig;
    const resolved = id || this.aspirationPrimaryGuiltLineId();
    const item = cfg.guiltLineById(resolved);
    if (!item) return '未选择';
    return `${item.category}·${item.theme}（${item.guiltName}）`;
  },

  aspirationGuiltAxisLabel(id) {
    const cfg = window.GameModules.playerAspirationConfig;
    const item = cfg.guiltLineById(id);
    if (!item) return '';
    const value = this.aspirationDraft?.guiltAxes?.[id] ?? 50;
    return `${item.title}：${cfg.guiltLeanText(value, item)}（${value}/100）`;
  },

  aspirationGuiltSummary(guiltAxes = this.aspirationDraft?.guiltAxes) {
    const cfg = window.GameModules.playerAspirationConfig;
    return cfg.guiltLines.map((item) => {
      const value = guiltAxes?.[item.id] ?? 50;
      return `${item.title}：${cfg.guiltLeanText(value, item)}（${value}/100，${item.leftTag}/${item.rightTag}）`;
    }).join('\n');
  },

  aspirationDirectionHorizonLabel(horizon) {
    const cfg = window.GameModules.playerAspirationConfig;
    const weights = this.aspirationDraft?.directions?.[horizon] || cfg.defaultDirectionWeights();
    const dominant = cfg.dominantDirection(weights);
    const parts = cfg.directionChoices.map((item) => `${item.label}${weights[item.id] ?? 50}`);
    return `${cfg.directionHorizons.find((item) => item.key === horizon)?.label || horizon}：${parts.join(' / ')}；主轴偏${dominant?.label || '均衡'}`;
  },

  aspirationDirectionAxisLabel(horizon, directionId) {
    const cfg = window.GameModules.playerAspirationConfig;
    const item = cfg.directionChoices.find((entry) => entry.id === directionId);
    if (!item) return '';
    const value = this.aspirationDraft?.directions?.[horizon]?.[directionId] ?? 50;
    return `${item.label}：${cfg.directionLeanText(value, item)}（${value}/100）`;
  },

  aspirationRationalityLabel(value = this.aspirationDraft?.rationality) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '居中';
    if (num <= 35) return '偏绝对理性';
    if (num >= 65) return '偏纯粹感性';
    return '理性与感性并存';
  },

  aspirationAxisLabel(key) {
    const axis = window.GameModules.playerAspirationConfig.axes.find((item) => item.key === key);
    if (!axis) return '';
    const value = this.aspirationDraft?.axes?.[key] ?? 50;
    return `${axis.title}：${window.GameModules.playerAspirationConfig.axisLeanText(value, axis)}`;
  },

  aspirationDirectionsSummary(directions = this.aspirationDraft?.directions) {
    const psych = this.aspirationPsychSummary();
    if (psych) return psych;
    const cfg = window.GameModules.playerAspirationConfig;
    return cfg.directionHorizons.map((item) => {
      const weights = directions?.[item.key] || cfg.defaultDirectionWeights();
      const dominant = cfg.dominantDirection(weights);
      const parts = cfg.directionChoices.map((choice) => `${choice.label}${weights[choice.id] ?? 50}`);
      return `${item.label}：${parts.join(' / ')}；主轴偏${dominant?.label || '均衡'}`;
    }).join('\n');
  },

  aspirationPsychCategoryId(step = this.aspirationPsychStep) {
    const cfg = window.GameModules.playerAspirationConfig;
    return cfg.psychPreferenceCategories[(Number(step) || 1) - 1]?.id || '';
  },

  aspirationPsychCategory(step = this.aspirationPsychStep) {
    const cfg = window.GameModules.playerAspirationConfig;
    return cfg.psychCategoryById(this.aspirationPsychCategoryId(step));
  },

  aspirationPsychCategoryGroups(category = this.aspirationPsychCategory()) {
    return window.GameModules.playerAspirationConfig.psychCategoryGroups(category);
  },

  aspirationPlayerGender() {
    const raw = this.playerProfile?.gender || this.playerAspiration?.gender || '';
    return window.GameModules.playerAspirationConfig.normalizePlayerGender(raw);
  },

  resolvePsychTagGroup(tagGroup = null) {
    if (!tagGroup) return null;
    const cfg = window.GameModules.playerAspirationConfig;
    const playerGender = this.aspirationPlayerGender();
    return {
      ...tagGroup,
      playerGender,
      fallbackTags: cfg.resolvePsychFallbackTags(tagGroup, playerGender),
    };
  },

  aspirationPsychGroupKeys(category = this.aspirationPsychCategory()) {
    return window.GameModules.playerAspirationConfig.psychCategoryGroupKeys(category);
  },

  aspirationPsychOptions(optionKey) {
    const psych = this.aspirationDraft?.psychPreferences;
    const direct = psych?.options?.[optionKey];
    if (Array.isArray(direct) && direct.length) return direct;
    const parts = String(optionKey || '').split(':');
    if (parts.length === 2) {
      const legacy = psych?.options?.[`${parts[1]}:${parts[0]}`];
      if (Array.isArray(legacy) && legacy.length) return legacy;
    }
    return psych?.options?.[optionKey] || [];
  },

  aspirationPsychCustomTags(optionKey) {
    const psych = this.aspirationDraft?.psychPreferences;
    const direct = psych?.custom?.[optionKey];
    if (Array.isArray(direct) && direct.length) return direct;
    const parts = String(optionKey || '').split(':');
    if (parts.length === 2) {
      const legacy = psych?.custom?.[`${parts[1]}:${parts[0]}`];
      if (Array.isArray(legacy) && legacy.length) return legacy;
    }
    return psych?.custom?.[optionKey] || [];
  },

  isAspirationPsychCustomTag(optionKey, tag) {
    return this.aspirationPsychCustomTags(optionKey).includes(tag);
  },

  getAspirationPsychCustomDraft(optionKey) {
    return this.aspirationPsychCustomDraft?.[optionKey] || '';
  },

  setAspirationPsychCustomDraft(optionKey, value) {
    this.aspirationPsychCustomDraft = { ...(this.aspirationPsychCustomDraft || {}), [optionKey]: String(value ?? '') };
  },

  aspirationPsychKnownTags(optionKey, tagGroup = null) {
    const cfg = window.GameModules.playerAspirationConfig;
    const psych = this.aspirationDraft?.psychPreferences || cfg.defaultPsychPreferences();
    if (!tagGroup) {
      const category = this.aspirationPsychCategory();
      const entry = cfg.psychCategoryGroupKeys(category).find((item) => item.key === optionKey);
      tagGroup = entry?.tagGroup || null;
    }
    const builtin = tagGroup ? cfg.getBuiltinPsychTags(this.resolvePsychTagGroup(tagGroup)) : [];
    const custom = this.aspirationPsychCustomTags(optionKey);
    const options = this.aspirationPsychOptions(optionKey);
    return [...new Set([...builtin, ...custom, ...options].map((item) => String(item || '').trim()).filter(Boolean))];
  },

  aspirationPsychPreserveTags(optionKey) {
    const cfg = window.GameModules.playerAspirationConfig;
    const category = this.aspirationPsychCategory();
    const entry = cfg.psychCategoryGroupKeys(category).find((item) => item.key === optionKey);
    const selectKey = entry?.selectKey || String(optionKey).split(':')[0];
    const selected = this.aspirationPsychSelected(selectKey);
    const options = this.aspirationPsychOptions(optionKey);
    const custom = this.aspirationPsychCustomTags(optionKey);
    const keepSelected = selected.filter((tag) => options.includes(tag));
    return [...new Set([...keepSelected, ...custom].map((item) => String(item || '').trim()).filter(Boolean))];
  },

  aspirationPsychSelected(selectKey) {
    const psych = this.aspirationDraft?.psychPreferences;
    const direct = psych?.selected?.[selectKey];
    if (Array.isArray(direct) && direct.length) return direct;
    const merged = [];
    ['normal', 'acg'].forEach((laneId) => {
      const legacy = psych?.selected?.[`${laneId}:${selectKey}`];
      if (Array.isArray(legacy)) merged.push(...legacy);
    });
    return [...new Set(merged.map((item) => String(item || '').trim()).filter(Boolean))];
  },

  aspirationPsychMinSelect() {
    const cfg = window.GameModules.playerAspirationConfig;
    return cfg?.psychMinSelectPerGroup ?? cfg?.psychMinSelectPerCategory ?? 3;
  },

  aspirationPsychMaxSelect() {
    const cfg = window.GameModules.playerAspirationConfig;
    return cfg?.psychMaxSelectPerGroup ?? cfg?.psychMaxSelectPerCategory ?? 3;
  },

  aspirationPsychIncompleteGroups(category = this.aspirationPsychCategory()) {
    const cfg = window.GameModules.playerAspirationConfig;
    const min = this.aspirationPsychMinSelect();
    return cfg.psychCategoryGroups(category).filter((group) => this.aspirationPsychGroupSelectedCount(group.id) < min);
  },

  aspirationPsychCategoryMeetsMin(category = this.aspirationPsychCategory()) {
    return this.aspirationPsychIncompleteGroups(category).length === 0;
  },

  aspirationPsychSelectionHint(category = this.aspirationPsychCategory()) {
    const cfg = window.GameModules.playerAspirationConfig;
    const min = this.aspirationPsychMinSelect();
    const groups = cfg.psychCategoryGroups(category);
    const done = groups.filter((group) => this.aspirationPsychGroupSelectedCount(group.id) >= min).length;
    const label = category?.label || '本大类';
    if (done >= groups.length) return `${label}：${groups.length} 个小类均已选满 ${min} 个`;
    const pending = this.aspirationPsychIncompleteGroups(category).map((group) => {
      const count = this.aspirationPsychGroupSelectedCount(group.id);
      return `${group.label} ${count}/${min}`;
    }).join('、');
    return `${label}：已完成 ${done}/${groups.length} 个小类；未完成：${pending}`;
  },

  aspirationPsychGroupHint(selectKey) {
    const min = this.aspirationPsychMinSelect();
    const count = this.aspirationPsychGroupSelectedCount(selectKey);
    if (count >= min) return `已选满 ${count}/${min}`;
    return `已选 ${count}/${min}，还须 ${min - count} 个`;
  },

  aspirationPsychGroupSelectedCount(selectKey) {
    return this.aspirationPsychSelected(selectKey).length;
  },

  canSelectAspirationPsychTag(selectKey, tag) {
    if (this.isAspirationPsychTagSelected(selectKey, tag)) return true;
    return this.aspirationPsychGroupSelectedCount(selectKey) < this.aspirationPsychMaxSelect();
  },

  isAspirationPsychTagSelected(selectKey, tag) {
    return this.aspirationPsychSelected(selectKey).includes(tag);
  },

  toggleAspirationPsychTag(selectKey, tag) {
    if (this.aspirationBusy || this.aspirationPsychLoading) return;
    const psych = this.aspirationDraft.psychPreferences || window.GameModules.playerAspirationConfig.defaultPsychPreferences();
    const prev = this.aspirationPsychSelected(selectKey);
    if (prev.includes(tag)) {
      psych.selected[selectKey] = prev.filter((item) => item !== tag);
      ['normal', 'acg'].forEach((laneId) => { delete psych.selected[`${laneId}:${selectKey}`]; });
      this.aspirationDraft = { ...this.aspirationDraft, psychPreferences: { ...psych, selected: { ...psych.selected }, options: { ...(psych.options || {}) }, custom: { ...(psych.custom || {}) } } };
      this.aspirationError = '';
      return;
    }
    if (this.aspirationPsychGroupSelectedCount(selectKey) >= this.aspirationPsychMaxSelect()) {
      const cfg = window.GameModules.playerAspirationConfig;
      const category = this.aspirationPsychCategory();
      const group = cfg.psychCategoryGroups(category).find((item) => item.id === selectKey);
      this.aspirationError = `「${group?.label || selectKey}」最多选 ${this.aspirationPsychMaxSelect()} 个（正常与二次元合计），请先取消已选再换`;
      return;
    }
    psych.selected[selectKey] = [...prev, tag];
    ['normal', 'acg'].forEach((laneId) => { delete psych.selected[`${laneId}:${selectKey}`]; });
    this.aspirationDraft = { ...this.aspirationDraft, psychPreferences: { ...psych, selected: { ...psych.selected }, options: { ...(psych.options || {}) }, custom: { ...(psych.custom || {}) } } };
    this.aspirationError = '';
  },

  addAspirationPsychCustomTag(optionKey, rawTag) {
    if (this.aspirationBusy || this.aspirationPsychLoading) return;
    const tag = String(rawTag ?? this.getAspirationPsychCustomDraft(optionKey) ?? '').trim();
    if (!tag) {
      this.aspirationError = '请输入标签内容';
      return;
    }
    if (tag.length > 12) {
      this.aspirationError = '标签最多 12 个字';
      return;
    }
    const cfg = window.GameModules.playerAspirationConfig;
    const category = this.aspirationPsychCategory();
    const entry = cfg.psychCategoryGroupKeys(category).find((item) => item.key === optionKey);
    if (!entry) return;
    if (this.aspirationPsychKnownTags(optionKey, entry.tagGroup).includes(tag)) {
      this.aspirationError = '该标签已存在';
      return;
    }
    const psych = this.aspirationDraft.psychPreferences || cfg.defaultPsychPreferences();
    const custom = [...this.aspirationPsychCustomTags(optionKey), tag];
    const options = [...this.aspirationPsychOptions(optionKey), tag];
    this.aspirationDraft = {
      ...this.aspirationDraft,
      psychPreferences: {
        ...psych,
        custom: { ...(psych.custom || {}), [optionKey]: custom },
        options: { ...(psych.options || {}), [optionKey]: options },
        selected: { ...(psych.selected || {}) },
      },
    };
    this.setAspirationPsychCustomDraft(optionKey, '');
    this.aspirationError = '';
  },

  normalizePsychTagGroups(data = {}, entries = [], context = {}) {
    const cfg = window.GameModules.playerAspirationConfig;
    const groups = data?.groups && typeof data.groups === 'object' ? data.groups : data;
    const { append = false, existingByKey = {}, excludeByKey = {}, lockedByKey = {} } = context;
    const out = {};
    entries.forEach(({ key, tagGroup }) => {
      const resolved = this.resolvePsychTagGroup(tagGroup);
      const raw = groups?.[key];
      const list = Array.isArray(raw) ? raw.map((item) => String(item || '').trim()).filter(Boolean) : [];
      if (append) {
        out[key] = cfg.appendPsychTagOptions(resolved, existingByKey[key] || [], list, excludeByKey[key] || []);
        return;
      }
      const locked = lockedByKey[key] || [];
      const exclude = excludeByKey[key] || [];
      out[key] = cfg.buildPsychTagOptions(resolved, list, locked, exclude);
    });
    return out;
  },

  applyPsychTagOptions(categoryId, patch = {}) {
    const psych = this.aspirationDraft.psychPreferences || window.GameModules.playerAspirationConfig.defaultPsychPreferences();
    const options = { ...psych.options, ...patch };
    this.aspirationDraft = { ...this.aspirationDraft, psychPreferences: { ...psych, options, selected: { ...psych.selected } } };
  },

  async ensureAspirationPsychTags(categoryId = this.aspirationPsychCategoryId(), { refresh = false } = {}) {
    const cfg = window.GameModules.playerAspirationConfig;
    const category = cfg.psychCategoryById(categoryId);
    if (!category) return;
    const entries = cfg.psychCategoryGroupKeys(category);
    let psych = cfg.migratePsychPreferences(this.aspirationDraft.psychPreferences || cfg.defaultPsychPreferences());
    this.aspirationDraft = { ...this.aspirationDraft, psychPreferences: psych };
    const playerGender = this.aspirationPlayerGender();
    const genderChanged = psych._tagGender && psych._tagGender !== playerGender;
    const needsGenderRefresh = (entry) => Boolean(entry.tagGroup?.fallbackTagsByGender) && genderChanged;
    const initTargets = entries.filter(({ key, tagGroup }) => needsGenderRefresh({ tagGroup }) || !(this.aspirationPsychOptions(key).length >= cfg.psychOptionCount));

    if (!refresh) {
      if (!initTargets.length) return;
      const patch = Object.fromEntries(initTargets.map(({ key, tagGroup }) => {
        const resolved = this.resolvePsychTagGroup(tagGroup);
        const preserve = needsGenderRefresh({ tagGroup }) ? this.aspirationPsychCustomTags(key) : this.aspirationPsychPreserveTags(key);
        const builtin = cfg.getBuiltinPsychTags(resolved);
        return [key, cfg.buildPsychTagOptions(resolved, builtin, preserve, [])];
      }));
      const nextPsych = {
        ...psych,
        _tagGender: playerGender,
        options: { ...(psych.options || {}), ...patch },
        selected: { ...(psych.selected || {}) },
      };
      if (genderChanged) {
        initTargets.forEach(({ tagGroup, key }) => {
          if (!tagGroup?.fallbackTagsByGender) return;
          const entry = entries.find((item) => item.key === key);
          const selectKey = entry?.selectKey || String(key).split(':')[0];
          delete nextPsych.selected[selectKey];
          ['normal', 'acg'].forEach((laneId) => { delete nextPsych.selected[`${laneId}:${selectKey}`]; });
        });
      }
      this.aspirationDraft = { ...this.aspirationDraft, psychPreferences: nextPsych };
      return;
    }

    const existingByKey = Object.fromEntries(entries.map(({ key }) => [key, psych.options?.[key] || []]));
    const excludeByKey = Object.fromEntries(entries.map(({ key, tagGroup }) => [key, this.aspirationPsychKnownTags(key, this.resolvePsychTagGroup(tagGroup))]));

    this.aspirationPsychLoading = true;
    this.aspirationError = '';
    try {
      await window.GameModules.assetLoader?.loadChunk?.('prompts');
      window.GameModules.remergeGameStore?.();
      const appendCount = cfg.psychOptionCount || 10;
      const groupList = entries.map(({ key, lane, group, tagGroup }) => {
        const current = (existingByKey[key] || []).join('、') || '无';
        const known = (excludeByKey[key] || []).join('、') || '无';
        const direction = cfg.psychTagDirectionHint(group.id, categoryId, playerGender);
        const directionText = direction ? `｜标签方向：${direction}` : '';
        return `${key}｜${group.label}｜${lane.label}｜${lane.hint || tagGroup.hint || ''}${directionText}｜当前已有：${current}｜不可重复：${known}｜需追加：${appendCount}个`;
      }).join('\n');
      const prompt = await window.GameModules.renderPrompt('player-aspiration-psych-tags', {
        玩家资料: this.playerSetupSummary?.() || '',
        玩家性别: cfg.playerGenderLabel(playerGender),
        标签方向规则: cfg.psychGenderTagRules(playerGender),
        类别名称: category.label,
        类别说明: category.intro || '',
        分组列表: groupList,
      });
      let data = null;
      try {
        data = await Promise.race([
          window.GameModules.jsonUtils.generateJsonWithRetry({
            source: 'player-aspiration-psych-tags',
            promptId: 'player-aspiration-psych-tags',
            model: this.modelId,
            timeoutMs: 45000,
            prompt,
            format: prompt,
            max: 2,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('标签生成超时')), 45000)),
        ]);
      } catch (err) {
        console.warn('[人生取向] AI 标签生成失败，使用本地候选:', err?.message || err);
      }
      const appendContext = { append: true, existingByKey, excludeByKey };
      const patch = data
        ? this.normalizePsychTagGroups(data, entries, appendContext)
        : Object.fromEntries(entries.map(({ key, tagGroup }) => {
          const resolved = this.resolvePsychTagGroup(tagGroup);
          const extra = cfg.getBuiltinPsychTags(resolved).filter((item) => !(excludeByKey[key] || []).includes(item));
          return [key, cfg.appendPsychTagOptions(resolved, existingByKey[key] || [], extra, excludeByKey[key] || [])];
        }));
      this.applyPsychTagOptions(categoryId, patch);
      const psychAfter = this.aspirationDraft.psychPreferences || cfg.defaultPsychPreferences();
      this.aspirationDraft = {
        ...this.aspirationDraft,
        psychPreferences: { ...psychAfter, _tagGender: playerGender },
      };
    } catch (err) {
      console.warn('[人生取向] 标签加载失败，使用本地候选:', err?.message || err);
      const patch = Object.fromEntries(entries.map(({ key, tagGroup }) => {
        const resolved = this.resolvePsychTagGroup(tagGroup);
        const extra = cfg.getBuiltinPsychTags(resolved).filter((item) => !(excludeByKey[key] || []).includes(item));
        return [key, cfg.appendPsychTagOptions(resolved, existingByKey[key] || [], extra, excludeByKey[key] || [])];
      }));
      this.applyPsychTagOptions(categoryId, patch);
    } finally {
      this.aspirationPsychLoading = false;
    }
  },

  async regenerateAspirationPsychTags() {
    if (this.aspirationBusy || this.aspirationPsychLoading) return;
    await this.ensureAspirationPsychTags(this.aspirationPsychCategoryId(), { refresh: true });
  },

  aspirationPsychSummary(psychPreferences = this.aspirationDraft?.psychPreferences) {
    const cfg = window.GameModules.playerAspirationConfig;
    const lines = [];
    cfg.psychPreferenceCategories.forEach((category) => {
      const parts = [];
      cfg.psychCategoryGroups(category).forEach((group) => {
        const tags = (psychPreferences?.selected?.[group.id] || []);
        const legacy = [];
        if (!tags.length) {
          ['normal', 'acg'].forEach((laneId) => {
            const old = psychPreferences?.selected?.[`${laneId}:${group.id}`];
            if (Array.isArray(old)) legacy.push(...old);
          });
        }
        const merged = tags.length ? tags : [...new Set(legacy)];
        if (merged.length) parts.push(`${group.label}：${merged.join('、')}`);
      });
      if (parts.length) lines.push(`${category.label}：${parts.join('；')}`);
    });
    return lines.join('\n');
  },

  aspirationSelectionSummary() {
    const draft = this.aspirationDraft || {};
    const cfg = window.GameModules.playerAspirationConfig;
    const primaryGuilt = cfg.guiltLineById(this.aspirationPrimaryGuiltLineId(draft.guiltAxes));
    const lines = [
      `价值立场：${this.aspirationAlignmentLabel(draft.alignment)}`,
      `决策风格：${this.aspirationRationalityLabel(draft.rationality)}（${draft.rationality}/100）`,
    ];
    cfg.axes.forEach((axis) => {
      const value = draft.axes?.[axis.key] ?? 50;
      lines.push(`${axis.title}：${cfg.axisLeanText(value, axis)}（${value}/100，${axis.leftTag}/${axis.rightTag}）`);
    });
    lines.push(`底线锚点（六维 guilt 强度）：\n${this.aspirationGuiltSummary(draft.guiltAxes)}`);
    if (primaryGuilt) {
      lines.push(`主锚点：${primaryGuilt.category}·${primaryGuilt.theme}｜${primaryGuilt.guiltName}｜「${primaryGuilt.quote}」`);
    }
    lines.push(this.aspirationPsychSummary(draft.psychPreferences) || this.aspirationDirectionsSummary(draft.directions));
    return lines.join('\n');
  },

  playerAspirationSummary() {
    const data = this.activePlayerLifeOrientation?.() || {};
    if (!this.hasPlayerAspiration()) return '';
    const goals = data.goals || {};
    const prefTool = window.GameModules.playerAspirationPreferenceLayers;
    const layers = data.essentialPreferenceLayers || prefTool?.buildFromPlayerAspiration?.(data);
    const prefLines = prefTool?.toLines?.(layers) || [];
    const portrait = String(data.portraitSummary || '').trim();
    const goalSummary = String(data.goalSummary || '').trim();
    const shortSummary = String(data.summary || goals.summary || '').trim();
    const parts = [
      prefLines.length ? `本质偏好五层（永久固化）：\n${prefLines.join('\n')}` : '',
      portrait ? `人生总结：${portrait}` : '',
      !portrait && shortSummary ? shortSummary : '',
      portrait && shortSummary && shortSummary !== portrait ? `目标摘要：${shortSummary}` : '',
      !portrait && !shortSummary ? this.aspirationSelectionSummaryFromData(data) : '',
      goalSummary && !goals.short ? `目标：${goalSummary}` : '',
      goals.short ? `近期目标：${typeof goals.short === 'object' ? (goals.short.content || '') : goals.short}` : '',
      goals.medium ? `中期目标：${typeof goals.medium === 'object' ? (goals.medium.content || '') : goals.medium}` : '',
      goals.long ? `长期目标：${typeof goals.long === 'object' ? (goals.long.content || '') : goals.long}` : '',
      (() => {
        const system = data.goalSystem || this.playerIdentityState?.()?.profile?.goalSystem;
        return system ? window.GameModules.characterGoalSystem?.formatContextBlock?.(system, '玩家') : '';
      })(),
    ].filter(Boolean);
    return parts.join('\n');
  },

  playerLifeOrientationForRoleCard(source = this.playerAspiration) {
    const data = source || {};
    if (!data.alignment) return null;
    const cfg = window.GameModules.playerAspirationConfig;
    const rationality = data.rationality ?? 50;
    const guiltLine = data.guiltLine || cfg.primaryGuiltLineId(data.guiltAxes);
    const guilt = cfg.guiltLineById(guiltLine);
    const axes = this.cloneAspirationValue(data.axes || cfg.defaultAxes());
    const guiltAxes = this.cloneAspirationValue(data.guiltAxes || cfg.defaultGuiltAxes());
    const directions = this.cloneAspirationValue(data.directions || cfg.defaultDirections());
    const psychPreferences = this.cloneAspirationValue(data.psychPreferences || cfg.defaultPsychPreferences());
    const goals = this.cloneAspirationValue(data.goals || {});
    const orientation = {
      alignment: data.alignment,
      alignmentLabel: data.alignmentLabel || this.aspirationAlignmentLabel(data.alignment),
      rationality,
      rationalityLabel: data.rationalityLabel || this.aspirationRationalityLabel(rationality),
      axes,
      guiltAxes,
      guiltLine,
      guiltLabel: data.guiltLabel || this.aspirationGuiltLineLabel(guiltLine),
      guiltQuote: data.guiltQuote || guilt?.quote || '',
      psychPreferences,
      essentialPreferenceLayers: this.cloneAspirationValue(
        data.essentialPreferenceLayers || window.GameModules.playerAspirationPreferenceLayers?.buildFromPlayerAspiration?.(data),
      ),
      portraitSummary: String(data.portraitSummary || '').trim(),
      directions,
      goals,
      summary: String(data.summary || goals.summary || '').trim(),
      completedAt: data.completedAt || new Date().toISOString(),
    };
    orientation.lifeAxesSummary = this.lifeOrientationAxesSummary(orientation.axes);
    orientation.boundaryAnchorsSummary = this.lifeOrientationGuiltSummary(orientation.guiltAxes, orientation.guiltLine);
    orientation.psychSummary = this.aspirationPsychSummary(orientation.psychPreferences);
    orientation.goalSummary = this.lifeOrientationGoalSummary(orientation);
    return orientation;
  },

  lifeOrientationAxesSummary(axes = {}) {
    const cfg = window.GameModules.playerAspirationConfig;
    return cfg.axes.map((axis) => {
      const value = axes?.[axis.key] ?? 50;
      return `${axis.title}：${cfg.axisLeanText(value, axis)}（${value}/100，${axis.leftTag}/${axis.rightTag}）`;
    }).join('\n');
  },

  lifeOrientationGuiltSummary(guiltAxes = {}, primaryGuiltLine = '') {
    const cfg = window.GameModules.playerAspirationConfig;
    const primary = cfg.guiltLineById(primaryGuiltLine || cfg.primaryGuiltLineId(guiltAxes));
    const lines = cfg.guiltLines.map((item) => {
      const value = guiltAxes?.[item.id] ?? 50;
      return `${item.title}：${cfg.guiltLeanText(value, item)}（${value}/100，${item.leftTag}/${item.rightTag}）`;
    });
    if (primary) lines.unshift(`主锚点：${primary.category}·${primary.theme}｜${primary.guiltName}｜「${primary.quote}」`);
    return lines.join('\n');
  },

  lifeOrientationDirectionSummary(directions = {}) {
    const cfg = window.GameModules.playerAspirationConfig;
    return cfg.directionHorizons.map((horizon) => {
      const weights = directions?.[horizon.key] || cfg.defaultDirectionWeights();
      const dominant = cfg.dominantDirection(weights);
      const parts = cfg.directionChoices.map((choice) => `${choice.label}${weights[choice.id] ?? 50}`);
      return `${horizon.label}：${parts.join(' / ')}；主轴偏${dominant?.label || '均衡'}`;
    }).join('\n');
  },

  lifeOrientationGoalSummary(data = {}) {
    const goals = data.goals || {};
    const textOf = (value) => {
      if (value && typeof value === 'object') return String(value.content || value.text || '').trim();
      return String(value || '').trim();
    };
    return [
      data.directions ? `目标方向：\n${this.lifeOrientationDirectionSummary(data.directions)}` : '',
      goals.summary ? `目标摘要：${goals.summary}` : '',
      textOf(goals.short) ? `近期目标：${textOf(goals.short)}` : '',
      textOf(goals.medium) ? `中期目标：${textOf(goals.medium)}` : '',
      textOf(goals.long) ? `长期目标：${textOf(goals.long)}` : '',
    ].filter(Boolean).join('\n');
  },

  aspirationSelectionSummaryFromData(data = {}) {
    const cfg = window.GameModules.playerAspirationConfig;
    const primaryGuilt = cfg.guiltLineById(data.guiltLine || cfg.primaryGuiltLineId(data.guiltAxes));
    const lines = [
      `价值立场：${this.aspirationAlignmentLabel(data.alignment)}`,
      `决策风格：${this.aspirationRationalityLabel(data.rationality)}（${data.rationality ?? 50}/100）`,
    ];
    cfg.axes.forEach((axis) => {
      const value = data.axes?.[axis.key] ?? 50;
      lines.push(`${axis.title}：${cfg.axisLeanText(value, axis)}（${value}/100）`);
    });
    if (data.guiltAxes) {
      lines.push(`底线锚点：${cfg.guiltLines.map((item) => {
        const value = data.guiltAxes[item.id] ?? 50;
        return `${item.title}${value}`;
      }).join('；')}`);
    }
    if (primaryGuilt) {
      lines.push(`主锚点：${primaryGuilt.category}·${primaryGuilt.theme}｜${primaryGuilt.guiltName}`);
    }
    if (data.psychPreferences?.selected) {
      lines.push(this.aspirationPsychSummary(data.psychPreferences));
    } else if (data.directions) {
      lines.push(cfg.directionHorizons.map((item) => {
        const weights = data.directions[item.key];
        if (!weights || typeof weights !== 'object') return `${item.label}：${cfg.directionLabel(weights) || '未选择'}`;
        const dominant = cfg.dominantDirection(weights);
        const parts = cfg.directionChoices.map((choice) => `${choice.label}${weights[choice.id] ?? 50}`);
        return `${item.label}：${parts.join(' / ')}；主轴偏${dominant?.label || '均衡'}`;
      }).join('\n'));
    }
    return lines.join('\n');
  },

  aspirationCell(rowKey, colKey) {
    return window.GameModules.playerAspirationConfig.alignments.find((item) => item.row === rowKey && item.col === colKey) || null;
  },

  aspirationConfig() {
    return window.GameModules?.playerAspirationConfig || null;
  },

  aspirationAlignmentOptions() {
    return this.aspirationConfig()?.alignments || [];
  },

  aspirationAlignmentColumns() {
    return this.aspirationConfig()?.alignmentColumns || [];
  },

  aspirationAlignmentRows() {
    return this.aspirationConfig()?.alignmentRows || [];
  },

  aspirationAxes() {
    return this.aspirationConfig()?.axes || [];
  },

  aspirationGuiltLines() {
    return this.aspirationConfig()?.guiltLines || [];
  },

  aspirationPsychGroupEntries() {
    const category = this.aspirationPsychCategory();
    const cfg = this.aspirationConfig();
    if (!category || !cfg?.psychCategoryGroupKeys) return [];
    return cfg.psychCategoryGroupKeys(category);
  },

  aspirationProgressLabel() {
    const step = this.aspirationStep || 1;
    if (step === 5) {
      const total = this.aspirationConfig()?.psychPreferenceCategories?.length || 6;
      const psych = this.aspirationPsychStep || 1;
      return `步骤 ${step} / 7 · 偏好 ${psych} / ${total}`;
    }
    return `步骤 ${step} / 7`;
  },

  aspirationStepTitle(step = this.aspirationStep) {
    if (step === 5) {
      const category = this.aspirationPsychCategory();
      return category ? `心理偏好 · ${category.label}` : '心理偏好';
    }
    return ({ 1: '价值立场', 2: '决策风格', 3: '人生六维', 4: '底线锚点', 5: '心理偏好', 6: '人生总结', 7: '确认目标' })[step] || '';
  },

  aspirationCanNextStep() {
    const step = this.aspirationStep || 1;
    const draft = this.aspirationDraft || {};
    if (step === 1) return Boolean(draft.alignment);
    if (step === 5) return !this.aspirationBusy && !this.aspirationPsychLoading && this.aspirationPsychCategoryMeetsMin();
    if (step === 6) return Boolean(String(this.aspirationSummaryDraft?.portrait || '').trim()) && !this.aspirationBusy;
    return !this.aspirationBusy;
  },

  async aspirationPrevStep() {
    if (this.aspirationBusy || this.aspirationPsychLoading) return;
    const step = this.aspirationStep || 1;
    if (step === 7) {
      this.aspirationStep = 6;
      this.aspirationError = '';
      return;
    }
    if (step === 6) {
      this.aspirationStep = 5;
      this.aspirationPsychStep = window.GameModules.playerAspirationConfig?.psychPreferenceCategories?.length || 6;
      this.aspirationError = '';
      return;
    }
    if (step === 5 && (this.aspirationPsychStep || 1) > 1) {
      this.aspirationPsychStep -= 1;
      await this.ensureAspirationPsychTags(this.aspirationPsychCategoryId());
      this.aspirationError = '';
      return;
    }
    if (step <= 1) return;
    this.aspirationStep = step - 1;
    this.aspirationError = '';
  },

  async aspirationNextStep() {
    if (!this.aspirationCanNextStep() || this.aspirationBusy) return;
    const step = this.aspirationStep || 1;
    if (step === 4) {
      this.aspirationStep = 5;
      this.aspirationPsychStep = 1;
      await this.ensureAspirationPsychTags(this.aspirationPsychCategoryId());
      this.aspirationError = '';
      return;
    }
    if (step === 5) {
      const psychStep = this.aspirationPsychStep || 1;
      const cfg = window.GameModules.playerAspirationConfig;
      if (!this.aspirationPsychCategoryMeetsMin()) {
        const category = this.aspirationPsychCategory();
        const pending = this.aspirationPsychIncompleteGroups(category).map((group) => group.label).join('、');
        this.aspirationError = `请先在「${category?.label || '本大类'}」的每个小类各选满 ${this.aspirationPsychMinSelect()} 个标签；未完成：${pending}`;
        return;
      }
      if (psychStep < cfg.psychPreferenceCategories.length) {
        this.aspirationPsychStep = psychStep + 1;
        await this.ensureAspirationPsychTags(this.aspirationPsychCategoryId());
        this.aspirationError = '';
        return;
      }
      await this.generateAspirationSummary();
      return;
    }
    if (step === 6) {
      await this.generateAspirationGoals();
      return;
    }
    if (step < 5) {
      this.aspirationStep = step + 1;
      this.aspirationError = '';
    }
  },

  fallbackAspirationSummary() {
    const draft = this.aspirationDraft || {};
    const name = this.playerProfile?.name || this.playerName || '你';
    const alignment = this.aspirationAlignmentLabel(draft.alignment);
    const psych = this.aspirationPsychSummary(draft.psychPreferences);
    const topTags = Object.values(draft.psychPreferences?.selected || {}).flat().slice(0, 6).join('、') || '自我成长';
    const lines = [
      `你是${name}，在 2026 现代都市里，行事风格偏向${alignment}。`,
      `决策上${this.aspirationRationalityLabel(draft.rationality)}，六维取向与底线锚点共同塑造你的行动边界。`,
      psych ? `心理偏好上，你最喜欢：${topTags}。` : '',
      '你会在熟悉的生活节奏里，把这些取向慢慢落实成可坚持的选择。',
    ].filter(Boolean);
    return { portrait: lines.join('').slice(0, 220) };
  },

  normalizeAspirationSummary(data = {}) {
    const fallback = this.fallbackAspirationSummary();
    return {
      portrait: String(data.portrait || fallback.portrait).trim().slice(0, 400),
    };
  },

  async generateAspirationSummary(options = {}) {
    const regenerate = Boolean(options?.regenerate);
    if (this.aspirationBusy) return;
    this.aspirationBusy = true;
    this.aspirationError = '';
    if (regenerate || String(this.aspirationSummaryDraft?.portrait || '').trim()) {
      this.aspirationSummaryDraft = { portrait: '（正在重新生成…）' };
    }
    try {
      const draft = this.aspirationDraft || {};
      const cfg = window.GameModules.playerAspirationConfig;
      const primaryGuiltId = this.aspirationPrimaryGuiltLineId(draft.guiltAxes);
      const guilt = cfg.guiltLineById(primaryGuiltId);
      await window.GameModules.assetLoader?.loadChunk?.('prompts');
      window.GameModules.remergeGameStore?.();
      const prompt = await window.GameModules.renderPrompt('player-aspiration-summary', {
        玩家资料: this.playerSetupSummary?.() || '',
        价值选择: this.aspirationSelectionSummary(),
        输入: JSON.stringify({
          alignment: draft.alignment,
          alignmentLabel: this.aspirationAlignmentLabel(draft.alignment),
          rationality: draft.rationality,
          axes: draft.axes,
          guiltAxes: draft.guiltAxes,
          guiltLine: primaryGuiltId,
          guiltLabel: this.aspirationGuiltLineLabel(primaryGuiltId),
          guiltQuote: guilt?.quote || '',
          psychPreferences: draft.psychPreferences?.selected || {},
          psychSummary: this.aspirationPsychSummary(draft.psychPreferences),
        }),
      });
      let data = null;
      try {
        data = await Promise.race([
          window.GameModules.jsonUtils.generateJsonWithRetry({
            source: 'player-aspiration-summary',
            promptId: 'player-aspiration-summary',
            model: this.modelId,
            timeoutMs: 60000,
            prompt,
            format: prompt,
            max: 2,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('总结生成超时')), 60000)),
        ]);
      } catch (err) {
        console.warn('[人生取向] AI 总结生成失败，使用本地兜底:', err?.message || err);
        data = this.fallbackAspirationSummary();
        this.aspirationError = 'AI 暂时不可用，已改用本地兜底总结。';
      }
      this.aspirationSummaryDraft = this.normalizeAspirationSummary(data);
      this.aspirationStep = 6;
    } catch (err) {
      console.error('[人生取向] 生成总结失败:', err.message, err.stack);
      this.aspirationError = err.message || '生成总结失败';
      if (!String(this.aspirationSummaryDraft?.portrait || '').trim() || this.aspirationSummaryDraft.portrait === '（正在重新生成…）') {
        this.aspirationSummaryDraft = this.normalizeAspirationSummary(this.fallbackAspirationSummary());
      }
    } finally {
      this.aspirationBusy = false;
    }
  },

  async regenerateAspirationSummary() {
    await this.generateAspirationSummary({ regenerate: true });
  },

  fallbackAspirationGoals() {
    const draft = this.aspirationDraft || {};
    const name = this.playerProfile?.name || this.playerName || '你';
    const role = this.playerProfile?.refinedRole || this.playerProfile?.dailyRole || '现代都市居民';
    const portrait = String(this.aspirationSummaryDraft?.portrait || '').trim();
    const topTags = Object.values(draft.psychPreferences?.selected || {}).flat().slice(0, 4).join('、') || '自我成长';
    return {
      shortTermGoal: `${name}先按总结「${portrait.slice(0, 36)}…」处理眼前一件最要紧的事，从${topTags}相关的具体行动开始。`,
      mediumTermGoal: `在${role}的日常里，让总结中的取向变成稳定习惯，并在现实处境中持续校准。`,
      longTermGoal: `朝着总结所描绘的人生方向持续靠近，让行动、偏好与价值立场保持一致。`,
      summary: portrait.slice(0, 60) || topTags,
    };
  },

  normalizeAspirationGoals(data = {}) {
    const fallback = this.fallbackAspirationGoals();
    return {
      short: String(data.shortTermGoal || data.short || fallback.shortTermGoal).trim().slice(0, 200),
      medium: String(data.mediumTermGoal || data.medium || fallback.mediumTermGoal).trim().slice(0, 200),
      long: String(data.longTermGoal || data.long || fallback.longTermGoal).trim().slice(0, 200),
      summary: String(data.summary || fallback.summary).trim().slice(0, 160),
    };
  },

  async generateAspirationGoals(options = {}) {
    const regenerate = Boolean(options?.regenerate);
    if (this.aspirationBusy) return;
    this.aspirationBusy = true;
    this.aspirationError = '';
    if (regenerate) {
      this.aspirationGoalDraft = { short: '（正在重新生成…）', medium: '（正在重新生成…）', long: '（正在重新生成…）', summary: '（正在重新生成…）' };
    }
    try {
      const draft = this.aspirationDraft || {};
      const cfg = window.GameModules.playerAspirationConfig;
      const primaryGuiltId = this.aspirationPrimaryGuiltLineId(draft.guiltAxes);
      const guilt = cfg.guiltLineById(primaryGuiltId);
      await window.GameModules.assetLoader?.loadChunk?.('prompts');
      window.GameModules.remergeGameStore?.();
      const prompt = await window.GameModules.renderPrompt('player-aspiration-goals', {
        玩家资料: this.playerSetupSummary?.() || '',
        人生总结: this.aspirationSummaryDraft?.portrait || '',
        价值选择: this.aspirationSelectionSummary(),
        输入: JSON.stringify({
          portraitSummary: this.aspirationSummaryDraft?.portrait || '',
          alignment: draft.alignment,
          alignmentLabel: this.aspirationAlignmentLabel(draft.alignment),
          rationality: draft.rationality,
          axes: draft.axes,
          guiltAxes: draft.guiltAxes,
          guiltLine: primaryGuiltId,
          guiltLabel: this.aspirationGuiltLineLabel(primaryGuiltId),
          guiltQuote: guilt?.quote || '',
          psychPreferences: draft.psychPreferences,
          psychSummary: this.aspirationPsychSummary(draft.psychPreferences),
        }),
      });
      let data = null;
      try {
        data = await Promise.race([
          window.GameModules.jsonUtils.generateJsonWithRetry({
            source: 'player-aspiration-goals',
            promptId: 'player-aspiration-goals',
            model: this.modelId,
            timeoutMs: 60000,
            prompt,
            format: prompt,
            max: 2,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('目标生成超时')), 60000)),
        ]);
      } catch (err) {
        console.warn('[人生取向] AI 目标生成失败，使用本地兜底:', err.message, err.stack);
        data = this.fallbackAspirationGoals();
        this.aspirationError = 'AI 暂时不可用，已改用本地兜底目标。';
      }
      const goals = this.normalizeAspirationGoals(data);
      this.aspirationGoalDraft = goals;
      this.aspirationStep = 7;
    } catch (err) {
      console.error('[人生取向] 生成目标失败:', err.message, err.stack);
      this.aspirationError = err.message || '生成目标失败';
      if (!String(this.aspirationGoalDraft?.short || '').trim() || this.aspirationGoalDraft.short === '（正在重新生成…）') {
        this.aspirationGoalDraft = this.normalizeAspirationGoals(this.fallbackAspirationGoals());
      }
    } finally {
      this.aspirationBusy = false;
    }
  },

  async regenerateAspirationGoals() {
    await this.generateAspirationGoals({ regenerate: true });
  },

  playerAspirationLexiconFields() {
    if (!this.hasPlayerAspiration()) return [];
    const data = this.activePlayerLifeOrientation?.() || {};
    const worldTag = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const row = (name, value, desc) => ({
      ...window.GameModules.playerProfileLexicon.row(name, value, desc, worldTag),
      profileGroup: '人生取向',
    });
    return [
      row('价值立场', data.alignmentLabel || this.aspirationAlignmentLabel(data.alignment), '第 1 步原始选择：DND 九宫格价值立场。'),
      row('决策风格', `${data.rationalityLabel || this.aspirationRationalityLabel(data.rationality)}（${data.rationality ?? 50}/100）`, '第 2 步原始选择：理性/感性决策滑块。'),
      row('人生六维', data.lifeAxesSummary || this.lifeOrientationAxesSummary(data.axes), '第 3 步原始选择：六组人生取向滑块。'),
      row('底线锚点', data.boundaryAnchorsSummary || this.lifeOrientationGuiltSummary(data.guiltAxes, data.guiltLine), '第 4 步原始选择：底线/罪恶感锚点。'),
      row('心理偏好', data.psychSummary || this.aspirationPsychSummary(data.psychPreferences), '第 5 步原始选择：所有心理偏好标签。'),
      row('人生总结', data.portraitSummary || data.summary || this.aspirationSummaryDraft?.portrait || '', '第 6 步确认的人生取向画像。'),
      // 短/中/长期与阶段成果改由 characterGoalSystem lexicon（profileGroup=长期目标）单独成页。
    ];
  },

  async syncEssentialPreferenceLayersToPlayerState() {
    const tool = window.GameModules.playerAspirationPreferenceLayers;
    const layers = tool?.buildFromPlayerAspiration?.(this.playerAspiration);
    if (!layers) return;
    this.playerAspiration = { ...(this.playerAspiration || {}), essentialPreferenceLayers: layers };
    const state = this.playerIdentityState?.();
    if (state?.profile) {
      tool.applyToProfile(state.profile, layers, { locked: true });
      const lifeOrientation = this.playerLifeOrientationForRoleCard?.(this.playerAspiration);
      if (lifeOrientation) state.profile.lifeOrientation = lifeOrientation;
      if (lifeOrientation?.psychPreferences) state.profile.psychPreferences = this.cloneAspirationValue(lifeOrientation.psychPreferences);
      await window.GameModules.sqliteSave?.saveCharacterState?.(state);
      this.rpgStates = { ...(this.rpgStates || {}), [state.id]: state };
    }
  },

  playerAspirationView() {
    if (!this.hasPlayerAspiration()) return null;
    const data = this.activePlayerLifeOrientation?.() || {};
    const cfg = window.GameModules.playerAspirationConfig;
    const guiltAxes = data.guiltAxes || cfg.defaultGuiltAxes();
    const directions = data.directions || cfg.defaultDirections();
    const psychPreferences = data.psychPreferences || cfg.defaultPsychPreferences();
    const axes = data.axes || cfg.defaultAxes();
    const primaryGuiltId = data.guiltLine || cfg.primaryGuiltLineId(guiltAxes);
    return {
      alignmentLabel: data.alignmentLabel || this.aspirationAlignmentLabel(data.alignment),
      rationality: data.rationality ?? 50,
      rationalityLabel: this.aspirationRationalityLabel(data.rationality),
      axes: cfg.axes.map((axis) => {
        const value = axes[axis.key] ?? 50;
        return { ...axis, value, summary: `${axis.title}：${cfg.axisLeanText(value, axis)}（${value}/100）` };
      }),
      guiltLines: cfg.guiltLines.map((item) => {
        const value = guiltAxes[item.id] ?? 50;
        return { ...item, value, summary: `${item.title}：${cfg.guiltLeanText(value, item)}（${value}/100）` };
      }),
      primaryGuiltLabel: this.aspirationGuiltLineLabel(primaryGuiltId),
      psychCategories: cfg.psychPreferenceCategories.map((category) => {
        const groups = cfg.psychCategoryGroups(category).map((group) => ({
          groupLabel: group.label,
          tags: (() => {
            const direct = psychPreferences.selected?.[group.id];
            if (Array.isArray(direct) && direct.length) return direct;
            const legacy = [];
            ['normal', 'acg'].forEach((laneId) => {
              const old = psychPreferences.selected?.[`${laneId}:${group.id}`];
              if (Array.isArray(old)) legacy.push(...old);
            });
            return [...new Set(legacy)];
          })(),
        })).filter((item) => item.tags.length);
        return { ...category, groups };
      }).filter((category) => category.groups.length),
      horizons: cfg.directionHorizons.map((horizon) => {
        const weights = directions[horizon.key] || cfg.defaultDirectionWeights();
        const dominant = cfg.dominantDirection(weights);
        const parts = cfg.directionChoices.map((choice) => `${choice.label}${weights[choice.id] ?? 50}`);
        return {
          ...horizon,
          summary: `${parts.join(' / ')}；主轴偏${dominant?.label || '均衡'}`,
          choices: cfg.directionChoices.map((choice) => {
            const value = weights[choice.id] ?? 50;
            return { ...choice, value, summary: `${choice.label}：${cfg.directionLeanText(value, choice)}（${value}/100）` };
          }),
        };
      }),
      goals: data.goals || {},
      summary: data.summary || data.goals?.summary || '',
    };
  },

  async confirmPlayerAspiration() {
    if (this.aspirationBusy) return;
    const draft = this.aspirationDraft || {};
    if (!draft.alignment) {
      this.aspirationError = '请先完成价值立场选择。';
      this.aspirationStep = 1;
      return;
    }
    const cfg = window.GameModules.playerAspirationConfig;
    const psychMin = this.aspirationPsychMinSelect?.() ?? cfg.psychMinSelectPerGroup ?? 3;
    const incompletePsych = (cfg.psychPreferenceCategories || []).find(
      (category) => this.aspirationPsychIncompleteGroups(category).length > 0,
    );
    if (incompletePsych) {
      const pending = this.aspirationPsychIncompleteGroups(incompletePsych).map((group) => group.label).join('、');
      this.aspirationSetupOpen = true;
      this.aspirationStep = 5;
      this.aspirationPsychStep = Math.max(1, (cfg.psychPreferenceCategories || []).findIndex((item) => item.id === incompletePsych.id) + 1);
      this.aspirationError = `请先在「${incompletePsych.label}」的每个小类各选满 ${psychMin} 个标签；未完成：${pending}`;
      this.aspirationBusy = false;
      return;
    }
    this.aspirationBusy = true;
    this.aspirationSetupOpen = false;
    this.setHomeLoadProgress?.(2, '正在保存人生取向…');
    await this.yieldHomeLoadUi?.();
    try {
      const goals = this.normalizeAspirationGoals(this.aspirationGoalDraft || {});
      const primaryGuiltId = this.aspirationPrimaryGuiltLineId(draft.guiltAxes);
      const guilt = cfg.guiltLineById(primaryGuiltId);
      this.playerAspiration = {
        alignment: draft.alignment,
        alignmentLabel: this.aspirationAlignmentLabel(draft.alignment),
        rationality: draft.rationality ?? 50,
        axes: { ...(draft.axes || cfg.defaultAxes()) },
        guiltAxes: { ...(draft.guiltAxes || cfg.defaultGuiltAxes()) },
        guiltLine: primaryGuiltId,
        guiltLabel: this.aspirationGuiltLineLabel(primaryGuiltId),
        guiltQuote: guilt?.quote || '',
        psychPreferences: JSON.parse(JSON.stringify(draft.psychPreferences || cfg.defaultPsychPreferences())),
        essentialPreferenceLayers: window.GameModules.playerAspirationPreferenceLayers?.buildFromAspirationDraft?.(draft),
        portraitSummary: String(this.aspirationSummaryDraft?.portrait || '').trim(),
        directions: JSON.parse(JSON.stringify(draft.directions || cfg.defaultDirections())),
        goals,
        goalSystem: window.GameModules.characterGoalSystem?.fromAspirationGoals?.(goals) || null,
        summary: goals.summary,
        completedAt: new Date().toISOString(),
      };
      this.realWorldQuest = goals.short || this.realWorldQuest;
      this.quest = goals.short || this.quest;
      await this.syncEssentialPreferenceLayersToPlayerState?.();
      const playerState = this.playerIdentityState?.();
      if (playerState?.profile && this.playerAspiration.goalSystem) {
        playerState.profile.goalSystem = window.GameModules.characterGoalSystem.normalize(this.playerAspiration.goalSystem);
        await window.GameModules.sqliteSave?.saveCharacterState?.(playerState);
        this.rpgStates = { ...(this.rpgStates || {}), [playerState.id]: playerState };
      }
      await this.syncPlayerProfileLexicon?.();
      await this.save?.();
      this.aspirationError = '';
      await this.enterPlayingFromSetup?.();
    } catch (err) {
      console.error('[人生取向] 确认失败:', err.message, err.stack);
      this.clearHomeLoadProgress?.();
      this.aspirationSetupOpen = true;
      this.aspirationError = err.message || '保存人生取向失败';
    } finally {
      this.aspirationBusy = false;
    }
  },
};

