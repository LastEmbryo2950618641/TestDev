window.GameModules = window.GameModules || {};

window.GameModules.playerSetupActions = {
  playerProfileLexiconFields() {
    const p = this.playerProfile || {};
    const worldTag = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const row = (name, value, desc) => window.GameModules.playerProfileLexicon.row(name, value, desc, worldTag);
    return [
      row('所属世界', worldTag, '玩家当前所在的现实世界。'),
      row('姓名', p.name || this.playerName, '玩家登记的姓名或代号。'),
      row('性别', p.gender, '玩家登记的性别。'),
      row('生日', p.birthday, '玩家登记生日，用于计算年龄与现实身份。'),
      row('年龄', p.age ? `${p.age}岁` : '', '由生日按2026-06-12计算得到。'),
      row('具体地址', p.refinedCity || p.city, '玩家当前登记住址。'),
      row('现实身份', p.refinedRole || p.dailyRole, '玩家在2026现实世界中的日常身份。'),
      row('势力地位', [p.workplace, p.position].filter(Boolean).join(' / '), '玩家当前工作、学习或组织势力及其内部地位。'),
      row('社群角色', [p.refinedCity || p.city, '居民'].filter(Boolean).join(' / '), '玩家当前居住社群及其中承担的社会角色。'),
      row('居住状态', p.refinedLivingStatus || p.livingStatus, '玩家当前居住与生活状态。'),
      row('父母状态', p.parentStatus || p.parents || '父母已故', '玩家父母当前状态。'),
      row('父母去世原因', p.parentDeathCause || '待生成', '父母已故时的入库死因。'),
      row('人际关系', p.relationships || '由玩家自行设定，暂无补充', '玩家明确填写的人际关系。'),
      row('世界观补全', p.worldbuildingNote || '暂无', 'AI围绕玩家资料补全的现实背景。'),
      row('备注', p.notes || '无', '玩家补充设定。'),
    ];
  },

  playerSetupSummary() {
    return this.playerProfileLexiconFields().map((x) => `${x.label}：${x.value}`).join('\n');
  },

  async defaultExistingAccountProfile() {
    let data = window.GameModules.defaultExistingProfile;
    if (!data) {
      const res = await fetch('./config/default-existing-profile.json');
      if (!res.ok) throw new Error(`已有账号默认资料读取失败：${res.status}`);
      data = await res.json();
    }
    if (!data?.name || !data?.birthday) throw new Error('已有账号默认资料缺少 name 或 birthday');
    return { ...data, age: this.playerAgeFromBirthday(data.birthday), initializedAt: new Date().toISOString() };
  },

  async chooseExistingAccountSetup() {
    if (this.profileSetupBusy) return;
    this.profileSetupBusy = true;
    try {
      this.setupError = '';
      this.playerProfile = { ...this.playerProfile, ...await this.defaultExistingAccountProfile() };
      this.existingProfileExpanded = false;
      this.phoneActivationChoice = 'existing';
    } catch (err) {
      console.error('[玩家身份] 已有账号默认资料读取失败:', err.message, err.stack);
      this.setupError = err.message || '已有账号默认资料读取失败';
    } finally {
      this.profileSetupBusy = false;
    }
  },

  chooseNewAccountSetup() {
    this.existingProfileExpanded = true;
    this.phoneActivationChoice = 'new';
  },

  backActivationChoice() {
    this.phoneActivationChoice = '';
  },

  async useExistingAccountSetup() {
    await this.completePlayerSetup();
  },

  playerAgeFromBirthday(birthday) {
    const birth = new Date(`${birthday}T00:00:00`);
    const now = new Date('2026-06-12T00:00:00');
    if (Number.isNaN(birth.getTime())) return '';
    let age = now.getFullYear() - birth.getFullYear();
    const passed = now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
    if (!passed) age -= 1;
    return Math.max(0, age);
  },

  async completePlayerSetup(options = {}) {
    if (this.profileSetupBusy) return;
    const name = (this.playerProfile.name || this.playerName || '').trim();
    const birthday = (this.playerProfile.birthday || '').trim();
    if (!name || !birthday) return;
    this.profileSetupBusy = true;
    try {
      this.setupError = '';
      const base = this.normalizePlayerSetupBase(name, birthday);
      if (options.skipAi) throw new Error('玩家个人资料必须由AI补全并给出原因，不能跳过AI。');
      let enriched = null;
      try {
        enriched = await this.enrichPlayerProfile(base);
      } catch (err) {
        console.warn('[玩家身份] AI补全失败，拒绝使用本地资料继续激活:', err.code, err.message, err.stack);
        throw new Error(`AI身份补全失败，不能使用本地兜底资料：${err.message || '请稍后重试'}`);
      }
      this.playerProfile = this.normalizeEnrichedPlayerProfile(base, enriched);
      this.phoneFixedTime = new Date(this.playerProfile.initializedAt || Date.now()).getTime();
      await this.syncPlayerProfileLexicon();
      this.playerName = name;
      this.phoneActivationChoice = '';
      this.phoneSetupDone = true;
      this.desktopUnlocked = false;
      await this.ensurePlayerRpgState?.(true);
      await this.syncKnownProfessionsFromProfile?.(this.playerProfile.knownProfessions);
      await this.save();
    } catch (err) {
      console.error('[玩家身份] 激活失败:', err.code, err.message, err.stack);
      this.setupError = err.message || '激活失败';
    } finally {
      this.profileSetupBusy = false;
    }
  },

  normalizePlayerSetupBase(name, birthday) {
    const p = this.playerProfile || {};
    return {
      ...p,
      name,
      birthday,
      age: this.playerAgeFromBirthday(birthday),
      gender: (p.gender || '').trim(),
      city: (p.city || '').trim(),
      dailyRole: (p.dailyRole || '').trim(),
      workplace: (p.workplace || '').trim(), position: (p.position || '').trim(),
      livingStatus: (p.livingStatus || '').trim(),
      parents: (p.parents || '').trim(),
      relationships: (p.relationships || '').trim(),
      notes: (p.notes || '').trim(),
      initializedAt: p.initializedAt || new Date().toISOString(),
    };
  },

  async enrichPlayerProfile(base) {
    if (!window.dzmm?.completions) throw new Error('dzmm.completions unavailable');
    const prompt = await window.GameModules.promptTemplates.render('player-profile-enrichment', {
      年龄: base.age,
      性别: base.gender || '未填写',
      relationshipRule: base.relationshipRule || '无额外规则。',
      输入: JSON.stringify(base),
    });
    return await Promise.race([
      window.GameModules.jsonUtils.generateJsonWithRetry({ source: 'player-profile-enrichment', model: this.modelId, maxTokens: 900, timeoutMs: 60000, prompt, format: prompt, max: 2 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('身份补全超时')), 60000)),
    ]);
  },

  normalizeEnrichedPlayerProfile(base, data = {}) {
    const city = this.ensurePreciseAddress(data?.refinedCity || base.city);
    const role = String(data?.refinedRole || this.fallbackRefinedRole(base.dailyRole, base.age, city)).slice(0, 80);
    const social = window.GameModules.socialPosition || {};
    const workplace = String(data?.workplace || base.workplace || social.workplace?.(role, city) || '').slice(0, 80);
    const position = String(data?.position || base.position || social.position?.(role) || '').slice(0, 60);
    const noParents = !base.parents;
    const status = String(data?.parentStatus || (noParents ? '父母已故' : base.parents)).slice(0, 80);
    const cause = String(data?.parentDeathCause || (noParents ? this.fallbackParentDeathCause(base.age) : '')).slice(0, 120);
    return {
      ...base,
      refinedCity: city,
      refinedRole: role, workplace, position,
      refinedLivingStatus: String(data?.refinedLivingStatus || base.livingStatus || `${city}，长期居住地址已登记`).slice(0, 100),
      relationships: window.GameModules.characterProfile.formatRelationships(data?.relationships || base.relationships),
      parentStatus: noParents ? (status.includes('已故') ? status : '父母已故') : status,
      parentDeathCause: noParents ? cause : cause,
      worldbuildingNote: String(data?.worldbuildingNote || `${base.age}岁的${role}，就职/活动于${workplace}，地位为${position}。`).slice(0, 120),
      knownProfessions: this.normalizeKnownProfessionHints(data?.knownProfessions),
      equipment: this.normalizeCarryHints(data?.equipment, '装备'),
      items: this.normalizeCarryHints(data?.items, '物品'),
      wearing: this.normalizeWearingHints(data?.wearing),
      profileEnrichedAt: new Date().toISOString(),
    };
  },

};
