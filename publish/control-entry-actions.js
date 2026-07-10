window.GameModules = window.GameModules || {};

window.GameModules.controlEntryActions = {
  async connectControlRole(id) {
    if (!id || this.busy) return;
    const found = window.GameModules.catalog.find(id);
    if (found) {
      this.selectedWork = found.work || this.selectedWork;
      this.selectedCharacterId = found.id;
    } else {
      this.selectedCharacterId = id;
    }
    this.started = false;
    this.controlSelectOpen = false;
    await this.start();
  },

  openControlCharacterAdd() {
    this.started = false;
    this.controlSelectOpen = false;
    this.entrySetupOpen = false;
    window.GameModules.characterBrief.ensure(this);
  },

  backToHome() {
    if (this.busy) return;
    this.entrySetupOpen = false;
    this.controlSelectOpen = true;
    this.entryCurrentAction = '';
  },
};
