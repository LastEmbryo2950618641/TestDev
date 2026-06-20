window.GameModules = window.GameModules || {};

window.GameModules.realWorldMatterActions = {
  realWorldAvailableMatters() {
    this.initCalendar?.();
    const now = this.phoneDate?.() || new Date();
    const rows = (this.calendarState?.events || []).filter((event) => event?.matterType && event.status !== 'done')
      .filter((event) => new Date(new Date(event.time).getTime() + (Number(event.durationMinutes) || 60) * 60000) >= now)
      .sort((a, b) => new Date(a.time) - new Date(b.time));
    if (this.realWorldMatterState?.activeId && !rows.some((item) => item.id === this.realWorldMatterState.activeId)) this.realWorldMatterState.activeId = '';
    return rows;
  },

  activeRealWorldMatter() {
    const id = this.realWorldMatterState?.activeId || '';
    return this.realWorldAvailableMatters().find((item) => item.id === id) || null;
  },

  openRealWorldMatterPanel() {
    this.realWorldMatterState = this.realWorldMatterState || { open: false, activeId: '' };
    this.realWorldMatterState.open = true;
  },

  closeRealWorldMatterPanel() {
    if (this.realWorldMatterState) this.realWorldMatterState.open = false;
  },

  selectRealWorldMatter(id) {
    this.realWorldMatterState = this.realWorldMatterState || { open: false, activeId: '' };
    this.realWorldMatterState.activeId = id;
    this.realWorldMatterState.open = false;
  },

  clearRealWorldMatter() {
    if (this.realWorldMatterState) this.realWorldMatterState.activeId = '';
  },

  realWorldMatterText(matter = this.activeRealWorldMatter()) {
    if (!matter) return '无当前事项';
    return `${matter.title}｜${this.formatCalendarTime?.(matter.time) || matter.time}｜${matter.note || '无备注'}`;
  },

  realWorldMatterAction(matter = this.activeRealWorldMatter()) {
    if (!matter) return '';
    if (matter.type === '面试') return `去参加${matter.company || ''}${matter.jobTitle || ''}面试`;
    if (matter.type === '到岗上班') return `按预约去${matter.company || ''}${matter.jobTitle || ''}到岗上班`;
    if (matter.type === '投稿通知') return `处理${matter.company || ''}${matter.jobTitle || ''}投稿通知`;
    return `处理事项：${matter.title}`;
  },

  realWorldChoicesWithMatters() {
    const matter = this.activeRealWorldMatter();
    const matterAction = this.realWorldMatterAction(matter);
    return [...new Set([matterAction, ...(this.realWorldChoices || [])].filter(Boolean))].slice(0, 5);
  },

  realWorldActionWithMatter(action) {
    const matter = this.activeRealWorldMatter();
    if (!matter) return action;
    const detail = this.realWorldMatterText(matter);
    return `【当前事项】${detail}\n【玩家行动】${action}`;
  },

  refreshRealWorldMatterStatus() {
    const matter = this.activeRealWorldMatter();
    if (!matter) return;
    const now = this.phoneDate?.() || new Date();
    const end = new Date(new Date(matter.time).getTime() + (Number(matter.durationMinutes) || 60) * 60000);
    if (now >= end) {
      matter.status = 'done';
      this.realWorldMatterState.activeId = '';
    }
  },
};
