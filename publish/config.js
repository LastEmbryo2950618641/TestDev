/**
 * 游戏配置：角色、初始属性和本地兜底剧情。
 */
window.GameModules = window.GameModules || {};

window.GameModules.config = {
  sectionHintsEnabled: true,
  cache: {
    enabled: false,
    // 只控制可重新计算/重新读取的缓存；存档、角色记忆、当前运行状态不受影响。
    scopes: { files: true, catalog: true, promptTemplates: true, characterProfiles: true, generatedLore: true, generatedSchema: true, generatedProfiles: true, generatedProfessions: true },
  },
  assetEnv: 'dev',
  assetRoots: {
    dev: { cacheRoots: ['./', ''], sourceRoots: ['assets'] },
    prod: { cacheRoots: ['./', ''], sourceRoots: ['assets'] },
  },
  rag: { maxIndexFiles: 3, maxCandidateFiles: 8, defaultResultLimit: 3, logFiles: true },
  modelInputWindows: {
    'deepseek-v4-flash': 1000000,
    'deepseek-v4-pro': 1000000,
    'nalang-turbo-0101': 32000,
    'nalang-turbo-0826': 32000,
  },
  defaultModelId: 'deepseek-v4-flash',
  preferredTextModelIds: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  textProviders: {
    defaultProvider: 'deepseek',
    dzmm: {
      defaultModel: 'nalang-turbo-0826',
      preferredModelIds: ['nalang-turbo-0101', 'nalang-turbo-0826'],
    },
    deepseek: {
      baseUrl: 'https://api.deepseek.com',
      defaultModel: 'deepseek-v4-flash',
      preferredModelIds: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    },
  },
  drawProviders: {
    defaultProvider: 'pixai',
    dzmm: {
      defaultModel: 'anime',
    },
    pixai: {
      baseUrl: 'https://api.pixai.art',
      defaultModel: '1983308862240288769',
      defaultMode: 'standard',
      recommendedModels: [
        {
          id: '1983308862240288769',
          displayName: 'Tsubaki.2',
          description: 'Strong prompt understanding, seamless anatomy, precision, adaptable style, multi-character interaction',
        },
        {
          id: '1861558740588989558',
          displayName: 'Haruka v2',
          description: 'Stable quality, refined details, and accurate hands',
        },
        {
          id: '1954632828118619567',
          displayName: 'Hoshino v2',
          description: 'Popular Japanese style',
        },
      ],
    },
  },
  aiRequest: { maxConcurrent: 4, logLifecycle: false, logRawResponse: true, activationBurst: { maxConcurrent: 8, minGapMs: 400 } },
  characterProfile: { preferSingleShotPart2: true },
  stats: [
    { key: 'will', label: '意志' },
    { key: 'sense', label: '感知' },
    { key: 'charm', label: '魅力' },
    { key: 'combat', label: '战斗' },
  ],
  characters: [
    {
      id: 'mio',
      name: '星野澪',
      mark: 'MIO',
      role: '失忆魔法学院生',
      personality: '敏感、聪明、害怕失去自由，但会在危机中保护弱者。',
      stats: { will: 72, sense: 86, charm: 63, combat: 42 },
      skills: [
        { name: '星屑占测', desc: '预感危险和隐藏分支' },
        { name: '记忆回响', desc: '读取场景残留情绪' },
        { name: '微光屏障', desc: '抵挡一次精神冲击' },
      ],
    },
    {
      id: 'ren',
      name: '绫濑莲',
      mark: 'REN',
      role: '赛博城赏金猎人',
      personality: '冷静、戒备心强、讨厌被命令，重视契约和效率。',
      stats: { will: 81, sense: 66, charm: 48, combat: 88 },
      skills: [
        { name: '电磁短刃', desc: '近距离压制敌人' },
        { name: '黑市情报', desc: '发现隐藏交易线索' },
        { name: '神经过载', desc: '短时爆发但增加反抗' },
      ],
    },
    {
      id: 'yuka',
      name: '白羽优花',
      mark: 'YUKA',
      role: '神社见习巫女',
      personality: '温柔、直觉强、容易共情，也最容易察觉操控者存在。',
      stats: { will: 58, sense: 92, charm: 79, combat: 35 },
      skills: [
        { name: '净心铃', desc: '安抚混乱情绪' },
        { name: '灵视', desc: '看见非人之物' },
        { name: '结界纸鹤', desc: '封锁一个危险选择' },
      ],
    },
  ],
  openingChoices: ['观察四周', '询问陌生声音', '检查角色状态', '向前探索'],
};

window.GameModules.cache = {
  enabled(scope = 'default') {
    const cache = window.GameModules.config?.cache;
    if (typeof cache === 'boolean') return cache;
    if (!cache?.enabled) return false;
    return cache.scopes?.[scope] !== false;
  },
};
