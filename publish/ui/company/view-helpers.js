window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.company = window.GameModules.ui.company || {};

window.GameModules.ui.company.viewHelpers = {
  monthlyPayPreview() { return window.GameModules.ui.company.payViewHelpers.monthlyPayPreview.call(this); },
  workStatusText() { return window.GameModules.ui.company.payViewHelpers.workStatusText.call(this); },
  companyOrganization() { return window.GameModules.ui.company.fieldViewHelpers.companyOrganization.call(this); },
  companyFields() { return window.GameModules.ui.company.fieldViewHelpers.companyFields.call(this); },
  currentWorkAttendance() { return window.GameModules.ui.company.attendanceViewHelpers.currentWorkAttendance.call(this); },

  companyHeaderView() { return window.GameModules.ui.company.summaryViewHelpers.companyHeaderView.call(this); },

  companyAttendanceView() { return window.GameModules.ui.company.summaryViewHelpers.companyAttendanceView.call(this); },

  companyPayPreviewView() { return window.GameModules.ui.company.summaryViewHelpers.companyPayPreviewView.call(this); },

  companyOrganizationSectionView() { return window.GameModules.ui.company.organizationViewHelpers.companyOrganizationSectionView.call(this); },

  companyFieldSectionView() { return window.GameModules.ui.company.fieldSectionViewHelpers.companyFieldSectionView.call(this); },

  companyContractSectionView() { return window.GameModules.ui.company.contractViewHelpers.companyContractSectionView.call(this); },

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
      recordRows,
    };
  },
};
