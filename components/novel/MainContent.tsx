import { AdSlot } from "@/components/ads/AdSlot";
import { splitChapterHtmlAtHalfParagraphs } from "@/lib/splitChapterHtml";
import { cn } from "@/lib/cn";

type MainContentProps = {
  chapterHtml: string;
  className?: string;
};

export function MainContent({ chapterHtml, className }: MainContentProps) {
  const { first, second } = splitChapterHtmlAtHalfParagraphs(chapterHtml);

  return (
    <div className={cn("reader-text mt-6 min-w-0 max-w-[min(100%,900px)] xl:max-w-[880px]", className)}>
      <AdSlot page="reading" position="top" />
      <div
        className="prose prose-lg xl:prose-xl max-w-none break-words font-serif leading-relaxed text-inherit prose-p:leading-relaxed prose-headings:text-[var(--text-deep)] prose-p:text-[var(--text-deep)]"
        dangerouslySetInnerHTML={{ __html: first }}
      />
      {second ? (
        <>
          <AdSlot page="reading" position="mid" />
          <div
            className="prose prose-lg xl:prose-xl max-w-none break-words font-serif leading-relaxed text-inherit prose-p:leading-relaxed prose-headings:text-[var(--text-deep)] prose-p:text-[var(--text-deep)]"
            dangerouslySetInnerHTML={{ __html: second }}
          />
        </>
      ) : (
        <AdSlot page="reading" position="mid" />
      )}
      <AdSlot page="reading" position="bottom" />
    </div>
  );
}
