window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.playerSetupActions, {
  normalizeKnownProfessionHints(value) {
    const world = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    if (typeof value === 'string') return value.split(/[、,，;；\n]+/).map((name) => ({ name: String(name || '').trim().slice(0, 24), worldTag: world, sourceReason: '玩家现实身份上下文表明其知道该职业。' })).filter((item) => item.name).slice(0, 5);
    if (!Array.isArray(value)) return [];
    return value.map((item) => ({ name: String(item?.name || item || '').trim().slice(0, 24), worldTag: String(item?.worldTag || world).trim().slice(0, 32), sourceReason: String(item?.sourceReason || '玩家现实身份上下文表明其知道该职业。').trim().slice(0, 120) })).filter((item) => item.name).slice(0, 5);
  },
  recoverCarryArray(text, key) { return window.GameModules.jsonUtils.pickObjectArrayNames(text, key).map((name) => ({ name })); },
  recoverWearingArray(text) { return window.GameModules.jsonUtils.pickObjectArrayNames(text, 'wearing').map((name, index) => ({ slot: index === 0 ? '上衣' : '装备', name })); },
  normalizeCarryHints(value, kind) {
    const list = Array.isArray(value) ? value : String(value || '').split(/[、,，;；\n]+/).map((name) => ({ name }));
    return list.map((item) => window.GameModules.progression.normalizeCarryItem(item, kind)).filter((item) => item.name && item.name !== '未命名物品').slice(0, 20);
  },
  normalizeWearingHints(value) {
    const raw = Array.isArray(value) ? value : String(value || '').split(/[、,，;；\n]+/).map((name) => ({ name }));
    const p = window.GameModules.progression;
    return raw.map((item, index) => {
      const name = String(item?.name || item || '未穿戴').slice(0, 32);
      const slot = String(item?.slot || p.inferEquipSlots?.({ name }, '装备')?.[0] || (index === 0 ? '上衣' : '装备')).slice(0, 12);
      return { slot, name, type: '穿着', description: String(item?.description || '').slice(0, 80), level: -1 };
    }).filter((item) => item.slot && item.name !== '未穿戴');
  },
  async syncKnownProfessionsFromProfile(items) {
    if (!Array.isArray(items) || !items.length || typeof this.knowProfession !== 'function') return;
    this.initKnownProfessionApp?.();
    for (const item of items) await this.knowProfession(item.name, item.worldTag, { sourceReason: item.sourceReason, characterName: this.playerProfile?.name || this.playerName, role: this.playerProfile?.refinedRole || this.playerProfile?.dailyRole, detail: this.playerProfile?.worldbuildingNote || this.playerProfile?.notes });
  },
  ensurePreciseAddress(address) {
    const value = String(address || '').trim();
    const vague = !value || /某|一处|普通|未知|附近|片区|等/.test(value);
    const precise = /省.+(市|州).+(区|县|市).+(镇|街道).+(社区|小区|家属院|公寓|花园).+(栋|号楼).+(号|室)/.test(value);
    return !vague && precise ? value.slice(0, 100) : this.fallbackPreciseAddress(value).slice(0, 100);
  },
  fallbackPreciseAddress(address) {
    if (/四川/.test(address || '')) return '四川省成都市武侯区玉林街道玉林北路社区锦苑小区3栋2单元601号';
    if (/北京/.test(address || '')) return '北京市朝阳区望京街道花家地社区望京西园一区6号楼2单元502号';
    if (/上海/.test(address || '')) return '上海市浦东新区花木街道牡丹社区牡丹苑小区12号楼1单元803号';
    if (/广东|广州/.test(address || '')) return '广东省广州市天河区石牌街道龙口西社区天誉花园8栋1单元701号';
    return `${address || '四川省成都市武侯区'}玉林街道玉林北路社区锦苑小区3栋2单元601号`;
  },
  fallbackRefinedRole(role, age, city) {
    const place = (city || '本地').replace(/(省|市|县|区|镇|街道|社区|小区|家属院|公寓|花园|栋|号楼|单元|号|室)/g, '').slice(-4) || '本地';
    if (/高中|学生/.test(role || '') && age) return `${place}第一中学${age <= 16 ? '高一年级' : (age >= 18 ? '高三年级' : '高二年级')}学生`;
    return role || `${age || ''}岁现代都市居民`;
  },
  async syncPlayerProfileLexicon() {
    const worldTag = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const p = this.playerProfile || {};
    const manual = ['姓名', '性别', '生日', '年龄', '人际关系', '备注'];
    const reasonFor = (field) => manual.includes(field.label)
      ? `${field.label}来自玩家激活手机时主动填写的表单值。`
      : `${field.label}由AI结合玩家姓名、生日、城市、身份、居住状态和备注补全为当前值。`;
    await window.GameModules.rpgLexicon.saveMany(this.playerProfileLexiconFields().map((field) => ({ worldTag, kind: '玩家设定', name: field.label, value: field.raw || field.value, summary: field.value, description: field.desc, reason: reasonFor(field), nameAiGenerated: false, valueAiGenerated: !manual.includes(field.label), changeMode: manual.includes(field.label) ? '用户主动填写' : 'AI补全玩家设定', source: 'ai', meta: { targetType: '非角色', commonField: true, playerName: p.name || this.playerName } })));
  },
  fallbackParentDeathCause(age) { return age && age < 18 ? '数年前因一场夜间交通事故相继离世，具体细节由后续剧情逐步揭开。' : '多年前因突发交通事故离世，留下的生活痕迹仍影响玩家的现实处境。'; },
  reopenPlayerSetup() { this.phoneSetupDone = false; this.phoneActivationChoice = ''; },
});
