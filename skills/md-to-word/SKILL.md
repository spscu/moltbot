# 技能：Markdown 转 Word 文档

## 角色
你是一位专业的文档转换专家，精通 Markdown 和 Word 文档格式，能够将 Markdown 文件转换为格式完美的 Word 文档。

## 任务
将用户指定的 Markdown 文件转换为 Word 文档格式，自动处理图片、格式、层级结构等内容。

## 核心功能

### 1. 基础转换
- 将 Markdown 标题转换为 Word 标题样式（H1 → Heading 1, H2 → Heading 2）
- 保留列表结构（无序列表、有序列表）
- 处理文本格式（粗体、斜体、高亮等）
- 统一字体颜色为黑色

### 2. 图片处理
- 自动识别 Markdown 中的图片引用 `![[图片名称]]`
- 在 `attachments` 目录中查找对应的图片文件
- 将图片插入到 Word 文档的对应位置
- 如果图片不存在，添加灰色的提示文本 `[图片未找到: xxx]`

### 3. 格式优化
- 统一字体为微软雅黑，字号 11pt
- 行间距采用1.5倍行距
- 标题文字设置为黑色
- 图片居中对齐
- 保留原文档的缩进层级

## 输入参数

### 必需参数
- `markdown_file`: Markdown 文件的相对路径（从 vault 根目录开始）

### 可选参数
- `output_file`: 输出的 Word 文件名（默认：与 Markdown 文件同名，扩展名改为 .docx）
- `attachments_dir`: 附件目录路径（默认：`attachments`）

## 输出格式

### 成功输出
```
✓ 转换成功！
- 源文件：{markdown_file}
- 目标文件：{output_file_path}
- 图片数量：{count} 张
```

### 错误输出
```
✗ 转换失败：{错误原因}
```

## 使用示例

### 示例 1：基础转换
```bash
# 将项目文档转换为 Word
/md-to-word IT/API.md
```

### 示例 2：指定输出文件名
```bash
# 转换并指定输出文件名
/md-to-word Jwork/国网技经实验室/特高压/特高压系统演示20260122.md 特高压演示.docx
```

### 示例 3：批量转换
```bash
# 转换多个文档
/md-to-word notes/财务分析.md
/md-to-word notes/代码审查.md
/md-to-word notes/测试报告.md
```

## 实现细节

### 图片查找逻辑
1. 提取 Markdown 中的图片名称（如 `Pasted image 20260122084257.png`）
2. 在 `attachments` 目录中查找匹配的文件
3. 支持直接匹配和模糊匹配（处理空格等问题）
4. 找到图片则插入，找不到则添加提示文本

### 格式映射
| Markdown | Word 样式 |
|----------|-----------|
| `**一、**` | Heading 1 |
| `**粗体标题**` | Heading 2 |
| `==高亮==` | 粗体 + 黑色 |
```![图片]]```
 | 居中图片 |
| `\t\t文本` | List Bullet 3 |
| `\t文本` | List Bullet 2 |
| `- 列表` | List Bullet |

## 约束条件

1. **只读操作**：不修改原始 Markdown 文件
2. **输出路径**：默认保存到桌面，可通过参数指定
3. **文件编码**：统一使用 UTF-8 编码
4. **图片格式**：支持 PNG、JPG、JPEG、GIF 等常见格式
5. **文件大小限制**：建议单个 Markdown 文件不超过 10MB

## 异常处理

### 文件不存在
```
✗ 错误：找不到指定的 Markdown 文件
请检查文件路径是否正确
```

### 图片缺失
```
⚠ 警告：图片 "xxx.png" 未找到
已添加占位文本到文档中
```

### 编码错误
```
✗ 错误：文件编码不是 UTF-8
请先将文件转换为 UTF-8 编码
```

## 依赖库

```python
from docx import Document
from docx.shared import RGBColor, Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
import os
import re
```

## 技术栈

- **Python**: 3.8+
- **python-docx**: Word 文档操作
- **标准库**: os, re, sys

## 最佳实践

1. **转换前检查**：确保 Markdown 文件编码为 UTF-8
2. **图片准备**：将所有图片放在 `attachments` 目录中
3. **格式验证**：转换后在 Word 中检查格式是否正确
4. **批量处理**：可以使用脚本批量转换多个文件

## 相关资源

- 脚本位置：`[[scripts/md_to_word_enhanced.py]]`
- 测试文件：`[[Jwork/国网技经实验室/特高压/特高压系统演示20260122.md]]`
- python-docx 文档：https://python-docx.readthedocs.io/

## 格式配置

脚本内置 `FORMAT_CONFIG` 配置字典，可根据目标文档调整以下参数：

### 字号设置 (单位: pt)
| 参数 | 默认值 | 说明 |
|------|--------|------|
| `title_size` | 20 | 文档标题字号 |
| `heading1_size` | 14 | 一级标题字号 |
| `heading2_size` | 14 | 二级标题字号 |
| `body_size` | 14 | 正文字号 |
| `list_size` | 14 | 列表字号 |

### 段落格式
| 参数 | 默认值 | 说明 |
|------|--------|------|
| `font_name` | 微软雅黑 | 中文字体 |
| `line_spacing` | 1.0 | 行距倍数 (1.0=单倍, 1.5=1.5倍) |
| `first_line_indent` | 0 | 首行缩进 (pt, 36约为2个中文字符) |
| `heading1_space_before` | 24 | 一级标题段前间距 (pt) |
| `heading2_space_before` | 10 | 二级标题段前间距 (pt) |
| `list_left_indent` | 39 | 列表左缩进 (pt) |

### 动态修改配置

```python
from scripts.md_to_word_enhanced import update_format_config, parse_markdown_to_word

# 修改配置
update_format_config(
    body_size=12,           # 改为12pt正文
    line_spacing=1.5,       # 改为1.5倍行距
    first_line_indent=36    # 启用首行缩进
)

# 然后转换
parse_markdown_to_word('input.md', 'output.docx')
```

## 版本历史

- **v1.0** (2026-01-27): 初始版本，支持基础转换和图片插入
- **v1.1** (2026-01-27): 修复字体颜色问题，统一为黑色；增强图片查找逻辑
- **v1.2** (2026-02-03): 新增格式配置系统，支持自定义字号(14pt)、行距(单倍)、首行缩进等；增强标题识别、行内粗体解析、有序列表支持

## 反馈与改进

如果遇到问题或有改进建议，请：
1. 检查 Markdown 文件格式是否规范
2. 确认图片文件存在于 `attachments` 目录
3. 查看错误日志了解详细问题
