# cn-math-taxonomy 数据说明

## 来源与许可

- 仓库：<https://github.com/xiaoyang111222/cn-math-taxonomy>
- 许可：**CC BY-NC 4.0**（署名—非商业性使用 4.0 国际）
- 商业使用（付费课程、付费 App、机构收费服务等）需向原作者单独取得授权。
- Sapere 不分发该数据，只提供读取脚本；数据由用户自行获取并保存在本地工作区。

引用图谱结论时应注明来源与许可，不得移除原仓库的版权声明。

## 文件结构

`data/` 目录下与本草稿技能相关的三个文件：

| 文件 | 内容 | 是否必需 |
| --- | --- | --- |
| `topics.json` | 知识点数组 | 必需 |
| `dependencies.json` | 先修边数组 | 必需 |
| `questions.json` | 题库数组 | 可选 |

仓库中另有 `cn-curriculum-standards.json` 等文件，本技能暂不读取。

## topics.json

```json
{
  "id": "cnm_p001",
  "name": "1到5各数的认识",
  "domain": "数与代数",
  "grade": 1,
  "semester": "上",
  "chapter": "一年级上册 第1单元 5以内数的认识和加、减法",
  "type": "conceptual",
  "description": "……",
  "mastery_criteria": ["能按顺序数出 1 到 5", "……"],
  "diagnostic_question": { "question": "3 的后一个数是几？", "answer": "4" },
  "external": false,
  "standards": [{ "id": "cms-2022:1.NA.01", "confidence": "exact" }],
  "root_reason": "……"
}
```

- `grade`：1–6 小学，7–9 初中，10–12 高中；13–16 为高中选择性必修阶段（英语 13–16、
  数学 12–14 等，具体见脚本 `gradeLabel`）。
- `type`：`conceptual` / `procedural` / `reasoning` / `application` / `modeling`。
- `external`：是否为外部引入的节点。
- `standards`：对应课标条目，`confidence` 表示对齐置信度；条目文本是转述，不是官方原文。

学科由 id 前缀区分：

| 前缀 | 学科 | 数量 |
| --- | --- | ---: |
| `cnm` | 数学 | 870 |
| `cne` | 英语 | 791 |
| `cnc` | 语文 | 683 |
| `cnp` | 物理 | 269 |
| `cnd` | 道德与法治 | 269 |
| `cns` | 科学 | 269 |
| `cnk` | 化学 | 147 |
| `cnh` | 历史 | 134 |
| `cnb` | 生物 | 66 |
| `cng` | 地理 | 59 |

合计 3557 个知识点；各学科独立成图，英语、物理等不与数学连边。

## dependencies.json

```json
{
  "topicId": "cnm_p002",
  "prerequisiteId": "cnm_p001",
  "strength": "hard",
  "reason": "学习“5以内数的大小比较”需要先掌握“1到5各数的认识”"
}
```

- `strength`：`hard` 为必须满足的先修，`soft` 为建议铺垫。
- 语义是“topicId 依赖 prerequisiteId”，即 `prerequisiteId` 应在前学习。

## questions.json

```json
{
  "id": "cnm_p001_q1",
  "topicId": "cnm_p001",
  "difficulty": "basic",
  "type": "numeric",
  "prompt": "3 的后一个数是几？",
  "answer": "4",
  "explanation": "……",
  "verify": "3+1"
}
```

- `verify` 是可执行校验表达式，仅部分题目提供。
- 原仓库说明：小学与初中数学题有自动核验，高中题与英语题未做盲解复核。

## 已知限制

- 先修关系、掌握标准与题目答案仍需一线教师审核。
- 部分册次目录未逐页核对官方教材，标注“待核”的内容不应作为官方原文引用。
- 图谱覆盖中小学学科，不覆盖成人技术学习内容。
