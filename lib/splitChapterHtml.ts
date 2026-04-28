/** Split rendered chapter HTML after ~half of <p> blocks for mid-page ad insertion. */
export function splitChapterHtmlAtHalfParagraphs(html: string): { first: string; second: string } {
  const pRegex = /<p\b[^>]*>[\s\S]*?<\/p>/gi;
  const matches = html.match(pRegex);
  if (!matches || matches.length <= 1) {
    return { first: html, second: "" };
  }
  const mid = Math.ceil(matches.length / 2);
  const first = matches.slice(0, mid).join("");
  const second = matches.slice(mid).join("");
  return { first, second };
}
