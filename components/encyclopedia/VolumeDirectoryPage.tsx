import Link from "next/link";
import type { EncyclopediaVolume } from "@/lib/encyclopedia/index";
import { SideAdsLayout } from "@/components/ads/SideAdsLayout";
import { ShareAndFavoriteBar } from "@/components/novel/ShareAndFavoriteBar";
import { toAbsoluteUrl } from "@/lib/seo";

type VolumeDirectoryPageProps = {
  volume: EncyclopediaVolume;
};

export function VolumeDirectoryPage({ volume }: VolumeDirectoryPageProps) {
  const directoryUrl = toAbsoluteUrl(`/novels/${volume.categorySlug}/${volume.novelId}`);

  return (
    <SideAdsLayout page="directory">
      <div className="mx-auto w-full max-w-[1400px] px-3 pb-16 pt-4 sm:px-4 sm:pb-20 sm:pt-6">
        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] p-6 shadow-sm sm:p-8">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Eastern Mythology Encyclopedia
          </p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-[var(--text-deep)]">
            {volume.titleEn}
          </h1>
          <p className="mt-2 font-serif text-xl text-[var(--text-soft)]">{volume.title}</p>
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div>
              <p className="font-serif text-lg leading-8 text-[var(--text-soft)]">{volume.summary}</p>
              <div className="mt-5 space-y-4">
                {volume.desc
                  .split(/\n+/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={index} className="font-serif text-base leading-8 text-[var(--text-soft)]">
                      {paragraph}
                    </p>
                  ))}
              </div>
            </div>
            <dl className="grid gap-3 font-sans text-sm text-[var(--text-soft)]">
              <div>
                <dt className="text-[var(--text-muted)]">Author</dt>
                <dd className="font-medium text-[var(--text-deep)]">{volume.author}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Category</dt>
                <dd className="font-medium text-[var(--text-deep)]">Eastern Mythology Encyclopedia</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Status</dt>
                <dd className="font-medium text-[var(--text-deep)]">{volume.status}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Entries</dt>
                <dd className="font-medium text-[var(--text-deep)]">{volume.totalChapters}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Updated</dt>
                <dd className="font-medium text-[var(--text-deep)]">{volume.updatedAt}</dd>
              </div>
            </dl>
          </div>
          {volume.tags.length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {volume.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-1 text-xs font-medium text-[var(--text-soft)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-6">
            <ShareAndFavoriteBar shareUrl={directoryUrl} shareTitle={volume.titleEn} className="justify-start" />
          </div>
        </section>

        <section className="mt-10" aria-labelledby="encyclopedia-entry-list-heading">
          <h2
            id="encyclopedia-entry-list-heading"
            className="mb-5 font-serif text-2xl font-semibold text-[var(--text-deep)]"
          >
            Entries
          </h2>
          <div className="grid gap-4">
            {volume.entries.map((entry) => (
              <Link
                key={entry.slug}
                href={`/novels/${volume.categorySlug}/${volume.novelId}/chapters/${entry.slug}`}
                className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 shadow-sm transition hover:border-[var(--accent-green)] hover:shadow-md"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-serif text-2xl font-semibold text-[var(--text-deep)]">{entry.titleEn}</p>
                    <p className="mt-1 font-sans text-sm text-[var(--text-soft)]">{entry.titleCn}</p>
                    <p className="mt-3 line-clamp-4 font-serif text-base leading-7 text-[var(--text-soft)]">
                      {entry.hook}
                    </p>
                  </div>
                  <div className="shrink-0 font-sans text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Entry {entry.chapterNo}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </SideAdsLayout>
  );
}
