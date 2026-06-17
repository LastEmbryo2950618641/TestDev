window.GameModules = window.GameModules || {};

(function guardPlayerSetupActions() {
  const actions = window.GameModules.playerSetupActions = window.GameModules.playerSetupActions || {};
  const worldLabel = () => window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
  const fallbacks = {
    playerProfileLexiconFields() {
      const p = this.playerProfile || {}, worldTag = worldLabel();
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
      const data = window.GameModules.defaultExistingProfile;
      if (!data?.name || !data?.birthday) throw new Error('默认资料缺少 name 或 birthday');
      return { ...data, age: this.playerAgeFromBirthday(data.birthday), initializedAt: new Date().toISOString() };
    },
    async chooseExistingAccountSetup() { if (this.profileSetupBusy) return; this.profileSetupBusy = true; try { this.setupError = ''; this.playerProfile = { ...this.playerProfile, ...await this.defaultExistingAccountProfile() }; this.existingProfileExpanded = false; this.phoneActivationChoice = 'existing'; } catch (err) { console.error('[玩家身份] 已有账号默认资料读取失败:', err.message, err.stack); this.setupError = err.message || '已有账号默认资料读取失败'; } finally { this.profileSetupBusy = false; } },
    chooseNewAccountSetup() { this.existingProfileExpanded = true; this.phoneActivationChoice = 'new'; },
    backActivationChoice() { this.phoneActivationChoice = ''; },
    playerAgeFromBirthday(birthday) {
      const birth = new Date(`${birthday}T00:00:00`), now = new Date('2026-06-12T00:00:00');
      if (Number.isNaN(birth.getTime())) return '';
      let age = now.getFullYear() - birth.getFullYear();
      if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1;
      return Math.max(0, age);
    },
    async useExistingAccountSetup() {
      await this.completePlayerSetup?.();
    },
    async completePlayerSetup() {
      if (this.profileSetupBusy) return;
      const p = this.playerProfile || {}, name = (p.name || this.playerName || '').trim(), birthday = (p.birthday || '').trim();
      if (!name || !birthday) return;
      this.profileSetupBusy = true;
      try {
        const age = this.playerAgeFromBirthday(birthday);
        this.playerProfile = { ...p, name, birthday, age, refinedCity: p.refinedCity || p.city, refinedRole: p.refinedRole || p.dailyRole || `${age || ''}岁现代都市居民`, refinedLivingStatus: p.refinedLivingStatus || p.livingStatus, parentStatus: p.parentStatus || p.parents || '父母已故', parentDeathCause: p.parentDeathCause || '', initializedAt: p.initializedAt || new Date().toISOString() };
        this.phoneFixedTime = new Date(this.playerProfile.initializedAt).getTime();
        await this.syncPlayerProfileLexicon?.();
        this.playerName = name; this.phoneActivationChoice = ''; this.phoneSetupDone = true; this.desktopUnlocked = false;
        await this.ensurePlayerRpgState?.(true); await this.save?.();
      } finally { this.profileSetupBusy = false; }
    },
    async syncPlayerProfileLexicon() {
      try {
        if (!window.GameModules.rpgLexicon?.saveMany) return;
        await window.GameModules.rpgLexicon.saveMany(this.playerProfileLexiconFields().map((field) => ({ worldTag: worldLabel(), kind: '玩家设定', name: field.label, value: field.raw || field.value, summary: field.value, description: field.desc, nameAiGenerated: false, valueAiGenerated: false, changeMode: '用户主动', source: 'fallback', meta: { targetType: '非角色', commonField: true } })));
      } catch (err) { console.warn('[玩家身份] 兜底词条同步失败:', err.message, err.stack); }
    },
    reopenPlayerSetup() { this.phoneSetupDone = false; this.phoneActivationChoice = ''; },
  };
  Object.entries(fallbacks).forEach(([key, fn]) => { if (typeof actions[key] !== 'function') actions[key] = fn; });
})();
