'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL, API_KEY } from '@/lib/env';
import { useMembers } from '@/hooks/useMembers';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { formatMoneyInput, formatVND, parseMoney } from '../constants/crmConfig';
import { mapLead } from './LeadsDirectory';
import { PositionSelect } from './PositionSelect';
import { CrmCategorySelect } from './CrmCategorySelect';
import { AlertTriangle, CheckCircle2, Loader2, X, XCircle } from './icons';
import type { AppUser } from '@/types/unified.types';
import type { CrmLeadRow } from '../types';

function headers() {
  const value: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) value['X-API-Key'] = API_KEY;
  return value;
}

type CompanyMatchRow = {
  id: string;
  customer_name?: string | null;
  company_name?: string | null;
  website?: string | null;
  match_reason?: string;
};

type IcpFit = 'unknown' | 'fit' | 'unfit';

/** 3 lua chon "Co dung nhom khach hang muc tieu?".
 *
 * Anh xa thang vao cot `crm_leads.qualification_icp_fit` (BOOLEAN NULLABLE, da
 * co tu migration 078) — KHONG can migration moi: NULL = chua ro, true = phu
 * hop, false = khong phu hop. Truoc day UI chi co 1 checkbox nen ep NULL ve
 * false ("chua xac dinh / khong phu hop" gop lam mot); tach lai dung 3 trang
 * thai chi la doc/ghi dung kieu du lieu von co cua cot. */
const ICP_OPTIONS: Array<{ value: IcpFit; label: string }> = [
  { value: 'unknown', label: 'Chưa rõ' },
  { value: 'fit', label: 'Phù hợp' },
  { value: 'unfit', label: 'Không phù hợp' },
];

function icpFromApi(value: boolean | null | undefined): IcpFit {
  if (value === true) return 'fit';
  if (value === false) return 'unfit';
  return 'unknown';
}
function icpToApi(value: IcpFit): boolean | null {
  if (value === 'fit') return true;
  if (value === 'unfit') return false;
  return null;
}

/** Enum co dinh cho "Du kien trien khai khi nao?".
 *
 * Luu MA (`value`) vao cot `crm_leads.qualification_expected_timeline` (TEXT,
 * khong co CHECK constraint — xem migration 078), nen khong can migration.
 * Ban ghi cu dang giu chuoi tu do (vd "Quy 3/2026") van hien thi nguyen van:
 * gia tri la vi duoc chen tam vao dau danh sach thay vi bi nuot mat. */
const TIMELINE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Chưa rõ' },
  { value: 'now', label: 'Ngay' },
  { value: 'lt_1m', label: 'Trong 1 tháng' },
  { value: '1_3m', label: '1–3 tháng' },
  { value: '3_6m', label: '3–6 tháng' },
  { value: 'gt_6m', label: 'Sau 6 tháng' },
];

/** Dung khi category_type='crm_next_step' chua co dong nao (migration 080 chua
 * duoc ap dung o moi truong dang chay) — dropdown "Viec tiep theo" khong bao
 * gio duoc rong/chet. Co du lieu that thi danh sach nay khong duoc dung den. */
const NEXT_STEP_FALLBACK = ['Gọi lại', 'Gửi tài liệu', 'Demo/Tư vấn', 'Gửi báo giá', 'Theo dõi lại', 'Khác'];

const STEPS = ['Khách quan tâm gì', 'Có phù hợp', 'Việc tiếp theo', 'Bàn giao Sale'];

function toDatetimeLocal(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function initialOf(name: string): string {
  const trimmed = (name || '').trim();
  return trimmed ? trimmed[0].toUpperCase() : '?';
}

type VerifyForm = {
  interest: string;
  icpFit: IcpFit;
  timeline: string;
  estimatedValue: string;
  nextStep: string;
  nextStepAt: string;
  aeId: string;
  note: string;
};

/**
 * Drawer "Xác minh Lead" — 1 luồng có dẫn dắt thay cho 3 khối rời rạc trước đây
 * (xem/sửa + form Qualification thô + nút Convert nổi). Vẫn thao tác trên đúng
 * 1 record crm_leads và vẫn dùng đúng 2 endpoint cũ:
 *   - PUT  /crm/leads/{id}          — lưu xác minh (KHÔNG BAO GIỜ tạo hồ sơ)
 *   - POST /crm/leads/{id}/convert  — tạo Customer+Contact+Deal+Activity
 *     nguyên tử qua RPC crm_convert_lead (migration 078), giữ nguyên
 *     idempotency_key như trước.
 *
 * "Mức sẵn sàng Convert" tính HOÀN TOÀN phía client từ 5 điều kiện thật của
 * form — không có cột/endpoint mới, và cũng không còn nút "Đủ điều kiện" đơn lẻ
 * nào có thể tự mở khoá Convert.
 */
export function LeadDetailDrawer({
  lead,
  open,
  initialMode,
  currentUser,
  onClose,
  onSaved,
}: {
  lead: CrmLeadRow | null;
  open: boolean;
  initialMode: 'view' | 'qualify' | 'convert';
  currentUser: AppUser | null;
  onClose: () => void;
  onSaved: (lead: CrmLeadRow) => void;
}) {
  useBodyScrollLock(open);
  const { members } = useMembers();
  const [form, setForm] = useState<VerifyForm>({
    interest: '',
    icpFit: 'unknown',
    timeline: '',
    estimatedValue: '',
    nextStep: '',
    nextStepAt: '',
    aeId: '',
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedOk, setSavedOk] = useState('');
  const [suggestionUsed, setSuggestionUsed] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [companyMatches, setCompanyMatches] = useState<CompanyMatchRow[]>([]);
  const [dupChecked, setDupChecked] = useState(false);
  const [customerChoice, setCustomerChoice] = useState<'new' | string>('new');
  const [contact, setContact] = useState({ name: '', phone: '', email: '', positionCategoryId: '', positionLabel: '' });
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState('');
  const idempotencyKeyRef = useRef<string>('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const readinessRef = useRef<HTMLElement>(null);

  const setField = <K extends keyof VerifyForm>(key: K, value: VerifyForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // Chi khoi tao lai form khi mo 1 LEAD KHAC (hoac mo lai drawer), khong phai
  // moi lan prop `lead` doi tham chieu: sau khi "Lưu xác minh" thanh cong,
  // LeadsDirectory day xuong 1 object lead moi -> neu effect nay chay lai theo
  // tham chieu thi no se reset ca `convertOpen` vua bat, khien nut "Tạo cơ hội
  // & bàn giao Sale" bam xong khong mo duoc buoc xac nhan (bug thuc te bat
  // duoc luc chay Playwright, khong phai gia thuyet).
  const initializedLeadRef = useRef<string>('');

  useEffect(() => {
    if (!open || !lead) {
      initializedLeadRef.current = '';
      return;
    }
    if (initializedLeadRef.current === lead.id) return;
    initializedLeadRef.current = lead.id;
    setError('');
    setSavedOk('');
    setConvertError('');
    setSuggestionUsed(false);
    setConvertOpen(initialMode === 'convert');
    setForm({
      interest: lead.qualificationNeed || '',
      icpFit: icpFromApi(lead.qualificationIcpFit),
      timeline: lead.qualificationExpectedTimeline || '',
      estimatedValue: lead.qualificationEstimatedValue != null ? formatMoneyInput(String(lead.qualificationEstimatedValue)) : '',
      nextStep: lead.nextStep || '',
      nextStepAt: toDatetimeLocal(lead.followUpDate),
      aeId: lead.qualificationAeId || '',
      note: lead.note || '',
    });
    setContact({
      name: lead.leadName || '',
      phone: lead.phone || '',
      email: lead.email || '',
      positionCategoryId: lead.positionCategoryId || '',
      positionLabel: lead.positionLabelSnapshot || lead.position || '',
    });
    setCustomerChoice('new');
    idempotencyKeyRef.current = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `lead-convert-${lead.id}-${Date.now()}`;

    // Check trùng doanh nghiệp — đúng endpoint company-match đã dùng từ trước.
    // Khi lead không có công ty/website thì lùi về duplicate-check theo
    // SĐT/email để ô "đã được check trùng" phản ánh 1 lần kiểm tra THẬT chứ
    // không tự bật xanh.
    setCompanyMatches([]);
    setDupChecked(false);
    const hasCompanyKeys = Boolean(lead.companyName || lead.website);
    const url = hasCompanyKeys
      ? (() => {
          const params = new URLSearchParams();
          if (lead.website) params.set('website', lead.website);
          if (lead.companyName) params.set('name', lead.companyName);
          return `${API_BASE_URL}/api/all-platform/crm/leads/company-match?${params.toString()}`;
        })()
      : (() => {
          const params = new URLSearchParams();
          if (lead.phone) params.set('phone', lead.phone);
          if (lead.email) params.set('email', lead.email);
          return `${API_BASE_URL}/api/all-platform/crm/leads/duplicate-check?${params.toString()}`;
        })();
    fetch(url, { credentials: 'include', headers: headers() })
      .then(res => res.json())
      .then(body => {
        if (body.success === false) return;
        if (hasCompanyKeys) setCompanyMatches((body.data?.matches || []) as CompanyMatchRow[]);
        setDupChecked(true);
      })
      .catch(() => setDupChecked(false));
  }, [open, lead, initialMode]);

  const aeOptions = useMemo(() => {
    const linked = members.filter(m => m.linked_user_id || m.linked_user_id_2);
    return [...linked].sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [members]);
  const selectionKeyOf = (m: { id: string; linked_user_id?: string | null; linked_user_id_2?: string | null }) =>
    m.linked_user_id || m.linked_user_id_2 || m.id;
  const aeName = (id?: string) => {
    if (!id) return 'Chưa gán';
    if (id === currentUser?.id) return currentUser?.name || currentUser?.email || 'Bạn';
    return aeOptions.find(m => selectionKeyOf(m) === id)?.display_name || 'Chưa gán';
  };

  // ---- Mức sẵn sàng Convert: tính hoàn toàn client-side từ 5 điều kiện thật.
  const checks = useMemo(() => {
    const nextStepOk = Boolean(form.nextStep.trim()) && Boolean(form.nextStepAt);
    return [
      { key: 'need', label: 'Nhu cầu đã xác định', ok: Boolean(form.interest.trim()) },
      { key: 'icp', label: 'ICP đã xác định', ok: form.icpFit !== 'unknown' },
      { key: 'next', label: 'Việc tiếp theo đã có', ok: nextStepOk },
      { key: 'dup', label: 'Doanh nghiệp đã được check trùng', ok: dupChecked },
      { key: 'ae', label: 'Sale nhận bàn giao đã chọn', ok: Boolean(form.aeId) },
    ];
  }, [form, dupChecked]);

  const okCount = checks.filter(c => c.ok).length;
  const isReady = okCount === checks.length;
  const readinessLabel = isReady ? 'Sẵn sàng tạo cơ hội' : okCount >= 3 ? 'Cần xác minh thêm' : 'Chưa sẵn sàng';
  const readinessTone = isReady ? 'ready' : okCount >= 3 ? 'partial' : 'blocked';

  const currentStep = !checks[0].ok ? 1 : !checks[1].ok ? 2 : !checks[2].ok ? 3 : 4;

  const nextStepWarning = Boolean(form.nextStep.trim()) !== Boolean(form.nextStepAt) || (!form.nextStep.trim() && !form.nextStepAt);

  // Nhảy tới phần liên quan nhất với trạng thái Lead lúc mở drawer.
  useEffect(() => {
    if (!open || !lead) return;
    if (initialMode !== 'convert' && lead.status !== 'qualified') return;
    const timer = window.setTimeout(() => {
      readinessRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [open, lead, initialMode]);

  if (!open || !lead) return null;
  const canWrite = Boolean(lead.canWrite);
  const isConverted = lead.status === 'converted';

  /** "Dùng gợi ý" — suy ra giá trị từ CHÍNH dữ liệu Lead đang có (ghi chú,
   * nguồn, công ty). Đây là gợi ý theo quy tắc, KHÔNG phải AI: khối này không
   * gọi model nào cả nên không được (và không) nói là "AI đã gợi ý". Chỉ điền
   * vào ô đang trống — không bao giờ ghi đè thứ SDR đã nhập, và không bịa ra
   * thông tin không có trong Lead. */
  function applySuggestion() {
    const haystack = `${lead?.note || ''} ${lead?.qualificationNeed || ''} ${lead?.source || ''}`.toLowerCase();
    setForm(prev => {
      const next = { ...prev };
      if (!next.interest.trim() && lead?.qualificationNeed) next.interest = lead.qualificationNeed;
      if (next.icpFit === 'unknown' && lead?.companyName) next.icpFit = 'fit';
      if (!next.timeline) {
        if (/(gấp|ngay|asap|luôn)/.test(haystack)) next.timeline = 'now';
        else if (/(tháng này|trong tháng|1 tháng)/.test(haystack)) next.timeline = 'lt_1m';
        else if (/(quý|3 tháng)/.test(haystack)) next.timeline = '1_3m';
      }
      if (!next.estimatedValue.trim()) {
        const money = (lead?.note || '').match(/(\d[\d.,]{5,})/);
        if (money) next.estimatedValue = formatMoneyInput(money[1]);
      }
      if (!next.nextStep.trim()) next.nextStep = lead?.phone ? 'Gọi lại' : 'Gửi tài liệu';
      if (!next.nextStepAt) {
        const when = new Date();
        when.setDate(when.getDate() + 1);
        when.setHours(9, 0, 0, 0);
        next.nextStepAt = toDatetimeLocal(when.toISOString());
      }
      if (!next.aeId) next.aeId = lead?.qualificationAeId || lead?.sdrId || currentUser?.id || '';
      return next;
    });
    setSuggestionUsed(true);
  }

  function resetSuggestion() {
    if (!lead) return;
    setForm({
      interest: lead.qualificationNeed || '',
      icpFit: icpFromApi(lead.qualificationIcpFit),
      timeline: lead.qualificationExpectedTimeline || '',
      estimatedValue: lead.qualificationEstimatedValue != null ? formatMoneyInput(String(lead.qualificationEstimatedValue)) : '',
      nextStep: lead.nextStep || '',
      nextStepAt: toDatetimeLocal(lead.followUpDate),
      aeId: lead.qualificationAeId || '',
      note: lead.note || '',
    });
    setSuggestionUsed(false);
  }

  function buildQualificationPayload(): Record<string, unknown> {
    return {
      qualification_need: form.interest.trim() || null,
      qualification_icp_fit: icpToApi(form.icpFit),
      qualification_estimated_value: form.estimatedValue.trim() ? parseMoney(form.estimatedValue) : null,
      qualification_expected_timeline: form.timeline || null,
      qualification_ae_id: form.aeId || null,
      next_step: form.nextStep.trim() || null,
      follow_up_date: form.nextStepAt ? new Date(form.nextStepAt).toISOString() : null,
      note: form.note.trim() || null,
    };
  }

  /** Lưu xác minh — PUT thường, TUYỆT ĐỐI không tạo Customer/Contact/Deal.
   * `status` chỉ đi lên theo đúng mức đã xác minh được (new_lead -> qualifying,
   * và chỉ lên 'qualified' khi checklist thật sự đủ 5/5) — thay cho nút "Đủ
   * điều kiện" cũ vốn bật qualified mà không kiểm tra gì. */
  async function saveVerification(overrideStatus?: string) {
    if (!lead) return false;
    if (!overrideStatus && form.nextStep.trim() && !form.nextStepAt) {
      setError('Đã chọn "Việc tiếp theo" thì phải chọn "Khi nào làm".');
      return false;
    }
    setSaving(true);
    setError('');
    setSavedOk('');
    try {
      const payload: Record<string, unknown> = overrideStatus
        ? { status: overrideStatus }
        : buildQualificationPayload();
      if (!overrideStatus) {
        if (isReady) payload.status = 'qualified';
        else if (lead.status === 'new_lead') payload.status = 'qualifying';
      }
      const res = await fetch(`${API_BASE_URL}/api/all-platform/crm/leads/${encodeURIComponent(lead.id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: headers(),
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || body.success === false) throw new Error(body?.message || 'Không lưu được thông tin xác minh.');
      onSaved(mapLead(body.data));
      setSavedOk(overrideStatus ? 'Đã chuyển Lead sang "Theo dõi sau".' : 'Đã lưu xác minh. Chưa tạo Cơ hội/Khách hàng nào.');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được thông tin xác minh.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function markNurture() {
    if (!window.confirm('Chuyển Lead này sang "Chưa phù hợp · theo dõi sau"? Lead sẽ ra khỏi luồng xác minh nhưng vẫn giữ lại để theo dõi.')) return;
    await saveVerification('nurture');
  }

  async function handleConvert() {
    if (!lead || converting) return;
    setConverting(true);
    setConvertError('');
    try {
      const dealPayload: Record<string, unknown> = {};
      if (form.aeId) dealPayload.sdr_id = form.aeId;
      if (form.nextStep.trim()) dealPayload.next_step = form.nextStep.trim();
      if (form.nextStepAt) dealPayload.follow_up_date = new Date(form.nextStepAt).toISOString();
      if (form.estimatedValue.trim()) dealPayload.estimated_budget = parseMoney(form.estimatedValue);

      const payload: Record<string, unknown> = {
        deal: dealPayload,
        update_customer: false,
        idempotency_key: idempotencyKeyRef.current,
        contact: {
          name: contact.name.trim() || lead.leadName,
          phone: contact.phone.trim() || null,
          email: contact.email.trim() || null,
          position_category_id: contact.positionCategoryId || null,
          is_primary: true,
        },
      };
      if (customerChoice === 'new') {
        payload.customer = {
          customer_name: lead.leadName,
          company_name: lead.companyName || null,
          position_category_id: lead.positionCategoryId || null,
          phone: lead.phone || null,
          email: lead.email || null,
          zalo: lead.zalo || null,
          facebook: lead.facebook || null,
          telegram: lead.telegram || null,
          website: lead.website || null,
          source: lead.source || null,
        };
      } else {
        payload.customer_id = customerChoice;
      }

      const res = await fetch(`${API_BASE_URL}/api/all-platform/crm/leads/${encodeURIComponent(lead.id)}/convert`, {
        method: 'POST',
        credentials: 'include',
        headers: headers(),
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || body.success === false) throw new Error(body?.message || 'Tạo cơ hội thất bại.');
      const result = body.data || {};
      onSaved({
        ...lead,
        status: 'converted',
        convertedCustomerId: result.customer?.id || result.customer_id || '',
        convertedContactId: result.contact?.id || result.contact_id || '',
        convertedDealId: result.deal?.id || result.deal_id || '',
      });
      setConvertOpen(false);
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : 'Tạo cơ hội thất bại.');
    } finally {
      setConverting(false);
    }
  }

  /** Lưu xác minh trước rồi mới mở bước xác nhận Convert (giữ nguyên bước xác
   * nhận cũ, không dựng lại) — để dữ liệu vừa nhập chắc chắn đã nằm trên lead
   * trước khi RPC đọc nó. */
  async function openConvertConfirm() {
    const ok = await saveVerification();
    if (ok) setConvertOpen(true);
  }

  const selectedMatch = companyMatches.find(m => m.id === customerChoice);
  const timelineOptions =
    form.timeline && !TIMELINE_OPTIONS.some(o => o.value === form.timeline)
      ? [{ value: form.timeline, label: form.timeline }, ...TIMELINE_OPTIONS]
      : TIMELINE_OPTIONS;

  return (
    <>
      <div className="crm-drawer-backdrop" onClick={onClose} />
      <aside className="crm-drawer crm-lead-detail-drawer crm-verify-drawer">
        <header className="crm-lead-drawer-header crm-verify-header">
          <div className="crm-verify-header-text">
            <h2>Xác minh Lead</h2>
            <p>SDR chỉ cần xác nhận vài thông tin then chốt — hệ thống tự chấm điểm và chuẩn bị dữ liệu bàn giao cho Sale.</p>
          </div>
          <button type="button" className="crm-drawer-close" onClick={onClose} aria-label="Đóng">
            <X className="crm-icon" />
          </button>
        </header>

        <div className="crm-drawer-body crm-lead-drawer-body crm-verify-body" ref={bodyRef}>
          {error ? <p className="crm-error">{error}</p> : null}
          {savedOk ? <p className="crm-verify-ok">{savedOk}</p> : null}

          <section className="crm-verify-summary">
            <span className="crm-verify-avatar" aria-hidden>{initialOf(lead.leadName)}</span>
            <div className="crm-verify-summary-main">
              <p className="crm-verify-name">{lead.leadName}</p>
              <p className="crm-verify-sub">
                {[lead.positionLabelSnapshot || lead.position, lead.companyName].filter(Boolean).join(' · ') || 'Chưa có chức vụ/công ty'}
              </p>
              <p className="crm-verify-sub">
                {lead.phone ? <a href={`tel:${lead.phone}`}>{lead.phone}</a> : <span>Chưa có SĐT</span>}
                <span className="crm-verify-dot">·</span>
                {lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : <span>Chưa có email</span>}
              </p>
              <p className="crm-verify-sub">Công ty: {lead.companyName || 'Chưa có'} <span className="crm-verify-dot">·</span> SDR: {aeName(lead.sdrId)}</p>
            </div>
            <div className="crm-verify-score">
              <b>{lead.score == null ? '—' : lead.score}</b>
              <span>ĐIỂM LEAD</span>
            </div>
          </section>

          {isConverted ? (
            <section className="crm-terminal-note crm-terminal-note--won">
              <CheckCircle2 className="crm-line-icon" />
              <div>
                <strong>Lead đã được tạo cơ hội.</strong>
                {lead.convertedCustomerId ? (
                  <p><Link href={`/all-platform/crm/customers/${lead.convertedCustomerId}`} target="_blank">Xem Khách hàng</Link></p>
                ) : null}
              </div>
            </section>
          ) : convertOpen ? (
            <section className="crm-form-section crm-lead-convert-section" id="crm-lead-convert">
              <p className="crm-form-title">Xác nhận tạo cơ hội &amp; bàn giao Sale</p>
              <div className="crm-lead-convert-confirm">
                {convertError ? <p className="crm-error">{convertError}</p> : null}
                <div className="crm-lead-convert-row">
                  <b>Doanh nghiệp:</b>
                  {companyMatches.length ? (
                    <select value={customerChoice} onChange={e => setCustomerChoice(e.target.value)}>
                      <option value="new">Tạo doanh nghiệp mới ({lead.companyName || lead.leadName})</option>
                      {companyMatches.map(match => (
                        <option key={match.id} value={match.id}>
                          Liên kết: {match.customer_name || match.company_name} ({match.match_reason})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span>Tạo doanh nghiệp mới — {lead.companyName || lead.leadName}</span>
                  )}
                </div>
                {selectedMatch ? <p className="crm-ai-fill-hint">Deal/Customer sẽ gắn vào hồ sơ đã có, không tạo trùng.</p> : null}

                <div className="crm-lead-convert-row crm-lead-convert-contact">
                  <b>Contact (tạo mới, có thể sửa):</b>
                  <div className="crm-form-grid">
                    <Field label="Tên"><input value={contact.name} onChange={e => setContact(c => ({ ...c, name: e.target.value }))} /></Field>
                    <Field label="Chức vụ">
                      <PositionSelect
                        value={contact.positionCategoryId}
                        labelSnapshot={contact.positionLabel}
                        onChange={(id, label) => setContact(c => ({ ...c, positionCategoryId: id, positionLabel: label }))}
                      />
                    </Field>
                    <Field label="SĐT"><input value={contact.phone} onChange={e => setContact(c => ({ ...c, phone: e.target.value }))} /></Field>
                    <Field label="Email"><input value={contact.email} onChange={e => setContact(c => ({ ...c, email: e.target.value }))} /></Field>
                  </div>
                </div>

                <div className="crm-lead-convert-summary">
                  <b>Deal sẽ được tạo với:</b>
                  <ul>
                    <li>Sale nhận bàn giao: {aeName(form.aeId || lead.sdrId)}</li>
                    <li>Nhu cầu: {form.interest || 'Chưa có'}</li>
                    <li>Giá trị dự kiến: {form.estimatedValue ? (formatVND(parseMoney(form.estimatedValue)) || form.estimatedValue) : 'Chưa có'}</li>
                    <li>Việc tiếp theo: {form.nextStep || 'Chưa có'}</li>
                    <li>Khi nào làm: {form.nextStepAt ? new Date(form.nextStepAt).toLocaleString('vi-VN') : 'Chưa có'}</li>
                  </ul>
                </div>

                <div className="crm-lead-qualification-actions">
                  <button type="button" className="crm-secondary-button" disabled={converting} onClick={() => setConvertOpen(false)}>
                    Quay lại
                  </button>
                  <button type="button" className="crm-primary-button" disabled={converting} onClick={() => void handleConvert()}>
                    {converting ? <Loader2 className="crm-save-spinner" /> : null} Xác nhận tạo cơ hội
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <>
              <section className="crm-verify-suggest">
                <div className="crm-verify-suggest-head">
                  <p className="crm-form-title">Gợi ý từ dữ liệu Lead</p>
                  <span className={`crm-verify-suggest-pill ${suggestionUsed ? 'is-used' : ''}`}>
                    {suggestionUsed ? 'Đã dùng gợi ý' : 'Chưa dùng gợi ý'}
                  </span>
                </div>
                <p className="crm-verify-suggest-text">
                  CRM có thể dùng nội dung trao đổi, nguồn Lead và công ty để gợi ý nhu cầu, mức độ phù hợp, giá trị
                  và việc tiếp theo. SDR chỉ cần kiểm tra lại.
                </p>
                <div className="crm-verify-suggest-actions">
                  <button type="button" className="crm-secondary-button" disabled={!canWrite} onClick={applySuggestion}>
                    Dùng gợi ý
                  </button>
                  <button type="button" className="crm-ghost-button" disabled={!canWrite} onClick={resetSuggestion}>
                    Đặt lại
                  </button>
                </div>
              </section>

              <ol className="crm-verify-stepper">
                {STEPS.map((step, index) => (
                  <li
                    key={step}
                    className={`crm-verify-step ${index + 1 === currentStep ? 'is-current' : ''} ${index + 1 < currentStep ? 'is-done' : ''}`}
                  >
                    <span className="crm-verify-step-index">{index + 1}</span>
                    <span className="crm-verify-step-label">{step}</span>
                  </li>
                ))}
              </ol>

              <section className="crm-form-section crm-verify-section" id="crm-verify-quick">
                <p className="crm-form-title">Xác nhận nhanh</p>
                <div className="crm-form-grid">
                  <Field full label="Khách đang quan tâm gì?" hint="Chọn từ danh mục Sản phẩm/Dịch vụ (Danh mục CRM → Danh mục sản phẩm).">
                    <CrmCategorySelect
                      categoryType="crm_service_package"
                      value={form.interest}
                      disabled={!canWrite}
                      placeholder="-- Chọn sản phẩm/dịch vụ --"
                      onChange={label => setField('interest', label)}
                    />
                  </Field>
                  <Field label="Có đúng nhóm khách hàng mục tiêu?">
                    <select disabled={!canWrite} value={form.icpFit} onChange={e => setField('icpFit', e.target.value as IcpFit)}>
                      {ICP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Dự kiến triển khai khi nào?">
                    <select disabled={!canWrite} value={form.timeline} onChange={e => setField('timeline', e.target.value)}>
                      {timelineOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field full label="Giá trị ước tính (VND)" hint="Tự thêm dấu chấm ngăn nghìn khi gõ.">
                    <input
                      disabled={!canWrite}
                      value={form.estimatedValue}
                      onChange={e => setField('estimatedValue', formatMoneyInput(e.target.value))}
                      inputMode="numeric"
                      placeholder="VD: 50.000.000"
                    />
                  </Field>
                </div>
              </section>

              <section className="crm-form-section crm-verify-section" id="crm-verify-handoff">
                <p className="crm-form-title">Việc tiếp theo và bàn giao</p>
                <div className="crm-form-grid">
                  <Field label="SDR/Sale cần làm gì tiếp">
                    <CrmCategorySelect
                      categoryType="crm_next_step"
                      value={form.nextStep}
                      disabled={!canWrite}
                      placeholder="-- Chọn việc tiếp theo --"
                      fallbackLabels={NEXT_STEP_FALLBACK}
                      onChange={label => setField('nextStep', label)}
                    />
                  </Field>
                  <Field label="Khi nào làm">
                    <input
                      disabled={!canWrite}
                      type="datetime-local"
                      value={form.nextStepAt}
                      onChange={e => setField('nextStepAt', e.target.value)}
                    />
                  </Field>
                  <Field label="Sale nhận bàn giao">
                    <select disabled={!canWrite} value={form.aeId} onChange={e => setField('aeId', e.target.value)}>
                      <option value="">-- Chưa chọn --</option>
                      {aeOptions.map(m => (
                        <option key={m.id} value={selectionKeyOf(m)}>{m.display_name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Ghi chú ngắn">
                    <input disabled={!canWrite} value={form.note} onChange={e => setField('note', e.target.value)} placeholder="VD: khách đang so sánh 2 nhà cung cấp" />
                  </Field>
                </div>
                {nextStepWarning ? (
                  <p className="crm-verify-warning">
                    <AlertTriangle className="crm-line-icon" />
                    Deal không nên được tạo nếu chưa có Việc tiếp theo.
                  </p>
                ) : null}
              </section>

              <section className="crm-form-section crm-verify-section" id="crm-verify-readiness" ref={readinessRef}>
                <div className="crm-verify-suggest-head">
                  <p className="crm-form-title">Mức sẵn sàng tạo cơ hội</p>
                  <span className={`crm-verify-readiness-pill crm-verify-readiness-pill--${readinessTone}`}>{readinessLabel}</span>
                </div>
                <ul className="crm-verify-checklist">
                  {checks.map(check => (
                    <li key={check.key} className={check.ok ? 'is-ok' : ''}>
                      {check.ok ? <CheckCircle2 className="crm-line-icon" /> : <XCircle className="crm-line-icon" />}
                      <span>{check.label}</span>
                    </li>
                  ))}
                </ul>
                {companyMatches.length ? (
                  <p className="crm-ai-fill-hint">
                    Tìm thấy {companyMatches.length} doanh nghiệp có thể trùng — chọn liên kết ở bước xác nhận thay vì tạo mới.
                  </p>
                ) : null}
              </section>
            </>
          )}
        </div>

        {!isConverted && canWrite && !convertOpen ? (
          <footer className="crm-drawer-footer crm-verify-footer">
            <button type="button" className="crm-ghost-button crm-verify-footer-nurture" disabled={saving} onClick={() => void markNurture()}>
              Chưa phù hợp · theo dõi sau
            </button>
            <div className="crm-footer-actions">
              <button type="button" className="crm-secondary-button" disabled={saving} onClick={() => void saveVerification()}>
                {saving ? <Loader2 className="crm-save-spinner" /> : null} Lưu xác minh
              </button>
              <button
                type="button"
                className="crm-primary-button"
                disabled={saving || !isReady}
                title={isReady ? undefined : 'Hoàn tất checklist "Mức sẵn sàng tạo cơ hội" trước'}
                onClick={() => void openConvertConfirm()}
              >
                Tạo cơ hội &amp; bàn giao Sale
              </button>
            </div>
          </footer>
        ) : null}
      </aside>
    </>
  );
}

function Field({
  label,
  full,
  hint,
  children,
}: {
  label: string;
  full?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`crm-field ${full ? 'crm-field--full' : ''}`}>
      <span>{label}</span>
      {children}
      {hint ? <small className="crm-verify-hint">{hint}</small> : null}
    </label>
  );
}
