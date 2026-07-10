"use client";

// crmmarkeechat/CrmStageModal.tsx — port từ CrmStageModal.vue.
// Modal đổi giai đoạn deal: chọn stage đích, nhập ghi chú/ngân sách/lý do fail...

import { useEffect, useMemo, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CrmDeal, DealStage, StageTransitionPayload } from "./types";
import {
  DEAL_STAGE_META,
  LOST_REASON_OPTIONS,
  STAGE_REQUIREMENTS,
  allowedNextStages,
  getCurrentStage,
} from "./crmConfig";

export interface CrmStageModalProps {
  deal: CrmDeal;
  initialToStage?: DealStage;
  onClose: () => void;
  onSubmit: (payload: StageTransitionPayload) => void;
}

export default function CrmStageModal({ deal, initialToStage, onClose, onSubmit }: CrmStageModalProps) {
  const fromStage = getCurrentStage(deal);
  const options = useMemo(() => allowedNextStages(fromStage), [fromStage]);

  const [toStage, setToStage] = useState<DealStage>(initialToStage || options[0] || fromStage);
  const [note, setNote] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [rejectReasonType, setRejectReasonType] = useState("");
  const [rejectReasonText, setRejectReasonText] = useState("");
  const [decisionMaker, setDecisionMaker] = useState(deal.decision_maker || "");
  const [estimatedBudget, setEstimatedBudget] = useState<number | "">(deal.estimated_budget ?? "");
  const [followUpDate, setFollowUpDate] = useState(deal.follow_up_date || "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const requirement = STAGE_REQUIREMENTS[toStage] || {};
  const stageMeta = DEAL_STAGE_META[toStage];

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentName(file.name);
    setAttachmentUrl(URL.createObjectURL(file));
  }

  function handleSubmit() {
    if (requirement.requireNote && !note.trim()) {
      setError("Vui lòng nhập ghi chú.");
      return;
    }
    if (requirement.requireBudget && !estimatedBudget) {
      setError("Vui lòng nhập ngân sách ước tính.");
      return;
    }
    if (requirement.requireDecisionMaker && !decisionMaker.trim()) {
      setError("Vui lòng nhập người ra quyết định.");
      return;
    }
    if (requirement.requireAttachment && !attachmentUrl) {
      setError("Vui lòng đính kèm tệp.");
      return;
    }
    if (requirement.requireRejectReason && !rejectReasonType) {
      setError("Vui lòng chọn lý do thất bại.");
      return;
    }
    if (requirement.requireFollowUp && !followUpDate) {
      setError("Vui lòng chọn ngày follow-up.");
      return;
    }
    setError(null);

    const rejectReasonLabel =
      LOST_REASON_OPTIONS.find((o) => o.value === rejectReasonType)?.label || "";

    onSubmit({
      to_stage: toStage,
      note,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      reject_reason_type: rejectReasonType,
      reject_reason_text: rejectReasonText,
      reject_reason: rejectReasonType ? rejectReasonLabel : "",
      decision_maker: decisionMaker,
      estimated_budget: estimatedBudget === "" ? undefined : Number(estimatedBudget),
      follow_up_date: followUpDate,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-md flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-800">Chuyển giai đoạn deal</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto px-4 py-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Giai đoạn đích</label>
            <select
              value={toStage}
              onChange={(e) => setToStage(e.target.value as DealStage)}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              {options.map((stage) => (
                <option key={stage} value={stage}>
                  {DEAL_STAGE_META[stage].label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">{stageMeta.description}</p>
          </div>

          {requirement.requireDecisionMaker && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Người ra quyết định <span className="text-red-500">*</span>
              </label>
              <input
                value={decisionMaker}
                onChange={(e) => setDecisionMaker(e.target.value)}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
          )}

          {requirement.requireBudget && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Ngân sách ước tính (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={estimatedBudget}
                onChange={(e) => setEstimatedBudget(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
          )}

          {requirement.requireFollowUp && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Ngày follow-up <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
          )}

          {requirement.requireRejectReason && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Lý do thất bại <span className="text-red-500">*</span>
              </label>
              <select
                value={rejectReasonType}
                onChange={(e) => setRejectReasonType(e.target.value)}
                className="mb-2 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">-- Chọn lý do --</option>
                {LOST_REASON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <textarea
                value={rejectReasonText}
                onChange={(e) => setRejectReasonText(e.target.value)}
                placeholder="Ghi chú thêm về lý do thất bại..."
                rows={2}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
          )}

          {requirement.requireAttachment && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Tệp đính kèm <span className="text-red-500">*</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed border-slate-300 px-2 py-2 text-xs text-slate-500 hover:bg-slate-50">
                <Paperclip className="h-4 w-4" />
                {attachmentName || "Chọn tệp..."}
                <input type="file" onChange={handleFilePick} className="hidden" />
              </label>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Ghi chú {requirement.requireNote && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className={cn("flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3")}>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
