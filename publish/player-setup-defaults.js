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
      const aiParts = this.normalizePlayerCardAiParts?.(this.playerProfile.playerCardAiParts) || { part2: false, part5: false, part6: false };
      this.playerProfile = { ...this.playerProfile, ...await this.defaultExistingAccountProfile(), playerCardAiParts: aiParts };
      this.playerProfile.relationshipEntries = this.normalizeRelationshipEntries(this.playerProfile.relationshipEntries, this.playerProfile.relationships);
      await this.initPredefinedRoleCards?.();
      this.roleCardSetup.usePredefinedPlayerCard = true;
      this.applySelectedPlayerRoleCard?.();
      this.applySelectedRelationshipRoleCards?.();
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
      const aiParts = this.normalizePlayerCardAiParts?.(this.playerProfile.playerCardAiParts) || { part2: false, part5: false, part6: false };
      this.playerProfile = {
        ...this.playerProfile,
        playerCardAiParts: aiParts,
        name: this.playerProfile.name || example.name || '',
        gender: this.playerProfile.gender || example.gender || '',
        birthday: this.playerProfile.birthday || example.birthday || '',
        city: this.playerProfile.city || example.city || '',
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

  async completePredefinedPlayerSetup() {
    if (this.profileSetupBusy) return;
    const p = this.playerProfile || {}, name = (p.name || this.playerName || '').trim(), birthday = (p.birthday || '').trim();
    if (!name || !birthday) return;
    this.profileSetupBusy = true;
    try {
      this.setupError = '';
      this.syncRelationshipTextFromEntries?.();
      const age = this.playerAgeFromBirthday(birthday);
      this.playerProfile = { ...p, name, birthday, age, refinedCity: p.refinedCity || p.city, refinedRole: p.refinedRole || p.dailyRole || `${age || ''}岁现代都市居民`, refinedLivingStatus: p.refinedLivingStatus || p.livingStatus, parentStatus: p.parentStatus || p.parents || '父母已故', parentDeathCause: p.parentDeathCause || '', initializedAt: p.initializedAt || new Date().toISOString() };
      this.phoneFixedTime = new Date(this.playerProfile.initializedAt).getTime();
      await this.syncPlayerProfileLexicon?.();
      this.playerName = name; this.phoneActivationChoice = ''; this.phoneSetupDone = true; this.desktopUnlocked = false;
      await window.GameModules.predefinedRoleCards.saveSelectedRoleCardStates(this);
      await this.syncKnownProfessionsFromProfile?.(this.playerProfile.knownProfessions);
      await this.save?.();
    } catch (err) {
      console.error('[玩家身份] 激活失败:', err.code, err.message, err.stack);
      this.setupError = err.message || '激活失败';
    } finally {
      this.profileSetupBusy = false;
    }
  },

});
