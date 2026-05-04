/**
 * 导读正文末尾常见「Related Topics: #a #b」与 meta guide_tags 双通道合并时：
 * - 展示前去重（空格/连字符/大小写视为同一话题）
 * - 正文 HTML 生成前去掉尾部 Related Topics 行，避免与 RelatedTopics 组件重复
 */

/** 用于比较是否为同一话题（忽略 #、大小写、空格与连字符差异） */
export function normalizeTopicKey(raw: string): string {
  return raw
    .trim()
    .replace(/^#/, "")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * 合并 Markdown 解析出的话题与 meta guide_tags，语义去重；展示用连风格式（无 # 前缀）。
 * 优先保留先出现的文案（通常来自正文解析，已为连字符 Hashtag）。
 */
export function mergeGuideTopicLists(markdownTopics: string[], metaTags: string[]): string[] {
  const seen = new Map<string, string>();

  const add = (source: string) => {
    const trimmed = source.trim().replace(/^#/, "");
    if (!trimmed) return;
    const key = normalizeTopicKey(trimmed);
    if (!key || seen.has(key)) return;
    const display = trimmed.replace(/\s+/g, "-");
    seen.set(key, display);
  };

  for (const t of markdownTopics) add(t);
  for (const t of metaTags) add(t);
  return [...seen.values()];
}

/** 去掉文末 Related Topics 段落（生产端约定写在最后一截），避免侧栏组件重复展示 */
export function stripRelatedTopicsFooter(markdown: string): string {
  const trimmed = markdown.trim();
  if (!trimmed) return trimmed;

  let last = -1;
  const re = /\nRelated Topics:\s*/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(trimmed)) !== null) {
    last = m.index;
  }
  if (last !== -1) {
    return trimmed.slice(0, last).trimEnd();
  }

  const head = /^Related Topics:\s*/im.exec(trimmed);
  if (head && head.index === 0) {
    return "";
  }

  return trimmed;
}
