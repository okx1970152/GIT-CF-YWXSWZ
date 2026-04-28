import type { NovelInfo } from "@/lib/content/schema";
import { NovelCard } from "@/components/novel/NovelCard";
import { cn } from "@/lib/cn";

type SectionRailProps = {
  title: string;
  novels: NovelInfo[];
  id?: string;
  className?: string;
};

export function SectionRail({ title, novels, id, className }: SectionRailProps) {
  const first = novels[0];
  const rest = novels.slice(1);

  return (
    <section id={id} className={cn("mb-14", className)} aria-labelledby={id ? `${id}-heading` : undefined}>
      <h2
        id={id ? `${id}-heading` : undefined}
        className="mb-4 font-serif text-2xl font-semibold text-emerald-950"
      >
        {title}
      </h2>
      {novels.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-emerald-900/20 bg-white/60 px-6 py-10 text-center text-slate-600">
          No novels in this section yet.
        </p>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6">
          {first ? (
            <div className="flex shrink-0 justify-center lg:w-[500px] lg:justify-start">
              <NovelCard novel={first} className="w-full sm:max-w-[500px]" />
            </div>
          ) : null}
          {rest.length > 0 ? (
            <div className="scrollbar-hide min-h-0 min-w-0 flex-1 overflow-x-auto lg:min-w-0">
              <div className="flex w-max gap-6 pb-2">
                {rest.map((novel) => (
                  <NovelCard key={`${novel.categorySlug}-${novel.novelId}`} novel={novel} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
