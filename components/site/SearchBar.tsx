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
      className={cn("flex w-full min-w-0 max-w-md items-center gap-2", className)}
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
        className="w-full min-w-0 rounded-lg border border-emerald-800/20 bg-white/90 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none ring-emerald-700/30 placeholder:text-slate-400 focus:ring-2"
        autoComplete="off"
      />
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
      >
        Search
      </button>
    </form>
  );
}
