# novel_producer（第一版骨架）

## 当前已完成（V0 骨架）

1. 自动扫描 `data/01-sucai` 下符合 `<category>-<中文小说名>` 规则的小说目录  
2. 命令行编号选择要处理的小说  
3. 解析分类与中文小说名  
4. 初始化目标工作区：
   - `novels/<category>/<novel_slug>/info`
   - `novels/<category>/<novel_slug>/chapters`
   - `novels/<category>/<novel_slug>/annotations`
   - `novels/<category>/<novel_slug>/meta`
5. 初始化断点进度文件：
   - `runtime/chapter_progress/<novel_slug>/progress.json`
6. 章节发现与排序（按 `数字-标题.txt`）
7. 双轮模型调用链（已接入 DeepSeek）：
   - 正文轮：`1+2+3+4+6`
   - 导读轮：`1+2+3+5+6`
   - JSON 解析失败自动重试一次
8. 章节级产物落盘：
   - `chapters/<code>-<slug>.md`
   - `annotations/<code>-<slug>-guide.md`
   - `meta/<code>-<slug>.json`
9. 首次自动生成：
   - `info/index.md`
   - `meta/novel.json`
10. 增量术语维护：
   - 自动把正文/导读轮返回的增量条目追加到 `6-增量术语与临时规则.md`

## 运行方式

```bash
python main.py
```

## 运行前准备

```bash
set DEEPSEEK_API_KEY=你的key
```

## 说明

- 当前 slug 采用首版兜底策略，后续会接入模型生成正式英文小说名。  
- 运行前需保证每本小说目录内存在 `00-提示词前缀` 且含 1~6 六个文件。  
