'use client';

import { useEffect, useState } from 'react';
import type { QuoteForm } from '@/modules/quotes';
import { seedingQuoteRepository } from '@/modules/quotes';
import type { Quote } from '@/modules/quotes';
import { buildDealPayload, dealFormFromDeal, emptyDealForm } from '../../components/DealFormFields';
import type { DealFormState } from '../../components/DealFormFields';
import { CheckCircle2, Loader2, X } from '../../components/icons';
import { seedingCrmRepository } from '../../repositories/SeedingCrmRepository';
import type { CreateDealInput, CrmUserOption, Deal } from '../../types';
import { FillQuoteStep } from './FillQuoteStep';
import { ReviewQuoteStep } from './ReviewQuoteStep';
import { SelectCustomerStep } from './SelectCustomerStep';
import { SelectQuoteFormStep } from './SelectQuoteFormStep';
import { emptyQuoteDraft, quoteDraftFromExistingQuote, quoteDraftFromForm } from './types';
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
  editQuote,
  canApproveQuotes = false,
  initialQuoteFormId,
  onClose,
  onCreated,
  onUpdated,
}: {
  open: boolean;
  deals: Deal[];
  agents?: CrmUserOption[];
  /** Nếu mở từ nút "Tạo báo giá cho deal này" trong chi tiết deal — điền sẵn khách
   * hàng + gắn thẳng deal đó, không cần tìm lại. */
  initialDeal?: Deal | null;
  /** Nếu có — modal mở ở CHẾ ĐỘ SỬA 1 báo giá đã tồn tại (chưa duyệt) thay vì
   * tạo mới. Load đầy đủ dữ liệu đã lưu, không tạo báo giá mới, không đổi mã. */
  editQuote?: Quote | null;
  /** Mở từ 1 card "Mẫu dùng nhanh" — chọn sẵn mẫu này, vẫn qua bước 1 (khách
   * hàng) bình thường rồi nhảy thẳng bước 3, bỏ qua bước 2 (chọn mẫu). Bỏ qua
   * hoàn toàn nếu đang ở chế độ sửa. */
  initialQuoteFormId?: string;
  /** User hiện tại có quyền duyệt báo giá không (admin hoặc can_approve_quotes) -
   * quyết định có hiện nút "Duyệt báo giá" trong chế độ sửa hay không. */
  canApproveQuotes?: boolean;
  onClose: () => void;
  onCreated: (quote: Quote) => void;
  /** Gọi sau khi "Cập nhật báo giá"/"Duyệt báo giá" xong (chỉ chế độ sửa). */
  onUpdated?: (quote: Quote) => void;
}) {
  const isEditMode = Boolean(editQuote);
  const [step, setStep] = useState<CreateQuoteStep>(1);
  const [customer, setCustomer] = useState<DealFormState>(emptyDealForm);
  const [selectedForm, setSelectedForm] = useState<QuoteForm | null>(null);
  const [previewForm, setPreviewForm] = useState<QuoteForm | null>(null);
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft>(emptyQuoteDraft);
  // Theo dõi ĐÚNG nút nào đang chạy (không dùng 1 boolean chung) - trước đây
  // 1 boolean khiến cả 2 nút "Cập nhật báo giá"/"Duyệt báo giá" cùng xoay
  // spinner dù chỉ bấm 1 nút, nhìn rất kỳ.
  const [submittingAction, setSubmittingAction] = useState<'create' | 'update' | 'approve' | null>(null);
  const submitting = submittingAction !== null;
  const [submitError, setSubmitError] = useState('');

  // Tất cả báo giá thật, tự fetch khi mở modal — dùng cho khối thống kê CRM ở
  // bước 1 (số báo giá/giá trị/đã chốt/tỷ lệ chuyển đổi theo khách hàng).
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    seedingQuoteRepository.getQuotes().then(rows => {
      if (!cancelled) setAllQuotes(rows);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [open]);

  // Báo giá vừa tạo xong (draft) — hiện màn "Đã tạo báo giá thành công" thay vì
  // đóng modal ngay. null = chưa tạo/đang ở các bước 1-4.
  const [createdQuote, setCreatedQuote] = useState<Quote | null>(null);
  const [approveError, setApproveError] = useState('');

  // Chế độ sửa: nạp dữ liệu báo giá đã lưu (mẫu + khách hàng liên kết + nội
  // dung) mỗi khi mở modal cho 1 báo giá khác. Không chạy lại khi đóng modal.
  useEffect(() => {
    if (!open || !editQuote) return;
    let cancelled = false;
    setStep(3);
    setQuoteDraft(quoteDraftFromExistingQuote(editQuote));
    seedingQuoteRepository.getForm(editQuote.quoteFormId).then(form => {
      if (!cancelled) setSelectedForm(form);
    }).catch(() => {});
    const linkedDeal = editQuote.dealId ? deals.find(d => d.id === editQuote.dealId) : undefined;
    if (linkedDeal) {
      setCustomer(dealFormFromDeal(linkedDeal));
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editQuote?.id]);

  // Mở từ "Mẫu dùng nhanh" — chọn sẵn mẫu, quoteDraft dựng lại ở
  // handleCustomerNext (lúc đó activeCustomer mới có dữ liệu thật).
  useEffect(() => {
    if (!open || editQuote || !initialQuoteFormId) return;
    let cancelled = false;
    seedingQuoteRepository.getForm(initialQuoteFormId).then(form => {
      if (!cancelled) setSelectedForm(form);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [open, editQuote, initialQuoteFormId]);

  function resetAndClose() {
    if (submitting) return;
    setStep(1);
    setCustomer(emptyDealForm());
    setSelectedForm(null);
    setPreviewForm(null);
    setQuoteDraft(emptyQuoteDraft());
    setSubmitError('');
    setCreatedQuote(null);
    setApproveError('');
    onClose();
  }

  if (!open) return null;

  // Chế độ sửa: khách hàng lấy từ deal đã gắn sẵn với báo giá này (nếu có) -
  // step 1 chỉ để XEM, không có chỗ nào lưu lại thay đổi customer khi bấm Cập
  // nhật/Duyệt (update_quote không có field đổi deal_id), nên khoá luôn giống
  // initialDeal để tránh gây hiểu nhầm là sửa được.
  const editLinkedDeal = isEditMode && editQuote?.dealId ? deals.find(d => d.id === editQuote.dealId) : undefined;
  const lockedDealForStep1 = editLinkedDeal || initialDeal;

  const activeCustomer =
    lockedDealForStep1 && !customer.customerName.trim()
      ? { ...customer, customerName: lockedDealForStep1.customerName, companyName: lockedDealForStep1.companyName || '', phone: lockedDealForStep1.phone || '', email: lockedDealForStep1.email || '', address: lockedDealForStep1.address || '' }
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
    if (selectedForm) {
      // Mẫu đã chọn sẵn (mở từ "Mẫu dùng nhanh") - bỏ qua bước 2.
      setQuoteDraft(quoteDraftFromForm(selectedForm, activeCustomer));
      setStep(3);
    } else {
      setStep(2);
    }
  }

  function handleSelectForm(form: QuoteForm) {
    // Che do sua: KHONG cho doi mau - backend chua ho tro doi quote_form_id/
    // form_snapshot sau khi da tao. Van cho xem lai step nay, chi khong ap
    // dung lua chon moi.
    if (isEditMode) { setStep(3); return; }
    setSelectedForm(form);
    setQuoteDraft(quoteDraftFromForm(form, activeCustomer));
    setStep(3);
  }

  function buildDraftPayload() {
    const isVilla = selectedForm?.schemaJson.layoutType === 'villa_solution_package';
    return {
      data: isVilla ? { ...quoteDraft.data, solutionItems: quoteDraft.solutionItems } : quoteDraft.data,
      items: isVilla ? [] : quoteDraft.items,
    };
  }

  async function handleSubmit() {
    if (!selectedForm) return;
    setSubmittingAction('create');
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
      // Chi tao bao gia (luon ra status='draft', chua co link public) - KHONG
      // con tu dong "publish/approve" ngay sau khi tao nua. Duyet la 1 hanh
      // dong rieng, co kiem tra quyen (xem handleApprove).
      const quote = await seedingQuoteRepository.createQuote({
        quoteFormId: selectedForm.id,
        dealId,
        ...buildDraftPayload(),
      });
      createdQuoteId = quote.id;
      onCreated(quote);
      // Khong dong modal ngay - hien man "Da tao bao gia thanh cong" (bao gia
      // van la draft, chua co public link cho toi khi duyet - xem handleApproveNow).
      setCreatedQuote(quote);
    } catch (err) {
      if (createdQuoteId) await seedingQuoteRepository.deleteQuote(createdQuoteId).catch(() => {});
      if (createdDealId) await seedingCrmRepository.deleteDeal(createdDealId).catch(() => {});
      setSubmitError(err instanceof Error ? err.message : 'Không thể tạo báo giá.');
    } finally {
      setSubmittingAction(null);
    }
  }

  async function handleUpdate() {
    if (!editQuote) return;
    setSubmittingAction('update');
    setSubmitError('');
    try {
      const updated = await seedingQuoteRepository.updateQuote(editQuote.id, buildDraftPayload());
      onUpdated?.(updated);
      resetAndClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Không thể cập nhật báo giá.');
    } finally {
      setSubmittingAction(null);
    }
  }

  async function handleApprove() {
    if (!editQuote) return;
    if (!window.confirm('Sau khi duyệt, báo giá sẽ bị khóa và không thể chỉnh sửa. Bạn có chắc chắn muốn duyệt không?')) return;
    setSubmittingAction('approve');
    setSubmitError('');
    try {
      // Luu thay doi cuoi + duyet ATOMIC trong 1 request (khong tach 2 lenh
      // rieng - tranh nua voi khi 1 trong 2 buoc loi).
      const approved = await seedingQuoteRepository.updateAndApproveQuote(editQuote.id, buildDraftPayload());
      onUpdated?.(approved);
      resetAndClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Không thể duyệt báo giá.');
    } finally {
      setSubmittingAction(null);
    }
  }

  /** Nút "Duyệt ngay" trên màn "Đã tạo báo giá thành công" - duyệt NGAY báo
   * giá vừa tạo (còn nguyên draft, không có thay đổi chưa lưu vì vừa submit
   * xong nên chỉ cần approveQuote thường, không cần update+approve gộp). Lỗi
   * thì giữ nguyên trạng thái draft, không tự chuyển sang "đã duyệt" khi chưa
   * chắc chắn. Sau khi duyệt xong mà response thiếu publicUrl thì refetch lại
   * bản đầy đủ - không bao giờ bật nút public bằng dữ liệu rỗng/suy đoán. */
  async function handleApproveNow() {
    if (!createdQuote) return;
    setSubmittingAction('approve');
    setApproveError('');
    try {
      let approved = await seedingQuoteRepository.approveQuote(createdQuote.id);
      if (!approved.publicUrl) {
        approved = await seedingQuoteRepository.getQuote(createdQuote.id);
      }
      setCreatedQuote(approved);
      onUpdated?.(approved);
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : 'Không thể duyệt báo giá.');
    } finally {
      setSubmittingAction(null);
    }
  }

  return (
    <div className="crm-modal-backdrop" onClick={resetAndClose}>
      <div className="crm-modal crm-wizard-modal" onClick={event => event.stopPropagation()}>
        <header className="crm-modal-header">
          <div>
            <h2 className="crm-modal-title">
              {createdQuote ? 'Đã tạo báo giá thành công' : isEditMode ? `Sửa báo giá ${editQuote?.quoteNumber || ''}` : 'Tạo báo giá'}
            </h2>
            <p className="crm-modal-subtitle">
              {createdQuote
                ? `Báo giá ${createdQuote.quoteNumber} đã được lưu.`
                : isEditMode
                  ? 'Chỉnh sửa nội dung — chưa duyệt thì còn sửa được không giới hạn.'
                  : 'Tạo báo giá độc lập — có thể gắn vào deal hoặc không.'}
            </p>
          </div>
          <button type="button" className="crm-modal-close" onClick={resetAndClose} aria-label="Đóng" disabled={submitting}>
            <X className="crm-icon" />
          </button>
        </header>

        {createdQuote ? null : (
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
        )}

        <div className="crm-modal-body crm-wizard-body">
          <div className="crm-wizard-content">
            {createdQuote ? (
              <QuoteSuccessPanel
                quote={createdQuote}
                canApprove={canApproveQuotes}
                approving={submittingAction === 'approve'}
                approveError={approveError}
                customerEmail={activeCustomer.email}
                onApproveNow={() => void handleApproveNow()}
              />
            ) : (
              <>
                {step === 1 ? (
                  <SelectCustomerStep
                    deals={deals}
                    customer={activeCustomer}
                    onChangeCustomer={setCustomer}
                    lockedDeal={lockedDealForStep1}
                    quotes={allQuotes}
                    agents={agents}
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
                  <FillQuoteStep
                    schema={selectedForm.schemaJson}
                    value={quoteDraft}
                    onChange={setQuoteDraft}
                    quoteFormId={selectedForm.id}
                  />
                ) : null}
                {step === 3 && !selectedForm && isEditMode ? (
                  // Dang cho getForm() tai xong (che do sua) - giu 1 khoi placeholder
                  // co chieu cao thay vi de trong, tranh modal "giat" phinh to dot
                  // ngot khi form load xong.
                  <div className="crm-wizard-loading-placeholder">Đang tải báo giá...</div>
                ) : null}
                {step === 4 && selectedForm ? (
                  <ReviewQuoteStep schema={selectedForm.schemaJson} draft={quoteDraft} onChange={setQuoteDraft} />
                ) : null}
                {submitError ? <p className="crm-error">{submitError}</p> : null}
              </>
            )}
          </div>
        </div>

        <footer className="crm-modal-footer">
          {createdQuote ? (
            <div className="crm-footer-right" style={{ marginLeft: 'auto' }}>
              <button type="button" className="crm-save-button crm-save-button--large" onClick={resetAndClose}>
                Đóng
              </button>
            </div>
          ) : (
            <>
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
                {step === 4 && !isEditMode ? (
                  <button type="button" className="crm-save-button crm-save-button--large" disabled={submitting} onClick={() => void handleSubmit()}>
                    {submittingAction === 'create' ? <Loader2 className="crm-save-spinner" /> : null}
                    {submittingAction === 'create' ? 'Đang tạo...' : 'Tạo báo giá'}
                  </button>
                ) : null}
                {step === 4 && isEditMode ? (
                  <>
                    <button type="button" className="crm-save-button crm-save-button--update" disabled={submitting} onClick={() => void handleUpdate()}>
                      {submittingAction === 'update' ? <Loader2 className="crm-save-spinner" /> : null}
                      Cập nhật báo giá
                    </button>
                    {canApproveQuotes ? (
                      <button type="button" className="crm-save-button crm-save-button--large crm-save-button--approve" disabled={submitting} onClick={() => void handleApprove()}>
                        {submittingAction === 'approve' ? <Loader2 className="crm-save-spinner" /> : null}
                        Duyệt báo giá
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

function QuoteSuccessPanel({
  quote,
  canApprove,
  approving,
  approveError,
  customerEmail,
  onApproveNow,
}: {
  quote: Quote;
  canApprove: boolean;
  approving: boolean;
  approveError: string;
  customerEmail?: string;
  onApproveNow: () => void;
}) {
  const isApproved = quote.status === 'approved' && Boolean(quote.publicUrl);
  const publicFullUrl = quote.publicUrl && typeof window !== 'undefined' ? `${window.location.origin}${quote.publicUrl}` : '';

  async function copyLink() {
    if (!publicFullUrl) return;
    await navigator.clipboard.writeText(publicFullUrl);
  }
  function openPdf() {
    if (!publicFullUrl) return;
    window.open(`${publicFullUrl}?print=true`, '_blank', 'noopener');
  }
  const mailtoHref = publicFullUrl
    ? `mailto:${customerEmail || ''}?subject=${encodeURIComponent(`Báo giá ${quote.quoteNumber}`)}&body=${encodeURIComponent(`Kính gửi Quý khách,\n\nMời Quý khách xem báo giá tại: ${publicFullUrl}\n\nTrân trọng.`)}`
    : undefined;

  return (
    <div className="crm-quote-success-panel">
      <div className="crm-quote-success-icon">
        <CheckCircle2 className="w-6 h-6" />
      </div>
      <p className="crm-quote-success-status">
        {isApproved
          ? 'Báo giá đã được duyệt — khách hàng có thể xem link công khai.'
          : 'Báo giá đang ở trạng thái chờ duyệt — link công khai chỉ có sau khi được duyệt.'}
      </p>

      {!isApproved && canApprove ? (
        <button type="button" className="crm-save-button crm-save-button--approve" disabled={approving} onClick={onApproveNow}>
          {approving ? <Loader2 className="crm-save-spinner" /> : null}
          {approving ? 'Đang duyệt...' : 'Duyệt ngay'}
        </button>
      ) : null}
      {approveError ? <p className="crm-error">{approveError}</p> : null}

      <div className="crm-quote-success-actions">
        <button type="button" className="crm-cancel-button" disabled={!isApproved} onClick={() => void copyLink()}>
          Sao chép link
        </button>
        <button type="button" className="crm-cancel-button" disabled={!isApproved} onClick={openPdf}>
          Tải PDF
        </button>
        <a
          className={`crm-cancel-button ${!isApproved ? 'crm-cancel-button--disabled' : ''}`}
          href={isApproved ? mailtoHref : undefined}
          aria-disabled={!isApproved}
          onClick={event => {
            if (!isApproved) event.preventDefault();
          }}
        >
          Gửi email khách hàng
        </a>
      </div>
      {!isApproved ? <small className="crm-quote-success-hint">Chỉ dùng được sau khi báo giá được duyệt.</small> : null}
    </div>
  );
}
