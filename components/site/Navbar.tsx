import Link from "next/link";
import { CATEGORY_NAV } from "@/lib/content/categories";
import { cn } from "@/lib/cn";
import { SearchBar } from "@/components/site/SearchBar";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-emerald-900/10 bg-[#f3f6f1]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <nav
          aria-label="Main"
          className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-800"
        >
          <Link
            href="/"
            className="rounded-md px-1 py-1 text-emerald-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            Home
          </Link>
          {CATEGORY_NAV.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="rounded-md px-1 py-1 hover:text-emerald-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              {cat.label}
            </Link>
          ))}
        </nav>
        <SearchBar className={cn("lg:w-auto lg:max-w-[320px]", "w-full")} />
      </div>
    </header>
  );
}
