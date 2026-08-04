window.GameModules = window.GameModules || {};

window.GameModules.characterIntroCard = {
  worldOf(raw = {}, store = null) {
    return String(store?.currentWorldTag?.() || raw.worldTag || raw.work || store?.character?.work || window.GameModules.realWorld2026?.label || '未知世界').slice(0, 40);
  },

  normalize(raw = {}, store = null, source = 'ai') {
    const social = window.GameModules.characterSocialDrive;
    if (!social?.normalizeIntroCard) {
      const name = String(raw.name || raw.characterName || '').trim().slice(0, 24);
      if (!name) return null;
      const presenceKind = social?.inferPresenceKind?.(raw) || 'individual';
      const worldTag = this.worldOf(raw, store);
      const id = social?.resolveSharedCardId?.(raw, name, worldTag) || String(raw.id || `intro-${name}`).slice(0, 80);
      const shared = social?.isSharedCharacterId?.(id) ? id : '';
      return {
        id,
        name,
        worldTag,
        presenceKind,
        identity: { role: String(raw.role || '出场人物').slice(0, 40), age: '', gender: '', job: '', baseLocation: '' },
        persona: {
          appearance: '',
          personality: '',
          background: String(raw.intro || raw.detail || '').slice(0, 200),
          preferences: [],
          attraction: [],
          voice: '',
        },
        social: { relationToPlayer: '', relationDetail: '', affection: 0, familiarity: 0, lastContactAt: '', lastContactChannel: 'none', reach: [] },
        agenda: { short: '', deadline: '', needPlayer: false, needPlayerWhy: '', urgency: 0, cooldownUntil: '' },
        ideas: [],
        routine: { tags: [] },
        memory: { facts: [] },
        links: { scheduleId: id, wechatContactId: '', roleCardId: shared },
        meta: { source, solidifyStatus: 'none', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        role: String(raw.role || '出场人物').slice(0, 40),
        intro: String(raw.intro || raw.detail || '').slice(0, 200),
        work: worldTag,
      };
    }
    return social.normalizeIntroCard(raw, store, source);
  },

  /** Stage1 空壳 / 未跑完整生成的角色卡：不算「已升格完整卡」。 */
  isIncompleteRoleStub(state = null) {
    if (!state) return false;
    const profile = state.profile || {};
    if (profile.solidifyComplete === true || profile.presenceReady === true) return false;
    if (state.meta?.roleCardStub === true || profile.roleCardStub === true) return true;
    const detail = String(profile.detail || '');
    if (/^Stage1 批量建卡/u.test(detail)) return true;
    const role = String(profile.role || '');
    if (role === '新登场人物' && !String(profile.appearance || '').trim() && !String(profile.personality || '').trim()) return true;
    return false;
  },

  roleCardState(card = {}) {
    const stateStore = window.GameModules.characterStateStore;
    const worldTag = window.GameModules.characterQuery?.normalizeWorldTag?.(card.worldTag || card.work) || card.worldTag;
    const sharedId = String(card.id || card.links?.roleCardId || '').trim();
    if (sharedId) {
      const byId = stateStore?.get?.(sharedId);
      if (byId) return byId;
    }
    if (card.links?.roleCardId && card.links.roleCardId !== sharedId) {
      const byLink = stateStore?.get?.(card.links.roleCardId);
      if (byLink) return byLink;
    }
    return stateStore?.getByName?.(card.name, worldTag)
      || (stateStore?.list?.() || []).find((state) => {
        const profile = state?.profile || {};
        const sameName = state?.name === card.name || profile.name === card.name;
        const sameWorld = window.GameModules.characterQuery?.worldMatches?.(worldTag, state?.worldTag || profile.work) ?? (!worldTag || state?.worldTag === worldTag || profile.work === worldTag);
        return sameName && sameWorld;
      })
      || null;
  },

  /** 仅完整角色卡算「已有角色卡」；Stage1 空壳不算。 */
  roleCardExists(card = {}) {
    const state = this.roleCardState(card);
    return Boolean(state) && !this.isIncompleteRoleStub(state);
  },

  async ensure(store, raw = {}, source = 'ai') {
    const card = this.normalize(raw, store, source);
    if (!card) return null;
    const introStore = window.GameModules.characterIntroStore;
    const existing = introStore?.getById?.(card.id)
      || introStore?.get?.(card.name, card.worldTag);
    let saved = null;
    if (existing) {
      // 旧档 intro-* → 迁到共享 rel-ai-* / npc-* ID
      const preferId = window.GameModules.characterSocialDrive?.isSharedCharacterId?.(card.id)
        ? card.id
        : (existing.id || card.id);
      const merged = this.normalize({
        ...existing,
        ...raw,
        id: preferId,
        presenceKind: raw.presenceKind || existing.presenceKind || card.presenceKind,
        links: {
          ...(existing.links || {}),
          ...(raw.links || {}),
          ...(card.links || {}),
          roleCardId: preferId && window.GameModules.characterSocialDrive?.isSharedCharacterId?.(preferId)
            ? preferId
            : (card.links?.roleCardId || existing.links?.roleCardId || ''),
          scheduleId: preferId,
        },
        meta: { ...(existing.meta || {}), ...(raw.meta || {}) },
      }, store, existing.meta?.source || source);
      saved = await introStore?.save?.(merged);
    } else {
      saved = await introStore?.save?.(card);
    }
    if (!saved) return null;
    const state = this.roleCardState(saved);
    const complete = state && !this.isIncompleteRoleStub(state);
    const sharedId = state?.id || saved.id;
    return {
      ...saved,
      displayType: complete ? 'role' : 'intro',
      roleState: state || null,
      links: {
        ...(saved.links || {}),
        roleCardId: sharedId || saved.links?.roleCardId || '',
        scheduleId: saved.links?.scheduleId || sharedId || saved.id,
      },
    };
  },

  async ensureMany(store, items = [], source = 'ai') {
    const out = [];
    for (const item of Array.isArray(items) ? items : []) {
      const card = await this.ensure(store, item, source);
      if (card) out.push(card);
    }
    return out;
  },
};
