import Link from "next/link";
import type { NovelInfo } from "@/lib/content/schema";
import type { ChapterItem } from "@/lib/content/chapters";
import { AdSlot } from "@/components/ads/AdSlot";

type DirectoryPageProps = {
  novel: NovelInfo;
  chapters: ChapterItem[];
};

export function DirectoryPage({ novel, chapters }: DirectoryPageProps) {
  const firstChapter = chapters[0];
  const latestChapter = chapters[chapters.length - 1];

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-16 pt-6">
      <section aria-label={`${novel.title} semantic summary`} className="sr-only">
        <h1>{novel.title}</h1>
        <p>{novel.desc}</p>
      </section>

      <AdSlot page="directory" position="top" />

      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-serif text-lg leading-relaxed text-[var(--text-soft)]">{novel.desc}</p>
            <dl className="mt-6 grid gap-2 font-sans text-sm text-[var(--text-soft)] sm:grid-cols-2">
              <div>
                <dt className="text-[var(--text-muted)]">Author</dt>
                <dd className="font-medium text-[var(--text-deep)]">{novel.author}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Status</dt>
                <dd className="font-medium text-[var(--text-deep)]">{novel.status}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Category</dt>
                <dd className="font-medium text-[var(--text-deep)]">{novel.category}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Total chapters</dt>
                <dd className="font-medium text-[var(--text-deep)]">{novel.total_chapters}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[var(--text-muted)]">Updated</dt>
                <dd className="font-medium text-[var(--text-deep)]">{novel.updated_at}</dd>
              </div>
            </dl>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-3 sm:flex-row lg:w-auto lg:flex-col">
            {firstChapter ? (
              <Link
                href={`/novels/${novel.categorySlug}/${novel.novelId}/chapters/${firstChapter.chapterNo}`}
                className="rounded-xl bg-[var(--accent-green)] px-5 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#06a552] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
              >
                Start reading
              </Link>
            ) : (
              <span className="rounded-xl border border-dashed border-[var(--border-soft)] px-5 py-3 text-center text-sm text-[var(--text-muted)]">
                No chapters yet
              </span>
            )}
            {latestChapter ? (
              <Link
                href={`/novels/${novel.categorySlug}/${novel.novelId}/chapters/${latestChapter.chapterNo}`}
                className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-5 py-3 text-center text-sm font-semibold text-[var(--text-deep)] hover:bg-[#ddeedd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
              >
                Latest chapter
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <AdSlot page="directory" position="mid" />

      <section className="mt-10" aria-labelledby="chapter-list-heading">
        <h2 id="chapter-list-heading" className="font-serif text-2xl font-semibold text-[var(--text-deep)]">
          Chapters
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((chapter) => (
            <li key={chapter.chapterNo} className="min-w-0">
              <Link
                href={`/novels/${novel.categorySlug}/${novel.novelId}/chapters/${chapter.chapterNo}`}
                className="flex h-full items-center justify-between gap-4 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-4 py-3 font-serif text-[var(--text-deep)] hover:bg-[#ddeedd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
              >
                <span className="min-w-0">
                  <span className="line-clamp-2 block font-medium">
                    {chapter.chapterNo} — {chapter.title}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    {firstChapter?.chapterNo === chapter.chapterNo ? (
                      <span className="rounded-full border border-[#9cd8b5] bg-[#e9f8ef] px-2 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wide text-[#058c46]">
                        Start
                      </span>
                    ) : null}
                    {latestChapter?.chapterNo === chapter.chapterNo ? (
                      <span className="rounded-full border border-[#9cd8b5] bg-[#e9f8ef] px-2 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wide text-[#058c46]">
                        Latest
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-[#058c46]">Read →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <AdSlot page="directory" position="bottom" />
    </div>
  );
}
