window.GameModules = window.GameModules || {};

window.GameModules.playerSetupActions = {
  playerSetupSummary() {
    const p = this.playerProfile || {};
    return [
      `姓名/代号：${p.name || this.playerName || '未填写'}`,
      `生日/年龄：${p.birthday || '未填写'}｜${p.age || '未知'}岁`,
      `城市：${p.refinedCity || p.city || '未填写'}`,
      `身份：${p.refinedRole || p.dailyRole || '未填写'}`,
      `居住：${p.refinedLivingStatus || p.livingStatus || '未填写'}`,
      `父母：${p.parentStatus || p.parents || '父母已故'}`,
      `父母去世原因：${p.parentDeathCause || '待生成'}`,
      `关系：${p.relationships || '由玩家自行设定，暂无补充'}`,
      `世界观补全：${p.worldbuildingNote || '暂无'}`,
      `备注：${p.notes || '无'}`,
    ].join('\n');
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

  async completePlayerSetup() {
    if (this.profileSetupBusy) return;
    const name = (this.playerProfile.name || this.playerName || '').trim();
    const birthday = (this.playerProfile.birthday || '').trim();
    if (!name || !birthday) return;
    this.profileSetupBusy = true;
    try {
      const base = this.normalizePlayerSetupBase(name, birthday);
      let enriched = null;
      try {
        enriched = await this.enrichPlayerProfile(base);
      } catch (err) {
        console.warn('[玩家身份] AI补全失败，使用本地兜底:', err.code, err.message, err.stack);
      }
      this.playerProfile = this.normalizeEnrichedPlayerProfile(base, enriched);
      this.playerName = name;
      this.phoneSetupDone = true;
      this.desktopUnlocked = false;
      this.appHasOpened = false;
      await this.ensurePlayerRpgState?.(true);
      await this.save();
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
      city: (p.city || '').trim(),
      dailyRole: (p.dailyRole || '').trim(),
      livingStatus: (p.livingStatus || '').trim(),
      parents: (p.parents || '').trim(),
      relationships: (p.relationships || '').trim(),
      notes: (p.notes || '').trim(),
      initializedAt: p.initializedAt || new Date().toISOString(),
    };
  },

  async enrichPlayerProfile(base) {
    if (!window.dzmm?.completions) throw new Error('dzmm.completions unavailable');
    const prompt = `你负责补全2026现代都市互动小说的玩家现实身份。只返回JSON。不要改玩家姓名和生日。若parents为空，必须设parentStatus为“父母已故”，并生成现实、克制、合理的parentDeathCause。根据birthday计算出的年龄${base.age}补全身份；例如高中生应细化为具体学校与年级。城市不够具体时细化到区县/街道/小区等未知但合理地点。\n输入=${JSON.stringify(base)}\n返回字段:{"refinedCity":"更具体地点","refinedRole":"更具体身份","refinedLivingStatus":"更具体居住状态","parentStatus":"父母状态","parentDeathCause":"父母去世原因或空","worldbuildingNote":"60字内现实背景补充"}`;
    let buffer = '';
    await Promise.race([
      window.dzmm.completions({ model: this.modelId, messages: [{ role: 'user', content: prompt }], maxTokens: 1200 }, (chunk) => {
        buffer = window.GameModules.jsonUtils.mergeStreamText(buffer, chunk);
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('身份补全超时')), 30000)),
    ]);
    return window.GameModules.jsonUtils.parseLoose(buffer);
  },

  normalizeEnrichedPlayerProfile(base, data = {}) {
    const city = String(data?.refinedCity || this.fallbackRefinedCity(base.city)).slice(0, 80);
    const role = String(data?.refinedRole || this.fallbackRefinedRole(base.dailyRole, base.age, city)).slice(0, 80);
    const noParents = !base.parents;
    const status = String(data?.parentStatus || (noParents ? '父母已故' : base.parents)).slice(0, 80);
    const cause = String(data?.parentDeathCause || (noParents ? this.fallbackParentDeathCause(base.age) : '')).slice(0, 120);
    return {
      ...base,
      refinedCity: city,
      refinedRole: role,
      refinedLivingStatus: String(data?.refinedLivingStatus || base.livingStatus || `${city}普通住处`).slice(0, 80),
      parentStatus: noParents ? (status.includes('已故') ? status : '父母已故') : status,
      parentDeathCause: noParents ? cause : cause,
      worldbuildingNote: String(data?.worldbuildingNote || `${base.age}岁的${role}，生活在${city}，刚激活一台新手机。`).slice(0, 120),
      profileEnrichedAt: new Date().toISOString(),
    };
  },

  fallbackRefinedCity(city) {
    const value = city || '未设定城市';
    if (/县|市|区|省/.test(value)) return `${value}城南片区一处普通居民小区`;
    return value;
  },

  fallbackRefinedRole(role, age, city) {
    const place = (city || '本地').replace(/(省|市|县|区|街道|片区|一处普通居民小区)/g, '').slice(-4) || '本地';
    if (/高中|学生/.test(role || '') && age) {
      const grade = age <= 16 ? '高一年级' : (age >= 18 ? '高三年级' : '高二年级');
      return `${place}第一中学${grade}学生`;
    }
    return role || `${age || ''}岁现代都市居民`;
  },

  fallbackParentDeathCause(age) {
    return age && age < 18 ? '数年前因一场夜间交通事故相继离世，具体细节由后续剧情逐步揭开。' : '多年前因突发交通事故离世，留下的生活痕迹仍影响玩家的现实处境。';
  },

  reopenPlayerSetup() {
    this.phoneSetupDone = false;
  },
};
