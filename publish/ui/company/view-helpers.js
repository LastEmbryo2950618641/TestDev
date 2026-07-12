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

  companyEmploymentRecordSectionView() { return window.GameModules.ui.company.employmentRecordViewHelpers.companyEmploymentRecordSectionView.call(this); },
};
