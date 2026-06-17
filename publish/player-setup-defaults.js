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
    String(text).split('\n').forEach((line) => {
      const match = line.match(/^\s*([^：:]+)\s*[：:]\s*(.+?)\s*$/);
      if (match) map[match[1].trim()] = match[2].trim();
    });
    return {
      name: map['姓名'] || '',
      gender: map['性别'] || '',
      birthday: map['生日'] || '',
      city: map['具体地址'] || map['地址'] || '',
      dailyRole: map['现实身份'] || '',
      livingStatus: map['居住状态'] || '',
      parents: map['父母信息'] || '',
      parentDeathCause: map['父母去世原因'] || '',
      relationships: map['人际关系'] || '',
      notes: map['备注'] || '',
    };
  },

  async defaultExistingAccountProfile() {
    const data = await this.defaultProfileData();
    console.log('[玩家身份] 默认资料来源:', data.source, data.name, data.birthday);
    return { ...data, age: this.playerAgeFromBirthday(data.birthday), initializedAt: new Date().toISOString() };
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
      this.playerProfile = {
        ...this.playerProfile,
        name: this.playerProfile.name || example.name || '',
        gender: this.playerProfile.gender || example.gender || '',
        birthday: this.playerProfile.birthday || example.birthday || '',
        city: this.playerProfile.city || example.city || '',
        dailyRole: this.playerProfile.dailyRole || example.dailyRole || '',
        livingStatus: this.playerProfile.livingStatus || example.livingStatus || '',
        parents: this.playerProfile.parents || example.parents || '',
        parentDeathCause: this.playerProfile.parentDeathCause || example.parentDeathCause || '',
        relationships: this.playerProfile.relationships || example.relationships || '',
        notes: this.playerProfile.notes || example.notes || '',
      };
      this.existingProfileExpanded = true;
      this.phoneActivationChoice = 'new';
    } catch (err) {
      console.error('[玩家身份] 新账号默认资料读取失败:', err.message, err.stack);
      this.setupError = err.message || '新账号默认资料读取失败';
    } finally {
      this.profileSetupBusy = false;
    }
  },
});
