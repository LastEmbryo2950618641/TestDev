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
      id: 'player-self', name, age: p.age || '', birthday: p.birthday || '', work: world.label || '2026 现代都市现实世界', role, job: role,
      rank: living, faction: city, importance: 'main', isPlayer: true,
      detail: `年龄：${p.age || '未知'}；生日：${p.birthday || '未知'}；具体地址：${city}；居住：${living}；父母：${parents}；去世原因：${deathCause}；关系：${relations}；备注：${notes}`,
      personality: notes,
      skills: [
        { name: '手机操作', desc: '熟悉现代智能手机与移动互联网基础操作。' },
        { name: '现实观察', desc: '根据现代都市生活经验观察环境与人际线索。' },
        { name: role, desc: `来自玩家填写并补全的现实身份：${role}` },
      ],
    };
  },

  playerIdentityState() {
    return this.rpgStates['player-self'] || null;
  },

  playerIdentitySummary() {
    const v = this.playerIdentityState()?.values || {};
    if (!v.level) return '玩家本人属性尚未生成。';
    return `年龄${v.age ?? this.playerProfile.age ?? '未知'}｜等级${v.level}｜经验${v.exp?.current || 0}/${v.exp?.next || 'max'}｜力量${v.strength}｜敏捷${v.agility}｜体质${v.constitution}｜智力${v.intelligence}｜感知${v.perception}｜意志${v.willpower}｜魅力${v.charisma}`;
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

  async openIdentityApp() {
    this.appHasOpened = true;
    this.appSwitcherOpen = false;
    this.appClosing = false;
    this.identityAppOpen = true;
    this.desktopUnlocked = true;
    await this.ensurePlayerRpgState();
  },

  closeIdentityApp() {
    this.identityAppOpen = false;
    this.desktopUnlocked = false;
  },
};
