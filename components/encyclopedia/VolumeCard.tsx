import Link from "next/link";
import type { EncyclopediaVolume } from "@/lib/encyclopedia/index";

type VolumeCardProps = {
  volume: EncyclopediaVolume;
};

export function VolumeCard({ volume }: VolumeCardProps) {
  const href = `/novels/${volume.categorySlug}/${volume.novelId}`;

  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-6 shadow-sm transition duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--accent-green)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
    >
      <div className="flex h-full flex-col">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Eastern Mythology Encyclopedia
        </p>
        <h2 className="mt-3 font-serif text-[28px] font-bold leading-tight text-[var(--text-deep)] transition-colors group-hover:text-[var(--accent-green)]">
          {volume.title}
        </h2>
        <p className="mt-2 font-sans text-sm font-medium text-[var(--text-soft)]">{volume.titleEn}</p>
        <p className="mt-4 line-clamp-5 flex-1 font-serif text-base leading-relaxed text-[var(--text-soft)]">
          {volume.summary}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 font-sans text-sm text-[var(--text-soft)]">
          <p>
            <span className="text-[var(--text-muted)]">Author:</span> {volume.author}
          </p>
          <p>
            <span className="text-[var(--text-muted)]">Status:</span> {volume.status}
          </p>
          <p>
            <span className="text-[var(--text-muted)]">Entries:</span> {volume.totalChapters}
          </p>
          <p>
            <span className="text-[var(--text-muted)]">Updated:</span> {volume.updatedAt}
          </p>
        </div>
      </div>
    </Link>
  );
}
