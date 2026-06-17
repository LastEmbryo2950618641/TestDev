/**
 * 固定情绪与对玩家感觉维度。
 */
window.GameModules = window.GameModules || {};

window.GameModules.metrics = {
  emotionKeys: ['冷静', '恐惧', '担忧', '高兴', '紧张', '愤怒', '羞耻', '悲伤', '好奇', '麻木', '嫉妒', '绝望'],
  playerKeys: ['了解', '信任', '反抗', '好感', '友情', '亲情', '爱情', '肉欲', '畏惧', '尊敬', '崇拜', '讨厌', '依赖', '警惕', '支配欲', '占有欲', '服从'],
  defaults: {
    emotions: { 冷静: 45, 恐惧: 10, 担忧: 12, 高兴: 5, 紧张: 20, 愤怒: 0, 羞耻: 0, 悲伤: 0, 好奇: 20, 麻木: 0, 嫉妒: 0, 绝望: 0 },
    playerFeelings: { 了解: 1, 信任: 45, 反抗: 20, 好感: 30, 友情: 10, 亲情: 0, 爱情: 0, 肉欲: 0, 畏惧: 10, 尊敬: 10, 崇拜: 0, 讨厌: 0, 依赖: 0, 警惕: 30, 支配欲: 0, 占有欲: 0, 服从: 5 },
  },
  descriptions: {
    冷静: '理性稳定、能控制反应的程度。', 恐惧: '面对危险、未知或失控时的害怕程度。', 担忧: '对后果、他人或自身处境的不安程度。', 高兴: '愉悦、安心或满足的程度。', 紧张: '身体与精神绷紧、难以放松的程度。', 愤怒: '被冒犯、伤害或压迫后的攻击性情绪。', 羞耻: '因暴露、被迫或违背自我意愿产生的羞愧。', 悲伤: '失落、痛苦、哀悼或无助感。', 好奇: '想理解异常、人物或真相的主动兴趣。', 麻木: '情绪迟钝、逃避感受或自我封闭。', 嫉妒: '因重视对象被夺走或比较产生的刺痛。', 绝望: '认为无法逃离、无法改变的黑暗感。',
    了解: '角色对你的身份、经历、性格、意图与秘密的理解程度。', 信任: '相信玩家不会伤害自己或会兑现承诺。', 反抗: '想抵抗、拒绝或夺回主导权的强度。', 好感: '人与人相处中产生的正向、愉悦、接纳性情绪，可包含友情、亲情与爱情。', 友情: '把玩家视为朋友、同伴或可并肩者的程度。', 亲情: '把玩家感受为家人、庇护者或亲近依附对象。', 爱情: '对玩家产生恋爱意义上的心动、眷恋、深爱或相守愿望。', 肉欲: '身体层面的吸引、冲动、占有或亲密欲望。', 畏惧: '因力量差距、失控或惩罚预期而害怕玩家。', 尊敬: '认可玩家能力、判断、品格或地位。', 崇拜: '将玩家理想化、神化或过度仰望。', 讨厌: '排斥、厌恶、不愿接近玩家的程度。', 依赖: '心理或现实上需要玩家帮助、保护或决定。', 警惕: '对玩家意图保持戒备、观察与防御。', 支配欲: '想反过来掌控玩家或操控局势的欲望。', 占有欲: '想独占玩家注意、关系或身体行动权的欲望。', 服从: '愿意听从玩家命令或默认其主导权。',
  },
  loveStages: ['心动', '爱恋', '倾心', '眷恋', '深爱', '执念', '依存', '相守'],
  knowStages: ['神秘', '陌生', '面善/眼熟', '认识', '知晓', '熟悉', '熟识', '深知', '洞悉'],
  knowStageNotes: ['不仅不知，且感觉对方深不可测、有意隐藏。', '完全不知道对方是谁，没有任何信息。', '有模糊印象，但想不起具体细节。', '知道身份、名字，有基本确认的接触。', '知道一些公开经历、背景，但不深入。', '了解性格、习惯、常见反应，能预判行为。', '有长期交往，知道很多具体生活细节。', '理解内心想法、价值观、过往创伤或秘密。', '能看穿未说出口的意图，几乎无所不知。'],
  intensityStages: ['无感', '轻微萌芽', '明显存在', '强烈影响', '主导反应', '压倒支配'],

  fresh() { return JSON.parse(JSON.stringify(this.defaults)); },
  clamp(v) { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0; },
  clampDelta(v) { const n = Number(v); return Number.isFinite(n) ? Math.max(-30, Math.min(30, Math.round(n))) : 0; },
  stage(value) { return this.loveStages[Math.min(7, Math.floor(this.clamp(value) / 12.5))]; },
  knowStage(value) { return this.knowStages[Math.max(0, Math.min(8, Math.round((this.clamp(value) / 100) * 8)))]; },
  stageOptionsFor(key) { return key === '爱情' ? this.loveStages : (key === '了解' ? this.knowStages : this.intensityStages); },
  normalizeStage(key, stage, value) {
    const options = this.stageOptionsFor(key);
    return options.includes(stage) ? stage : this.stageFor(key, value);
  },
  stageFor(key, value) {
    if (key === '爱情') return this.stage(value);
    if (key === '了解') return this.knowStage(value);
    const n = this.clamp(value);
    return this.intensityStages[n === 0 ? 0 : Math.min(5, Math.floor((n - 1) / 20) + 1)];
  },
  stageGuide() {
    return [...this.emotionKeys, ...this.playerKeys].map((key) => `${key}=${this.stageOptionsFor(key).join('/')}`).join('；');
  },
  stageStatus(key, stage) {
    const love = { 心动: '不知为什么，想到对方会心跳加快，产生初见好感。', 爱恋: '喜欢开始成形，会主动期待靠近与回应。', 倾心: '感情明显偏向对方，判断会被爱意牵引。', 眷恋: '不舍分离，会反复牵挂对方的存在。', 深爱: '愿意交付真心，把对方放进重要位置。', 执念: '深陷其中，感情变得难以割舍。', 依存: '心理与现实上都倾向彼此依靠。', 相守: '形成长久相伴、难以割舍的恋爱愿望。' };
    const intensity = { 无感: '当前几乎没有这种感受。', 轻微萌芽: '这种感受刚出现，只在心底轻微波动。', 明显存在: '这种感受已经清楚存在，会影响当下反应。', 强烈影响: '这种感受持续压过其他念头，明显影响判断。', 主导反应: '这种感受成为当前主要心理驱动力。', 压倒支配: '这种感受几乎压倒性支配心理与反应。' };
    const know = Object.fromEntries(this.knowStages.map((name, i) => [name, this.knowStageNotes[i]]));
    const text = key === '爱情' ? love[stage] : (key === '了解' ? know[stage] : intensity[stage]);
    return text || `${key}处于${stage}阶段。`;
  },
  valueExplanation(key, value, custom = '') {
    const text = String(custom || '').trim();
    if (this.isSpecificMetricText(text, key)) return text;
    return `缺少AI生成的${key}${this.clamp(value)}数值解释。`;
  },
  isSpecificMetricText(text, key = '') {
    const value = String(text || '').trim();
    if (!value || value === this.stageStatus(key, this.stageFor(key, 0))) return false;
    if (/这项|当前处境|如何看待|数值\d+\/100|处于“/.test(value)) return false;
    return /因为|由于|源于|来自|经历|过去|害怕|依赖|相依|相濡|哥哥|姐姐|妹妹|父亲|母亲|玩家|刘悠|鬼怪|创伤|动机|处境|关系/.test(value) || value.length >= 18;
  },
  metricReasonLooksGeneric(text) {
    return !this.isSpecificMetricText(text) || /背景信息|当前人物资料|初始接触|本回合没有直接触发|保持原值|保持原址|足以明显改变|处境和关系证据|关系证据来自|根据角色性格|你刚介入|当前场景、你的行动|个人动机与过去经历/.test(String(text || ''));
  },
  ensure(store) {
    store.emotions = this.fill(store.emotions, this.emotionKeys, this.defaults.emotions);
    store.playerFeelings = this.fill(store.playerFeelings, this.playerKeys, this.defaults.playerFeelings);
    store.metricNotes = store.metricNotes || {};
  },
  fill(current, keys, defaults) {
    const out = {};
    keys.forEach((key) => { out[key] = this.clamp(current?.[key] ?? defaults[key] ?? 0); });
    return out;
  },
  apply(store, updates) {
    this.ensure(store);
    this.applyGroup(store.emotions, updates?.emotions, store.metricNotes, 'emotion');
    this.applyGroup(store.playerFeelings, updates?.playerFeelings, store.metricNotes, 'player');
  },
  applyInitial(store, updates) {
    this.ensure(store);
    this.setGroup(store.emotions, updates?.emotions, store.metricNotes, 'emotion');
    this.setGroup(store.playerFeelings, updates?.playerFeelings, store.metricNotes, 'player');
  },
  applyGroup(target, items, notes, group) {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      if (!Object.prototype.hasOwnProperty.call(target, item?.key)) return;
      const value = this.clamp(target[item.key] + this.clampDelta(item.delta));
      this.writeMetric(target, notes, group, item, value, '本回合没有直接触发变化，保持原值。');
    });
  },
  setGroup(target, items, notes, group) {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      if (!Object.prototype.hasOwnProperty.call(target, item?.key)) return;
      this.writeMetric(target, notes, group, item, this.clamp(item.value), '你刚介入她/他的处境，因此这项感受还在形成。');
    });
  },
  writeMetric(target, notes, group, item, value, fallbackReason) {
    const stage = this.stageFor(item.key, value);
    target[item.key] = value;
    const fallbackUsed = this.metricReasonLooksGeneric(item.reason);
    const metricSources = item.metricSources || { 数值: 'system', 解释: item.status ? 'ai' : 'system', 原因: fallbackUsed ? 'system' : 'ai' };
    notes[`${group}:${item.key}`] = {
      stage,
      status: String(this.valueExplanation(item.key, value, item.status)).slice(0, 180),
      reason: String(fallbackUsed ? `缺少AI生成的${item.key}变化原因。` : item.reason).slice(0, 180),
      description: String(this.descriptions[item.key] || item.key).slice(0, 120),
      metricSources,
    };
  },
};
