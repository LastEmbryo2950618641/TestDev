#!/usr/bin/env node
/**
 * json-to-toon.js
 * 将 prompt 格式的角色卡 JSON 转换为运行时 TOON (Token-Oriented Object Notation) 格式。
 *
 * 用法: node tools/json-to-toon.js <input.json>
 * 输出: 同路径下生成 <input>.toon
 *
 * 转换规则:
 *   - age: {value, reason} → 整数
 *   - worldTag.value → work (顶层字符串)
 *   - feeling → initialMetrics
 *   - factions/forcePositions: 自动拼接 name，添加 changeMode
 *   - forcePositions → 同时生成 force_positions 副本
 *   - equipment: 添加 type/kind/level
 *   - items: 添加 type/kind/level
 *   - wearing: 添加 type/level
 *   - professions: 添加 changeMode
 *   - 新增运行时字段: id, birthday, faction, factionRole, roleCardFieldReasons, rpgFieldReasons, worldAttributes, roleCard, roleCardSource, roleCardUpdatedAt
 */

const fs = require('fs');
const path = require('path');

// ── helpers ──

function pinyinSlug(name) {
  const map = { '刘思琪': 'liu-siqi', '刘思瑶': 'liu-siyao', '刘悠': 'liu-you' };
  return map[name] || name;
}

function guessBirthday(ageValue) {
  const year = 2026 - (ageValue || 16);
  return `${year}-01-01`;
}

function factionName(item) {
  return [item.faction, item.role].filter(Boolean).join(' / ');
}

function forceName(item) {
  return [item.force, item.position].filter(Boolean).join(' / ');
}

// ── 主转换 ──

function convert(src) {
  const ageValue = src.age?.value || 0;
  const worldValue = src.worldTag?.value || '现实世界';
  const firstFaction = (src.factions || [])[0] || {};

  const toon = {};

  // ── 顶层扁平字段 ──
  toon.id = pinyinSlug(src.name);
  toon.name = src.name;
  toon.gender = src.gender || '';
  toon.age = ageValue;
  toon.birthday = guessBirthday(ageValue);
  toon.work = worldValue;
  toon.role = src.role || '';
  toon.job = src.job || '';
  toon.rank = src.rank || '';
  toon.faction = firstFaction.faction || '';
  toon.factionRole = firstFaction.role || '';
  toon.relationships = src.relationships || '';
  toon.detail = src.detail || '';
  toon.appearance = src.appearance || '';
  toon.personality = src.personality || '';

  // ── 保留的 {value, reason} 嵌套对象 ──
  toon.worldTag = src.worldTag || {};
  toon.learningAbility = src.learningAbility || {};
  toon.mentalStability = src.mentalStability || {};
  toon.growthPotential = src.growthPotential || {};
  toon.actionAbility = src.actionAbility || {};

  // ── factions: 添加 name + changeMode ──
  toon.factions = (src.factions || []).map((f) => ({
    name: factionName(f),
    faction: f.faction,
    role: f.role,
    reason: f.reason,
    changeMode: '角色卡初始固化',
  }));

  // ── forcePositions: 添加 name + changeMode，同时生成 force_positions 副本 ──
  const fp = (src.forcePositions || []).map((f) => ({
    name: forceName(f),
    force: f.force,
    position: f.position,
    reason: f.reason,
    changeMode: '角色卡初始固化',
  }));
  toon.forcePositions = fp;
  toon.force_positions = JSON.parse(JSON.stringify(fp));

  // ── jobConfirmed ──
  toon.jobConfirmed = src.jobConfirmed || false;

  // ── skills: 添加 changeMode ──
  toon.skills = (src.skills || []).map((s) => ({
    ...s,
    changeMode: '角色卡初始固化',
  }));

  // ── knowledge: 添加 changeMode ──
  toon.knowledge = (src.knowledge || []).map((k) => ({
    ...k,
    changeMode: '角色卡初始固化',
  }));

  // ── professions: 添加 changeMode ──
  toon.professions = (src.professions || []).map((p) => ({
    ...p,
    changeMode: '角色卡初始固化',
  }));

  // ── equipment: 添加 type/kind/level ──
  toon.equipment = (src.equipment || []).map((e) => ({
    name: e.name,
    type: '装备',
    kind: '装备',
    description: e.description,
    quantity: e.quantity || 1,
    equipSlots: e.equipSlots || [],
    reason: e.reason,
    changeMode: '角色卡初始固化',
    level: -1,
  }));

  // ── items: 添加 type/kind/level ──
  toon.items = (src.items || []).map((i) => ({
    name: i.name,
    type: '物品',
    kind: '物品',
    description: i.description,
    quantity: i.quantity || 1,
    reason: i.reason,
    changeMode: '角色卡初始固化',
    level: -1,
  }));

  // ── wearing: 添加 type/level ──
  toon.wearing = (src.wearing || []).map((w) => ({
    slot: w.slot,
    bodyPart: w.bodyPart,
    name: w.name,
    type: '穿着',
    description: w.description,
    reason: w.reason,
    changeMode: '角色卡初始固化',
    level: -1,
  }));

  // ── control_experience ──
  toon.control_experience = src.control_experience || { 上线次数: 0, 习惯程度: '初次操控尚不熟悉' };

  // ── rpgField ──
  toon.rpgField = src.rpgField || {};

  // ── feeling → initialMetrics ──
  if (src.feeling) {
    toon.initialMetrics = {
      emotions: src.feeling.emotions || [],
      playerFeelings: src.feeling.playerFeelings || [],
    };
  } else {
    toon.initialMetrics = { emotions: [], playerFeelings: [] };
  }

  // ── roleCardFieldReasons (从源数据推导) ──
  toon.roleCardFieldReasons = buildRoleCardFieldReasons(src);

  // ── rpgFieldReasons (从源数据推导) ──
  toon.rpgFieldReasons = buildRpgFieldReasons(src);

  // ── 运行时元数据 ──
  toon.worldAttributes = { worldTag: worldValue, source: 'fallback', fields: [] };
  toon.roleCard = true;
  toon.roleCardSource = 'predefined';
  toon.roleCardUpdatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'T00:00:00.000Z');

  return toon;
}

// ── roleCardFieldReasons 生成 ──

function buildRoleCardFieldReasons(src) {
  const reasons = {};
  reasons['姓名'] = `${src.name}这个名字来自人物基础区的正式姓名。`;
  reasons['所属世界'] = `${src.name}生活在2026现代都市环境中，属于${src.worldTag?.value || '现实世界'}。`;
  reasons['身份'] = `${src.name}的身份由${src.role || '当前处境'}确定。`;
  reasons['职业'] = src.job ? `${src.name}的职业是${src.job}。` : `${src.name}目前仍为在校学生，无确认职业。`;
  reasons['性别'] = `${src.name}在家庭和学校中一直以${src.gender || '未记录'}性身份生活。`;
  reasons['生日'] = `${src.name}年龄约${src.age?.value || '未知'}岁。`;
  reasons['人际关系'] = src.relationships ? `${src.name}的人际关系：${src.relationships}。` : `${src.name}暂无明确人际关系记录。`;
  reasons['外貌'] = src.appearance ? `${src.name}的外貌：${src.appearance}` : `${src.name}外貌未详细记录。`;
  reasons['性格'] = src.personality ? `${src.name}的性格：${src.personality}` : `${src.name}性格未详细记录。`;
  reasons['人物说明'] = src.detail ? `${src.name}的说明：${src.detail}` : '';
  reasons['社群角色'] = `${src.name}在${(src.factions || [])[0]?.faction || '未知'}中是${(src.factions || [])[0]?.role || '未知'}。`;
  reasons['势力地位'] = `${src.name}是${(src.forcePositions || [])[0]?.position || '未知'}。`;
  return reasons;
}

// ── rpgFieldReasons 生成 ──

function buildRpgFieldReasons(src) {
  const name = src.name || '角色';
  const r = {};
  r['world_tag'] = `${name}的生活发生在${src.worldTag?.value || '现实世界'}中。`;
  r['age'] = `${name}年龄约${src.age?.value || '未知'}岁。`;
  r['level'] = `${name}的个人等级由当前生活经验确定。`;
  r['exp'] = `${name}的个人经验来自日常生活和社交。`;
  r['free_attribute_points'] = `${name}目前还没有经历足以改变能力结构的关键成长选择。`;
  r['level_growth'] = `${name}的成长会来自生活压力和社交变化。`;
  r['vitality'] = `${name}的生命力由当前健康状态决定。`;
  r['stamina_pool'] = `${name}的精力池由日常作息和性格共同决定。`;
  r['satiety'] = `${name}的饱食度来自稳定的日常生活状态。`;
  r['hydration'] = `${name}的水分状态来自基础生活保障。`;
  r['fatigue'] = `${name}的疲劳度由日常作息和情绪共同影响。`;
  r['learning_ability'] = `${name}的学习能力由${src.learningAbility?.reason || '生活经验'}决定。`;
  r['mental_stability'] = `${name}的精神稳定由${src.mentalStability?.reason || '性格和环境'}决定。`;
  r['growth_potential'] = `${name}的成长潜力由${src.growthPotential?.reason || '年龄和经历'}决定。`;
  r['action_ability'] = `${name}的行动能力由${src.actionAbility?.reason || '体能和生活经验'}决定。`;
  const ib = src.rpgField?.intrinsicBase || {};
  r['strength'] = ib.strength?.reason || `${name}力量基础值来自体态和训练。`;
  r['agility'] = ib.agility?.reason || `${name}敏捷基础值来自身体素质。`;
  r['constitution'] = ib.constitution?.reason || `${name}体质基础值来自健康状态。`;
  r['intelligence'] = ib.intelligence?.reason || `${name}智力基础值来自学业和思维。`;
  r['perception'] = ib.perception?.reason || `${name}感知基础值来自观察力和敏感度。`;
  r['willpower'] = ib.willpower?.reason || `${name}意志基础值来自抗压能力。`;
  r['charisma'] = ib.charisma?.reason || `${name}魅力基础值来自外貌和社交能力。`;
  r['knowledge'] = `${name}知识储备来自${(src.knowledge || []).map((k) => k.name).join('、') || '日常学习'}。`;
  r['skills'] = `${name}技能由${(src.skills || []).map((s) => s.name).join('、') || '日常能力'}构成。`;
  r['professions'] = (src.professions || []).length
    ? `${name}职业方向包括${(src.professions || []).map((p) => p.name).join('、')}。`
    : `${name}无确认职业，职业项为空。`;
  r['factions'] = `${name}社群角色来自${(src.factions || []).map((f) => f.faction).join('、')}。`;
  r['force_positions'] = `${name}势力地位来自${(src.forcePositions || []).map((f) => f.force).join('、')}。`;
  r['equipment'] = `${name}装备来自${(src.equipment || []).map((e) => e.name).join('、') || '无'}。`;
  r['items'] = `${name}物品来自${(src.items || []).map((i) => i.name).join('、') || '无'}。`;
  r['wearing'] = `${name}的穿着来自日常装扮。`;
  r['status_tags'] = `${name}状态标签由身份和性格组成。`;
  r['control_experience'] = `${name}尚未经历玩家上线操控，体验记录保持初始。`;
  r['derived'] = `${name}攻防衍生由基础身体属性和现实规则推导。`;
  r['combat_simulation'] = `${name}战斗模拟基于普通现实个体的初始能力估算。`;
  return r;
}

// ── CLI 入口 ──

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('用法: node tools/json-to-toon.js <input.json>');
    console.error('输出: 同路径下生成 <input>.toon');
    process.exit(1);
  }

  const resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved)) {
    console.error(`文件不存在: ${resolved}`);
    process.exit(1);
  }

  const src = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
  const toon = convert(src);

  const outPath = resolved.replace(/\.json$/, '.toon');
  fs.writeFileSync(outPath, JSON.stringify(toon, null, 2) + '\n', 'utf-8');

  console.log(`✓ 已生成: ${outPath}`);
}

main();
