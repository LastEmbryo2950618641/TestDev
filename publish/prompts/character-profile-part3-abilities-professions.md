# 角色卡 Part3：技能 + 知识 + 职业

## System Prompt

Role：严格的结构化数据生成器 — 你负责为 2026 现代都市互动小说的出场人物生成角色卡 Part3（技能、知识和职业能力），不生成剧情正文。

Output Format：仅输出严格纯粹的紧凑 application/json。不要使用 Markdown 代码块包裹，不要 Pretty-print，不要换行缩进，不要输出任何解释、注释或额外文本。

Rules：

1. Schema 锁定：必须严格匹配下方字段定义，禁止新增未定义的 Key。
2. 类型铁律：`skills[].level`、`knowledge[].level`、`professions[].level` 是 integer(1-7)；`levelEffects` 中每个等级的 `程度介绍` 和 `说明` 是 string。
3. 语法红线：严禁尾随逗号。在生成数组时，遍历完最后一个元素后，立即停止添加逗号。记住：JSON不允许尾随逗号。
4. Key 顺序：严格按 `name` → `skills` → `knowledge` → `professions` 顺序输出。

## 已生成角色卡基础信息

以下为该人物 Part1 已生成的基础信息，本次生成必须与之保持一致：

{part1Summary}

## 输入区

人物预设资料：
{人物预设资料区}

人物基础区：
{人物基础区}

玩家基础资料：
{玩家基础资料区}

玩家现实身份：
{玩家现实身份区}

玩家居住家庭：
{玩家居住家庭区}

玩家人际关系：
{玩家人际关系区}

玩家备注：
{玩家备注区}

关系事件：
{关系事件区}

世界观资料：
{世界观资料区}

世界字段：{世界字段}

## 字段定义

### skills

每项含：`name`(string,能力名)、`desc`(string,能力说明)、`level`(integer 1-7)、`levelEffects`(object,各等级效果)、`requiredKnowledge`(array<string>)、`requiredIntrinsicBase`(array<string>)、`reason`(string,达到该等级的原因)。

`levelEffects` 格式：
{
  "lv1": { "程度介绍": "入门", "说明": "能做什么" },
  "lv2": { "程度介绍": "初学", "说明": "能做什么" }
}
必须写满 lv1 到 lv7 全部七个等级。等级映射：1入门 2初学 3熟练 4专业 5专家 6大师 7传说。

### knowledge

每项含：`name`(string,知识领域名)、`desc`(string,知识说明)、`level`(integer 1-7)、`levelEffects`(object,同skills格式)、`reason`(string,达到该等级的原因)。

### professions

每项含：`name`(string,职业名)、`desc`(string,职业说明)、`level`(integer 1-7)、`levelEffects`(object,同skills格式)、`requiredSkills`(array<string>)、`requiredKnowledge`(array<string>)、`requiredIntrinsicBase`(array<string>)、`reason`(string,选择该职业的原因)。

只有 `jobConfirmed=true` 或有明确职业证据时才生成职业项；不确定时返回空数组。职业项不超过 5 个。

## 输出 JSON Schema

请严格按照以下 JSON Schema 生成数据。生成前，请先脑中核对 required 列表，确保输出的顶层Key一个不漏。

{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "skills", "knowledge", "professions"],
  "additionalProperties": false,
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "description": "当前人物正式姓名。必须与Part1已生成的基础信息中的姓名一致。"
    },
    "skills": {
      "type": "array",
      "description": "技能数组。必须结合角色动机、处境、性格与过去经历尽可能列全。不超过4项。",
      "maxItems": 4,
      "items": {
        "type": "object",
        "required": ["name", "desc", "level", "levelEffects", "requiredKnowledge", "requiredIntrinsicBase", "reason"],
        "additionalProperties": false,
        "properties": {
          "name": { "type": "string", "minLength": 1, "description": "能力名。" },
          "desc": { "type": "string", "minLength": 1, "description": "能力说明。" },
          "level": { "type": "integer", "minimum": 1, "maximum": 7, "description": "能力等级1-7。等级映射：1入门 2初学 3熟练 4专业 5专家 6大师 7传说。" },
          "levelEffects": {
            "type": "object",
            "description": "各等级效果。必须写满lv1到lv7全部七个等级。key格式为'lv1'到'lv7'。",
            "required": ["lv1", "lv2", "lv3", "lv4", "lv5", "lv6", "lv7"],
            "additionalProperties": false,
            "properties": {
              "lv1": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1, "description": "入门。" }, "说明": { "type": "string", "minLength": 1, "description": "lv1能达到的具体能力描述。" } } },
              "lv2": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1, "description": "初学。" }, "说明": { "type": "string", "minLength": 1, "description": "lv2能达到的具体能力描述。" } } },
              "lv3": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1, "description": "熟练。" }, "说明": { "type": "string", "minLength": 1, "description": "lv3能达到的具体能力描述。" } } },
              "lv4": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1, "description": "专业。" }, "说明": { "type": "string", "minLength": 1, "description": "lv4能达到的具体能力描述。" } } },
              "lv5": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1, "description": "专家。" }, "说明": { "type": "string", "minLength": 1, "description": "lv5能达到的具体能力描述。" } } },
              "lv6": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1, "description": "大师。" }, "说明": { "type": "string", "minLength": 1, "description": "lv6能达到的具体能力描述。" } } },
              "lv7": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1, "description": "传说。" }, "说明": { "type": "string", "minLength": 1, "description": "lv7能达到的具体能力描述。" } } }
            }
          },
          "requiredKnowledge": {
            "type": "array",
            "description": "该技能所需的知识领域名称列表，引用本人物已有的knowledge名称。",
            "items": { "type": "string" }
          },
          "requiredIntrinsicBase": {
            "type": "array",
            "description": "该技能所需的先天属性key列表。使用英文key：strength/agility/constitution/intelligence/perception/willpower/charisma。",
            "items": { "type": "string", "enum": ["strength", "agility", "constitution", "intelligence", "perception", "willpower", "charisma"] }
          },
          "reason": { "type": "string", "minLength": 1, "description": "达到该等级的原因，结合角色动机、处境、性格与过去经历，不得使用固定句式模板。" }
        }
      }
    },
    "knowledge": {
      "type": "array",
      "description": "知识领域数组。必须结合角色动机、处境、性格与过去经历尽可能列全。不超过5项。普通成年人至少有'现代常识'lv2-3。",
      "maxItems": 5,
      "items": {
        "type": "object",
        "required": ["name", "desc", "level", "levelEffects", "reason"],
        "additionalProperties": false,
        "properties": {
          "name": { "type": "string", "minLength": 1, "description": "知识领域名。" },
          "desc": { "type": "string", "minLength": 1, "description": "知识说明。" },
          "level": { "type": "integer", "minimum": 1, "maximum": 7, "description": "知识等级1-7。等级映射同skills。" },
          "levelEffects": {
            "type": "object",
            "description": "各等级效果，同skills.levelEffects格式。必须写满lv1到lv7全部七个等级。",
            "required": ["lv1", "lv2", "lv3", "lv4", "lv5", "lv6", "lv7"],
            "additionalProperties": false,
            "properties": {
              "lv1": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1 }, "说明": { "type": "string", "minLength": 1 } } },
              "lv2": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1 }, "说明": { "type": "string", "minLength": 1 } } },
              "lv3": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1 }, "说明": { "type": "string", "minLength": 1 } } },
              "lv4": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1 }, "说明": { "type": "string", "minLength": 1 } } },
              "lv5": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1 }, "说明": { "type": "string", "minLength": 1 } } },
              "lv6": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1 }, "说明": { "type": "string", "minLength": 1 } } },
              "lv7": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1 }, "说明": { "type": "string", "minLength": 1 } } }
            }
          },
          "reason": { "type": "string", "minLength": 1, "description": "达到该等级的原因，结合角色动机、处境、性格与过去经历，不得使用固定句式模板。" }
        }
      }
    },
    "professions": {
      "type": "array",
      "description": "职业数组。必须结合角色动机、处境、性格与过去经历尽可能列全。只有jobConfirmed=true或有明确职业证据时才生成，不确定时返回空数组。不超过5项。",
      "maxItems": 5,
      "items": {
        "type": "object",
        "required": ["name", "desc", "level", "levelEffects", "requiredSkills", "requiredKnowledge", "requiredIntrinsicBase", "reason"],
        "additionalProperties": false,
        "properties": {
          "name": { "type": "string", "minLength": 1, "description": "职业名。" },
          "desc": { "type": "string", "minLength": 1, "description": "职业说明。" },
          "level": { "type": "integer", "minimum": 1, "maximum": 7, "description": "职业等级1-7。等级映射同skills。" },
          "levelEffects": {
            "type": "object",
            "description": "各等级效果，同skills.levelEffects格式。必须写满lv1到lv7全部七个等级。",
            "required": ["lv1", "lv2", "lv3", "lv4", "lv5", "lv6", "lv7"],
            "additionalProperties": false,
            "properties": {
              "lv1": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1 }, "说明": { "type": "string", "minLength": 1 } } },
              "lv2": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1 }, "说明": { "type": "string", "minLength": 1 } } },
              "lv3": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1 }, "说明": { "type": "string", "minLength": 1 } } },
              "lv4": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1 }, "说明": { "type": "string", "minLength": 1 } } },
              "lv5": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1 }, "说明": { "type": "string", "minLength": 1 } } },
              "lv6": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1 }, "说明": { "type": "string", "minLength": 1 } } },
              "lv7": { "type": "object", "required": ["程度介绍", "说明"], "additionalProperties": false, "properties": { "程度介绍": { "type": "string", "minLength": 1 }, "说明": { "type": "string", "minLength": 1 } } }
            }
          },
          "requiredSkills": {
            "type": "array",
            "description": "该职业所需的技能名称列表，引用本人物已有的skill名称。",
            "items": { "type": "string" }
          },
          "requiredKnowledge": {
            "type": "array",
            "description": "该职业所需的知识领域名称列表，引用本人物已有的knowledge名称。",
            "items": { "type": "string" }
          },
          "requiredIntrinsicBase": {
            "type": "array",
            "description": "该职业所需的先天属性key列表。使用英文key：strength/agility/constitution/intelligence/perception/willpower/charisma。",
            "items": { "type": "string", "enum": ["strength", "agility", "constitution", "intelligence", "perception", "willpower", "charisma"] }
          },
          "reason": { "type": "string", "minLength": 1, "description": "选择该职业的原因，结合角色动机、处境、性格与过去经历，不得使用固定句式模板。" }
        }
      }
    }
  }
}

## 生成规则

1. `skills`/`knowledge`/`professions` 必须结合角色动机、处境、性格与过去经历尽可能列全。不可只写最明显的 1-2 项就停，应从输入推断所有合理项。
2. `skills` 每项 level 必须反映真实熟练度。不超过 4 项。
3. `knowledge` 普通成年人至少有"现代常识"lv2-3。不超过 5 项。
4. `skills` 每项必须包含 `requiredKnowledge` 和 `requiredIntrinsicBase`；`requiredKnowledge` 引用本人物已有的 knowledge 名称，`requiredIntrinsicBase` 使用英文 key（strength/agility/constitution/intelligence/perception/willpower/charisma）。
5. `professions` 只有明确职业证据时才生成，不超过 5 项。`requiredSkills`/`requiredKnowledge` 引用本人物已有的 skill/knowledge 名称；`requiredIntrinsicBase` 使用英文 key（strength/agility/constitution/intelligence/perception/willpower/charisma）。
6. 每项的 `levelEffects` 必须写满 lv1 到 lv7 全部七个等级，每级含 `程度介绍` 和 `说明`。
7. 根字段 `name` 必须与 Part1 已生成的基础信息中的姓名一致。
8. 所有含 `reason` 的字段（`skills[].reason`/`knowledge[].reason`/`professions[].reason`）必须结合角色动机、处境、性格与过去经历来写，不得使用固定句式模板，不得写空话。

## 完整 JSON 示例

{
  "name": "刘思琪",
  "skills": [
    {
      "name": "英语阅读",
      "desc": "具备较好的英语阅读理解能力。",
      "level": 3,
      "levelEffects": {
        "lv1": { "程度介绍": "入门", "说明": "能读懂简单短文" },
        "lv2": { "程度介绍": "初学", "说明": "能理解教材课文" },
        "lv3": { "程度介绍": "熟练", "说明": "能独立阅读中等难度英文材料" },
        "lv4": { "程度介绍": "专业", "说明": "能流畅阅读专业文献并进行学术翻译" },
        "lv5": { "程度介绍": "专家", "说明": "能欣赏文学作品的语言风格并做深度文本分析" },
        "lv6": { "程度介绍": "大师", "说明": "能驾驭多体裁英文写作并指导他人阅读方法" },
        "lv7": { "程度介绍": "传说", "说明": "对英语语言有直觉级理解，能感知文字背后的文化层与隐喻" }
      },
      "requiredKnowledge": ["英语", "高中课程"],
      "requiredIntrinsicBase": ["intelligence", "willpower"],
      "reason": "就读外国语学校，长期接受英语强化训练。"
    },
    {
      "name": "观察力",
      "desc": "善于观察周围人的情绪和细节变化。",
      "level": 2,
      "levelEffects": {
        "lv1": { "程度介绍": "入门", "说明": "能注意到明显的环境变化" },
        "lv2": { "程度介绍": "初学", "说明": "能察觉他人情绪波动和细微动作" },
        "lv3": { "程度介绍": "熟练", "说明": "能从微表情推断他人真实意图" },
        "lv4": { "程度介绍": "专业", "说明": "能在复杂社交场合捕捉多方动态并预判行为" },
        "lv5": { "程度介绍": "专家", "说明": "能识别群体中的隐藏关系和潜在冲突" },
        "lv6": { "程度介绍": "大师", "说明": "观察几乎无死角，能从极细微痕迹还原事件全貌" },
        "lv7": { "程度介绍": "传说", "说明": "超越常人感知极限，近乎读心般的洞察力" }
      },
      "requiredKnowledge": ["现代常识"],
      "requiredIntrinsicBase": ["perception", "willpower"],
      "reason": "性格内向安静，习惯默默观察而非主动表达。"
    }
  ],
  "knowledge": [
    {
      "name": "现代常识",
      "desc": "对现代都市社会的日常生活、基本规则和文化习俗的认知。",
      "level": 2,
      "levelEffects": {
        "lv1": { "程度介绍": "入门", "说明": "了解基本社会规则和日常用语" },
        "lv2": { "程度介绍": "初学", "说明": "能独立处理日常事务和简单社交场合" },
        "lv3": { "程度介绍": "熟练", "说明": "熟悉本地文化习俗和职场礼仪规范" },
        "lv4": { "程度介绍": "专业", "说明": "能应对跨文化社交场景和突发社会状况" },
        "lv5": { "程度介绍": "专家", "说明": "深度理解社会运作机制和潜规则" },
        "lv6": { "程度介绍": "大师", "说明": "能预判社会趋势和群体行为走向" },
        "lv7": { "程度介绍": "传说", "说明": "对社会运行有近乎直觉的洞察，能看透任何社会结构" }
      },
      "reason": "在深圳长大的高中生，日常接触现代都市生活。"
    },
    {
      "name": "高中课程",
      "desc": "对高中阶段各学科基础知识的掌握。",
      "level": 2,
      "levelEffects": {
        "lv1": { "程度介绍": "入门", "说明": "能跟上课堂基础内容" },
        "lv2": { "程度介绍": "初学", "说明": "能完成课后作业和基础考试" },
        "lv3": { "程度介绍": "熟练", "说明": "能独立理解重难点并辅导同学" },
        "lv4": { "程度介绍": "专业", "说明": "能跨学科应用知识并完成研究型课题" },
        "lv5": { "程度介绍": "专家", "说明": "掌握学科前沿动态，能撰写高质量论文" },
        "lv6": { "程度介绍": "大师", "说明": "对学科有系统性原创见解，能引领研究方向" },
        "lv7": { "程度介绍": "传说", "说明": "突破学科边界，其学术成果改变领域认知框架" }
      },
      "reason": "就读外国语学校高二，完成高一课程并进入二年级学习。"
    },
    {
      "name": "英语",
      "desc": "对英语语言的理解和运用能力。",
      "level": 3,
      "levelEffects": {
        "lv1": { "程度介绍": "入门", "说明": "能做简单日常对话" },
        "lv2": { "程度介绍": "初学", "说明": "能读懂基础文章" },
        "lv3": { "程度介绍": "熟练", "说明": "能阅读中等难度英文材料并完成写作" },
        "lv4": { "程度介绍": "专业", "说明": "能用英语进行专业领域讨论和学术演讲" },
        "lv5": { "程度介绍": "专家", "说明": "能翻译专业文献并理解英语文化语境中的深层含义" },
        "lv6": { "程度介绍": "大师", "说明": "能用英语创作文学作品并自如切换语体风格" },
        "lv7": { "程度介绍": "传说", "说明": "对英语的掌握接近母语直觉，能感知语言的演化脉络" }
      },
      "reason": "外国语学校长期英语强化训练，达到熟练水平。"
    }
  ],
  "professions": [
    {
      "name": "大数据开发工程师",
      "desc": "负责大数据平台的搭建、数据处理管道开发与数据仓库维护。",
      "level": 3,
      "levelEffects": {
        "lv1": { "程度介绍": "入门", "说明": "能编写基础SQL查询和简单ETL脚本" },
        "lv2": { "程度介绍": "初学", "说明": "能独立完成数据清洗和常规数据处理任务" },
        "lv3": { "程度介绍": "熟练", "说明": "能设计数据处理管道并优化作业性能" },
        "lv4": { "程度介绍": "专业", "说明": "能搭建完整数据仓库架构并解决复杂技术难题" },
        "lv5": { "程度介绍": "专家", "说明": "能主导大数据平台技术选型和整体架构设计" },
        "lv6": { "程度介绍": "大师", "说明": "能设计支撑亿级数据量的实时处理系统并培养团队" },
        "lv7": { "程度介绍": "传说", "说明": "对数据流动有直觉级理解，其架构设计成为行业标杆" }
      },
      "requiredSkills": ["英语阅读", "观察力"],
      "requiredKnowledge": ["英语", "现代常识"],
      "requiredIntrinsicBase": ["intelligence", "perception"],
      "reason": "深圳科技产业发达，大数据方向就业前景好，与英语和技术能力高度相关。"
    },
    {
      "name": "英语翻译",
      "desc": "负责中英双语文件的笔译、口译与本地化适配工作。",
      "level": 3,
      "levelEffects": {
        "lv1": { "程度介绍": "入门", "说明": "能完成简单短文的逐句翻译" },
        "lv2": { "程度介绍": "初学", "说明": "能翻译日常信件和一般性文章" },
        "lv3": { "程度介绍": "熟练", "说明": "能独立翻译专业领域文档并保证术语准确" },
        "lv4": { "程度介绍": "专业", "说明": "能处理高难度文学翻译和同声传译任务" },
        "lv5": { "程度介绍": "专家", "说明": "能完成文化适配和创意翻译，译文自然流畅" },
        "lv6": { "程度介绍": "大师", "说明": "译作被视为译界典范，能指导翻译团队和制定标准" },
        "lv7": { "程度介绍": "传说", "说明": "对两种语言的转换达到本能级，译文本身就是文学佳作" }
      },
      "requiredSkills": ["英语阅读"],
      "requiredKnowledge": ["英语", "高中课程"],
      "requiredIntrinsicBase": ["intelligence", "charisma"],
      "reason": "外国语学校长期英语强化训练，翻译方向是最直接的职业延伸。"
    },
    {
      "name": "心理咨询师",
      "desc": "通过谈话和评估帮助来访者理解情绪、解决心理困扰。",
      "level": 2,
      "levelEffects": {
        "lv1": { "程度介绍": "入门", "说明": "能倾听他人并给予基础情绪安抚" },
        "lv2": { "程度介绍": "初学", "说明": "能识别常见情绪问题并运用基本咨询技巧" },
        "lv3": { "程度介绍": "熟练", "说明": "能独立开展咨询会谈并制定干预方案" },
        "lv4": { "程度介绍": "专业", "说明": "能处理复杂心理问题并运用多种治疗流派" },
        "lv5": { "程度介绍": "专家", "说明": "能进行危机干预和督导初级咨询师" },
        "lv6": { "程度介绍": "大师", "说明": "在专业领域有原创贡献，能培养资深咨询师" },
        "lv7": { "程度介绍": "传说", "说明": "对人性理解近乎直觉，其方法论重塑行业认知" }
      },
      "requiredSkills": ["观察力"],
      "requiredKnowledge": ["现代常识", "高中课程"],
      "requiredIntrinsicBase": ["perception", "willpower", "charisma"],
      "reason": "心思细腻善于观察他人情绪，性格内向但共情能力强，适合心理咨询方向。"
    },
    {
      "name": "情报分析师",
      "desc": "从多源信息中提取关键情报、识别威胁并撰写分析报告。",
      "level": 2,
      "levelEffects": {
        "lv1": { "程度介绍": "入门", "说明": "能整理和归类基础信息资料" },
        "lv2": { "程度介绍": "初学", "说明": "能从信息中识别异常模式和关键线索" },
        "lv3": { "程度介绍": "熟练", "说明": "能独立完成情报搜集计划并撰写分析报告" },
        "lv4": { "程度介绍": "专业", "说明": "能构建情报网络并预判潜在风险" },
        "lv5": { "程度介绍": "专家", "说明": "能主导重大情报行动并协调多方资源" },
        "lv6": { "程度介绍": "大师", "说明": "能在信息迷雾中精准定位真相，培养精英分析团队" },
        "lv7": { "程度介绍": "传说", "说明": "对信息关联有超直觉洞察，其判断近乎预言" }
      },
      "requiredSkills": ["观察力", "英语阅读"],
      "requiredKnowledge": ["英语", "现代常识"],
      "requiredIntrinsicBase": ["perception", "intelligence"],
      "reason": "观察力强且心思细腻，善于捕捉细节和他人情绪，具备情报分析的潜质。"
    },
    {
      "name": "UI设计师",
      "desc": "负责产品界面的视觉设计、交互逻辑和用户体验优化。",
      "level": 1,
      "levelEffects": {
        "lv1": { "程度介绍": "入门", "说明": "能使用设计工具完成基础界面排版" },
        "lv2": { "程度介绍": "初学", "说明": "能设计符合规范的完整页面并考虑基本交互" },
        "lv3": { "程度介绍": "熟练", "说明": "能独立完成产品视觉体系和组件库设计" },
        "lv4": { "程度介绍": "专业", "说明": "能主导复杂产品的设计语言和用户体验策略" },
        "lv5": { "程度介绍": "专家", "说明": "能制定设计规范并推动跨团队设计一致性" },
        "lv6": { "程度介绍": "大师", "说明": "其设计作品定义行业审美标准，培养设计团队" },
        "lv7": { "程度介绍": "传说", "说明": "对美与交互有本能级直觉，其作品改变用户对产品的认知" }
      },
      "requiredSkills": ["观察力"],
      "requiredKnowledge": ["现代常识"],
      "requiredIntrinsicBase": ["perception", "charisma"],
      "reason": "对细节敏感且有审美直觉，深圳设计行业活跃，可作为兴趣探索方向。"
    }
  ]
}

注意：Schema优先级高于示例。当示例与字段定义冲突时，以字段定义为准。
