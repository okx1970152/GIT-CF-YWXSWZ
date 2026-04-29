import Link from "next/link";
import { cn } from "@/lib/cn";

type HeroProps = {
  title: string;
  subtitle?: string;
  actions?: { label: string; href: string; primary?: boolean }[];
  /** Public path e.g. /hero/foo.webp — optional decorative background */
  imageSrc?: string;
  className?: string;
};

export function Hero({ title, subtitle, actions, imageSrc, className }: HeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[var(--border-soft)] shadow-sm",
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-[#dcefdc] via-[var(--bg-surface)] to-[#eef7ec]",
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
      <div className="relative px-5 py-9 sm:px-10 sm:py-14">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-[var(--text-deep)] sm:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 max-w-3xl font-serif text-base leading-relaxed text-[var(--text-soft)] sm:text-lg">
            {subtitle}
          </p>
        ) : null}
        {actions?.length ? (
          <div className="mt-5 flex flex-wrap gap-2.5 sm:mt-6 sm:gap-3">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)] active:scale-[0.98]",
                  action.primary
                    ? "bg-[var(--accent-green)] text-white hover:bg-[#06a552]"
                    : "border border-[var(--border-soft)] bg-[var(--bg-card)] text-[var(--text-deep)] hover:bg-[#ddeedd]"
                )}
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
