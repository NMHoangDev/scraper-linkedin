"use client";

import { MaterialIcon } from "@/components/ui";
import type { ZaloFilterState } from "@/types/zalo";

interface ZaloSearchFilterBarProps {
  filters: ZaloFilterState;
  senders: string[];
  onChange: (filters: ZaloFilterState) => void;
}

export function ZaloSearchFilterBar({
  filters,
  senders,
  onChange,
}: ZaloSearchFilterBarProps) {
  return (
    <div
      className="border-outline-variant bg-surface-container-low flex flex-wrap items-center gap-sm rounded-xl border px-md py-sm"
      role="search"
      aria-label="Tìm kiếm và lọc tin nhắn"
    >
      <div className="relative flex min-w-[200px] flex-1 items-center">
        <MaterialIcon
          name="search"
          className="text-on-surface-variant pointer-events-none absolute left-2 text-lg"
        />
        <input
          type="search"
          className="border-outline-variant bg-surface focus:border-primary w-full rounded-lg border py-sm pl-8 pr-md text-sm outline-none transition-all focus:ring-1 focus:ring-blue-500"
          placeholder="Tìm kiếm nội dung..."
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          aria-label="Tìm kiếm nội dung tin nhắn"
        />
      </div>

      <select
        className="border-outline-variant bg-surface focus:border-primary rounded-lg border px-sm py-sm text-sm outline-none transition-all focus:ring-1 focus:ring-blue-500"
        value={filters.sender}
        onChange={(e) => onChange({ ...filters, sender: e.target.value })}
        aria-label="Lọc theo người gửi"
      >
        <option value="">Tất cả người gửi</option>
        {senders.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <label className="flex cursor-pointer items-center gap-xs text-sm select-none">
        <input
          type="checkbox"
          className="accent-primary h-4 w-4 rounded"
          checked={filters.hasMedia}
          onChange={(e) => onChange({ ...filters, hasMedia: e.target.checked })}
          aria-label="Chỉ tin nhắn có hình ảnh"
        />
        <span className="text-on-surface-variant">Có hình ảnh</span>
      </label>

      {(filters.query || filters.sender || filters.hasMedia) && (
        <button
          type="button"
          onClick={() => onChange({ query: "", sender: "", hasMedia: false })}
          className="text-on-surface-variant hover:text-error flex items-center gap-1 rounded px-sm py-1 text-sm transition-colors"
          aria-label="Xoá bộ lọc"
        >
          <MaterialIcon name="filter_alt_off" className="text-base" />
          Xoá lọc
        </button>
      )}
    </div>
  );
}
