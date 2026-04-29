import { Navbar } from "@/components/site/Navbar";
import { TopBanner } from "@/components/site/TopBanner";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-deep)]">
      <Navbar />
      <TopBanner />
      {children}
    </div>
  );
}
