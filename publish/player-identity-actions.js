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
    const name = p.name || this.playerName || '鎵嬫満涓讳汉';
    const city = p.refinedCity || p.city || world.defaults?.city || '鏈瀹氬煄甯?;
    const role = p.refinedRole || p.dailyRole || world.defaults?.dailyRole || '鐜颁唬閮藉競灞呮皯';
    const living = p.refinedLivingStatus || p.livingStatus || world.defaults?.livingStatus || '鐢熸椿鐘舵€佹湭璁惧畾';
    const parents = p.parentStatus || p.parents || '鐖舵瘝宸叉晠';
    const workplace = p.workplace || window.GameModules.socialPosition?.workplace(role, city) || city;
    const position = p.position || window.GameModules.socialPosition?.position(role) || living;
    const deathCause = p.parentDeathCause || '鐖舵瘝鍘讳笘鍘熷洜鏈褰?;
    const relations = p.relationships || '浜洪檯鍏崇郴鐢辩帺瀹惰嚜琛岃瀹氾紝褰撳墠鏈～鍐?;
    const notes = [p.worldbuildingNote, p.notes].filter(Boolean).join('锛?) || '鏆傛棤琛ュ厖璁惧畾';
    return {
      id: 'player-self', name, age: p.age || '', birthday: p.birthday || '', gender: p.gender || '', work: world.label || '2026 鐜颁唬閮藉競鐜板疄涓栫晫', role, job: role,
      rank: position, faction: workplace, city, workplace, position, importance: 'main', isPlayer: true,
      items: p.items || [], wearing: p.wearing || [],
      detail: `鎬у埆锛?{p.gender || '鏈煡'}锛涘勾榫勶細${p.age || '鏈煡'}锛涚敓鏃ワ細${p.birthday || '鏈煡'}锛涘叿浣撳湴鍧€锛?{city}锛涗汉浜嬪綊灞烇細${workplace}/${position}锛涚ぞ缇よ鑹诧細${city}/灞呮皯锛涘眳浣忥細${living}锛涚埗姣嶏細${parents}锛涘幓涓栧師鍥狅細${deathCause}锛涘叧绯伙細${relations}锛涘娉細${notes}`,
      personality: notes,
      skills: [
        { name: '鎵嬫満鎿嶄綔', desc: '鑳藉浣跨敤鏅鸿兘鎵嬫満瀹屾垚閫氳銆佹绱€佹媿鎽勩€佽缃€佸簲鐢ㄥ垏鎹㈠拰淇℃伅澶勭悊绛夋搷浣溿€?, reason: '鐜╁閫氳繃鏂版墜鏈烘縺娲诲拰鐜板疄搴旂敤鍏ュ彛鑾峰緱璇ュ熀纭€鎿嶄綔鑳藉姏銆? },
        { name: '鐜板疄瑙傚療', desc: '閫氳繃缁嗚妭銆佺幆澧冨彉鍖栧拰浠栦汉鍙嶅簲鍒ゆ柇灞€鍔跨殑鑳藉姏銆?, reason: '鐜╁鍦ㄧ幇瀹炶韩浠戒笌鐜浜や簰涓渶瑕佽瀵熷湴鐐广€佽仈绯讳汉鍜岀郴缁熷弽棣堛€? },
      ],
    };
  },
  playerDisplayCharacter() {
    const saved = this.playerIdentityState?.()?.profile;
    if (saved?.roleCard) return saved;
    return { ...this.playerCharacterBase(), name: this.playerName || this.playerProfile?.name || '鎵嬫満涓讳汉', pendingAiProfile: true };
  },
  playerCharacter() {
    const saved = this.playerIdentityState?.()?.profile;
    if (!saved?.roleCard) throw new Error('鐜╁鏈汉涓汉璧勬枡灏氭湭鐢盇I鐢熸垚锛屼笉鑳借鍙栨湰鍦板厹搴曟ā鏉裤€?);
    window.GameModules.characterProfile.requireRpgFieldReasons(saved, saved.worldAttributes, saved.name || '鐜╁鏈汉');
    return saved;
  },
  playerIdentityState() { return this.rpgStates['player-self'] || null; },
  identityTargetState() { return this.rpgStates[this.identityTargetId || 'player-self'] || null; },
  identityTargetProfile() {
    const id = this.identityTargetId || 'player-self';
    if (id === 'player-self') return this.playerDisplayCharacter();
    return this.identityTargetState()?.profile || (id === this.character.id ? this.character : { name: '鏈煡瑙掕壊', work: '鏈煡涓栫晫', role: '韬唤鏈煡', detail: '鏆傛棤瑙掕壊鍗°€?, personality: '', pendingAiProfile: true });
  },
  essentialPreferenceLayersForState(state = null) {
    try {
      const prefTool = window.GameModules.playerAspirationPreferenceLayers;
      if (!prefTool) return null;
      const resolved = state || this.identityTargetState();
      const id = resolved?.id || this.identityTargetId || 'player-self';
      if (id === 'player-self') {
        const fromAspiration = this.playerAspiration?.essentialPreferenceLayers
          || prefTool.buildFromPlayerAspiration?.(this.playerAspiration);
        if (fromAspiration?.layer1) return prefTool.normalizeLayers(fromAspiration);
        const profile = resolved?.profile;
        if (profile) return prefTool.ensureOnProfile(profile);
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
      footnote: '鏉ヨ嚜浜虹敓鍙栧悜鍚戝鐨勯€夋嫨锛涙湰璐ㄥ亸濂戒簲灞傚浐鍖栧悗鎺ㄦ紨涓嶅彲淇敼銆?,
    };
  },

  essentialPreferenceViewForState(state = null) {
    try {
      const resolved = state || this.identityTargetState();
      const id = resolved?.id || this.identityTargetId || 'player-self';
      if (id === 'player-self' && this.hasPlayerAspiration?.()) {
        return this.essentialPreferenceViewFromPlayerAspiration?.();
      }
      const prefTool = window.GameModules.playerAspirationPreferenceLayers;
      const layers = this.essentialPreferenceLayersForState?.(resolved);
      const view = prefTool?.viewFromLayers?.(layers);
      if (view) view.footnote = '瑙掕壊鏈川鍋忓ソ浜斿眰鍦ㄨ鑹插崱鐢熸垚鏃跺浐鍖栵紝鎺ㄦ紨涓嶅彲淇敼銆?;
      return view || null;
    } catch (err) {
      console.warn('[identity] essential preference view unavailable:', err?.message || err);
      return null;
    }
  },

  identityEssentialPreferenceLayers() {
    return this.essentialPreferenceLayersForState?.(this.identityTargetState());
  },

  identityEssentialPreferenceView() {
    return this.essentialPreferenceViewForState?.(this.identityTargetState());
  },

  identityTargetFields() {
    const p = this.identityTargetProfile();
    const worldTag = p.work || this.identityTargetState()?.worldTag || '鍘熷垱涓栫晫';
    const reasonFor = this.roleCardReasonGetter(p);
    const row = (key, label, value, desc, extra = {}) => ({ key: `id-${this.identityTargetId}-${key}`, stateId: this.identityTargetId || 'player-self', label, kind: '瑙掕壊鍗?, value: value || '鏈褰?, raw: value || '', desc, reason: reasonFor(label, key), worldTag, targetType: '瑙掕壊', commonField: true, ...extra });
    const fields = [
      row('name', '濮撳悕', p.name, '瑙掕壊鍗″浐鍖栧鍚嶃€?),
      row('work', '鎵€灞炰笘鐣?, worldTag, '瑙掕壊鍑鸿韩浣滃搧鎴栦笘鐣屻€?),
      row('role', '韬唤', p.role, '瑙掕壊鍗″浐鍖栬韩浠姐€?),
      row('appearance', '澶栬矊', p.appearance, '瑙掕壊鍗″浐鍖栧璨屻€?),
      row('preferences', '鍠滃ソ', p.preferences, '瑙掕壊绋冲畾鍠滃ソ鍜岀┛鐫€鍋忓ソ銆?),
      row('personality', '鎬ф牸', p.personality, '瑙掕壊鍗″浐鍖栨€ф牸銆?),
      row('job', '鑱屼笟', p.job, '瑙掕壊鐪熷疄鑱屼笟銆佽缁冭韩浠芥垨绀句細鍔熻兘銆?),
    ];
    const prefTool = window.GameModules.playerAspirationPreferenceLayers;
    const layerSource = this.essentialPreferenceLayersForState?.(this.identityTargetState());
    if (layerSource) prefTool?.toLines?.(layerSource).forEach((line, index) => {
      const label = line.split(':')[0]?.trim() || '鏈川鍋忓ソ';
      const desc = (this.identityTargetId || 'player-self') === 'player-self'
        ? '鐜╁鏈川鍋忓ソ灞傦紱浠呯帺瀹跺彲鍦ㄤ汉鐢熷彇鍚戝悜瀵间腑淇敼锛屾帹婕斾笉鍙洿鏀广€?
        : '瑙掕壊鏈川鍋忓ソ浜斿眰锛涜鑹插崱鍥哄寲鍚庢案涔呬笉鍙鎺ㄦ紨淇敼銆?;
      fields.push(row(`pref-${index}`, label, line, desc, { profileGroup: '鏈川鍋忓ソ', immutable: true }));
    });
    if ((this.identityTargetId || 'player-self') === 'player-self') {
      fields.push(...(this.playerAspirationLexiconFields?.().filter((item) => !prefTool?.isImmutableFieldName?.(item.label)) || []));
    }
    return fields;
  },

  playerIdentitySummary() {
    const v = this.playerIdentityState()?.values || {};
    if (!v.level) return '鐜╁鏈汉灞炴€у皻鏈敓鎴愩€?;
    const names = (list) => (list || []).map((item) => item?.slot ? `${item.slot}:${item.name || '鏈┛鎴?}` : (item?.name || item)).slice(0, 16).join('銆?) || '鏃?;
    return `鎬у埆${this.playerProfile.gender || '鏈煡'}锝滃勾榫?{v.age ?? this.playerProfile.age ?? '鏈煡'}锝滅瓑绾?{v.level}锝滅粡楠?{v.exp?.current || 0}/${v.exp?.next || 'max'}锝滃姏閲?{v.strength}锝滄晱鎹?{v.agility}锝滀綋璐?{v.constitution}锝滄櫤鍔?{v.intelligence}锝滄劅鐭?{v.perception}锝滄剰蹇?{v.willpower}锝滈瓍鍔?{v.charisma}锝滅墿鍝?{names(v.items)}锝滅┛鐫€${names(v.wearing)}`;
  },
  playerMemory() { return window.GameModules.characterMemory.ensure('player-self'); },
  playerMemoryItems(kind) {
    const memory = this.playerMemory();
    if (kind === 'shortTerm') return [...(memory.shortTerm.recent || []), ...(memory.shortTerm.summarized || [])];
    if (kind === 'longTerm') return [...(memory.longTerm.vivid || []), ...(memory.longTerm.permanent || [])];
    return [];
  },
  playerMemoryStatus(kind) {
    const memory = this.playerMemory();
    const m = window.GameModules.characterMemory;
    if (kind === 'shortTerm') return [m.statLine('鍒氬彂鐢熻蹇?, m.stats(memory.shortTerm.recent, m.limits.recent)), m.statLine('杩戝彂鐢熻蹇?, m.stats(memory.shortTerm.summarized, m.limits.summarized)), m.statLine('閬楀繕鍖?, m.stats(memory.shortTerm.forgotten, m.limits.forgotten))].join('锝?);
    return [m.statLine('闅句互蹇樿', m.stats(memory.longTerm.vivid, m.limits.vivid)), m.statLine('涓嶅彲蹇樿', m.stats(memory.longTerm.permanent, m.limits.permanent))].join('锝?);
  },
  realWorldMemoryTargetId() {
    return this.sharedControlState?.()?.id || 'player-self';
  },
  realWorldMemory() {
    return window.GameModules.characterMemory.ensure(this.realWorldMemoryTargetId());
  },
  realWorldMemoryShortLabel() {
    return ({ recent: '鍒氬彂鐢熻蹇?, summarized: '杩戝彂鐢熻蹇?, forgotten: '閬楀繕鍖? })[this.realWorldMemoryShortTab] || '鍒氬彂鐢熻蹇?;
  },
  realWorldMemoryLongLabel() {
    return ({ vivid: '闅句互蹇樿', permanent: '涓嶅彲蹇樿' })[this.realWorldMemoryLongTab] || '闅句互蹇樿';
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
    const text = this.realWorldMemoryInput.trim();
    if (!text) return;
    const realStore = { ...this, sceneTitle: this.realWorldSceneTitle || '鐜板疄涓栫晫' };
    await window.GameModules.characterMemory.addManual(this.realWorldMemoryTargetId(), text, realStore);
    this.realWorldMemoryInput = '';
  },
  async searchPlayerMemoryArchive() {
    const query = this.realWorldMemoryArchiveQuery.trim();
    if (!query) return;
    this.realWorldMemoryArchiveResults = await window.GameModules.characterMemory.queryArchive(this.realWorldMemoryTargetId(), query);
  },
  async ensurePlayerRpgState(refresh = false, forceRoleCardRegenerate = false, retrySource = null) {
    if (!window.GameModules.platform.storage.capabilities.isReady?.()) return this.playerIdentityState();
    const existing = this.playerIdentityState();
    if (!refresh && existing) {
      let changed = false;
      const expectedName = this.playerProfile?.name || this.playerName || '';
      if (expectedName && existing.profile?.name !== expectedName) {
        existing.name = expectedName;
        existing.profile = { ...(existing.profile || {}), id: 'player-self', name: expectedName, isPlayer: true };
        changed = true;
      }
      try {
        window.GameModules.characterProfile.requireRpgFieldReasons(existing.profile, existing.profile?.worldAttributes, existing.profile?.name || '鐜╁鏈汉');
      } catch (err) {
        console.warn('[鐜╁韬唤] 宸蹭繚瀛樹釜浜鸿祫鏂欑己灏慉I鍙樺寲鍘熷洜锛屾嫆缁濅娇鐢ㄦ湰鍦板厹搴?', err.message, err.stack);
        this.setupError = `鐜╁鏈汉璧勬枡闇€瑕侀噸鏂扮敓鎴愶細${err.message || '缂哄皯AI鍙樺寲鍘熷洜'}`;
        throw err;
      }
      if (window.GameModules.progression.ensureStateMechanics(existing, existing.profile)) changed = true;
      if (window.GameModules.initPromptRegistry?.ensureTemplateState?.('intimacyBody', existing)) changed = true;
      if (this.hasPlayerAspiration?.()) {
        const tool = window.GameModules.playerAspirationPreferenceLayers;
        const layers = tool?.buildFromPlayerAspiration?.(this.playerAspiration);
        if (layers?.layer1 && !existing.profile?.essentialPreferenceLayers?.layer1) {
          tool.applyToProfile(existing.profile, layers, { locked: true });
          changed = true;
        }
      }
      if (window.GameModules.predefinedRoleCards?.upgradeSavedProfileAppearance?.(existing.profile)) changed = true;
      if (this.syncPlayerSocialFields?.(existing)) changed = true;
      if (changed) await window.GameModules.characterStateStore?.save?.(existing);
      return existing;
    }
    let character;
    if (this.roleCardSetup?.usePredefinedPlayerCard && window.GameModules.predefinedRoleCards) {
      const predefined = await window.GameModules.predefinedRoleCards.ensurePlayerState(this);
      if (predefined) return predefined;
    }
    try {
      const base = { ...this.playerCharacterBase(), ...(retrySource || {}), forceRoleCardRegenerate: forceRoleCardRegenerate || Boolean(retrySource?.forceRoleCardRegenerate) };
      const playerCard = {
        id: 'player-self',
        name: base.name || this.playerName || '鐜╁',
        type: '鐜╁鍗?,
        source: base,
        context: this.playerSetupSummary?.() || '鐜╁鏈汉璧勬枡',
      };
      if ((this.roleCardLoadingState?.cards || []).some((card) => card.id === 'player-self')) {
        this.updateRoleCardLoading?.('player-self', { source: base, context: playerCard.context, status: 'running', startedAt: Date.now() });
      } else {
        this.startRoleCardLoadingBatch?.([playerCard]);
      }
      character = await window.GameModules.characterProfile.ensure(base, this, this.playerSetupSummary?.() || '鐜╁鏈汉璧勬枡');
    } catch (err) {
      console.warn('[鐜╁韬唤] 涓汉璧勬枡鐢熸垚澶辫触锛屾嫆缁濅娇鐢ㄦ湰鍦板師鍥犲厹搴?', err.code, err.message, err.stack);
      this.setupError = `鐜╁鏈汉璧勬枡鐢熸垚澶辫触锛?{err.message || 'AI鏆傛椂涓嶅彲鐢?}`;
      throw err;
    }
    character.id = 'player-self';
    character.name = this.playerProfile?.name || this.playerName || character.name;
    character.isPlayer = true;
    this.initFactionSystem?.();
    this.updateRoleCardLoadingStep?.('player-self', 'state', 'running', '', { done: 0, total: 1 });
    const state = await window.GameModules.rpgState.ensureCharacter(character, this);
    state.profile = character;
    state.note = character.detail;
    state.values.age = Number.isFinite(Number(character.age)) ? Number(character.age) : state.values.age;
    state.values.status_tags = ['鐜╁鏈汉', '鎵嬫満涓讳汉', character.work, character.role];
    if (!state.values.items?.length) state.values.items = character.items || [];
    window.GameModules.progression.syncInventoryFromProfile?.(state, character);
    state.values.factions = Array.isArray(character.factions) ? character.factions : [];
    state.values.memberships = Array.isArray(character.memberships) ? character.memberships : [];
    this.syncPlayerSocialFields?.(state);
    window.GameModules.progression.ensureStateMechanics(state, character);
    window.GameModules.initPromptRegistry?.ensureTemplateState?.('intimacyBody', state);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    await window.GameModules.characterStateStore?.save?.(state);
    this.finishRoleCardLoading?.('player-self', state.profile || character);
    return state;
  },

  syncIdentityMetricNotes(state, profile) {
    if (!state?.metrics || !profile?.initialMetrics) return false;
    const before = JSON.stringify(state.metrics.notes || {});
    state.metrics.notes = state.metrics.notes || {};
    const sync = (items, values, keys, group) => (Array.isArray(items) ? items : []).forEach((item) => {
      if (!keys.includes(item?.key)) return;
      const value = window.GameModules.metrics.clamp(values?.[item.key] ?? item.value);
      const rawStatus = String(item.status || '').trim();
      const rawReason = String(item.reason || '').trim();
      const status = String(window.GameModules.metrics.resolveMetricStatus(item.key, value, rawStatus)).slice(0, 180);
      const sources = window.GameModules.characterProfile?.metricSources?.(item, '绯荤粺') || { 鏁板€? '绯荤粺', 瑙ｉ噴: '绯荤粺', 鍘熷洜: '绯荤粺' };
      const noteKey = `${group}:${item.key}`;
      const previous = state.metrics.notes[noteKey] || {};
      const previousSources = previous.metricSources || {};
      if (previous.reason && previousSources.鍘熷洜 === 'AI') return;
      const statusFromAi = Boolean(rawStatus) && !window.GameModules.metrics.isGenericMetricStatus(rawStatus, item.key);
      state.metrics.notes[noteKey] = {
        stage: window.GameModules.metrics.stageFor(item.key, value),
        status,
        reason: rawReason.slice(0, 180),
        description: String(window.GameModules.metrics.descriptions[item.key] || item.key).slice(0, 120),
        metricSources: { 鏁板€? sources.鏁板€? 瑙ｉ噴: statusFromAi ? 'AI' : '绯荤粺', 鍘熷洜: sources.鍘熷洜 === 'AI' && rawReason ? 'AI' : '绯荤粺' },
      };
    });
    sync(profile.initialMetrics.emotions, state.metrics.emotions, window.GameModules.metrics.emotionKeys, 'emotion');
    sync(profile.initialMetrics.playerFeelings, state.metrics.playerFeelings, window.GameModules.metrics.playerKeys, 'player');
    return before !== JSON.stringify(state.metrics.notes || {});
  },

  async ensureIdentityMetricSources(targetId = 'player-self') {
    if (!window.GameModules.sqliteSave?.db) return;
    const id = targetId || 'player-self';
    const state = this.rpgStates?.[id] || window.GameModules.characterStateStore?.get?.(id);
    const tool = window.GameModules.characterProfile;
    if (!state?.profile || !tool?.ensureInitialMetricSources) return;
    const before = JSON.stringify(state.profile.initialMetrics || {});
    const previousProfile = state.profile;
    const context = [state.profile.detail, state.profile.personality, state.note].filter(Boolean).join('锛?);
    try {
      state.profile = await tool.ensureInitialMetricSources(state.profile, state.profile, context, this);
      const profileChanged = before !== JSON.stringify(state.profile.initialMetrics || {});
      if (profileChanged) window.GameModules.rpgProfileMetrics?.rebase?.(state, state.profile, previousProfile);
      const notesChanged = this.syncIdentityMetricNotes(state, state.profile);
      if (!profileChanged && !notesChanged) return;
      state.id = state.id || id;
      await window.GameModules.characterStateStore?.save?.(state);
      this.rpgStates = { ...(this.rpgStates || {}), [state.id]: state };
      if (id === this.character?.id) this.character = state.profile;
    } catch (err) {
      console.warn('[韬唤璇乚 瑙掕壊鏁板€兼潵婧愭鏌ュけ璐?', err.code, err.message, err.stack);
    }
  },


};


