window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.albumOrchestration = {
  wechatContactFromState(id = '') {
    const key = String(id || 'player-self').trim() || 'player-self';
    const state = this.rpgStates?.[key] || window.GameModules.sqliteSave?.getCharacterState?.(key) || (key === 'player-self' ? this.playerIdentityState?.() : null) || {};
    const profile = state.profile || {};
    const name = profile.name || state.name || (key === 'player-self' ? (this.playerName || this.playerProfile?.name || '玩家') : key);
    return { id: key, name, mark: String(name || key).slice(0, 1), relation: profile.role || state.role || '形象图目标', subtitle: profile.work || state.worldTag || '' };
  },

  wechatProfileContact() {
    return this.wechatSelected?.() || this.wechatContactFromState(this.wechatSelectedContact || 'player-self') || { id: 'player-self', name: '联系人', mark: '联' };
  },

  wechatAlbumContact(targetId = '') {
    const key = String(targetId || this.wechatAlbumBodyFigureContext?.characterId || '').trim();
    if (!key) return this.wechatProfileContact();
    const stateContact = this.wechatContactFromState(key);
    const explicit = (this.wechatContacts?.() || []).find((item) => item?.id === key && !item?.group);
    if (!explicit) return stateContact;
    return {
      ...explicit,
      ...stateContact,
      id: key,
      mark: stateContact.mark || explicit.mark || String(stateContact.name || explicit.name || key).slice(0, 1),
      name: stateContact.name || explicit.name || key,
      relation: stateContact.relation || explicit.relation || explicit.subtitle || '',
      subtitle: stateContact.subtitle || explicit.subtitle || '',
    };
  },

  wechatAlbumPhotoListForContact(contact = this.wechatProfileContact()) {
    const raw = this.wechatAlbumPhotos?.[contact?.id || 'player-self'];
    if (Array.isArray(raw)) return raw.filter((item) => item?.url);
    return raw?.url ? [raw] : [];
  },

  wechatAlbumPhotoList() {
    return this.wechatAlbumPhotoListForContact(this.wechatProfileContact());
  },

  wechatAlbumPhoto() {
    return this.wechatAlbumPhotoList()[0] || null;
  },

  refreshWechatAlbum() {
    const contact = this.wechatProfileContact();
    if (!contact?.id) return;
    const list = this.wechatAlbumPhotoList();
    this.wechatAlbumPhotos = { ...(this.wechatAlbumPhotos || {}), [contact.id]: [...list] };
  },
};
