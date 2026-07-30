---
id: company.query
category: 工作查询
name: 工作与单位系统查询
method: listPlayerCompanies(), getCompanySummary(companyName), getWorkContext(companyName), searchCompany(keyword)
params: companyName: 工作单位名称或角色/岗位线索，可为空表示当前单位；keyword: 单位、岗位、上班、同事、考勤等关键词
returns: 玩家相关工作单位名称、单位摘要、工作制度、考勤薪资、组织架构和规则
trigger: 现实世界推演中，行动涉及工作单位、上班、下班、请假、迟到、岗位、面试、招聘、上级、同事、工资、项目、工位、打卡、考勤、开会或离职时查询。
---

# 工作与单位系统查询 Skill

## 激活描述

现实世界推演默认只知道玩家相关工作单位的名称或线索。需要判断工作、组织、考勤、薪资、岗位或同事时，必须先查询工作资料。

## 可用方法

1. `listPlayerCompanies()`：列出玩家当前相关工作单位或组织名称。
2. `getCompanySummary(companyName)`：读取指定工作单位摘要，包括行业、地点、制度、组织和规则。
3. `getWorkContext(companyName)`：读取上班制度、考勤状态、薪资结算、绩效和工作关系。
4. `searchCompany(keyword)`：按关键词搜索工作单位、岗位、同事、上级、招聘和考勤资料。

## 使用规则

1. 没有查询到工作资料时，不得编造单位内部细节。
2. 单位名称可以从基础上下文读取；详细制度必须来自查询结果。
3. 单位、岗位、势力、考勤或收入发生变化时，必须通过 lexiconUpdates 或 companyUpdates 返回。
4. 不要凭空替玩家换工作，除非玩家行动明确触发。
