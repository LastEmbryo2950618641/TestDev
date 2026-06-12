window.GameModules = window.GameModules || {};

window.GameModules.appSwitchActions = {
  showAppExitChoices() {
    this.appDragging = false;
    this.appGesturePointerId = null;
    this.appDragY = 0;
    this.appDragPeakY = 0;
    this.appGestureFromHomeZone = false;
    this.appExitChoiceOpen = true;
  },

  runAppInBackground() {
    this.appExitChoiceOpen = false;
    this.closeAppToDesktop(true);
  },

  forceQuitApp() {
    this.appExitChoiceOpen = false;
    this.closeAppToDesktop(false);
  },

  dismissAppExitChoices() {
    this.appExitChoiceOpen = false;
  },
};
