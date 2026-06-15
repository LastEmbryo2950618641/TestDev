window.GameModules = window.GameModules || {};

window.GameModules.playerProfileLexicon = {
  reason(label) {
    const map = {
      所属世界: '所属世界来自手机激活时绑定的现实世界入口。',
      姓名: '姓名来自玩家账号资料或激活时手动填写。',
      性别: '性别来自玩家激活资料。',
      生日: '生日来自玩家激活资料，用于推算年龄。',
      年龄: '年龄由玩家生日按当前现实日期计算。',
      具体地址: '具体地址来自玩家填写资料或AI对居住地的现实化补全。',
      现实身份: '现实身份来自玩家填写的日常角色与AI补全结果。',
      势力地位: '势力地位由玩家工作/学习组织及岗位资料确定。',
      社群角色: '社群角色由玩家居住地址和现实社区身份确定。',
      居住状态: '居住状态来自玩家填写资料或现实身份补全。',
      父母状态: '父母状态来自玩家家庭资料与补全规则。',
      父母去世原因: '父母去世原因来自家庭资料缺口的剧情补全。',
      人际关系: '人际关系来自玩家明确填写的人际资料。',
      世界观补全: '世界观补全由AI围绕玩家资料生成。',
      备注: '备注来自玩家补充设定。',
    };
    return map[label] || `${label}来自玩家手机激活资料、已有账号同步或现实身份补全结果。`;
  },

  row(name, value, desc, worldTag) {
    return { key: `player-${name}`, label: name, kind: '玩家设定', value: value || '未填写', raw: value || '', desc, reason: this.reason(name), worldTag, targetType: '非角色', commonField: name !== '所属世界' };
  },
};
