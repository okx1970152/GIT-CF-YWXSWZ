import Link from "next/link";
import { normalizeTopicKey } from "@/lib/content/guide-topics";

type RelatedTopicsProps = {
  topics: string[];
};

/** Server-rendered crawlable anchors; styled per SEO spec (10px, gray). */
export function RelatedTopics({ topics }: RelatedTopicsProps) {
  if (!topics.length) return null;

  return (
    <nav aria-label="Related topics" className="seo-topics mt-4 border-t border-[var(--border-soft)] pt-4">
      <p className="mb-2 font-sans text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        Related Topics
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-2 font-sans">
        {topics.map((topic) => (
          <Link
            key={normalizeTopicKey(topic)}
            href={`/search?q=${encodeURIComponent(topic)}`}
            className="text-[10px] text-[var(--text-soft)] underline decoration-[var(--border-soft)]/80 underline-offset-2 hover:text-[#058c46]"
          >
            #{topic}
          </Link>
        ))}
      </div>
    </nav>
  );
}
