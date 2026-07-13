window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.albumPromptHelpers = {
  wechatAlbumStateData(contact = this.wechatAlbumContact()) {
    const key = String(contact?.id || 'player-self').trim() || 'player-self';
    let state = this.rpgStates?.[key] || window.GameModules.characterStateStore?.get?.(key) || {};
    if (key === 'player-self') {
      const fallbackProfile = this.playerDisplayCharacter?.() || this.playerCharacterBase?.() || {};
      const savedProfile = state.profile || {};
      const profile = { ...fallbackProfile, ...savedProfile, id: 'player-self', isPlayer: true };
      ['name', 'gender', 'age', 'birthday', 'role', 'job', 'appearance', 'detail', 'description', 'personality'].forEach((field) => {
        if (!String(profile[field] || '').trim() && fallbackProfile[field]) profile[field] = fallbackProfile[field];
      });
      state = { ...state, id: 'player-self', name: profile.name || state.name || this.playerName || '', profile };
    }
    return { state, profile: state.profile || {} };
  },

  wechatAlbumIdentityItems(contact = this.wechatAlbumContact(), state = {}, profile = {}) {
    return [
      ['name', '姓名', profile.name || contact.name || '未记录'], ['role', '身份', profile.role || contact.relation || '微信联系人'],
      ['gender', '性别', profile.gender || '未记录'], ['age', '年龄/生日', `${profile.age || state.values?.age || '未记录'} / ${profile.birthday || '未记录'}`],
      ['job', '职业', profile.job || '未记录'], ['appearance', '外貌', profile.appearance || '未记录'],
      ['personality', '性格', profile.personality || '未记录'], ['detail', '人物说明', profile.detail || profile.description || '未记录'],
      ['relationships', '人际关系', profile.relationships || contact.relation || '未记录'],
    ].map(([key, label, value]) => ({ key, label, value, text: `${label}：${value}` }));
  },

  wechatAlbumBodyItems(body = [], profile = {}, kind = 'natural') {
    const cfg = window.GameModules.appearanceProfileTags;
    const items = [];
    const metaText = kind === 'dressed'
      ? cfg?.formatDressedMeta?.(profile.dressedProfileMeta || {})
      : cfg?.formatNaturalMeta?.(profile.bodyProfileMeta || {});
    if (metaText) items.push({ key: 'body-meta', label: '全局', value: metaText, text: `全局：${metaText}` });
    if (Array.isArray(body) && body.length) {
      body.forEach((item, index) => {
        const label = item.part || item.name || `部位${index + 1}`;
        const tags = cfg?.formatPartTags?.(item) || '';
        const value = item.description || item.detail || '未记录';
        items.push({
          key: `body-${index}`,
          label,
          value,
          text: tags ? `${label}[${tags}]：${value}` : `${label}：${value}`,
        });
      });
    }
    return items.length ? items : [{ key: 'body-empty', label: '部位描述', value: '未记录', text: '未记录' }];
  },

  wechatAlbumPromptOptions(kind = this.wechatAlbumPromptDraft?.kind || 'natural') {
    const contact = this.wechatAlbumContact();
    const { state, profile } = this.wechatAlbumStateData(contact);
    return {
      identity: this.wechatAlbumIdentityItems(contact, state, profile),
      body: kind === 'custom' ? [] : this.wechatAlbumBodyItems(kind === 'dressed' ? profile.dressedProfile : profile.bodyProfile, profile, kind),
    };
  },

  wechatAlbumKindLabel(kind = this.wechatAlbumPromptDraft?.kind || 'natural') {
    return kind === 'custom' ? '自定义状态' : (kind === 'dressed' ? '盛装状态' : '自然状态');
  },

  wechatAlbumSelectedText() {
    const draft = this.wechatAlbumPromptDraft || { kind: 'natural', identityKeys: [], bodyKeys: [], customText: '', extraText: '' };
    const options = this.wechatAlbumPromptOptions(draft.kind);
    const identityItems = options.identity.filter((item) => draft.identityKeys.includes(item.key));
    const bodyItems = draft.kind === 'custom' ? [] : options.body.filter((item) => draft.bodyKeys.includes(item.key));
    const identityInfo = identityItems.map((item) => item.text).join('\n') || '未记录';
    const bodyText = draft.kind === 'custom' ? String(draft.customText || '').trim() : bodyItems.map((item) => item.text).join('\n');
    return { identityInfo, bodyText: bodyText || '未记录', extraText: String(draft.extraText || '').trim(), stateName: this.wechatAlbumKindLabel(draft.kind), kind: draft.kind, identityItems, bodyItems };
  },

  wechatAlbumPromptPreview() {
    return this.wechatAlbumPhotoPrompt(this.wechatAlbumContact(), this.wechatAlbumPromptDraft?.kind || 'natural', this.wechatAlbumPromptDraft);
  },

  wechatAlbumSelectedCharCount() {
    const selected = this.wechatAlbumSelectedText?.();
    const text = selected ? [selected.identityInfo, selected.bodyText, selected.extraText].filter(Boolean).join('\n') : this.wechatAlbumPromptPreview();
    return String(text || '').trim().length;
  },

  wechatAlbumIdentityInfo(contact, state = {}, profile = {}) {
    return this.wechatAlbumIdentityItems(contact, state, profile).map((item) => item.text).join('\n');
  },

  wechatAlbumBodyText(body) {
    return this.wechatAlbumBodyItems(body).map((item) => item.text).join('\n');
  },

  wechatAlbumPhotoPrompt(contact, kind = 'natural', draft = null) {
    const ctx = this.wechatAlbumTagContext(contact, kind, draft);
    const template = this.wechatAlbumDrawTagTemplate?.() || window.GameModules.pictureGeneratePrompts?.drawTagPrompt || '';
    return this.renderWechatAlbumPrompt(template, ctx).slice(0, 2000);
  },
};
