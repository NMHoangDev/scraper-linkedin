"use client";

/**
 * DealDetailDrawer — Sheet bên phải, hiển thị chi tiết 1 deal + audit log.
 *
 * Tabs:
 *   1. Tổng quan — thông tin khách, stage hiện tại, các action nhanh
 *   2. Lịch sử (Audit Trail) — mọi lần đổi stage + ghi chú, format theo timeline
 *
 * Stage hiện tại hiển thị rõ ràng + badge cho biết transition nào là hợp lệ.
 * Won/Lost: ẩn nút "đổi stage", chỉ cho xem.
 */

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Building2,
  Tag as TagIcon,
  Clock,
  CalendarDays,
  FileText,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Wallet,
  UserCog,
  MessageCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  customerLeadService,
  type ActivityLogEntry,
  type Customer,
  type DealStage,
  DEAL_STAGE_META,
  LOST_REASON_OPTIONS,
  REJECT_REASON_TYPE_OPTIONS,
  type RejectReasonType,
} from "@/services/customer-lead.service";
import {
  allowedNextStages,
  getCurrentStage,
  stageBadgeClass,
  stageLabel,
} from "@/services/crm-pipeline.helpers";
import { QuickChatBox } from "./QuickChatBox";

interface Props {
  customer: Customer | null;
  open: boolean;
  onClose: () => void;
  onRequestTransition: (c: Customer, to: DealStage) => void;
  onEditCustomer: (c: Customer) => void;
  onDeleteCustomer: (c: Customer) => void;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("vi-VN");
}

function formatVND(value?: number | null) {
  if (!value) return null;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function contractStatusLabel(value?: Customer["contract_status"] | null) {
  if (value === "completed") return "Đã hoàn thành";
  if (value === "maintenance") return "Bảo trì / bảo hành";
  return "Đang hoạt động";
}

export function DealDetailDrawer({ customer, open, onClose, onRequestTransition, onEditCustomer, onDeleteCustomer }: Props) {
  const [log, setLog] = useState<ActivityLogEntry[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const stage = useMemo(() => (customer ? getCurrentStage(customer) : null), [customer]);
  const nextOptions = useMemo(() => (stage ? allowedNextStages(stage) : []), [stage]);

  useEffect(() => {
    if (!open || !customer) {
      setLog([]);
      return;
    }
    setLoadingLog(true);
    customerLeadService
      .getActivityLog(customer.id, { limit: 100 })
      .then((res) => setLog(res.items ?? []))
      .catch(() => setLog([]))
      .finally(() => setLoadingLog(false));
  }, [open, customer?.id]);

  if (!customer || !stage) return null;

  const isTerminal = stage === "won" || stage === "lost";
  const lostReasonLabel =
    customer.reject_reason_type
      ? LOST_REASON_OPTIONS.find((r) => r.value === customer.reject_reason_type)?.label ??
        customer.reject_reason_type
      : null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[99990] bg-black/40 backdrop-blur-sm transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-[99991] flex h-screen w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <header className={`flex items-start justify-between ${DEAL_STAGE_META[stage].headerClass} px-5 py-4 text-white`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs opacity-90">
              <span className="font-semibold uppercase tracking-wider">{stageLabel(stage)}</span>
              {customer.days_in_stage != null && (
                <span className="rounded-full bg-white/20 px-2 py-0.5">
                  {customer.days_in_stage} ngày ở stage
                </span>
              )}
            </div>
            <h2 className="mt-1 truncate text-lg font-bold">{customer.customer_name}</h2>
            {customer.company_name && (
              <div className="mt-0.5 truncate text-sm opacity-90">{customer.company_name}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Body — scroll */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 text-sm">
          {/* Contact block */}
          <section className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            {customer.phone && (
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="size-3.5 text-slate-400" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="size-3.5 text-slate-400" />
                <span className="truncate">{customer.email}</span>
              </div>
            )}
            {customer.city && (
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="size-3.5 text-slate-400" />
                <span>{customer.city}</span>
              </div>
            )}
            {customer.industry && (
              <div className="flex items-center gap-2 text-slate-700">
                <Building2 className="size-3.5 text-slate-400" />
                <span>{customer.industry}</span>
              </div>
            )}
            {(customer.tags ?? []).length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <TagIcon className="size-3.5 text-slate-400" />
                {(customer.tags ?? []).map((t) => (
                  <span key={t} className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Pipeline history */}
          {isTerminal && (
            <section
              className={`flex items-start gap-2 rounded-md p-3 text-xs ${
                stage === "won"
                  ? "border border-green-200 bg-green-50 text-green-800"
                  : "border border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {stage === "won" ? (
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              )}
              <div>
                <div className="font-semibold">
                  Deal {stage === "won" ? "đã thắng" : "đã thua"} — trạng thái kết thúc.
                </div>
                {lostReasonLabel && (
                  <div className="mt-0.5">
                    Lý do: <b>{lostReasonLabel}</b>
                    {customer.reject_reason && (
                      <span className="ml-1 text-slate-600">— {customer.reject_reason}</span>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Pipeline meta */}
          <section className="grid grid-cols-2 gap-2">
            {customer.decision_maker && (
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
                  <UserCog className="size-3" /> Decision Maker
                </div>
                <div className="mt-0.5 truncate font-medium text-slate-700">{customer.decision_maker}</div>
              </div>
            )}
            {customer.estimated_budget ? (
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
                  <Wallet className="size-3" /> Ngân sách
                </div>
                <div className="mt-0.5 font-semibold text-slate-700">
                  {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(
                    customer.estimated_budget,
                  )}
                </div>
              </div>
            ) : null}
            {customer.follow_up_date && (
              <div className="col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <Clock className="mr-1 inline size-3" />
                Follow-up dự kiến: <b>{new Date(customer.follow_up_date).toLocaleDateString("vi-VN")}</b>
              </div>
            )}
          </section>

          {/* Ghi chú hiện tại */}
          {(customer.service_package ||
            customer.lifetime_value ||
            customer.contract_status ||
            customer.contract_signed_at ||
            customer.warranty_expires_at ||
            customer.customer_since ||
            customer.last_care_at ||
            customer.last_attachment_name ||
            customer.care_note) && (
            <section className="space-y-2">
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                Hợp đồng & chăm sóc
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {customer.service_package && (
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
                      <TagIcon className="size-3" /> Gói dịch vụ
                    </div>
                    <div className="mt-0.5 truncate font-medium text-slate-700">{customer.service_package}</div>
                  </div>
                )}
                {customer.lifetime_value ? (
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
                      <Wallet className="size-3" /> Giá trị hợp đồng
                    </div>
                    <div className="mt-0.5 font-semibold text-slate-700">{formatVND(customer.lifetime_value)}</div>
                  </div>
                ) : null}
                {customer.contract_status && (
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
                      <FileText className="size-3" /> Trạng thái hợp đồng
                    </div>
                    <div className="mt-0.5 truncate font-medium text-slate-700">
                      {contractStatusLabel(customer.contract_status)}
                    </div>
                  </div>
                )}
                {customer.last_attachment_name && (
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
                      <FileText className="size-3" /> File hợp đồng / báo giá
                    </div>
                    {customer.last_attachment_url ? (
                      <a
                        href={customer.last_attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 block truncate font-medium text-blue-700 hover:underline"
                      >
                        {customer.last_attachment_name}
                      </a>
                    ) : (
                      <div className="mt-0.5 truncate font-medium text-slate-700">
                        {customer.last_attachment_name}
                      </div>
                    )}
                  </div>
                )}
                {customer.customer_since && (
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
                      <CalendarDays className="size-3" /> Ngày thành khách hàng
                    </div>
                    <div className="mt-0.5 font-medium text-slate-700">{formatDate(customer.customer_since)}</div>
                  </div>
                )}
                {customer.contract_signed_at && (
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
                      <CalendarDays className="size-3" /> Ngày ký
                    </div>
                    <div className="mt-0.5 font-medium text-slate-700">{formatDate(customer.contract_signed_at)}</div>
                  </div>
                )}
                {customer.warranty_expires_at && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-amber-700">
                      <CalendarDays className="size-3" /> Hết hạn bảo hành
                    </div>
                    <div className="mt-0.5 font-medium text-amber-800">{formatDate(customer.warranty_expires_at)}</div>
                  </div>
                )}
                {customer.last_care_at && (
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
                      <Clock className="size-3" /> Chăm sóc gần nhất
                    </div>
                    <div className="mt-0.5 font-medium text-slate-700">{formatDate(customer.last_care_at)}</div>
                  </div>
                )}
              </div>
              {customer.care_note && (
                <p className="whitespace-pre-line rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  {customer.care_note}
                </p>
              )}
            </section>
          )}

          {customer.note && (
            <section>
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                Ghi chú
              </h4>
              <p className="whitespace-pre-line rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
                {customer.note}
              </p>
            </section>
          )}

          {/* Actions — chỉ hiện khi chưa terminal */}
          {!isTerminal && (
            <section>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Chuyển stage tiếp theo
              </h4>
              <div className="flex flex-wrap gap-2">
                {nextOptions.map((to) => {
                  const m = DEAL_STAGE_META[to];
                  return (
                    <button
                      key={to}
                      onClick={() => onRequestTransition(customer, to)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition ${m.badgeClass} hover:brightness-95`}
                    >
                      <ArrowRight className="size-3" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
              {stage === "on_hold" && (
                <p className="mt-2 text-[11px] text-slate-500">
                  Deal này đang tạm dừng. Chỉ có thể chuyển sang Lost, hoặc{" "}
                  <button
                    onClick={() => customer.prev_stage && onRequestTransition(customer, customer.prev_stage)}
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                    disabled={!customer.prev_stage}
                  >
                    resume về {customer.prev_stage ? DEAL_STAGE_META[customer.prev_stage].label : "stage trước"}
                  </button>
                  .
                </p>
              )}
            </section>
          )}

          {/* Stage history (audit trail) */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Lịch sử thay đổi stage
            </h4>
            {loadingLog ? (
              <div className="flex items-center gap-2 py-4 text-xs text-slate-500">
                <Loader2 className="size-3.5 animate-spin" /> Đang tải…
              </div>
            ) : log.length === 0 ? (
              <p className="rounded-md bg-slate-50 p-3 text-xs text-slate-500">Chưa có lịch sử.</p>
            ) : (
              <ol className="relative space-y-3 border-l-2 border-slate-200 pl-4">
                {log.map((entry) => (
                  <li key={entry.id} className="relative">
                    <span
                      className={`absolute -left-[1.41rem] top-1 size-2.5 rounded-full ring-4 ring-white ${
                        entry.to_stage ? stageBadgeClass(entry.to_stage).split(" ")[1]?.replace("text-", "bg-") : "bg-slate-400"
                      }`}
                    />
                    <div className="text-[11px] uppercase tracking-wider text-slate-400">
                      {new Date(entry.created_at).toLocaleString("vi-VN")}
                      {entry.actor ? ` • ${entry.actor}` : ""}
                    </div>
                    {entry.from_stage && entry.to_stage ? (
                      <div className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                        <span className={`rounded px-1.5 py-0.5 text-[11px] ${stageBadgeClass(entry.from_stage)}`}>
                          {stageLabel(entry.from_stage)}
                        </span>
                        <ArrowRight className="size-3 text-slate-400" />
                        <span className={`rounded px-1.5 py-0.5 text-[11px] ${stageBadgeClass(entry.to_stage)}`}>
                          {stageLabel(entry.to_stage)}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-0.5 text-sm text-slate-700">{entry.action}</div>
                    )}
                    {entry.note && (
                      <p className="mt-1 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">
                        {entry.note}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Footer — 3 nút chính: Chăm sóc nhanh / Sửa / Xóa, luôn hiển thị */}
        <footer className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
          <div className="flex gap-2">
            <button
              onClick={() => setChatOpen(true)}
              disabled={!customer.conv_id}
              title={customer.conv_id ? "Mở chat nhanh" : "Khách chưa có hội thoại"}
              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MessageCircle className="size-3.5" /> Chăm sóc nhanh
            </button>
            <button
              onClick={() => onEditCustomer(customer)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              <UserCog className="size-3.5" /> Sửa thông tin
            </button>
            <button
              onClick={() => {
                if (confirm(`Xóa khách hàng "${customer.customer_name}"?\nHành động này không thể hoàn tác.`)) {
                  onDeleteCustomer(customer);
                  onClose();
                }
              }}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
            >
              <Trash2 className="size-3.5" /> Xóa
            </button>
          </div>
          <button
            onClick={onClose}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
          >
            Đóng
          </button>
        </footer>
      </aside>

      {chatOpen && customer.conv_id && (
        <QuickChatBox
          convId={customer.conv_id}
          customerName={customer.customer_name}
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  );
}

// re-export for callers
export { REJECT_REASON_TYPE_OPTIONS };
