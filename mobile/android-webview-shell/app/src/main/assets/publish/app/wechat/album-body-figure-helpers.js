window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.albumBodyFigureHelpers = {
  bodyProfileImageKind(section = {}) {
    return String(section?.title || '').trim() === '盛装' ? 'dressed' : 'natural';
  },

  bodyProfileTargetState(section = {}) {
    const field = section?.fields?.[0] || null;
    return (field ? this.activeDetailState?.(field) : null)
      || this.identityTargetState?.()
      || this.playerIdentityState?.()
      || this.currentRpgState
      || null;
  },

  bodyFigureDefaultPartLayout(index = 0) {
    const points = [
      { x: 49, y: 9, side: 'left' },
      { x: 49, y: 19, side: 'left' },
      { x: 58, y: 16, side: 'right' },
      { x: 52, y: 24, side: 'right' },
      { x: 48, y: 32, side: 'left' },
      { x: 72, y: 36, side: 'right' },
      { x: 50, y: 44, side: 'left' },
      { x: 58, y: 53, side: 'right' },
      { x: 50, y: 58, side: 'right' },
      { x: 49, y: 68, side: 'left' },
      { x: 48, y: 84, side: 'left' },
    ];
    const item = points[index] || { x: 50, y: Math.min(88, 8 + (index * 8)), side: index % 2 ? 'right' : 'left' };
    return {
      anchor: { x: item.x, y: item.y },
      label: { x: item.side === 'right' ? 90 : 10, y: Math.min(88, Math.max(7, item.y)), side: item.side },
    };
  },

  bodyFigureNormalizedParts(list = []) {
    const cfg = window.GameModules.appearanceProfileTags;
    const names = cfg?.bodyParts?.() || [];
    const source = Array.isArray(list) ? list : [];
    const byName = new Map(source.map((item) => [String(item?.part || item?.name || '').trim(), item]));
    const ordered = names.length ? names.map((name, index) => byName.get(name) || { index: index + 1, part: name, tags: [], description: '' }) : source;
    return ordered.map((item, index) => {
      const normalized = cfg?.normalizePartItem?.(item, index + 1, item?.part || item?.name || '') || item || {};
      const layout = this.bodyFigureDefaultPartLayout(index);
      return {
        index: Number(normalized.index) || index + 1,
        part: String(normalized.part || item?.part || item?.name || `部位${index + 1}`).trim(),
        tags: Array.isArray(normalized.tags) ? normalized.tags : [],
        description: String(normalized.description || item?.description || item?.detail || '').trim(),
        anchor: layout.anchor,
        label: layout.label,
      };
    });
  },

  buildGeneratedBodyFigureMeta(kind = 'natural', contact = this.wechatAlbumContact(), drawResult = {}, drawOptions = {}) {
    const { state, profile } = this.wechatAlbumStateData(contact);
    const cfg = window.GameModules.appearanceProfileTags;
    const source = this.profileAppearanceSource?.(state || {}) || profile || {};
    const ownerId = String(contact?.id || state?.id || this.identityTargetId || 'player-self').trim() || 'player-self';
    const naturalMeta = cfg?.normalizeNaturalMeta?.(source.bodyProfileMeta || profile.bodyProfileMeta || {}, profile) || (source.bodyProfileMeta || {});
    const dressedMeta = cfg?.normalizeDressedMeta?.(source.dressedProfileMeta || profile.dressedProfileMeta || {}, profile) || (source.dressedProfileMeta || {});
    const partsSource = kind === 'dressed'
      ? (source.dressedProfile || profile.dressedProfile || [])
      : (source.bodyProfile || profile.bodyProfile || []);
    const parts = this.bodyFigureNormalizedParts(partsSource);
    const stateLabel = this.wechatAlbumKindLabel(kind);
    return {
      characterId: ownerId,
      ownerId,
      personId: ownerId,
      stateKind: kind === 'dressed' ? 'dressed' : 'natural',
      stateLabel,
      label: `${profile.name || contact?.name || ownerId} - ${stateLabel}生成形象图`,
      generated: true,
      real: true,
      source: 'body-profile-generator',
      prompt: drawOptions.prompt || '',
      negativePrompt: drawOptions.negativePrompt || '',
      taskId: drawResult.taskId || '',
      provider: drawResult.provider || this.selectedDrawProviderId?.() || '',
      overall: naturalMeta.overall || [],
      figure: naturalMeta.figure || [],
      height: naturalMeta.height || '',
      weight: naturalMeta.weight || '',
      skinTone: naturalMeta.skinTone || [],
      aura: naturalMeta.aura || [],
      styleBase: dressedMeta.styleBase || [],
      makeupBase: dressedMeta.makeupBase || [],
      colorScheme: dressedMeta.colorScheme || [],
      hosiery: dressedMeta.hosiery || [],
      hairstyle: dressedMeta.hairstyle || [],
      accessoryDensity: dressedMeta.accessoryDensity || [],
      tags: [
        ownerId,
        kind === 'dressed' ? 'dressed' : 'natural',
        ...(naturalMeta.overall || []),
        ...(naturalMeta.figure || []),
        ...(naturalMeta.skinTone || []),
        ...(naturalMeta.aura || []),
        ...(dressedMeta.styleBase || []),
        ...(dressedMeta.makeupBase || []),
      ].filter(Boolean),
      parts,
    };
  },
};
