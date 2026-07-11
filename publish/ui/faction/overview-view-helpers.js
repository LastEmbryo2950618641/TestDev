window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.faction = window.GameModules.ui.faction || {};

window.GameModules.ui.faction.overviewViewHelpers = {
  fieldLabel(panelKey = '', fieldKey = '', faction = null) {
    const meta = this.factionOverviewModeMeta(faction);
    if (panelKey === 'ideology') return meta.ideologyLabels?.[fieldKey] || fieldKey;
    return fieldKey;
  },

  entryValue(entry = {}) {
    const raw = entry?.value;
    if (typeof raw === 'number') return `${raw}${entry?.unit || ''}`;
    const text = String(raw ?? '').trim();
    return `${text}${entry?.unit || ''}`.trim();
  },

  panelSkin(panelKey = '') {
    const map = {
      ideology: { icon: '', tone: 'gold', entryIcons: { core: '', reason: '', description: '', base: '', legitimacy: '' } },
      economy: { icon: '', tone: 'green', entryIcons: {} },
      politics: { icon: '', tone: 'blue', entryIcons: {} },
      military: { icon: '', tone: 'red', entryIcons: {} },
      diplomacy: { icon: '', tone: 'cyan', entryIcons: {} },
    };
    return map[panelKey] || { icon: '', tone: 'blue', entryIcons: {} };
  },

  panelMeter(panelKey = '', entries = [], faction = null) {
    if (panelKey === 'ideology') {
      const value = Number(faction?.solid?.overviewPanels?.ideology?.legitimacy?.value);
      if (Number.isFinite(value)) return Math.max(0, Math.min(100, value));
    }
    return Math.max(0, Math.min(100, entries.length * 28));
  },

  rankLabel(meter = 0, count = 0) {
    if (!count) return '未展开';
    if (meter >= 75) return '核心态势稳固';
    if (meter >= 45) return '已形成可观测态势';
    return '初步确立';
  },

  effectiveCount(panelKey = '', entries = []) {
    if (panelKey !== 'ideology') return entries.length;
    return entries.filter((entry) => String(entry?.name || '') !== 'legitimacy').length;
  },

  roleText(roles = []) {
    return this.normalizeFactionRoles(roles).map((role) => `${role.title}（${(role.characters || ['未知']).join('、')}）`).join('；') || '职位未记录';
  },

  roleNodeSubtitle(role = {}) {
    return `角色：${(role.characters || ['未知']).join('、')}`;
  },

  roleNode(role = {}, index = 0, roleIndex = 0) {
    return {
      key: `r-${index}-${roleIndex}-${role.title}`,
      name: role.title,
      roles: this.roleNodeSubtitle(role),
    };
  },

  structureNodeName(node = {}) {
    return String(node?.name || '').trim() || '未命名结构节点';
  },

  structureNodeEmptySummary() {
    return '该结构节点暂无职位记录';
  },

  structureNodeSummary(node = {}) {
    const roles = this.normalizeFactionRoles(node.roles);
    if (!roles.length) return this.structureNodeEmptySummary();
    return this.roleText(node.roles);
  },

  structureNode(node = {}, index = 0) {
    const roles = this.normalizeFactionRoles(node.roles);
    const name = this.structureNodeName(node);
    return {
      key: `s-${index}-${name}`,
      name,
      roles: this.structureNodeSummary(node),
      children: roles.map((role, roleIndex) => this.roleNode(role, index, roleIndex)),
    };
  },

  childFactionName(child = {}) {
    return String(child?.name || '').trim() || '未命名子势力';
  },

  childFactionSummary(child = {}) {
    return `${child.type || '子势力'}｜${child.level || 'L1'}`;
  },

  childFactionBadge(child = {}) {
    return this.childFactionSummary(child);
  },

  childFactionNode(child = {}) {
    return {
      key: `c-${child.id}`,
      name: this.childFactionName(child),
      roles: this.childFactionBadge(child),
      children: [],
    };
  },

  orgNodes() {
    const faction = this.selectedFaction?.();
    const nodes = (faction?.structure || []).map((node, index) => this.structureNode(node, index));
    const children = this.factionChildren(faction?.id).map((child) => this.childFactionNode(child));
    return [...nodes, ...children];
  },

  parentFallbackLabel(kind = '') {
    if (kind === 'independent') return '独立组织';
    if (kind === 'unknown') return '未知势力';
    return '无势力归属';
  },

  parentName(faction = null) {
    const factions = Array.isArray(this.factionState?.factions) ? this.factionState.factions : [];
    const forest = window.GameModules.factionOrgForest;
    const affiliated = forest?.resolveAffiliatedFaction?.(faction, factions);
    if (forest) {
      if (affiliated?.name) return affiliated.name;
      if (!faction?.parentId) return this.parentFallbackLabel();
      if (faction?.foundingType === 'independent') return this.parentFallbackLabel('independent');
      return this.parentFallbackLabel();
    }
    if (!faction?.parentId) return this.parentFallbackLabel();
    return factions.find((x) => x.id === faction.parentId)?.name || faction.parentName || this.parentFallbackLabel('unknown');
  },

  detailDescription(faction = null) {
    const current = faction || this.selectedFaction?.();
    return String(current?.description || '').trim() || this.stubNotice() || '暂无势力说明';
  },

  affiliatedLabel() {
    const faction = this.selectedFaction?.();
    if (!faction) return '';
    return window.GameModules.factionOrgForest?.affiliatedFactionLabel?.(faction, this.factionState?.factions || []) || '';
  },



  orgChartTitle() {
    const name = this.selectedFaction?.()?.name || '未命名势力';
    return `${name} 组织结构图`;
  },

  orgChartDescription() {
    return this.factionOrgChartMode?.() === 'forest'
      ? '按势力森林展示域根、归属链和已揭示组织节点。'
      : '展示当前势力的内部结构、职位与下级势力。';
  },

  orgChartBreadcrumb() {
    if (this.factionOrgChartMode?.() === 'forest') {
      return this.factionState?.forestData?.breadcrumb || this.factionForestViewportTitle?.() || '';
    }
    return this.factionState?.orgBreadcrumb || this.selectedFaction?.()?.name || '';
  },

  orgChartEmptyText() {
    return '暂无组织节点；等待 AI 推演确立部门、职位或归属关系。';
  },
  listRow(faction = {}) {
    const name = String(faction?.name || '').trim() || '未命名势力';
    const type = String(faction?.type || '').trim() || '势力';
    const level = String(faction?.level || '').trim() || '层级未知';
    return {
      id: faction?.id || name,
      name,
      subtitle: `${type}｜${level}｜归属：${this.parentName(faction)}`,
      actionText: '点击查看详情',
    };
  },
  tagList(faction = null) {
    const current = faction || this.selectedFaction?.();
    if (!current) return [];
    const tags = [
      current.maturityLabel || '社群',
      current.type || '势力',
      current.level || '层级未知',
    ];
    const status = this.selectedFactionStatusLabel?.();
    const resolution = this.selectedFactionResolutionBadge?.();
    if (status) tags.push(status);
    if (resolution) tags.push(resolution);
    tags.push(`归属：${this.parentName(current)}`);
    return tags.filter((text) => String(text || '').trim()).map((text, index) => ({
      key: `tag-${index}-${text}`,
      text,
    }));
  },

  structureRoleLine(role = {}) {
    const count = Number.isFinite(Number(role?.count)) ? Number(role.count) : 0;
    const preview = this.factionRolePreview?.(role) || '';
    return `数量:${count}｜角色:${preview}`;
  },

  structureRoleRows(node = {}) {
    return (Array.isArray(node?.roles) ? node.roles : []).map((role) => ({
      key: role.title || `${role.count || 0}`,
      title: role.title || '未命名职位',
      line: this.structureRoleLine(role),
      role,
      canExpand: !!(role && this.factionRoleOverflow?.(role)),
    }));
  },

  structureEmptyText() {
    return '暂无结构，可点击初始化/全量检视势力生成。';
  },

  relationChipRows(faction = null) {
    const current = faction || this.selectedFaction?.();
    if (!current) return [];
    const rows = [];
    (current.rules || []).forEach((rule, index) => {
      const text = String(rule || '').trim();
      if (!text) return;
      rows.push({ key: `rule-${index}-${text}`, text: `律令｜${text}` });
    });
    (current.resources || []).forEach((resource, index) => {
      const text = String(resource || '').trim();
      if (!text) return;
      rows.push({ key: `resource-${index}-${text}`, text: `资源｜${text}` });
    });
    this.factionChildren(current.id).forEach((child, index) => {
      const text = this.childFactionName(child);
      rows.push({ key: `child-${index}-${child.id || text}`, text: `下级｜${text}` });
    });
    return rows;
  },

  relationChipEmptyText() {
    return '暂无已揭示条目';
  },

  relationSectionView() {
    return {
      title: '规则 / 资源 / 下级势力',
      rows: this.relationChipRows(),
      emptyText: this.relationChipEmptyText(),
    };
  },

  changeLogRows(faction = null) {
    const current = faction || this.selectedFaction?.();
    return (Array.isArray(current?.changeLog) ? current.changeLog : [])
      .filter(Boolean)
      .slice(0, 12)
      .map((log, index) => ({
        key: `${index}-${log.at || 'unknown'}-${log.field || 'field'}-${log.action || 'change'}`,
        title: `${log.action || 'change'}:${log.field || 'unknown'}`,
        reason: log.reason || '已记录调整。',
      }));
  },

  changeLogEmptyText() {
    return '暂无调整记录。';
  },

  changeLogSectionView() {
    return {
      title: '调整/新增记录',
      rows: this.changeLogRows(),
      emptyText: this.changeLogEmptyText(),
    };
  },

  archiveCountLabel(faction = null) {
    const current = faction || this.selectedFaction?.();
    const count = this.factionArchiveDocs(current).length;
    return `档案：${count}`;
  },

  archiveParagraphRows(doc = null) {
    const current = doc || this.selectedFactionArchiveDoc?.();
    return (Array.isArray(current?.paragraphs) ? current.paragraphs : []).map((item) => ({
      key: `${item.at || 'unknown'}-${item.text || ''}`,
      time: this.factionArchiveParagraphTime(item),
      text: item.text || '',
    }));
  },

  archiveListRows(faction = null) {
    const current = faction || this.selectedFaction?.();
    return this.factionArchiveDocs(current).map((doc) => ({
      key: doc.archiveKey,
      archiveKey: doc.archiveKey,
      title: doc.title || '未命名档案',      meta: this.factionArchiveDocMeta(doc),
      actionLabel: '展开卷宗',
    }));
  },

  archiveEmptyText() {
    return '该势力暂无档案。现实推演或微信对话涉及该势力后，会自动写入这里。';
  },

  archiveSectionView() {
    const doc = this.selectedFactionArchiveDoc?.();
    return {
      title: '资料库',
      countLabel: this.archiveCountLabel(),
      detailOpen: !!doc,
      detail: doc ? {
        title: doc.title || '未命名档案',
        meta: this.factionArchiveDocMeta(doc),
        rows: this.archiveParagraphRows(doc),
        backLabel: '返回档案列表',
      } : null,
      list: {
        rows: this.archiveListRows(),
        emptyText: this.archiveEmptyText(),
      },
    };
  },

  consistencyNotice() {
    const report = this.orgTerritoryConsistency;
    if (!report || report.dismissed) return '';
    const lines = [];
    const failed = Object.entries(report.compliance?.checks || {}).filter(([, ok]) => ok === false).map(([key]) => key);
    if (failed.length) lines.push(`原则合规未通过：${failed.join('、')}`);
    lines.push(...(report.fixes || []), ...(report.warnings || []));
    if (!lines.length) return '';
    const preview = lines.slice(0, 4).join('；');
    return lines.length > 4 ? `存档一致性：${preview}……（共 ${lines.length} 条）` : `存档一致性：${preview}`;
  },

  reconciliationText(entry = {}) {
    const kind = String(entry?.kind || '').trim();
    const at = String(entry?.at || '').slice(0, 19).replace('T', ' ');
    if (kind === 'territory-control-dedupe') {
      return `${at} 控势去重 · ${entry.location || '—'} · 保留 ${entry.keptSummary || '—'}，丢弃 ${entry.droppedSummary || '—'}`;
    }
    if (kind === 'story-world-skip') {
      return `${at} 异世界跳过 · ${entry.count || 0} 条（${entry.types || ''}）`;
    }
    if (kind === 'settlement-truncated') {
      return `${at} 结算截断 · 保留 ${entry.kept || 0} 丢弃 ${entry.dropped || 0}`;
    }
    return `${at} ${kind || '记录'}`;
  },

  stubDescription({ isTopCountry = false } = {}) {
    return isTopCountry
      ? '由现实世界法域推断建立的国家级 L1 stub，待 AI 与推演补全。'
      : '由角色卡人事归属确认建立的组织级 L1 stub，待 AI 与推演补全。';
  },

  stubNotice() {
    const faction = this.selectedFaction?.();
    if (!faction) return '';
    const resolution = String(faction.resolution || 'L1').toUpperCase();
    if (resolution === 'L1' && !(faction.structure || []).length) return '尚未接触，无法审计结构；仅显示 stub。';
    return '';
  },

  selectedFactionOverviewView() {
    const faction = this.selectedFaction?.();
    if (!faction) return null;
    const meta = this.factionOverviewModeMeta(faction);
    return {
      title: faction.name || '未命名势力',
      description: faction.description || '',
      maturityLabel: faction.maturityLabel || '社群',
      typeLabel: faction.type || '势力',
      levelLabel: faction.level || '层级未知',
      statusLabel: this.selectedFactionStatusLabel?.() || '',
      resolutionBadge: this.selectedFactionResolutionBadge?.() || '',
      parentLabel: '归属：' + this.parentName(faction),
      summaryTitle: '势力总览',
      summaryEyebrow: meta.eyebrow || '',
      summaryText: this.selectedFactionOverviewSummary?.() || '',
      overviewTitle: '战略态势图',
      overviewEyebrow: 'OVERVIEW PANELS',
      overviewCards: this.factionCapabilityCards?.() || [],
    };
  },

  structureCardRows() {
    return (this.factionStructureCards?.() || []).map((node) => ({
      key: node.key,
      name: node.name || '未命名节点',
      level: node.level || '',
      roles: this.structureRoleRows(node),
    }));
  },

  structureSectionView() {
    return {
      title: '组织结构',
      actionLabel: '打开树状图',
      notice: this.stubNotice() || '结构是已固化的组织骨架；未推演的职责、角色和下级会保持迷雾。',
      cards: this.structureCardRows(),
      emptyText: this.structureEmptyText(),
      expandLabel: '查看全部',
    };
  },
};



