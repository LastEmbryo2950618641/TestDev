window.GameModules = window.GameModules || {};

window.GameModules.skillsApp = {
  defaultState() {
    return { open: false, query: '', category: '', selectedSkillId: '', detailOpen: false };
  },

  async loadDefinitions() {
    await window.GameModules.skillLoader?.load?.();
    return this.definitions();
  },

  definitions() {
    return window.GameModules.skillsDefinitions || [];
  },
};
