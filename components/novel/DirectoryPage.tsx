import Link from "next/link";
import type { NovelInfo } from "@/lib/content/schema";
import type { ChapterItem } from "@/lib/content/chapters";
import { Hero } from "@/components/site/Hero";
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
      <Hero
        title={novel.title}
        subtitle={novel.desc}
        imageSrc={novel.hero || undefined}
        className="mb-10"
      />

      <AdSlot page="directory" position="top" />

      <div className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-serif text-lg leading-relaxed text-slate-700">{novel.desc}</p>
            <dl className="mt-6 grid gap-2 font-sans text-sm text-slate-600 sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Author</dt>
                <dd className="font-medium text-slate-800">{novel.author}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="font-medium text-slate-800">{novel.status}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Category</dt>
                <dd className="font-medium text-slate-800">{novel.category}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Total chapters</dt>
                <dd className="font-medium text-slate-800">{novel.total_chapters}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Updated</dt>
                <dd className="font-medium text-slate-800">{novel.updated_at}</dd>
              </div>
            </dl>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-3 sm:flex-row lg:w-auto lg:flex-col">
            {latestChapter ? (
              <Link
                href={`/novels/${novel.categorySlug}/${novel.novelId}/chapters/${latestChapter.chapterNo}`}
                className="rounded-xl bg-emerald-800 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
              >
                Latest chapter
              </Link>
            ) : null}
            {firstChapter ? (
              <Link
                href={`/novels/${novel.categorySlug}/${novel.novelId}/chapters/${firstChapter.chapterNo}`}
                className="rounded-xl border border-emerald-900/25 bg-[#f3f6f1] px-5 py-3 text-center text-sm font-semibold text-emerald-950 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
              >
                Start reading
              </Link>
            ) : (
              <span className="rounded-xl border border-dashed border-emerald-900/20 px-5 py-3 text-center text-sm text-slate-500">
                No chapters yet
              </span>
            )}
          </div>
        </div>
      </div>

      <AdSlot page="directory" position="mid" />

      <section className="mt-10" aria-labelledby="chapter-list-heading">
        <h2 id="chapter-list-heading" className="font-serif text-2xl font-semibold text-emerald-950">
          Chapters
        </h2>
        <ul className="mt-4 divide-y divide-emerald-900/10 rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
          {chapters.map((chapter) => (
            <li key={chapter.chapterNo}>
              <Link
                href={`/novels/${novel.categorySlug}/${novel.novelId}/chapters/${chapter.chapterNo}`}
                className="flex items-center justify-between gap-4 px-4 py-3 font-serif text-slate-800 hover:bg-emerald-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-800"
              >
                <span className="font-medium">
                  {chapter.chapterNo} — {chapter.title}
                </span>
                <span className="shrink-0 text-sm text-emerald-800">Read →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <AdSlot page="directory" position="bottom" />
    </div>
  );
}
