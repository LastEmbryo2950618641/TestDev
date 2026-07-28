window.GameModules = window.GameModules || {};

(function guardPlayerSetupActions() {
  const actions = window.GameModules.playerSetupActions = window.GameModules.playerSetupActions || {};
  const worldLabel = () => window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';

  const runPredefinedPlayerSetup = async function runPredefinedPlayerSetup(options = {}) {
    return this.completePredefinedPlayerSetup(options);
  };

  const fallbackCompletePlayerSetup = async function completePlayerSetup(options = {}) {
    if (this.profileSetupBusy) return;
    const p = this.playerProfile || {};
    const name = (p.name || this.playerName || '').trim();
    const birthday = (p.birthday || '').trim();
    if (!name || !birthday) return;
    this.profileSetupBusy = true;
    try {
      this.setupError = '';
      const age = this.playerAgeFromBirthday(birthday);
      this.playerProfile = {
        ...p,
        name,
        birthday,
        age,
        refinedCity: p.refinedCity || p.city,
        currentLocation: p.currentLocation || '',
        refinedRole: p.refinedRole || p.dailyRole || ((age || '') + '岁现代都市居民'),
        refinedLivingStatus: p.refinedLivingStatus || p.livingStatus,
        parentStatus: p.parentStatus || p.parents || '父母已故',
        parentDeathCause: p.parentDeathCause || '',
        initializedAt: p.initializedAt || new Date().toISOString(),
      };
      this.phoneFixedTime = new Date(this.playerProfile.initializedAt).getTime();
      this.refreshPhoneClockLabels?.();
      await this.syncPlayerProfileLexicon?.();
      this.playerName = name;
      this.phoneActivationChoice = '';
      this.phoneSetupDone = true;
      this.desktopUnlocked = false;
      await this.syncRelationshipWechatUsers?.({ generateProfile: false, save: false });
      await this.ensurePlayerRpgState?.(true);
      await this.save?.();
      this.finishActivationFlow?.();
      return { mode: 'fallback-local-profile' };
    } finally {
      this.profileSetupBusy = false;
    }
  };

  actions.completePlayerSetupLocalFallback = fallbackCompletePlayerSetup;

  const shouldUsePredefinedSetup = (store) => Boolean(
    store?.roleCardSetup?.usePredefinedPlayerCard
      && window.GameModules.predefinedRoleCards?.saveSelectedRoleCardStates
      && typeof store.completePredefinedPlayerSetup === 'function'
  );

  const shouldFallbackWithoutAi = (store, options = {}, error = null) => {
    if (options?.forceAi === true) return false;
    if (options?.skipAi === true) return true;
    const message = String(error?.message || '');
    const code = String(error?.code || '');
    return code === 'AUTH_REQUIRED'
      || message.includes('AUTH_REQUIRED')
      || message.includes('DeepSeek API Key')
      || message.includes('API Key 未配置');
  };

  const wrapCompletePlayerSetup = (fn) => {
    const wrapped = async function completePlayerSetup(options = {}) {
      if (shouldUsePredefinedSetup(this)) return runPredefinedPlayerSetup.call(this, options);
      if (!fn || fn === fallbackCompletePlayerSetup) return fallbackCompletePlayerSetup.call(this, options);
      if (!shouldFallbackWithoutAi(this, options)) return fn.call(this, options);
      const originalSetupError = this.setupError;
      const originalProfileSetupBusy = this.profileSetupBusy;
      const result = await fn.call(this, options);
      if (this.phoneSetupDone || !this.setupError) return result;
      this.setupError = originalSetupError || '';
      this.profileSetupBusy = originalProfileSetupBusy || false;
      return fallbackCompletePlayerSetup.call(this, { ...options, skipAi: true });
    };
    wrapped.predefinedRoleCardGuard = true;
    return wrapped;
  };

  const fallbacks = {
    playerProfileLexiconFields() {
      const p = this.playerIdentityState?.()?.profile || this.playerProfile || {};
      const worldTag = worldLabel();
      const row = (name, value, desc) => window.GameModules.playerProfileLexicon.row(name, value, desc, worldTag);
      return [
        row('所属世界', worldTag, '玩家当前所在的现实世界。'),
        row('姓名', p.name || this.playerName, '玩家登记的姓名或代号。'),
        row('性别', p.gender, '玩家登记的性别。'),
        row('生日', p.birthday, '玩家登记生日，用于计算年龄与现实身份。'),
        row('年龄', p.age ? `${p.age}岁` : '', '由生日按 2026-06-12 计算得到。'),
        row('当前位置', window.GameModules.currentLocationField?.display?.(p) || p.currentLocation, '玩家当前所在位置，格式为“所在世界·势力·层级1·层级2·地点·详细的具体位置”；其中“地点”直接作为电子地图节点名。'),
        row('现实身份', p.refinedRole || p.dailyRole, '玩家在现实世界中的日常身份。'),
        row('人事归属', [p.workplace, p.position].filter(Boolean).join(' / '), '玩家当前工作、学习或组织归属。'),
        row('居住状态', p.refinedLivingStatus || p.livingStatus, '玩家当前居住与生活状态。'),
        row('父母状态', p.parentStatus || p.parents || '父母已故', '玩家父母当前状态。'),
        row('父母去世原因', p.parentDeathCause || '待生成', '父母已故时的入库死因。'),
        row('人际关系', p.relationships || '由玩家自行设定，暂无补充', '玩家明确填写的人际关系。'),
        row('世界观补充', p.worldbuildingNote || '暂无', 'AI 围绕玩家资料补全的现实背景。'),
        row('备注', p.notes || '无', '玩家补充设定。'),
      ];
    },

    playerSetupSummary() {
      return this.playerProfileLexiconFields().map((x) => `${x.label}：${x.value}`).join('\n');
    },

    async defaultExistingAccountProfile() {
      throw new Error('默认资料读取模块未加载：需要 player-setup-defaults.js 读取 config/default-existing-profile.md');
    },

    async chooseExistingAccountSetup() {
      if (this.profileSetupBusy) return;
      this.profileSetupBusy = true;
      try {
        this.setupError = '';
        this.playerProfile = { ...this.playerProfile, ...await this.defaultExistingAccountProfile() };
        this.existingProfileExpanded = false;
        this.phoneActivationChoice = 'existing';
      } catch (err) {
        console.error('[玩家身份] 已有账号默认资料读取失败:', err.message, err.stack);
        this.setupError = err.message || '已有账号默认资料读取失败';
      } finally {
        this.profileSetupBusy = false;
      }
    },

    chooseNewAccountSetup() {
      const current = this.playerProfile || {};
      this.playerProfile = {
        name: (current.name || this.playerName || '').trim(),
        gender: (current.gender || '').trim(),
        birthday: (current.birthday || '').trim(),
        wealthTier: current.wealthTier || '中产',
        relationshipEntries: this.normalizeRelationshipEntries?.(current.relationshipEntries, current.relationships) || [],
        relationships: (current.relationships || '').trim(),
        notes: (current.notes || '').trim(),
        currentLocation: '',
        city: '',
        dailyRole: '',
        livingStatus: '',
        parents: '',
        parentDeathCause: '',
        appearance: '',
        preferences: '',
        personality: '',
      };
      this.existingProfileExpanded = false;
      if (this.roleCardSetup) {
        this.roleCardSetup.detailOpen = false;
        this.roleCardSetup.cardDetailOpen = '';
        this.roleCardSetup.selectedPlayerId = '';
        this.roleCardSetup.selectedCardId = '';
      }
      this.phoneActivationChoice = 'new';
    },

    backActivationChoice() {
      this.phoneActivationChoice = '';
    },

    playerAgeFromBirthday(birthday) {
      const birth = new Date(`${birthday}T00:00:00`);
      const now = new Date('2026-06-12T00:00:00');
      if (Number.isNaN(birth.getTime())) return '';
      let age = now.getFullYear() - birth.getFullYear();
      if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1;
      return Math.max(0, age);
    },

    async useExistingAccountSetup() {
      await this.completePlayerSetup?.();
    },

    completePlayerSetup: fallbackCompletePlayerSetup,

    async syncPlayerProfileLexicon() {
      try {
        if (!window.GameModules.rpgLexicon?.saveMany) return;
        await window.GameModules.rpgLexicon.saveMany(
          this.playerProfileLexiconFields().map((field) => ({
            worldTag: worldLabel(),
            kind: '玩家设定',
            name: field.label,
            value: field.raw || field.value,
            summary: field.value,
            description: field.desc,
            nameAiGenerated: false,
            valueAiGenerated: false,
            changeMode: '用户主动',
            source: 'fallback',
            meta: { targetType: '非角色', commonField: true },
          }))
        );
      } catch (err) {
        console.warn('[玩家身份] 兜底词条同步失败:', err.message, err.stack);
      }
    },

    reopenPlayerSetup() {
      this.playerProfile.relationshipEntries = this.normalizeRelationshipEntries?.(this.playerProfile.relationshipEntries, this.playerProfile.relationships)
        || this.playerProfile.relationshipEntries
        || [];
      this.phoneSetupDone = false;
      this.phoneActivationChoice = '';
    },
  };

  Object.entries(fallbacks).forEach(([key, fn]) => {
    if (typeof actions[key] !== 'function') {
      actions[key] = key === 'completePlayerSetup' ? wrapCompletePlayerSetup(fn) : fn;
    }
  });

  if (actions.completePlayerSetup?.predefinedRoleCardGuard !== true) {
    actions.completePlayerSetup = wrapCompletePlayerSetup(actions.completePlayerSetup || fallbackCompletePlayerSetup);
    actions.completePlayerSetup.predefinedRoleCardGuard = true;
  }
})();

