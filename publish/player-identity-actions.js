window.GameModules = window.GameModules || {};
window.GameModules.playerIdentityActions = {
  syncPlayerSocialFields(state = null) {
    const current = state || this.playerIdentityState?.();
    if (!current?.profile) return false;
    const tool = window.GameModules.characterProfile;
    if (!tool?.memberships && !tool?.factionRoles) return false;
    const base = { ...this.playerCharacterBase(), ...(current.profile || {}) };
    const nextFactions = tool.factionRoles?.(current.profile, base, this) || (Array.isArray(current.profile.factions) ? current.profile.factions : []);
    const nextMemberships = tool.memberships?.(current.profile, base, this) || (Array.isArray(current.profile.memberships) ? current.profile.memberships : []);
    const prevProfileFactions = Array.isArray(current.profile.factions) ? current.profile.factions : [];
    const prevProfileMemberships = Array.isArray(current.profile.memberships) ? current.profile.memberships : [];
    const prevValueFactions = Array.isArray(current.values?.factions) ? current.values.factions : [];
    const prevValueMemberships = Array.isArray(current.values?.memberships) ? current.values.memberships : [];
    const changed = JSON.stringify(prevProfileFactions) !== JSON.stringify(nextFactions)
      || JSON.stringify(prevProfileMemberships) !== JSON.stringify(nextMemberships)
      || JSON.stringify(prevValueFactions) !== JSON.stringify(nextFactions)
      || JSON.stringify(prevValueMemberships) !== JSON.stringify(nextMemberships);
    if (!changed) return false;
    current.profile.factions = nextFactions;
    current.profile.memberships = nextMemberships;
    current.values = current.values || {};
    current.values.factions = nextFactions;
    current.values.memberships = nextMemberships;
    window.GameModules.orgTerritory?.syncCharacterOrgMemberships?.(current, this);
    return true;
  },

  backfillPlayerMemberships(state = null) {
    return this.syncPlayerSocialFields?.(state) || false;
  },

  backfillPlayerFactions(state = null) {
    return this.syncPlayerSocialFields?.(state) || false;
  },

  playerCharacterBase() {
    const p = this.playerProfile || {};
    const world = window.GameModules.realWorld2026 || {};
    const name = p.name || this.playerName || 'player-self';
    const city = p.refinedCity || p.city || world.defaults?.city || 'unknown-city';
    const currentLocation = window.GameModules.currentLocationField?.fromProfile?.(p) || p.currentLocation || '';
    const role = p.refinedRole || p.dailyRole || world.defaults?.dailyRole || 'city-resident';
    const living = p.refinedLivingStatus || p.livingStatus || world.defaults?.livingStatus || 'unknown-living-status';
    const parents = p.parentStatus || p.parents || 'unknown-parent-status';
    const workplace = p.workplace || window.GameModules.socialPosition?.workplace(role, city) || city;
    const position = p.position || window.GameModules.socialPosition?.position(role) || living;
    const deathCause = p.parentDeathCause || 'unknown-parent-death-cause';
    const relations = p.relationships || 'relationships not filled yet';
    const notes = [p.worldbuildingNote, p.notes].filter(Boolean).join(' | ') || 'no extra notes';
    return {
      id: 'player-self',
      name,
      age: p.age || '',
      birthday: p.birthday || '',
      gender: p.gender || '',
      work: world.label || '2026 real-world',
      role,
      job: role,
      rank: position,
      faction: workplace,
      city,
      currentLocation,
      mapLocationName: window.GameModules.currentLocationField?.mapNodeName?.(currentLocation) || '',
      workplace,
      position,
      importance: 'main',
      isPlayer: true,
      items: p.items || [],
      wearing: p.wearing || [],
      detail: 'gender: ' + (p.gender || 'unknown') + '; age: ' + (p.age || 'unknown') + '; birthday: ' + (p.birthday || 'unknown') + '; currentLocation: ' + (currentLocation || 'unknown') + '; city: ' + city + '; workplace: ' + workplace + '; position: ' + position + '; living: ' + living + '; parents: ' + parents + '; death cause: ' + deathCause + '; relations: ' + relations + '; notes: ' + notes,
      personality: notes,
      skills: [
        { name: 'mobile-operation', desc: 'Can use a smartphone for communication, search, shooting, settings, app switching, and information handling.', reason: 'Granted by phone setup and real-world app entry flow.' },
        { name: 'real-world-observation', desc: 'Can judge the current situation from environmental changes and reactions of others.', reason: 'Needed for real-world identity and environment interaction.' }
      ]
    };
  },

  playerDisplayCharacter() {
    const saved = this.playerIdentityState?.()?.profile;
    if (saved?.roleCard) return saved;
    return { ...this.playerCharacterBase(), name: this.playerName || this.playerProfile?.name || 'player-self', pendingAiProfile: true };
  },

  playerCharacter() {
    const saved = this.playerIdentityState?.()?.profile;
    if (!saved?.roleCard) throw new Error('player profile has not been generated yet');
    window.GameModules.characterProfile.requireRpgFieldReasons(saved, saved.worldAttributes, saved.name || 'player-self');
    return saved;
  },

  playerIdentityState() { return this.rpgStates['player-self'] || null; },
  identityTargetState() { return this.rpgStates[this.identityTargetId || 'player-self'] || null; },
  identityTargetProfile() {
    const id = this.identityTargetId || 'player-self';
    if (id === 'player-self') return this.playerDisplayCharacter();
    return this.identityTargetState()?.profile || (id === this.character.id ? this.character : { name: 'unknown-character', work: 'unknown-world', role: 'unknown-role', detail: 'no role card yet', personality: '', pendingAiProfile: true });
  },

  identityTargetFields() {
    const p = this.identityTargetProfile();
    const worldTag = p.work || this.identityTargetState()?.worldTag || '原创世界';
    const reasonFor = this.roleCardReasonGetter?.(p) || (() => '');
    const row = (key, label, value, desc, extra = {}) => ({ key: `id-${this.identityTargetId || 'player-self'}-${key}`, stateId: this.identityTargetId || 'player-self', label, kind: '角色卡', value: value || '未记录', raw: value || '', desc, reason: reasonFor(label, key), worldTag, targetType: '角色', commonField: true, ...extra });
    const fields = [
      row('name', '姓名', p.name, '角色卡固化姓名。'),
      row('work', '所属世界', worldTag, '角色出身作品或世界。'),
      row('currentLocation', '当前位置', p.currentLocation, '玩家当前位置，格式为“势力·势力层级1·势力层级2·地点·地点内位置”；地点段直接作为电子地图节点名。'),
      row('role', '身份', p.role, '角色卡固化身份。'),
      row('appearance', '外貌', p.appearance, '角色卡固化外貌。'),
      row('preferences', '喜好', p.preferences, '角色稳定喜好和穿着偏好。'),
      row('personality', '性格', p.personality, '角色卡固化性格。'),
      row('job', '职业', p.job, '角色真实职业、训练身份或社会功能。'),
    ];
    const propertyInfo = this.identityTargetState()?.properties?.realWorldProperties || p.properties?.realWorldProperties || null;
    const formatPropertyPath = (item = {}) => item.path || item.name || item.nodeId || '未命名房产';
    const ownedProperties = Array.isArray(propertyInfo?.owned) ? propertyInfo.owned : [];
    const usingProperties = Array.isArray(propertyInfo?.using) ? propertyInfo.using : [];
    if (ownedProperties.length) {
      fields.push(row('owned-properties', '所有房产', ownedProperties.map((item) => {
        const rent = Number(item.monthlyRentIncome) || 0;
        const users = (Array.isArray(item.users) ? item.users : []).filter(Boolean).join('、') || '无';
        return `所有：${formatPropertyPath(item)}（标识:${item.nodeId || '未知'}，+${rent}租金（使用者:${users}））`;
      }).join('\n'), '地点图反向索引：该角色拥有或收款的房产/空间。', { profileGroup: '房产' }));
    }
    if (usingProperties.length) {
      fields.push(row('using-properties', '使用房产', usingProperties.map((item) => {
        const rent = Number(item.monthlyRentCost) || 0;
        const owners = (Array.isArray(item.owners) ? item.owners : []).filter(Boolean).join('、') || '未知';
        return `使用：${formatPropertyPath(item)}（标识:${item.nodeId || '未知'}，-${rent}租金（所属者:${owners}））`;
      }).join('\n'), '地点图反向索引：该角色正在使用或承租的房产/空间。', { profileGroup: '房产' }));
    }
    const prefTool = window.GameModules.playerAspirationPreferenceLayers;
    const layerSource = this.essentialPreferenceLayersForState?.(this.identityTargetState());
    if (layerSource) prefTool?.toLines?.(layerSource).forEach((line, index) => {
      const label = line.split(':')[0]?.trim() || '本质偏好';
      const desc = (this.identityTargetId || 'player-self') === 'player-self'
        ? '玩家本质偏好层；仅玩家可在人生取向向导中修改，推演不可更改。'
        : '角色本质偏好五层；角色卡固化后永久不可被推演修改。';
      fields.push(row(`pref-${index}`, label, line, desc, { profileGroup: '本质偏好', immutable: true }));
    });
    if ((this.identityTargetId || 'player-self') === 'player-self') {
      fields.push(...(this.playerAspirationLexiconFields?.().filter((item) => !prefTool?.isImmutableFieldName?.(item.label)) || []));
    }
    return fields;
  },

  ensureIdentityMetricSources(targetId = '') {
    const id = targetId || this.identityTargetId || 'player-self';
    return this.rpgStates?.[id] || null;
  },

  playerMemory() { return window.GameModules.characterMemory.ensure('player-self'); },
  playerMemoryItems(kind) {
    const memory = this.playerMemory();
    if (kind === 'shortTerm') return [...(memory.shortTerm?.recent || []), ...(memory.shortTerm?.summarized || [])];
    if (kind === 'longTerm') return [...(memory.longTerm?.vivid || []), ...(memory.longTerm?.permanent || [])];
    return [];
  },
  playerMemoryStatus(kind) {
    const memory = this.playerMemory();
    const m = window.GameModules.characterMemory;
    if (kind === 'shortTerm') return [m.statLine('刚发生记忆', m.stats(memory.shortTerm?.recent || [], m.limits.recent)), m.statLine('近发生记忆', m.stats(memory.shortTerm?.summarized || [], m.limits.summarized)), m.statLine('遗忘区', m.stats(memory.shortTerm?.forgotten || [], m.limits.forgotten))].join('｜');
    return [m.statLine('难以忘记', m.stats(memory.longTerm?.vivid || [], m.limits.vivid)), m.statLine('不可忘记', m.stats(memory.longTerm?.permanent || [], m.limits.permanent))].join('｜');
  },
  realWorldMemoryTargetId() {
    return this.sharedControlState?.()?.id || 'player-self';
  },
  realWorldMemory() {
    return window.GameModules.characterMemory.ensure(this.realWorldMemoryTargetId());
  },
  realWorldMemoryShortLabel() {
    return ({ recent: '刚发生记忆', summarized: '近发生记忆', forgotten: '遗忘区' })[this.realWorldMemoryShortTab] || '刚发生记忆';
  },
  realWorldMemoryLongLabel() {
    return ({ vivid: '难以忘记', permanent: '不可忘记' })[this.realWorldMemoryLongTab] || '难以忘记';
  },
  realWorldMemoryItems(kind) {
    const memory = this.realWorldMemory();
    if (kind === 'shortTerm') return memory.shortTerm?.[this.realWorldMemoryShortTab || 'recent'] || [];
    if (kind === 'longTerm') return memory.longTerm?.[this.realWorldMemoryLongTab || 'vivid'] || [];
    return [];
  },
  realWorldMemoryStatus(kind) {
    const m = window.GameModules.characterMemory;
    if (kind === 'shortTerm') return m.statLine(this.realWorldMemoryShortLabel(), m.stats(this.realWorldMemoryItems('shortTerm'), m.limits[this.realWorldMemoryShortTab || 'recent'] || m.limits.recent));
    return m.statLine(this.realWorldMemoryLongLabel(), m.stats(this.realWorldMemoryItems('longTerm'), m.limits[this.realWorldMemoryLongTab || 'vivid'] || m.limits.vivid));
  },
  async addPlayerManualMemory() {
    const text = (this.realWorldMemoryInput || '').trim();
    if (!text) return;
    const realStore = { ...this, sceneTitle: this.realWorldSceneTitle || '现实世界' };
    await window.GameModules.characterMemory.addManual(this.realWorldMemoryTargetId(), text, realStore);
    this.realWorldMemoryInput = '';
  },
  async searchPlayerMemoryArchive() {
    const query = (this.realWorldMemoryArchiveQuery || '').trim();
    if (!query) return;
    this.realWorldMemoryArchiveResults = await window.GameModules.characterMemory.queryArchive(this.realWorldMemoryTargetId(), query);
  },

  essentialPreferenceLayersForState(state = null) {
    try {
      const prefTool = window.GameModules.playerAspirationPreferenceLayers;
      if (!prefTool) return null;
      const resolved = state || this.identityTargetState();
      const id = resolved?.id || this.identityTargetId || 'player-self';
      if (id === 'player-self') {
        const profile = resolved?.profile;
        if (profile) return prefTool.ensureOnProfile(profile);
        const fromAspiration = this.playerAspiration?.essentialPreferenceLayers || prefTool.buildFromPlayerAspiration?.(this.playerAspiration);
        if (fromAspiration?.layer1) return prefTool.normalizeLayers(fromAspiration);
        return null;
      }
      const profile = resolved?.profile || (id === (this.identityTargetId || '') ? this.identityTargetProfile() : null);
      if (!profile || typeof profile !== 'object') return null;
      return prefTool.ensureOnProfile(profile);
    } catch (err) {
      console.warn('[identity] essential preference layers unavailable:', err?.message || err);
      return null;
    }
  },

  essentialPreferenceViewFromPlayerAspiration(view = null) {
    const data = view || this.playerAspirationView?.();
    if (!data) return null;
    return {
      alignmentLabel: data.alignmentLabel,
      rationality: data.rationality,
      rationalityLabel: data.rationalityLabel,
      axes: data.axes || [],
      guiltLines: data.guiltLines || [],
      psychGroups: (data.psychCategories || []).flatMap((category) => category.groups || []),
      footnote: 'Built from life-orientation choices and locked after role-card generation.'
    };
  }
};
