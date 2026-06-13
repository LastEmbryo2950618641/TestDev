window.GameModules = window.GameModules || {};

(function guardPlayerSetupActions() {
  const actions = window.GameModules.playerSetupActions = window.GameModules.playerSetupActions || {};
  const worldLabel = () => window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
  const fallbacks = {
    playerProfileLexiconFields() {
      const p = this.playerProfile || {}, worldTag = worldLabel();
      const row = (name, value, desc) => ({ key: `player-${name}`, label: name, kind: '玩家设定', value: value || '未填写', raw: value || '', desc, worldTag, targetType: '非角色', commonField: name !== '所属世界' });
      return [
        row('所属世界', worldTag, '玩家当前所在的现实世界。'),
        row('姓名', p.name || this.playerName, '玩家登记的姓名或代号。'),
        row('性别', p.gender, '玩家登记的性别。'),
        row('生日', p.birthday, '玩家登记生日，用于计算年龄与现实身份。'),
        row('年龄', p.age ? `${p.age}岁` : '', '由生日按2026-06-12计算得到。'),
        row('具体地址', p.refinedCity || p.city, '玩家当前登记住址。'),
        row('现实身份', p.refinedRole || p.dailyRole, '玩家在2026现实世界中的日常身份。'),
        row('工作阵营', p.workplace, '玩家当前工作、学习或活动阵营。'),
        row('阵营地位', p.position, '玩家在该阵营中的岗位或身份层级。'),
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
    defaultExistingAccountProfile() {
      return { name: '刘悠', gender: '男', birthday: '1998-11-19', age: this.playerAgeFromBirthday('1998-11-19'), city: '四川省成都市武侯区玉林街道玉林北路社区锦苑小区3栋2单元601号', dailyRole: '程序工程师，计算机科学与技术硕士', livingStatus: '与妹妹同居', parents: '父母资料未同步', relationships: '妹妹：需要AI按现实世界观、文化习俗和同居关系生成正式姓名', notes: '已有账号同步资料。刘悠的妹妹已成年，对刘悠有极强依恋与占有欲，平时十分在乎外貌与整洁；如今两人同住，她常在家以精致打扮和亲近举动试探刘悠，但又担心刘悠过于正经、会因此疏远她，所以始终克制。刘悠并未明确察觉妹妹的心思，只认为妹妹格外精致讲究。妹妹外貌精致可爱，黑长直、黑瞳，常穿JK风制服与黑色过膝袜，身高155cm，体态娇小但已成年，气质清秀，曲线柔和，双腿纤细。刘悠也对妹妹有严重的保护欲与依恋倾向，但出于现实伦理与害怕妹妹反感，一直保持镇定与距离。', initializedAt: new Date().toISOString() };
    },
    chooseExistingAccountSetup() { this.playerProfile = { ...this.playerProfile, ...this.defaultExistingAccountProfile() }; this.existingProfileExpanded = false; this.phoneActivationChoice = 'existing'; },
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
