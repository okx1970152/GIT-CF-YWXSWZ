import Link from "next/link";
import { ChapterReader } from "@/components/novel/ChapterReader";
import { SideAdsLayout } from "@/components/ads/SideAdsLayout";
import { ChapterNavigation } from "@/components/novel/ChapterNavigation";
import { ShareAndFavoriteBar } from "@/components/novel/ShareAndFavoriteBar";
import {
  type EncyclopediaEntrySummary,
  type EncyclopediaVolume,
  resolveEncyclopediaRelationTarget
} from "@/lib/encyclopedia/index";
import { toAbsoluteUrl } from "@/lib/seo";

type FaqEntry = { question?: string; answer?: string };
type LoreEntry = { surface_form?: string; description?: string };
type RelationEntry = { target?: string; relation_type?: string };

type EncyclopediaEntryPageProps = {
  volume: EncyclopediaVolume;
  entrySummary: EncyclopediaEntrySummary;
  entry: Record<string, unknown>;
  prevEntry: EncyclopediaEntrySummary | null;
  nextEntry: EncyclopediaEntrySummary | null;
};

function getRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getBodySections(entry: Record<string, unknown>): string[] {
  const body = getRecord(getRecord(entry.entry).body);
  return Object.keys(body)
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((key) => getString(body[key]))
    .filter(Boolean);
}

function getGuideSections(entry: Record<string, unknown>): string[] {
  const guide = getRecord(getRecord(entry.entry).guide);
  return Object.keys(guide)
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((key) => getString(guide[key]))
    .filter(Boolean);
}

function getFaqEntries(entry: Record<string, unknown>): FaqEntry[] {
  const items = Array.isArray(entry.faq_entries) ? entry.faq_entries : [];
  return items.map((item) => getRecord(item));
}

function getLoreEntries(entry: Record<string, unknown>): LoreEntry[] {
  const items = Array.isArray(entry.lore_entries) ? entry.lore_entries : [];
  return items.map((item) => getRecord(item));
}

function getRelationEntries(entry: Record<string, unknown>): RelationEntry[] {
  const items = Array.isArray(entry.relation_entries) ? entry.relation_entries : [];
  return items.map((item) => getRecord(item));
}

function renderTextBlock(text: string) {
  return (
    <p className="whitespace-pre-line font-serif text-[17px] leading-8 text-[var(--text-soft)]">{text}</p>
  );
}

export function EncyclopediaEntryPage({
  volume,
  entrySummary,
  entry,
  prevEntry,
  nextEntry
}: EncyclopediaEntryPageProps) {
  const meta = getRecord(entry.meta);
  const seo = getRecord(entry.seo);
  const hook = getString(getRecord(entry.entry).hook);
  const bodySections = getBodySections(entry);
  const guideSections = getGuideSections(entry);
  const faqEntries = getFaqEntries(entry);
  const loreEntries = getLoreEntries(entry);
  const relationEntries = getRelationEntries(entry);

  const titleEn = getString(meta.title_en) || entrySummary.titleEn;
  const titleCn = getString(meta.title_cn) || entrySummary.titleCn;
  const shareUrl = toAbsoluteUrl(
    `/novels/${volume.categorySlug}/${volume.novelId}/chapters/${entrySummary.slug}`
  );
  const directoryHref = `/novels/${volume.categorySlug}/${volume.novelId}`;

  return (
    <SideAdsLayout page="reading">
      <ChapterReader>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,920px)_minmax(320px,420px)] lg:gap-10">
          <article className="min-w-0">
            <nav className="mb-4 flex flex-wrap items-center gap-2 font-sans text-sm text-[var(--text-muted)]">
              <Link href={`/category/${volume.categorySlug}`} className="hover:text-[var(--accent-green)]">
                Eastern Mythology Encyclopedia
              </Link>
              <span>/</span>
              <Link href={directoryHref} className="hover:text-[var(--accent-green)]">
                {volume.titleEn}
              </Link>
              <span>/</span>
              <span>{titleEn}</span>
            </nav>

            <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] p-6 shadow-sm">
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Eastern Mythology Encyclopedia
              </p>
              <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-[var(--text-deep)]">
                {titleEn}
              </h1>
              <p className="mt-2 font-serif text-xl text-[var(--text-soft)]">{titleCn}</p>
              {hook ? <p className="mt-5 font-serif text-lg leading-8 text-[var(--text-soft)]">{hook}</p> : null}
              <div className="mt-5">
                <ShareAndFavoriteBar shareUrl={shareUrl} shareTitle={titleEn} className="justify-start" />
              </div>
            </header>

            {bodySections.length ? (
              <section className="mt-8 space-y-6 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-6 shadow-sm">
                <h2 className="font-serif text-2xl font-semibold text-[var(--text-deep)]">Entry</h2>
                <div className="space-y-5">
                  {bodySections.map((section, index) => (
                    <div key={index}>{renderTextBlock(section)}</div>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="mt-8">
              <ChapterNavigation
                prevHref={
                  prevEntry
                    ? `/novels/${volume.categorySlug}/${volume.novelId}/chapters/${prevEntry.slug}`
                    : null
                }
                nextHref={
                  nextEntry
                    ? `/novels/${volume.categorySlug}/${volume.novelId}/chapters/${nextEntry.slug}`
                    : null
                }
                directoryHref={directoryHref}
                shareUrl={shareUrl}
                shareTitle={titleEn}
              />
            </div>
          </article>

          <aside className="space-y-6">
            {guideSections.length ? (
              <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] p-6 shadow-sm">
                <h2 className="font-serif text-2xl font-semibold text-[var(--text-deep)]">Guide</h2>
                <div className="mt-5 space-y-5">
                  {guideSections.map((section, index) => (
                    <div key={index}>{renderTextBlock(section)}</div>
                  ))}
                </div>
              </section>
            ) : null}

            {faqEntries.length ? (
              <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-6 shadow-sm">
                <h2 className="font-serif text-2xl font-semibold text-[var(--text-deep)]">FAQ</h2>
                <div className="mt-5 space-y-4">
                  {faqEntries.map((item, index) => (
                    <div key={index} className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] p-4">
                      <h3 className="font-sans text-sm font-semibold text-[var(--text-deep)]">
                        {getString(item.question)}
                      </h3>
                      <p className="mt-2 font-serif text-base leading-7 text-[var(--text-soft)]">
                        {getString(item.answer)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {loreEntries.length ? (
              <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-6 shadow-sm">
                <h2 className="font-serif text-2xl font-semibold text-[var(--text-deep)]">Lore</h2>
                <div className="mt-5 space-y-4">
                  {loreEntries.map((item, index) => (
                    <div key={index} className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] p-4">
                      <h3 className="font-sans text-sm font-semibold text-[var(--text-deep)]">
                        {getString(item.surface_form)}
                      </h3>
                      <p className="mt-2 font-serif text-base leading-7 text-[var(--text-soft)]">
                        {getString(item.description)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {relationEntries.length ? (
              <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-6 shadow-sm">
                <h2 className="font-serif text-2xl font-semibold text-[var(--text-deep)]">Related Entries</h2>
                <div className="mt-5 flex flex-wrap gap-3">
                  {relationEntries.map((item, index) => {
                    const target = getString(item.target);
                    const relationType = getString(item.relation_type);
                    const resolved = resolveEncyclopediaRelationTarget(target);
                    const content = (
                      <>
                        <span className="font-semibold text-[var(--text-deep)]">{target}</span>
                        {relationType ? (
                          <span className="mt-1 block text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            {relationType}
                          </span>
                        ) : null}
                      </>
                    );

                    if (resolved) {
                      return (
                        <Link
                          key={`${target}-${index}`}
                          href={`/novels/${resolved.categorySlug}/${resolved.novelId}/chapters/${resolved.slug}`}
                          className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] px-4 py-3 font-sans text-sm text-[var(--text-soft)] transition hover:border-[var(--accent-green)]"
                        >
                          {content}
                        </Link>
                      );
                    }

                    return (
                      <div
                        key={`${target}-${index}`}
                        className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] px-4 py-3 font-sans text-sm text-[var(--text-soft)]"
                      >
                        {content}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {Object.keys(seo).length ? (
              <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-6 shadow-sm">
                <h2 className="font-serif text-2xl font-semibold text-[var(--text-deep)]">Tags</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(Array.isArray(seo.tags) ? seo.tags : []).map((tag, index) => (
                    <span
                      key={`${String(tag)}-${index}`}
                      className="rounded-full border border-[var(--border-soft)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-medium text-[var(--text-soft)]"
                    >
                      {String(tag)}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </ChapterReader>
    </SideAdsLayout>
  );
}
