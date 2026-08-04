window.GameModules = window.GameModules || {};

/**
 * 角色管理：统一浏览角色卡与介绍卡；点击后双标签页。
 * 升格后介绍卡保留；查询仍优先角色卡。
 */
window.GameModules.characterRosterActions = {
  patchCharacterRosterState(patch = {}) {
    this.characterRosterState = {
      open: false,
      query: '',
      message: '',
      selectedKey: '',
      suppressSelectUntil: 0,
      tab: 'role',
      ...(this.characterRosterState || {}),
      ...(patch || {}),
    };
    return this.characterRosterState;
  },

  initCharacterRosterApp() {
    this.patchCharacterRosterState();
  },

  openCharacterRosterApp(options = {}) {
    this.initCharacterRosterApp();
    this.closeDesktopApps?.();
    this.patchCharacterRosterState({
      open: true,
      message: '',
      selectedKey: options.selectedKey || '',
      tab: options.selectedKey && options.tab === 'intro' ? 'intro' : 'role',
      suppressSelectUntil: 0,
    });
    this.desktopUnlocked = true;
  },

  closeCharacterRosterApp() {
    this.patchCharacterRosterState({ open: false, message: '', selectedKey: '', tab: 'role', suppressSelectUntil: 0 });
    this.closeAppToDesktop?.();
  },
  characterRosterPersonKey(name = '', worldTag = '', id = '') {
    const shared = String(id || '').trim();
    if (shared && window.GameModules.characterSocialDrive?.isSharedCharacterId?.(shared)) {
      return `id::${shared}`;
    }
    return `${String(worldTag || '').trim()}::${String(name || '').trim()}`;
  },

  characterRosterRelation(profile = {}) {
    const direct = String(profile?.socialDrive?.relationToPlayer || '').trim();
    if (direct) return direct;
    const playerName = String(this.rpgStates?.['player-self']?.profile?.name || this.character?.name || '').trim();
    const relationships = String(profile?.relationships || '').trim();
    if (!relationships || !playerName) return '';
    const escaped = playerName.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const match = relationships.match(new RegExp(`(?:^|[；;，,])\\s*([^：:；;,]+)[：:]\\s*${escaped}(?=$|[；;，,])`, 'u'));
    return String(match?.[1] || '').trim();
  },

  /** 合并角色卡 + 介绍卡为一人一条（两边都保留引用；同 ID 合并） */
  characterRosterPeople() {
    this.initCharacterRosterApp();
    const q = String(this.characterRosterState.query || '').trim().toLowerCase();
    const map = new Map();
    const upsert = (row) => {
      const sharedId = row.roleState?.id || row.introCard?.links?.roleCardId || row.introCard?.id || '';
      const key = this.characterRosterPersonKey(row.name, row.worldTag, sharedId);
      const prev = map.get(key) || {
        key,
        name: row.name,
        worldTag: row.worldTag,
        roleId: '',
        introId: '',
        roleState: null,
        introCard: null,
        hasRole: false,
        hasIntro: false,
        relation: '',
        agendaShort: '',
        presenceKind: '',
      };
      if (row.roleState) {
        prev.roleState = row.roleState;
        prev.roleId = row.roleState.id || prev.roleId;
        const complete = !window.GameModules.characterIntroCard?.isIncompleteRoleStub?.(row.roleState);
        prev.hasRole = complete;
        const drive = row.roleState.profile?.socialDrive || {};
        prev.relation = drive.relationToPlayer || this.characterRosterRelation(row.roleState.profile) || prev.relation;
        prev.agendaShort = drive.agenda?.short || prev.agendaShort;
        prev.presenceKind = row.roleState.profile?.presenceKind || prev.presenceKind || '';
      }
      if (row.introCard) {
        prev.introCard = row.introCard;
        prev.introId = row.introCard.id || prev.introId;
        prev.hasIntro = true;
        prev.relation = prev.relation || row.introCard.social?.relationToPlayer || '';
        prev.agendaShort = prev.agendaShort || row.introCard.agenda?.short || '';
        prev.presenceKind = prev.presenceKind || row.introCard.presenceKind || '';
        if (!prev.roleId && row.introCard.id) prev.roleId = row.introCard.id;
      }
      map.set(key, prev);
    };

    const roles = window.GameModules.characterStateStore?.list?.(this) || Object.values(this.rpgStates || {});
    roles.forEach((state) => {
      if (!state || state.id === 'player-self') return;
      const name = state.profile?.name || state.name || '';
      if (!name) return;
      upsert({
        name,
        worldTag: state.profile?.work || state.worldTag || '原创世界',
        roleState: state,
      });
    });

    const intros = window.GameModules.characterIntroStore?.list?.() || [];
    intros.forEach((card) => {
      if (!card?.name) return;
      const duplicateRole = [...map.values()].some((item) => (
        item.hasRole
        && item.name === card.name
        && (
          !item.worldTag
          || !card.worldTag && !card.work
          || item.worldTag === card.worldTag
          || item.worldTag === card.work
          || window.GameModules.characterQuery?.worldMatches?.(item.worldTag, card.worldTag || card.work)
        )
      ));
      if (duplicateRole) return;
      upsert({
        name: card.name,
        worldTag: card.worldTag || card.work || '原创世界',
        introCard: card,
      });
    });

    return [...map.values()]
      .filter((item) => !q || [item.name, item.worldTag, item.relation, item.agendaShort].join(' ').toLowerCase().includes(q))
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh'));
  },

  selectedCharacterRosterPerson() {
    this.initCharacterRosterApp();
    const key = this.characterRosterState.selectedKey;
    if (!key) return null;
    return this.characterRosterPeople().find((item) => item.key === key) || null;
  },

  selectCharacterRosterPerson(key = '') {
    this.initCharacterRosterApp();
    if (Number(this.characterRosterState.suppressSelectUntil) > Date.now()) return;
    const person = this.characterRosterPeople().find((item) => item.key === key);
    if (!person) return;
    this.patchCharacterRosterState({
      selectedKey: person.key,
      tab: person.hasRole ? 'role' : 'intro',
      suppressSelectUntil: 0,
    });
  },

  setCharacterRosterTab(tab = 'role') {
    this.initCharacterRosterApp();
    this.patchCharacterRosterState({ tab: tab === 'intro' ? 'intro' : 'role' });
  },

  clearCharacterRosterSelection() {
    this.patchCharacterRosterState({
      selectedKey: '',
      tab: 'role',
      suppressSelectUntil: Date.now() + 250,
    });
  },
  /** 介绍卡展示行（设计用轻量字段） */
  characterRosterIntroRows(card = null) {
    if (!card) return [];
    const identity = card.identity || {};
    const persona = card.persona || {};
    const social = card.social || {};
    const agenda = card.agenda || {};
    const ideas = Array.isArray(card.ideas) ? card.ideas : [];
    const meta = card.meta || {};
    const links = card.links || {};
    const row = (label, value) => ({ label, value: value || '未记录' });
    return [
      row('姓名', card.name),
      row('人物形态', window.GameModules.characterSocialDrive?.presenceKindLabel?.(card.presenceKind) || '具体的一个人'),
      row('世界', card.worldTag || card.work),
      row('介绍卡ID', card.id),
      row('身份', identity.role || card.role),
      row('职业', identity.job),
      row('年龄/性别', [identity.age, identity.gender].filter(Boolean).join(' · ')),
      row('常驻范围', identity.baseLocation),
      row('外貌', persona.appearance),
      row('性格', persona.personality),
      row('背景', persona.background || card.intro),
      row('喜好', Array.isArray(persona.preferences) ? persona.preferences.join('、') : persona.preferences),
      row('吸引偏好', Array.isArray(persona.attraction) ? persona.attraction.join('、') : persona.attraction),
      row('与主角关系', social.relationToPlayer),
      row('关系说明', social.relationDetail),
      row('熟识度', social.familiarity != null ? String(social.familiarity) : ''),
      row('好感', social.affection != null ? String(social.affection) : ''),
      row('可达渠道', Array.isArray(social.reach) ? social.reach.join('、') : ''),
      row('上次沟通', social.lastContactAt),
      row('沟通渠道', social.lastContactChannel),
      row('当前事务', agenda.short),
      row('需要主角', agenda.needPlayer ? `是｜${agenda.needPlayerWhy || ''}` : '否'),
      row('紧迫度', agenda.urgency != null ? String(agenda.urgency) : ''),
      row('期限', agenda.deadline),
      row('冷却至', agenda.cooldownUntil),
      row('想法', ideas.map((idea, index) => `${index + 1}. ${idea.title || idea.detail || '未命名'}${idea.detail && idea.title ? `：${idea.detail}` : ''}`).join('\n')),
      row('已升格角色卡', links.roleCardId || (meta.solidifyStatus === 'solidified' ? '已升格（ID 待回写）' : '尚未升格')),
      row('固化状态', meta.solidifyStatus || 'none'),
      row('来源', meta.source || card.source || ''),
    ];
  },

  async solidifyRosterIntroCard() {
    const person = this.selectedCharacterRosterPerson();
    if (!person?.introCard || person.hasRole) {
      this.patchCharacterRosterState({
        message: person?.hasRole ? '已有角色卡，无需重复升格。' : '没有可升格的介绍卡。',
      });
      return;
    }
    await this.solidifySelectedIntroCard?.(person.introCard, null);
    this.patchCharacterRosterState({
      message: `已开始为「${person.name}」生成独立角色卡；介绍卡仍保留。`,
      tab: 'role',
    });
  },

  openRosterRoleAsIdentity(roleId = '') {
    const person = this.selectedCharacterRosterPerson();
    const id = roleId || person?.roleId || '';
    if (!id) {
      this.patchCharacterRosterState({ message: '尚无角色卡，请先在介绍卡页升格。' });
      return;
    }
    // 身份证界面查看角色卡；返回时回角色管理
    this.patchCharacterRosterState({ open: false });
    if (typeof this.showIdentityAppShell === 'function') {
      this.showIdentityAppShell(id, 'character-roster');
    } else {
      this.identityReturnTo = 'character-roster';
      this.identityTargetId = id;
      this.identityAppOpen = true;
      this.desktopUnlocked = true;
    }
    void this.hydrateIdentityTargetForApp?.(id);
  },
};

