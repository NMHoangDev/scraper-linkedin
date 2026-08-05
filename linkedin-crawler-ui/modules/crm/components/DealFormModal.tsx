'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react';
import {
  DealFormFields,
  buildDealPayload,
  dealFormFromDeal,
  emptyDealForm,
  getSourceLabel,
  validateDealForm,
} from './DealFormFields';
import type { DealFormState } from './DealFormFields';
import { Loader2, X } from './icons';
import type { CreateDealInput, CrmUserOption, Deal, UpdateDealInput } from '../types';

// Nháp deal đang tạo (chưa bấm "Tạo deal") — lưu localStorage để lỡ tay
// click ra ngoài / đóng modal cũng không mất dữ liệu đã điền.
const CRM_DEAL_DRAFT_KEY = 'crm:deal-draft:v1';

function loadDealDraft(): DealFormState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CRM_DEAL_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as DealFormState) : null;
  } catch {
    return null;
  }
}

export function clearDealDraft() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CRM_DEAL_DRAFT_KEY);
}

export function DealFormModal({
  open,
  loading,
  deal,
  onClose,
  onCreate,
  onUpdate,
  agents = [],
  sourceOptions,
  servicePackageOptions,
  packageOptions,
  industryOptions,
}: {
  open: boolean;
  loading?: boolean;
  deal?: Deal | null;
  onClose: () => void;
  onCreate: (input: CreateDealInput) => void;
  onUpdate: (id: string, input: UpdateDealInput) => void;
  agents?: CrmUserOption[];
  sourceOptions?: Array<{ value: string; label: string }>;
  servicePackageOptions?: Array<{ value: string; label: string }>;
  packageOptions?: Array<{ value: string; label: string }>;
  industryOptions?: Array<{ value: string; label: string }>;
}) {
  const [form, setForm] = useState<DealFormState>(emptyDealForm);

  useEffect(() => {
    if (!open) return;
    if (deal) {
      setForm(dealFormFromDeal(deal));
      return;
    }
    setForm(loadDealDraft() || emptyDealForm());
  }, [deal, open]);

  // Chỉ lưu nháp khi đang TẠO MỚI (không phải sửa deal có sẵn) — tránh
  // nháp cũ ghi đè lên dữ liệu deal thật khi mở form sửa.
  useEffect(() => {
    if (!open || deal) return;
    try {
      window.localStorage.setItem(CRM_DEAL_DRAFT_KEY, JSON.stringify(form));
    } catch {
      // localStorage đầy hoặc bị chặn — bỏ qua, không phải lỗi nghiêm trọng.
    }
  }, [form, open, deal]);

  function setValue<K extends keyof DealFormState>(key: K, value: DealFormState[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validateDealForm(form);
    if (validationError) {
      window.alert(validationError);
      return;
    }
    const payload = buildDealPayload(form, agents);
    if (deal) onUpdate(deal.id, payload);
    else onCreate(payload as CreateDealInput);
  }

  if (!open) return null;

  return (
    <div className="crm-modal-backdrop" onClick={onClose}>
      <div className="crm-modal" onClick={event => event.stopPropagation()}>
        <header className="crm-modal-header">
          <div>
            <h2 className="crm-modal-title">{deal ? 'Chỉnh sửa deal' : 'Thêm deal'}</h2>
            <p className="crm-modal-subtitle">Nguồn: {getSourceLabel(form.sourcePlatform)}</p>
          </div>
          <button type="button" className="crm-modal-close" onClick={onClose} aria-label="Đóng">
            <X className="crm-icon" />
          </button>
        </header>

        <form id="crmDealForm" className="crm-modal-body" onSubmit={handleSubmit}>
          <DealFormFields
            form={form}
            setValue={setValue}
            agents={agents}
            sourceOptions={sourceOptions}
            servicePackageOptions={servicePackageOptions}
            packageOptions={packageOptions}
            industryOptions={industryOptions}
          />
        </form>

        <footer className="crm-modal-footer">
          <button type="button" className="crm-cancel-button" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" form="crmDealForm" className="crm-save-button" disabled={loading}>
            {loading ? <Loader2 className="crm-save-spinner" /> : null}
            {loading ? 'Đang lưu...' : deal ? 'Lưu thay đổi' : 'Tạo deal'}
          </button>
        </footer>
      </div>
    </div>
  );
}
