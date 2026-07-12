window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.company = window.GameModules.ui.company || {};

window.GameModules.ui.company.employmentRecordViewHelpers = {
  companyEmploymentRecordSectionView() {
    const recordRows = (Array.isArray(this.companyState?.employmentRecords) ? this.companyState.employmentRecords : []).map((record = {}, index = 0) => ({
      key: record.id || `${record.company || 'record'}-${index}`,
      title: record.company || '未命名公司',
      status: record.status || '未知状态',
      startText: `开始入职：${record.startAt ? new Date(record.startAt).toLocaleString() : '未知'}`,
      durationText: `在职时长：${record.duration || this.employmentDurationText(record.startAt, record.endAt || new Date().toISOString())}`,
      endText: record.endAt ? `离职时间：${new Date(record.endAt).toLocaleString()}` : '',
      showEnd: !!record.endAt,
    }));

    return {
      emptyText: '暂无任职记录',
      recordRows,
    };
  },
};
