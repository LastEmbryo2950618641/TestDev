window.GameModules = window.GameModules || {};

window.GameModules.factionMembershipActions = {
  factionMembershipRows() {
    const faction = this.selectedFaction?.();
    if (!faction) return [];
    return window.GameModules.orgTerritory?.collectFactionMemberships?.(this, faction) || [];
  },

  syncAllCharacterMemberships() {
    const ot = window.GameModules.orgTerritory;
    ot?.ensurePresetFamilyMemberships?.(this);
    Object.values(this.rpgStates || {}).forEach((state) => ot?.syncCharacterOrgMemberships?.(state, this));
  },
};
