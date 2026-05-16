"use client";

import { MaterialIcon } from "@/components/ui";
import type { ZaloMessage } from "@/types/zalo";
import { exportToCsv } from "@/services/zaloCrawlerService";

interface ZaloExportControlsProps {
  messages: ZaloMessage[];
  groupName: string;
  filteredCount: number;
  totalCount: number;
}

export function ZaloExportControls({
  messages,
  groupName,
  filteredCount,
  totalCount,
}: ZaloExportControlsProps) {
  const handleCsv = () => {
    exportToCsv(messages, groupName);
  };

  return (
    <div className="border-outline-variant bg-surface-container-low flex flex-wrap items-center justify-between gap-sm rounded-xl border px-md py-sm">
      <p className="text-on-surface-variant text-sm">
        {filteredCount === totalCount ? (
          <span>{totalCount.toLocaleString()} tin nhắn</span>
        ) : (
          <span>
            {filteredCount.toLocaleString()} / {totalCount.toLocaleString()} tin nhắn (đang lọc)
          </span>
        )}
      </p>

      <button
        type="button"
        onClick={handleCsv}
        disabled={messages.length === 0}
        className="bg-secondary text-on-secondary hover:bg-secondary/90 flex items-center gap-2 rounded-lg px-md py-sm text-sm font-semibold transition-colors disabled:opacity-50"
        aria-label="Xuất CSV"
      >
        <MaterialIcon name="download" className="text-base" />
        Xuất CSV
      </button>
    </div>
  );
}
