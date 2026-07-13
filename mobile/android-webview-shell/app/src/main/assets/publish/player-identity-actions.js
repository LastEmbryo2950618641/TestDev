window.GameModules = window.GameModules || {};
window.GameModules.playerIdentityActions = {
  syncPlayerSocialFields(state = null) {
    const current = state || this.playerIdentityState?.();
    if (!current?.profile) return false;
    const tool = window.GameModules.characterProfile;
    if (!tool?.memberships && !tool?.factionRoles) return false;
    const base = { ...this.playerCharacterBase(), ...(current.profile || {}) };
    const nextFactions = tool.factionRoles?.(current.profile, base, this) || (Array.isArray(current.profile.factions) ? current.profile.factions : []);
    const nextMemberships = tool.memberships?.(current.profile, base, this) || (Array.isArray(current.profile.memberships) ? current.profile.memberships : []);
    const prevProfileFactions = Array.isArray(current.profile.factions) ? current.profile.factions : [];
    const prevProfileMemberships = Array.isArray(current.profile.memberships) ? current.profile.memberships : [];
    const prevValueFactions = Array.isArray(current.values?.factions) ? current.values.factions : [];
    const prevValueMemberships = Array.isArray(current.values?.memberships) ? current.values.memberships : [];
    const changed = JSON.stringify(prevProfileFactions) !== JSON.stringify(nextFactions)
      || JSON.stringify(prevProfileMemberships) !== JSON.stringify(nextMemberships)
      || JSON.stringify(prevValueFactions) !== JSON.stringify(nextFactions)
      || JSON.stringify(prevValueMemberships) !== JSON.stringify(nextMemberships);
    if (!changed) return false;
    current.profile.factions = nextFactions;
    current.profile.memberships = nextMemberships;
    current.values = current.values || {};
    current.values.factions = nextFactions;
    current.values.memberships = nextMemberships;
    window.GameModules.orgTerritory?.syncCharacterOrgMemberships?.(current, this);
    return true;
  },

  backfillPlayerMemberships(state = null) {
    return this.syncPlayerSocialFields?.(state) || false;
  },

  backfillPlayerFactions(state = null) {
    return this.syncPlayerSocialFields?.(state) || false;
  },

  playerCharacterBase() {
    const p = this.playerProfile || {};
    const world = window.GameModules.realWorld2026 || {};
    const name = p.name || this.playerName || 'player-self';
    const city = p.refinedCity || p.city || world.defaults?.city || 'unknown-city';
    const role = p.refinedRole || p.dailyRole || world.defaults?.dailyRole || 'city-resident';
    const living = p.refinedLivingStatus || p.livingStatus || world.defaults?.livingStatus || 'unknown-living-status';
    const parents = p.parentStatus || p.parents || 'unknown-parent-status';
    const workplace = p.workplace || window.GameModules.socialPosition?.workplace(role, city) || city;
    const position = p.position || window.GameModules.socialPosition?.position(role) || living;
    const deathCause = p.parentDeathCause || 'unknown-parent-death-cause';
    const relations = p.relationships || 'relationships not filled yet';
    const notes = [p.worldbuildingNote, p.notes].filter(Boolean).join(' | ') || 'no extra notes';
    return {
      id: 'player-self',
      name,
      age: p.age || '',
      birthday: p.birthday || '',
      gender: p.gender || '',
      work: world.label || '2026 real-world',
      role,
      job: role,
      rank: position,
      faction: workplace,
      city,
      workplace,
      position,
      importance: 'main',
      isPlayer: true,
      items: p.items || [],
      wearing: p.wearing || [],
      detail: 'gender: ' + (p.gender || 'unknown') + '; age: ' + (p.age || 'unknown') + '; birthday: ' + (p.birthday || 'unknown') + '; city: ' + city + '; workplace: ' + workplace + '; position: ' + position + '; living: ' + living + '; parents: ' + parents + '; death cause: ' + deathCause + '; relations: ' + relations + '; notes: ' + notes,
      personality: notes,
      skills: [
        { name: 'mobile-operation', desc: 'Can use a smartphone for communication, search, shooting, settings, app switching, and information handling.', reason: 'Granted by phone setup and real-world app entry flow.' },
        { name: 'real-world-observation', desc: 'Can judge the current situation from environmental changes and reactions of others.', reason: 'Needed for real-world identity and environment interaction.' }
      ]
    };
  },

  playerDisplayCharacter() {
    const saved = this.playerIdentityState?.()?.profile;
    if (saved?.roleCard) return saved;
    return { ...this.playerCharacterBase(), name: this.playerName || this.playerProfile?.name || 'player-self', pendingAiProfile: true };
  },

  playerCharacter() {
    const saved = this.playerIdentityState?.()?.profile;
    if (!saved?.roleCard) throw new Error('player profile has not been generated yet');
    window.GameModules.characterProfile.requireRpgFieldReasons(saved, saved.worldAttributes, saved.name || 'player-self');
    return saved;
  },

  playerIdentityState() { return this.rpgStates['player-self'] || null; },
  identityTargetState() { return this.rpgStates[this.identityTargetId || 'player-self'] || null; },
  identityTargetProfile() {
    const id = this.identityTargetId || 'player-self';
    if (id === 'player-self') return this.playerDisplayCharacter();
    return this.identityTargetState()?.profile || (id === this.character.id ? this.character : { name: 'unknown-character', work: 'unknown-world', role: 'unknown-role', detail: 'no role card yet', personality: '', pendingAiProfile: true });
  },

  essentialPreferenceLayersForState(state = null) {
    try {
      const prefTool = window.GameModules.playerAspirationPreferenceLayers;
      if (!prefTool) return null;
      const resolved = state || this.identityTargetState();
      const id = resolved?.id || this.identityTargetId || 'player-self';
      if (id === 'player-self') {
        const fromAspiration = this.playerAspiration?.essentialPreferenceLayers || prefTool.buildFromPlayerAspiration?.(this.playerAspiration);
        if (fromAspiration?.layer1) return prefTool.normalizeLayers(fromAspiration);
        const profile = resolved?.profile;
        if (profile) return prefTool.ensureOnProfile(profile);
        return null;
      }
      const profile = resolved?.profile || (id === (this.identityTargetId || '') ? this.identityTargetProfile() : null);
      if (!profile || typeof profile !== 'object') return null;
      return prefTool.ensureOnProfile(profile);
    } catch (err) {
      console.warn('[identity] essential preference layers unavailable:', err?.message || err);
      return null;
    }
  },

  essentialPreferenceViewFromPlayerAspiration(view = null) {
    const data = view || this.playerAspirationView?.();
    if (!data) return null;
    return {
      alignmentLabel: data.alignmentLabel,
      rationality: data.rationality,
      rationalityLabel: data.rationalityLabel,
      axes: data.axes || [],
      guiltLines: data.guiltLines || [],
      psychGroups: (data.psychCategories || []).flatMap((category) => category.groups || []),
      footnote: 'Built from life-orientation choices and locked after role-card generation.'
    };
  }
};
