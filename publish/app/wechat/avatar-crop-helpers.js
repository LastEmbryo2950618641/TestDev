window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.avatarCropHelpers = {
  wechatAvatarText(contact = this.wechatProfileContact()) {
    return String(contact?.mark || contact?.name?.slice(0, 1) || '微').slice(0, 2);
  },

  wechatAvatarStyle(contact = this.wechatProfileContact()) {
    const avatar = contact?.avatar || {};
    if (!avatar.url) return '';
    const crop = avatar.crop || this.defaultWechatAvatarCrop();
    const w = Math.min(0.95, Math.max(0.18, Number(crop.w) || 0.52));
    const ratio = Math.max(0.5, Number(crop.ratio) || 1.5);
    const h = Math.min(0.95, w / ratio);
    const x = Math.min(1 - w, Math.max(0, Number(crop.x) || 0));
    const y = Math.min(1 - h, Math.max(0, Number(crop.y) || 0));
    const px = (1 - w) > 0 ? (x / (1 - w)) * 100 : 50;
    const py = (1 - h) > 0 ? (y / (1 - h)) * 100 : 50;
    return `background-image:url("${String(avatar.url).replace(/"/g, '%22')}");background-size:${100 / w}% auto;background-position:${px}% ${py}%;color:transparent;`;
  },

  defaultWechatAvatarCrop(ratio = 1.5) {
    return { x: 0.24, y: 0.04, w: 0.52, ratio };
  },

  wechatMessageAvatarContact(msg = {}) {
    if (msg.side === 'self') return { name: this.playerDisplayCharacter?.().name || this.playerName || '我', mark: '我' };
    const id = msg.characterId || this.wechatSelectedContact;
    return this.wechatContacts?.().find((item) => item.id === id) || this.wechatSelected?.() || { name: msg.name || '', mark: msg.mark || '微' };
  },

  wechatFaceBoxToCrop(box, img) {
    const width = img.naturalWidth || img.width || 1;
    const height = img.naturalHeight || img.height || 1;
    const bx = Number(box.x ?? box.left) || 0;
    const by = Number(box.y ?? box.top) || 0;
    const bw = Number(box.width ?? box.w) || width * 0.28;
    const bh = Number(box.height ?? box.h) || height * 0.2;
    const size = Math.min(width, Math.max(bw, bh) * 2.05);
    const left = Math.min(width - size, Math.max(0, bx + bw / 2 - size / 2));
    const top = Math.min(height - size, Math.max(0, by + bh * 0.48 - size * 0.45));
    return { x: left / width, y: top / height, w: size / width, ratio: height / width };
  },

  wechatAvatarCropImageStyle() {
    const s = this.wechatAvatarCropState || {};
    const scale = Math.max(1, Number(s.scale) || 1.92);
    const ratio = Math.max(0.5, Number(s.ratio) || 1.5);
    const x = Math.max(0, Number(s.x) || 0);
    const y = Math.max(0, Number(s.y) || 0);
    return `width:${scale * 100}%;left:${-x * scale}%;top:${-y * scale * ratio}%;`;
  },
};
