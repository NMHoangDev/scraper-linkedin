"use client";

// crmmarkeechat/CrmCustomerModal.tsx — port từ CrmCustomerModal.vue.
// Form tạo/sửa deal, chia 6 nhóm: cơ bản, liên hệ, kinh doanh, phân loại, phụ trách, ghi chú.

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { AssigneeOption, CrmDeal, DealStage } from "./types";
import {
  CITY_OPTIONS,
  INDUSTRY_OPTIONS,
  PRIORITY_OPTIONS,
  SERVICE_PACKAGE_OPTIONS,
  SOURCE_OPTIONS,
} from "./crmConfig";
import { MOCK_ASSIGNEES } from "./mockData";

export interface CrmCustomerModalProps {
  deal?: CrmDeal | null;
  onClose: () => void;
  onSubmit: (payload: Partial<CrmDeal>) => void;
}

const EMPTY_FORM: Partial<CrmDeal> = {
  customer_name: "",
  company_name: "",
  phone: "",
  email: "",
  website: "",
  tax_code: "",
  address: "",
  city: "",
  industry: "",
  source_platform: "Manual",
  service_package: "",
  deal_stage: "new_lead" as DealStage,
  decision_maker: "",
  estimated_budget: undefined,
  priority: "medium",
  leaded_by: "",
  sdr_id: "",
  note: "",
};

export default function CrmCustomerModal({ deal, onClose, onSubmit }: CrmCustomerModalProps) {
  const [form, setForm] = useState<Partial<CrmDeal>>(deal ? { ...deal } : { ...EMPTY_FORM });
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(deal);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function update<K extends keyof CrmDeal>(key: K, value: CrmDeal[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (!form.customer_name?.trim()) {
      setError("Vui lòng nhập tên khách hàng.");
      return;
    }
    setError(null);
    onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-800">
            {isEdit ? "Sửa deal" : "Tạo deal mới"}
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-4 py-4">
          {/* Thông tin cơ bản */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Thông tin cơ bản
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tên khách hàng" required>
                <input
                  value={form.customer_name || ""}
                  onChange={(e) => update("customer_name", e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Công ty">
                <input
                  value={form.company_name || ""}
                  onChange={(e) => update("company_name", e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Mã số thuế">
                <input
                  value={form.tax_code || ""}
                  onChange={(e) => update("tax_code", e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Ngành">
                <select
                  value={form.industry || ""}
                  onChange={(e) => update("industry", e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">-- Chọn ngành --</option>
                  {INDUSTRY_OPTIONS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* Liên hệ */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Liên hệ
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Điện thoại">
                <input
                  value={form.phone || ""}
                  onChange={(e) => update("phone", e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Email">
                <input
                  value={form.email || ""}
                  onChange={(e) => update("email", e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Website">
                <input
                  value={form.website || ""}
                  onChange={(e) => update("website", e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Tỉnh/Thành phố">
                <select
                  value={form.city || ""}
                  onChange={(e) => update("city", e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">-- Chọn tỉnh/thành --</option>
                  {CITY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Địa chỉ" span2>
                <input
                  value={form.address || ""}
                  onChange={(e) => update("address", e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </Field>
            </div>
          </section>

          {/* Kinh doanh */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Kinh doanh
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Gói dịch vụ">
                <select
                  value={form.service_package || ""}
                  onChange={(e) => update("service_package", e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">-- Chọn gói --</option>
                  {SERVICE_PACKAGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ngân sách ước tính (VNĐ)">
                <input
                  type="number"
                  value={form.estimated_budget ?? ""}
                  onChange={(e) =>
                    update("estimated_budget", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Người ra quyết định">
                <input
                  value={form.decision_maker || ""}
                  onChange={(e) => update("decision_maker", e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Nguồn">
                <select
                  value={form.source_platform || "Manual"}
                  onChange={(e) => update("source_platform", e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* Phân loại */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Phân loại
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Độ ưu tiên">
                <select
                  value={form.priority || "medium"}
                  onChange={(e) => update("priority", e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* Phụ trách */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Phụ trách
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lead by">
                <select
                  value={form.leaded_by || ""}
                  onChange={(e) => update("leaded_by", e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">-- Chưa gán --</option>
                  {MOCK_ASSIGNEES.map((a: AssigneeOption) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="SDR phụ trách">
                <select
                  value={form.sdr_id || ""}
                  onChange={(e) => update("sdr_id", e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">-- Chưa gán --</option>
                  {MOCK_ASSIGNEES.map((a: AssigneeOption) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* Ghi chú */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Ghi chú
            </h4>
            <textarea
              value={form.note || ""}
              onChange={(e) => update("note", e.target.value)}
              rows={3}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </section>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
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
            {isEdit ? "Lưu thay đổi" : "Tạo deal"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  span2,
  children,
}: {
  label: string;
  required?: boolean;
  span2?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={span2 ? "col-span-2 flex flex-col gap-1" : "flex flex-col gap-1"}>
      <span className="text-xs font-medium text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
