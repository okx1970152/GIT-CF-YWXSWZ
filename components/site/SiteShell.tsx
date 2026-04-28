import { Navbar } from "@/components/site/Navbar";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f3f6f1]">
      <Navbar />
      {children}
    </div>
  );
}
