window.GameModules = window.GameModules || {};

window.GameModules.uiThemeActions = {
  presets: {
    dark: { id: 'dark', name: '娣辫壊', emoji: '馃寵', accent: '#7fe5ff' },
    light: { id: 'light', name: '鐧借壊', emoji: '鈽€锔?, accent: '#4f46e5' },
    pink: { id: 'pink', name: '妯辫姳绮?, emoji: '馃尭', accent: '#ffb5d1' },
    mint: { id: 'mint', name: '钖勮嵎', emoji: '馃崈', accent: '#5eead4' },
    custom: { id: 'custom', name: '鑷畾涔?, emoji: '馃帹', accent: '#7fe5ff' },
  },

  themeOptions() {
    return Object.values(this.presets).filter((item) => item.id !== 'custom');
  },

  hexToRgb(hex = '') {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || '').trim());
    if (!m) return '127, 229, 255';
    return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
  },

  hexLuminance(hex = '') {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || '').trim());
    if (!m) return 0;
    const r = parseInt(m[1], 16) / 255;
    const g = parseInt(m[2], 16) / 255;
    const b = parseInt(m[3], 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  },

  isLightAccent(hex = '') {
    return this.hexLuminance(hex) > 0.62;
  },

  normalizeHex(hex = '') {
    const raw = String(hex || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
    if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toLowerCase()}`;
    return '';
  },

  readStored() {
    return window.GameModules.localSettings?.readStored?.() || {};
  },

  persist(patch = {}) {
    window.GameModules.localSettings?.writeStored?.(patch);
  },

  apply(themeId = 'dark', customColor = '') {
    const root = document.documentElement;
    const id = this.presets[themeId] ? themeId : 'dark';
    root.setAttribute('data-ui-theme', id);
    root.setAttribute('data-ui-density', 'compact');
    if (id === 'custom') {
      const hex = this.normalizeHex(customColor) || this.presets.custom.accent;
      root.style.setProperty('--ui-accent', hex);
      root.style.setProperty('--ui-accent-rgb', this.hexToRgb(hex));
      root.setAttribute('data-ui-custom-base', this.isLightAccent(hex) ? 'light' : 'dark');
      root.style.setProperty('--ui-bg-gradient-a', `rgba(${this.hexToRgb(hex)}, .28)`);
      root.style.setProperty('--ui-bg-gradient-b', `rgba(${this.hexToRgb(hex)}, .14)`);
    } else {
      root.removeAttribute('data-ui-custom-base');
      root.style.removeProperty('--ui-accent');
      root.style.removeProperty('--ui-accent-rgb');
      root.style.removeProperty('--ui-bg-gradient-a');
      root.style.removeProperty('--ui-bg-gradient-b');
    }
  },

  initFromStore(store) {
    const stored = this.readStored();
    const themeId = stored.uiThemeId || 'dark';
    const customColor = stored.uiThemeCustomColor || '#7fe5ff';
    if (store?.settingsState) {
      store.settingsState.uiThemeId = themeId;
      store.settingsState.uiThemeCustomColor = customColor;
    }
    this.apply(themeId, customColor);
  },

  selectUiTheme(themeId) {
    const id = this.presets[themeId] ? themeId : 'dark';
    if (this.settingsState) this.settingsState.uiThemeId = id;
    const customColor = this.settingsState?.uiThemeCustomColor || this.readStored().uiThemeCustomColor || '#7fe5ff';
    this.apply(id, customColor);
    this.persist({ uiThemeId: id, uiThemeCustomColor: customColor });
  },

  setUiThemeCustomColor(color) {
    const hex = this.normalizeHex(color) || '#7fe5ff';
    if (this.settingsState) {
      this.settingsState.uiThemeCustomColor = hex;
      this.settingsState.uiThemeId = 'custom';
    }
    this.apply('custom', hex);
    this.persist({ uiThemeId: 'custom', uiThemeCustomColor: hex });
  },

  currentUiThemeLabel() {
    const id = this.settingsState?.uiThemeId || this.readStored().uiThemeId || 'dark';
    if (id === 'custom') return `鑷畾涔?${this.settingsState?.uiThemeCustomColor || this.readStored().uiThemeCustomColor || ''}`;
    return `${this.presets[id]?.emoji || ''} ${this.presets[id]?.name || '娣辫壊'}`.trim();
  },
};

(function bootstrapUiTheme() {
  try {
    const stored = window.GameModules.localSettings?.readStored?.() || {};
    window.GameModules.uiThemeActions.apply(stored.uiThemeId || 'dark', stored.uiThemeCustomColor || '#7fe5ff');
  } catch (_) { /* ignore */ }
})();

