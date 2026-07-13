/**
 * 游戏内时间流动。
 */
window.GameModules = window.GameModules || {};
Object.assign(window.GameModules.entryTime, {
  async advance(store, seconds = 60) {
    const current = window.GameModules.characterMemory?.timeValue(store.entryTime);
    if (!current) return false;
    const d = new Date(current.year, current.month - 1, current.day, current.hour, current.minute, current.second + seconds);
    store.entryTime = {
      year: `${d.getFullYear()}年`,
      month: `${d.getMonth() + 1}月`,
      day: `${d.getDate()}日`,
      hour: `${String(d.getHours()).padStart(2, '0')}时`,
      minute: `${String(d.getMinutes()).padStart(2, '0')}分`,
      second: `${String(d.getSeconds()).padStart(2, '0')}秒`,
    };
    if (this.applyCharacterAge) await this.applyCharacterAge(store);
    return true;
  },
});
