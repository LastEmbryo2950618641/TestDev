window.GameModules = window.GameModules || {};

window.GameModules.factionOrgActions = {
  normalizeFactionStructure(faction = {}) {
    faction.structure = (faction.structure || []).map((node) => {
      const legacy = ['角色卡势力地位', '已确认职位', '国家法定身份'].includes(node.name);
      const name = legacy ? this.factionPositionNodeName(faction) : (node.organizationName || node.orgName || node.name || faction.name);
      const level = node.level || node.rank || this.factionNodeLevel(faction, node.name);
      return { ...node, name, level, roles: this.normalizeFactionRoles(node.roles) };
    });
    return faction;
  },

  factionNodeLevel(faction = {}, nodeName = '') {
    if (nodeName === '国家法定身份') return '国家法定身份';
    if (String(nodeName).includes('中央')) return '中央级别';
    if (String(nodeName).includes('地方')) return '地方级别';
    return faction.level || '组织级别';
  },

  factionPositionNodeName(faction = {}) {
    return faction.name || '未命名组织';
  },

  normalizeFactionRoles(roles = []) {
    return (Array.isArray(roles) ? roles : []).map((role) => {
      if (typeof role === 'string') return this.decorateFactionRole({ title: role, count: '未知', characters: ['未知'] });
      const title = String(role?.title || role?.name || role?.position || '未命名职位').trim();
      const chars = Array.isArray(role?.characters) ? role.characters : (role?.character ? [role.character] : []);
      const characters = chars.map(String).filter(Boolean).length ? chars.map(String).filter(Boolean) : ['未知'];
      const count = role?.count ?? role?.quantity ?? role?.number ?? (characters.includes('未知') ? '未知' : characters.length);
      return this.decorateFactionRole({ ...role, title, count, characters });
    });
  },

  decorateFactionRole(role = {}) {
    const characters = Array.isArray(role.characters) && role.characters.length ? role.characters : ['未知'];
    return { ...role, characters, preview: this.factionRolePreviewText(characters), overflow: characters.length > 4 };
  },

  factionRolePreviewText(characters = []) {
    return characters.slice(0, 4).join('、') + (characters.length > 4 ? '……' : '');
  },

  factionRoleText(roles = []) {
    return this.normalizeFactionRoles(roles).map((role) => `${role.title}｜数量:${role.count}｜角色:${role.preview}`).join('；') || '职位未记录';
  },

  refreshFactionOrgCache() {
    if (!this.factionState) return;
    const faction = this.selectedFaction();
    this.factionState.orgCacheSelectedId = faction?.id || '';
    this.factionState.structureCards = this.buildFactionStructureCards(faction);
    this.factionState.orgNodes = this.buildFactionOrgNodes(faction, this.factionState.structureCards);
  },

  buildFactionStructureCards(faction = this.selectedFaction()) {
    return (faction?.structure || []).map((node, index) => ({ key: `node-${index}-${node.name}`, name: node.name, level: node.level || this.factionNodeLevel(faction, node.name), roles: this.normalizeFactionRoles(node.roles) }));
  },

  factionStructureCards() {
    const faction = this.selectedFaction();
    if (this.factionState?.orgCacheSelectedId === faction?.id && this.factionState?.structureCards) return this.factionState.structureCards;
    return this.buildFactionStructureCards(faction);
  },

  factionRolePreview(role = {}) {
    return role.preview || this.factionRolePreviewText(Array.isArray(role.characters) && role.characters.length ? role.characters : ['未知']);
  },

  factionRoleOverflow(role = {}) {
    return Boolean(role.overflow ?? ((Array.isArray(role.characters) ? role.characters : []).length > 4));
  },

  openFactionRoleDialog(role = {}) {
    const normalized = this.normalizeFactionRoles([role])[0] || { title: '未命名职位', count: '未知', characters: ['未知'] };
    this.factionState.roleDialogOpen = true;
    this.factionState.roleDialog = normalized;
  },

  closeFactionRoleDialog() {
    if (!this.factionState) return;
    this.factionState.roleDialogOpen = false;
    this.factionState.roleDialog = null;
  },

  buildFactionOrgNodes(faction = this.selectedFaction(), cards = this.buildFactionStructureCards(faction)) {
    const nodes = cards.map((node) => ({
      key: node.key,
      name: node.name,
      roles: node.level,
      children: node.roles.map((role, roleIndex) => ({ key: `${node.key}-role-${roleIndex}`, name: role.title, roles: `数量:${role.count}｜角色:${role.preview}`, role })),
    }));
    const children = this.factionChildren(faction?.id).map((child) => ({ key: `c-${child.id}`, name: child.name, roles: child.level || `${child.type}级别`, children: [] }));
    return [...nodes, ...children];
  },

  factionOrgNodes() {
    const faction = this.selectedFaction();
    if (this.factionState?.orgCacheSelectedId === faction?.id && this.factionState?.orgNodes) return this.factionState.orgNodes;
    return this.buildFactionOrgNodes(faction);
  },
};
