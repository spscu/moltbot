---
name: Word 文档自动排版 Skills
description: 提供原子化的 Word 文档格式设置能力，支持字体、字号、行距、对齐等排版操作
version: 1.0.0
---

# Word 文档自动排版 Skills

这是一套遵循原子性和单一职责原则的 Word 文档排版工具集，可通过自然语言调用。

## Skills 列表

### 1. set_font（设置字体）

**功能**：设置指定类型段落的字体名称

**参数**：
- `file_path` (string, required): Word 文件的绝对路径
- `style_type` (string, required): 段落类型
  - 可选值: `heading`（标题）, `body`（正文）, `table`（表格）, `all`（全部）
- `font_name` (string, required): 字体名称
  - 常用值: `宋体`, `黑体`, `微软雅黑`, `楷体`, `仿宋`, `Times New Roman`, `Arial`

**返回值**：
- `success` (boolean): 是否执行成功
- `affected_paragraphs` (number): 影响的段落数量
- `message` (string): 执行结果说明

**示例调用**：
```
请将文档标题设置为宋体
→ set_font(file_path="d:/test.docx", style_type="heading", font_name="宋体")
```

---

### 2. set_font_size（设置字号）

**功能**：设置指定类型段落的字体大小

**参数**：
- `file_path` (string, required): Word 文件的绝对路径
- `style_type` (string, required): 段落类型（同上）
- `font_size` (number, required): 字号大小（单位：磅 pt）
  - 常用值: 
    - 初号=42, 小初=36, 一号=26, 小一=24
    - 二号=22, 小二=18, 三号=16, 小三=15
    - 四号=14, 小四=12, 五号=10.5, 小五=9

**返回值**：同上

**示例调用**：
```
标题用小四号
→ set_font_size(file_path="d:/test.docx", style_type="heading", font_size=12)
```

---

### 3. set_bold（设置加粗）

**功能**：设置指定类型段落的加粗样式

**参数**：
- `file_path` (string, required): Word 文件的绝对路径
- `style_type` (string, required): 段落类型（同上）
- `bold` (boolean, required): 是否加粗

**返回值**：同上

**示例调用**：
```
标题设置为加粗
→ set_bold(file_path="d:/test.docx", style_type="heading", bold=true)
```

---

### 4. set_line_spacing（设置行距）

**功能**：设置指定类型段落的行距

**参数**：
- `file_path` (string, required): Word 文件的绝对路径
- `style_type` (string, required): 段落类型（同上）
- `line_spacing` (number, required): 行距倍数
  - 常用值: 1.0（单倍）, 1.15, 1.5（1.5倍）, 2.0（2倍）

**返回值**：同上

**示例调用**：
```
正文设置为1.5倍行距
→ set_line_spacing(file_path="d:/test.docx", style_type="body", line_spacing=1.5)
```

---

### 5. set_alignment（设置段落对齐）

**功能**：设置指定类型段落的对齐方式

**参数**：
- `file_path` (string, required): Word 文件的绝对路径
- `style_type` (string, required): 段落类型（同上）
- `alignment` (string, required): 对齐方式
  - 可选值: `left`（左对齐）, `center`（居中）, `right`（右对齐）, `justify`（两端对齐）

**返回值**：同上

**示例调用**：
```
标题居中对齐
→ set_alignment(file_path="d:/test.docx", style_type="heading", alignment="center")
```

---

### 6. set_first_line_indent（设置首行缩进）

**功能**：设置指定类型段落的首行缩进

**参数**：
- `file_path` (string, required): Word 文件的绝对路径
- `style_type` (string, required): 段落类型（同上）
- `indent_chars` (number, required): 缩进字符数
  - 常用值: 0（无缩进）, 2（2字符）, 4（4字符）

**返回值**：同上

**示例调用**：
```
正文首行缩进2个字符
→ set_first_line_indent(file_path="d:/test.docx", style_type="body", indent_chars=2)
```

---

## 组合使用示例

**用户需求**："标题用宋体小四加粗居中，正文用微软雅黑五号1.5倍行距首行缩进2字符"

**AI 模型应调用**：
```
1. set_font(file_path="d:/test.docx", style_type="heading", font_name="宋体")
2. set_font_size(file_path="d:/test.docx", style_type="heading", font_size=12)
3. set_bold(file_path="d:/test.docx", style_type="heading", bold=true)
4. set_alignment(file_path="d:/test.docx", style_type="heading", alignment="center")
5. set_font(file_path="d:/test.docx", style_type="body", font_name="微软雅黑")
6. set_font_size(file_path="d:/test.docx", style_type="body", font_size=10.5)
7. set_line_spacing(file_path="d:/test.docx", style_type="body", line_spacing=1.5)
8. set_first_line_indent(file_path="d:/test.docx", style_type="body", indent_chars=2)
```

---

## 技术实现

- **执行引擎**: `word_formatting_engine.py`
- **依赖库**: `python-docx`
- **支持格式**: `.docx` (Word 2007+)

---

## 注意事项

1. 文件路径必须使用绝对路径
2. 操作会直接修改原文件，建议先备份
3. 仅支持 `.docx` 格式，不支持 `.doc` 旧格式
4. 字号使用磅值（pt），需要根据中文字号对应转换
# 测试自动同步功能
