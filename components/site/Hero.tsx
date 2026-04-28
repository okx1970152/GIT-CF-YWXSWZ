import { cn } from "@/lib/cn";

type HeroProps = {
  title: string;
  subtitle?: string;
  /** Public path e.g. /hero/foo.webp — optional decorative background */
  imageSrc?: string;
  className?: string;
};

export function Hero({ title, subtitle, imageSrc, className }: HeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-emerald-900/10 shadow-sm",
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-emerald-100/90 via-[#f3f6f1] to-teal-100/80",
          imageSrc && "opacity-90"
        )}
        style={
          imageSrc
            ? {
                backgroundImage: `linear-gradient(120deg, rgba(243,246,241,0.92), rgba(236,253,245,0.85)), url(${imageSrc})`,
                backgroundSize: "cover",
                backgroundPosition: "center"
              }
            : undefined
        }
        aria-hidden
      />
      <div className="relative px-6 py-12 sm:px-10 sm:py-14">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 max-w-2xl font-serif text-base leading-relaxed text-slate-700 sm:text-lg">
            {subtitle}
          </p>
        ) : null}
      </div>
    </section>
  );
}
