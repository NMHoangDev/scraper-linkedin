"use client";

import { cn } from "@/lib/utils";
import type { AccountAlert } from "@/types/seeding-account.types";

interface Props {
  data: AccountAlert[];
}

const SEVERITY_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  high: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  low: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
};

export function AccountAlertsPanel({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="overflow-hidden rounded-[15px] border border-[#e7e9ef] bg-white"
        style={{ boxShadow: "0 1px 3px rgba(20,25,40,.08), 0 8px 24px rgba(20,25,40,.04)" }}
      >
        <div className="border-b border-[#e7e9ef] px-4 py-[15px]">
          <h3 className="m-0 text-[15px] font-bold text-[#252733]">Cảnh báo tài khoản</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-sm text-muted-foreground">
          <span className="text-2xl mb-2">✅</span>
          Không có cảnh báo nào
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[15px] border border-[#e7e9ef] bg-white"
      style={{ boxShadow: "0 1px 3px rgba(20,25,40,.08), 0 8px 24px rgba(20,25,40,.04)" }}
    >
      <div className="flex items-center justify-between border-b border-[#e7e9ef] px-4 py-[15px]">
        <h3 className="m-0 text-[15px] font-bold text-[#252733]">Cảnh báo tài khoản</h3>
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#dc2626] text-[10px] font-black text-white">{data.length}</span>
      </div>
      <div className="space-y-2">
        {data.map((alert) => {
          const sev = SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.medium;
          return (
            <div
              key={alert.id}
              className={cn("flex items-start gap-3 rounded-xl px-3 py-2.5 border border-transparent", sev.bg)}
            >
              <span className="mt-[3px] h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: alert.severity === 'high' ? '#dc2626' : '#f59e0b' }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[13px] font-bold text-[#252733]">{alert.accountName}</span>
                  <span className="text-[10px] font-medium text-[#737785]">({alert.type === "inactive" ? "Không hoạt động" : alert.type === "unverified_2fa" ? "Chưa xác minh 2 lớp" : "Ít hoạt động"})</span>
                </div>
                <p className="mt-[1px] text-[12px] text-[#737785]">{alert.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

