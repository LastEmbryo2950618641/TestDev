window.GameModules = window.GameModules || {};
window.GameModules.playerIdentityActions = {
  playerCharacterBase() {
    const p = this.playerProfile || {};
    const world = window.GameModules.realWorld2026 || {};
    const name = p.name || this.playerName || '手机主人';
    const city = p.refinedCity || p.city || world.defaults?.city || '未设定城市';
    const role = p.refinedRole || p.dailyRole || world.defaults?.dailyRole || '现代都市居民';
    const living = p.refinedLivingStatus || p.livingStatus || world.defaults?.livingStatus || '生活状态未设定';
    const parents = p.parentStatus || p.parents || '父母已故';
    const workplace = p.workplace || window.GameModules.socialPosition?.workplace(role, city) || city;
    const position = p.position || window.GameModules.socialPosition?.position(role) || living;
    const deathCause = p.parentDeathCause || '父母去世原因未记录';
    const relations = p.relationships || '人际关系由玩家自行设定，当前未填写';
    const notes = [p.worldbuildingNote, p.notes].filter(Boolean).join('；') || '暂无补充设定';
    return {
      id: 'player-self', name, age: p.age || '', birthday: p.birthday || '', gender: p.gender || '', work: world.label || '2026 现代都市现实世界', role, job: role,
      rank: position, faction: workplace, city, workplace, position, importance: 'main', isPlayer: true,
      items: p.items || [], wearing: p.wearing || [],
      detail: `性别：${p.gender || '未知'}；年龄：${p.age || '未知'}；生日：${p.birthday || '未知'}；具体地址：${city}；势力地位：${workplace}/${position}；社群角色：${city}/居民；居住：${living}；父母：${parents}；去世原因：${deathCause}；关系：${relations}；备注：${notes}`,
      personality: notes,
      skills: [
        { name: '手机操作', desc: '能够使用智能手机完成通讯、检索、拍摄、设置、应用切换和信息处理等操作。', reason: '玩家通过新手机激活和现实应用入口获得该基础操作能力。' },
        { name: '现实观察', desc: '通过细节、环境变化和他人反应判断局势的能力。', reason: '玩家在现实身份与环境交互中需要观察地点、联系人和系统反馈。' },
      ],
    };
  },
  playerDisplayCharacter() {
    const saved = this.playerIdentityState?.()?.profile;
    if (saved?.roleCard) return saved;
    return { ...this.playerCharacterBase(), name: this.playerName || this.playerProfile?.name || '手机主人', pendingAiProfile: true };
  },
  playerCharacter() {
    const saved = this.playerIdentityState?.()?.profile;
    if (!saved?.roleCard) throw new Error('玩家本人个人资料尚未由AI生成，不能读取本地兜底模板。');
    window.GameModules.characterProfile.requireRpgFieldReasons(saved, saved.worldAttributes, saved.name || '玩家本人');
    return saved;
  },
  playerIdentityState() { return this.rpgStates['player-self'] || null; },
  identityTargetState() { return this.rpgStates[this.identityTargetId || 'player-self'] || null; },
  identityTargetProfile() {
    const id = this.identityTargetId || 'player-self';
    if (id === 'player-self') return this.playerDisplayCharacter();
    return this.identityTargetState()?.profile || (id === this.character.id ? this.character : { name: '未知角色', work: '未知世界', role: '身份未知', detail: '暂无角色卡。', personality: '', pendingAiProfile: true });
  },
  essentialPreferenceLayersForState(state = null) {
    const prefTool = window.GameModules.playerAspirationPreferenceLayers;
    if (!prefTool) return null;
    const resolved = state || this.identityTargetState();
    const id = resolved?.id || this.identityTargetId || 'player-self';
    if (id === 'player-self') {
      const fromAspiration = this.playerAspiration?.essentialPreferenceLayers
        || prefTool.buildFromPlayerAspiration?.(this.playerAspiration);
      if (fromAspiration?.layer1) return prefTool.normalizeLayers(fromAspiration);
      const profile = resolved?.profile;
      if (profile) return prefTool.ensureOnProfile(profile);
      return null;
    }
    const profile = resolved?.profile || (id === (this.identityTargetId || '') ? this.identityTargetProfile() : null);
    if (!profile || typeof profile !== 'object') return null;
    return prefTool.ensureOnProfile(profile);
  },

  essentialPreferenceViewFromPlayerAspiration(view = null) {
    const data = view || this.playerAspirationView?.();
    if (!data) return null;
    return {
      alignmentLabel: data.alignmentLabel,
      rationality: data.rationality,
      rationalityLabel: data.rationalityLabel,
      axes: data.axes || [],
      guiltLines: data.guiltLines || [],
      psychGroups: (data.psychCategories || []).flatMap((category) => category.groups || []),
      footnote: '来自人生取向向导的选择；本质偏好五层固化后推演不可修改。',
    };
  },

  essentialPreferenceViewForState(state = null) {
    const resolved = state || this.identityTargetState();
    const id = resolved?.id || this.identityTargetId || 'player-self';
    if (id === 'player-self' && this.hasPlayerAspiration?.()) {
      return this.essentialPreferenceViewFromPlayerAspiration?.();
    }
    const prefTool = window.GameModules.playerAspirationPreferenceLayers;
    const layers = this.essentialPreferenceLayersForState?.(resolved);
    const view = prefTool?.viewFromLayers?.(layers);
    if (view) view.footnote = '角色本质偏好五层在角色卡生成时固化，推演不可修改。';
    return view || null;
  },

  identityEssentialPreferenceLayers() {
    return this.essentialPreferenceLayersForState?.(this.identityTargetState());
  },

  identityEssentialPreferenceView() {
    return this.essentialPreferenceViewForState?.(this.identityTargetState());
  },

  identityTargetFields() {
    const p = this.identityTargetProfile();
    const worldTag = p.work || this.identityTargetState()?.worldTag || '原创世界';
    const reasonFor = this.roleCardReasonGetter(p);
    const row = (key, label, value, desc, extra = {}) => ({ key: `id-${this.identityTargetId}-${key}`, stateId: this.identityTargetId || 'player-self', label, kind: '角色卡', value: value || '未记录', raw: value || '', desc, reason: reasonFor(label, key), worldTag, targetType: '角色', commonField: true, ...extra });
    const fields = [
      row('name', '姓名', p.name, '角色卡固化姓名。'),
      row('work', '所属世界', worldTag, '角色出身作品或世界。'),
      row('role', '身份', p.role, '角色卡固化身份。'),
      row('appearance', '外貌', p.appearance, '角色卡固化外貌。'),
      row('preferences', '喜好', p.preferences, '角色稳定喜好和穿着偏好。'),
      row('personality', '性格', p.personality, '角色卡固化性格。'),
      row('job', '职业', p.job, '角色真实职业、训练身份或社会功能。'),
    ];
    const prefTool = window.GameModules.playerAspirationPreferenceLayers;
    const layerSource = this.essentialPreferenceLayersForState?.(this.identityTargetState());
    prefTool?.toLines?.(layerSource).forEach((line, index) => {
      const label = line.split(':')[0]?.trim() || '本质偏好';
      const desc = (this.identityTargetId || 'player-self') === 'player-self'
        ? '玩家本质偏好层；仅玩家可在人生取向向导中修改，推演不可更改。'
        : '角色本质偏好五层；角色卡固化后永久不可被推演修改。';
      fields.push(row(`pref-${index}`, label, line, desc, { profileGroup: '本质偏好', immutable: true }));
    });
    if ((this.identityTargetId || 'player-self') === 'player-self') {
      fields.push(...(this.playerAspirationLexiconFields?.().filter((item) => !prefTool?.isImmutableFieldName?.(item.label)) || []));
    }
    return fields;
  },

  playerIdentitySummary() {
    const v = this.playerIdentityState()?.values || {};
    if (!v.level) return '玩家本人属性尚未生成。';
    const names = (list) => (list || []).map((item) => item?.slot ? `${item.slot}:${item.name || '未穿戴'}` : (item?.name || item)).slice(0, 16).join('、') || '无';
    return `性别${this.playerProfile.gender || '未知'}｜年龄${v.age ?? this.playerProfile.age ?? '未知'}｜等级${v.level}｜经验${v.exp?.current || 0}/${v.exp?.next || 'max'}｜力量${v.strength}｜敏捷${v.agility}｜体质${v.constitution}｜智力${v.intelligence}｜感知${v.perception}｜意志${v.willpower}｜魅力${v.charisma}｜物品${names(v.items)}｜穿着${names(v.wearing)}`;
  },
  playerMemory() { return window.GameModules.characterMemory.ensure('player-self'); },
  playerMemoryItems(kind) {
    const memory = this.playerMemory();
    if (kind === 'shortTerm') return [...(memory.shortTerm.recent || []), ...(memory.shortTerm.summarized || [])];
    if (kind === 'longTerm') return [...(memory.longTerm.vivid || []), ...(memory.longTerm.permanent || [])];
    return [];
  },
  playerMemoryStatus(kind) {
    const memory = this.playerMemory();
    const m = window.GameModules.characterMemory;
    if (kind === 'shortTerm') return [m.statLine('刚发生记忆', m.stats(memory.shortTerm.recent, m.limits.recent)), m.statLine('近发生记忆', m.stats(memory.shortTerm.summarized, m.limits.summarized)), m.statLine('遗忘区', m.stats(memory.shortTerm.forgotten, m.limits.forgotten))].join('｜');
    return [m.statLine('难以忘记', m.stats(memory.longTerm.vivid, m.limits.vivid)), m.statLine('不可忘记', m.stats(memory.longTerm.permanent, m.limits.permanent))].join('｜');
  },
  realWorldMemoryTargetId() {
    return this.sharedControlState?.()?.id || 'player-self';
  },
  realWorldMemory() {
    return window.GameModules.characterMemory.ensure(this.realWorldMemoryTargetId());
  },
  realWorldMemoryShortLabel() {
    return ({ recent: '刚发生记忆', summarized: '近发生记忆', forgotten: '遗忘区' })[this.realWorldMemoryShortTab] || '刚发生记忆';
  },
  realWorldMemoryLongLabel() {
    return ({ vivid: '难以忘记', permanent: '不可忘记' })[this.realWorldMemoryLongTab] || '难以忘记';
  },
  realWorldMemoryItems(kind) {
    const memory = this.realWorldMemory();
    if (kind === 'shortTerm') return memory.shortTerm?.[this.realWorldMemoryShortTab || 'recent'] || [];
    if (kind === 'longTerm') return memory.longTerm?.[this.realWorldMemoryLongTab || 'vivid'] || [];
    return [];
  },
  realWorldMemoryStatus(kind) {
    const m = window.GameModules.characterMemory;
    if (kind === 'shortTerm') return m.statLine(this.realWorldMemoryShortLabel(), m.stats(this.realWorldMemoryItems('shortTerm'), m.limits[this.realWorldMemoryShortTab || 'recent'] || m.limits.recent));
    return m.statLine(this.realWorldMemoryLongLabel(), m.stats(this.realWorldMemoryItems('longTerm'), m.limits[this.realWorldMemoryLongTab || 'vivid'] || m.limits.vivid));
  },
  async addPlayerManualMemory() {
    const text = this.realWorldMemoryInput.trim();
    if (!text) return;
    const realStore = { ...this, sceneTitle: this.realWorldSceneTitle || '现实世界' };
    await window.GameModules.characterMemory.addManual(this.realWorldMemoryTargetId(), text, realStore);
    this.realWorldMemoryInput = '';
  },
  async searchPlayerMemoryArchive() {
    const query = this.realWorldMemoryArchiveQuery.trim();
    if (!query) return;
    this.realWorldMemoryArchiveResults = await window.GameModules.characterMemory.queryArchive(this.realWorldMemoryTargetId(), query);
  },
  async ensurePlayerRpgState(refresh = false, forceRoleCardRegenerate = false, retrySource = null) {
    if (!window.GameModules.sqliteSave.db) return this.playerIdentityState();
    const existing = this.playerIdentityState();
    if (!refresh && existing) {
      let changed = false;
      const expectedName = this.playerProfile?.name || this.playerName || '';
      if (expectedName && existing.profile?.name !== expectedName) {
        existing.name = expectedName;
        existing.profile = { ...(existing.profile || {}), id: 'player-self', name: expectedName, isPlayer: true };
        changed = true;
      }
      try {
        window.GameModules.characterProfile.requireRpgFieldReasons(existing.profile, existing.profile?.worldAttributes, existing.profile?.name || '玩家本人');
      } catch (err) {
        console.warn('[玩家身份] 已保存个人资料缺少AI变化原因，拒绝使用本地兜底:', err.message, err.stack);
        this.setupError = `玩家本人资料需要重新生成：${err.message || '缺少AI变化原因'}`;
        throw err;
      }
      if (window.GameModules.progression.ensureStateMechanics(existing, existing.profile)) changed = true;
      if (window.GameModules.initPromptRegistry?.ensureTemplateState?.('intimacyBody', existing)) changed = true;
      if (this.hasPlayerAspiration?.()) {
        const tool = window.GameModules.playerAspirationPreferenceLayers;
        const layers = tool?.buildFromPlayerAspiration?.(this.playerAspiration);
        if (layers?.layer1 && !existing.profile?.essentialPreferenceLayers?.layer1) {
          tool.applyToProfile(existing.profile, layers, { locked: true });
          changed = true;
        }
      }
      if (changed) await window.GameModules.sqliteSave.saveCharacterState(existing);
      return existing;
    }
    let character;
    if (this.roleCardSetup?.usePredefinedPlayerCard && window.GameModules.predefinedRoleCards) {
      const predefined = await window.GameModules.predefinedRoleCards.ensurePlayerState(this);
      if (predefined) return predefined;
    }
    try {
      const base = { ...this.playerCharacterBase(), ...(retrySource || {}), forceRoleCardRegenerate: forceRoleCardRegenerate || Boolean(retrySource?.forceRoleCardRegenerate) };
      const playerCard = {
        id: 'player-self',
        name: base.name || this.playerName || '玩家',
        type: '玩家卡',
        source: base,
        context: this.playerSetupSummary?.() || '玩家本人资料',
      };
      if ((this.roleCardLoadingState?.cards || []).some((card) => card.id === 'player-self')) {
        this.updateRoleCardLoading?.('player-self', { source: base, context: playerCard.context, status: 'running', startedAt: Date.now() });
      } else {
        this.startRoleCardLoadingBatch?.([playerCard]);
      }
      character = await window.GameModules.characterProfile.ensure(base, this, this.playerSetupSummary?.() || '玩家本人资料');
    } catch (err) {
      console.warn('[玩家身份] 个人资料生成失败，拒绝使用本地原因兜底:', err.code, err.message, err.stack);
      this.setupError = `玩家本人资料生成失败：${err.message || 'AI暂时不可用'}`;
      throw err;
    }
    character.id = 'player-self';
    character.name = this.playerProfile?.name || this.playerName || character.name;
    character.isPlayer = true;
    this.initFactionSystem?.();
    this.updateRoleCardLoadingStep?.('player-self', 'state', 'running', '', { done: 0, total: 1 });
    const state = await window.GameModules.rpgState.ensureCharacter(character, this);
    state.profile = character;
    state.note = character.detail;
    state.values.age = Number.isFinite(Number(character.age)) ? Number(character.age) : state.values.age;
    state.values.status_tags = ['玩家本人', '手机主人', character.work, character.role];
    if (!state.values.items?.length) state.values.items = character.items || [];
    window.GameModules.progression.syncInventoryFromProfile?.(state, character);
    state.values.factions = window.GameModules.socialPosition.playerItems({ ...this.playerProfile, workplace: character.workplace, position: character.position });
    state.values.force_positions = window.GameModules.socialPosition.playerForceItems({ ...this.playerProfile, workplace: character.workplace, position: character.position }, this);
    state.values.memberships = window.GameModules.socialPosition.membershipItems({ ...this.playerProfile, workplace: character.workplace, position: character.position }, this);
    window.GameModules.orgTerritory?.syncCharacterOrgMemberships?.(state, this);
    window.GameModules.progression.ensureStateMechanics(state, character);
    window.GameModules.initPromptRegistry?.ensureTemplateState?.('intimacyBody', state);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    await window.GameModules.sqliteSave.saveCharacterState(state);
    this.finishRoleCardLoading?.('player-self', state.profile || character);
    return state;
  },

  syncIdentityMetricNotes(state, profile) {
    if (!state?.metrics || !profile?.initialMetrics) return false;
    const before = JSON.stringify(state.metrics.notes || {});
    state.metrics.notes = state.metrics.notes || {};
    const sync = (items, values, keys, group) => (Array.isArray(items) ? items : []).forEach((item) => {
      if (!keys.includes(item?.key)) return;
      const value = window.GameModules.metrics.clamp(values?.[item.key] ?? item.value);
      const rawStatus = String(item.status || '').trim();
      const rawReason = String(item.reason || '').trim();
      const status = String(window.GameModules.metrics.valueExplanation(item.key, value, rawStatus, rawReason)).slice(0, 180);
      const sources = window.GameModules.characterProfile?.metricSources?.(item, '系统') || { 数值: '系统', 解释: '系统', 原因: '系统' };
      const noteKey = `${group}:${item.key}`;
      const previous = state.metrics.notes[noteKey] || {};
      const previousSources = previous.metricSources || {};
      if (previous.reason && previousSources.原因 === 'AI') return;
      state.metrics.notes[noteKey] = {
        stage: window.GameModules.metrics.stageFor(item.key, value),
        status,
        reason: rawReason.slice(0, 180),
        description: String(window.GameModules.metrics.descriptions[item.key] || item.key).slice(0, 120),
        metricSources: { 数值: sources.数值, 解释: sources.解释 === 'AI' && status === rawStatus ? 'AI' : '系统', 原因: sources.原因 === 'AI' && rawReason ? 'AI' : '系统' },
      };
    });
    sync(profile.initialMetrics.emotions, state.metrics.emotions, window.GameModules.metrics.emotionKeys, 'emotion');
    sync(profile.initialMetrics.playerFeelings, state.metrics.playerFeelings, window.GameModules.metrics.playerKeys, 'player');
    return before !== JSON.stringify(state.metrics.notes || {});
  },

  async ensureIdentityMetricSources(targetId = 'player-self') {
    if (!window.GameModules.sqliteSave?.db) return;
    const id = targetId || 'player-self';
    const state = this.rpgStates?.[id] || window.GameModules.sqliteSave.getCharacterState(id);
    const tool = window.GameModules.characterProfile;
    if (!state?.profile || !tool?.ensureInitialMetricSources) return;
    const before = JSON.stringify(state.profile.initialMetrics || {});
    const previousProfile = state.profile;
    const context = [state.profile.detail, state.profile.personality, state.note].filter(Boolean).join('；');
    try {
      state.profile = await tool.ensureInitialMetricSources(state.profile, state.profile, context, this);
      const profileChanged = before !== JSON.stringify(state.profile.initialMetrics || {});
      if (profileChanged) window.GameModules.rpgProfileMetrics?.rebase?.(state, state.profile, previousProfile);
      const notesChanged = this.syncIdentityMetricNotes(state, state.profile);
      if (!profileChanged && !notesChanged) return;
      state.id = state.id || id;
      await window.GameModules.sqliteSave.saveCharacterState(state);
      this.rpgStates = { ...(this.rpgStates || {}), [state.id]: state };
      if (id === this.character?.id) this.character = state.profile;
    } catch (err) {
      console.warn('[身份证] 角色数值来源检查失败:', err.code, err.message, err.stack);
    }
  },


};
