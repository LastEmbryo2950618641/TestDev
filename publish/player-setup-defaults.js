window.GameModules = window.GameModules || {};
window.GameModules.playerSetupActions = window.GameModules.playerSetupActions || {};
Object.assign(window.GameModules.playerSetupActions, {
  defaultProfileScriptUrl: (() => {
    try { return document.currentScript?.src || ''; }
    catch (_) { return ''; }
  })(),
  defaultProfileBaseUrl: (() => {
    try {
      const scriptSrc = document.currentScript?.src || '';
      if (scriptSrc) return new URL('.', scriptSrc).toString();
      return new URL('.', document.baseURI).toString();
    } catch (_) { return ''; }
  })(),

  defaultProfileFileCandidates(file = 'config/default-existing-profile.json') {
    const raw = String(file || '').replace(/^\.\//, '');
    const bases = [];
    try { if (document.querySelector('base[href]')?.href) bases.push(document.querySelector('base[href]').href); } catch (_) {}
    try { if (document.baseURI) bases.push(document.baseURI); } catch (_) {}
    try { if (this.defaultProfileBaseUrl) bases.push(this.defaultProfileBaseUrl); } catch (_) {}
    try { if (this.defaultProfileScriptUrl) bases.push(this.defaultProfileScriptUrl); } catch (_) {}
    try { if (window.GameModules.promptTemplates?.baseUrl) bases.push(window.GameModules.promptTemplates.baseUrl); } catch (_) {}
    try { if (window.GameModules.promptTemplates?.scriptUrl) bases.push(window.GameModules.promptTemplates.scriptUrl); } catch (_) {}
    const urls = bases.flatMap((base) => {
      try { return [new URL(raw, base).toString()]; }
      catch (_) { return []; }
    });
    urls.push(raw, `./${raw}`);
    return [...new Set(urls)];
  },

  async readDefaultProfileFile() {
    let lastError = null;
    const urls = this.defaultProfileFileCandidates();
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('[玩家身份] 已读取默认资料文件:', url);
        return data;
      } catch (err) {
        lastError = err;
      }
    }
    const detail = urls.join('、');
    throw new Error(`${lastError?.message || '默认资料文件不可用'}；已尝试：${detail}`);
  },

  async defaultExistingAccountProfile() {
    let data = null, source = 'file';
    const inline = window.GameModules.defaultExistingProfile;
    try {
      data = await this.readDefaultProfileFile();
    } catch (err) {
      source = 'inline';
      console.info('[玩家身份] 默认资料文件不可用，使用内联快照:', err.message);
      data = inline;
    }
    if (!data?.name || !data?.birthday) throw new Error('默认资料缺少 name 或 birthday');
    console.log('[玩家身份] 默认资料来源:', source, data.name, data.birthday);
    return { ...data, age: this.playerAgeFromBirthday(data.birthday), initializedAt: new Date().toISOString() };
  },

  async debugDefaultProfileSource() {
    const urls = this.defaultProfileFileCandidates();
    const report = { urls, source: 'none', name: '', birthday: '', error: '' };
    try {
      const data = await this.readDefaultProfileFile();
      report.source = 'file'; report.name = data?.name || ''; report.birthday = data?.birthday || '';
    } catch (err) {
      const inline = window.GameModules.defaultExistingProfile || {};
      report.source = 'inline'; report.name = inline.name || ''; report.birthday = inline.birthday || ''; report.error = err.message || '';
    }
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
