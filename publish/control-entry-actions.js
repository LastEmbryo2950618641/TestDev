window.GameModules = window.GameModules || {};

window.GameModules.controlEntryActions = {
  async connectControlRole(id) {
    if (!id || this.busy) return;
    const prepared = this.prepareControlCharacterSelection?.(id) || { selectedWork: this.selectedWork || '', selectedCharacterId: id };
    this.selectedWork = prepared.selectedWork || this.selectedWork;
    this.selectedCharacterId = prepared.selectedCharacterId || id;
    this.resetControlEntryDraft?.();
    this.leaveControlSelectionView?.();
    await this.start();
  },

  openControlCharacterAdd() {
    this.resetControlEntryDraft?.();
    this.leaveControlSelectionView?.();
    this.entrySetupOpen = false;
    window.GameModules.characterBrief.ensure(this);
  },

  backToHome() {
    if (this.busy) return;
    this.enterControlSelectionView?.();
    this.resetControlEntryDraft?.();
  },
};
