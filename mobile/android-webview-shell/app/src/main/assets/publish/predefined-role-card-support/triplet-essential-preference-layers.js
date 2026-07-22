window.GameModules = window.GameModules || {};

const tripletPsych = (selected) => ({ selected });

/** 三胞胎妹妹预定义本质偏好五层；心理偏好为 6 大类下全部 26 小类，每小类恰好 3 个标签 */
window.GameModules.predefinedTripletEssentialLayers = {
  'liu-siyao': {
    layer1: '价值立场偏好: 中立善良',
    layer2: '决策风格偏好: 偏感性,74',
    layer3: '人生六维偏好: 权力/自由偏自由40,智慧/欲望偏欲望55,感情/名望偏感情70,财富/救赎偏付出60,平凡/创造居中50,内省/归属偏归属75',
    layer4: '底线锚点偏好: 伦理·普世是非偏左25,职业·身份尊严居中45,家国·血脉故土偏右58,信念·自我誓约偏右52,人性·具体面孔偏右75,存在·生命尊严居中48',
    psychPreferences: tripletPsych({
      emotion_pref: ['兄控', '主动对异性', '直球型'],
      appearance: ['成熟男', '健硕感', '高挑'],
      personality: ['可靠', '温柔', '包容型'],
      partner_clothing: ['休闲风', '简洁穿搭', '成熟穿搭'],
      partner_makeup: ['干净清爽', '素颜即可', '阳光感'],
      kink_outfit: ['居家服', '丝绸', '主动换穿示好'],
      affection_action: ['主动投喂', '轻抚发丝', '主动撒娇'],
      kink_action: ['主动女上位', '主动跨坐', '被动正常位'],
      outdoor: ['探店', 'Citywalk', '摄影外拍'],
      indoor: ['烹饪', '收纳整理', '动漫'],
      hearing: ['治愈系纯音', '轻爵士', '雨声'],
      taste_scent: ['甜口', '食物锅气', '茶'],
      touch: ['喜欢被拥抱', '柔软毛绒', '棉麻触感'],
      visual: ['极简主义', 'Gal系柔光', '自然田园'],
      narrative: ['治愈系', '日常轻喜剧', '成长叙事'],
      clothing_pref: ['JK服装', '连裤袜', '黑长直'],
      dress: ['清新裸妆', '精致妆容', '发饰搭配'],
      knowledge: ['生活实用', '心理学', '艺术鉴赏'],
      info_density: ['案例故事', '图文并茂', '清单体'],
      rhythm: ['规律作息', '晨型人', '午睡派'],
      space: ['极度整洁', '极简断舍离', '植物陪伴'],
      social: ['小圈子深度', '一对一深聊', '线下聚会'],
      consumption: ['实用派', '为健康投资', '极简消费'],
      decision: ['直觉第一', '列清单', '问朋友'],
      intimacy: ['照顾型', '黏腻型', '仪式感'],
      boundary: ['信任渐进', '中等隐私', '日记私密'],
    }),
  },
  'liu-siqi': {
    layer1: '价值立场偏好: 中立善良',
    layer2: '决策风格偏好: 偏理性,58',
    layer3: '人生六维偏好: 权力/自由偏自由38,智慧/欲望偏欲望58,感情/名望偏感情55,财富/救赎居中50,平凡/创造偏创造42,内省/归属偏归属60',
    layer4: '底线锚点偏好: 伦理·普世是非偏右72,职业·身份尊严偏右65,家国·血脉故土居中50,信念·自我誓约偏右58,人性·具体面孔偏右70,存在·生命尊严偏右68',
    psychPreferences: tripletPsych({
      emotion_pref: ['被动被异性', '兄控', '慢热型'],
      appearance: ['少年感', '成熟男', '高挑'],
      personality: ['可靠', '温柔', '主动型'],
      partner_clothing: ['休闲风', '卫衣T恤', '简洁穿搭'],
      partner_makeup: ['干净清爽', '无须化妆', '阳光感'],
      kink_outfit: ['居家服', '简约裸感', '被动被安排'],
      affection_action: ['被动被摸头', '靠肩', '被动被壁咚'],
      kink_action: ['被动正常位', '被动后入', '侧入'],
      outdoor: ['圣地巡礼', '动漫周边店', '主题咖啡厅'],
      indoor: ['动漫', 'Galgame', '补番'],
      hearing: ['ASMR', '动漫BGM', '治愈系纯音'],
      taste_scent: ['主题咖啡', '和果子', '书墨味'],
      touch: ['过膝袜触感', '毛绒玩偶', '耳机罩软垫'],
      visual: ['暗黑哥特', '赛璐璐', '浮世绘风'],
      narrative: ['致郁美学', '校园日常', '悬疑推理'],
      clothing_pref: ['JK服装', '连裤袜', '黑长直'],
      dress: ['清新裸妆', '哥特妆', '日常淡妆'],
      knowledge: ['设定考据', '轻小说语法', '声优知识'],
      info_density: ['Wiki考据', '设定集阅读', '长评文章'],
      rhythm: ['夜猫子', '追番夜', '周末补番'],
      space: ['乱中有序', '极简隐藏宅', '书架满溢'],
      social: ['独处充电', '小圈子深度', 'solo宅'],
      consumption: ['理性补款', '数字内容', '为IP买单'],
      decision: ['看设定', '理性分析', '等打折'],
      intimacy: ['被照顾型', '高质量独处', '共享爱好'],
      boundary: ['完全隐藏', '浏览记录私密', '仅亲友知'],
    }),
  },
  'liu-siyi': {
    layer1: '价值立场偏好: 混乱善良',
    layer2: '决策风格偏好: 偏感性,68',
    layer3: '人生六维偏好: 权力/自由偏自由45,智慧/欲望偏欲望60,感情/名望偏感情72,财富/救赎居中50,平凡/创造偏创造48,内省/归属偏归属68',
    layer4: '底线锚点偏好: 伦理·普世是非偏左32,职业·身份尊严居中50,家国·血脉故土偏右55,信念·自我誓约偏右60,人性·具体面孔偏右68,存在·生命尊严居中52',
    psychPreferences: tripletPsych({
      emotion_pref: ['依赖型', '主动对异性', '被动被异性'],
      appearance: ['成熟男', '健硕感', '少年感'],
      personality: ['可靠', '温柔', '包容型'],
      partner_clothing: ['休闲风', '邻家感', '运动风'],
      partner_makeup: ['干净清爽', '阳光感', '无须浓妆'],
      kink_outfit: ['主动换穿示好', '制服感', '被动被安排'],
      affection_action: ['主动撒娇', '轻捏脸颊', '被动被抱'],
      kink_action: ['主动女上位', '主动跨坐', '被动正常位'],
      outdoor: ['探店', '联名快闪', '动漫周边店'],
      indoor: ['手工', '动漫', '二次元手游'],
      hearing: ['动漫BGM', '角色歌', '游戏OST'],
      taste_scent: ['限定甜点', '甜口', '波子汽水'],
      touch: ['喜欢被拥抱', '柔软毛绒', '过膝袜触感'],
      visual: ['Gal系柔光', '魔法少女', '赛璐璐'],
      narrative: ['恋爱喜剧', '校园日常', '治愈系'],
      clothing_pref: ['JK服装', '过膝袜', '双马尾'],
      dress: ['精致妆容', '发饰搭配', '唇彩点缀'],
      knowledge: ['心理学', '生活实用', '艺术鉴赏'],
      info_density: ['碎片化信息', '图文并茂', '案例故事'],
      rhythm: ['弹性作息', '手游日常', '碎片抽卡'],
      space: ['乱中有序', '藏周边', '海报满墙'],
      social: ['小圈子深度', '线上社交', '一对一深聊'],
      consumption: ['为颜值付费', '冲动消费', '限定周边'],
      decision: ['感性冲动', '看眼缘', '直觉第一'],
      intimacy: ['对抗型', '黏腻型', '仪式感'],
      boundary: ['高度戒备', '日记私密', '浏览记录私密'],
    }),
  },
};

(function attachTripletEssentialLayers() {
  const data = window.GameModules.predefinedRoleCardData || {};
  const map = window.GameModules.predefinedTripletEssentialLayers || {};
  Object.keys(map).forEach((key) => {
    if (!data[key]) return;
    const preset = map[key];
    data[key].essentialPreferenceLayers = {
      layer1: preset.layer1,
      layer2: preset.layer2,
      layer3: preset.layer3,
      layer4: preset.layer4,
    };
    if (preset.psychPreferences) data[key].psychPreferences = preset.psychPreferences;
  });
})();
