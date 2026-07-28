window.GameModules = window.GameModules || {};

window.GameModules.rpgAge = {
  sync(state, character, store = null) {
    if (!state) return false;
    const profile = state.profile || character || {};
    const age = this.forCharacter(character, store);
    const ageLabel = `${age}岁`;
    const changed = profile.age !== ageLabel;
    profile.age = ageLabel;
    if (state.profile) window.GameModules.rpgState?.stripProfileOwnedValues?.(state);
    return changed;
  },

  forCharacter(character, store = null) {
    const directAge = character?.age && typeof character.age === 'object' && character.age.value !== undefined ? character.age.value : character?.age;
    if (directAge !== undefined && directAge !== null && String(directAge).trim()) {
      const parsed = parseInt(String(directAge), 10);
      if (Number.isFinite(parsed)) return this.clamp(parsed, 0, 999);
    }
    const isCurrent = character?.id && character.id === store?.character?.id;
    if (isCurrent) {
      const age = parseInt(String(store?.characterAge || ''), 10);
      if (Number.isFinite(age)) return this.clamp(age, 0, 999);
    }
    const text = [character?.role, character?.relationships, character?.detail, character?.personality].filter(Boolean).join(' ');
    const explicit = String(text).match(/(\d{1,3})\s*岁/);
    if (explicit) return this.clamp(Number(explicit[1]), 0, 999);
    return this.clamp(this.seed(`${character?.name || ''}${character?.role || ''}${character?.detail || ''}`) % 60 + 18, 0, 999);
  },

  seed(text) {
    return [...String(text)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  },

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
  },
};
