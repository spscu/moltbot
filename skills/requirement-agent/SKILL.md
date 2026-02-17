---

name: requirement-agent

description: 为当前项目创建需求文档或者更新需求文档，使得需求文档和代码功能对齐。检测当前项目是否存在 requirements.json：若无则执行初始化流程（扫描项目结构、推断功能、生成首版需求文档）；若有则执行更新流程（分析代码变更、增量更新需求）。触发场景：(1)初始化项目需求文档 (2)同步需求与代码变更 (3)生成/更新需求规格说明。

---

# 自动需求文档管理 (Auto Requirement Manager)



此 Skill 自动判断当前项目状态，执行**初始化**或**更新**流程，确保需求文档与项目代码保持同步。



---



## 🚀 Quick Start



### 首次初始化

```bash

# 无需任何操作，直接调用此 Skill 即可

# Skill 会自动扫描项目并生成 docs/requirements.json

```



### 后续更新

```bash

# 1. 收集上下文

python D:\DevSource\.shared-skills\auto-requirement\scripts\collect_context.py



# 2. 分析变更并生成 changes.json（由 AI 完成）



# 3. 合并变更

python D:\DevSource\.shared-skills\auto-requirement\scripts\merge_requirements.py -c changes.json



# 4. 渲染文档

python D:\DevSource\.shared-skills\auto-requirement\scripts\render_docs.py



# 5. 验证文档（可选）

python D:\DevSource\.shared-skills\auto-requirement\scripts\validate_requirements.py --verbose

```



---



## 🚦 入口判断 (执行前必做)



**首先检测当前项目的 `docs/requirements.json` 是否存在：**



```

IF docs/requirements.json 不存在:

    → 执行 [模式 A：初始化流程]

ELSE:

    → 执行 [模式 B：更新流程]

```



> [!NOTE]

> 所有需求文件均存放在项目的 `docs/` 文件夹中。如果该文件夹不存在，将自动创建。



---



## 模式 A：初始化流程 (冷启动)



当项目没有需求文档时，从零扫描项目并生成首版需求。



**核心原则：**

- 所有内容必须来自项目扫描结果

- 不允许凭空编写需求

- 不确定的地方必须标注【待确认】

- 输出必须专业、工程化、可追踪



### 执行步骤 (顺序执行，不可跳过)



```

Step 1: 项目结构扫描 → 识别模块、服务、配置、数据结构

Step 2: 功能推断 → 分析每个模块的职责、输入输出、依赖

Step 3: 业务流程抽象 → 提取业务流程、状态机、关键路径

Step 4: 数据与接口分析 → 识别数据结构、接口边界

Step 5: 需求文档生成 → 按 Schema 输出 JSON，标注实现状态

Step 6: 已实现追踪 → 标记实现状态

```



**详细工作流参考：** [workflow_init.md](references/workflow_init.md)



### 强约束规则



> [!CAUTION]

> 以下规则必须严格遵守：



1. **不允许凭空编写需求** - 所有内容必须追溯到代码

2. **不确定必须标注【待确认】**

3. **必须按 Schema 输出 JSON 格式**

4. **完成后必须执行渲染脚本生成 MD**



### 初始化完成后操作



1. 创建 `docs/` 文件夹（如不存在）

2. 将生成的 JSON 写入 `docs/requirements.json`

3. 验证文档格式：

   ```bash

   python D:\DevSource\.shared-skills\auto-requirement\scripts\validate_requirements.py

   ```

4. 执行渲染脚本生成 `docs/requirements.md`：

   ```bash

   python D:\DevSource\.shared-skills\auto-requirement\scripts\render_docs.py

   ```



---



## 模式 B：更新流程 (热更新)



当项目已有需求文档时，基于代码变更**增量更新**（不重写整个文件）。



### 执行步骤



1.  **运行收集脚本**：

    执行以下命令获取 Diff 信息和当前 JSON 数据：

    ```bash

    # 基础用法

    python D:\DevSource\.shared-skills\auto-requirement\scripts\collect_context.py

    

    # 高级选项

    python D:\DevSource\.shared-skills\auto-requirement\scripts\collect_context.py --commits 10  # 分析最近10次提交

    python D:\DevSource\.shared-skills\auto-requirement\scripts\collect_context.py --extensions py,js  # 只关注特定文件

    python D:\DevSource\.shared-skills\auto-requirement\scripts\collect_context.py --staged  # 只分析暂存区

    ```



2.  **分析阶段**：

    *   读取收集脚本的输出。

    *   识别 **业务逻辑** 的变更。**忽略** 纯粹的代码重构、格式调整或不影响非功能性需求的基础设施调整。

    *   将变更映射到 `requirements.json` 的 ID。

    *   如果是新需求，可以不指定 ID，合并脚本会自动分配。

    *   如果是现有需求的修改，保留原 ID。



3.  **输出变更数据** (关键步骤)：

    

    > [!IMPORTANT]

    > **不要输出完整的 requirements.json！只输出变更部分。**

    

    按以下格式输出 JSON 变更数据：

    ```json

    {

      "add": [

        {

          "title": "新功能标题",

          "description": "功能详细描述",

          "module": "core",

          "type": "feature",

          "priority": "medium",

          "status": "active",

          "implementation_status": "not_implemented",

          "acceptance_criteria": [

            "验收条件1",

            "验收条件2"

          ],

          "dependencies": ["REQ-001"],

          "related_files": ["src/new_feature.py"]

        }

      ],

      "update": [

        {

          "id": "REQ-001",

          "description": "更新后的描述",

          "implementation_status": "implemented",

          "related_files": ["file1.py", "file2.py"]

        }

      ],

      "delete": ["REQ-003"]

    }

    ```

    

    **说明：**

    - `add`: 新增的需求条目（ID 可选，不提供则自动生成）

    - `update`: 更新的需求（只需包含 `id` 和要修改的字段）

    - `delete`: 要删除的需求 ID 列表

    - 如果某个操作没有内容，可以省略或设为空数组



4.  **执行合并脚本**：

    

    首先使用 `write_to_file` 将变更数据保存到临时文件 `changes.json`，然后执行脚本：

    

    ```bash

    # 基础用法（自动备份 + 自动生成ID）

    python D:\DevSource\.shared-skills\auto-requirement\scripts\merge_requirements.py --changes changes.json

    

    # 跳过备份

    python D:\DevSource\.shared-skills\auto-requirement\scripts\merge_requirements.py -c changes.json --no-backup

    

    # 禁用自动ID生成

    python D:\DevSource\.shared-skills\auto-requirement\scripts\merge_requirements.py -c changes.json --no-auto-id

    ```

    

    脚本会自动：

    - 备份原文件到 `docs/backups/` 目录

    - 为新增需求自动分配 ID

    - 按 ID 匹配执行增量合并

    - 保存结果并更新时间戳

    

    *（脚本执行成功后，可以删除 changes.json 文件）*



5.  **验证阶段**（可选但推荐）：

    ```bash

    python D:\DevSource\.shared-skills\auto-requirement\scripts\validate_requirements.py --verbose

    ```



6.  **渲染阶段**：

    执行渲染脚本生成 Markdown：

    ```bash

    python D:\DevSource\.shared-skills\auto-requirement\scripts\render_docs.py

    ```



---



## 📜 Schema 参考



严格的 JSON 结构定义请参考 `assets/requirements_schema.json`。



### 需求字段说明



| 字段 | 类型 | 必填 | 说明 |

|------|------|:----:|------|

| `id` | string | ✅ | 唯一标识符，格式: REQ-XXX |

| `title` | string | ✅ | 需求简短标题 |

| `description` | string | ✅ | 详细描述 |

| `status` | enum | ✅ | draft/active/completed/deprecated |

| `module` | string | | 所属模块名称 |

| `type` | enum | | feature/bugfix/optimization/technical/security |

| `priority` | enum | | critical/high/medium/low |

| `implementation_status` | enum | | implemented/partial/interface_only/not_implemented |

| `acceptance_criteria` | array | | 验收标准列表 |

| `dependencies` | array | | 依赖的其他需求 ID |

| `related_files` | array | | 关联的代码文件路径 |

| `notes` | string | | 备注信息 |



---



## 🛠️ 脚本工具集



| 脚本 | 功能 | 常用参数 |

|------|------|----------|

| `collect_context.py` | 收集项目上下文 | `--commits N`, `--extensions ext`, `--staged` |

| `merge_requirements.py` | 增量合并变更 | `--changes file`, `--no-backup`, `--no-auto-id` |

| `render_docs.py` | 渲染为 Markdown | (无参数) |

| `validate_requirements.py` | 验证文档格式 | `--verbose`, `--strict` |



---



## 关于跨项目使用



> [!TIP]

> 此 Skill 是**用户级**配置，可在任意项目中使用：

> - Skill 文件位于 `D:\DevSource\.shared-skills\auto-requirement`

> - 脚本使用 `Path.cwd()` 获取当前工作目录，因此会自动适配不同项目



## 实现状态标记



| 状态 | 图标 | 说明 |

|------|:----:|------|

| implemented | ✅ | 功能完整实现 |

| partial | 🔶 | 有代码但不完整 |

| interface_only | 📝 | 有接口定义无实现 |

| not_implemented | ❌ | 无相关代码 |

