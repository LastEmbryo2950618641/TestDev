window.GameModules = window.GameModules || {};
window.GameModules.playerSetupActions = window.GameModules.playerSetupActions || {};
Object.assign(window.GameModules.playerSetupActions, {
  defaultProfileData() {
    const text = window.GameModules.inlineMd?.defaultExistingProfile || '';
    if (!text.trim()) throw new Error('默认资料快照未加载：需要 config/default-existing-profile.js');
    const data = this.parseDefaultProfileMd(text);
    if (!data?.name || !data?.birthday) throw new Error('默认资料快照缺少 姓名 或 生日');
    return { ...data, source: 'config/default-existing-profile.js' };
  },

  parseDefaultProfileMd(text = '') {
    const map = {};
    const relationshipEntries = [];
    let currentRelationship = null;
    String(text).split('\n').forEach((line) => {
      const relationItem = line.match(/^\s*-\s*关系名\s*[：:]\s*(.+?)\s*$/);
      if (relationItem) {
        currentRelationship = { relation: relationItem[1].trim(), name: '', detail: '' };
        relationshipEntries.push(currentRelationship);
        return;
      }
      const relationField = line.match(/^\s*(姓名|设定)\s*[：:]\s*(.+?)\s*$/);
      if (currentRelationship && relationField) {
        if (relationField[1] === '姓名') currentRelationship.name = relationField[2].trim();
        if (relationField[1] === '设定') currentRelationship.detail = relationField[2].trim();
        return;
      }
      const match = line.match(/^\s*([^：:]+)\s*[：:]\s*(.*?)\s*$/);
      if (match) {
        currentRelationship = null;
        map[match[1].trim()] = match[2].trim();
      }
    });
    const relationships = relationshipEntries.length ? relationshipEntries.map((entry) => `${entry.relation}：${entry.name}`).join('；') : (map['人际关系'] || '');
    return {
      name: map['姓名'] || '',
      gender: map['性别'] || '',
      birthday: map['生日'] || '',
      city: map['具体地址'] || map['地址'] || '',
      currentLocation: map['当前位置'] || '',
      dailyRole: map['现实身份'] || '',
      livingStatus: map['居住状态'] || '',
      parents: map['父母信息'] || '',
      parentDeathCause: map['父母去世原因'] || '',
      wealthTier: map['财富等级'] || '中产',
      wealthAmount: map['当前财富'] || '',
      wealthSource: map['财富来源'] || '',
      relationships,
      relationshipEntries: this.normalizeRelationshipEntries ? this.normalizeRelationshipEntries(relationshipEntries, relationships) : relationshipEntries,
      notes: map['备注'] || '',
    };
  },

  async defaultExistingAccountProfile() {
    const data = await this.defaultProfileData();
    console.log('[玩家身份] 默认资料来源:', data.source, data.name, data.birthday);
    return { ...data, ...this.normalizePlayerWealth?.(data), age: this.playerAgeFromBirthday(data.birthday), initializedAt: new Date().toISOString() };
  },

  async debugDefaultProfileSource() {
    const data = await this.defaultProfileData();
    const report = { source: data.source, name: data.name, birthday: data.birthday };
    console.log('[玩家身份] 默认资料读取自检:', report);
    return report;
  },

  async chooseExistingAccountSetup() {
    if (this.profileSetupBusy) return;
    this.profileSetupBusy = true;
    try {
      this.setupError = '';
      this.playerProfile = { ...this.playerProfile, ...await this.defaultExistingAccountProfile() };
      this.playerProfile.relationshipEntries = this.normalizeRelationshipEntries(this.playerProfile.relationshipEntries, this.playerProfile.relationships);
      await this.initPredefinedRoleCards?.();
      this.roleCardSetup.usePredefinedPlayerCard = true;
      this.applySelectedPlayerRoleCard?.();
      this.existingProfileExpanded = false;
      this.phoneActivationChoice = 'existing';
    } catch (err) {
      console.error('[玩家身份] 已有账号默认资料读取失败:', err.message, err.stack);
      this.setupError = err.message || '已有账号默认资料读取失败';
    } finally {
      this.profileSetupBusy = false;
    }
  },

  async chooseNewAccountSetup() {
    if (this.profileSetupBusy) return;
    this.profileSetupBusy = true;
    try {
      this.setupError = '';
      if (this.roleCardSetup) this.roleCardSetup.usePredefinedPlayerCard = false;
      const example = await this.defaultExistingAccountProfile();
      this.playerProfile = {
        ...this.playerProfile,
        name: this.playerProfile.name || example.name || '',
        gender: this.playerProfile.gender || example.gender || '',
        birthday: this.playerProfile.birthday || example.birthday || '',
        city: this.playerProfile.city || example.city || '',
        currentLocation: this.playerProfile.currentLocation || example.currentLocation || '',
        dailyRole: this.playerProfile.dailyRole || example.dailyRole || '',
        livingStatus: this.playerProfile.livingStatus || example.livingStatus || '',
        ...this.normalizePlayerWealth?.(this.playerProfile),
        parents: this.playerProfile.parents || example.parents || '',
        parentDeathCause: this.playerProfile.parentDeathCause || example.parentDeathCause || '',
        relationships: this.playerProfile.relationships || example.relationships || '',
        relationshipEntries: this.playerProfile.relationshipEntries?.length ? this.playerProfile.relationshipEntries : example.relationshipEntries || [],
        notes: this.playerProfile.notes || example.notes || '',
      };
      this.playerProfile.relationshipEntries = this.normalizeRelationshipEntries(this.playerProfile.relationshipEntries, this.playerProfile.relationships);
      this.existingProfileExpanded = true;
      this.phoneActivationChoice = 'new';
    } catch (err) {
      console.error('[玩家身份] 新账号默认资料读取失败:', err.message, err.stack);
      this.setupError = err.message || '新账号默认资料读取失败';
    } finally {
      this.profileSetupBusy = false;
    }
  },

  isCompletePlayerCurrentLocation(value = '', profile = {}) {
    const tool = window.GameModules.currentLocationField;
    const parts = tool?.parts ? tool.parts(value) : String(value || '').split('·').map((part) => part.trim()).filter(Boolean);
    if (parts.length < 5) return false;
    const mapNode = String(parts[3] || '').trim();
    if (!mapNode || /未知|某处|某地|附近|一处|普通/u.test(mapNode)) return false;
    const name = String(profile?.name || '').trim();
    if (name && mapNode.includes(name)) return false;
    return !/房间|卧室|客厅|厨房|卫生间|书房|床位/u.test(mapNode);
  },

  roleCardCurrentLocationContext(card = {}, profile = {}) {
    const pick = (source, keys) => keys.reduce((out, key) => {
      const value = source?.[key];
      if (value !== undefined && value !== null && value !== '') out[key] = value;
      return out;
    }, {});
    return {
      playerProfile: pick(profile, ['name', 'gender', 'birthday', 'age', 'city', 'dailyRole', 'livingStatus', 'parents', 'relationships', 'relationshipEntries', 'notes', 'refinedRole', 'workplace', 'position', 'refinedLivingStatus', 'worldbuildingNote']),
      roleCard: pick(card, ['id', 'name', 'gender', 'birthday', 'age', 'role', 'job', 'detail', 'relationships', 'appearance', 'personality', 'preferences', 'factions', 'memberships', 'items', 'wearing', 'notes', 'worldTag']),
    };
  },

  setCurrentLocationFillProgress(patch = {}) {
    this.currentLocationFillState = {
      open: true,
      status: 'running',
      percent: 0,
      step: '',
      detail: '',
      currentLocation: '',
      error: '',
      startedAt: Date.now(),
      finishedAt: 0,
      ...(this.currentLocationFillState || {}),
      ...patch,
    };
  },

  closeCurrentLocationFillProgress(delayMs = 0) {
    const close = () => {
      this.currentLocationFillState = { ...(this.currentLocationFillState || {}), open: false };
    };
    if (delayMs > 0) setTimeout(close, delayMs);
    else close();
  },

  async confirmPhoneActivationSetup() {
    if (this.phoneActivationChoice === 'existing') {
      this.setCurrentLocationFillProgress?.({
        status: 'running',
        percent: 5,
        step: '准备获取当前位置',
        detail: '确认后首先处理玩家角色卡当前位置，只补 currentLocation。',
        currentLocation: '',
        error: '',
        startedAt: Date.now(),
        finishedAt: 0,
      });
      await this.completePredefinedPlayerSetup();
      return;
    }
    await this.completePlayerSetup();
  },

  async fillMissingPlayerCurrentLocationFromCard() {
    const p = this.playerProfile || {};
    const card = this.selectedPlayerRoleCard?.();
    this.setCurrentLocationFillProgress({
      status: 'running',
      percent: 10,
      step: '检查当前位置字段',
      detail: '正在检查玩家角色卡 currentLocation，缺失时只请求 AI 获取正式地图地点。',
      currentLocation: '',
      error: '',
      cardName: card?.name || p.name || '',
    });
    if (this.isCompletePlayerCurrentLocation(p.currentLocation, p)) {
      this.setCurrentLocationFillProgress({
        status: 'done',
        percent: 100,
        step: '当前位置已存在',
        detail: '玩家角色卡已有合格 currentLocation，已直接作为电子地图根节点来源。',
        currentLocation: p.currentLocation,
        finishedAt: Date.now(),
      });
      return p.currentLocation;
    }
    const providerId = window.GameModules.aiProvider?.currentProviderId?.() || 'deepseek';
    const provider = window.GameModules.aiProvider?.currentProvider?.();
    if (!provider || typeof provider.complete !== 'function') {
      this.setCurrentLocationFillProgress({
        status: 'error',
        percent: 10,
        step: 'AI 未就绪',
        detail: '无法请求 AI 补全当前位置。',
        error: `文本 AI 提供方 ${providerId} 未就绪`,
        finishedAt: Date.now(),
      });
      throw new Error(`玩家角色卡缺少当前位置，且文本 AI 提供方 ${providerId} 未就绪，无法进入游戏`);
    }
    const context = this.roleCardCurrentLocationContext(card || {}, p);
    const prompt = [
      '你是严格的结构化数据生成器，只负责根据玩家角色卡上下文补全进入游戏时的当前位置。',
      '只输出合法 JSON 对象，不输出 Markdown、解释或额外文字。',
      'JSON Schema：{"type":"object","required":["currentLocation"],"additionalProperties":false,"properties":{"currentLocation":{"type":"string"},"refinedCity":{"type":"string"}}}',
      'currentLocation 格式固定为：势力·势力层级1·势力层级2·地点·地点内位置。',
      '第4段“地点”必须是正式地图地点名，可作为电子地图节点名，例如“锦苑小区3栋”“星河云栈科技园B座”“青石镇东市”“王都白塔宫”。',
      '第5段“地点内位置”才允许写门牌、房间、工位、宿舍床位、宫殿内殿等内部位置。',
      '不得把人物姓名拼进第4段地点；不得用“未知、某处、附近、普通地点”等模糊词。',
      '势力与层级必须是真实控制/管辖结构；现代现实可用国家/省级/区县级，异世界可用王国/行省/郡县/宗门等对应结构。',
      `玩家角色卡上下文：${JSON.stringify(context)}`,
    ].join('\n');
    let timeoutId = null;
    let data = null;
    try {
      this.setCurrentLocationFillProgress({
        percent: 35,
        step: '正在请求 AI 获取地点',
        detail: '只请求 currentLocation：势力·势力层级1·势力层级2·地点·地点内位置。',
      });
      data = await Promise.race([
        window.GameModules.jsonUtils.generateJsonWithRetry({ source: 'player-current-location-fill', promptId: 'player-current-location-fill', model: this.modelId, timeoutMs: 60000, prompt, format: prompt, max: 2 }),
        new Promise((_, reject) => { timeoutId = setTimeout(() => reject(new Error('玩家当前位置补全超时')), 60000); }),
      ]);
    } catch (err) {
      this.setCurrentLocationFillProgress({
        status: 'error',
        percent: 35,
        step: '获取当前位置失败',
        detail: 'AI 未能返回玩家当前位置。',
        error: err.message || '获取当前位置失败',
        finishedAt: Date.now(),
      });
      throw err;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
    const currentLocation = window.GameModules.currentLocationField?.normalize?.(data?.currentLocation) || String(data?.currentLocation || '').trim().slice(0, 160);
    this.setCurrentLocationFillProgress({
      percent: 80,
      step: '校验当前位置格式',
      detail: currentLocation ? `AI 已返回：${currentLocation}` : 'AI 未返回有效当前位置，正在校验失败原因。',
      currentLocation,
    });
    if (!this.isCompletePlayerCurrentLocation(currentLocation, { ...p, name: p.name || card?.name })) {
      this.setCurrentLocationFillProgress({
        status: 'error',
        percent: 80,
        step: '当前位置格式不合格',
        error: `AI返回的玩家当前位置格式不合格：${currentLocation || '空'}`,
        finishedAt: Date.now(),
      });
      throw new Error(`AI返回的玩家当前位置格式不合格：${currentLocation || '空'}`);
    }
    this.playerProfile = { ...this.playerProfile, currentLocation };
    if (data?.refinedCity && !this.playerProfile.refinedCity) this.playerProfile.refinedCity = String(data.refinedCity || '').trim().slice(0, 160);
    if (card) {
      card.currentLocation = currentLocation;
      if (data?.refinedCity && !card.refinedCity) card.refinedCity = this.playerProfile.refinedCity || String(data.refinedCity || '').trim().slice(0, 160);
      if (card.profile && typeof card.profile === 'object') {
        card.profile.currentLocation = currentLocation;
        if (data?.refinedCity && !card.profile.refinedCity) card.profile.refinedCity = this.playerProfile.refinedCity || String(data.refinedCity || '').trim().slice(0, 160);
      }
    }
    this.setCurrentLocationFillProgress({
      status: 'done',
      percent: 100,
      step: '当前位置已写入',
      detail: '已把 currentLocation 写入玩家角色卡，并作为电子地图根节点来源。',
      currentLocation,
      finishedAt: Date.now(),
    });
    return currentLocation;
  },

  async syncPlayerCurrentLocationToIdentityState(currentLocation = '') {
    const location = window.GameModules.currentLocationField?.normalize?.(currentLocation || this.playerProfile?.currentLocation || '') || String(currentLocation || this.playerProfile?.currentLocation || '').trim();
    if (!location) return false;
    const state = this.rpgStates?.['player-self'] || window.GameModules.characterStateStore?.get?.('player-self') || null;
    if (!state) return false;
    state.profile = { ...(state.profile || {}), currentLocation: location, isPlayer: true };
    state.values = state.values || {};
    if (window.GameModules.currentLocationField?.stateValue) {
      state.values.current_location = window.GameModules.currentLocationField.stateValue(state.profile, this, '玩家激活当前位置写入身份信息。');
    }
    this.rpgStates = { ...(this.rpgStates || {}), 'player-self': state };
    await window.GameModules.characterStateStore?.save?.(state);
    return true;
  },

  async completePredefinedPlayerSetup() {
    if (this.profileSetupBusy) return;
    const p = this.playerProfile || {}, name = (p.name || this.playerName || '').trim(), birthday = (p.birthday || '').trim();
    if (!name || !birthday) return;
    this.setCurrentLocationFillProgress?.({
      status: 'running',
      percent: 5,
      step: '准备获取当前位置',
      detail: '确认后首先处理玩家角色卡当前位置，只补 currentLocation。',
      currentLocation: '',
      error: '',
      startedAt: Date.now(),
      finishedAt: 0,
    });
    this.profileSetupBusy = true;
    try {
      this.setupError = '';
      this.syncRelationshipTextFromEntries?.();
      const age = this.playerAgeFromBirthday(birthday);
      this.playerProfile = { ...p, name, birthday, age, refinedCity: p.refinedCity || p.city, currentLocation: p.currentLocation || '', refinedRole: p.refinedRole || p.dailyRole || `${age || ''}岁现代都市居民`, refinedLivingStatus: p.refinedLivingStatus || p.livingStatus, parentStatus: p.parentStatus || p.parents || '父母已故', parentDeathCause: p.parentDeathCause || '', initializedAt: p.initializedAt || new Date().toISOString() };
      await this.fillMissingPlayerCurrentLocationFromCard();
      this.phoneFixedTime = new Date(this.playerProfile.initializedAt).getTime();
      this.refreshPhoneClockLabels?.();
      await this.syncPlayerProfileLexicon?.();
      this.playerName = name;
      this.phoneActivationChoice = '';
      this.phoneSetupDone = true;
      this.homeScreenView = 'playing';
      this.started = false;
      this.desktopUnlocked = false;
      this.aspirationSetupOpen = false;
      this.selectedWork = String(window.GameModules.realWorld2026?.label || this.selectedWork || '2026 现代都市现实世界').trim();
      this.selectedCharacterId = 'player-self';
      this.identityTargetId = 'player-self';
      this.rpgPanelCharacterId = 'player-self';
      await window.GameModules.predefinedRoleCards.saveSelectedRoleCardStates(this);
      await this.syncPlayerCurrentLocationToIdentityState?.(this.playerProfile.currentLocation);
      await this.syncKnownProfessionsFromProfile?.(this.playerProfile.knownProfessions);
      await this.save?.();
      if (this.currentLocationFillState?.status === 'done') this.closeCurrentLocationFillProgress(450);
    } catch (err) {
      console.error('[玩家身份] 激活失败:', err.code, err.message, err.stack);
      this.setupError = err.message || '激活失败';
      this.homeScreenView = 'new-game';
      this.phoneActivationChoice = 'existing';
      this.phoneSetupDone = false;
    } finally {
      this.profileSetupBusy = false;
    }
  },
});
