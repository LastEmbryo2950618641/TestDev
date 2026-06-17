window.GameModules = window.GameModules || {};
window.GameModules.playerSetupActions = window.GameModules.playerSetupActions || {};
Object.assign(window.GameModules.playerSetupActions, {
  async defaultExistingAccountProfile() {
    let data = null;
    try {
      const res = await fetch('./config/default-existing-profile.json');
      if (!res.ok) throw new Error(`默认资料读取失败：${res.status}`);
      data = await res.json();
    } catch (err) {
      console.warn('[玩家身份] 本地默认资料读取失败，使用内联兜底:', err.message, err.stack);
      data = window.GameModules.defaultExistingProfile;
    }
    if (!data?.name || !data?.birthday) throw new Error('默认资料缺少 name 或 birthday');
    return { ...data, age: this.playerAgeFromBirthday(data.birthday), initializedAt: new Date().toISOString() };
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
