window.GameModules = window.GameModules || {};
window.GameModules.wechatAvatarCropActions = {
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

  defaultWechatAvatarCrop(ratio = 1.5) { return { x: 0.24, y: 0.04, w: 0.52, ratio }; },

  wechatMessageAvatarContact(msg = {}) {
    if (msg.side === 'self') return { name: this.playerDisplayCharacter?.().name || this.playerName || '我', mark: '我' };
    const id = msg.characterId || this.wechatSelectedContact;
    return this.wechatContacts?.().find((item) => item.id === id) || this.wechatSelected?.() || { name: msg.name || '', mark: msg.mark || '微' };
  },

  loadWechatAvatarImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = url;
    });
  },

  async detectWechatAvatarFace(img) {
    const native = await this.detectWechatAvatarByFaceDetector(img);
    if (native) return native;
    return this.detectWechatAvatarByLocalLibrary(img);
  },

  async detectWechatAvatarByFaceDetector(img) {
    if (!window.FaceDetector) return null;
    try {
      const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(img);
      return faces?.[0]?.boundingBox ? this.wechatFaceBoxToCrop(faces[0].boundingBox, img) : null;
    } catch (err) {
      console.warn('[微信相册] FaceDetector 识别失败:', err.message, err.stack);
      return null;
    }
  },

  async detectWechatAvatarByLocalLibrary(img) {
    const detector = window.GameModules.localFaceDetector || window.localFaceDetector;
    if (!detector?.detect) return null;
    try {
      const faces = await detector.detect(img);
      const face = Array.isArray(faces) ? faces[0] : faces;
      const box = face?.boundingBox || face?.box || face;
      return box ? this.wechatFaceBoxToCrop(box, img) : null;
    } catch (err) {
      console.warn('[微信相册] 本地人脸库识别失败:', err.message, err.stack);
      return null;
    }
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

  async autoCaptureWechatAvatar(index = 0, contactOverride = null) {
    const contact = contactOverride || this.wechatProfileContact();
    const list = contactOverride && this.wechatAlbumPhotoListForContact
      ? this.wechatAlbumPhotoListForContact(contact)
      : this.wechatAlbumPhotoList();
    const photo = list[index];
    await this.autoCaptureWechatAvatarFromUrl(photo?.url || '', contact);
  },

  async autoCaptureWechatAvatarFromUrl(url = '', contactOverride = null) {
    const src = String(url || '').trim();
    const contact = contactOverride || this.wechatProfileContact();
    if (!src) return;
    let crop = this.defaultWechatAvatarCrop();
    try {
      const img = await this.loadWechatAvatarImage(src);
      crop = await this.detectWechatAvatarFace(img) || this.defaultWechatAvatarCrop((img.naturalHeight || 1) / (img.naturalWidth || 1));
    } catch (err) {
      console.warn('[微信相册] 自动截取头像失败，使用固定构图:', err.message, err.stack);
    }
    await this.applyWechatAvatarCrop(src, crop, contact);
  },

  async applyWechatAvatarCrop(url, crop, contactOverride = null) {
    const contact = contactOverride || this.wechatProfileContact();
    if (!contact?.id) return;
    const avatar = { url, crop };
    let matched = false;
    this.wechatUsers = (this.wechatUsers || []).map((item) => {
      if (item.id !== contact.id) return item;
      matched = true;
      return { ...item, avatar };
    });
    if (!matched && contact.id !== 'player-self') {
      this.wechatUsers = [
        ...(this.wechatUsers || []),
        {
          id: contact.id,
          characterId: contact.characterId || contact.id,
          name: contact.name || contact.id,
          mark: contact.mark || String(contact.name || contact.id).slice(0, 1),
          relation: contact.relation || '',
          subtitle: contact.subtitle || contact.relation || '',
          avatar,
        },
      ];
    }
    await this.save?.();
  },

  async openWechatAvatarCrop(index = 0) {
    const photo = this.wechatAlbumPhotoList()[index];
    if (!photo?.url) return;
    this.wechatAvatarCropPhotoIndex = index;
    this.wechatAvatarCropState = { url: photo.url, x: 24, y: 4, scale: 1.92, ratio: 1.5 };
    this.wechatAvatarCropOpen = true;
    try {
      const img = await this.loadWechatAvatarImage(photo.url);
      this.wechatAvatarCropState.ratio = (img.naturalHeight || 1) / (img.naturalWidth || 1);
    } catch (err) {
      console.warn('[微信相册] 裁剪预览图片加载失败:', err.message, err.stack);
    }
  },

  closeWechatAvatarCrop() { this.wechatAvatarCropOpen = false; },

  wechatAvatarCropImageStyle() {
    const s = this.wechatAvatarCropState || {};
    const scale = Math.max(1, Number(s.scale) || 1.92);
    const ratio = Math.max(0.5, Number(s.ratio) || 1.5);
    const x = Math.max(0, Number(s.x) || 0);
    const y = Math.max(0, Number(s.y) || 0);
    return `width:${scale * 100}%;left:${-x * scale}%;top:${-y * scale * ratio}%;`;
  },

  async saveWechatAvatarCrop() {
    const s = this.wechatAvatarCropState || {};
    const scale = Math.max(1, Number(s.scale) || 1.92);
    const ratio = Math.max(0.5, Number(s.ratio) || 1.5);
    const w = 1 / scale;
    const h = w / ratio;
    const crop = {
      x: Math.min(1 - w, Math.max(0, (Number(s.x) || 0) / 100)),
      y: Math.min(1 - h, Math.max(0, (Number(s.y) || 0) / 100)),
      w,
      ratio,
    };
    await this.applyWechatAvatarCrop(s.url, crop);
    this.wechatAvatarCropOpen = false;
  },
};
