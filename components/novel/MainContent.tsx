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
    <div
      className={cn("reader-text mt-6 min-w-0 max-w-[min(100%,900px)] xl:max-w-[880px]", className)}
      style={{ color: "var(--reader-fg, var(--text-deep))", fontSize: "var(--reader-content-font-size, 20px)" }}
    >
      <AdSlot page="reading" position="top" />
      <div
        className="prose max-w-none break-words font-serif leading-relaxed text-inherit prose-p:leading-relaxed [&_h1]:text-inherit [&_h2]:text-inherit [&_h3]:text-inherit [&_h4]:text-inherit [&_p]:text-inherit [&_li]:text-inherit [&_p]:text-[length:inherit] [&_li]:text-[length:inherit] [&_ul]:text-[length:inherit] [&_ol]:text-[length:inherit] [&_blockquote]:text-[length:inherit] [&_h1]:text-[length:inherit] [&_h2]:text-[length:inherit] [&_h3]:text-[length:inherit] [&_h4]:text-[length:inherit]"
        dangerouslySetInnerHTML={{ __html: first }}
      />
      {second ? (
        <>
          <AdSlot page="reading" position="mid" />
          <div
            className="prose max-w-none break-words font-serif leading-relaxed text-inherit prose-p:leading-relaxed [&_h1]:text-inherit [&_h2]:text-inherit [&_h3]:text-inherit [&_h4]:text-inherit [&_p]:text-inherit [&_li]:text-inherit [&_p]:text-[length:inherit] [&_li]:text-[length:inherit] [&_ul]:text-[length:inherit] [&_ol]:text-[length:inherit] [&_blockquote]:text-[length:inherit] [&_h1]:text-[length:inherit] [&_h2]:text-[length:inherit] [&_h3]:text-[length:inherit] [&_h4]:text-[length:inherit]"
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
