window.GameModules = window.GameModules || {};

window.GameModules.factionSystem = {
  /** Factions are AI-generated only; never seed country/company stubs from profile. */
  defaultState(profile = {}) {
    return {
      open: false,
      detailOpen: false,
      orgChartOpen: false,
      orgChartMode: 'forest',
      forestTab: 'corp',
      generating: false,
      error: '',
      requestId: 0,
      selectedId: '',
      customPrompt: '',
      showAllStubs: false,
      factions: [],
    };
  },

  realWorldTag() {
    return window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
  },

  profileWorldTag(profile = {}) {
    const raw = String(profile.worldTag?.value || profile.worldTag || profile.work || '').trim();
    const normalized = window.GameModules.characterQuery?.normalizeWorldTag?.(raw);
    return String(normalized || raw).trim();
  },

  isRealWorldProfile(profile = {}) {
    const worldTag = this.profileWorldTag(profile);
    if (!worldTag) return false;
    return Boolean(
      window.GameModules.characterQuery?.isRealWorldTag?.(worldTag)
      || ['现实世界', '现代都市现实世界', this.realWorldTag()].includes(worldTag),
    );
  },

  /** @deprecated No profile-based country inference; factions come from AI only. */
  inferTopCountry(_profile = {}) {
    return null;
  },

  emptyOverviewPanels() {
    return window.GameModules.orgTerritory?.defaultOverviewPanels?.()
      || {
        ideology: {},
        economy: { entries: {} },
        politics: { entries: {} },
        military: { entries: {} },
        diplomacy: { entries: {} },
        territory: { entries: {} },
      };
  },

  /** @deprecated Do not seed country factions from code. */
  countryFaction(_profile = {}) {
    return null;
  },

  /** @deprecated Do not seed company factions from code. */
  companyFaction(_profile = {}, _country = null) {
    return null;
  },

  defaultReasons(text) {
    return [
      'name', 'type', 'classification', 'worldTag', 'parentId', 'parentName', 'level', 'location', 'domain', 'scale',
      'stance', 'influence', 'description', 'structure', 'rules', 'resources', 'relations',
    ].reduce((out, key) => {
      out[key] = text;
      return out;
    }, {});
  },
};
