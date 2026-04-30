"use client";

import { useMemo, useState } from "react";
import type { AdDisplayMode, AdItemConfig, AdSlotConfig, AdsJson } from "@/lib/ads/schema";
import {
  PAGE_LABEL_CN,
  SLOT_LABEL_CN,
  type PageKey,
  type SlotKey
} from "@/components/ads/adPositions";
import { AdminNav } from "@/components/admin/AdminNav";

const PAGES: PageKey[] = ["directory", "reading", "guide"];
const SLOTS: SlotKey[] = ["top", "mid", "bottom"];
const MODE_OPTIONS: Array<{ value: AdDisplayMode; label: string }> = [
  { value: "rotate", label: "轮播（同位一次展示1条）" },
  { value: "slide", label: "滑动（横向滚动显示）" },
  { value: "multi", label: "多行（同时显示多条）" }
];

type AdsAdminClientProps = {
  initial: AdsJson;
};

function cloneAds(json: AdsJson): AdsJson {
  return JSON.parse(JSON.stringify(json)) as AdsJson;
}

export function AdsAdminClient({ initial }: AdsAdminClientProps) {
  const [data, setData] = useState<AdsJson>(() => cloneAds(initial));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(initial), [data, initial]);

  function patchSlot(page: PageKey, slot: SlotKey, patch: Partial<AdSlotConfig>) {
    setData((prev) => {
      const next = cloneAds(prev);
      const cur = next[page][slot];
      next[page][slot] = normalizeSlot({
        ...cur,
        ...patch
      });
      return next;
    });
  }

  function patchItem(page: PageKey, slot: SlotKey, idx: number, patch: Partial<AdItemConfig>) {
    setData((prev) => {
      const next = cloneAds(prev);
      const items = [...next[page][slot].items];
      items[idx] = normalizeItem({ ...items[idx], ...patch });
      next[page][slot] = normalizeSlot({ ...next[page][slot], items });
      return next;
    });
  }

  function addItem(page: PageKey, slot: SlotKey) {
    setData((prev) => {
      const next = cloneAds(prev);
      const items = [...next[page][slot].items];
      if (items.length >= 10) return prev;
      items.push(defaultAdItem());
      next[page][slot] = normalizeSlot({ ...next[page][slot], items });
      return next;
    });
  }

  function removeItem(page: PageKey, slot: SlotKey, idx: number) {
    setData((prev) => {
      const next = cloneAds(prev);
      const items = next[page][slot].items.filter((_, i) => i !== idx);
      next[page][slot] = normalizeSlot({ ...next[page][slot], items });
      return next;
    });
  }

  function moveItem(page: PageKey, slot: SlotKey, idx: number, direction: -1 | 1) {
    setData((prev) => {
      const next = cloneAds(prev);
      const items = [...next[page][slot].items];
      const target = idx + direction;
      if (target < 0 || target >= items.length) return prev;
      const tmp = items[idx];
      items[idx] = items[target];
      items[target] = tmp;
      next[page][slot] = normalizeSlot({ ...next[page][slot], items });
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "保存失败");
        setSaving(false);
        return;
      }
      window.location.reload();
    } catch {
      setError("网络错误");
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">广告位管理</h1>
          <p className="mt-1 text-sm text-slate-600">
            公共前台仍为英文展示；此处界面为中文。禁用或类型为「空」时，前台不产生占位。
          </p>
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            HTML 广告代码会直接渲染，请只粘贴可信广告代码。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            放弃修改并重载
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            退出登录
          </button>
        </div>
      </div>
      <div className="mt-4">
        <AdminNav />
      </div>

      <div className="mt-8 grid gap-6">
        {PAGES.map((page) => (
          <section key={page} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-emerald-950">{PAGE_LABEL_CN[page]}</h2>
            <div className="mt-4 grid gap-5 lg:grid-cols-3">
              {SLOTS.map((slot) => (
                <SlotCard
                  key={`${page}-${slot}`}
                  title={`${PAGE_LABEL_CN[page]} · ${SLOT_LABEL_CN[slot]}`}
                  value={data[page][slot]}
                  onSlotChange={(patch) => patchSlot(page, slot, patch)}
                  onItemChange={(idx, patch) => patchItem(page, slot, idx, patch)}
                  onAddItem={() => addItem(page, slot)}
                  onRemoveItem={(idx) => removeItem(page, slot, idx)}
                  onMoveItem={(idx, direction) => moveItem(page, slot, idx, direction)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          {dirty ? <span className="text-amber-800">有未保存更改</span> : <span>已与上次加载一致</span>}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-emerald-800 px-6 py-3 font-semibold text-white shadow-sm hover:bg-emerald-900 disabled:opacity-60"
        >
          {saving ? "保存中…" : "保存全部广告位"}
        </button>
      </div>

      {error ? <p className="mt-4 text-center text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function SlotCard({
  title,
  value,
  onSlotChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onMoveItem
}: {
  title: string;
  value: AdSlotConfig;
  onSlotChange: (patch: Partial<AdSlotConfig>) => void;
  onItemChange: (idx: number, patch: Partial<AdItemConfig>) => void;
  onAddItem: () => void;
  onRemoveItem: (idx: number) => void;
  onMoveItem: (idx: number, direction: -1 | 1) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <button
          type="button"
          onClick={onAddItem}
          disabled={value.items.length >= 10}
          className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + 新增广告
        </button>
      </div>

      <label className="mt-3 block text-xs font-medium text-slate-700">类型</label>
      <select
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
        value={value.mode}
        onChange={(e) => onSlotChange({ mode: e.target.value as AdDisplayMode })}
      >
        {MODE_OPTIONS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <p className="mt-2 text-xs text-slate-500">本广告位共 {value.items.length} 条（最多 10 条）</p>

      <div className="mt-3 grid gap-3">
        {value.items.map((item, idx) => (
          <ItemCard
            key={idx}
            index={idx}
            value={item}
            onChange={(patch) => onItemChange(idx, patch)}
            onRemove={() => onRemoveItem(idx)}
            onMoveUp={() => onMoveItem(idx, -1)}
            onMoveDown={() => onMoveItem(idx, 1)}
            canMoveUp={idx > 0}
            canMoveDown={idx < value.items.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function ItemCard({
  index,
  value,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown
}: {
  index: number;
  value: AdItemConfig;
  onChange: (patch: Partial<AdItemConfig>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-slate-700">广告 #{index + 1}</h4>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onMoveUp} disabled={!canMoveUp} className="rounded border px-1.5 py-0.5 text-xs disabled:opacity-40">↑</button>
          <button type="button" onClick={onMoveDown} disabled={!canMoveDown} className="rounded border px-1.5 py-0.5 text-xs disabled:opacity-40">↓</button>
          <button type="button" onClick={onRemove} className="rounded border border-red-300 px-1.5 py-0.5 text-xs text-red-700">删除</button>
        </div>
      </div>

      <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={value.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} />
        启用
      </label>

      <label className="mt-2 block text-xs font-medium text-slate-700">类型</label>
      <select
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
        value={value.type}
        onChange={(e) => {
          const t = e.target.value as AdItemConfig["type"];
          if (t === "empty") onChange({ type: "empty", text: undefined, link: undefined, imageUrl: undefined, html: undefined });
          else if (t === "text") onChange({ type: "text", text: value.text ?? "" });
          else if (t === "image") onChange({ type: "image", imageUrl: value.imageUrl ?? "" });
          else onChange({ type: "html", html: value.html ?? "" });
        }}
      >
        <option value="empty">空</option>
        <option value="text">文字</option>
        <option value="image">图片</option>
        <option value="html">HTML</option>
      </select>

      {value.type === "text" ? (
        <>
          <label className="mt-2 block text-xs font-medium text-slate-700">文字内容</label>
          <textarea className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" rows={2} value={value.text ?? ""} onChange={(e) => onChange({ text: e.target.value })} />
        </>
      ) : null}

      {(value.type === "text" || value.type === "image") && (
        <>
          <label className="mt-2 block text-xs font-medium text-slate-700">链接（可选）</label>
          <input className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" placeholder="例如：https://www.baidu.com 或 www.baidu.com" value={value.link ?? ""} onChange={(e) => onChange({ link: e.target.value })} />
        </>
      )}

      {value.type === "image" ? (
        <>
          <label className="mt-2 block text-xs font-medium text-slate-700">图片 URL</label>
          <input className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={value.imageUrl ?? ""} onChange={(e) => onChange({ imageUrl: e.target.value })} />
        </>
      ) : null}

      {value.type === "html" ? (
        <>
          <label className="mt-2 block text-xs font-medium text-slate-700">HTML 代码</label>
          <textarea className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 font-mono text-xs" rows={5} value={value.html ?? ""} onChange={(e) => onChange({ html: e.target.value })} />
        </>
      ) : null}
    </div>
  );
}

function normalizeSlot(s: AdSlotConfig): AdSlotConfig {
  return {
    mode: s.mode,
    items: s.items.map((item) => normalizeItem(item))
  };
}

function defaultAdItem(): AdItemConfig {
  return {
    enabled: false,
    type: "text",
    text: "",
    link: undefined
  };
}

function normalizeItem(s: AdItemConfig): AdItemConfig {
  const base: AdItemConfig = { enabled: s.enabled, type: s.type };
  if (base.type === "empty") return { enabled: base.enabled, type: "empty" };
  if (base.type === "text") return { ...base, text: (s.text ?? "").trim(), link: optionalLink(s.link) };
  if (base.type === "image") {
    return { ...base, imageUrl: (s.imageUrl ?? "").trim(), link: optionalLink(s.link) };
  }
  return { ...base, html: s.html ?? "" };
}

function optionalLink(link?: string): string | undefined {
  const t = link?.trim();
  if (!t) return undefined;
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(t)) return t;
  if (t.startsWith("//")) return `https:${t}`;
  if (t.startsWith("/") || t.startsWith("#") || t.startsWith("?")) return t;
  return `https://${t}`;
}
