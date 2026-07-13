window.GameModules = window.GameModules || {};

window.GameModules.playerAspirationConfig = {
  alignmentColumns: [
    { key: 'lawful', label: '守序', labelEn: 'Lawful' },
    { key: 'neutral', label: '中立', labelEn: 'Neutral' },
    { key: 'chaotic', label: '混乱', labelEn: 'Chaotic' },
  ],
  alignmentRows: [
    { key: 'good', label: '善良', labelEn: 'Good' },
    { key: 'neutral', label: '中立', labelEn: 'Neutral' },
    { key: 'evil', label: '邪恶', labelEn: 'Evil' },
  ],
  alignments: [
    { id: 'lawful_good', row: 'good', col: 'lawful', label: '守序善良', labelEn: 'Lawful Good', hint: '有原则、守规则，并愿意帮助他人。' },
    { id: 'neutral_good', row: 'good', col: 'neutral', label: '中立善良', labelEn: 'Neutral Good', hint: '以善意为先，但不拘泥于形式。' },
    { id: 'chaotic_good', row: 'good', col: 'chaotic', label: '混乱善良', labelEn: 'Chaotic Good', hint: '凭良知行动，常打破常规。' },
    { id: 'lawful_neutral', row: 'neutral', col: 'lawful', label: '守序中立', labelEn: 'Lawful Neutral', hint: '重视秩序、职责与可预期规则。' },
    { id: 'true_neutral', row: 'neutral', col: 'neutral', label: '绝对中立', labelEn: 'True Neutral', hint: '倾向平衡，不主动站队。' },
    { id: 'chaotic_neutral', row: 'neutral', col: 'chaotic', label: '混乱中立', labelEn: 'Chaotic Neutral', hint: '重视自由，抗拒束缚。' },
    { id: 'lawful_evil', row: 'evil', col: 'lawful', label: '守序邪恶', labelEn: 'Lawful Evil', hint: '用规则与体系达成目的。' },
    { id: 'neutral_evil', row: 'evil', col: 'neutral', label: '中立邪恶', labelEn: 'Neutral Evil', hint: '以自身利益为先，手段灵活。' },
    { id: 'chaotic_evil', row: 'evil', col: 'chaotic', label: '混乱邪恶', labelEn: 'Chaotic Evil', hint: '追求破坏、支配或极端自我。' },
  ],
  axes: [
    {
      key: 'control_freedom',
      left: '掌控',
      right: '自由',
      leftTag: '权力',
      rightTag: '自由',
      title: '掌控 vs 自由',
      detail: '掌控追求对他人、环境或结果的支配力；自由追求自身不被支配。想掌权就要接受责任枷锁，要自由就要接受不干涉的代价。',
    },
    {
      key: 'detachment_engagement',
      left: '超然',
      right: '投入',
      leftTag: '智慧',
      rightTag: '欲望',
      title: '超然 vs 投入',
      detail: '超然是抽离旁观、克制欲望；投入是纵身体验、由感官与情感驱动。智慧要求看清欲望，投入要求屈从欲望。',
    },
    {
      key: 'depth_breadth',
      left: '深度',
      right: '广度',
      leftTag: '感情',
      rightTag: '名望',
      title: '深度 vs 广度',
      detail: '感情深度来自少数人上的长期投入；名望广度来自被更多人知晓。你要少数人的深刻，还是多数人的风光？',
    },
    {
      key: 'acquisition_giving',
      left: '获取',
      right: '付出',
      leftTag: '财富',
      rightTag: '救赎',
      title: '获取 vs 付出',
      detail: '获取向内聚集资源；付出向外释放价值。财富逻辑是积累，救赎逻辑常是分享与意义感。',
    },
    {
      key: 'tradition_innovation',
      left: '守旧',
      right: '创新',
      leftTag: '平凡',
      rightTag: '创造',
      title: '守旧 vs 创新',
      detail: '守旧拥抱熟悉路径与稳定；创新打破常规、承担风险。你要安全可期的稳定，还是充满可能的冒险？',
    },
    {
      key: 'solitude_companionship',
      left: '独处',
      right: '相伴',
      leftTag: '内省',
      rightTag: '归属',
      title: '独处 vs 相伴',
      detail: '独处把能量指向内部、获得自我认知；相伴把能量指向关系、获得归属感。你更需要自我对话，还是人际连接？',
    },
  ],
  defaultAxes() {
    return Object.fromEntries(this.axes.map((axis) => [axis.key, 50]));
  },
  alignmentById(id) {
    return this.alignments.find((item) => item.id === id) || null;
  },
  axisLeanText(value, axis) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '居中';
    if (num <= 35) return `偏${axis.left}`;
    if (num >= 65) return `偏${axis.right}`;
    return '居中';
  },
  guiltLines: [
    { id: 'ethics', category: '伦理', theme: '普世是非', guiltName: '悖德感', quote: '我越过了那条线，再也回不去了。', left: '无伦理', right: '强伦理', leftTag: '无所顾忌', rightTag: '铁律边界', title: '伦理 · 普世是非', detail: '无伦理一端：对逾矩亲近（如与妹妹发生关系）毫无罪恶感，伦理几乎不构成内心阻碍。强伦理一端：无法接受此类关系，连过于亲昵的举止都会触发强烈排斥与罪恶感。' },
    { id: 'profession', category: '职业', theme: '身份尊严', guiltName: '渎职感', quote: '我不配再有这个头衔。', left: '无感觉', right: '无法接受', leftTag: '渎职无感', rightTag: '渎职难容', title: '职业 · 身份尊严', detail: '无感觉一端：对失职、渎职、玷污头衔几乎无内心波动。无法接受一端：一旦违背职业操守，便难以原谅自己，甚至觉得不配再担此职。' },
    { id: 'homeland', category: '家国', theme: '血脉故土', guiltName: '背叛感', quote: '我亲手出卖了自己的根。', left: '无感觉', right: '无法接受', leftTag: '背叛无感', rightTag: '背叛难容', title: '家国 · 血脉故土', detail: '无感觉一端：对出卖故土、血脉、集体几乎无罪恶感。无法接受一端：任何背叛根脉的行为都会引发强烈自责与排斥。' },
    { id: 'faith', category: '信念', theme: '自我誓约', guiltName: '自弃感', quote: '我看着镜中的自己，觉得陌生。', left: '无感觉', right: '无法接受', leftTag: '誓约无感', rightTag: '誓约难容', title: '信念 · 自我誓约', detail: '无感觉一端：对背离自我誓约、放弃信念几乎无波动。无法接受一端：一旦违背对自己的承诺，便觉镜中人陌生，难以自恕。' },
    { id: 'humanity', category: '人性', theme: '具体面孔', guiltName: '冷漠感', quote: '我本可以伸手的，但我没有。', left: '无感觉', right: '无法接受', leftTag: '冷漠无感', rightTag: '冷漠难容', title: '人性 · 具体面孔', detail: '无感觉一端：对见死不救、袖手旁观几乎无罪恶感。无法接受一端：明明可以伸手却未伸手，会长期无法原谅自己的冷漠。' },
    { id: 'existence', category: '存在', theme: '生命尊严', guiltName: '僭越感', quote: '我扮演了神，却忘了自己只是人。', left: '无感觉', right: '无法接受', leftTag: '僭越无感', rightTag: '僭越难容', title: '存在 · 生命尊严', detail: '无感觉一端：对僭越生死、扮演「神」的边界几乎无排斥。无法接受一端：一旦越界干预生命尊严，便难以原谅自己只是凡人。' },
  ],
  directionChoices: [
    { id: 'power', label: '权力', left: '低倾向', right: '高倾向' },
    { id: 'wealth', label: '财富', left: '低倾向', right: '高倾向' },
    { id: 'emotion', label: '感情', left: '低倾向', right: '高倾向' },
    { id: 'desire', label: '欲望', left: '低倾向', right: '高倾向' },
  ],
  directionHorizons: [
    { key: 'short', label: '近期方向' },
    { key: 'medium', label: '中期方向' },
    { key: 'long', label: '长期方向' },
  ],
  defaultGuiltAxes() {
    return Object.fromEntries(this.guiltLines.map((item) => [item.id, 50]));
  },
  defaultDirectionWeights() {
    return Object.fromEntries(this.directionChoices.map((item) => [item.id, 50]));
  },
  defaultDirections() {
    const weights = this.defaultDirectionWeights();
    return { short: { ...weights }, medium: { ...weights }, long: { ...weights } };
  },
  guiltLeanText(value, item) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '居中';
    if (num <= 35) return `偏${item.left}`;
    if (num >= 65) return `偏${item.right}`;
    return '居中';
  },
  directionLeanText(value, item) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '居中';
    if (num <= 35) return `低${item.label}倾向`;
    if (num >= 65) return `高${item.label}倾向`;
    return `${item.label}倾向居中`;
  },
  dominantDirection(weights = {}) {
    const ranked = this.directionChoices
      .map((item) => ({ item, value: Number(weights[item.id]) || 0 }))
      .sort((a, b) => b.value - a.value);
    return ranked[0]?.item || null;
  },
  primaryGuiltLineId(guiltAxes = {}) {
    const ranked = this.guiltLines
      .map((item) => ({ item, value: Number(guiltAxes[item.id]) || 0 }))
      .sort((a, b) => b.value - a.value);
    return ranked[0]?.item?.id || '';
  },
  guiltLineById(id) {
    return this.guiltLines.find((item) => item.id === id) || null;
  },
  directionLabel(id) {
    return this.directionChoices.find((item) => item.id === id)?.label || '';
  },

  psychOptionKey(groupId, laneId) {
    return `${groupId}:${laneId}`;
  },

  psychSelectKey(groupId) {
    return groupId;
  },

  /** @deprecated 兼容旧引用 */
  psychGroupKey(laneId, groupId) {
    return this.psychOptionKey(groupId, laneId);
  },

  psychMinSelectPerGroup: 3,
  psychMaxSelectPerGroup: 3,
  /** @deprecated 等同 psychMinSelectPerGroup（每小类，非大类合计） */
  psychMinSelectPerCategory: 3,
  /** @deprecated 等同 psychMaxSelectPerGroup（每小类，非大类合计） */
  psychMaxSelectPerCategory: 3,
  psychOptionCount: 10,

  normalizePlayerGender(gender = '') {
    const raw = String(gender || '').trim();
    if (/^女|^female|^f$/i.test(raw)) return 'female';
    if (/^男|^male|^m$/i.test(raw)) return 'male';
    return 'male';
  },

  /** 旧版无主体词标签 → 带名词的现行写法（外貌偏好·阴毛状态） */
  psychTagAliases: {
    白虎: '无阴毛',
    稀疏: '阴毛稀疏',
    浓郁: '阴毛浓密',
    浓密: '阴毛浓密',
  },

  normalizePsychTag(tag = '') {
    const raw = String(tag || '').trim();
    return this.psychTagAliases[raw] || raw;
  },

  normalizePsychTagList(tags = []) {
    const out = [];
    (Array.isArray(tags) ? tags : []).forEach((item) => {
      const tag = this.normalizePsychTag(item);
      if (tag && !out.includes(tag)) out.push(tag);
    });
    return out;
  },

  resolvePsychFallbackTags(laneOrGroup = {}, gender = '') {
    const key = this.normalizePlayerGender(gender);
    const byGender = laneOrGroup?.fallbackTagsByGender;
    if (byGender && Array.isArray(byGender[key]) && byGender[key].length) {
      return this.normalizePsychTagList(byGender[key]);
    }
    return this.normalizePsychTagList(laneOrGroup?.fallbackTags);
  },

  playerGenderLabel(gender = '') {
    return this.normalizePlayerGender(gender) === 'female' ? '女' : '男';
  },

  psychGenderTagRules(gender = '') {
    const g = this.normalizePlayerGender(gender);
    if (g === 'female') {
      return [
        '当前玩家为女性。',
        '感情倾向各小类：围绕对男性异性的吸引与偏好；情感偏好优先兄控、哥控；外貌偏好用成熟男、健硕男、少年感等；穿着/化妆偏好写喜欢男性异性怎样穿、怎样打理仪容（无须化妆、阳光感、轻微胡茬等）。',
        '审美倾向的穿着/打扮偏好：写玩家自己乐于呈现的衣装与妆造（如 JK、连衣裙、精致妆容），不得写成对异性的偏好。',
        '禁止在感情倾向的外貌/穿着/化妆偏好中写萝莉、御姐、贫乳、巨乳、JK控等女性特征向标签。',
      ].join('\n');
    }
    return [
      '当前玩家为男性。',
      '感情倾向各小类：围绕对女性异性的吸引与偏好；情感偏好优先姐控、妹控；外貌偏好用萝莉、御姐、少女、贫乳、巨乳、无阴毛、阴毛稀疏、阴毛浓密等（阴毛状态须带「阴毛」或「无阴毛」，禁止单独写白虎/稀疏/浓郁）；穿着/化妆偏好写喜欢女性异性怎样穿、怎样妆感（JK控、淡颜系、精致妆容等）。',
      '审美倾向的穿着/打扮偏好：写玩家自己乐于呈现的衣装与仪容（如卫衣、西装、无须化妆），不得写成对异性的偏好。',
      '禁止在感情倾向的外貌/穿着/化妆偏好中写成熟男、健硕男、无须浓妆、轻微胡茬等男性特征向标签。',
    ].join('\n');
  },

  psychTagDirectionHint(groupId = '', categoryId = '', gender = '') {
    const g = this.normalizePlayerGender(gender);
    const emotionToward = g === 'female'
      ? '对男性异性的偏好'
      : '对女性异性的偏好';
    const selfPresentation = g === 'female'
      ? '玩家自己（女性向衣装/妆造）'
      : '玩家自己（男性向衣装/仪容）';
    if (categoryId === 'emotion') {
      if (['emotion_pref', 'appearance', 'partner_clothing', 'partner_makeup'].includes(groupId)) return emotionToward;
      if (groupId === 'personality') return '偏好的异性性格（两性共用词表）';
      if (['kink_outfit', 'affection_action', 'kink_action'].includes(groupId)) return '亲密互动中的主动/被动（与性别方向一致）';
    }
    if (categoryId === 'aesthetic' && (groupId === 'clothing_pref' || groupId === 'dress')) return selfPresentation;
    return '';
  },

  psychCategoryById(id) {
    return this.psychPreferenceCategories.find((item) => item.id === id) || null;
  },

  psychCategoryGroups(category) {
    return category?.groups || [];
  },

  /** 每个小类（正常/二次元）一条，用于标签池与换一批 */
  psychCategoryOptionEntries(category) {
    const entries = [];
    this.psychCategoryGroups(category).forEach((group) => {
      (group.lanes || []).forEach((lane) => {
        entries.push({
          key: this.psychOptionKey(group.id, lane.id),
          selectKey: group.id,
          group,
          lane,
          tagGroup: { id: group.id, label: group.label, hint: lane.hint, fallbackTags: lane.fallbackTags, fallbackTagsByGender: lane.fallbackTagsByGender },
        });
      });
    });
    return entries;
  },

  psychCategoryGroupKeys(category) {
    return this.psychCategoryOptionEntries(category);
  },

  psychPreferenceCategories: [
    {
      id: 'emotion',
      label: '感情倾向',
      intro: '你喜欢谁、被什么吸引。下方每个小类须各选满 3 个标签（正常与二次元合计，恰好 3 个）；可自定义标签，换一批时在已有标签后追加不重复新标签。',
      groups: [
        {
          id: 'emotion_pref',
          label: '情感偏好',
          lanes: [{
            id: 'normal',
            label: '正常',
            hint: '对异性的情感取向；如兄控/姐控、主动追求或被动被追求',
            fallbackTagsByGender: {
              male: ['姐控', '妹控', '主动对异性', '被动被异性', '同龄偏好', '成熟偏好', '依赖型', '保护型', '慢热型', '直球型', '柏拉图', '激情型', '异性偏好'],
              female: ['兄控', '哥控', '主动对异性', '被动被异性', '同龄偏好', '成熟偏好', '依赖型', '保护型', '慢热型', '直球型', '柏拉图', '激情型', '异性偏好'],
            },
          }],
        },
        {
          id: 'appearance',
          label: '外貌偏好',
          lanes: [{
            id: 'normal',
            label: '正常',
            hint: '偏好的异性外貌；体型、肤色、气质；胸围用贫乳/中乳/巨乳；阴毛状态须带名词：无阴毛、阴毛稀疏、阴毛浓密',
            fallbackTagsByGender: {
              male: ['萝莉', '御姐', '少女', '少年感', '贫乳', '中乳', '巨乳', '无阴毛', '阴毛稀疏', '阴毛浓密', '白皮肤', '高挑', '娇小'],
              female: ['少年感', '成熟男', '健硕男', '健硕感', '肌肉型', '白皮肤', '黑皮肤', '黄皮肤', '高挑', '阳光感'],
            },
          }],
        },
        {
          id: 'personality',
          label: '性格偏向',
          lanes: [{ id: 'normal', label: '正常', hint: '偏好的异性性格与相处气质（喜欢对方是什么样）；勿写角色自身性格', fallbackTags: ['傲娇', '温柔', '高冷', '三无', '呆萌', '元气', '腹黑', '天然', '病娇', '可靠', '主动型', '被动型', '包容型', '支配型'] }],
        },
        {
          id: 'partner_clothing',
          label: '穿着偏好',
          lanes: [{
            id: 'normal',
            label: '正常',
            hint: '偏好的异性穿着；对方衣装、鞋袜与发型',
            fallbackTagsByGender: {
              male: ['休闲风', '运动风', '制服感', 'JK控', '过膝袜控', '黑长直控', '双马尾控', '短发控', '简洁穿搭', '邻家感', '连衣裙', '成熟穿搭'],
              female: ['休闲风', '运动风', '卫衣T恤', '西装革履', '简洁穿搭', '成熟穿搭', '干练风', '运动穿搭', '邻家感', '制服感'],
            },
          }],
        },
        {
          id: 'partner_makeup',
          label: '化妆偏好',
          lanes: [{
            id: 'normal',
            label: '正常',
            hint: '偏好的异性妆容与仪容；喜欢对方什么妆感或无须化妆',
            fallbackTagsByGender: {
              male: ['素颜即可', '干净清爽', '淡颜系', '精致妆容', '唇彩点缀', '自然眉形', '薄唇自然', '护肤干净', '无须浓妆'],
              female: ['无须化妆', '无须浓妆', '干净清爽', '阳光感', '整洁体面', '轻微胡茬', '护肤干净', '自然眉形', '运动清爽', '素颜即可'],
            },
          }],
        },
        {
          id: 'kink_outfit',
          label: '情趣服装',
          lanes: [
            { id: 'normal', label: '正常', hint: '亲密场景穿着；含主动换穿、被动被安排', fallbackTags: ['比基尼', '兔女郎', '睡衣', '浴衣', '居家服', '制服感', '蕾丝', '丝绸', '运动内衣', '简约裸感', '主动换穿示好', '被动被安排'] },
            { id: 'acg', label: '二次元', hint: 'ACG 情趣穿着', fallbackTags: ['透明女仆装', '水着', '死库水', '兔女郎', '旗袍', '和服', 'JK泳装', 'Cosplay', '角色扮演服', '轻束缚风'] },
          ],
        },
        {
          id: 'affection_action',
          label: '亲昵动作',
          lanes: [
            { id: 'normal', label: '正常', hint: '非性亲昵；含主动发起、被动被疼', fallbackTags: ['耳鬓厮磨', '轻抚发丝', '拥抱依偎', '十指紧扣', '额头轻吻', '颈侧亲吻', '后背拥抱', '膝枕', '撒娇', '宠溺语气', '主动亲吻', '主动撒娇', '被动被抱', '被动被亲'] },
            { id: 'acg', label: '二次元', hint: 'ACG 向非性亲昵', fallbackTags: ['膝枕', '摸头杀', '壁咚', '耳边低语', '公主抱', '牵手', '靠肩', '投喂', '背后环抱', '轻捏脸颊', '被动被壁咚', '被动被摸头', '被动被背后环抱', '主动壁咚', '主动投喂'] },
          ],
        },
        {
          id: 'kink_action',
          label: '情趣动作',
          lanes: [
            { id: 'normal', label: '正常', hint: '亲密行为；含主动进攻、被动配合', fallbackTags: ['口角', '乳交', '正常位', '女上位', '跨坐', '站立进入', '后入', '侧入', '69式', '指交', '主动女上位', '主动跨坐', '被动正常位', '被动后入'] },
            { id: 'acg', label: '二次元', hint: 'ACG 向亲密行为', fallbackTags: ['口角', '乳交', '正常位', '骑乘位', '跨坐', '站立进入', '后入', '侧入', '69式', '桌边位', '主动骑乘', '被动正常位'] },
          ],
        },
      ],
    },
    {
      id: 'hobby',
      label: '爱好倾向',
      intro: '空闲时间更愿意把精力投向哪里。每个小类须各选满 3 个标签（正常与二次元合计）。',
      groups: [
        {
          id: 'outdoor',
          label: '户外偏好',
          lanes: [
            { id: 'normal', label: '正常', hint: '离开房间的活动', fallbackTags: ['羽毛球', '篮球', '爬山', '跑步', '骑行', '游泳', '露营', '摄影外拍', 'Citywalk', '探店'] },
            { id: 'acg', label: '二次元', hint: 'ACG 相关外出', fallbackTags: ['cosplay漫展', 'cosplay摄影', '主题咖啡厅', '动漫周边店', '声优活动', '痛车聚会', '同人展', '圣地巡礼', '手办展', '联名快闪'] },
          ],
        },
        {
          id: 'indoor',
          label: '室内偏好',
          lanes: [
            { id: 'normal', label: '正常', hint: '居家或室内活动', fallbackTags: ['游戏', '电视剧', '阅读', '烹饪', '手工', '健身', '音乐', '桌游', '写作', '收纳整理'] },
            { id: 'acg', label: '二次元', hint: 'ACG 相关室内', fallbackTags: ['动漫', '同人小说', 'Galgame', 'Vtuber', '手办拼装', '二次元手游', '补番', '画同人', '听OP/ED', '看轻小说'] },
          ],
        },
      ],
    },
    {
      id: 'perception',
      label: '感知倾向',
      intro: '你怎么感受世界——五感与氛围。每个小类须各选满 3 个标签（正常与二次元合计）。',
      groups: [
        {
          id: 'hearing',
          label: '听觉偏好',
          lanes: [
            { id: 'normal', label: '正常', hint: '声音与音乐', fallbackTags: ['白噪音', '雨声', '海浪', '古典钢琴', 'J-Pop', '纯音乐', '说唱', '播客', '环境音', '轻爵士'] },
            { id: 'acg', label: '二次元', hint: 'ACG 向声音', fallbackTags: ['ASMR', '咀嚼音', '敲击音', '动漫BGM', '角色歌', '声优广播', '8bit复古', 'Synthwave', '游戏OST', '治愈系纯音'] },
          ],
        },
        {
          id: 'taste_scent',
          label: '味觉/嗅觉偏好',
          lanes: [
            { id: 'normal', label: '正常', hint: '口味与气味', fallbackTags: ['甜口', '咸口', '辣口', '酸口', '咖啡', '茶', '木质香', '花果香', '海洋香调', '食物锅气'] },
            { id: 'acg', label: '二次元', hint: '主题感官', fallbackTags: ['主题咖啡', '限定甜点', '和果子', '波子汽水', '周边香薰', '书墨味', '新刊油墨', '模型胶味', '展场小吃', '便利店饭团'] },
          ],
        },
        {
          id: 'touch',
          label: '触觉/体感偏好',
          lanes: [
            { id: 'normal', label: '正常', hint: '触碰与材质', fallbackTags: ['喜欢被拥抱', '讨厌肢体接触', '柔软毛绒', '冰凉光滑', '温暖被炉', '裸睡', '加重毯', '阳光晒被', '丝绸触感', '棉麻触感'] },
            { id: 'acg', label: '二次元', hint: '周边与材质', fallbackTags: ['抱枕', '等身抱枕', '毛绒玩偶', '亚克力立牌手感', '键盘青轴', '手办漆面', 'Cosplay面料', '过膝袜触感', '耳机罩软垫', '毯子裹身'] },
          ],
        },
      ],
    },
    {
      id: 'aesthetic',
      label: '审美倾向',
      intro: '你觉得什么美——整体美学滤镜，以及**自己喜欢且乐于呈现**的穿着（衣装发型）与打扮（化妆妆造）。每个小类须各选满 3 个标签（正常与二次元合计）。',
      groups: [
        {
          id: 'visual',
          label: '美术/视觉风格',
          lanes: [
            { id: 'normal', label: '正常', hint: '宏观视觉品味', fallbackTags: ['极简主义', '复古胶片', '工业风', '北欧风', '水墨国风', '写实摄影', '街头涂鸦', '包豪斯', '自然田园', '现代轻奢'] },
            { id: 'acg', label: '二次元', hint: 'ACG 视觉', fallbackTags: ['赛博朋克', '废土末日', '蒸汽波', '浮世绘风', '赛璐璐', '厚涂', 'Gal系柔光', '机甲硬核', '魔法少女', '暗黑哥特'] },
          ],
        },
        {
          id: 'narrative',
          label: '叙事/故事基调',
          lanes: [
            { id: 'normal', label: '正常', hint: '偏好的故事气质', fallbackTags: ['治愈系', '致郁系', '热血王道', '悬疑烧脑', '日常轻喜剧', '史诗奇幻', '现实主义', '黑色幽默', '慢生活', '成长叙事'] },
            { id: 'acg', label: '二次元', hint: 'ACG 故事', fallbackTags: ['校园日常', '异世界', '恋爱喜剧', 'Post-apoc', '机战', '悬疑推理', '致郁美学', '百合/耽美', '冒险RPG', 'Meta叙事'] },
          ],
        },
        {
          id: 'clothing_pref',
          label: '穿着偏好',
          lanes: [
            {
              id: 'normal',
              label: '正常',
              hint: '衣服、服装、鞋袜与发型；自己喜爱并日常穿着/梳理的品类款式',
              fallbackTagsByGender: {
                male: ['卫衣T恤', '休闲风', '运动风', '通勤风', '西装革履', '百T恤', '运动穿搭', '干练风', '短发', '简洁穿搭'],
                female: ['JK服装', '连衣裙', '百T恤', '卫衣', '超短裙', '连裤袜', '过膝袜', '休闲风', '黑长直', '双马尾', '单马尾', '过肩发', '波浪卷'],
              },
            },
            { id: 'acg', label: '二次元', hint: 'ACG 向服装与发型', fallbackTags: ['洛丽塔', '女仆装', '哥特萝莉', '和风浴衣', '校园泳装', '双马尾JK', '制服日常', 'Cosplay服装', '兽耳头饰'] },
          ],
        },
        {
          id: 'dress',
          label: '打扮偏好',
          lanes: [
            {
              id: 'normal',
              label: '正常',
              hint: '化妆、妆造、美甲、发饰与面部修饰；自己乐于呈现的妆造方式',
              fallbackTagsByGender: {
                male: ['无须化妆', '护肤干净', '整洁体面', '阳光感', '干净清爽', '无须浓妆', '自然眉形', '简洁打理', '发型整齐', '运动清爽'],
                female: ['精致妆容', '清新裸妆', '日常淡妆', '约会妆', '唇彩点缀', '眼妆强调', '底妆轻薄', '发饰搭配', '美甲', '氛围感妆容'],
              },
            },
            { id: 'acg', label: '二次元', hint: 'ACG 向妆造修饰', fallbackTags: ['萌系妆容', '萝莉妆', '哥特妆', '二次元妆', '泪痣妆', 'Cosplay妆', '病娇妆', '元气妆', '淡颜妆', '舞台妆'] },
          ],
        },
      ],
    },
    {
      id: 'cognitive',
      label: '思维倾向',
      intro: '你怎么想问题——信息口味与学习方式。每个小类须各选满 3 个标签（正常与二次元合计）。',
      groups: [
        {
          id: 'knowledge',
          label: '知识领域偏好',
          lanes: [
            { id: 'normal', label: '正常', hint: '常关注的领域', fallbackTags: ['自然科学', '人文社科', '历史哲学', '生活实用', '编程技术', '商业财经', '心理学', '艺术鉴赏', '医学健康', '法律时事'] },
            { id: 'acg', label: '二次元', hint: 'ACG 向知识', fallbackTags: ['设定考据', '声优知识', '作画MAD', '同人文化', 'Gal剧情结构', '轻小说语法', '模型改造', 'VTuber生态', '同人法律', '二次元史'] },
          ],
        },
        {
          id: 'info_density',
          label: '信息密度偏好',
          lanes: [
            { id: 'normal', label: '正常', hint: '摄取信息的方式', fallbackTags: ['深度长文', '硬核考据', '短视频', '碎片化信息', '图文并茂', '纯文字脑补', '播客长谈', '数据图表', '案例故事', '清单体'] },
            { id: 'acg', label: '二次元', hint: 'ACG 信息方式', fallbackTags: ['Wiki考据', '长评文章', '切片短视频', '直播切片', '论坛楼', '设定集阅读', 'N站弹幕', '图解攻略', '汉化组博客', '官方访谈'] },
          ],
        },
      ],
    },
    {
      id: 'lifestyle',
      label: '生活倾向',
      intro: '你怎么过日子——节奏、空间、社交、消费与亲密边界。每个小类须各选满 3 个标签（正常与二次元合计）。',
      groups: [
        {
          id: 'rhythm',
          label: '时间节律',
          lanes: [
            { id: 'normal', label: '正常', hint: '一天中的能量分布', fallbackTags: ['晨型人', '夜猫子', '午睡派', '碎片化休息', '番茄钟', '周末集中', '规律作息', '弹性作息', '加班型', '随缘型'] },
            { id: 'acg', label: '二次元', hint: '追番/游戏节奏', fallbackTags: ['追番夜', '新番凌晨', '周末补番', '手游日常', '活动期爆肝', '长休沉浸', '碎片抽卡', '同人赶稿夜', '漫展前冲刺', '季番节奏'] },
          ],
        },
        {
          id: 'space',
          label: '空间秩序',
          lanes: [
            { id: 'normal', label: '正常', hint: '与环境的关系', fallbackTags: ['极度整洁', '乱中有序', '囤积癖', '封闭小空间', '开阔大空间', '极简断舍离', '工作台固定', '移动办公', '植物陪伴', '宠物友好'] },
            { id: 'acg', label: '二次元', hint: '周边与展示', fallbackTags: ['手办墙', '书架满溢', '痛桌', '藏周边', '亚克力墙', '模型柜', '海报满墙', '极简隐藏宅', 'RGB电竞角', '和室风'] },
          ],
        },
        {
          id: 'social',
          label: '社交能量',
          lanes: [
            { id: 'normal', label: '正常', hint: '与人相处的充电方式', fallbackTags: ['独处充电', '社交充电', '小圈子深度', '广撒网泛社交', '线上社交', '线下聚会', '一对一深聊', '旁观型', '组织者', '随缘型'] },
            { id: 'acg', label: '二次元', hint: '同好社交', fallbackTags: ['同好群聊', '漫展面基', '线上公会', 'solo宅', 'Cos圈社交', '同人交流', '主播互动', '仅围观', '组织活动', '小圈子深交'] },
          ],
        },
        {
          id: 'consumption',
          label: '消费观',
          lanes: [
            { id: 'normal', label: '正常', hint: '金钱流向', fallbackTags: ['体验派', '物质派', '实用派', '收藏癖', '为健康投资', '为学习付费', '为颜值付费', '为效率付费', '极简消费', '冲动消费'] },
            { id: 'acg', label: '二次元', hint: '宅向消费', fallbackTags: ['手办收藏', '限定周边', '数字内容', '同人支持', '游戏氪金', '理性补款', '为IP买单', '为体验买单', '二手捡漏', '自制省钱'] },
          ],
        },
        {
          id: 'decision',
          label: '决策驱动',
          lanes: [
            { id: 'normal', label: '正常', hint: '如何做决定', fallbackTags: ['理性分析', '感性冲动', '情怀驱动', '看评测', '看眼缘', '问朋友', '拖延后再定', '列清单', '直觉第一', '风险厌恶'] },
            { id: 'acg', label: '二次元', hint: '宅向决策', fallbackTags: ['看口碑', '看画风', '看声优', '看设定', '跟风入坑', '等打折', '首发支持', '测评参考', '情怀入', '随缘入'] },
          ],
        },
        {
          id: 'intimacy',
          label: '相处模式',
          lanes: [
            { id: 'normal', label: '正常', hint: '亲密关系中的偏好', fallbackTags: ['黏腻型', '放养型', '对抗型', '照顾型', '被照顾型', '高质量独处', '共享爱好', '深度对话', '行动派', '仪式感'] },
            { id: 'acg', label: '二次元', hint: '与推/角色的情感', fallbackTags: ['推活分享', '私享不打扰', '一起打游戏', '一起追番', '互赠周边', '写同人', 'Cos给看', '语音陪伴', '线下约会', '精神陪伴'] },
          ],
        },
        {
          id: 'boundary',
          label: '私密边界',
          lanes: [
            { id: 'normal', label: '正常', hint: '隐私与信任', fallbackTags: ['极度开放', '中等隐私', '高度戒备', '共享密码', '独立设备', '日记私密', '手机可看', '需要报备', '空间分隔', '信任渐进'] },
            { id: 'acg', label: '二次元', hint: '宅身份边界', fallbackTags: ['公开宅', '半公开', '完全隐藏', '仅网友知', '仅亲友知', '收藏保密', '浏览记录私密', '小号社交', '痛包出门', '宅味不外露'] },
          ],
        },
      ],
    },
  ],

  defaultPsychPreferences() {
    return { selected: {}, options: {}, custom: {} };
  },

  migratePsychPreferences(psych = {}) {
    const next = { ...psych };
    ['selected', 'options', 'custom'].forEach((field) => {
      const bucket = psych?.[field];
      if (!bucket || typeof bucket !== 'object') return;
      next[field] = Object.fromEntries(
        Object.entries(bucket).map(([key, tags]) => [key, this.normalizePsychTagList(tags)]),
      );
    });
    return next;
  },

  /** 每组预置 10 个内置标签（来自 fallbackTags，去重后取前 10） */
  getBuiltinPsychTags(group, count = null) {
    const total = count ?? this.psychOptionCount ?? 10;
    const gender = this.playerGenderLabel?.(group?.playerGender) || group?.playerGender || '';
    const genderBuckets = group?.fallbackTagsByGender && typeof group.fallbackTagsByGender === 'object'
      ? (group.fallbackTagsByGender[gender] || group.fallbackTagsByGender[group?.playerGender] || [])
      : [];
    const mergedPool = [
      ...(Array.isArray(genderBuckets) ? genderBuckets : []),
      ...(Array.isArray(group?.fallbackTags) ? group.fallbackTags : []),
    ];
    const pool = [...new Set(mergedPool
      .map((item) => String(item || '').trim())
      .filter(Boolean))];
    if (pool.length >= total) return pool.slice(0, total);
    const padded = pool.slice();
    while (padded.length < total) {
      const base = pool[padded.length % Math.max(pool.length, 1)] || `选项${padded.length + 1}`;
      const suffix = padded.length >= pool.length ? `·${Math.floor(padded.length / Math.max(pool.length, 1)) + 1}` : '';
      padded.push(`${base}${suffix}`);
    }
    return padded.slice(0, total);
  },
  fallbackPsychTags(group, count = 10) {
    const pool = Array.isArray(group?.fallbackTags) ? group.fallbackTags.slice() : [];
    if (!pool.length) return Array.from({ length: count }, (_, i) => `选项${i + 1}`);
    const out = [];
    while (out.length < count) {
      const item = pool[out.length % pool.length];
      const suffix = out.length >= pool.length ? `·${Math.floor(out.length / pool.length) + 1}` : '';
      out.push(`${item}${suffix}`);
    }
    return out.slice(0, count);
  },

  buildPsychTagOptions(group, newTags = [], lockedTags = [], excludeTags = []) {
    const total = this.psychOptionCount || 10;
    const locked = this.normalizePsychTagList(lockedTags);
    const exclude = new Set([
      ...locked,
      ...this.normalizePsychTagList(excludeTags),
    ]);
    const need = Math.max(0, total - locked.length);
    const fresh = this.normalizePsychTagList(newTags)
      .filter((item) => !exclude.has(item));
    const pool = this.getBuiltinPsychTags(group, Math.max(need, total)).filter((item) => !exclude.has(item));
    const rest = [];
    [...fresh, ...pool].forEach((item) => {
      if (rest.length >= need) return;
      if (!rest.includes(item) && !exclude.has(item)) rest.push(item);
    });
    return [...locked, ...rest].slice(0, Math.max(total, locked.length));
  },

  /** 换一批：在已有标签末尾追加不重复的新标签 */
  appendPsychTagOptions(group, existingTags = [], newTags = [], excludeTags = [], appendCount = null) {
    const count = appendCount ?? this.psychOptionCount ?? 10;
    const existing = this.normalizePsychTagList(existingTags);
    const exclude = new Set([
      ...existing,
      ...this.normalizePsychTagList(excludeTags),
    ]);
    const appended = [];
    const pushUnique = (item) => {
      const tag = this.normalizePsychTag(item);
      if (!tag || exclude.has(tag) || appended.includes(tag)) return;
      appended.push(tag);
      exclude.add(tag);
    };
    (Array.isArray(newTags) ? newTags : []).forEach(pushUnique);
    if (appended.length < count && group) {
      const pool = [
        ...(Array.isArray(group?.fallbackTags) ? group.fallbackTags : []),
        ...this.getBuiltinPsychTags(group, count * 2),
      ];
      pool.forEach((item) => {
        if (appended.length >= count) return;
        pushUnique(item);
      });
    }
    return [...existing, ...appended.slice(0, count)];
  },
};


