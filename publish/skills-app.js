window.GameModules = window.GameModules || {};

window.GameModules.skillsApp = {
  defaultState() {
    return { open: false, query: '', category: '', selectedSkillId: 'desktop.open' };
  },

  definitions() {
    return window.GameModules.skillsDefinitions || [];
  },
};
