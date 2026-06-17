window.GameModules = window.GameModules || {};
window.GameModules.playerSetupActions = window.GameModules.playerSetupActions || {};
Object.assign(window.GameModules.playerSetupActions, {
  defaultProfileMdCandidates(file = 'config/default-existing-profile.md') {
    const raw = String(file || '').replace(/^\.\//, '');
    const bases = [];
    try { if (document.querySelector('base[href]')?.href) bases.push(document.querySelector('base[href]').href); } catch (_) {}
    try { if (document.baseURI) bases.push(document.baseURI); } catch (_) {}
    try { if (window.GameModules.promptTemplates?.baseUrl) bases.push(window.GameModules.promptTemplates.baseUrl); } catch (_) {}
    try { if (window.GameModules.promptTemplates?.scriptUrl) bases.push(window.GameModules.promptTemplates.scriptUrl); } catch (_) {}
    const urls = bases.flatMap((base) => {
      try { return [new URL(raw, base).toString()]; }
      catch (_) { return []; }
    });
    urls.push(raw, `./${raw}`);
    return [...new Set(urls)];
  },

  async readDefaultProfileMd() {
    let lastError = null;
    for (const url of this.defaultProfileMdCandidates()) {
      try {
        const res = await fetch(encodeURI(url));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (text.trim()) return { text, source: url };
      } catch (err) {
        lastError = err;
      }
    }
    try {
      const text = await window.GameModules.rag.fetchText('config/default-existing-profile.md');
      if (text.trim()) return { text, source: 'config/default-existing-profile.md' };
    } catch (err) {
      lastError = err;
    }
    throw lastError || new Error('默认资料 MD 不可用');
  },

  async defaultProfileData() {
    let source = 'default-existing-profile-inline.js';
    let text = '';
    try {
      const loaded = await this.readDefaultProfileMd();
      text = loaded.text;
      source = loaded.source;
    } catch (err) {
      console.warn('[玩家身份] 默认资料 MD 读取失败，使用 JS 兜底:', err.message, err.stack);
    }
    const data = text ? this.parseDefaultProfileMd(text) : window.GameModules.defaultExistingProfile;
    if (!data?.name || !data?.birthday) throw new Error('默认资料缺少 name 或 birthday');
    return { ...data, source };
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
