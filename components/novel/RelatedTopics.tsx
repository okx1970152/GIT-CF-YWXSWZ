import Link from "next/link";

type RelatedTopicsProps = {
  topics: string[];
};

/** Server-rendered crawlable anchors; styled per SEO spec (10px, gray). */
export function RelatedTopics({ topics }: RelatedTopicsProps) {
  if (!topics.length) return null;

  return (
    <nav aria-label="Related topics" className="seo-topics mt-4 border-t border-emerald-900/10 pt-4">
      <p className="mb-2 font-sans text-[10px] font-medium uppercase tracking-wide text-slate-400">
        Related Topics
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-2 font-sans">
        {topics.map((topic) => (
          <Link
            key={topic}
            href={`/search?q=${encodeURIComponent(topic)}`}
            className="text-[10px] text-gray-500 underline decoration-gray-400/60 underline-offset-2 hover:text-emerald-800"
          >
            #{topic}
          </Link>
        ))}
      </div>
    </nav>
  );
}
