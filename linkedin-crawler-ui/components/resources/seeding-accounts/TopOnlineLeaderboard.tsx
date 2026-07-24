"use client";

import type { TopOnlineEntry, SeedingPlatform } from "@/types/seeding-account.types";

interface Props {
  data: TopOnlineEntry[];
}

const PLATFORM_COLORS: Record<SeedingPlatform, string> = {
  facebook: "text-blue-600",
  linkedin: "text-blue-800",
  gmail: "text-red-500",
  tiktok: "text-neutral-900",
  zalo: "text-blue-600",
};

const PLATFORM_LABELS: Record<SeedingPlatform, string> = {
  facebook: "FB",
  linkedin: "LI",
  gmail: "GM",
  tiktok: "TK",
  zalo: "ZL",
};

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}p`;
  return `${h}h${m > 0 ? m + "p" : ""}`;
}

export function TopOnlineLeaderboard({ data }: Props) {
  return (
    <div
      className="overflow-hidden rounded-[15px] border border-[#e7e9ef] bg-white"
      style={{ boxShadow: "0 1px 3px rgba(20,25,40,.08), 0 8px 24px rgba(20,25,40,.04)" }}
    >
      <div className="border-b border-[#e7e9ef] px-4 py-[15px]">
        <h3 className="m-0 text-[15px] font-bold text-[#252733]">Online nhiều nhất hôm nay</h3>
      </div>
      <div className="space-y-1">
        {data.map((entry) => (
          <div
            key={entry.accountId}
            className="flex items-center gap-[10px] px-4 py-[9px] border-b border-[#f0f1f4] last:border-b-0"
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold"
              style={{
                background: entry.rank === 1 ? "#fef3c7" : "#eef0f4",
                color: entry.rank === 1 ? "#d97706" : "#606472",
              }}
            >
              {entry.rank}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-bold text-[#252733] truncate">{entry.name}</span>
                <span className="text-[9px] font-black text-[#737785] uppercase">{PLATFORM_LABELS[entry.platform]}</span>
              </div>
            </div>
            <div className="text-[12px] font-extrabold text-[#252733] tabular-nums shrink-0">
              {formatDuration(entry.onlineTodayMinutes)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

