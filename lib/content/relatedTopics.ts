const RELATED_TOPICS_PATTERN = /(?:^|\n)Related Topics:\s*((?:#[A-Za-z0-9_-]+\s*)+)$/m;

export function parseRelatedTopics(markdown: string): string[] {
  const match = markdown.match(RELATED_TOPICS_PATTERN);
  if (!match) return [];

  return match[1]
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/^#/, ""));
}

export function stripRelatedTopicsFromGuide(markdown: string): string {
  return markdown.replace(RELATED_TOPICS_PATTERN, "").trim();
}
