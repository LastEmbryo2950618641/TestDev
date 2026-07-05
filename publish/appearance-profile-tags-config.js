window.GameModules = window.GameModules || {};

/** 自然/盛装外貌标签维度与词表；供 Part5/Part6 生成与 Stage5 局部更新共用 */
window.GameModules.appearanceProfileTags = {
  bodyParts() {
    return window.GameModules.characterProfile?.bodyProfileParts?.()
      || ['头发', '脸部', '耳朵', '脖颈', '胸部', '双臂', '小腹', '臀部', '神秘花园', '双大腿', '双小腿'];
  },

  naturalMetaFields() {
    return ['overall', 'figure', 'height', 'weight', 'skinTone', 'aura'];
  },

  dressedMetaFields() {
    return ['styleBase', 'makeupBase', 'colorScheme', 'hosiery', 'hairstyle', 'accessoryDensity'];
  },

  vocab: {
    overall: ['萝莉', '少女', '御姐', '幼态', '童颜', '清纯', '成熟', '冷艳'],
    figure: ['纤细', '瘦弱', '苗条', '匀称', '标准', '紧致', '曲线优美', '腰臀比突出', 'S型', '微肉', '丰满', '软润', '骨感'],
    skinTone: ['雪白', '白皙', '健康小麦', '偏黄', '粉润'],
    aura: ['可爱', '帅气', '清纯', '清冷', '成熟', '元气', '中性'],
    styleBase: ['JK风', '哥特', '休闲', '甜美', '暗黑', '运动风', 'LO风', '简约', '居家'],
    makeupBase: ['精致妆容', '清新裸妆', '日常淡妆', '哥特妆', '素颜感', '淡颜系'],
    colorScheme: ['白系', '黑系', '粉系', '米白', '蓝白', '深色系', '撞色'],
    hosiery: ['过膝袜', '连裤袜', '中筒袜', '裸腿', '短袜', '黑丝', '白丝'],
    hairstyle: ['双马尾', '黑长直', '公主切', '散发', '单马尾', '编发'],
    accessoryDensity: ['精致点缀', '极简', '发饰丰富', '无饰品'],
  },

  naturalPartDimensions: {
    头发: ['发色', '发质', '长度', '自然走向'],
    脸部: ['脸型', '眼型', '鼻唇', '素颜气质', '气色'],
    耳朵: ['耳型'],
    脖颈: ['颈线', '锁骨'],
    胸部: ['量级', '胸型', '轮廓'],
    双臂: ['手臂', '双手'],
    小腹: ['腰腹', '肚脐'],
    臀部: ['臀型', '饱满度'],
    神秘花园: ['毛发', '形态', '腿间距离'],
    双大腿: ['线条', '内侧', '贴合度'],
    双小腿: ['线条', '踝足'],
  },

  dressedPartDimensions: {
    头发: ['造型', '发饰', '光泽'],
    脸部: ['底妆', '眉眼', '唇颊'],
    耳朵: ['耳饰'],
    脖颈: ['颈饰'],
    胸部: ['内搭', '外搭轮廓'],
    双臂: ['袖口', '手饰', '美甲'],
    小腹: ['腰带', '外搭轮廓'],
    臀部: ['下装版型'],
    神秘花园: ['内搭款式'],
    双大腿: ['袜类', '裤腿', '绝对领域'],
    双小腿: ['鞋袜', '鞋履'],
  },

  naturalMetaTemplate() {
    return { overall: [], figure: [], height: '', weight: '', skinTone: [], aura: [] };
  },

  dressedMetaTemplate() {
    return { styleBase: [], makeupBase: [], colorScheme: [], hosiery: [], hairstyle: [], accessoryDensity: [] };
  },

  emptyPartItem(index, part) {
    return { index, part, tags: [], description: '' };
  },

  normalizeStringList(value, max = 3) {
    const list = Array.isArray(value) ? value : String(value || '').split(/[,，、/|]/);
    return [...new Set(list.map((item) => String(item || '').trim()).filter(Boolean))].slice(0, max);
  },

  normalizeHeight(value = '') {
    const raw = String(value || '').trim();
    const match = raw.match(/(\d{2,3})\s*cm/i);
    return match ? `${match[1]}cm` : raw;
  },

  normalizeWeight(value = '') {
    const raw = String(value || '').trim();
    const match = raw.match(/(\d{2,3}(?:\.\d)?)\s*kg/i);
    return match ? `${match[1]}kg` : raw;
  },

  normalizeNaturalMeta(meta = {}, profile = {}) {
    const base = this.naturalMetaTemplate();
    const source = meta && typeof meta === 'object' ? meta : {};
    const inferred = this.inferNaturalMetaFromProfile(profile);
    return {
      overall: this.normalizeStringList(source.overall?.length ? source.overall : inferred.overall, 2),
      figure: this.normalizeStringList(source.figure?.length ? source.figure : inferred.figure, 2),
      height: this.normalizeHeight(source.height || inferred.height),
      weight: this.normalizeWeight(source.weight || inferred.weight),
      skinTone: this.normalizeStringList(source.skinTone?.length ? source.skinTone : inferred.skinTone, 2),
      aura: this.normalizeStringList(source.aura?.length ? source.aura : inferred.aura, 2),
    };
  },

  normalizeDressedMeta(meta = {}, profile = {}) {
    const source = meta && typeof meta === 'object' ? meta : {};
    const pref = this.inferDressedMetaFromPreferences(profile);
    return {
      styleBase: this.normalizeStringList(source.styleBase?.length ? source.styleBase : pref.styleBase, 2),
      makeupBase: this.normalizeStringList(source.makeupBase?.length ? source.makeupBase : pref.makeupBase, 2),
      colorScheme: this.normalizeStringList(source.colorScheme?.length ? source.colorScheme : pref.colorScheme, 2),
      hosiery: this.normalizeStringList(source.hosiery?.length ? source.hosiery : pref.hosiery, 2),
      hairstyle: this.normalizeStringList(source.hairstyle?.length ? source.hairstyle : pref.hairstyle, 2),
      accessoryDensity: this.normalizeStringList(source.accessoryDensity?.length ? source.accessoryDensity : pref.accessoryDensity, 2),
    };
  },

  normalizePartItem(item = {}, index = 1, part = '') {
    const tags = this.normalizeStringList(item.tags, 6);
    return {
      index: Number(item.index) || index,
      part: String(item.part || part).trim(),
      tags,
      description: String(item.description || item['部位描写'] || '').trim(),
    };
  },

  inferNaturalMetaFromProfile(profile = {}) {
    const text = `${profile.appearance || ''} ${profile.preferences || ''} ${profile.detail || ''} ${profile.personality || ''}`;
    const overall = [];
    if (/萝莉|幼态|童颜|娇小/.test(text)) overall.push('萝莉');
    else if (/御姐|成熟|冷艳/.test(text)) overall.push('御姐');
    else overall.push('少女');
    const figure = [];
    if (/纤细|瘦弱|苗条|娇小/.test(text)) figure.push('纤细');
    if (/曲线|腰臀|S型|饱满/.test(text)) figure.push('曲线优美');
    if (!figure.length) figure.push(/瘦弱/.test(text) ? '瘦弱' : '匀称');
    const heightMatch = text.match(/(\d{2,3})\s*cm/);
    const ageMatch = text.match(/(\d{1,2})\s*岁/);
    let height = heightMatch ? `${heightMatch[1]}cm` : '';
    if (!height && /155|娇小|萝莉/.test(text)) height = '155cm';
    if (!height && ageMatch && Number(ageMatch[1]) <= 20) height = '158cm';
    let weight = '';
    if (/155/.test(height)) weight = overall.includes('萝莉') ? '41kg' : '43kg';
    const skinTone = /白皙|雪白|白皮肤|皮肤白/.test(text) ? ['雪白'] : ['白皙'];
    const aura = /可爱|帅气|清冷|元气/.test(text)
      ? [text.match(/可爱|帅气|清冷|元气/)?.[0] || '可爱']
      : (overall.includes('御姐') ? ['清冷'] : ['可爱']);
    return { overall: overall.slice(0, 1), figure: figure.slice(0, 2), height, weight, skinTone, aura };
  },

  inferDressedMetaFromPreferences(profile = {}) {
    const layers = profile.essentialPreferenceLayers || {};
    const layer5 = String(layers.layer5 || '');
    const pick = (pattern, fallback = []) => {
      const found = layer5.match(pattern);
      return found ? found.slice(1).filter(Boolean) : fallback;
    };
    const clothing = pick(/穿着偏好:([^;]+)/);
    const dress = pick(/打扮偏好:([^;]+)/);
    const splitTags = (chunk = '') => chunk.split(/[,，、]/).map((s) => s.trim()).filter(Boolean);
    const clothingTags = splitTags(clothing[0] || '');
    const dressTags = splitTags(dress[0] || '');
    const psych = profile.psychPreferences?.selected || {};
    const clothingPref = psych.clothing_pref || clothingTags;
    const dressPref = psych.dress || dressTags;
    const styleBase = [];
    if (clothingPref.some((t) => /JK/.test(t))) styleBase.push('JK风');
    if (clothingPref.some((t) => /哥特|暗黑/.test(t))) styleBase.push('哥特');
    if (!styleBase.length) styleBase.push('休闲');
    const colorScheme = clothingPref.some((t) => /白/.test(t)) ? ['白系']
      : clothingPref.some((t) => /黑/.test(t)) ? ['黑系'] : ['米白'];
    return {
      styleBase: styleBase.slice(0, 2),
      makeupBase: (dressPref.length ? dressPref : ['精致妆容']).slice(0, 2),
      colorScheme: colorScheme.slice(0, 1),
      hosiery: clothingPref.filter((t) => /袜/.test(t)).slice(0, 2).length
        ? clothingPref.filter((t) => /袜/.test(t)).slice(0, 2)
        : ['过膝袜'],
      hairstyle: clothingPref.filter((t) => /马尾|长直|双马尾|公主切/.test(t)).slice(0, 2).length
        ? clothingPref.filter((t) => /马尾|长直|双马尾|公主切/.test(t)).slice(0, 2)
        : ['黑长直'],
      accessoryDensity: dressPref.some((t) => /发饰|精致/.test(t)) ? ['精致点缀'] : ['极简'],
    };
  },

  naturalMetaComplete(meta = {}) {
    const m = this.normalizeNaturalMeta(meta);
    return m.overall.length >= 1
      && m.figure.length >= 1
      && /^\d{2,3}cm$/i.test(m.height)
      && /^\d{2,3}(?:\.\d)?kg$/i.test(m.weight);
  },

  dressedMetaComplete(meta = {}) {
    const m = this.normalizeDressedMeta(meta);
    return m.styleBase.length >= 1 && m.makeupBase.length >= 1;
  },

  partItemComplete(item = {}, requireTags = false) {
    const normalized = this.normalizePartItem(item);
    if (!normalized.part || !normalized.description) return false;
    if (requireTags && normalized.tags.length < 2) return false;
    return true;
  },

  formatNaturalMeta(meta = {}) {
    const m = this.normalizeNaturalMeta(meta);
    return [
      `整体：${m.overall.join('、') || '未记录'}`,
      `身材：${m.figure.join('、') || '未记录'}`,
      `身高：${m.height || '未记录'}`,
      `体重：${m.weight || '未记录'}`,
      m.skinTone.length ? `肤色：${m.skinTone.join('、')}` : '',
      m.aura.length ? `气质：${m.aura.join('、')}` : '',
    ].filter(Boolean).join('；');
  },

  formatDressedMeta(meta = {}) {
    const m = this.normalizeDressedMeta(meta);
    return [
      `风格：${m.styleBase.join('、') || '未记录'}`,
      `妆容：${m.makeupBase.join('、') || '未记录'}`,
      m.colorScheme.length ? `配色：${m.colorScheme.join('、')}` : '',
      m.hosiery.length ? `袜类：${m.hosiery.join('、')}` : '',
      m.hairstyle.length ? `发型：${m.hairstyle.join('、')}` : '',
      m.accessoryDensity.length ? `饰品：${m.accessoryDensity.join('、')}` : '',
    ].filter(Boolean).join('；');
  },

  formatPartTags(item = {}) {
    const tags = this.normalizeStringList(item.tags, 6);
    return tags.length ? tags.join('、') : '';
  },

  summarizeBodyProfile(profile = {}) {
    const meta = this.formatNaturalMeta(profile.bodyProfileMeta || {});
    const parts = (Array.isArray(profile.bodyProfile) ? profile.bodyProfile : [])
      .filter((item) => String(item?.description || '').trim())
      .slice(0, 4)
      .map((item) => {
        const tags = this.formatPartTags(item);
        return `${item.part}${tags ? `[${tags}]` : ''}=${String(item.description).slice(0, 28)}`;
      })
      .join('；');
    return [meta, parts].filter(Boolean).join('\n');
  },

  summarizeDressedProfile(profile = {}) {
    const meta = this.formatDressedMeta(profile.dressedProfileMeta || {});
    const parts = (Array.isArray(profile.dressedProfile) ? profile.dressedProfile : [])
      .filter((item) => String(item?.description || '').trim())
      .slice(0, 4)
      .map((item) => {
        const tags = this.formatPartTags(item);
        return `${item.part}${tags ? `[${tags}]` : ''}=${String(item.description).slice(0, 28)}`;
      })
      .join('；');
    return [meta, parts].filter(Boolean).join('\n');
  },

  /** 离散档位：自然 tags 只有跨档才允许 Stage5 更新 */
  bodyTagTiers: {
    胸部量级: ['贫乳', '微乳', '中乳', '巨乳'],
    神秘花园毛发: ['无阴毛', '阴毛稀疏', '阴毛浓密'],
    整体: ['萝莉', '幼态', '童颜', '少女', '清纯', '御姐', '成熟', '冷艳'],
    身材: ['骨感', '瘦弱', '纤细', '苗条', '匀称', '标准', '紧致', '曲线优美', '腰臀比突出', '微肉', '丰满', '软润'],
  },

  tierIndex(group, tag) {
    const tiers = this.bodyTagTiers[group] || [];
    const idx = tiers.indexOf(String(tag || '').trim());
    return idx >= 0 ? idx : -1;
  },

  /** 是否跨过一个完整档位（供 prompt 说明；代码侧不做硬拦截） */
  crossesTier(group, beforeTags = [], afterTags = []) {
    const tiers = this.bodyTagTiers[group] || [];
    if (!tiers.length) return false;
    const before = (Array.isArray(beforeTags) ? beforeTags : []).map((t) => this.tierIndex(group, t)).filter((i) => i >= 0);
    const after = (Array.isArray(afterTags) ? afterTags : []).map((t) => this.tierIndex(group, t)).filter((i) => i >= 0);
    if (!before.length || !after.length) return false;
    const b = Math.max(...before);
    const a = Math.max(...after);
    return Math.abs(a - b) >= 1;
  },

  bodyChangeFactGuide() {
    return [
      '### 自然体貌（Part5）更新总则',
      '- **任一部位**（头发、脸部、…、神秘花园、双大腿、双小腿）及 **bodyProfileMeta** 均可更新；无事实依据则一律 **needsUpdate: false**。',
      '- 不优先、不偏向某一类变化来源；按正文实际证据判断，勿因示例类型而漏判或滥判其他部位。',
      '',
      '### 三项门槛（须全部满足）',
      '1. **客观锚点**：正文有可核对事实——量体/读数/体检/尺码/影像/他人目检记录/已发生的伤害或治疗结果/与系统已确认状态（如结算、档案计数）一致等。不合格：玩家或角色单方面断言、「感觉/似乎/好像」、无验证的台词、单次互动后的主观形容。',
      '2. **上下文推断链**：变化须能从时间跨度、发育、训练、伤病、医疗、生活方式等因果推出，而非孤立一句。',
      '3. **实质变化**：须达到可写进 tags 的**档位跨越**或**性质不同的新状态**；同档/同性质内的细微差别不更新（例：量级仍属同一档的略涨略瘦；色泽/紧致度无明确档位跨越的轻微差异）。',
      '',
      '### 变化来源（并列示例，非穷尽、非优先级）',
      '- 时间与发展：久别实测、发育完成、年龄带来的整体/meta 跨档',
      '- 体态与 meta：体重秤/体检支持的 weight、figure、overall 跨档',
      '- 造型永久化：剪染烫等已完成的头发',
      '- 训练与劳损：长期锻炼或劳作导致的肌肉/线条 tags 跨档',
      '- 伤损与修复：事故、手术、疤痕、残疾等已在正文发生且后果明确',
      '- 生活方式长期累积：**仅当**叙事与可核对记录（含已结算的性经验/身体状态等）**共同确认**永久体貌改变时，可更新对应部位 tags；无确认则不写',
      '- 装扮错觉：内衣、束身、姿势、镜面、化妆 → 只改 dressedProfile',
    ].join('\n');
  },

  /** Stage5 判定提示：写入 gate prompt */
  stage5GateTriggerGuide() {
    return [
      '## 盛装 dressedProfile（优先）',
      '- 换穿/脱卸/弄乱/补妆/造型饰品变化 → 对应 11 部位',
      '- 仅视觉塑形、未改变真实体貌 → 只改盛装，不改 Part5',
      '',
      '## 自然 bodyProfile（从严；11 部位 + meta 同等规则）',
      this.bodyChangeFactGuide(),
      '',
      '### meta（updateScope: meta）',
      '- weight / figure / overall / height：须客观依据 + 跨档或实质改变；height 极少',
      '',
      '### 部位（updateScope: parts）',
      '- 按证据指向**实际发生永久变化**的部位更新，不限于某一类剧情',
      '- 有离散档位的 tags（如部分量级、figure）须跨档；无档位区分的 tags（如疤痕、松弛度分档）须进入明确可区分的 tags 状态',
      '',
      '## 一律不更新 bodyProfile',
      '- 无事实依据；仅感受/断言/playersay',
      '- 实质未变或档内微调',
      '- 临时生理反应、可洗净污渍、妆造塑形',
    ].join('\n');
  },

  partTagGuide(kind = 'natural') {
    const dims = kind === 'dressed' ? this.dressedPartDimensions : this.naturalPartDimensions;
    return Object.entries(dims)
      .map(([part, fields]) => `${part}：${fields.join('、')}（2-4个标签）`)
      .join('\n');
  },
};
