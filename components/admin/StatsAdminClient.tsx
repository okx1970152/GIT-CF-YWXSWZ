"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORY_NAV } from "@/lib/content/categories";
import { AdminNav } from "@/components/admin/AdminNav";

type Dashboard = {
  days: number;
  siteTotal: number;
  daily: Array<{ day: string; total: number }>;
  hourlyToday: Array<{ hour: string; total: number }>;
  topCountries: Array<{ country: string; countryNameZh: string; total: number }>;
  topCategories: Array<{ category: string; total: number }>;
  topNovels: Array<{ category: string; novelId: string; total: number }>;
  countryCategoryRows: Array<{
    country: string;
    countryNameZh: string;
    total: number;
    categories: Record<string, number>;
  }>;
};

const DAY_OPTIONS = [1, 3, 7, 14, 30];

export function StatsAdminClient() {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/stats?days=${days}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!mounted) return;
        if (!ok) {
          setError(j?.error ?? "读取统计失败");
          return;
        }
        setData(j as Dashboard);
      })
      .catch(() => {
        if (mounted) setError("读取统计失败");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [days]);

  const maxDaily = useMemo(() => Math.max(1, ...(data?.daily.map((d) => d.total) ?? [1])), [data]);
  const maxHour = useMemo(
    () => Math.max(1, ...(data?.hourlyToday.map((d) => d.total) ?? [1])),
    [data]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-slate-900">访问统计中心</h1>
        <p className="mt-1 text-sm text-slate-600">
          仅展示聚合结果，不存储原始 IP。时区固定为中国时间（UTC+8）。
        </p>
      </div>

      <AdminNav />

      <div className="mb-6 flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">统计周期</label>
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          {DAY_OPTIONS.map((d) => (
            <option key={d} value={d}>
              最近 {d} 天
            </option>
          ))}
        </select>
        {loading ? <span className="text-sm text-emerald-700">刷新中…</span> : null}
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {!data ? null : (
        <div className="grid gap-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">核心指标</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <MetricCard label="站点总访问" value={String(data.siteTotal)} />
              <MetricCard
                label={`最近${data.days}天总访问`}
                value={String(data.daily.reduce((sum, d) => sum + d.total, 0))}
              />
              <MetricCard
                label="今日峰值小时访问"
                value={String(Math.max(...data.hourlyToday.map((h) => h.total), 0))}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">每日访问趋势</h2>
            <div className="mt-4 grid gap-2">
              {data.daily.map((item) => (
                <BarRow
                  key={item.day}
                  label={item.day}
                  value={item.total}
                  max={maxDaily}
                  colorClass="bg-emerald-600"
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">今日按小时访问量</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
              {data.hourlyToday.map((item) => (
                <div key={item.hour} className="rounded-lg border border-slate-200 p-2">
                  <div className="text-xs text-slate-500">{item.hour}:00</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">{item.total}</div>
                  <div className="mt-2 h-1.5 w-full rounded bg-slate-100">
                    <div
                      className="h-full rounded bg-emerald-600"
                      style={{ width: `${(item.total / maxHour) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">国家来源（Top）</h2>
            <div className="mt-4 grid gap-2">
              {data.topCountries.map((item) => (
                <BarRow
                  key={item.country}
                  label={`${item.countryNameZh} (${item.country})`}
                  value={item.total}
                  max={Math.max(1, ...data.topCountries.map((c) => c.total))}
                  colorClass="bg-cyan-600"
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">分类热度（Top）</h2>
            <div className="mt-4 grid gap-2">
              {data.topCategories.map((item) => (
                <BarRow
                  key={item.category}
                  label={item.category}
                  value={item.total}
                  max={Math.max(1, ...data.topCategories.map((c) => c.total))}
                  colorClass="bg-violet-600"
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">国家 × 分类兴趣分析</h2>
            <p className="mt-1 text-sm text-slate-600">
              看清楚每个国家偏好哪些分类，便于你决定优先生产哪类小说。
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 px-2 py-2 text-left">国家</th>
                    <th className="border border-slate-200 px-2 py-2 text-right">总访问</th>
                    {CATEGORY_NAV.map((c) => (
                      <th key={c.slug} className="border border-slate-200 px-2 py-2 text-right">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.countryCategoryRows.map((row) => (
                    <tr key={row.country}>
                      <td className="border border-slate-200 px-2 py-2">
                        {row.countryNameZh} ({row.country})
                      </td>
                      <td className="border border-slate-200 px-2 py-2 text-right font-semibold">
                        {row.total}
                      </td>
                      {CATEGORY_NAV.map((c) => {
                        const v = row.categories[c.slug] ?? 0;
                        const ratio = row.total > 0 ? v / row.total : 0;
                        return (
                          <td
                            key={c.slug}
                            className="border border-slate-200 px-2 py-2 text-right"
                            style={{
                              backgroundColor:
                                v > 0 ? `rgba(16,185,129,${Math.min(0.85, 0.08 + ratio * 1.2)})` : undefined
                            }}
                          >
                            {v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">小说访问 Top10</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {data.topNovels.map((item, idx) => (
                <li key={`${item.category}-${item.novelId}`} className="flex justify-between rounded border border-slate-200 px-3 py-2">
                  <span>
                    {idx + 1}. {item.category}/{item.novelId}
                  </span>
                  <strong>{item.total}</strong>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  colorClass
}: {
  label: string;
  value: number;
  max: number;
  colorClass: string;
}) {
  return (
    <div className="grid grid-cols-[220px_minmax(0,1fr)_56px] items-center gap-3">
      <div className="truncate text-sm text-slate-700">{label}</div>
      <div className="h-2.5 rounded bg-slate-100">
        <div className={`h-full rounded ${colorClass}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <div className="text-right text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
