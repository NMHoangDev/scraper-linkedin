"use client";

// crmmarkeechat/CrmDetailDrawer.tsx — port từ CrmDetailDrawer.vue.
// Drawer trượt từ phải, hiển thị chi tiết deal + timeline lịch sử stage.

import { useEffect } from "react";
import {
  Building2,
  CalendarDays,
  Clock,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Tag,
  UserCog,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CrmDeal, StageHistoryEntry } from "./types";
import {
  DEAL_STAGE_META,
  formatDate,
  formatDateTime,
  formatVND,
  getContractStatusText,
  getCurrentStage,
  getServicePackageText,
} from "./crmConfig";

export interface CrmDetailDrawerProps {
  deal: CrmDeal;
  activityLog: StageHistoryEntry[];
  loadingLog?: boolean;
  onClose: () => void;
  onEdit: (deal: CrmDeal) => void;
  onChangeStage: (deal: CrmDeal) => void;
}

export default function CrmDetailDrawer({
  deal,
  activityLog,
  loadingLog = false,
  onClose,
  onEdit,
  onChangeStage,
}: CrmDetailDrawerProps) {
  const stage = getCurrentStage(deal);
  const meta = DEAL_STAGE_META[stage];

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        style={{ animation: "slideInRight 0.2s ease-out" }}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800">{deal.customer_name}</h3>
            {deal.company_name && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <Building2 className="h-3 w-3" /> {deal.company_name}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <span
              className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", meta.badgeClass)}
            >
              {meta.label}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(deal)}
                className="flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                <Pencil className="h-3 w-3" /> Sửa
              </button>
              <button
                type="button"
                onClick={() => onChangeStage(deal)}
                className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-xs text-white hover:bg-slate-700"
              >
                Đổi giai đoạn
              </button>
            </div>
          </div>

          {/* Liên hệ */}
          <section className="flex flex-col gap-1.5 text-sm text-slate-600">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Liên hệ</h4>
            {deal.phone && (
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-400" /> {deal.phone}
              </p>
            )}
            {deal.email && (
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> {deal.email}
              </p>
            )}
            {(deal.address || deal.city) && (
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {[deal.address, deal.city].filter(Boolean).join(", ")}
              </p>
            )}
            {deal.industry && (
              <p className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-slate-400" /> {deal.industry}
              </p>
            )}
          </section>

          {/* Kinh doanh */}
          <section className="flex flex-col gap-1.5 text-sm text-slate-600">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Kinh doanh</h4>
            {Number(deal.estimated_budget || 0) > 0 && (
              <p className="flex items-center gap-2 font-semibold text-emerald-700">
                <Wallet className="h-3.5 w-3.5" /> {formatVND(deal.estimated_budget)}
              </p>
            )}
            {deal.service_package && <p>Gói dịch vụ: {getServicePackageText(deal.service_package)}</p>}
            {deal.decision_maker && <p>Người ra quyết định: {deal.decision_maker}</p>}
            {deal.source_platform && <p>Nguồn: {deal.source_platform}</p>}
            {deal.contract_status && (
              <p>Trạng thái hợp đồng: {getContractStatusText(deal.contract_status)}</p>
            )}
            {deal.last_attachment_name && (
              <p className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-slate-400" /> {deal.last_attachment_name}
              </p>
            )}
          </section>

          {/* Ngày tháng */}
          <section className="flex flex-col gap-1.5 text-sm text-slate-600">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ngày tháng</h4>
            <p className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> Tạo: {formatDate(deal.created_at)}
            </p>
            {deal.follow_up_date && (
              <p className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> Follow-up: {formatDate(deal.follow_up_date)}
              </p>
            )}
            {deal.closed_at && (
              <p className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> Chốt: {formatDate(deal.closed_at)}
              </p>
            )}
            {deal.warranty_expires_at && (
              <p className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> Bảo hành đến: {formatDate(deal.warranty_expires_at)}
              </p>
            )}
          </section>

          {/* Phụ trách */}
          {(deal.lead_name || deal.sdr_name) && (
            <section className="flex flex-col gap-1.5 text-sm text-slate-600">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phụ trách</h4>
              {deal.lead_name && (
                <p className="flex items-center gap-2">
                  <UserCog className="h-3.5 w-3.5 text-slate-400" /> Lead by: {deal.lead_name}
                </p>
              )}
              {deal.sdr_name && (
                <p className="flex items-center gap-2">
                  <UserCog className="h-3.5 w-3.5 text-slate-400" /> SDR: {deal.sdr_name}
                </p>
              )}
            </section>
          )}

          {/* Lý do thất bại */}
          {stage === "lost" && (deal.reject_reason_text || deal.reject_reason) && (
            <section className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-400">
                Lý do thất bại
              </h4>
              <p>{deal.reject_reason_text || deal.reject_reason}</p>
            </section>
          )}

          {/* Ghi chú */}
          {deal.note && (
            <section className="flex flex-col gap-1.5 text-sm text-slate-600">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ghi chú</h4>
              <p className="whitespace-pre-wrap rounded bg-slate-50 px-3 py-2">{deal.note}</p>
            </section>
          )}

          {/* Timeline lịch sử */}
          <section className="flex flex-col gap-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Lịch sử thay đổi
            </h4>
            {loadingLog ? (
              <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
              </div>
            ) : activityLog.length === 0 ? (
              <p className="py-2 text-sm text-slate-400">Chưa có lịch sử.</p>
            ) : (
              <ol className="flex flex-col gap-3 border-l border-slate-200 pl-4">
                {activityLog.map((entry) => (
                  <li key={entry.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-slate-300" />
                    <p className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" /> {formatDateTime(entry.created_at)}
                    </p>
                    <p className="text-sm text-slate-700">
                      {entry.actor && <span className="font-medium">{entry.actor}</span>}
                      {entry.from_stage && entry.to_stage && (
                        <span>
                          {" "}
                          chuyển{" "}
                          <span className="font-medium">
                            {DEAL_STAGE_META[entry.from_stage as keyof typeof DEAL_STAGE_META]?.label ||
                              entry.from_stage}
                          </span>{" "}
                          →{" "}
                          <span className="font-medium">
                            {DEAL_STAGE_META[entry.to_stage as keyof typeof DEAL_STAGE_META]?.label ||
                              entry.to_stage}
                          </span>
                        </span>
                      )}
                      {!entry.from_stage && entry.action && <span> {entry.action}</span>}
                    </p>
                    {entry.note && <p className="mt-0.5 text-xs text-slate-500">{entry.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
