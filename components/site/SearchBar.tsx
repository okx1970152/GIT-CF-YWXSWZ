import { cn } from "@/lib/cn";

type SearchBarProps = {
  className?: string;
  defaultValue?: string;
};

export function SearchBar({ className, defaultValue }: SearchBarProps) {
  return (
    <form
      action="/search"
      method="get"
      className={cn("flex w-auto min-w-0 max-w-md items-center gap-2", className)}
    >
      <label htmlFor="nav-search" className="sr-only">
        Search novels
      </label>
      <input
        id="nav-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search…"
        className="min-w-[7rem] flex-1 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-deep)] shadow-sm outline-none ring-[var(--accent-green)]/40 placeholder:text-[var(--text-muted)] focus:ring-2 sm:min-w-[9rem]"
        autoComplete="off"
      />
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-[var(--accent-green)] px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#06a552] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
      >
        Search
      </button>
    </form>
  );
}
