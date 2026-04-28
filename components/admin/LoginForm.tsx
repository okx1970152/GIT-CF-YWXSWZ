"use client";

import { useState } from "react";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "登录失败");
        setLoading(false);
        return;
      }
      window.location.href = "/admin/ads";
    } catch {
      setError("网络错误");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto mt-10 max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <h1 className="text-center text-2xl font-semibold text-slate-900">后台登录</h1>
      <p className="mt-2 text-center text-sm text-slate-600">广告管理 · 请输入管理员密码</p>
      <label className="mt-8 block text-sm font-medium text-slate-700" htmlFor="password">
        密码
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-emerald-700/40"
        required
      />
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-lg bg-emerald-800 py-2.5 font-medium text-white shadow-sm hover:bg-emerald-900 disabled:opacity-60"
      >
        {loading ? "登录中…" : "登录"}
      </button>
    </form>
  );
}
