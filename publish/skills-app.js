window.GameModules = window.GameModules || {};

window.GameModules.skillsApp = {
  defaultState() {
    return { open: false, query: '', category: '', selectedSkillId: '', detailOpen: false };
  },

  definitions() {
    return window.GameModules.skillsDefinitions || [];
  },
};
