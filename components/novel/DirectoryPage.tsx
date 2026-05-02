import Link from "next/link";
import type { NovelInfo } from "@/lib/content/schema";
import type { ChapterItem } from "@/lib/content/chapters";
import { AdSlot } from "@/components/ads/AdSlot";
import { SideAdsLayout } from "@/components/ads/SideAdsLayout";
import { DirectoryChapterNavigator } from "@/components/novel/DirectoryChapterNavigator";
import { ShareAndFavoriteBar } from "@/components/novel/ShareAndFavoriteBar";
import { getDisplayNovelTitle, getNovelSummary } from "@/lib/content/novels";
import { toAbsoluteUrl } from "@/lib/seo";

type DirectoryPageProps = {
  novel: NovelInfo;
  chapters: ChapterItem[];
};

export function DirectoryPage({ novel, chapters }: DirectoryPageProps) {
  const firstChapter = chapters[0];
  const latestChapter = chapters[chapters.length - 1];
  const displayTitle = getDisplayNovelTitle(novel);
  const summary = getNovelSummary(novel);
  const directoryAbsUrl = toAbsoluteUrl(`/novels/${novel.categorySlug}/${novel.novelId}`);
  const seoTokens = [
    ...novel.tags,
    "xianxia",
    "wuxia",
    "cultivation",
    "eastern fantasy",
    "martial arts fantasy",
  ];

  return (
    <SideAdsLayout page="directory">
      <div className="mx-auto max-w-[1100px] px-4 pb-16 pt-6">
      <section aria-label={`${novel.title} semantic summary`} className="sr-only">
        <h1>{displayTitle}</h1>
        <p>{summary}</p>
        <p>{seoTokens.map((item) => `#${item}`).join(" ")}</p>
      </section>

      <AdSlot page="directory" position="top" />

      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          <h1 className="text-center font-serif text-4xl font-bold tracking-tight text-[var(--text-deep)]">
            {displayTitle}
          </h1>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="order-2 lg:order-1">
              <p className="font-serif text-lg leading-relaxed text-[var(--text-soft)]">{summary}</p>
            </div>
            <dl className="order-1 grid gap-2 font-sans text-sm text-[var(--text-soft)] sm:grid-cols-2 lg:order-2 lg:grid-cols-1">
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
          <div className="flex w-full shrink-0 flex-col gap-3 sm:flex-row">
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
        <div className="mt-4">
          <DirectoryChapterNavigator
            chapters={chapters}
            categorySlug={novel.categorySlug}
            novelId={novel.novelId}
          />
        </div>
      </section>

      <div className="mt-10 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] px-4 py-4 shadow-sm">
        <ShareAndFavoriteBar
          shareUrl={directoryAbsUrl}
          shareTitle={`${displayTitle} — Table of Contents`}
          className="justify-start sm:items-center"
        />
      </div>

      <AdSlot page="directory" position="bottom" />
      </div>
    </SideAdsLayout>
  );
}
