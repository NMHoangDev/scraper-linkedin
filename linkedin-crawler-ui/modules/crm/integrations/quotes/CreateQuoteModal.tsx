'use client';

import { useState } from 'react';
import type { QuoteForm } from '@/modules/quotes';
import { seedingQuoteRepository } from '@/modules/quotes';
import type { Quote } from '@/modules/quotes';
import { buildDealPayload, emptyDealForm } from '../../components/DealFormFields';
import type { DealFormState } from '../../components/DealFormFields';
import { CheckCircle2, Loader2, X } from '../../components/icons';
import { seedingCrmRepository } from '../../repositories/SeedingCrmRepository';
import type { CreateDealInput, CrmUserOption, Deal } from '../../types';
import { FillQuoteStep } from './FillQuoteStep';
import { ReviewQuoteStep } from './ReviewQuoteStep';
import { SelectCustomerStep } from './SelectCustomerStep';
import { SelectQuoteFormStep } from './SelectQuoteFormStep';
import { emptyQuoteDraft, quoteDraftFromForm } from './types';
import type { QuoteDraft } from './types';

type CreateQuoteStep = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<CreateQuoteStep, string> = {
  1: 'Khách hàng',
  2: 'Chọn mẫu',
  3: 'Báo giá',
  4: 'Xác nhận',
};

export function CreateQuoteModal({
  open,
  deals,
  agents = [],
  initialDeal,
  onClose,
  onCreated,
}: {
  open: boolean;
  deals: Deal[];
  agents?: CrmUserOption[];
  /** Nếu mở từ nút "Tạo báo giá cho deal này" trong chi tiết deal — điền sẵn khách
   * hàng + gắn thẳng deal đó, không cần tìm lại. */
  initialDeal?: Deal | null;
  onClose: () => void;
  onCreated: (quote: Quote) => void;
}) {
  const [step, setStep] = useState<CreateQuoteStep>(1);
  const [customer, setCustomer] = useState<DealFormState>(emptyDealForm);
  const [selectedForm, setSelectedForm] = useState<QuoteForm | null>(null);
  const [previewForm, setPreviewForm] = useState<QuoteForm | null>(null);
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft>(emptyQuoteDraft);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function resetAndClose() {
    if (submitting) return;
    setStep(1);
    setCustomer(emptyDealForm());
    setSelectedForm(null);
    setPreviewForm(null);
    setQuoteDraft(emptyQuoteDraft());
    setSubmitError('');
    onClose();
  }

  if (!open) return null;

  const activeCustomer =
    initialDeal && !customer.customerName.trim()
      ? { ...customer, customerName: initialDeal.customerName, companyName: initialDeal.companyName || '', phone: initialDeal.phone || '', email: initialDeal.email || '', address: initialDeal.address || '' }
      : customer;
  // Chỉ gắn deal có sẵn khi mở từ "Tạo báo giá cho deal này" (initialDeal cố
  // định). Luồng tự do (đứng nút "+ Tạo báo giá") không còn cách nào gắn tay
  // vào deal cũ nữa — luôn tạo deal mới ở bước submit, tránh ghi đè deal cũ.
  const activeLinkedDealId = initialDeal?.id || '';

  function handleCustomerNext() {
    if (!activeCustomer.customerName.trim()) {
      window.alert('Vui lòng nhập tên khách hàng.');
      return;
    }
    setCustomer(activeCustomer);
    setStep(2);
  }

  function handleSelectForm(form: QuoteForm) {
    setSelectedForm(form);
    setQuoteDraft(quoteDraftFromForm(form, activeCustomer));
    setStep(3);
  }

  async function handleSubmit() {
    if (!selectedForm) return;
    setSubmitting(true);
    setSubmitError('');
    let createdQuoteId: string | null = null;
    let createdDealId: string | null = null;
    try {
      let dealId = activeLinkedDealId;
      if (!dealId) {
        // Không gắn vào deal có sẵn nào (khách hoàn toàn mới, hoặc bỏ trống ô
        // "Gắn vào Deal") — tự tạo deal mới ở "Khách mới" cho khách này, không
        // thì báo giá tạo xong không có chỗ nào trên pipeline để theo dõi tiếp.
        const newDeal = await seedingCrmRepository.createDeal(
          buildDealPayload(activeCustomer, agents) as CreateDealInput
        );
        dealId = newDeal.id;
        createdDealId = newDeal.id;
      }
      const isVilla = selectedForm.schemaJson.layoutType === 'villa_solution_package';
      const quote = await seedingQuoteRepository.createQuote({
        quoteFormId: selectedForm.id,
        dealId,
        data: isVilla ? { ...quoteDraft.data, solutionItems: quoteDraft.solutionItems } : quoteDraft.data,
        items: isVilla ? [] : quoteDraft.items,
      });
      createdQuoteId = quote.id;
      await seedingQuoteRepository.publishQuote(quote.id);
      const finalQuote = await seedingQuoteRepository.getQuote(quote.id);
      onCreated(finalQuote);
      resetAndClose();
    } catch (err) {
      if (createdQuoteId) await seedingQuoteRepository.deleteQuote(createdQuoteId).catch(() => {});
      if (createdDealId) await seedingCrmRepository.deleteDeal(createdDealId).catch(() => {});
      setSubmitError(err instanceof Error ? err.message : 'Không thể tạo báo giá.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="crm-modal-backdrop" onClick={resetAndClose}>
      <div className="crm-modal crm-wizard-modal" onClick={event => event.stopPropagation()}>
        <header className="crm-modal-header">
          <div>
            <h2 className="crm-modal-title">Tạo báo giá</h2>
            <p className="crm-modal-subtitle">Tạo báo giá độc lập — có thể gắn vào deal hoặc không.</p>
          </div>
          <button type="button" className="crm-modal-close" onClick={resetAndClose} aria-label="Đóng" disabled={submitting}>
            <X className="crm-icon" />
          </button>
        </header>

        <div className="crm-wizard-stepper-container">
          <div className="crm-wizard-stepper-inner">
            {([1, 2, 3, 4] as CreateQuoteStep[]).map((item, index) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  className={`crm-wizard-step-item ${item === step ? 'crm-wizard-step-item--active' : ''} ${item < step ? 'crm-wizard-step-item--done' : ''}`}
                  onClick={() => item < step && setStep(item)}
                >
                  <div className="crm-wizard-step-circle">
                    {item < step ? <CheckCircle2 className="w-3 h-3" /> : <span>{item}</span>}
                  </div>
                  <span className="crm-wizard-step-label">{STEP_LABELS[item]}</span>
                </div>
                {index < 3 ? (
                  <div className={`crm-wizard-step-line ${item < step ? 'crm-wizard-step-line--done' : ''}`} />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="crm-modal-body crm-wizard-body">
          <div className="crm-wizard-content">
            {step === 1 ? (
              <SelectCustomerStep
                deals={deals}
                customer={activeCustomer}
                onChangeCustomer={setCustomer}
                lockedDeal={initialDeal}
              />
            ) : null}
            {step === 2 ? (
              <SelectQuoteFormStep
                selectedFormId={selectedForm?.id}
                previewForm={previewForm}
                onPreview={setPreviewForm}
                onSelect={handleSelectForm}
                onSkip={() => {}}
                hideSkip
              />
            ) : null}
            {step === 3 && selectedForm ? (
              <FillQuoteStep schema={selectedForm.schemaJson} value={quoteDraft} onChange={setQuoteDraft} />
            ) : null}
            {step === 4 && selectedForm ? <ReviewQuoteStep schema={selectedForm.schemaJson} draft={quoteDraft} /> : null}
            {submitError ? <p className="crm-error">{submitError}</p> : null}
          </div>
        </div>

        <footer className="crm-modal-footer">
          <div className="crm-footer-left">
            <button type="button" className="crm-cancel-button" onClick={resetAndClose} disabled={submitting}>
              Hủy
            </button>
          </div>
          <div className="crm-footer-right">
            {step > 1 ? (
              <button
                type="button"
                className="crm-cancel-button"
                disabled={submitting}
                onClick={() => setStep(current => (current - 1) as CreateQuoteStep)}
              >
                Quay lại
              </button>
            ) : null}
            {step === 1 ? (
              <button type="button" className="crm-save-button" onClick={handleCustomerNext}>
                Tiếp theo
              </button>
            ) : null}
            {step === 3 ? (
              <button type="button" className="crm-save-button" onClick={() => setStep(4)}>
                Tiếp theo
              </button>
            ) : null}
            {step === 4 ? (
              <button type="button" className="crm-save-button crm-save-button--large" disabled={submitting} onClick={() => void handleSubmit()}>
                {submitting ? <Loader2 className="crm-save-spinner" /> : null}
                {submitting ? 'Đang tạo...' : 'Xác nhận và tạo báo giá'}
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}
