window.GameModules = window.GameModules || {};

window.GameModules.solidifyActions = {
  async collectSolidifiableCharacters(result = {}, mode = 'story') {
    const source = this.solidifySourceItems(result);
    const cards = await window.GameModules.characterIntroCard.ensureMany(this, source, mode);
    await this.syncSolidifyWearing?.(cards);
    return this.solidifyDisplayCards(cards);
  },

  solidifyParticipantName(item = '') {
    if (typeof item === 'string') return item.replace(/[（(].*$/u, '').trim();
    return String(item?.name || item?.characterName || item?.idOrName || '').trim();
  },

  solidifyLoadedMaterialItems(materials = []) {
    return (Array.isArray(materials) ? materials : []).map((item) => this.parseLoadedMaterialCharacter(item)).filter(Boolean);
  },

  parseLoadedMaterialCharacter(item = {}) {
    const text = [item?.title, item?.text, item?.content, item?.summary].map((part) => String(part || '').trim()).filter(Boolean).join('\n');
    if (!text) return null;
    const isRoleCard = /(?:^|\n)资料类型[:：]\s*(?:完整)?角色卡/u.test(text) || /(?:^|\n)角色ID[:：]/u.test(text);
    const isIntroCard = /(?:^|\n)资料类型[:：]\s*介绍卡/u.test(text);
    if (!isRoleCard && !isIntroCard) return null;
    const name = text.match(/(?:^|\n)姓名[:：]\s*([^\s｜|，,；;\n]+)/u)?.[1]?.trim().slice(0, 24) || '';
    if (!name || ['无', '玩家', '系统'].includes(name) || !this.solidifyLooksLikePersonName(name)) return null;
    const role = text.match(/(?:^|\n)身份[:：]\s*([^\n]+)/u)?.[1]?.trim().slice(0, 40) || '出场人物';
    const intro = text.match(/(?:^|\n)人物说明[:：]\s*([^\n]+)/u)?.[1]
      || text.match(/(?:^|\n)介绍[:：]\s*([^\n]+)/u)?.[1]
      || text.match(/(?:^|\n)性格[:：]\s*([^\n]+)/u)?.[1]
      || '';
    const worldTag = text.match(/(?:^|\n)世界[:：]\s*([^\n]+)/u)?.[1]?.trim().slice(0, 40)
      || window.GameModules.realWorld2026?.label
      || '';
    return { name, worldTag, role, intro: String(intro || '本回合载入的资料人物。').slice(0, 280) };
  },

  solidifyParticipantsFromTrace(trace = []) {
    const out = [];
    const groups = ['forcedParticipants', 'priorityCandidates', 'dramaCandidates', 'characters'];
    const anchorFields = ['强制出场'];
    (Array.isArray(trace) ? trace : []).forEach((item) => {
      groups.forEach((key) => {
        (Array.isArray(item?.[key]) ? item[key] : []).forEach((participant) => {
          const name = this.solidifyParticipantName(participant);
          if (name) out.push({ name, role: '出场人物' });
        });
      });
      const participantGroups = item?.participants;
      if (participantGroups && typeof participantGroups === 'object') {
        Object.values(participantGroups).flat().forEach((participant) => {
          const name = this.solidifyParticipantName(participant);
          if (name) out.push({ name, role: '出场人物' });
        });
      } else if (Array.isArray(participantGroups)) {
        participantGroups.forEach((participant) => {
          const name = this.solidifyParticipantName(participant);
          if (name) out.push({ name, role: '出场人物' });
        });
      }
      const anchorRoot = item?.anchorReport || {};
      const anchor = anchorRoot.values || anchorRoot;
      anchorFields.forEach((field) => {
        String(anchor[field] || '').split(/[、,，；;\n]/u).forEach((raw) => {
          const name = this.solidifyCleanPersonToken(raw);
          if (name) out.push({ name, role: 'current-scene' });
        });
      });
      this.solidifyPeopleFromAnchorReport(anchorRoot).forEach((row) => out.push(row));
    });
    return out;
  },

  solidifyCleanPersonToken(raw = '') {
    const name = String(raw || '')
      .replace(/^(?:人物|角色|人员)[:：]\s*/u, '')
      .replace(/[（(].*$/u, '')
      .trim();
    if (!name || name === '无') return '';
    if (/^(?:物品|地点|事实|系统)[:：]/u.test(String(raw || ''))) return '';
    return this.solidifyLooksLikePersonName(name) ? name : '';
  },

  solidifyPeopleFromAnchorReport(anchorRoot = {}) {
    const out = [];
    const structured = anchorRoot.sceneImpactObjects;
    if (structured && typeof structured === 'object') {
      (Array.isArray(structured.people) ? structured.people : []).forEach((raw) => {
        const name = this.solidifyCleanPersonToken(raw);
        if (name) out.push({ name, role: 'current-scene' });
      });
      try { console.debug('[介绍卡调试] sceneImpactObjects.people', { people: structured.people, out }); } catch (_) { /* ignore */ }
      return out;
    }
    try { console.debug('[介绍卡调试] missing-structured-sceneImpactObjects', { anchorRoot }); } catch (_) { /* ignore */ }
    return out;
  },

  solidifyMentionedRoleCards(narration = '') {
    const text = String(narration || '');
    if (!text) return [];
    const markup = window.GameModules.narrationRoleMarkup;
    const mentions = markup?.extractRoleMentions?.(text) || [];
    if (mentions.length) {
      return mentions
        .filter((item) => item.id && item.id !== 'player-self')
        .map((item) => {
          const state = this.rpgStates?.[item.id]
            || window.GameModules.characterStateStore?.get?.(item.id, this);
          return {
            id: item.id,
            name: state?.profile?.name || state?.name || item.name,
            role: state?.profile?.role || '角色',
            worldTag: state?.worldTag || state?.profile?.work || '',
          };
        })
        .filter((item) => item.name);
    }
    return Object.values(this.rpgStates || {}).flatMap((state) => {
      const name = String(state?.profile?.name || state?.name || '').trim();
      const id = String(state?.id || state?.profile?.id || '').trim();
      if (!name || id === 'player-self' || !text.includes(name)) return [];
      return [{ id, name, role: state?.profile?.role || '角色', worldTag: state?.worldTag || state?.profile?.work || '' }];
    });
  },

  solidifySourceItems(result = {}) {
    const seen = new Set();
    const out = [];
    const playerName = String(this.playerName || this.playerProfile?.name || '').trim();
    const add = (item) => {
      if (!item) return;
      const raw = typeof item === 'string' ? { name: item } : item;
      const name = String(raw?.name || raw?.characterName || '').trim().slice(0, 24);
      if (!name || name === playerName || seen.has(name) || ['玩家', '系统', '无'].includes(name)) return;
      if (!this.solidifyLooksLikePersonName(name)) return;
      seen.add(name);
      out.push(raw);
    };
    [...(result.appearedCharacters || []), ...(result.solidifiableCharacters || [])].forEach(add);
    this.solidifyLoadedMaterialItems(result.promptPack?.loadedContext || []).forEach(add);
    this.solidifyLoadedMaterialItems(result.loadedContext || []).forEach(add);
    (Array.isArray(result.agentTrace) ? result.agentTrace : []).flatMap((item) => item?.loaded || []).forEach((item) => this.solidifyLoadedMaterialItems([item]).forEach(add));
    this.solidifyParticipantsFromTrace(result.agentTrace || []).forEach(add);
    this.solidifyMentionedRoleCards(result.narration || result.text || '').forEach(add);
    return out.slice(0, 8);
  },

  solidifySourceItemsFromEntry(entry = {}) {
    return this.solidifySourceItems({
      appearedCharacters: entry.appearedCharacters,
      solidifiableCharacters: entry.solidifiableCharacters,
      promptPack: entry.promptPack,
      agentTrace: entry.agentTrace,
      narration: entry.narration || entry.text,
    });
  },


  solidifyKey(card = {}) { return card?.name ? `${card.worldTag || ''}::${card.name}` : ''; },

  solidifyPersonName(card = {}) {
    return String(card?.name || '').replace(/^人物[:：]\s*/u, '').trim();
  },

  solidifyPersonKey(card = {}) {
    const name = this.solidifyPersonName(card);
    const world = String(card?.worldTag || card?.roleState?.worldTag || '').trim();
    return name ? `${world}::${name}` : '';
  },

  solidifyLooksLikePersonName(name = '') {
    const clean = String(name || '').replace(/^人物[:：]\s*/u, '').trim();
    // 允许路人标签与一类人称呼（如「川大女学生」「女仆团女仆」），最长与介绍卡姓名对齐
    if (!clean || clean.length < 2 || clean.length > 24) return false;
    if (/^(?:执行|继续|当前|系统|玩家|无)$/u.test(clean)) return false;
    if (/行动$|控制部$|控制体验$|结算$|目标$|状态$/u.test(clean)) return false;
    if (/抱住|抚摸|揉捏|询问|后退|执行|控制/u.test(clean)) return false;
    if (this.solidifyLooksLikeObjectOrSceneName(clean)) return false;
    // 纯「路人」无区分度：不算合格人名；「路人甲」「路过外卖骑手」可以
    if (/^路人$/u.test(clean)) return false;
    return /^[\u4e00-\u9fff·A-Za-z0-9]{2,24}$/u.test(clean);
  },

  solidifyLooksLikeObjectOrSceneName(name = '') {
    const clean = String(name || '').trim();
    if (!clean) return true;
    if (/^(?:以及|以及房间|以及.+|等物|等物品)$/u.test(clean)) return true;
    if (/(?:之类|等物|等物品|等)$/u.test(clean)) return true;
    return /^(?:被褥|枕头|床铺|床|被子|床单|被单|毯子|沙发|茶几|桌子|椅子|台灯|窗帘|门|墙|地板|房间|门铃|手机|电脑|电视|衣柜|抽屉|梳妆台|地毯|靠垫|抱枕|床单|席梦思|床垫|被芯|枕芯|床头|床尾|床架|床单|门把手|窗户|窗|镜|镜子|灯|音响|空调|风扇|暖气|暖气|垃圾桶|书包|背包|水杯|杯子|碗|盘|锅|刀|叉|勺|书|本|笔|纸|盒|袋|瓶|罐|箱|柜|架|栏|杆|绳|线|布|巾|袜|鞋|帽|镜|锁|钥|匙|卡|票|钱|币|物)$/u.test(clean)
      || /(?:被褥|枕头|床铺|沙发|窗帘|台灯|衣柜|梳妆台|门铃|空调|靠垫|抱枕)$/u.test(clean);
  },

  solidifyShouldSkipCard(card = {}) {
    const name = this.solidifyPersonName(card);
    if (!name || !this.solidifyLooksLikePersonName(name)) return true;
    const playerName = String(this.playerName || this.playerProfile?.name || '').trim();
    if (playerName && name === playerName) return true;
    if (card?.roleState?.id === 'player-self') return true;
    return false;
  },

  solidifyDisplayCards(list = this.solidifyState?.candidates || []) {
    const byKey = new Map();
    (Array.isArray(list) ? list : []).forEach((raw) => {
      const card = this.solidifyDisplayCard(raw);
      if (!card || this.solidifyShouldSkipCard(card)) return;
      const key = this.solidifyPersonKey(card);
      if (!key) return;
      const prev = byKey.get(key);
      if (!prev || (card.displayType === 'role' && prev.displayType !== 'role')) byKey.set(key, card);
    });
    return [...byKey.values()];
  },

  solidifyDisplayCard(card = {}) {
    if (!card?.name) return null;
    const introApi = window.GameModules.characterIntroCard;
    const state = introApi.roleCardState(card);
    const complete = state && !introApi.isIncompleteRoleStub?.(state);
    if (complete) {
      return {
        ...card,
        displayType: 'role',
        roleState: state,
        presenceKind: state.profile?.presenceKind || card.presenceKind || 'individual',
        profile: state.profile || {},
        role: state.profile?.role || card.role || '角色卡',
        intro: state.profile?.detail || card.intro || '完整角色卡已固化。',
      };
    }
    return {
      ...card,
      displayType: 'intro',
      roleState: state || null,
      presenceKind: card.presenceKind || window.GameModules.characterSocialDrive?.inferPresenceKind?.(card) || 'individual',
    };
  },

  solidifyCandidates() { return this.solidifyDisplayCards(); },

  selectedSolidifyCard(entry = null) {
    const cards = this.solidifyEntryCards(entry);
    const key = entry ? (entry.solidifySelectedKey || this.solidifyKey(cards[0])) : (this.solidifyState?.selectedKey || this.solidifyKey(cards[0]));
    return cards.find((card) => this.solidifyKey(card) === key) || cards[0] || null;
  },

  solidifyEntryCards(entry = null) {
    if (!entry) return this.solidifyDisplayCards();
    const stored = Array.isArray(entry.solidifyCards) ? entry.solidifyCards : [];
    if (stored.length) return this.solidifyDisplayCards(stored);
    const intro = window.GameModules.characterIntroCard;
    const derived = this.solidifySourceItemsFromEntry(entry).map((item) => intro.normalize(item, this, entry.type === 'ai' ? 'real' : 'story')).filter(Boolean);
    return this.solidifyDisplayCards(derived);
  },

  solidifyPanelTitle(card = this.selectedSolidifyCard()) { return card?.displayType === 'role' ? '角色卡查看' : '介绍卡升格'; },

  solidifyTypeLabel(card = this.selectedSolidifyCard()) { return card?.displayType === 'role' ? '角色卡' : '介绍卡'; },

  solidifyPresenceKindLabel(card = {}) {
    const kind = card?.presenceKind || card?.profile?.presenceKind || window.GameModules.characterSocialDrive?.inferPresenceKind?.(card) || 'individual';
    return window.GameModules.characterSocialDrive?.presenceKindLabel?.(kind) || '具体的一个人';
  },

  solidifyDetailRows(card = this.selectedSolidifyCard()) {
    if (!card) return [];
    const presence = this.solidifyPresenceKindLabel(card);
    if (card.displayType !== 'role') return [
      ['人物形态', presence],
      ['世界', card.worldTag || '未知世界'],
      ['身份', card.role || '出场人物'],
      ['穿着', this.solidifyWearingText(card)],
      ['介绍', card.intro || '暂无介绍。'],
    ];
    const profile = card.profile || card.roleState?.profile || {};
    return [
      ['人物形态', presence],
      ['世界', card.roleState?.worldTag || card.worldTag || profile.work || '未知世界'],
      ['身份', profile.role || card.role || '角色卡'],
      ['穿着', this.solidifyWearingText(card.roleState || profile)],
      ['外貌', profile.appearance || '未记录'],
      ['性格', profile.personality || '未记录'],
      ['详情', profile.detail || card.intro || '完整角色卡已固化。'],
    ];
  },

  solidifyWearingText(source = {}) {
    const list = this.solidifyWearingItems(source);
    if (list.length) return list.map((item) => this.solidifyWearingItemText(item)).filter(Boolean).join('；') || '当前无明确穿着记录。';
    const raw = this.solidifyRawWearing(source);
    return String(raw || '当前无明确穿着记录。').slice(0, 260);
  },

  solidifyRawWearing(source = {}) {
    const values = source.values || {};
    const profile = source.profile || {};
    return source.wearingItems || source.wearing || profile.wearingItems || profile.wearing || source.clothing || source.outfit || source.dressedProfile || profile.dressedProfile || '';
  },

  solidifyWearingItems(source = {}, state = null) {
    const raw = this.solidifyRawWearing(source);
    const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw).flat() : []);
    if (list.length) return list.map((item) => this.solidifyNormalizeWearingItem(item, state)).filter(Boolean);
    const text = String(raw || '').trim();
    if (!text || /^当前无明确|未记录|无$/u.test(text)) return [];
    return [this.solidifyNormalizeWearingItem({ name: text, slot: this.solidifyInferWearSlot(text), description: text, reason: '现实推演正文确认的当前穿着。' }, state)].filter(Boolean);
  },

  solidifyNormalizeWearingItem(item, state = null) {
    if (!item) return null;
    const p = window.GameModules.progression;
    const raw = typeof item === 'string' ? { name: item } : { ...item };
    const name = String(raw.name || raw.label || raw.description || '').trim();
    if (!name || name === '未穿戴' || name === '未记录') return null;
    const slot = p.canonicalWearSlot?.({ ...raw, slot: raw.slot || this.solidifyInferWearSlot(name) }) || raw.slot || '装备';
    return p.normalizeCarryItem?.({ ...raw, name, slot, description: raw.description || name, reason: raw.reason || '现实推演正文确认的当前穿着。', changeMode: '现实推演', source: 'AI生成' }, '穿着', state?.id || raw.ownerId || raw.characterId || '') || { ...raw, name, slot, type: '穿着' };
  },

  solidifyInferWearSlot(text = '') {
    if (/睡裙|连衣裙|裙|衬衫|T恤|上衣|背心|吊带/u.test(text)) return 'top';
    if (/裤|短裤|长裤|下装/u.test(text)) return 'bottom';
    if (/内衣|胸衣|文胸/u.test(text)) return 'innerwearTop';
    if (/内裤|底裤/u.test(text)) return 'innerwearBottom';
    if (/袜/u.test(text)) return 'socks';
    if (/鞋|靴/u.test(text)) return 'shoes';
    if (/外套|大衣|风衣/u.test(text)) return 'outerwear';
    return '装备';
  },

  solidifyWearingItemText(item) {
    if (!item) return '';
    if (typeof item === 'string') return item;
    const name = item.name || item.label || item.description || '';
    if (!name || name === '未穿戴' || name === '未记录') return '';
    const slot = item.slotLabel || item.clothing_position || item.slot || item.part || '';
    return `${slot ? `${slot}：` : ''}${name}`;
  },

  selectSolidifyCard(card) { this.solidifyState.selectedKey = this.solidifyKey(card); },

  selectEntrySolidifyCard(entry, card) {
    if (!entry || !card) return;
    entry.solidifySelectedKey = this.solidifyKey(card);
    entry.solidifyOpen = true;
    entry.solidifyUserClosed = false;
    if (entry.type === 'ai' || entry.type === 'system') window.GameModules.sqliteSave.saveRealWorldLogEntry?.(entry).catch((err) => console.warn('[现实日志] 角色卡面板状态保存失败:', err.message, err.stack));
    this.log = [...(this.log || [])];
    this.realWorldLog = [...(this.realWorldLog || [])];
  },

  closeSolidifyPanel() { this.solidifyState.open = false; },

  closeEntrySolidifyPanel(entry) {
    if (!entry) return;
    entry.solidifyOpen = false;
    entry.solidifyUserClosed = true;
    if (entry.type === 'ai' || entry.type === 'system') window.GameModules.sqliteSave.saveRealWorldLogEntry?.(entry).catch((err) => console.warn('[现实日志] 角色卡面板状态保存失败:', err.message, err.stack));
    this.log = [...(this.log || [])];
    this.realWorldLog = [...(this.realWorldLog || [])];
  },

  async solidifySelectedIntroCard(card = this.selectedSolidifyCard(), entry = null) {
    if (!card || this.busy) return;
    // 完整角色卡不可再升格；空壳 stub 仍可从介绍卡升格
    if (card.displayType === 'role' && !window.GameModules.characterIntroCard?.isIncompleteRoleStub?.(card.roleState)) return;
    const identity = card.identity || {};
    const persona = card.persona || {};
    const social = card.social || {};
    const presenceKind = card.presenceKind
      || window.GameModules.characterSocialDrive?.inferPresenceKind?.(card)
      || 'individual';
    const drive = window.GameModules.characterSocialDrive?.normalizeForRoleCard?.({
      relationToPlayer: social.relationToPlayer,
      relationDetail: social.relationDetail,
      familiarity: social.familiarity,
      lastContactAt: social.lastContactAt,
      lastContactChannel: social.lastContactChannel,
      reach: social.reach,
      agenda: card.agenda,
    }, { name: card.name }) || null;
    const existingStubId = card.roleState?.id && window.GameModules.characterIntroCard?.isIncompleteRoleStub?.(card.roleState)
      ? card.roleState.id
      : '';
    const sharedFromCard = window.GameModules.characterSocialDrive?.isSharedCharacterId?.(card.id)
      ? card.id
      : (window.GameModules.characterSocialDrive?.isSharedCharacterId?.(card.links?.roleCardId) ? card.links.roleCardId : '');
    const source = {
      id: existingStubId || sharedFromCard || `npc-${window.GameModules.characterProfile.slug(card.worldTag)}-${window.GameModules.characterProfile.slug(card.name)}`,
      name: card.name,
      work: card.worldTag,
      role: identity.role || card.role,
      detail: persona.background || card.intro,
      appearance: persona.appearance || '',
      personality: persona.personality || '',
      preferences: Array.isArray(persona.preferences) ? persona.preferences.join('、') : (persona.preferences || ''),
      gender: identity.gender || '',
      socialDrive: drive || undefined,
      presenceKind,
      roleCardStub: false,
      importance: presenceKind === 'group' ? 'support' : 'support',
      isMinor: false,
    };
    const context = persona.background || card.intro || '';
    this.startRoleCardLoadingBatch?.([{ id: source.id, name: card.name, type: '角色卡', source, context }]);
    await this.ensureRpgForCharacter(source, context, { loadMetrics: false, allowManualSolidify: true });
    // 升格后清 stub 标记
    try {
      const live = window.GameModules.characterStateStore?.get?.(source.id) || this.rpgStates?.[source.id];
      if (live?.profile) {
        live.profile.presenceKind = presenceKind;
        live.profile.roleCardStub = false;
        live.profile.solidifyComplete = true;
        if (live.meta) live.meta.roleCardStub = false;
        await window.GameModules.characterStateStore?.save?.(live, this);
      }
    } catch (err) {
      console.warn('[介绍卡升格] 清除 stub 标记失败:', err?.message || err);
    }
    // 升格：介绍卡与角色卡共用同一 ID；保留介绍卡正文，只回写链接与状态
    try {
      const introStore = window.GameModules.characterIntroStore;
      const intro = introStore?.getById?.(card.id)
        || introStore?.get?.(card.name)
        || (introStore?.list?.() || []).find((item) => item.id === card.id || item.name === card.name);
      if (intro) {
        const next = window.GameModules.characterIntroCard?.normalize?.({
          ...intro,
          id: source.id,
          presenceKind,
          links: {
            ...(intro.links || {}),
            roleCardId: source.id,
            scheduleId: source.id,
          },
          meta: {
            ...(intro.meta || {}),
            solidifyStatus: 'solidified',
            updatedAt: new Date().toISOString(),
          },
        }, this, intro.meta?.source || 'ai');
        if (next) await introStore?.save?.(next);
      }
    } catch (err) {
      console.warn('[介绍卡升格] 回写介绍卡链接失败:', err?.message || err);
    }
    if (entry) {
      entry.solidifyCards = this.solidifyDisplayCards(entry.solidifyCards || []);
      entry.solidifySelectedKey = this.solidifyKey(card);
      entry.solidifyOpen = true;
      entry.solidifyUserClosed = false;
      if (entry.type === 'ai' || entry.type === 'system') window.GameModules.sqliteSave.saveRealWorldLogEntry?.(entry).catch((err) => console.warn('[现实日志] 角色卡面板状态保存失败:', err.message, err.stack));
      this.log = [...(this.log || [])];
      this.realWorldLog = [...(this.realWorldLog || [])];
    } else {
      this.solidifyState = { ...(this.solidifyState || {}), selectedKey: this.solidifyKey(card), open: true };
    }
  },
};
