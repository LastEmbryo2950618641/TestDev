/**
 * 固定情绪与对玩家感觉维度。
 */
window.GameModules = window.GameModules || {};

window.GameModules.metrics = {
  emotionKeys: ['冷静', '恐惧', '担忧', '高兴', '紧张', '愤怒', '羞耻', '悲伤', '好奇', '麻木', '嫉妒', '绝望'],
  playerKeys: ['信任', '反抗', '好感', '友情', '亲情', '爱情', '肉欲', '畏惧', '尊敬', '崇拜', '讨厌', '依赖', '警惕', '支配欲', '占有欲', '服从'],
  defaults: {
    emotions: { 冷静: 45, 恐惧: 10, 担忧: 12, 高兴: 5, 紧张: 20, 愤怒: 0, 羞耻: 0, 悲伤: 0, 好奇: 20, 麻木: 0, 嫉妒: 0, 绝望: 0 },
    playerFeelings: { 信任: 45, 反抗: 20, 好感: 30, 友情: 10, 亲情: 0, 爱情: 0, 肉欲: 0, 畏惧: 10, 尊敬: 10, 崇拜: 0, 讨厌: 0, 依赖: 0, 警惕: 30, 支配欲: 0, 占有欲: 0, 服从: 5 },
  },
  descriptions: {
    冷静: '理性稳定、能控制反应的程度。', 恐惧: '面对危险、未知或失控时的害怕程度。', 担忧: '对后果、他人或自身处境的不安程度。', 高兴: '愉悦、安心或满足的程度。', 紧张: '身体与精神绷紧、难以放松的程度。', 愤怒: '被冒犯、伤害或压迫后的攻击性情绪。', 羞耻: '因暴露、被迫或违背自我意愿产生的羞愧。', 悲伤: '失落、痛苦、哀悼或无助感。', 好奇: '想理解异常、人物或真相的主动兴趣。', 麻木: '情绪迟钝、逃避感受或自我封闭。', 嫉妒: '因重视对象被夺走或比较产生的刺痛。', 绝望: '认为无法逃离、无法改变的黑暗感。',
    信任: '相信玩家不会伤害自己或会兑现承诺。', 反抗: '想抵抗、拒绝或夺回主导权的强度。', 好感: '人与人相处中产生的正向、愉悦、接纳性情绪，可包含友情、亲情与爱情。', 友情: '把玩家视为朋友、同伴或可并肩者的程度。', 亲情: '把玩家感受为家人、庇护者或亲近依附对象。', 爱情: '对玩家产生恋爱意义上的心动、眷恋、深爱或相守愿望。', 肉欲: '身体层面的吸引、冲动、占有或亲密欲望。', 畏惧: '因力量差距、失控或惩罚预期而害怕玩家。', 尊敬: '认可玩家能力、判断、品格或地位。', 崇拜: '将玩家理想化、神化或过度仰望。', 讨厌: '排斥、厌恶、不愿接近玩家的程度。', 依赖: '心理或现实上需要玩家帮助、保护或决定。', 警惕: '对玩家意图保持戒备、观察与防御。', 支配欲: '想反过来掌控玩家或操控局势的欲望。', 占有欲: '想独占玩家注意、关系或身体行动权的欲望。', 服从: '愿意听从玩家命令或默认其主导权。',
  },
  loveStages: ['心动', '爱恋', '倾心', '眷恋', '深爱', '执念', '依存', '相守'],
  intensityStages: ['无感', '轻微萌芽', '明显存在', '强烈影响', '主导反应', '压倒支配'],

  fresh() { return JSON.parse(JSON.stringify(this.defaults)); },
  clamp(v) { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0; },
  stage(value) { return this.loveStages[Math.min(7, Math.floor(this.clamp(value) / 12.5))]; },
  stageFor(key, value) {
    if (key === '爱情') return this.stage(value);
    const n = this.clamp(value);
    return this.intensityStages[n === 0 ? 0 : Math.min(5, Math.floor((n - 1) / 20) + 1)];
  },
  stageDescription(key, stage) {
    if (key === '爱情') return `对玩家产生恋爱意义的${stage}。`;
    return `${this.descriptions[key] || key} 当前阶段为${stage}。`;
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
  applyGroup(target, items, notes, group) {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      if (!Object.prototype.hasOwnProperty.call(target, item?.key)) return;
      const value = this.clamp(item.value);
      const stage = String(item.stage || this.stageFor(item.key, value)).slice(0, 12);
      target[item.key] = value;
      notes[`${group}:${item.key}`] = {
        stage,
        description: String(item.description || this.stageDescription(item.key, stage)).slice(0, 80),
        reason: String(item.reason || this.descriptions[item.key] || '').slice(0, 80),
      };
    });
  },
};
