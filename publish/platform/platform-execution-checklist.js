// Shared platform execution checklist draft
// Converts packaging gap analysis into ordered implementation steps for desktop and mobile hosts.

function toChecklistSteps(gapReport = {}) {
  const priorities = Array.isArray(gapReport.priorities) ? gapReport.priorities : [];
  const hostTasks = Array.isArray(gapReport.hostSpecificTasks) ? gapReport.hostSpecificTasks : [];
  const steps = [];

  priorities.forEach((item) => {
    steps.push({
      key: item.key,
      priority: item.priority,
      type: 'gap',
      action: `resolve-${item.key}-readiness`,
      dependsOn: [],
    });
  });

  hostTasks.forEach((task, index) => {
    steps.push({
      key: task,
      priority: priorities.length + index + 1,
      type: 'host-task',
      action: task,
      dependsOn: priorities.length ? [priorities[0].key] : [],
    });
  });

  return steps;
}

export function createSharedPlatformExecutionChecklist(gapReport = {}) {
  const steps = toChecklistSteps(gapReport);
  return {
    runtimeFamily: 'platform-execution-checklist',
    stage: 'shared-platform-execution-checklist',
    hostKind: String(gapReport.hostKind || ''),
    shellLocalOnly: gapReport.shellLocalOnly === true,
    publishTouched: gapReport.publishTouched === true,
    readyForHostPackaging: gapReport.readyForHostPackaging === true,
    steps,
    totalSteps: steps.length,
    evidence: gapReport.evidence || {},
  };
}
