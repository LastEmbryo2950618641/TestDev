/**
 * 固定情绪与对玩家感觉维度。
 */
window.GameModules = window.GameModules || {};

window.GameModules.metrics = {
  emotionKeys: ['高兴', '兴奋', '悲伤', '绝望', '失落', '委屈', '恐惧', '担忧', '紧张', '愤怒', '烦躁', '羞耻', '愧疚', '嫉妒', '厌恶', '惊讶', '好奇', '困惑', '冷静', '麻木', '孤独', '感动'],
  playerKeys: ['了解', '信任', '警惕', '好感', '友情', '亲情', '爱情', '想念', '感恩', '愧疚', '同情', '怜惜', '讨厌', '怨怼', '敌意', '反抗', '服从', '支配', '占有', '畏惧', '尊敬', '崇拜', '依赖', '期待', '肉欲'],
  emotionEnglishKeys: {
    joy: '高兴', excitement: '兴奋', sadness: '悲伤', despair: '绝望', disappointment: '失落', wronged: '委屈',
    fear: '恐惧', worry: '担忧', tension: '紧张', anger: '愤怒', irritability: '烦躁',
    shame: '羞耻', guilt: '愧疚', jealousy: '嫉妒', disgust: '厌恶',
    surprise: '惊讶', curiosity: '好奇', confusion: '困惑',
    calm: '冷静', numbness: '麻木', loneliness: '孤独', moved: '感动',
  },
  playerEnglishKeys: {
    understanding: '了解', trust: '信任', vigilance: '警惕',
    affection: '好感', friendship: '友情', familyLove: '亲情', romanticLove: '爱情', longing: '想念',
    gratitude: '感恩', guiltToward: '愧疚', sympathy: '同情', cherishing: '怜惜',
    dislike: '讨厌', grudge: '怨怼', hostility: '敌意',
    resistance: '反抗', submission: '服从', dominance: '支配', possessiveness: '占有',
    awe: '畏惧', respect: '尊敬', admiration: '崇拜',
    dependence: '依赖', expectation: '期待', lust: '肉欲',
  },
  keyAliases: {
    支配欲: '支配', 占有欲: '占有', 支配欲望: '支配', 占有欲望: '占有',
  },
  emotionInputAliases: {
    平静: '冷静', 镇定: '冷静', 理智: '冷静', 安定: '冷静', 淡定: '冷静',
    害怕: '恐惧', 惊恐: '恐惧', 惊惧: '恐惧', 惧怕: '恐惧', 惊慌: '恐惧', 惶恐: '恐惧', 胆怯: '恐惧', 畏缩: '恐惧',
    忧虑: '担忧', 忧心: '担忧', 不安: '担忧', 顾虑: '担忧', 焦虑: '担忧', 挂念: '担忧', 牵挂: '担忧',
    开心: '高兴', 愉悦: '高兴', 快乐: '高兴', 欣喜: '高兴', 喜悦: '高兴', 满足: '高兴', 轻松: '高兴',
    激动: '兴奋', 亢奋: '兴奋', 振奋: '兴奋',
    紧绷: '紧张', 慌张: '紧张', 局促: '紧张', 压迫感: '紧张', 忐忑: '紧张',
    生气: '愤怒', 恼怒: '愤怒', 怒意: '愤怒', 怨怒: '愤怒', 气愤: '愤怒', 暴躁: '愤怒',
    急躁: '烦躁', 烦闷: '烦躁', 心烦: '烦躁',
    羞愧: '羞耻', 害羞: '羞耻', 难堪: '羞耻', 尴尬: '羞耻', 屈辱: '羞耻', 羞辱: '羞耻',
    内疚: '愧疚', 惭愧: '愧疚', 愧对: '愧疚',
    难过: '悲伤', 哀伤: '悲伤', 伤心: '悲伤', 痛苦: '悲伤', 悲痛: '悲伤',
    颓丧: '失落', 失意: '失落', 空虚: '失落',
    冤枉: '委屈', 受屈: '委屈',
    无望: '绝望', 崩溃: '绝望', 灰心: '绝望', 走投无路: '绝望',
    吃醋: '嫉妒', 妒忌: '嫉妒', 醋意: '嫉妒', 酸涩: '嫉妒',
    恶心: '厌恶', 嫌弃: '厌恶', 反感: '厌恶',
    意外: '惊讶', 惊诧: '惊讶', 错愕: '惊讶', 震惊: '惊讶',
    兴趣: '好奇', 探究: '好奇', 在意: '好奇',
    疑惑: '困惑', 迷惑: '困惑', 茫然: '困惑',
    空洞: '麻木', 呆滞: '麻木', 迟钝: '麻木', 冷漠: '麻木', 恍惚: '麻木',
    孤寂: '孤独', 寂寞: '孤独',
    动容: '感动', 感慨: '感动', 触动: '感动',
    羞涩: '羞耻', 羞怯: '羞耻',
  },
  playerInputAliases: {
    知晓: '了解', 理解: '了解', 熟悉: '了解', 认识: '了解', 洞悉: '了解', 知情: '了解',
    信赖: '信任', 相信: '信任', 放心: '信任', 可靠感: '信任',
    戒备: '警惕', 防备: '警惕', 怀疑: '警惕', 提防: '警惕', 疑心: '警惕',
    亲近: '好感', 喜欢: '好感', 接纳: '好感', 善意: '好感', 顺眼: '好感',
    友好: '友情', 友谊: '友情', 伙伴感: '友情', 同伴感: '友情',
    家人感: '亲情', 亲近依附: '亲情', 亲缘: '亲情', 庇护感: '亲情',
    恋慕: '爱情', 爱慕: '爱情', 心动: '爱情', 倾心: '爱情', 眷恋: '爱情', 深爱: '爱情',
    思念: '想念', 牵挂: '想念', 惦记: '想念', 想念: '想念',
    感激: '感恩', 感谢: '感恩',
    亏欠: '愧疚', 对不起: '愧疚',
    怜悯: '同情', 心疼: '同情',
    怜爱: '怜惜', 疼爱: '怜惜',
    厌恶: '讨厌', 排斥: '讨厌', 嫌恶: '讨厌', 憎恶: '讨厌',
    积怨: '怨怼', 衔恨: '怨怼',
    仇恨: '敌意', 敌视: '敌意',
    抵抗: '反抗', 抗拒: '反抗', 逆反: '反抗', 拒绝: '反抗', 不服: '反抗',
    控制欲: '支配', 掌控欲: '支配', 主导欲: '支配', 控制: '支配',
    独占欲: '占有', 独占: '占有', 垄断欲: '占有',
    顺从: '服从', 听话: '服从', 臣服: '服从', 屈从: '服从', 驯服: '服从',
    欲望: '肉欲', 情欲: '肉欲', 渴望: '肉欲', 冲动: '肉欲', 身体吸引: '肉欲',
    害怕: '畏惧', 惧怕: '畏惧', 惧意: '畏惧', 怕: '畏惧',
    敬重: '尊敬', 敬意: '尊敬', 认可: '尊敬', 钦佩: '尊敬', 佩服: '尊敬',
    仰慕: '崇拜', 崇敬: '崇拜', 神化: '崇拜', 狂热: '崇拜',
    依恋: '依赖', 依附: '依赖', 需要: '依赖', 离不开: '依赖',
    盼望: '期待', 期望: '期待', 等待: '期待',
  },
  defaults: {
    emotions: {
      高兴: 5, 兴奋: 0, 悲伤: 0, 绝望: 0, 失落: 0, 委屈: 0,
      恐惧: 10, 担忧: 12, 紧张: 20, 愤怒: 0, 烦躁: 0,
      羞耻: 0, 愧疚: 0, 嫉妒: 0, 厌恶: 0,
      惊讶: 0, 好奇: 20, 困惑: 0,
      冷静: 45, 麻木: 0, 孤独: 0, 感动: 0,
    },
    playerFeelings: {
      了解: 1, 信任: 45, 警惕: 30,
      好感: 30, 友情: 10, 亲情: 0, 爱情: 0, 想念: 0,
      感恩: 0, 愧疚: 0, 同情: 0, 怜惜: 0,
      讨厌: 0, 怨怼: 0, 敌意: 0,
      反抗: 20, 服从: 5, 支配: 0, 占有: 0,
      畏惧: 10, 尊敬: 10, 崇拜: 0,
      依赖: 0, 期待: 0, 肉欲: 0,
    },
  },
  descriptions: {
    高兴: '对当下处境的愉悦、满足、放松程度。',
    兴奋: '因刺激、期待或高唤起而产生的激动、振奋程度。',
    悲伤: '对失去、分离、打击的难过、哀痛程度。',
    绝望: '认定处境无法改善、看不到出路的无望程度。',
    失落: '期望落空、失意、心里发空的程度。',
    委屈: '觉得不公、被冤枉、有苦说不出的程度。',
    恐惧: '对当下危险、未知或失控的害怕程度。',
    担忧: '对将来后果、他人或处境的不安预想程度。',
    紧张: '身心绷紧、难以放松的应激程度。',
    愤怒: '被冒犯、伤害或压迫后的怒意与攻击冲动程度。',
    烦躁: '心里发烦、易怒、坐不住的程度。',
    羞耻: '因暴露、失态或违背自我意愿产生的羞惭程度。',
    愧疚: '因做错事、对不起人或未尽责而产生的内疚程度。',
    嫉妒: '因重视对象被他人分走或比较失利产生的刺痛程度。',
    厌恶: '对处境、对象或状态的嫌恶、排斥、生理反感程度。',
    惊讶: '因突发、意外而被打断、错愕的程度。',
    好奇: '想弄清异常、人物或真相的主动兴趣程度。',
    困惑: '搞不懂、理不清、不知如何应对的迷惑程度。',
    冷静: '仍能感受但理性压住、反应可控的程度。',
    麻木: '情绪迟钝、抽离、感受通道关闭的程度。',
    孤独: '觉得无人理解、独自承受、与世界隔开的程度。',
    感动: '被触动、感慨、心口发热的程度。',
    了解: '掌握玩家身份、经历、性格、意图与秘密的程度。',
    信任: '相信玩家不会伤害自己或会兑现承诺的程度。',
    警惕: '对玩家意图保持观察、防备的程度。',
    好感: '相处时总体顺眼、接纳、愿意靠近玩家的程度；不替代友情、亲情或爱情。',
    友情: '把玩家视为朋友、同伴、可并肩者的程度。',
    亲情: '把玩家视为家人、亲属或亲近依附对象的程度。',
    爱情: '对玩家产生恋爱心动、眷恋、想在一起的程度。',
    想念: '分离或不见面时牵挂、惦记、想再见玩家的程度。',
    感恩: '因玩家恩惠、帮助而想回报的程度。',
    愧疚: '因对不起玩家、亏欠玩家而心里过不去的程度。',
    同情: '怜恤、心疼玩家处境的程度。',
    怜惜: '温柔疼惜、想护着玩家的程度。',
    讨厌: '排斥、厌恶、不想靠近玩家的程度。',
    怨怼: '对玩家积怨、心结、旧账未了的程度。',
    敌意: '把玩家当对手、带攻击或对抗意图的程度。',
    反抗: '想抵抗、拒绝或夺回主导权的程度。',
    服从: '愿意听玩家的话、默认其主导权的程度。',
    支配: '想反过来掌控玩家或操控局势的程度。',
    占有: '想独占玩家注意、关系或身体行动权的程度。',
    畏惧: '因力量差距、失控或惩罚预期而害怕玩家的程度。',
    尊敬: '认可玩家能力、判断、品格或地位的程度。',
    崇拜: '将玩家理想化、神化或过度仰望的程度。',
    依赖: '心理或现实上需要玩家帮助、保护或决定的程度。',
    期待: '对玩家后续行为、承诺或关系走向的盼望程度。',
    肉欲: '对玩家的身体吸引、性冲动或亲密占有欲望程度。',
  },
  lockedPlayerFloorKeys: ['亲情', '爱情', '肉欲', '依赖', '占有', '服从', '崇拜', '好感', '信任', '想念'],
  loveStages: ['心动', '爱恋', '倾心', '眷恋', '深爱', '执念', '依存', '相守'],
  knowStages: ['神秘', '陌生', '面善/眼熟', '认识', '知晓', '熟悉', '熟识', '深知', '洞悉'],
  knowStageNotes: ['不仅不知，且感觉对方深不可测、有意隐藏。', '完全不知道对方是谁，没有任何信息。', '有模糊印象，但想不起具体细节。', '知道身份、名字，有基本确认的接触。', '知道一些公开经历、背景，但不深入。', '了解性格、习惯、常见反应，能预判行为。', '有长期交往，知道很多具体生活细节。', '理解内心想法、价值观、过往创伤或秘密。', '能看穿未说出口的意图，几乎无所不知。'],
  intensityStages: ['无感', '轻微萌芽', '明显存在', '强烈影响', '主导反应', '压倒支配'],

  chineseKeyMap(group = 'emotion') {
    const src = group === 'emotion' ? this.emotionEnglishKeys : this.playerEnglishKeys;
    return Object.fromEntries(Object.entries(src).map(([en, zh]) => [zh, en]));
  },

  normalizeKey(rawKey = '', keys = []) {
    const key = String(rawKey || '').trim();
    if (keys.includes(key)) return key;
    const alias = this.keyAliases[key] || key;
    if (keys.includes(alias)) return alias;
    const inputAliases = keys === this.emotionKeys ? this.emotionInputAliases : (keys === this.playerKeys ? this.playerInputAliases : { ...this.emotionInputAliases, ...this.playerInputAliases, ...this.keyAliases });
    const mapped = inputAliases[key] || alias;
    return keys.includes(mapped) ? mapped : key;
  },

  settlementAlias(type = '', key = '') {
    const clean = String(key || '').trim();
    const map = type === '感觉' ? this.playerInputAliases : this.emotionInputAliases;
    const mapped = map[clean] || this.keyAliases[clean] || clean;
    const keys = type === '感觉' ? this.playerKeys : this.emotionKeys;
    return keys.includes(mapped) ? mapped : mapped;
  },

  migrateValues(current = {}, keys = [], defaults = {}) {
    const out = {};
    Object.entries(current || {}).forEach(([rawKey, rawValue]) => {
      const key = this.normalizeKey(rawKey, keys);
      if (!keys.includes(key)) return;
      out[key] = this.clamp(rawValue);
    });
    return this.fill(out, keys, defaults);
  },

  migrateNotes(notes = {}) {
    if (!notes || typeof notes !== 'object') return {};
    const out = { ...notes };
    Object.entries({ 支配欲: '支配', 占有欲: '占有' }).forEach(([from, to]) => {
      ['emotion', 'player', 'emotion:temporary', 'player:temporary'].forEach((prefix) => {
        const fromKey = `${prefix}:${from}`;
        const toKey = `${prefix}:${to}`;
        if (out[fromKey] && !out[toKey]) out[toKey] = out[fromKey];
        delete out[fromKey];
      });
    });
    return out;
  },

  fresh() { return JSON.parse(JSON.stringify(this.defaults)); },
  clamp(v) { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0; },
  clampDelta(v) { const n = Number(v); return Number.isFinite(n) ? Math.max(-30, Math.min(30, Math.round(n))) : 0; },
  metricDeltaValue(item = {}) {
    const raw = item.delta ?? item.change?.delta ?? item.change?.value ?? item.value ?? 0;
    return Number(raw) || 0;
  },
  lockedPlayerDelta(key, delta, current) {
    return this.lockedPlayerFloorKeys.includes(key) && this.clamp(current) >= 90 && delta < 0 ? 0 : delta;
  },
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
  descriptionsGuide() {
    return [...this.emotionKeys, ...this.playerKeys].map((key) => `${key}：${this.descriptions[key] || key}`).join('\n');
  },
  stageStatus(key, stage) {
    const love = { 心动: '不知为什么，想到对方会心跳加快，产生初见好感。', 爱恋: '喜欢开始成形，会主动期待靠近与回应。', 倾心: '感情明显偏向对方，判断会被爱意牵引。', 眷恋: '不舍分离，会反复牵挂对方的存在。', 深爱: '愿意交付真心，把对方放进重要位置。', 执念: '深陷其中，感情变得难以割舍。', 依存: '心理与现实上都倾向彼此依靠。', 相守: '形成长久相伴、难以割舍的恋爱愿望。' };
    const intensity = { 无感: '当前几乎没有这种感受。', 轻微萌芽: '这种感受刚出现，只在心底轻微波动。', 明显存在: '这种感受已经清楚存在，会影响当下反应。', 强烈影响: '这种感受持续压过其他念头，明显影响判断。', 主导反应: '这种感受成为当前主要心理驱动力。', 压倒支配: '这种感受几乎压倒性支配心理与反应。' };
    const know = Object.fromEntries(this.knowStages.map((name, i) => [name, this.knowStageNotes[i]]));
    const text = key === '爱情' ? love[stage] : (key === '了解' ? know[stage] : intensity[stage]);
    return text || `${key}处于${stage}阶段。`;
  },
  cleanMetricReason(reason = '', key = '') {
    let text = String(reason || '').replace(/[。.!！]+$/g, '').trim();
    text = text.replace(/^(?:情绪|感觉)[，,：:\s]+/u, '');
    if (key) text = text.replace(new RegExp(`^${key}[，,：:\\s]+`, 'u'), '');
    return text.trim();
  },

  cleanMetricStatus(status = '') {
    let out = String(status || '').trim();
    if (/因为/u.test(out)) out = out.split(/[，,、]?因为/u)[0].trim();
    return out
      .replace(/[。.!！?？]+[，,、]+/g, '。')
      .replace(/。[；;][^。]+$/u, '。')
      .replace(/。[；;]+/g, '。')
      .replace(/。{2,}/g, '。')
      .replace(/[，,]+。/g, '。')
      .trim();
  },

  stripMetricStatusPrefix(key, status = '') {
    let out = String(status || '').trim();
    if (key) {
      out = out.replace(new RegExp(`^${key}\\d*[：:]\\s*`, 'u'), '');
      out = out.replace(new RegExp(`^${key}[，,：:\\s]+`, 'u'), '');
    }
    out = out.replace(/^[^：:]{1,8}\d+[：:]\s*/u, '');
    return out.trim();
  },

  isGenericMetricStatus(text = '', key = '') {
    const value = this.stripMetricStatusPrefix(key, this.cleanMetricStatus(text));
    if (!value) return true;
    const patterns = [
      /这种感受几乎压倒性/u,
      /几乎压倒性支配心理与反应/u,
      /这项感觉正在影响/u,
      /当前几乎没有这种感受/u,
      /刚出现，只在心底轻微波动/u,
      /已经清楚存在，会影响当下反应/u,
      /持续压过其他念头/u,
      /成为当前主要心理驱动力/u,
      /处于[^。]{0,24}阶段/u,
      /因为人物(?:当前处境|与玩家)/u,
      /因为人物.*形成当前数值/u,
      /源于人物过去经历/u,
    ];
    if (patterns.some((pattern) => pattern.test(value))) return true;
    if (key && new RegExp(`^${key}\\d+[：:]`, 'u').test(String(text || '').trim()) && /阶段|无感|萌芽|影响|支配|压倒/u.test(value)) return true;
    return /^[^：]{1,8}\d+[：:]/.test(String(text || '').trim()) && /这种感受|阶段|无感|萌芽|支配/u.test(value);
  },

  resolveMetricStatus(key, value, rawStatus = '', options = {}) {
    const { temporary = false, previousStatus = '' } = options;
    const cleaned = this.cleanMetricStatus(this.stripMetricStatusPrefix(key, rawStatus));
    const usable = (text) => {
      const next = this.cleanMetricStatus(this.stripMetricStatusPrefix(key, text));
      return next.length >= 12 && !this.isGenericMetricStatus(next, key);
    };
    if (usable(cleaned)) return cleaned.slice(0, 180);
    const previous = this.cleanMetricStatus(this.stripMetricStatusPrefix(key, previousStatus));
    if (!temporary && usable(previous)) return previous.slice(0, 180);
    if (temporary) return cleaned.slice(0, 180) || `${key}：短期状态。`;
    const stage = this.stageStatus(key, this.stageFor(key, value)).replace(/[。.!！?？]+$/g, '');
    return stage.endsWith('。') ? stage : `${stage}。`;
  },

  valueExplanation(key, value, rawStatus = '', rawReason = '') {
    void rawReason;
    return this.resolveMetricStatus(key, value, rawStatus);
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
    store.emotions = this.migrateValues(store.emotions, this.emotionKeys, this.defaults.emotions);
    store.playerFeelings = this.migrateValues(store.playerFeelings, this.playerKeys, this.defaults.playerFeelings);
    store.temporaryEmotions = store.temporaryEmotions && typeof store.temporaryEmotions === 'object' ? store.temporaryEmotions : {};
    store.temporaryPlayerFeelings = store.temporaryPlayerFeelings && typeof store.temporaryPlayerFeelings === 'object' ? store.temporaryPlayerFeelings : {};
    store.metricNotes = this.migrateNotes(store.metricNotes || {});
  },
  fill(current, keys, defaults) {
    const out = {};
    keys.forEach((key) => { out[key] = this.clamp(current?.[key] ?? defaults[key] ?? 0); });
    return out;
  },
  apply(store, updates) {
    this.ensure(store);
    Object.keys(store.temporaryEmotions).forEach((key) => { store.temporaryEmotions[key] = Math.max(0, this.clamp(store.temporaryEmotions[key]) - 1); });
    Object.keys(store.temporaryPlayerFeelings).forEach((key) => { store.temporaryPlayerFeelings[key] = Math.max(0, this.clamp(store.temporaryPlayerFeelings[key]) - 1); });
    this.applyGroup(store.emotions, updates?.emotions, store.metricNotes, 'emotion', store.temporaryEmotions);
    this.applyGroup(store.playerFeelings, updates?.playerFeelings, store.metricNotes, 'player', store.temporaryPlayerFeelings);
  },
  applyInitial(store, updates) {
    this.ensure(store);
    this.setGroup(store.emotions, updates?.emotions, store.metricNotes, 'emotion');
    this.setGroup(store.playerFeelings, updates?.playerFeelings, store.metricNotes, 'player');
  },
  applyGroup(target, items, notes, group, temporaryTarget = null) {
    if (!Array.isArray(items)) return;
    const keys = group === 'player' ? this.playerKeys : this.emotionKeys;
    items.forEach((item) => {
      const key = this.normalizeKey(item?.key, keys);
      if (!keys.includes(key)) return;
      const isFixed = Object.prototype.hasOwnProperty.call(target, key);
      const targetGroup = isFixed ? target : temporaryTarget;
      if (!targetGroup) return;
      const before = this.clamp(targetGroup[key] || 0);
      const rawDelta = this.clampDelta(this.metricDeltaValue(item));
      const delta = group === 'player' && isFixed ? this.lockedPlayerDelta(key, rawDelta, before) : rawDelta;
      const value = this.clamp(before + delta);
      this.writeMetric(targetGroup, notes, group, { ...item, key, delta, temporary: !isFixed }, value, '本回合没有直接触发变化，保持原值。');
    });
  },
  setGroup(target, items, notes, group) {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      const key = this.normalizeKey(item?.key, Object.keys(target || {}));
      if (!Object.prototype.hasOwnProperty.call(target, key)) return;
      this.writeMetric(target, notes, group, { ...item, key }, this.clamp(item.value), '你刚介入她/他的处境，因此这项感受还在形成。');
    });
  },
  writeMetric(target, notes, group, item, value, fallbackReason) {
    const noteGroup = item.temporary ? `${group}:temporary` : group;
    const noteKey = `${noteGroup}:${item.key}`;
    target[item.key] = value;
    const rawStatus = String(item.status || '').trim();
    const rawReason = String(item.reason || '').trim();
    const reason = this.cleanMetricReason(String(rawReason || fallbackReason).slice(0, 180), item.key);
    const previousStatus = notes[noteKey]?.status || '';
    const status = this.resolveMetricStatus(item.key, value, rawStatus, { temporary: item.temporary, previousStatus }).slice(0, 180);
    const statusFromAi = Boolean(rawStatus) && status === this.cleanMetricStatus(this.stripMetricStatusPrefix(item.key, rawStatus)) && !this.isGenericMetricStatus(rawStatus, item.key);
    const explicitSources = item.metricSources || null;
    const isAi = (source) => String(source || '').toLowerCase() === 'ai';
    const metricSources = explicitSources ? {
      数值: isAi(explicitSources.数值) ? 'AI' : '系统',
      解释: statusFromAi || isAi(explicitSources.解释) ? 'AI' : '系统',
      原因: isAi(explicitSources.原因) && rawReason ? 'AI' : '系统',
    } : {
      数值: 'AI',
      解释: statusFromAi ? 'AI' : '系统',
      原因: rawReason ? 'AI' : '系统',
    };
    notes[noteKey] = { status, reason, metricSources };
    if (item.temporary) delete notes[`${group}:${item.key}`];
  },
};
