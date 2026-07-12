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

  companyAttendanceView() {
    const attendance = this.currentWorkAttendance();
    return {
      ...attendance,
      label: '今日上班状态',
      actionLabel: '记录到岗',
    };
  },

  companyPayPreviewView() {
    const pay = this.monthlyPayPreview();
    return {
      title: '薪酬绩效预览',
      summaryLine: `底薪：${pay.base}元｜本月完整上班天数：${pay.workDays}天｜日薪：${pay.daily}元`,
      performanceLine: `每月收入：${pay.total}元｜年底绩效：${pay.annualPerformance}元｜绩效提成：${Math.round(pay.rate * 100)}%`,
    };
  },

  companyOrganizationSectionView() {
    const departments = this.companyOrganization().map((dept = {}) => ({
      key: dept.name || 'unknown-dept',
      name: dept.name || '未命名部门',
      sectionTitle: `${dept.name || '未命名部门'}组织区`,
      jobRows: (Array.isArray(dept.jobs) ? dept.jobs : []).map((job = {}, index = 0) => ({
        key: `${dept.name || 'dept'}-${job.title || index}`,
        title: job.title || '未命名岗位',
        peopleText: `在岗人员：${Array.isArray(job.people) && job.people.length ? job.people.join('、') : '暂无'}`,
      })),
    }));

    return {
      emptyText: '暂无组织结构',
      departments,
    };
  },

  companyFieldSectionView() {
    const rows = this.companyFields().map((field) => ({
      key: field.key,
      field,
    }));

    return {
      emptyText: '暂无在职公司信息',
      rows,
    };
  },

  companyContractSectionView() {
    const contractRows = (Array.isArray(this.companyState?.contracts) ? this.companyState.contracts : []).map((item = {}) => ({
      key: item.id || `${item.type || 'contract'}-${item.signedAt || ''}`,
      title: item.type || '未命名合同',
      body: item.terms || '',
      meta: item.signedAt || '',
    }));

    const submissionRows = (Array.isArray(this.companyState?.submissions) ? this.companyState.submissions : []).map((item = {}) => ({
      key: item.id || `${item.type || 'submission'}-${item.status || ''}`,
      title: item.type || '未命名投稿',
      body: `${item.target || ''}｜${item.rewardRule || ''}`,
      meta: item.status || '',
    }));

    return {
      emptyText: '暂无薪酬绩效信息',
      contractRows,
      submissionRows,
    };
  },

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

