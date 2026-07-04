import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publish = path.join(root, 'publish');

function readUtf8(file) {
  return fs.readFileSync(file, 'utf8');
}

function writeUtf8(file, content) {
  fs.writeFileSync(file, content, 'utf8');
}

function extractSection(content, startMarker, endMarker) {
  const start = content.indexOf(startMarker);
  if (start < 0) throw new Error(`Missing start marker: ${startMarker}`);
  const end = content.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`Missing end marker: ${endMarker}`);
  return content.slice(start, end);
}

function patchGameCore() {
  const file = path.join(publish, '__game-core.js');
  let core = readUtf8(file);
  const forest = readUtf8(path.join(publish, 'faction-org-forest.js'));
  const orgActions = readUtf8(path.join(publish, 'faction-org-actions.js'));

  const forestBlock = `\n;// ---- faction-org-forest.js ----\n${forest.trim()}\n\n`;
  const orgActionsBlock = `\n;// ---- faction-org-actions.js ----\n${orgActions.trim()}\n\n`;

  const orgActionsStart = ';// ---- faction-org-actions.js ----';
  const membershipStart = ';// ---- faction-membership-actions.js ----';
  if (!core.includes(orgActionsStart)) throw new Error('faction-org-actions marker missing in __game-core.js');
  if (!core.includes(';// ---- faction-org-forest.js ----')) {
    const idx = core.indexOf(orgActionsStart);
    core = core.slice(0, idx) + forestBlock + core.slice(idx);
  } else {
    const forestStart = core.indexOf(';// ---- faction-org-forest.js ----');
    const forestEnd = core.indexOf(orgActionsStart, forestStart);
    core = core.slice(0, forestStart) + forestBlock.trimEnd() + '\n\n' + core.slice(forestEnd);
  }

  const start = core.indexOf(orgActionsStart);
  const end = core.indexOf(membershipStart, start);
  core = core.slice(0, start) + orgActionsBlock.trimEnd() + '\n\n' + core.slice(end);

  core = core.replace(
    "return { open: false, detailOpen: false, orgChartOpen: false, generating: false, error: '', requestId: 0, selectedId: company.id, customPrompt: '', showAllStubs: false, factions: [country, company] };",
    "return { open: false, detailOpen: false, orgChartOpen: false, orgChartMode: 'forest', forestTab: 'corp', generating: false, error: '', requestId: 0, selectedId: company.id, customPrompt: '', showAllStubs: false, factions: [country, company] };",
  );

  core = core.replace(
    `      id: top.id, name: top.name, type: '国家', parentId: '', parentName: '无势力归属', level: '国家级',`,
    `      id: top.id, name: top.name, type: '国家', orgDomain: 'country', sovereign: true, parentId: '', parentName: '无势力归属', level: '国家级',`,
  );

  const oldCompanyFaction = `  companyFaction(profile = {}, country = null) {
    const name = profile.workplace || '成都星河云栈科技有限公司';
    const parent = country || this.countryFaction(profile);
    return {
      id: 'company-main', name, type: /工作室|studio/i.test(name) ? '工作室' : '公司', parentId: parent.id, parentName: parent.name, level: '公司级',
      location: profile.refinedCity || profile.city || '现实城市未登记', domain: '现代服务业', scale: '中小型', stance: '雇佣与经营', influence: 35,
      description: '玩家当前工作或默认关联的公司势力，归属于主角/玩家所在最高国家级势力。',
      resolution: 'L1',
      stub: { oneLine: \`\${name}（公司 stub，内部架构待推演固化）\` },
      status: 'active',
      solid: { capabilities: { political: { entries: [] }, economic: { entries: [] }, asset: { entries: [] }, military: { entries: [] } } },
      structure: [], rules: ['内部组织结构由AI按现实合理性生成后固化。'], resources: ['雇佣关系', '薪酬制度', '工作任务'], relations: [], fieldReasons: this.defaultReasons('当前公司上下文初始化字段，后续由AI全量检视补全理由与组织构成。'), fixed: true, updatedAt: new Date().toISOString(),
    };
  },`;

  const newCompanyFaction = `  companyFaction(profile = {}, country = null) {
    const name = profile.workplace || '成都星河云栈科技有限公司';
    const parentCountry = country || this.countryFaction(profile);
    const forest = window.GameModules.factionOrgForest;
    const corpParentId = forest?.domainRootId?.(parentCountry.id, 'corp') || parentCountry.id;
    const corpParentName = forest?.DOMAIN_LABELS?.corp || '经济组织';
    return {
      id: 'company-main', name, type: /工作室|studio/i.test(name) ? '工作室' : '公司', orgDomain: 'corp', ownership: 'private', foundingType: 'independent', parentId: corpParentId, parentName: corpParentName, level: '公司级',
      location: profile.refinedCity || profile.city || '现实城市未登记', domain: '现代服务业', scale: '中小型', stance: '雇佣与经营', influence: 35,
      description: '玩家当前工作或默认关联的公司势力，挂接于视窗根下的经济组织域根。',
      resolution: 'L1',
      stub: { oneLine: \`\${name}（公司 stub，内部架构待推演固化）\` },
      status: 'active',
      solid: { capabilities: { political: { entries: [] }, economic: { entries: [] }, asset: { entries: [] }, military: { entries: [] } } },
      structure: [], rules: ['内部组织结构由AI按现实合理性生成后固化。'], resources: ['雇佣关系', '薪酬制度', '工作任务'], relations: [], fieldReasons: this.defaultReasons('当前公司上下文初始化字段，后续由AI全量检视补全理由与组织构成。'), fixed: true, updatedAt: new Date().toISOString(),
    };
  },`;

  if (!core.includes(oldCompanyFaction)) throw new Error('companyFaction block not found');
  core = core.replace(oldCompanyFaction, newCompanyFaction);

  core = core.replace(
    `    this.syncAllCharacterMemberships?.();
    window.GameModules.orgTerritory?.validateWorldConsistency?.(this);`,
    `    window.GameModules.factionOrgForest?.migrateFactionForest?.(this);
    this.syncAllCharacterMemberships?.();
    window.GameModules.orgTerritory?.validateWorldConsistency?.(this);`,
  );

  const oldSyncCompany = `  syncCompanyFaction() {
    if (!this.factionState) return;
    const c = this.currentCompany?.() || this.companyState?.companies?.[0];
    if (!c) return;
    const item = this.factionState.factions.find((x) => x.id === 'company-main');
    if (!item) return;
    const expectedTop = window.GameModules.factionSystem.countryFaction(this.playerProfile || {});
    const top = this.factionState.factions.find((x) => x.id === expectedTop.id || x.name === expectedTop.name) || this.factionState.factions.find((x) => x.type === '国家' && !x.parentId) || expectedTop;
    const updates = { name: c.name, type: c.type || item.type, location: c.location || item.location, domain: c.industry || item.domain, parentId: top.id, parentName: top.name };
    const changed = Object.keys(updates).filter((key) => updates[key] !== item[key]);
    Object.assign(item, updates);
    if (changed.length) item.changeLog = [{ field: changed.join('、'), reason: '根据当前公司系统上下文同步公司势力基础字段。', at: new Date().toISOString(), action: 'adjust' }, ...(item.changeLog || [])];
    item.fieldReasons = this.completeFactionReasons?.(item, item.fieldReasons, '根据当前公司系统上下文同步并固化。') || item.fieldReasons || {};
  },`;

  const newSyncCompany = `  syncCompanyFaction() {
    if (!this.factionState) return;
    const c = this.currentCompany?.() || this.companyState?.companies?.[0];
    if (!c) return;
    const item = this.factionState.factions.find((x) => x.id === 'company-main');
    if (!item) return;
    const expectedTop = window.GameModules.factionSystem.countryFaction(this.playerProfile || {});
    const top = this.factionState.factions.find((x) => x.id === expectedTop.id || x.name === expectedTop.name) || this.factionState.factions.find((x) => x.type === '国家' && !x.parentId) || expectedTop;
    const forest = window.GameModules.factionOrgForest;
    const corpRootId = forest?.domainRootId?.(top.id, 'corp') || top.id;
    const corpRoot = this.factionState.factions.find((x) => x.id === corpRootId);
    const updates = {
      name: c.name,
      type: c.type || item.type,
      location: c.location || item.location,
      domain: c.industry || item.domain,
      orgDomain: 'corp',
      ownership: item.ownership || 'private',
      foundingType: item.foundingType || 'independent',
      parentId: corpRootId,
      parentName: corpRoot?.name || forest?.DOMAIN_LABELS?.corp || '经济组织',
    };
    const changed = Object.keys(updates).filter((key) => updates[key] !== item[key]);
    Object.assign(item, updates);
    if (changed.length) item.changeLog = [{ field: changed.join('、'), reason: '根据当前公司系统上下文同步公司势力基础字段。', at: new Date().toISOString(), action: 'adjust' }, ...(item.changeLog || [])];
    item.fieldReasons = this.completeFactionReasons?.(item, item.fieldReasons, '根据当前公司系统上下文同步并固化。') || item.fieldReasons || {};
  },`;

  if (!core.includes(oldSyncCompany)) throw new Error('syncCompanyFaction block not found');
  core = core.replace(oldSyncCompany, newSyncCompany);

  core = core.replace(
    `  openFactionOrgChart() {
    if (!this.factionState) this.initFactionSystem();
    if (!this.factionState.orgChartMode) this.factionState.orgChartMode = 'forest';
    if (!this.factionState.forestTab) this.factionState.forestTab = 'corp';
    this.refreshFactionOrgCache?.();
    this.factionState.orgChartOpen = true;
  },

  closeFactionOrgChart() {
    if (this.factionState) this.factionState.orgChartOpen = false;
  },

  factionRoleText(roles = []) {
    return this.normalizeFactionRoles(roles).map((role) => \`\${role.title}：\${(role.characters || ['未知']).join('、')}\`).join('；') || '职位未记录';
  },

  factionOrgNodes() {
    const faction = this.selectedFaction();
    const nodes = (faction?.structure || []).map((node, index) => ({
      key: \`s-\${index}-\${node.name}\`,
      name: node.name,
      roles: this.factionRoleText(node.roles),
      children: this.normalizeFactionRoles(node.roles).map((role, roleIndex) => ({ key: \`r-\${index}-\${roleIndex}-\${role.title}\`, name: role.title, roles: \`角色：\${(role.characters || ['未知']).join('、')}\` })),
    }));
    const children = this.factionChildren(faction?.id).map((child) => ({ key: \`c-\${child.id}\`, name: child.name, roles: \`\${child.type}｜\${child.level}\`, children: [] }));
    return [...nodes, ...children];
  },`,
    `  openFactionOrgChart() {
    return window.GameModules.factionOrgActions?.openFactionOrgChart?.call(this);
  },

  closeFactionOrgChart() {
    return window.GameModules.factionOrgActions?.closeFactionOrgChart?.call(this);
  },

  factionRoleText(roles = []) {
    return window.GameModules.factionOrgActions?.factionRoleText?.call(this, roles)
      || this.normalizeFactionRoles(roles).map((role) => \`\${role.title}：\${(role.characters || ['未知']).join('、')}\`).join('；') || '职位未记录';
  },

  factionOrgNodes() {
    return window.GameModules.factionOrgActions?.factionOrgNodes?.call(this) || [];
  },

  factionOrgTreeRoot() {
    return window.GameModules.factionOrgActions?.factionOrgTreeRoot?.call(this) || null;
  },

  factionOrgTreeRows() {
    return window.GameModules.factionOrgActions?.factionOrgTreeRows?.call(this) || [];
  },

  refreshFactionOrgCache() {
    return window.GameModules.factionOrgActions?.refreshFactionOrgCache?.call(this);
  },

  forestDomainTabs() {
    return window.GameModules.factionOrgActions?.forestDomainTabs?.call(this) || [];
  },

  factionOrgChartMode() {
    return window.GameModules.factionOrgActions?.factionOrgChartMode?.call(this) || 'forest';
  },

  setFactionOrgChartMode(mode = 'forest') {
    return window.GameModules.factionOrgActions?.setFactionOrgChartMode?.call(this, mode);
  },

  setFactionForestTab(domain = 'corp') {
    return window.GameModules.factionOrgActions?.setFactionForestTab?.call(this, domain);
  },

  factionForestTab() {
    return window.GameModules.factionOrgActions?.factionForestTab?.call(this) || 'corp';
  },

  buildFactionOrgForest() {
    return window.GameModules.factionOrgActions?.buildFactionOrgForest?.call(this) || { viewportRoot: null, domains: [], activeTree: null };
  },

  factionForestDomains() {
    return window.GameModules.factionOrgActions?.factionForestDomains?.call(this) || [];
  },

  factionForestViewportTitle() {
    return window.GameModules.factionOrgActions?.factionForestViewportTitle?.call(this) || '';
  },

  factionOrgBreadcrumb() {
    return window.GameModules.factionOrgActions?.factionOrgBreadcrumb?.call(this) || '';
  },

  inferDefaultForestTab() {
    return window.GameModules.factionOrgActions?.inferDefaultForestTab?.call(this) || 'corp';
  },

  factionOrgNodeClass(node = {}) {
    return window.GameModules.factionOrgActions?.factionOrgNodeClass?.call(this, node) || 'faction-org-node';
  },

  factionStructureCards() {
    return window.GameModules.factionOrgActions?.factionStructureCards?.call(this) || [];
  },

  factionCapabilityCards() {
    return window.GameModules.factionOrgActions?.factionCapabilityCards?.call(this) || [];
  },`,
  );

  core = core.replace(
    `  factionParentName(faction) {
    if (!faction?.parentId) return '无势力归属';
    return this.factionState.factions.find((x) => x.id === faction.parentId)?.name || faction.parentName || '未知势力';
  },`,
    `  factionParentName(faction) {
    const forest = window.GameModules.factionOrgForest;
    const affiliated = forest?.resolveAffiliatedFaction?.(faction, this.factionState?.factions || []);
    if (forest) {
      if (affiliated?.name) return affiliated.name;
      if (!faction?.parentId) return '无势力归属';
      if (faction?.foundingType === 'independent') return '独立组织';
      return '无势力归属';
    }
    if (!faction?.parentId) return '无势力归属';
    return this.factionState.factions.find((x) => x.id === faction.parentId)?.name || faction.parentName || '未知势力';
  },

  selectedFactionAffiliatedLabel() {
    const faction = this.selectedFaction?.();
    if (!faction) return '';
    return window.GameModules.factionOrgForest?.affiliatedFactionLabel?.(faction, this.factionState?.factions || []) || '';
  },`,
  );

  core = core.replace(
    `      faction = this.normalizeFactionStructure?.({ id, name: company.name, type: company.type || '公司', parentId: top.id, parentName: top.name, level: '公司级别', location: company.location || '未知', domain: company.industry || '现代职场', scale: company.scale || '未知', stance: '现实职场势力', influence: 35, description: \`公司APP记录的现实公司：\${company.name}。\`, structure: [], rules: [], resources: [], relations: [], fixed: true, updatedAt: now }) || {};`,
    `      const forest = window.GameModules.factionOrgForest;
      const corpRootId = forest?.domainRootId?.(top.id, 'corp') || top.id;
      const corpRoot = this.factionState.factions.find((item) => item.id === corpRootId);
      faction = this.normalizeFactionStructure?.({ id, name: company.name, type: company.type || '公司', orgDomain: 'corp', ownership: 'private', foundingType: 'independent', parentId: corpRootId, parentName: corpRoot?.name || forest?.DOMAIN_LABELS?.corp || '经济组织', level: '公司级别', location: company.location || '未知', domain: company.industry || '现代职场', scale: company.scale || '未知', stance: '现实职场势力', influence: 35, description: \`公司APP记录的现实公司：\${company.name}。\`, structure: [], rules: [], resources: [], relations: [], fixed: true, updatedAt: now }) || {};`,
  );

  core = core.replace(
    `    Object.assign(faction, { name: company.name, type: company.type || faction.type || '公司', location: company.location || faction.location, domain: company.industry || faction.domain, scale: company.scale || faction.scale, parentId: top.id, parentName: top.name, updatedAt: now });`,
    `    const forestSync = window.GameModules.factionOrgForest;
    const corpRootIdSync = forestSync?.domainRootId?.(top.id, 'corp') || top.id;
    const corpRootSync = this.factionState.factions.find((item) => item.id === corpRootIdSync);
    Object.assign(faction, { name: company.name, type: company.type || faction.type || '公司', location: company.location || faction.location, domain: company.industry || faction.domain, scale: company.scale || faction.scale, orgDomain: faction.orgDomain || 'corp', ownership: faction.ownership || 'private', foundingType: faction.foundingType || 'independent', parentId: corpRootIdSync, parentName: corpRootSync?.name || forestSync?.DOMAIN_LABELS?.corp || '经济组织', updatedAt: now });`,
  );

  writeUtf8(file, core);
  console.log('Patched __game-core.js');
}

function patchChunkApps() {
  const core = readUtf8(path.join(publish, '__game-core.js'));
  const chunkFile = path.join(publish, '__chunk-apps.js');
  let chunk = readUtf8(chunkFile);

  const sections = [
    [';// ---- faction-system.js ----', ';// ---- faction-archive.js ----'],
    [';// ---- faction-org-forest.js ----', ';// ---- faction-org-actions.js ----'],
    [';// ---- faction-org-actions.js ----', ';// ---- faction-membership-actions.js ----'],
  ];

  for (const [start, end] of sections) {
    if (!core.includes(start)) continue;
    const replacement = extractSection(core, start, end);
    const chunkStart = chunk.indexOf(start);
    if (chunkStart < 0) {
      if (start.includes('faction-org-forest')) {
        const orgIdx = chunk.indexOf(';// ---- faction-org-actions.js ----');
        if (orgIdx >= 0) chunk = chunk.slice(0, orgIdx) + replacement + chunk.slice(orgIdx);
      }
      continue;
    }
    const chunkEnd = chunk.indexOf(end, chunkStart);
    if (chunkEnd < 0) throw new Error(`Chunk end missing for ${start}`);
    chunk = chunk.slice(0, chunkStart) + replacement + chunk.slice(chunkEnd);
  }

  const syncOld = `    const updates = { name: c.name, type: c.type || item.type, location: c.location || item.location, domain: c.industry || item.domain, parentId: top.id, parentName: top.name };`;
  const syncNew = `    const forest = window.GameModules.factionOrgForest;
    const corpRootId = forest?.domainRootId?.(top.id, 'corp') || top.id;
    const corpRoot = this.factionState.factions.find((x) => x.id === corpRootId);
    const updates = {
      name: c.name,
      type: c.type || item.type,
      location: c.location || item.location,
      domain: c.industry || item.domain,
      orgDomain: 'corp',
      ownership: item.ownership || 'private',
      foundingType: item.foundingType || 'independent',
      parentId: corpRootId,
      parentName: corpRoot?.name || forest?.DOMAIN_LABELS?.corp || '经济组织',
    };`;
  if (chunk.includes(syncOld)) chunk = chunk.replace(syncOld, syncNew);

  const parentOld = /factionParentName\(faction\) \{[\s\S]*?\n  \},/;
  const parentNew = `factionParentName(faction) {
    const forest = window.GameModules.factionOrgForest;
    const affiliated = forest?.resolveAffiliatedFaction?.(faction, this.factionState?.factions || []);
    if (forest) {
      if (affiliated?.name) return affiliated.name;
      if (!faction?.parentId) return '无势力归属';
      if (faction?.foundingType === 'independent') return '独立组织';
      return '无势力归属';
    }
    if (!faction?.parentId) return '无势力归属';
    return this.factionState.factions.find((x) => x.id === faction.parentId)?.name || faction.parentName || '未知势力';
  },

  selectedFactionAffiliatedLabel() {
    const faction = this.selectedFaction?.();
    if (!faction) return '';
    return window.GameModules.factionOrgForest?.affiliatedFactionLabel?.(faction, this.factionState?.factions || []) || '';
  },`;
  chunk = chunk.replace(parentOld, parentNew);

  writeUtf8(chunkFile, chunk);
  console.log('Restored faction sections in __chunk-apps.js from __game-core.js');
}

patchGameCore();
patchChunkApps();
