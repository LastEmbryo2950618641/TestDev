window.GameModules = window.GameModules || {};

window.GameModules.characterReasonFallback = {
  text(profile = {}) {
    return [profile.name, profile.role, profile.job, profile.detail, profile.relationships, profile.personality, profile.work, profile.city, profile.workplace, profile.position].filter(Boolean).join('，');
  },

  usable(text) {
    const value = String(text || '').trim();
    return value && !/^错误：/.test(value) && !window.GameModules.characterProfile?.abstractReason?.(value);
  },

  mergeReasons(fallback, current = {}) {
    const out = { ...fallback };
    Object.entries(current || {}).forEach(([key, value]) => { if (this.usable(value)) out[key] = String(value).trim(); });
    return out;
  },

  roleReasons(profile = {}) {
    const name = profile.name || '该人物';
    const world = profile.work || profile.worldTag || '当前世界';
    const role = profile.role || profile.job || '当前身份';
    const detail = profile.detail || profile.personality || '已有资料';
    return {
      姓名: `${name}这个称呼与当前家庭、社交或人物关系链一致，能让他人在剧情里明确指认本人。`,
      所属世界: `${name}的生活地点、社会规则和行动范围都落在${world}，后续事件需要按这个世界处理。`,
      身份: `${detail}让${name}在当前场景中承担“${role}”这一社会位置。`,
      职业: profile.job ? `${name}长期承担${profile.job}相关工作或训练，所以职业写为${profile.job}。` : `${name}当前经历只显示日常身份和生活处境，还没有足够履历证明一个长期职业。`,
      性别: profile.gender ? `${name}在当前人物记录中以${profile.gender}参与家庭、社交和身体状态判定。` : `${name}目前的关系和行动记录没有给出可靠性别线索。`,
      生日: profile.birthday ? `${name}的生日已用于年龄和人生阶段计算，因此记录为${profile.birthday}。` : `${name}只暴露了身份阶段或关系称谓，还没有出现明确生日。`,
      人际关系: profile.relationships ? `${profile.relationships}会直接影响${name}对玩家的亲疏、信任和日常互动。` : `${name}暂时没有与玩家形成可确认的亲属、同事、同学或朋友关系。`,
      外貌: `${name}的可见形象按年龄、生活环境、职业或家庭处境克制描写，避免脱离当前经历。`,
      性格: `${profile.personality || detail}体现了${name}面对压力、关系和日常选择时的稳定反应。`,
      人物说明: `${detail}说明了${name}此刻的生活位置、关系牵连和可行动边界。`,
      社群角色: `${name}需要通过居住地、家庭、朋友圈或临时处境确定自己属于哪个社群。`,
      势力地位: `${name}在国家、学校、公司或组织中的层级会影响资源、责任和可用行动。`,
    };
  },

  rpgReasons(profile = {}, attrs = null) {
    const name = profile.name || '该人物';
    const text = this.text(profile);
    const has = (pattern) => pattern.test(text);
    const keys = window.GameModules.characterProfile.rpgFieldReasonKeys(attrs || profile.worldAttributes || null);
    const map = {
      age: profile.birthday ? `${name}的年龄按已记录生日与当前时间计算，生日事实来自玩家资料或人物基础区。` : `${name}的年龄按人物身份、关系称谓和当前生活处境折算，缺少明确生日时不凭空改写生日。`,
      level: `${name}的等级按其身份经历、当前生活压力和可行动范围折算，反映初始综合成熟度。`,
      exp: `${name}刚以当前资料首次落库，经验从其已有经历折算为初始进度，等待后续行动继续累积。`,
      free_attribute_points: `${name}尚未发生由玩家分配的升级结算，因此自由属性点保持初始余额。`,
      level_growth: `${name}还没有完整升级历史，成长记录从首次固化状态开始追踪。`,
      vitality: `${name}当前没有明确致命伤证据，生命力按年龄、体质和生活处境维持初始状态。`,
      stamina_pool: `${name}的精力按日常作息、身体负担和当前行动压力折算。`,
      satiety: `${name}当前没有明确饥饿或进食事件，饱食度保持日常稳定水平。`,
      hydration: `${name}当前没有明确脱水或补水事件，水分状态保持日常稳定水平。`,
      fatigue: `${name}的疲劳度按当前压力、身体负担和最近行动强度推定。`,
      strength: has(/训练|战斗|军人|运动|体力|劳动/) ? `${name}有体能训练、战斗或劳动经历，力量高于普通日常水平。` : `${name}缺少专项力量训练证据，力量按普通日常生活水平固化。`,
      agility: has(/运动|战斗|逃|敏捷|训练/) ? `${name}的行动经历需要反应和移动能力，因此敏捷被推到较高水平。` : `${name}主要处于普通生活节奏，敏捷按日常移动和反应能力固化。`,
      constitution: has(/病|虚弱|创伤|受伤/) ? `${name}的身体处境存在病弱、创伤或受伤线索，因此体质受到压低。` : `${name}没有严重疾病或伤势证据，体质按日常健康基础固化。`,
      intelligence: has(/学生|学习|工程|研究|教师|医生|知识/) ? `${name}的学习、工作或知识经历需要理解分析能力，因此智力较受支撑。` : `${name}缺少高强度知识训练证据，智力按生活经验与基础教育固化。`,
      perception: has(/观察|警惕|危险|照顾|调查/) ? `${name}长期需要观察环境或他人反应，因此感知能力被提高。` : `${name}当前处境没有高危侦察需求，感知按普通生活经验固化。`,
      willpower: has(/丧亲|压力|照顾|创伤|坚持|困难/) ? `${name}经历家庭压力、责任或创伤，需要持续忍耐，因此意志较高。` : `${name}缺少强烈逆境证据，意志按稳定日常心理承受力固化。`,
      charisma: has(/社交|管理|亲密|服务|领导|家庭/) ? `${name}的关系或社会角色需要沟通协调，因此魅力有现实支撑。` : `${name}没有突出社交影响力证据，魅力按普通人际表现固化。`,
      learning_ability: has(/学生|学习|研究|工程|技能|训练/) ? `${name}持续学习或训练经历支撑其学习能力。` : `${name}目前缺少持续训练证据，学习能力按普通适应力固化。`,
      mental_stability: has(/创伤|丧亲|恐惧|压力|病/) ? `${name}受到创伤、丧亲或压力影响，精神稳定性因此承压。` : `${name}没有明显心理冲击证据，精神稳定按日常状态固化。`,
      growth_potential: `${name}仍会随剧情行动、训练和关系变化成长，因此保留可发展潜力。`,
      action_ability: `${name}的行动能力按当前身体状态、身份限制和可支配资源综合固化。`,
      world_tag: `${name}的状态归属于${profile.work || profile.worldTag || '当前世界'}，用于区分世界专属规则。`,
      health: `${name}没有明确重伤事件，健康百分比由生命力初始状态换算。`,
      stamina: `${name}没有明确精疲力尽事件，精力百分比由精力池初始状态换算。`,
      professions: `${name}的职业树只记录已有职业资格或长期训练经历，缺少证据时保持为空。`,
      skills: `${name}的技能来自人物资料、现实身份或当前生活经验，后续使用和训练会继续更新。`,
      knowledge: `${name}的知识储备来自教育、职业、生活经验和世界观背景，缺少证据的领域不强行添加。`,
      equipment: `${name}的装备按身份、当前场景和可调用工具固化。`,
      items: `${name}的物品按日常携带和生活需要固化。`,
      wearing: `${name}的穿着按当前生活场景、身份和基础穿戴需求固化。`,
      factions: `${name}的社群角色来自住址、家庭、社交圈或当前处境。`,
      force_positions: `${name}的势力地位来自国家、学校、公司或组织层级归属。`,
      status_tags: `${name}的状态标签概括其身份、处境和所属世界，供剧情判定使用。`,
      derived: `${name}的衍生战斗与判定数值由力量、敏捷、体质、感知和意志等已固化能力计算得到。`,
      combat_simulation: `${name}的战斗模拟按当前能力、装备和状态生成，用于后续行动判定而不是独立编造。`,
      control_experience: `${name}尚未形成被玩家上线操控的经历，因此上线体验从初始状态开始记录。`,
    };
    return Object.fromEntries(keys.map((key) => [key, map[key] || `${name}的${key}按当前人物资料、生活经历和世界规则固化，后续由明确剧情事件更新。`]));
  },

  apply(profile = {}, attrs = null) {
    const role = this.roleReasons(profile);
    const rpg = this.rpgReasons(profile, attrs);
    return {
      ...profile,
      roleCardFieldReasons: this.mergeReasons(role, profile.roleCardFieldReasons),
      rpgFieldReasons: this.mergeReasons(rpg, profile.rpgFieldReasons),
    };
  },
};
