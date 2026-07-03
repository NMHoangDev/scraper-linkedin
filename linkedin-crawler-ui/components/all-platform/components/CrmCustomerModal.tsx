"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  customerLeadService,
  type Customer,
  type SourcePlatform,
  type RejectReasonType,
  type ReviewResult,
  SOURCE_PLATFORM_OPTIONS,
  INDUSTRY_OPTIONS,
  CITY_OPTIONS,
  HAS_BUDGET_OPTIONS,
  CARE_NOTE_OPTIONS,
  REJECT_REASON_TYPE_OPTIONS,
  REVIEW_RESULT_OPTIONS,
} from "@/services/customer-lead.service";
import { toast } from "sonner";

interface CrmCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  /** Conv ID of the current FB/Zalo conversation (for auto-detection) */
  defaultConvId?: string;
  /** Auto-detected customer name from conversation */
  defaultCustomerName?: string;
  /** Platform context — if provided, pre-selects source_platform */
  defaultSourcePlatform?: SourcePlatform;
  onSuccess?: (customer: Customer) => void;
}

const emptyForm = (): Partial<Customer> => ({
  customer_name: "",
  company_name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  website: "",
  industry: "",
  tax_code: "",
  conv_id: "",
  source_platform: "FB_Inbox",
  status: "pending",
  activity_status: "active",
  has_budget: false,
  service_package: "",
  lifetime_value: null,
  contract_signed_at: null,
  contract_status: "active",
  warranty_expires_at: null,
  care_note: "",
  tags: [],
  note: "",
  reject_reason: "",
  reject_reason_type: null,
  review_result: "Chua_xem_xet",
  sdr_id: "",
  is_assigned: false,
});

export function CrmCustomerModal({
  isOpen,
  onClose,
  customer,
  defaultConvId,
  defaultCustomerName,
  defaultSourcePlatform,
  onSuccess,
}: CrmCustomerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sdrs, setSdrs] = useState<any[]>([]);
  const [formData, setFormData] = useState<Partial<Customer>>(emptyForm());
  const [tagInput, setTagInput] = useState("");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (customer) {
      setFormData({ ...customer });
    } else {
      const src = defaultSourcePlatform ?? "FB_Inbox";
      setFormData({
        ...emptyForm(),
        conv_id: defaultConvId ?? "",
        customer_name: defaultCustomerName ?? "",
        source_platform: src,
      });
    }

    customerLeadService.getSdrs().then(setSdrs).catch(() => {});
  }, [isOpen, customer, defaultConvId, defaultCustomerName, defaultSourcePlatform]);

  if (!isOpen) return null;

  const set = <K extends keyof Customer>(key: K, value: Customer[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name?.trim()) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }
    setLoading(true);
    try {
      const payload = { ...formData };
      if (payload.sdr_id) payload.is_assigned = true;
      else { payload.is_assigned = false; payload.sdr_id = undefined; }

      let res: any;
      if (customer?.id) {
        res = await customerLeadService.update(customer.id, payload);
      } else {
        res = await customerLeadService.create(payload);
      }

      if (res.success) {
        toast.success(customer?.id ? "Cập nhật khách hàng thành công!" : "Lưu khách hàng thành công!");
        onSuccess?.(res.data as Customer);
        onClose();
      } else {
        toast.error(res.message || "Có lỗi xảy ra");
      }
    } catch {
      toast.error("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const removeTag = (tag: string) =>
    set("tags", (formData.tags ?? []).filter((t) => t !== tag));

  const handleAddTag = (tag: string) => {
    const t = tag.trim();
    if (t && !(formData.tags ?? []).includes(t)) {
      set("tags", [...(formData.tags ?? []), t]);
    }
    setTagInput("");
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      style={{ position: "fixed", inset: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] my-4"
        style={{ width: "100%", maxWidth: "672px", minWidth: "300px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {customer ? "Chỉnh sửa Khách hàng" : "Lưu Khách hàng (CRM)"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {formData.source_platform
                ? `Nguồn: ${SOURCE_PLATFORM_OPTIONS.find((o) => o.value === formData.source_platform)?.label ?? formData.source_platform}`
                : "Chưa chọn nguồn"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <form id="crmForm" onSubmit={handleSubmit} className="space-y-5">

            {/* ── Section: Thông tin cơ bản ── */}
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                Thông tin cơ bản
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Tên KH */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tên khách hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" required
                    value={formData.customer_name ?? ""}
                    onChange={(e) => set("customer_name", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm"
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                {/* Công ty */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tên công ty / Dự án
                  </label>
                  <input
                    type="text"
                    value={formData.company_name ?? ""}
                    onChange={(e) => set("company_name", e.target.value || null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm"
                    placeholder="Công ty TNHH ABC..."
                  />
                </div>

                {/* Điện thoại */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Điện thoại</label>
                  <input
                    type="text"
                    value={formData.phone ?? ""}
                    onChange={(e) => set("phone", e.target.value || null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm"
                    placeholder="0912 345 678"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email ?? ""}
                    onChange={(e) => set("email", e.target.value || null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm"
                    placeholder="khach@email.com"
                  />
                </div>

                {/* Website */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Website</label>
                  <input
                    type="text"
                    value={formData.website ?? ""}
                    onChange={(e) => set("website", e.target.value || null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm"
                    placeholder="https://..."
                  />
                </div>

                {/* Mã số thuế */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mã số thuế</label>
                  <input
                    type="text"
                    value={formData.tax_code ?? ""}
                    onChange={(e) => set("tax_code", e.target.value || null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm"
                    placeholder="0123456789"
                  />
                </div>
              </div>
            </div>

            {/* ── Section: Địa chỉ & Lĩnh vực ── */}
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                Địa chỉ & Lĩnh vực
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Thành phố */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Thành phố</label>
                  <select
                    value={formData.city ?? ""}
                    onChange={(e) => set("city", e.target.value || null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm bg-white"
                  >
                    <option value="">-- Chọn thành phố --</option>
                    {CITY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Lĩnh vực */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Lĩnh vực</label>
                  <select
                    value={formData.industry ?? ""}
                    onChange={(e) => set("industry", e.target.value || null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm bg-white"
                  >
                    <option value="">-- Chọn lĩnh vực --</option>
                    {INDUSTRY_OPTIONS.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>

                {/* Địa chỉ */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Địa chỉ</label>
                  <input
                    type="text"
                    value={formData.address ?? ""}
                    onChange={(e) => set("address", e.target.value || null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm"
                    placeholder="123 Đường ABC, Quận 1, TP.HCM"
                  />
                </div>
              </div>
            </div>

            {/* ── Section: Nguồn & Ngân sách ── */}
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                Nguồn & Ngân sách
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Nguồn */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nguồn</label>
                  <select
                    value={formData.source_platform ?? "FB_Inbox"}
                    onChange={(e) => set("source_platform", e.target.value as SourcePlatform)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm bg-white"
                  >
                    {SOURCE_PLATFORM_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Ngân sách */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ngân sách</label>
                  <select
                    value={String(formData.has_budget ?? false)}
                    onChange={(e) => set("has_budget", e.target.value === "true")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm bg-white"
                  >
                    {HAS_BUDGET_OPTIONS.map((o) => (
                      <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Section: Trạng thái & Review ── */}
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                Trạng thái & Review
              </p>
              <div className="grid grid-cols-3 gap-3">
                {/* Trạng thái */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Trạng thái</label>
                  <select
                    value={formData.status ?? "pending"}
                    onChange={(e) => set("status", e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm bg-white"
                  >
                    <option value="pending">Đang chờ</option>
                    <option value="closed">Đã chốt</option>
                    <option value="rejected">Từ chối</option>
                  </select>
                </div>

                {/* Hoạt động */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Hoạt động</label>
                  <select
                    value={formData.activity_status ?? "active"}
                    onChange={(e) => set("activity_status", e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Tạm ngưng</option>
                    <option value="churned">Đã rời</option>
                  </select>
                </div>

                {/* Review result */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Review</label>
                  <select
                    value={formData.review_result ?? "Chua_xem_xet"}
                    onChange={(e) => set("review_result", e.target.value as ReviewResult)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm bg-white"
                  >
                    {REVIEW_RESULT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Reject reason block ── */}
            {formData.status === "rejected" && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                <p className="text-xs font-bold uppercase text-red-500 tracking-wider">
                  Lý do từ chối
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Loại lý do</label>
                  <select
                    value={formData.reject_reason_type ?? ""}
                    onChange={(e) => set("reject_reason_type", e.target.value as RejectReasonType || null)}
                    className="w-full px-3 py-2 border border-red-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm bg-white"
                  >
                    <option value="">-- Chọn lý do --</option>
                    {REJECT_REASON_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mô tả thêm</label>
                  <input
                    type="text"
                    value={formData.reject_reason ?? ""}
                    onChange={(e) => set("reject_reason", e.target.value || null)}
                    className="w-full px-3 py-2 border border-red-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm"
                    placeholder="Ghi chú thêm..."
                  />
                </div>
              </div>
            )}

            {/* ── Section: Giao dịch ── */}
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                Giao dịch & Hợp đồng
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Gói dịch vụ</label>
                  <input
                    type="text"
                    value={formData.service_package ?? ""}
                    onChange={(e) => set("service_package", e.target.value || null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm"
                    placeholder="Gói Nâng cao 2tr/tháng"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Giá trị (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.lifetime_value ?? ""}
                    onChange={(e) => set("lifetime_value", e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm"
                    placeholder="2,000,000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày ký HĐ</label>
                  <input
                    type="date"
                    value={formData.contract_signed_at ? String(formData.contract_signed_at).split("T")[0] : ""}
                    onChange={(e) => set("contract_signed_at", e.target.value ? `${e.target.value}T00:00:00Z` : null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Trạng thái HĐ</label>
                  <select
                    value={formData.contract_status ?? "active"}
                    onChange={(e) => set("contract_status", e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm bg-white"
                  >
                    <option value="active">Đang triển khai</option>
                    <option value="completed">Đã hoàn thành</option>
                    <option value="maintenance">Đang bảo trì</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày hết BH</label>
                  <input
                    type="date"
                    value={formData.warranty_expires_at ? String(formData.warranty_expires_at).split("T")[0] : ""}
                    onChange={(e) => set("warranty_expires_at", e.target.value ? `${e.target.value}T00:00:00Z` : null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Khách từ ngày</label>
                  <input
                    type="date"
                    value={formData.customer_since ? String(formData.customer_since).split("T")[0] : ""}
                    onChange={(e) => set("customer_since", e.target.value ? `${e.target.value}T00:00:00Z` : null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* ── Section: Ghi chú liên lạc ── */}
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                Ghi chú liên lạc
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Ghi chú nhu cầu / Liên lạc
                </label>
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      const existing = formData.note ?? "";
                      set("note", existing ? `${existing}\n- ${val}` : `- ${val}`);
                    }
                    e.target.value = "";
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm bg-white mb-2"
                >
                  <option value="">+ Thêm nhanh ghi chú liên lạc...</option>
                  {CARE_NOTE_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <textarea
                  value={formData.note ?? ""}
                  onChange={(e) => set("note", e.target.value || null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm min-h-[80px]"
                  placeholder="Yêu cầu cụ thể, ghi chú liên lạc..."
                />
              </div>
            </div>

            {/* ── Section: Chăm sóc sau bán ── */}
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                Chăm sóc sau bán
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú chăm sóc</label>
                  <textarea
                    value={formData.care_note ?? ""}
                    onChange={(e) => set("care_note", e.target.value || null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm min-h-[60px]"
                    placeholder="Nhắc nhở: gọi lại sau 1 tuần, upsell gói B..."
                  />
                </div>
              </div>
            </div>

            {/* ── Section: Tags & Giao SDR ── */}
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                Tags & Phân công
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Tags */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tags</label>
                  <div className="flex flex-wrap gap-1 mb-1.5 min-h-[28px]">
                    {(formData.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-slate-400 hover:text-red-500 leading-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleAddTag(tagInput); }
                      }}
                      className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-red-500/30"
                      placeholder="VIP, referral..."
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTag(tagInput)}
                      className="px-2 py-1.5 bg-slate-100 text-slate-600 text-xs rounded hover:bg-slate-200 border border-slate-300"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* SDR giao */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Giao cho SDR</label>
                  <select
                    value={formData.sdr_id ?? ""}
                    onChange={(e) => set("sdr_id", e.target.value || null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm bg-white"
                  >
                    <option value="">-- Không giao --</option>
                    {sdrs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name ?? s.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Hidden conv_id */}
            {formData.conv_id && (
              <input type="hidden" value={formData.conv_id} />
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 font-medium transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="crmForm"
            disabled={loading}
            className="px-5 py-2 text-sm text-white bg-primary rounded-xl hover:opacity-90 font-medium transition-colors disabled:opacity-50 shadow-sm shadow-red-500/20 flex items-center gap-1"
          >
            {loading ? "Đang lưu..." : "Lưu khách hàng"}
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
