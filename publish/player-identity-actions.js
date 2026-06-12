window.GameModules = window.GameModules || {};

window.GameModules.playerIdentityActions = {
  playerCharacter() {
    const p = this.playerProfile || {};
    const world = window.GameModules.realWorld2026 || {};
    const name = p.name || this.playerName || '手机主人';
    const city = p.refinedCity || p.city || world.defaults?.city || '未设定城市';
    const role = p.refinedRole || p.dailyRole || world.defaults?.dailyRole || '现代都市居民';
    const living = p.refinedLivingStatus || p.livingStatus || world.defaults?.livingStatus || '生活状态未设定';
    const parents = p.parentStatus || p.parents || '父母已故';
    const deathCause = p.parentDeathCause || '父母去世原因未记录';
    const relations = p.relationships || '人际关系由玩家自行设定，当前未填写';
    const notes = [p.worldbuildingNote, p.notes].filter(Boolean).join('；') || '暂无补充设定';
    return {
      id: 'player-self', name, age: p.age || '', birthday: p.birthday || '', gender: p.gender || '', work: world.label || '2026 现代都市现实世界', role, job: role,
      rank: living, faction: city, importance: 'main', isPlayer: true,
      detail: `性别：${p.gender || '未知'}；年龄：${p.age || '未知'}；生日：${p.birthday || '未知'}；具体地址：${city}；居住：${living}；父母：${parents}；去世原因：${deathCause}；关系：${relations}；备注：${notes}`,
      personality: notes,
      skills: [
        { name: '手机操作', desc: '能够使用智能手机完成通讯、检索、拍摄、设置、应用切换和信息处理等操作。' },
        { name: '现实观察', desc: '通过细节、环境变化和他人反应判断局势的能力。' },
      ],
    };
  },

  playerIdentityState() {
    return this.rpgStates['player-self'] || null;
  },

  identityTargetState() {
    return this.rpgStates[this.identityTargetId || 'player-self'] || null;
  },

  identityTargetProfile() {
    const id = this.identityTargetId || 'player-self';
    if (id === 'player-self') return this.playerCharacter();
    return this.identityTargetState()?.profile || (id === this.character.id ? this.character : { name: '未知角色', work: '未知世界', role: '身份未知', detail: '暂无角色卡。', personality: '' });
  },

  identityTargetFields() {
    if ((this.identityTargetId || 'player-self') === 'player-self') return this.playerProfileLexiconFields();
    const p = this.identityTargetProfile();
    const worldTag = p.work || this.identityTargetState()?.worldTag || '原创世界';
    const row = (key, label, value, desc) => ({ key: `id-${this.identityTargetId}-${key}`, label, kind: '角色卡', value: value || '未记录', raw: value || '', desc, worldTag });
    return [
      row('name', '姓名', p.name, '角色卡固化姓名。'),
      row('work', '所属世界', worldTag, '角色出身作品或世界。'),
      row('role', '身份', p.role, '角色卡固化身份。'),
      row('faction', '所属势力', p.faction, '角色当前阵营或社会位置。'),
      row('job', '职业', p.job, '角色真实职业、训练身份或社会功能。'),
      row('rank', '等级/地位', p.rank, '角色职业等级或地位。'),
    ];
  },

  playerIdentitySummary() {
    const v = this.playerIdentityState()?.values || {};
    if (!v.level) return '玩家本人属性尚未生成。';
    return `性别${this.playerProfile.gender || '未知'}｜年龄${v.age ?? this.playerProfile.age ?? '未知'}｜等级${v.level}｜经验${v.exp?.current || 0}/${v.exp?.next || 'max'}｜力量${v.strength}｜敏捷${v.agility}｜体质${v.constitution}｜智力${v.intelligence}｜感知${v.perception}｜意志${v.willpower}｜魅力${v.charisma}`;
  },

  async ensurePlayerRpgState(refresh = false) {
    if (!window.GameModules.sqliteSave.db) return this.playerIdentityState();
    const existing = this.playerIdentityState();
    if (!refresh && existing) {
      if (window.GameModules.progression.ensureStateMechanics(existing, existing.profile || this.playerCharacter())) await window.GameModules.sqliteSave.saveCharacterState(existing);
      return existing;
    }
    const character = this.playerCharacter();
    const state = await window.GameModules.rpgState.ensureCharacter(character, this);
    state.profile = character;
    state.note = character.detail;
    state.values.age = Number.isFinite(Number(character.age)) ? Number(character.age) : state.values.age;
    state.values.status_tags = ['玩家本人', '手机主人', character.work, character.role];
    state.values.factions = [character.faction, character.rank].filter(Boolean);
    window.GameModules.progression.ensureStateMechanics(state, character);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    await window.GameModules.sqliteSave.saveCharacterState(state);
    return state;
  },

  async openIdentityApp(targetId = 'player-self') {
    this.appHasOpened = true;
    this.appSwitcherOpen = false;
    this.appClosing = false;
    this.wechatAppOpen = false;
    this.identityTargetId = targetId || 'player-self';
    this.identityAppOpen = true;
    this.desktopUnlocked = true;
    if (this.identityTargetId === 'player-self') await this.ensurePlayerRpgState();
    else if (!this.rpgStates[this.identityTargetId] && this.identityTargetId === this.character.id) await this.ensureRpgForCurrentCharacter();
  },

  openWechatApp() {
    this.appHasOpened = true;
    this.appSwitcherOpen = false;
    this.appClosing = false;
    this.identityAppOpen = false;
    this.wechatAppOpen = true;
    this.desktopUnlocked = true;
  },

  closeIdentityApp() {
    this.closeAppToDesktop();
  },

  wechatContacts() {
    const player = this.playerCharacter();
    const states = Object.values(this.rpgStates || {}).filter((state) => state.id !== 'player-self');
    const contacts = [{ id: 'player-self', name: player.name, mark: '我', subtitle: player.role || '手机主人' }];
    for (const state of states) contacts.push({ id: state.id, name: state.name, mark: String(state.name || '?').slice(0, 1), subtitle: state.profile?.role || state.worldTag || '聊天对象' });
    if (!contacts.some((item) => item.id === this.character.id)) contacts.push({ id: this.character.id, name: this.character.name, mark: this.character.mark || this.character.name.slice(0, 1), subtitle: this.character.role || '当前角色' });
    return contacts;
  },

  wechatSelected() {
    return this.wechatContacts().find((item) => item.id === this.wechatSelectedContact) || this.wechatContacts()[0];
  },

  selectWechatContact(id) {
    this.wechatSelectedContact = id || 'player-self';
  },

  async openWechatIdentity() {
    await this.openIdentityApp(this.wechatSelectedContact || 'player-self');
  },
};
