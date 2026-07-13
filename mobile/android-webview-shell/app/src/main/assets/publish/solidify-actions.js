window.GameModules = window.GameModules || {};

window.GameModules.solidifyActions = {
  async collectSolidifiableCharacters(result = {}, mode = 'story') {
    const source = this.solidifySourceItems(result);
    const cards = await window.GameModules.characterIntroCard.ensureMany(this, source, mode);
    await this.syncSolidifyWearing?.(cards);
    return this.solidifyDisplayCards(cards);
  },

  solidifyParticipantName(item = '') {
    if (typeof item === 'string') return item.replace(/[，。；：？！].*$/u, '').trim();
    return String(item?.name || item?.characterName || item?.idOrName || '').trim();
  },

  solidifyLoadedMaterialItems(materials = []) {
    return (Array.isArray(materials) ? materials : []).map((item) => this.parseLoadedMaterialCharacter(item)).filter(Boolean);
  },

  parseLoadedMaterialCharacter(item = {}) {
    const text = [item?.title, item?.text, item?.content, item?.summary]
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join('\n');
    if (!text) return null;

    const lines = text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
    const findValue = (keys = []) => {
      for (const line of lines) {
        for (const key of keys) {
          if (!line.includes(key)) continue;
          const value = line.split(/[:：]/u).slice(1).join(':').trim();
          if (value) return value;
        }
      }
      return '';
    };

    const materialType = findValue(['资料类型', '璧勬枡绫诲瀷']);
    const isRoleCard = text.includes('角色ID') || text.includes('瑙掕壊ID') || /角色卡|瑙掕壊鍗/u.test(materialType);
    const isIntroCard = /介绍卡|浠嬬粛鍗/u.test(materialType);
    if (!isRoleCard && !isIntroCard) return null;

    const rawName = findValue(['姓名', '濮撳悕']).split(/[\s（(]/u)[0].trim();
    if (!rawName || ['无', '鏃', '玩家', '鐜╁', '系统', '绯荤粺'].includes(rawName) || !this.solidifyLooksLikePersonName(rawName)) return null;

    const role = findValue(['身份', '韬唤']).slice(0, 40) || '出场人物';
    const intro = findValue(['人物说明', '浜虹墿璇存槑'])
      || findValue(['介绍', '浠嬬粛'])
      || findValue(['性格', '鎬ф牸'])
      || '';
    const worldTag = findValue(['世界', '涓栫晫']).slice(0, 40)
      || window.GameModules.realWorld2026?.label
      || '';

    return {
      name: rawName.slice(0, 24),
      worldTag,
      role,
      intro: String(intro || '本回合载入的资料人物。').slice(0, 280),
    };
  },

  solidifyParticipantsFromTrace(trace = []) {
    const out = [];
    const groups = ['forcedParticipants', 'priorityCandidates', 'dramaCandidates', 'characters'];
    const anchorFields = ['寮哄埗鍑哄満'];
    (Array.isArray(trace) ? trace : []).forEach((item) => {
      groups.forEach((key) => {
        (Array.isArray(item?.[key]) ? item[key] : []).forEach((participant) => {
          const name = this.solidifyParticipantName(participant);
          if (name) out.push({ name, role: '鍑哄満浜虹墿' });
        });
      });
      const participantGroups = item?.participants;
      if (participantGroups && typeof participantGroups === 'object') {
        Object.values(participantGroups).flat().forEach((participant) => {
          const name = this.solidifyParticipantName(participant);
          if (name) out.push({ name, role: '鍑哄満浜虹墿' });
        });
      } else if (Array.isArray(participantGroups)) {
        participantGroups.forEach((participant) => {
          const name = this.solidifyParticipantName(participant);
          if (name) out.push({ name, role: '鍑哄満浜虹墿' });
        });
      }
      const anchorRoot = item?.anchorReport || {};
      const anchor = anchorRoot.values || anchorRoot;
      anchorFields.forEach((field) => {
        String(anchor[field] || '').split(/[銆?锛岋紱;\n]/u).forEach((raw) => {
          const name = this.solidifyCleanPersonToken(raw);
          if (name) out.push({ name, role: 'current-scene' });
        });
      });
      this.solidifyPeopleFromAnchorReport(anchorRoot).forEach((row) => out.push(row));
    });
    return out;
  },

  solidifyCleanPersonToken(raw = '') {
    const source = String(raw || '').trim();
    if (!source) return '';

    const cleaned = source
      .replace(/^[^:：]*[:：]s*/u, '')
      .replace(/[，。；：？！].*$/u, '')
      .trim();

    if (!cleaned || ['无', '鏃'].includes(cleaned)) return '';
    if (/^(?:物品|地点|事实|系统|鐗╁搧|鍦扮偣|浜嬪疄|绯荤粺)/u.test(source)) return '';
    return this.solidifyLooksLikePersonName(cleaned) ? cleaned : '';
  },

  solidifyPeopleFromAnchorReport(anchorRoot = {}) {
    const out = [];
    const structured = anchorRoot.sceneImpactObjects;
    if (structured && typeof structured === 'object') {
      (Array.isArray(structured.people) ? structured.people : []).forEach((raw) => {
        const name = this.solidifyCleanPersonToken(raw);
        if (name) out.push({ name, role: 'current-scene' });
      });
      return out;
    }

    const anchor = anchorRoot.values || anchorRoot;
    const text = String(anchor['褰撳墠鍦烘櫙褰卞搷瀵硅薄'] || anchor.currentSceneImpactObjects || '').replace(/\r/g, '').trim();
    if (!text) return out;

    text
      .split(/[，,；;、]/u)
      .map((raw) => this.solidifyCleanPersonToken(raw))
      .filter(Boolean)
      .forEach((name) => out.push({ name, role: 'current-scene' }));

    return out;
  },

  solidifyMentionedRoleCards(narration = '') {
    const text = String(narration || '');
    if (!text) return [];
    return Object.values(this.rpgStates || {}).flatMap((state) => {
      const name = String(state?.profile?.name || state?.name || '').trim();
      return name && text.includes(name) ? [{ name, role: state?.profile?.role || '瑙掕壊', worldTag: state?.worldTag || state?.profile?.work || '' }] : [];
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
      if (!name || name === playerName || seen.has(name) || ['鐜╁', '绯荤粺', '鏃'].includes(name)) return;
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
    return String(card?.name || '').split(/[:：]/u).pop().trim();
  },

  solidifyPersonKey(card = {}) {
    const name = this.solidifyPersonName(card);
    const world = String(card?.worldTag || card?.roleState?.worldTag || '').trim();
    return name ? `${world}::${name}` : '';
  },

  solidifyLooksLikePersonName(name = '') {
    const clean = String(name || '').split(/[:：]/u).pop().trim();
    if (!clean || clean.length < 2 || clean.length > 16) return false;
    if (/^(?:鎵ц|缁х画|褰撳墠|绯荤粺|鐜╁|鏃)$/u.test(clean)) return false;
    if (/琛屽姩$|鎺у埗閮?|鎺у埗浣撻獙$|缁撶畻$|鐩爣$|鐘舵€?/u.test(clean)) return false;
    if (/鎶变綇|鎶氭懜|鎻夋崗|璇㈤棶|鍚庨€€|鎵ц|鎺у埗/u.test(clean)) return false;
    if (this.solidifyLooksLikeObjectOrSceneName(clean)) return false;
    return /^[\u4e00-\u9fff路]{2,16}$/u.test(clean);
  },

  solidifyLooksLikeObjectOrSceneName(name = '') {
    const clean = String(name || '').trim();
    if (!clean) return true;

    const obviousPrefixes = ['浠ュ強', '以及'];
    if (obviousPrefixes.some((prefix) => clean.startsWith(prefix))) return true;

    const obviousSuffixes = ['涔嬬被', '绛夌墿', '之类', '等物'];
    if (obviousSuffixes.some((suffix) => clean.endsWith(suffix))) return true;

    const objectKeywords = ['房间', '地点', '物品', '系统', '鎴块棿', '鐗╁搧', '绯荤粺', '琚ぅ', '鏋曞ご', '搴婇摵', '娌欏彂', '绐楀笜', '鍙扮伅', '琛ｆ煖', '闂ㄩ搩', '绌鸿皟'];
    return objectKeywords.some((keyword) => clean.includes(keyword));
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
    const state = window.GameModules.characterIntroCard.roleCardState(card);
    if (state) return { ...card, displayType: 'role', roleState: state, profile: state.profile || {}, role: state.profile?.role || card.role || '瑙掕壊鍗', intro: state.profile?.detail || card.intro || '瀹屾暣瑙掕壊鍗″凡鍥哄寲銆' };
    return { ...card, displayType: 'intro' };
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

  solidifyPanelTitle(card = this.selectedSolidifyCard()) { return card?.displayType === 'role' ? '角色卡查看' : '介绍卡固化'; },

  solidifyTypeLabel(card = this.selectedSolidifyCard()) { return card?.displayType === 'role' ? '角色卡' : '介绍卡'; },

  solidifyDetailRows(card = this.selectedSolidifyCard()) {
    if (!card) return [];
    if (card.displayType !== 'role') return [
      ['涓栫晫', card.worldTag || '鏈煡涓栫晫'],
      ['韬唤', card.role || '鍑哄満浜虹墿'],
      ['绌跨潃', this.solidifyWearingText(card)],
      ['浠嬬粛', card.intro || '鏆傛棤浠嬬粛銆'],
    ];
    const profile = card.profile || card.roleState?.profile || {};
    return [
      ['涓栫晫', card.roleState?.worldTag || card.worldTag || profile.work || '鏈煡涓栫晫'],
      ['韬唤', profile.role || card.role || '瑙掕壊鍗'],
      ['绌跨潃', this.solidifyWearingText(card.roleState || profile)],
      ['澶栬矊', profile.appearance || '鏈褰'],
      ['鎬ф牸', profile.personality || '鏈褰'],
      ['璇︽儏', profile.detail || card.intro || '瀹屾暣瑙掕壊鍗″凡鍥哄寲銆'],
    ];
  },

  solidifyWearingText(source = {}) {
    const list = this.solidifyWearingItems(source);
    if (list.length) return list.map((item) => this.solidifyWearingItemText(item)).filter(Boolean).join('，') || '褰撳墠鏃犳槑纭┛鐫€璁板綍銆';
    const raw = this.solidifyRawWearing(source);
    return String(raw || '褰撳墠鏃犳槑纭┛鐫€璁板綍銆').slice(0, 260);
  },

  solidifyRawWearing(source = {}) {
    const values = source.values || {};
    const profile = source.profile || {};
    return values.wearing || source.wearingItems || source.wearing || profile.wearingItems || profile.wearing || source.clothing || source.outfit || source.dressedProfile || profile.dressedProfile || '';
  },

  solidifyWearingItems(source = {}, state = null) {
    const raw = this.solidifyRawWearing(source);
    const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw).flat() : []);
    if (list.length) return list.map((item) => this.solidifyNormalizeWearingItem(item, state)).filter(Boolean);
    const text = String(raw || '').trim();
    if (!text || /^褰撳墠鏃犳槑纭畖鏈褰晐鏃/iu.test(text)) return [];
    return [this.solidifyNormalizeWearingItem({ name: text, slot: this.solidifyInferWearSlot(text), description: text, reason: '鐜板疄鎺ㄦ紨姝ｆ枃纭鐨勫綋鍓嶇┛鐫€銆' }, state)].filter(Boolean);
  },

  solidifyNormalizeWearingItem(item, state = null) {
    if (!item) return null;
    const p = window.GameModules.progression;
    const raw = typeof item === 'string' ? { name: item } : { ...item };
    const name = String(raw.name || raw.label || raw.description || '').trim();
    if (!name || name === '鏈┛鎴' || name === '鏈褰') return null;
    const slot = p.canonicalWearSlot?.({ ...raw, slot: raw.slot || this.solidifyInferWearSlot(name) }) || raw.slot || '瑁呭';
    return p.normalizeCarryItem?.({ ...raw, name, slot, description: raw.description || name, reason: raw.reason || '鐜板疄鎺ㄦ紨姝ｆ枃纭鐨勫綋鍓嶇┛鐫€銆', changeMode: '鐜板疄鎺ㄦ紨', source: 'AI鐢熸垚' }, '绌跨潃', state?.id || raw.ownerId || raw.characterId || '') || { ...raw, name, slot, type: '绌跨潃' };
  },

  solidifyInferWearSlot(text = '') {
    if (/鐫¤|杩炶。瑁檤瑁檤琛～|T鎭涓婅。|鑳屽績|鍚婂甫/u.test(text)) return 'top';
    if (/瑁鐭￥|闀胯￥|涓嬭/u.test(text)) return 'bottom';
    if (/鍐呰。|鑳歌。|鏂囪兏/u.test(text)) return 'innerwearTop';
    if (/鍐呰￥|搴曡￥/u.test(text)) return 'innerwearBottom';
    if (/琚/iu.test(text)) return 'socks';
    if (/闉媩闈/iu.test(text)) return 'shoes';
    if (/澶栧|澶ц。|椋庤。/u.test(text)) return 'outerwear';
    return '瑁呭';
  },

  solidifyWearingItemText(item) {
    if (!item) return '';
    if (typeof item === 'string') return item;
    const name = item.name || item.label || item.description || '';
    if (!name || name === '鏈┛鎴' || name === '鏈褰') return '';
    const slot = item.slotLabel || item.clothing_position || item.slot || item.part || '';
    return `${slot ? `${slot}锛歚` : ''}${name}`;
  },

  selectSolidifyCard(card) { this.solidifyState.selectedKey = this.solidifyKey(card); },

  selectEntrySolidifyCard(entry, card) {
    if (!entry || !card) return;
    entry.solidifySelectedKey = this.solidifyKey(card);
    entry.solidifyOpen = true;
    entry.solidifyUserClosed = false;
    if (entry.type === 'ai' || entry.type === 'system') window.GameModules.realWorldLogStore?.append?.(entry).catch((err) => console.warn('[鐜板疄鏃ュ織] 瑙掕壊鍗￠潰鏉跨姸鎬佷繚瀛樺け璐?', err.message, err.stack));
    this.log = [...(this.log || [])];
    this.realWorldLog = [...(this.realWorldLog || [])];
  },

  closeSolidifyPanel() { this.solidifyState.open = false; },

  closeEntrySolidifyPanel(entry) {
    if (!entry) return;
    entry.solidifyOpen = false;
    entry.solidifyUserClosed = true;
    if (entry.type === 'ai' || entry.type === 'system') window.GameModules.realWorldLogStore?.append?.(entry).catch((err) => console.warn('[鐜板疄鏃ュ織] 瑙掕壊鍗￠潰鏉跨姸鎬佷繚瀛樺け璐?', err.message, err.stack));
    this.log = [...(this.log || [])];
    this.realWorldLog = [...(this.realWorldLog || [])];
  },

  async solidifySelectedIntroCard(card = this.selectedSolidifyCard(), entry = null) {
    if (!card || card.displayType === 'role' || this.busy) return;
    const source = { id: `npc-${window.GameModules.characterProfile.slug(card.worldTag)}-${window.GameModules.characterProfile.slug(card.name)}`, name: card.name, work: card.worldTag, role: card.role, detail: card.intro, importance: 'support', isMinor: false };
    this.startRoleCardLoadingBatch?.([{ id: source.id, name: card.name, type: '瑙掕壊鍗', source, context: card.intro }]);
    await this.ensureRpgForCharacter(source, card.intro, { loadMetrics: false, allowManualSolidify: true });
    if (entry) {
      entry.solidifyCards = this.solidifyDisplayCards(entry.solidifyCards || []);
      entry.solidifySelectedKey = this.solidifyKey(card);
      entry.solidifyOpen = true;
      entry.solidifyUserClosed = false;
      if (entry.type === 'ai' || entry.type === 'system') window.GameModules.realWorldLogStore?.append?.(entry).catch((err) => console.warn('[鐜板疄鏃ュ織] 瑙掕壊鍗￠潰鏉跨姸鎬佷繚瀛樺け璐?', err.message, err.stack));
      this.log = [...(this.log || [])];
      this.realWorldLog = [...(this.realWorldLog || [])];
    } else {
      this.solidifyState = { ...(this.solidifyState || {}), selectedKey: this.solidifyKey(card), open: true };
    }
  },
};
