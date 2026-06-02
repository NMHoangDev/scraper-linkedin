"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface KpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  member?: {
    email: string;
    name?: string;
    kpi_target?: number;
    verified_count?: number;
    total_count?: number;
  };
  onSubmit?: (payload: KpiModalPayload) => Promise<void>;
}

export interface KpiModalPayload {
  email: string;
  kpi_per_week: number;
  start_day: string;
  end_day: string;
  platform: string;
  leader_email: string;
}

export function KpiModal({ isOpen, onClose, member, onSubmit }: KpiModalProps) {
  const [kpiPerWeek, setKpiPerWeek] = useState(member?.kpi_target?.toString() || "10");
  const [startDay, setStartDay] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1);
    return d.toISOString().split("T")[0];
  });
  const [endDay, setEndDay] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 7);
    return d.toISOString().split("T")[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !member) return null;

  const verifiedCount = member.verified_count || 0;
  const totalCount = member.total_count || 0;
  const target = parseInt(kpiPerWeek) || 0;
  const progress = target > 0 ? Math.min(100, Math.round((verifiedCount / target) * 100)) : 0;

  const handleSubmit = async () => {
    if (!onSubmit) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        email: member.email,
        kpi_per_week: parseInt(kpiPerWeek) || 0,
        start_day: startDay,
        end_day: endDay,
        platform: "Facebook",
        leader_email: "",
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-[min(90vw,440px)] rounded-2xl bg-white p-6 shadow-xl flex flex-col gap-md">
        <h2 className="text-lg font-bold text-slate-900">KPI: {member.name || member.email}</h2>

        {/* Progress */}
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-slate-600">Tiến độ</span>
            <span className="font-semibold text-slate-900">
              {verifiedCount} / {target}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div
              className={cn(
                "h-2 rounded-full transition-all",
                progress >= 100
                  ? "bg-green-500"
                  : progress >= 50
                    ? "bg-blue-500"
                    : "bg-amber-500",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">{progress}% hoàn thành KPI</p>
        </div>

        {/* Stats */}
        <div className="mb-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-lg font-bold text-slate-900">{totalCount}</p>
            <p className="text-xs text-slate-500">Tổng bài</p>
          </div>
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-lg font-bold text-green-600">{verifiedCount}</p>
            <p className="text-xs text-green-600">Đã verify</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="text-lg font-bold text-amber-600">{totalCount - verifiedCount}</p>
            <p className="text-xs text-amber-600">Chưa verify</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">KPI/tuần</label>
            <input
              type="number"
              value={kpiPerWeek}
              onChange={(e) => setKpiPerWeek(e.target.value)}
              min={0}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Từ ngày</label>
              <input
                type="date"
                value={startDay}
                onChange={(e) => setStartDay(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Đến ngày</label>
              <input
                type="date"
                value={endDay}
                onChange={(e) => setEndDay(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Đóng
          </button>
          {onSubmit && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={cn(
                "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors",
                isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/90",
              )}
            >
              {isSubmitting ? "Đang lưu..." : "Cập nhật KPI"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
