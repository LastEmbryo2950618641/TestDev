window.GameModules = window.GameModules || {};

window.GameModules.characterQuery = {
  worldOf(store = null, params = {}) {
    return String(params.worldTag || params.world || params.work || store?.character?.work || window.GameModules.realWorld2026?.label || '未知世界').slice(0, 40);
  },

  stateByName(store = null, name = '', worldTag = '') {
    const key = String(name || '').trim();
    if (!key) return null;
    const saved = window.GameModules.sqliteSave?.getCharacterStateByName?.(key, worldTag);
    if (saved) return saved;
    return Object.values(store?.rpgStates || {}).find((state) => {
      const profile = state?.profile || {};
      const sameName = state?.name === key || profile.name === key || state?.id === key;
      const sameWorld = !worldTag || state?.worldTag === worldTag || profile.work === worldTag;
      return sameName && sameWorld;
    }) || null;
  },

  introByName(name = '', worldTag = '') {
    const key = String(name || '').trim();
    if (!key) return null;
    return window.GameModules.sqliteSave?.getCharacterIntro?.(key, worldTag) || null;
  },

  query(store = null, method = '', params = {}) {
    if (method === 'listKnownCharacters') return this.listKnownCharacters(store, params);
    return this.searchCharacter(store, params);
  },

  searchCharacter(store = null, params = {}) {
    const name = String(params.name || params.keyword || params.characterName || '').trim();
    const worldTag = this.worldOf(store, params);
    if (!name) return '未提供角色名，无法查询角色资料。';
    const state = this.stateByName(store, name, worldTag);
    if (state) return this.stateText(state, worldTag);
    const intro = this.introByName(name, worldTag);
    if (intro) return this.introText(intro);
    return `未找到角色资料：${name}｜世界：${worldTag}。若正文确认该人物存在，请在结算 JSON 的 appearedCharacters 写入 name、role、intro、work；若值得手动固化，同时写入 solidifiableCharacters。`;
  },

  listKnownCharacters(store = null, params = {}) {
    const worldTag = this.worldOf(store, params);
    const states = (window.GameModules.sqliteSave?.listCharacterStates?.() || []).filter((state) => !worldTag || state.worldTag === worldTag);
    const intros = (window.GameModules.sqliteSave?.listCharacterIntros?.() || []).filter((card) => !worldTag || card.worldTag === worldTag);
    const rows = [
      ...states.slice(0, 12).map((state) => `角色卡｜${state.name || state.profile?.name || state.id}｜${state.worldTag || worldTag}｜${state.profile?.role || state.profile?.detail || '完整资料已固化'}`),
      ...intros.slice(0, 12).map((card) => `介绍卡｜${card.name}｜${card.worldTag || worldTag}｜${card.role || ''}｜${card.intro || ''}`),
    ];
    return rows.join('\n') || `世界 ${worldTag} 暂无角色卡或介绍卡。`;
  },

  stateText(state = {}, fallbackWorld = '') {
    const profile = state.profile || {};
    const values = state.values || {};
    const skills = Array.isArray(values.skills) ? values.skills.map((x) => x.name || x).filter(Boolean).slice(0, 6).join('、') : '';
    return [
      `资料类型：角色卡`,
      `姓名：${state.name || profile.name || state.id || '未知'}`,
      `世界：${state.worldTag || profile.work || fallbackWorld || '未知世界'}`,
      `身份：${profile.role || profile.detail || '未知'}`,
      `说明：${profile.detail || profile.personality || '完整角色卡已存在。'}`,
      skills ? `技能：${skills}` : '',
    ].filter(Boolean).join('\n');
  },

  introText(card = {}) {
    return [`资料类型：介绍卡`, `姓名：${card.name}`, `世界：${card.worldTag || '未知世界'}`, `身份：${card.role || '出场人物'}`, `介绍：${card.intro || '暂无介绍。'}`].join('\n');
  },
};
