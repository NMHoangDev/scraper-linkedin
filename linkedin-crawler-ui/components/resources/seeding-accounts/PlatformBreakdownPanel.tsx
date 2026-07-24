"use client";

import type { PlatformBreakdown, SeedingPlatform } from "@/types/seeding-account.types";

interface Props {
  data: PlatformBreakdown[];
}

const PLATFORM_ICON_COLORS: Record<SeedingPlatform, string> = {
  facebook: "#1877f2",
  linkedin: "#0a66c2",
  gmail: "#ea4335",
  tiktok: "#111111",
  zalo: "#0068ff",
};

const PLATFORM_LABELS: Record<SeedingPlatform, string> = {
  facebook: "Facebook",
  linkedin: "LinkedIn",
  gmail: "Gmail",
  tiktok: "TikTok",
  zalo: "Zalo",
};

function getPlatformBg(platform: SeedingPlatform): string {
  if (platform === "gmail") {
    return "linear-gradient(135deg, #ea4335 0%, #fbbc04 50%, #34a853 75%, #4285f4 100%)";
  }
  return PLATFORM_ICON_COLORS[platform];
}

export function PlatformBreakdownPanel({ data }: Props) {
  const maxCount = Math.max(...data.map((item) => item.count), 1);

  return (
    <div
      className="overflow-hidden rounded-[15px] border border-[#e7e9ef] bg-white"
      style={{ boxShadow: "0 1px 3px rgba(20,25,40,.08), 0 8px 24px rgba(20,25,40,.04)" }}
    >
      <div className="border-b border-[#e7e9ef] px-4 py-[15px]">
        <h3 className="m-0 text-[15px] font-bold text-[#252733]">Phân bố nền tảng</h3>
      </div>
      <div className="space-y-[14px] px-4 py-[14px]">
        {data.map((item) => (
          <div key={item.platform}>
            <div className="flex items-center gap-[10px]">
              <div
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] text-[11px] font-bold text-white"
                style={{ background: getPlatformBg(item.platform) }}
              >
                {PLATFORM_LABELS[item.platform].charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[13px] font-bold text-[#252733]">{item.label}</span>
              </div>
              <span className="text-[13px] font-extrabold text-[#252733] tabular-nums">
                {item.count} ({item.percentage}%)
              </span>
            </div>
            <div className="mt-[8px] h-2 w-full overflow-hidden rounded-full bg-[#eef0f4]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.count / maxCount) * 100}%`,
                  backgroundColor: PLATFORM_ICON_COLORS[item.platform] || "#6366f1",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

