window.GameModules = window.GameModules || {};

window.GameModules.playerSetupActions = {
  playerProfileLexiconFields() {
    const p = this.playerProfile || {};
    const worldTag = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const row = (name, value, desc) => ({ key: `player-${name}`, label: name, kind: '玩家设定', value: value || '未填写', raw: value || '', desc, worldTag });
    return [
      row('姓名', p.name || this.playerName, '玩家登记的姓名或代号。'),
      row('性别', p.gender, '玩家登记的性别。'),
      row('生日', p.birthday, '玩家登记生日，用于计算年龄与现实身份。'),
      row('年龄', p.age ? `${p.age}岁` : '', '由生日按2026-06-12计算得到。'),
      row('具体地址', p.refinedCity || p.city, '玩家当前登记住址。'),
      row('现实身份', p.refinedRole || p.dailyRole, '玩家在2026现实世界中的日常身份。'),
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

  chooseNewAccountSetup() {
    this.phoneActivationChoice = 'new';
  },

  async useExistingAccountSetup() {
    if (this.profileSetupBusy) return;
    this.playerProfile = {
      ...this.playerProfile,
      name: '刘悠', gender: '男', birthday: '1998-11-19', age: this.playerAgeFromBirthday('1998-11-19'),
      city: '四川省成都市武侯区玉林街道玉林北路社区锦苑小区3栋2单元601号',
      refinedCity: '四川省成都市武侯区玉林街道玉林北路社区锦苑小区3栋2单元601号',
      dailyRole: '程序工程师lv.5，计算机科学与技术硕士lv.5',
      refinedRole: '程序工程师lv.5，计算机科学与技术硕士lv.5',
      livingStatus: '与妹妹同居', refinedLivingStatus: '与妹妹同居，日常生活高度绑定',
      parents: '父母资料未同步', parentStatus: '父母资料未同步', parentDeathCause: '',
      relationships: '妹妹：与刘悠同居，有严重兄控倾向，喜欢看缘之空，私底下喜欢一句话“既然怀上了，那打掉不就好了吗”。',
      worldbuildingNote: '刘悠是1998年出生的男性程序工程师，拥有计算机科学与技术硕士背景，与妹妹同居。',
      notes: '已有账号同步资料。', profileEnrichedAt: new Date().toISOString(), initializedAt: new Date().toISOString(),
    };
    await this.completePlayerSetup({ skipAi: true });
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
      const base = this.normalizePlayerSetupBase(name, birthday);
      let enriched = null;
      if (!options.skipAi) {
        try {
          enriched = await this.enrichPlayerProfile(base);
        } catch (err) {
          console.warn('[玩家身份] AI补全失败，使用本地兜底:', err.code, err.message, err.stack);
        }
      }
      this.playerProfile = this.normalizeEnrichedPlayerProfile(base, enriched);
      await this.syncPlayerProfileLexicon();
      this.playerName = name;
      this.phoneActivationChoice = '';
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
      gender: (p.gender || '').trim(),
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
    const prompt = `你负责补全2026现代都市互动小说的玩家现实身份。只返回JSON。不要改玩家姓名、性别和生日。若parents为空，必须设parentStatus为“父母已故”，并生成现实、克制、合理的parentDeathCause。根据birthday计算出的年龄${base.age}与性别${base.gender || '未填写'}补全身份；例如高中生应细化为具体学校与年级。玩家填写的是具体地址，不是城市；若只写“四川省”这类省/市/县级信息，refinedCity必须补成省-市/州-区县-镇/街道-社区/小区-楼栋-门牌的准确格式，例如“四川省成都市武侯区玉林街道玉林北路社区锦苑小区3栋2单元601号”。所有词条值都必须可落库、可判定、不可含“某处/一处/普通/未知/等/附近/片区”这类模糊词。\n输入=${JSON.stringify(base)}\n返回字段:{"refinedCity":"省市区县镇街道小区楼栋门牌","refinedRole":"更具体身份","refinedLivingStatus":"更具体居住状态","parentStatus":"父母状态","parentDeathCause":"父母去世原因或空","worldbuildingNote":"60字内现实背景补充"}`;
    return await Promise.race([
      window.GameModules.jsonUtils.generateJsonWithRetry({ model: this.modelId, maxTokens: 1200, prompt, format: prompt, max: 2 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('身份补全超时')), 30000)),
    ]);
  },

  normalizeEnrichedPlayerProfile(base, data = {}) {
    const city = this.ensurePreciseAddress(data?.refinedCity || base.city);
    const role = String(data?.refinedRole || this.fallbackRefinedRole(base.dailyRole, base.age, city)).slice(0, 80);
    const noParents = !base.parents;
    const status = String(data?.parentStatus || (noParents ? '父母已故' : base.parents)).slice(0, 80);
    const cause = String(data?.parentDeathCause || (noParents ? this.fallbackParentDeathCause(base.age) : '')).slice(0, 120);
    return {
      ...base,
      refinedCity: city,
      refinedRole: role,
      refinedLivingStatus: String(data?.refinedLivingStatus || base.livingStatus || `${city}，长期居住地址已登记`).slice(0, 100),
      parentStatus: noParents ? (status.includes('已故') ? status : '父母已故') : status,
      parentDeathCause: noParents ? cause : cause,
      worldbuildingNote: String(data?.worldbuildingNote || `${base.age}岁的${role}，登记住址为${city}，刚激活一台新手机。`).slice(0, 120),
      profileEnrichedAt: new Date().toISOString(),
    };
  },

  ensurePreciseAddress(address) {
    const value = String(address || '').trim();
    const vague = !value || /某|一处|普通|未知|附近|片区|等/.test(value);
    const precise = /省.+(市|州).+(区|县|市).+(镇|街道).+(社区|小区|家属院|公寓|花园).+(栋|号楼).+(号|室)/.test(value);
    if (!vague && precise) return value.slice(0, 100);
    return this.fallbackPreciseAddress(value).slice(0, 100);
  },

  fallbackPreciseAddress(address) {
    if (/四川/.test(address || '')) return '四川省成都市武侯区玉林街道玉林北路社区锦苑小区3栋2单元601号';
    if (/北京/.test(address || '')) return '北京市朝阳区望京街道花家地社区望京西园一区6号楼2单元502号';
    if (/上海/.test(address || '')) return '上海市浦东新区花木街道牡丹社区牡丹苑小区12号楼1单元803号';
    if (/广东|广州/.test(address || '')) return '广东省广州市天河区石牌街道龙口西社区天誉花园8栋1单元701号';
    return `${address || '四川省成都市武侯区'}玉林街道玉林北路社区锦苑小区3栋2单元601号`;
  },

  fallbackRefinedRole(role, age, city) {
    const place = (city || '本地').replace(/(省|市|县|区|镇|街道|社区|小区|家属院|公寓|花园|栋|号楼|单元|号|室)/g, '').slice(-4) || '本地';
    if (/高中|学生/.test(role || '') && age) {
      const grade = age <= 16 ? '高一年级' : (age >= 18 ? '高三年级' : '高二年级');
      return `${place}第一中学${grade}学生`;
    }
    return role || `${age || ''}岁现代都市居民`;
  },

  async syncPlayerProfileLexicon() {
    const p = this.playerProfile || {};
    const worldTag = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    await window.GameModules.rpgLexicon.saveMany(this.playerProfileLexiconFields().map((field) => ({
      worldTag, kind: '玩家设定', name: field.label, value: field.raw || field.value, summary: field.value,
      description: field.desc,
      nameAiGenerated: false,
      valueAiGenerated: !['姓名', '性别', '生日', '年龄', '人际关系', '备注'].includes(field.label),
      changeMode: ['姓名', '性别', '生日', '人际关系', '备注'].includes(field.label) ? '用户主动' : 'AI演算',
      source: 'ai',
    })));
  },

  fallbackParentDeathCause(age) {
    return age && age < 18 ? '数年前因一场夜间交通事故相继离世，具体细节由后续剧情逐步揭开。' : '多年前因突发交通事故离世，留下的生活痕迹仍影响玩家的现实处境。';
  },

  reopenPlayerSetup() {
    this.phoneSetupDone = false;
    this.phoneActivationChoice = '';
  },
};
