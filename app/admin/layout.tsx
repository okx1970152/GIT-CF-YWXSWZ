export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="zh-CN" className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
}
