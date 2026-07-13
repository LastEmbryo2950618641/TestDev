window.GameModules = window.GameModules || {};

window.GameModules.bossAppointmentActions = {
  bossAppointmentChoices(job = this.selectedBossCompanyJob()) {
    if (!job) return [];
    if (!Array.isArray(this.bossState.appointmentChoices) || this.bossState.appointmentJobId !== job.id) {
      this.bossState.appointmentChoices = this.generateBossAppointmentChoices(job);
      this.bossState.appointmentJobId = job.id;
      this.bossState.selectedAppointmentIndex = 0;
    }
    return this.bossState.appointmentChoices;
  },

  generateBossAppointmentChoices(job) {
    const now = this.phoneDate?.() || new Date();
    const durations = [30, 45, 60];
    const rows = [];
    for (let offset = 1; rows.length < 4 && offset <= 10; offset += 1) {
      const date = new Date(now);
      date.setDate(date.getDate() + offset);
      const week = date.getDay();
      if (week === 0 || week === 6) continue;
      const slots = [9, 10, 14, 15, 16].sort(() => Math.random() - 0.5);
      for (const hour of slots) {
        if (rows.length >= 4) break;
        const start = new Date(date);
        start.setHours(hour, 0, 0, 0);
        if (start <= now) continue;
        const durationMinutes = durations[Math.floor(Math.random() * durations.length)];
        rows.push({ start: start.toISOString(), durationMinutes, label: this.bossAppointmentLabel(start, durationMinutes, job) });
      }
    }
    return rows;
  },

  bossAppointmentLabel(date, durationMinutes, job) {
    const type = job.payType === '创作者' ? '通知沟通' : job.payType === '定时工' ? '到岗上班' : '面试';
    const text = date.toLocaleString('zh-CN', { weekday: 'short', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `${text}｜${type}${durationMinutes}分钟`;
  },

  selectedBossAppointment(job = this.selectedBossCompanyJob()) {
    const rows = this.bossAppointmentChoices(job);
    return rows[Number(this.bossState.selectedAppointmentIndex) || 0] || rows[0] || null;
  },

  createBossAppointment(job) {
    const pick = this.selectedBossAppointment(job);
    const hours = Math.max(Number(this.bossState.applyHours) || 1, 1);
    const type = job.payType === '创作者' ? '投稿通知' : job.payType === '定时工' ? '到岗上班' : '面试';
    const title = `${job.company}｜${job.title}｜${type}`;
    const note = job.payType === '定时工' ? `预约${hours}小时，${this.bossJobPayText(job)}` : this.bossJobPayText(job);
    return { title, type, time: pick?.start || new Date().toISOString(), durationMinutes: pick?.durationMinutes || 60, company: job.company, jobTitle: job.title, note, matterType: 'job-appointment', status: 'pending' };
  },

  applyBossJob() {
    const job = this.selectedBossCompanyJob();
    if (!job) return;
    const event = this.createBossAppointment(job);
    this.addCalendarEvent?.(event);
    this.upsertCompanyFromBossJob?.(job);
    this.ensureBossJobFaction?.(job, event);
    this.addPlayerForcePosition?.({ force: job.company, position: `应聘${job.title}`, reason: `已申请${job.company}的${job.title}，并约定${event.type}时间。` });
    this.bossState.applyMessage = `已录入日历：${event.title}｜${this.formatCalendarTime(event.time)}`;
    this.save?.();
  },
};
