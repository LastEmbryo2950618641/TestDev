window.GameModules = window.GameModules || {};
window.GameModules.playerIdentityActions = {
  syncPlayerSocialFields(state = null) {
    const current = state || this.playerIdentityState?.();
    if (!current?.profile) return false;
    const tool = window.GameModules.characterProfile;
    if (!tool?.memberships && !tool?.factionRoles) return false;
    const base = { ...(current.profile || {}) };
    const nextFactions = tool.factionRoles?.(current.profile, base, this) || (Array.isArray(current.profile.factions) ? current.profile.factions : []);
    const nextMemberships = tool.memberships?.(current.profile, base, this) || (Array.isArray(current.profile.memberships) ? current.profile.memberships : []);
    const prevProfileFactions = Array.isArray(current.profile.factions) ? current.profile.factions : [];
    const prevProfileMemberships = Array.isArray(current.profile.memberships) ? current.profile.memberships : [];
    const changed = JSON.stringify(prevProfileFactions) !== JSON.stringify(nextFactions)
      || JSON.stringify(prevProfileMemberships) !== JSON.stringify(nextMemberships);
    if (!changed) return false;
    current.profile.factions = nextFactions;
    current.profile.memberships = nextMemberships;
    const synced = window.GameModules.rpgState?.syncSocialFields?.(current, 'profile', this);
    if (typeof synced === 'boolean') return changed || synced;
    window.GameModules.orgTerritory?.syncCharacterOrgMemberships?.(current, this);
    window.GameModules.rpgState?.stripProfileOwnedValues?.(current);
    return changed;
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
      appearance: p.appearance || '',
      preferences: p.preferences || '',
      personality: p.personality || '',
      skills: [
        { name: 'mobile-operation', desc: 'Can use a smartphone for communication, search, shooting, settings, app switching, and information handling.', reason: 'Granted by phone setup and real-world app entry flow.' },
        { name: 'real-world-observation', desc: 'Can judge the current situation from environmental changes and reactions of others.', reason: 'Needed for real-world identity and environment interaction.' }
      ]
    };
  },

  playerDisplayCharacter() {
    const saved = this.playerIdentityState?.()?.profile;
    if (saved?.roleCard) return saved;
    return { id: 'player-self', name: 'player-self', work: this.selectedWork || '原创世界', role: '', job: '', currentLocation: '', pendingRoleCard: true };
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
    if (id === 'player-self') return this.playerIdentityState?.()?.profile || this.playerDisplayCharacter();
    return this.identityTargetState()?.profile || (id === this.character.id ? this.character : { name: 'unknown-character', work: 'unknown-world', role: 'unknown-role', detail: 'no role card yet', personality: '', pendingAiProfile: true });
  },

  identityTargetFields() {
    const locField = window.GameModules.currentLocationField;
    const storeApi = window.GameModules.characterStateStore;
    const targetId = this.identityTargetId || 'player-self';
    const live = storeApi?.get?.(targetId, this) || this.identityTargetState();
    if (live && this.rpgStates && this.rpgStates[targetId] !== live) {
      this.rpgStates[targetId] = live;
    }
    const p = live?.profile || this.identityTargetProfile();
    const state = live || this.identityTargetState();
    const worldTag = p.work || state?.worldTag || '原创世界';
    const reasonFor = this.roleCardReasonGetter?.(p) || (() => '');
    const cardLocationText = locField?.displayFromCharacterState?.(state)
      || String(p?.currentLocation || '').trim();
    const locationText = cardLocationText || '';
    if (state?.values && Object.prototype.hasOwnProperty.call(state.values, 'current_location')) {
      if (state.values && Object.prototype.hasOwnProperty.call(state.values, 'current_location')) delete state.values.current_location;
      storeApi?.mergeOntoLive?.(state, this);
    }
    const row = (key, label, value, desc, extra = {}) => ({ key: `id-${targetId}-${key}`, stateId: targetId, label, kind: '角色卡', value: value || '未记录', raw: value || '', desc, reason: reasonFor(label, key), worldTag, targetType: '角色', commonField: true, ...extra });
    const listRow = (key, label, value, desc, extra = {}) => {
      const list = Array.isArray(value) ? value : [];
      return row(key, label, list, desc, { raw: list, profileListKey: key, ...extra });
    };
    const fields = [
      row('name', '姓名', p.name, '角色卡固化姓名。'),
      row('presenceKind', '人物形态', window.GameModules.characterSocialDrive?.presenceKindLabel?.(p.presenceKind) || '具体的一个人', '具体的一个人＝个人档案；一类人＝团体原型，字段表示群体意识，行动视为团队行动。'),
      row('work', '所属世界', worldTag, '角色出身作品或世界。'),
      row('currentLocation', '当前位置', locationText, '角色卡当前位置；格式为[势力层级链...]·地点·地点内位置（倒数第2段=地图节点，最后1段=尽量精确的室内位置）。'),
      row('age', '年龄', p.age && typeof p.age === 'object' ? p.age.value : p.age, '角色卡固化年龄。'),
      row('gender', '性别', p.gender, '角色卡固化性别。'),
      row('birthday', '生日', p.birthday, '角色卡固化生日。'),
      row('role', '身份', p.role, '角色卡固化身份。'),
      row('relationships', '人际关系', p.relationships, '关系必须使用“关系：姓名”的格式。'),
      row('appearance', '外貌', p.appearance, '角色卡固化外貌。'),
      row('preferences', '喜好', p.preferences, '角色稳定喜好和穿着偏好。'),
      row('personality', '性格', p.personality, '角色卡固化性格。'),
      row('job', '职业', p.job, '角色真实职业、训练身份或社会功能。'),
      listRow('factions', '社群角色', p.factions, '角色在家庭、社区、朋友圈、兴趣小组或临时群体等软性社会关系网中的位置。'),
      listRow('memberships', '人事归属', p.memberships, '角色在学校、公司、机关、国家等可指认组织中的正式或准正式身份。'),
      listRow('certificates', '证书', p.certificates, '某个组织或势力对人物在某个领域的资格认证；显示为“组织 / 领域 / 资格认证等级”。'),
      listRow('titles', '称号', p.titles, '社会群体对人物成就、名望或过往功绩的认可；显示为“社会群体 / 领域 / 称号名”。'),
    ];
    // 日常驱动（Part8 socialDrive）：身份证单独分区展示
    if ((this.identityTargetId || 'player-self') !== 'player-self') {
      const drive = window.GameModules.characterSocialDrive?.normalizeForRoleCard?.(p.socialDrive || {}, {
        id: targetId,
        name: p.name,
        isPlayer: false,
      }) || p.socialDrive || {};
      const agenda = drive.agenda || {};
      const reachText = Array.isArray(drive.reach) && drive.reach.length ? drive.reach.join('、') : '未记录';
      const channelLabel = { wechat: '微信', call: '电话', scene: '当面', none: '无' }[drive.lastContactChannel] || (drive.lastContactChannel || '无');
      fields.push(
        row('sd-relation', '与主角关系', drive.relationToPlayer, '日常主动找人的关系门闩叙述。', { profileGroup: '社交驱动' }),
        row('sd-relation-detail', '关系说明', drive.relationDetail, '关系细节补充。', { profileGroup: '社交驱动' }),
        row('sd-familiarity', '熟识度', drive.familiarity != null ? String(drive.familiarity) : '', '0-100；影响是否进入 Social Inbox。', { profileGroup: '社交驱动' }),
        row('sd-reach', '可达渠道', reachText, '可主动联络的渠道：微信/电话/当面。', { profileGroup: '社交驱动' }),
        row('sd-last-contact', '上次沟通', drive.lastContactAt, '最近一次主动或被联络时间。', { profileGroup: '社交驱动' }),
        row('sd-last-channel', '沟通渠道', channelLabel, '上次沟通使用的渠道。', { profileGroup: '社交驱动' }),
        row('sd-agenda', '当前事务', agenda.short, '对方自己的事（议程），非玩家主线。', { profileGroup: '社交驱动' }),
        row('sd-need-player', '是否需要主角', agenda.needPlayer ? `是｜${agenda.needPlayerWhy || '未说明理由'}` : '否', 'needPlayer 与理由。', { profileGroup: '社交驱动' }),
        row('sd-urgency', '紧迫度', agenda.needPlayer || agenda.urgency ? String(agenda.urgency ?? 0) : '', '0-1；越高越优先入队。', { profileGroup: '社交驱动' }),
        row('sd-deadline', '事务期限', agenda.deadline, '议程截止日期。', { profileGroup: '社交驱动' }),
        row('sd-cooldown', '联络冷却至', agenda.cooldownUntil, '冷却结束前降低再次主动概率。', { profileGroup: '社交驱动' }),
      );
    }
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
    const goalApi = window.GameModules.characterGoalSystem;
    if (goalApi && p) {
      const aspiration = (this.identityTargetId || 'player-self') === 'player-self'
        ? (this.activePlayerLifeOrientation?.() || this.playerAspiration || null)
        : (p.lifeOrientation || null);
      const goalBundleField = fields.find((item) => String(item?.label || '').trim() === '目标');
      const goalSystem = goalApi.ensureOnProfile(p, [
        aspiration,
        aspiration?.goals,
        aspiration?.goalSystem,
        aspiration?.goalSummary || '',
        goalBundleField?.value || goalBundleField?.raw || '',
        p.lifeOrientation,
      ].filter(Boolean));
      // Drop legacy「目标」bundle; structured tiers live under profileGroup「长期目标」.
      const withoutBundle = fields.filter((item) => String(item?.label || '').trim() !== '目标');
      fields.length = 0;
      fields.push(...withoutBundle, ...goalApi.lexiconFields(goalSystem, { targetId, worldTag }));
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
      const aspiration = id === 'player-self'
        ? (this.activePlayerLifeOrientation?.() || this.playerAspiration || null)
        : (resolved?.profile?.lifeOrientation || null);
      if (id === 'player-self') {
        const profile = resolved?.profile;
        if (profile) {
          const layers = prefTool.ensureOnProfile(profile, aspiration);
          const layer5Body = prefTool.stripLayerPrefix?.(layers?.layer5 || '', '心理偏好') || '';
          if (layers?.layer1 && (!layer5Body || layer5Body === '未勾选')) {
            const psych = aspiration?.psychPreferences || profile.psychPreferences || null;
            if (psych && prefTool.formatLayer5) {
              const repaired = prefTool.formatLayer5(psych);
              if (repaired && !/未勾选/.test(repaired)) {
                const next = prefTool.normalizeLayers({ ...layers, layer5: repaired });
                try {
                  if (JSON.stringify(profile.essentialPreferenceLayers || null) !== JSON.stringify(next)) {
                    profile.essentialPreferenceLayers = next;
                  }
                } catch (_) {
                  profile.essentialPreferenceLayers = next;
                }
                return next;
              }
            }
          }
          if (layers?.layer1) return layers;
        }
        const fromAspiration = aspiration?.essentialPreferenceLayers
          || prefTool.buildFromPlayerAspiration?.(aspiration)
          || this.playerAspiration?.essentialPreferenceLayers
          || prefTool.buildFromPlayerAspiration?.(this.playerAspiration);
        if (fromAspiration?.layer1) {
          const next = prefTool.normalizeLayers(fromAspiration);
          if (profile) {
            try {
              if (JSON.stringify(profile.essentialPreferenceLayers || null) !== JSON.stringify(next)) {
                profile.essentialPreferenceLayers = next;
                if (profile.essentialPreferenceLayersLocked == null) profile.essentialPreferenceLayersLocked = true;
              }
            } catch (_) {
              profile.essentialPreferenceLayers = next;
              if (profile.essentialPreferenceLayersLocked == null) profile.essentialPreferenceLayersLocked = true;
            }
          }
          return next;
        }
        return null;
      }
      const profile = resolved?.profile || (id === (this.identityTargetId || '') ? this.identityTargetProfile() : null);
      if (!profile || typeof profile !== 'object') return null;
      return prefTool.ensureOnProfile(profile, aspiration);
    } catch (err) {
      console.warn('[identity] essential preference layers unavailable:', err?.message || err);
      return null;
    }
  },

  essentialPreferenceViewForState(state = null) {
    const layers = this.essentialPreferenceLayersForState(state);
    const view = window.GameModules.playerAspirationPreferenceLayers?.viewFromLayers?.(layers);
    if (view?.alignmentLabel) return view;
    if ((state?.id || this.identityTargetId || 'player-self') === 'player-self') {
      return this.essentialPreferenceViewFromPlayerAspiration?.() || null;
    }
    return null;
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
