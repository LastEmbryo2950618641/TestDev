window.GameModules = window.GameModules || {};
window.GameModules.initDefaults = window.GameModules.initDefaults || {};

window.GameModules.initDefaults.intimacyBody = {
  partLabels: {
    overall: '整体',
    mouth: '口部',
    chest: '胸部',
    genital: '阴部',
    anus: '肛部',
    hips: '臀部',
    limbs: '四肢',
    skin: '皮肤',
    other: '其他',
  },

  sexPartLabels: {
    genital: '阴部次数',
    chest: '胸部次数',
    lips: '嘴唇次数',
    mouth: '口部次数',
    oralAction: '口部行为次数',
    oralSex: '口交次数',
    oralInternalFinish: '口交中出次数',
    genitalEntry: '阴部进入次数',
    vaginalInsertion: '阴部插入次数',
    vaginalInternalFinish: '阴部中出次数',
    anus: '肛门次数',
    analEntry: '肛部进入次数',
    analSex: '肛交次数',
    analInternalFinish: '肛交中出次数',
    legs: '腿部次数',
    hips: '臀部次数',
    hands: '手部次数',
    skin: '皮肤接触次数',
    other: '其他次数',
  },

  bodyDescriptions: {
    overall: '整体稳定，无明显异常',
    mouth: '口部清洁，状态稳定',
    chest: '胸部状态稳定，无明显不适',
    genital: '阴部状态稳定，无明显不适',
    anus: '肛部状态稳定，无明显不适',
    hips: '臀部状态稳定，无明显不适',
    limbs: '肢体活动正常，状态稳定',
    skin: '皮肤状态稳定，无明显异常',
    other: '其他部位暂无异常',
  },

  bodyStatusEntry(key) {
    return {
      partKey: key,
      part: this.partLabels[key] || '其他',
      status: '稳定',
      description: this.bodyDescriptions[key] || '状态稳定',
      reason: '初始默认状态',
      updatedAt: '',
    };
  },

  bodyStatus() {
    return Object.fromEntries(Object.keys(this.partLabels).map((key) => [key, this.bodyStatusEntry(key)]));
  },

  sexualExperienceParts() {
    return Object.fromEntries(Object.keys(this.sexPartLabels).map((key) => [key, 0]));
  },

  intimacy() {
    return {
      sexualExperienceCount: 0,
      sexualExperienceParts: this.sexualExperienceParts(),
      updatedAt: '',
      reason: '默认未记录',
    };
  },
};
