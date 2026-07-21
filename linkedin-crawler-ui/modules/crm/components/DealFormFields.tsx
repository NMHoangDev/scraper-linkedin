'use client';

import { useMembers } from '@/hooks/useMembers';
import type { MemberProfile } from '@/types/unified.types';
import {
  CITY_OPTIONS,
  CONTRACT_STATUS_OPTIONS,
  CRM_PACKAGE_OPTIONS,
  DEAL_STAGE_META,
  DEAL_STAGES,
  INDUSTRY_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  SERVICE_PACKAGE_OPTIONS,
  SOURCE_OPTIONS,
  parseMoney,
} from '../constants/crmConfig';
import type { CreateDealInput, CrmUserOption, Deal, UpdateDealInput } from '../types';

const DEFAULT_INDUSTRY_OPTIONS = INDUSTRY_OPTIONS.map(value => ({ value, label: value }));

export type DealFormState = {
  customerName: string;
  position: string;
  companyName: string;
  phone: string;
  email: string;
  zalo: string;
  facebook: string;
  telegram: string;
  website: string;
  taxCode: string;
  address: string;
  city: string;
  industry: string;
  sourcePlatform: string;
  servicePackage: string;
  package: string;
  stage: Deal['stage'];
  decisionMaker: string;
  estimatedBudget: string;
  followUpDate: string;
  quoteUrl: string;
  quoteNumber: string;
  quoteTotalAmount: string;
  contractCode: string;
  contractTitle: string;
  contractUrl: string;
  contractStatus: string;
  paymentStatus: string;
  paymentDueDate: string;
  lifetimeValue: string;
  contractSignedAt: string;
  warrantyExpiresAt: string;
  customerSince: string;
  lastCareAt: string;
  contractNote: string;
  pauseReason: string;
  note: string;
  leadedBy: string;
  leadedByNameHint: string;
  sdrId: string;
  sdrNameHint: string;
};

export function emptyDealForm(): DealFormState {
  return {
    customerName: '',
    position: '',
    companyName: '',
    phone: '',
    email: '',
    zalo: '',
    facebook: '',
    telegram: '',
    website: '',
    taxCode: '',
    address: '',
    city: '',
    industry: '',
    sourcePlatform: 'Manual',
    servicePackage: '',
    package: '',
    stage: 'new_lead',
    decisionMaker: '',
    estimatedBudget: '',
    followUpDate: '',
    quoteUrl: '',
    quoteNumber: '',
    quoteTotalAmount: '',
    contractCode: '',
    contractTitle: '',
    contractUrl: '',
    contractStatus: '',
    paymentStatus: 'chua_thanh_toan',
    paymentDueDate: '',
    lifetimeValue: '',
    contractSignedAt: '',
    warrantyExpiresAt: '',
    customerSince: '',
    lastCareAt: '',
    contractNote: '',
    pauseReason: '',
    note: '',
    leadedBy: '',
    leadedByNameHint: '',
    sdrId: '',
    sdrNameHint: '',
  };
}

function toDateInput(value?: string) {
  return value ? String(value).slice(0, 10) : '';
}

function toDateTimeInput(value?: string) {
  return value ? String(value).slice(0, 16) : '';
}

export function dealFormFromDeal(deal: Deal): DealFormState {
  return {
    ...emptyDealForm(),
    customerName: deal.customerName,
    position: deal.position || '',
    companyName: deal.companyName || '',
    phone: deal.phone || '',
    email: deal.email || '',
    zalo: deal.zalo || '',
    facebook: deal.facebook || '',
    telegram: deal.telegram || '',
    website: deal.website || '',
    taxCode: deal.taxCode || '',
    address: deal.address || '',
    city: deal.city || '',
    industry: deal.industry || '',
    sourcePlatform: deal.sourcePlatform || 'Manual',
    servicePackage: deal.servicePackage || '',
    package: deal.package || '',
    stage: deal.stage || 'new_lead',
    decisionMaker: deal.decisionMaker || '',
    estimatedBudget: String(deal.estimatedBudget || ''),
    followUpDate: toDateTimeInput(deal.followUpDate),
    quoteUrl: deal.quote?.url || '',
    quoteNumber: deal.quote?.number || '',
    quoteTotalAmount: String(deal.quote?.totalAmount || ''),
    contractCode: deal.contract.code || '',
    contractTitle: deal.contract.title || '',
    contractUrl: deal.contract.url || '',
    contractStatus: deal.contract.status || '',
    paymentStatus: deal.contract.paymentStatus || 'chua_thanh_toan',
    paymentDueDate: toDateInput(deal.contract.paymentDueDate),
    lifetimeValue: String(deal.lifetimeValue || ''),
    contractSignedAt: toDateInput(deal.contract.signedAt),
    warrantyExpiresAt: toDateInput(deal.contract.warrantyExpiresAt),
    customerSince: toDateInput(deal.contract.customerSince),
    lastCareAt: toDateTimeInput(deal.contract.lastCareAt),
    contractNote: deal.contract.note || '',
    pauseReason: deal.pauseReason || '',
    note: deal.note || '',
    leadedBy: deal.assignment.leadedById || '',
    leadedByNameHint: deal.assignment.leadedByNameHint || deal.assignment.leadName || '',
    sdrId: deal.assignment.sdrId || '',
    sdrNameHint: deal.assignment.sdrNameHint || deal.assignment.sdrName || '',
  };
}

export function getSourceLabel(sourcePlatform: string) {
  return SOURCE_OPTIONS.find(option => option.value === sourcePlatform)?.label || sourcePlatform;
}

export function validateDealForm(form: DealFormState): string | null {
  if (!form.customerName.trim()) return 'Vui lòng nhập tên khách hàng.';
  if (!form.email.trim() && !form.phone.trim()) return 'Cần nhập email hoặc số điện thoại để tạo contact.';
  return null;
}

export function buildDealPayload(form: DealFormState, _agents: CrmUserOption[] = []): CreateDealInput | UpdateDealInput {
  const quote =
    form.quoteUrl || form.quoteNumber || form.quoteTotalAmount
      ? {
          url: form.quoteUrl.trim() || undefined,
          number: form.quoteNumber.trim() || undefined,
          totalAmount: parseMoney(form.quoteTotalAmount) || undefined,
        }
      : undefined;
  return {
    customerName: form.customerName.trim(),
    position: form.position.trim(),
    companyName: form.companyName.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    zalo: form.zalo.trim(),
    facebook: form.facebook.trim(),
    telegram: form.telegram.trim(),
    website: form.website.trim(),
    taxCode: form.taxCode.trim(),
    address: form.address.trim(),
    city: form.city,
    industry: form.industry,
    sourcePlatform: form.sourcePlatform || 'Manual',
    servicePackage: form.servicePackage,
    package: form.package,
    stage: form.stage,
    decisionMaker: form.decisionMaker.trim(),
    estimatedBudget: parseMoney(form.estimatedBudget),
    lifetimeValue: parseMoney(form.lifetimeValue),
    followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : '',
    quote,
    contract: {
      code: form.contractCode.trim(),
      status: form.contractStatus as Deal['contract']['status'],
      paymentStatus: form.paymentStatus as Deal['contract']['paymentStatus'],
      paymentDueDate: form.paymentDueDate,
      signedAt: form.contractSignedAt,
      warrantyExpiresAt: form.warrantyExpiresAt,
      customerSince: form.customerSince,
      lastCareAt: form.lastCareAt ? new Date(form.lastCareAt).toISOString() : '',
      title: form.contractTitle.trim(),
      url: form.contractUrl.trim(),
      note: form.contractNote.trim(),
    },
    pauseReason: form.pauseReason.trim(),
    note: form.note.trim(),
    assignment: {
      ownerUserId: form.leadedBy,
      createdById: form.leadedBy,
      assignedUserId: form.sdrId,
      sdrId: form.sdrId,
      sdrName: form.sdrNameHint,
      sdrNameHint: form.sdrNameHint,
      leadedById: form.leadedBy,
      leadName: form.leadedByNameHint,
      leadedByNameHint: form.leadedByNameHint,
    },
  };
}

export function DealFormFields({
  form,
  setValue,
  agents = [],
  variant = 'edit',
  sourceOptions = SOURCE_OPTIONS,
  servicePackageOptions = SERVICE_PACKAGE_OPTIONS,
  packageOptions = CRM_PACKAGE_OPTIONS,
  industryOptions = DEFAULT_INDUSTRY_OPTIONS,
}: {
  form: DealFormState;
  setValue: <K extends keyof DealFormState>(key: K, value: DealFormState[K]) => void;
  sourceOptions?: Array<{ value: string; label: string }>;
  servicePackageOptions?: Array<{ value: string; label: string }>;
  packageOptions?: Array<{ value: string; label: string }>;
  industryOptions?: Array<{ value: string; label: string }>;
  agents?: CrmUserOption[];
  /** 'wizard' hides manual contract/quote link fields — the deal+quote wizard generates the quote link automatically. */
  variant?: 'edit' | 'wizard';
}) {
  // Nguồn dữ liệu DUY NHẤT cho dropdown Quản lý/Phụ trách — GET /members,
  // không hard-code / không tự tạo danh sách riêng. Chọn tự do trên toàn bộ
  // 140 người, kể cả người CHƯA liên kết tài khoản đăng nhập — leaded_by/
  // sdr_id (FK tới app_users.id) sẽ NULL cho tới khi người đó liên kết, nhưng
  // tên vẫn luôn hiển thị nhờ leaded_by_name_hint/sdr_name_hint.
  const { members } = useMembers();
  const assignableMembers = [...members].sort((a, b) => a.display_name.localeCompare(b.display_name));

  // Value trên <option> phải LUÔN duy nhất (kể cả người chưa liên kết) —
  // dùng linked_user_id nếu có, else fallback về member.id của danh bạ.
  const selectionKeyOf = (m: MemberProfile) => m.linked_user_id || m.linked_user_id_2 || m.id;

  // form.leadedBy/sdrId chỉ lưu app_users.id THẬT (rỗng nếu chưa liên kết),
  // nên suy ngược lại "đang chọn ai" để control <select> phải dò qua tên hint
  // khi id thật rỗng.
  const findSelectionKey = (realId: string, nameHint: string) => {
    if (realId) return realId;
    if (!nameHint) return '';
    const match = assignableMembers.find(m => !(m.linked_user_id || m.linked_user_id_2) && m.display_name === nameHint);
    return match ? match.id : '';
  };

  const handlePick = (value: string, idKey: 'leadedBy' | 'sdrId', hintKey: 'leadedByNameHint' | 'sdrNameHint') => {
    if (!value) {
      setValue(idKey, '');
      setValue(hintKey, '');
      return;
    }
    const member = assignableMembers.find(m => selectionKeyOf(m) === value);
    setValue(idKey, member ? (member.linked_user_id || member.linked_user_id_2 || '') : '');
    setValue(hintKey, member ? member.display_name : '');
  };

  const leadedBySelectionKey = findSelectionKey(form.leadedBy, form.leadedByNameHint);
  const sdrSelectionKey = findSelectionKey(form.sdrId, form.sdrNameHint);

  return (
    <>
      <section className="crm-form-section">
        <h3 className="crm-form-title">Thông tin cơ bản</h3>
        <div className="crm-form-grid">
          <Field full label="Tên khách hàng" required>
            <input value={form.customerName} onChange={event => setValue('customerName', event.target.value)} placeholder="Nguyễn Văn A" />
          </Field>
          <Field label="Chức vụ">
            <input value={form.position} onChange={event => setValue('position', event.target.value)} placeholder="Giám đốc, Chủ doanh nghiệp..." />
          </Field>
          <Field label="Tên công ty / Dự án">
            <input value={form.companyName} onChange={event => setValue('companyName', event.target.value)} placeholder="Công ty TNHH ABC..." />
          </Field>
          <Field label="Điện thoại" hint="cần email hoặc SĐT">
            <input value={form.phone} onChange={event => setValue('phone', event.target.value)} type="tel" placeholder="0912 345 678" />
          </Field>
          <Field label="Email" hint="cần email hoặc SĐT">
            <input value={form.email} onChange={event => setValue('email', event.target.value)} type="email" placeholder="khach@email.com" />
          </Field>
          <Field label="Zalo">
            <input value={form.zalo} onChange={event => setValue('zalo', event.target.value)} placeholder="Số Zalo hoặc link Zalo" />
          </Field>
          <Field label="Facebook">
            <input value={form.facebook} onChange={event => setValue('facebook', event.target.value)} placeholder="Link Facebook" />
          </Field>
          <Field label="Telegram">
            <input value={form.telegram} onChange={event => setValue('telegram', event.target.value)} placeholder="@username hoặc link Telegram" />
          </Field>
          <Field label="Website">
            <input value={form.website} onChange={event => setValue('website', event.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Mã số thuế">
            <input value={form.taxCode} onChange={event => setValue('taxCode', event.target.value)} placeholder="0312345678" />
          </Field>
        </div>
      </section>

      <section className="crm-form-section">
        <h3 className="crm-form-title">Địa chỉ</h3>
        <div className="crm-form-grid">
          <Field full label="Địa chỉ">
            <input value={form.address} onChange={event => setValue('address', event.target.value)} placeholder="Số nhà, đường, phường/xã..." />
          </Field>
          <Field label="Thành phố">
            <select value={form.city} onChange={event => setValue('city', event.target.value)}>
              <option value="">-- Chọn --</option>
              {CITY_OPTIONS.map(city => <option key={city}>{city}</option>)}
            </select>
          </Field>
          <Field label="Lĩnh vực">
            <select value={form.industry} onChange={event => setValue('industry', event.target.value)}>
              <option value="">-- Chọn --</option>
              {industryOptions.map(industry => <option key={industry.value} value={industry.value}>{industry.label}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section className="crm-form-section">
        <h3 className="crm-form-title">Nguồn & danh mục sản phẩm</h3>
        <div className="crm-form-grid">
          <Field label="Nguồn">
            <select value={form.sourcePlatform} onChange={event => setValue('sourcePlatform', event.target.value)}>
              {sourceOptions.map(source => <option key={source.value} value={source.value}>{source.label}</option>)}
            </select>
          </Field>
          <Field label="Danh mục sản phẩm" hint="tùy chọn">
            <select value={form.servicePackage} onChange={event => setValue('servicePackage', event.target.value)}>
              <option value="">-- Chưa chọn --</option>
              {servicePackageOptions.map(pkg => <option key={pkg.value} value={pkg.value}>{pkg.label}</option>)}
            </select>
          </Field>
          <Field label="Gói" hint="tùy chọn">
            <select value={form.package} onChange={event => setValue('package', event.target.value)}>
              <option value="">-- Chưa chọn --</option>
              {packageOptions.map(pkg => <option key={pkg.value} value={pkg.value}>{pkg.label}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section className="crm-pipeline-box">
        <div className="crm-pipeline-head">
          <h3>Quản lý deal (Pipeline)</h3>
          <span>{DEAL_STAGE_META[form.stage].label}</span>
        </div>
        <div className="crm-form-grid">
          <Field full label="Giai đoạn deal">
            <select value={form.stage} onChange={event => setValue('stage', event.target.value as Deal['stage'])}>
              {DEAL_STAGES.map(stage => (
                <option key={stage} value={stage}>
                  {DEAL_STAGE_META[stage].label} - {DEAL_STAGE_META[stage].description}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Người quyết định (DM)">
            <input value={form.decisionMaker} onChange={event => setValue('decisionMaker', event.target.value)} placeholder="Giám đốc, chủ đầu tư..." />
          </Field>
          <Field label="Ngân sách ước tính (VND)">
            <input value={form.estimatedBudget} onChange={event => setValue('estimatedBudget', event.target.value)} inputMode="decimal" placeholder="VD: 50.000.000" />
          </Field>
          <Field full label="Follow-up dự kiến">
            <input value={form.followUpDate} onChange={event => setValue('followUpDate', event.target.value)} type="datetime-local" />
          </Field>
          {form.stage === 'on_hold' ? (
            <Field full label="Lý do tạm dừng">
              <textarea value={form.pauseReason} onChange={event => setValue('pauseReason', event.target.value)} placeholder="Ghi rõ lý do deal bị tạm dừng..." />
            </Field>
          ) : null}
          <Field label="Tình trạng hợp đồng">
            <select value={form.contractStatus} onChange={event => setValue('contractStatus', event.target.value)}>
              <option value="">-- Chưa chọn --</option>
              {CONTRACT_STATUS_OPTIONS.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </Field>
          {variant === 'edit' ? (
            <>
              <Field label="Mã HĐ/BG">
                <input value={form.contractCode} onChange={event => setValue('contractCode', event.target.value)} placeholder="HĐ/BG-2026-..." />
              </Field>
              <Field label="Tên hợp đồng / báo giá">
                <input value={form.contractTitle} onChange={event => setValue('contractTitle', event.target.value)} placeholder="Bao_gia_ABC.pdf hoặc tên hợp đồng" />
              </Field>
              <Field full label="Link hợp đồng / file PDF">
                <input value={form.contractUrl} onChange={event => setValue('contractUrl', event.target.value)} placeholder="https://... hoặc /public/quotes/..." />
              </Field>
            </>
          ) : null}
          <Field label="Trạng thái thanh toán">
            <select value={form.paymentStatus} onChange={event => setValue('paymentStatus', event.target.value)}>
              {PAYMENT_STATUS_OPTIONS.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </Field>
          <Field label="Ngày cần thanh toán">
            <input value={form.paymentDueDate} onChange={event => setValue('paymentDueDate', event.target.value)} type="date" />
          </Field>
          <Field label="Giá trị hợp đồng / LTV (VND)">
            <input value={form.lifetimeValue} onChange={event => setValue('lifetimeValue', event.target.value)} inputMode="decimal" placeholder="0" />
          </Field>
          <Field label="Ngày ký hợp đồng">
            <input value={form.contractSignedAt} onChange={event => setValue('contractSignedAt', event.target.value)} type="date" />
          </Field>
          <Field label="Hết hạn bảo hành">
            <input value={form.warrantyExpiresAt} onChange={event => setValue('warrantyExpiresAt', event.target.value)} type="date" />
          </Field>
          <Field label="Ngày thành khách hàng">
            <input value={form.customerSince} onChange={event => setValue('customerSince', event.target.value)} type="date" />
          </Field>
          <Field label="Lần chăm sóc gần nhất">
            <input value={form.lastCareAt} onChange={event => setValue('lastCareAt', event.target.value)} type="datetime-local" />
          </Field>
          <Field full label="Ghi chú chăm sóc / hợp đồng">
            <textarea value={form.contractNote} onChange={event => setValue('contractNote', event.target.value)} placeholder="Tình trạng hợp đồng, ngày tháng cần theo dõi..." />
          </Field>
        </div>
      </section>

      {variant === 'edit' ? (
        <section className="crm-form-section">
          <h3 className="crm-form-title">Tham chiếu báo giá</h3>
          <div className="crm-form-grid">
            <Field label="Số báo giá">
              <input value={form.quoteNumber} onChange={event => setValue('quoteNumber', event.target.value)} placeholder="BG-2026-..." />
            </Field>
            <Field label="Tổng tiền báo giá">
              <input value={form.quoteTotalAmount} onChange={event => setValue('quoteTotalAmount', event.target.value)} inputMode="decimal" placeholder="0" />
            </Field>
            <Field full label="Link báo giá / hợp đồng">
              <input value={form.quoteUrl} onChange={event => setValue('quoteUrl', event.target.value)} placeholder="https://... hoặc /public/quotes/..." />
            </Field>
          </div>
        </section>
      ) : null}

      <section className="crm-form-section">
        <h3 className="crm-form-title">Ghi chú</h3>
        <Field label="">
          <textarea value={form.note} onChange={event => setValue('note', event.target.value)} placeholder="Yêu cầu cụ thể, ghi chú liên lạc, mục tiêu kinh doanh..." />
        </Field>
      </section>

      <section className="crm-form-section">
        <h3 className="crm-form-title">Phân công</h3>
        <div className="crm-form-grid">
          <Field label="Quản lý">
            <select value={leadedBySelectionKey} onChange={event => handlePick(event.target.value, 'leadedBy', 'leadedByNameHint')}>
              <option value="">-- Chưa gán --</option>
              {assignableMembers
                .filter(m => selectionKeyOf(m) === leadedBySelectionKey || selectionKeyOf(m) !== sdrSelectionKey)
                .map(m => {
                  const linked = !!(m.linked_user_id || m.linked_user_id_2);
                  return (
                    <option key={m.id} value={selectionKeyOf(m)}>
                      {linked ? `${m.display_name}${m.email ? ` (${m.email})` : ''}` : m.display_name}
                    </option>
                  );
                })}
            </select>
          </Field>
          <Field label="Phụ trách">
            <select value={sdrSelectionKey} onChange={event => handlePick(event.target.value, 'sdrId', 'sdrNameHint')}>
              <option value="">-- Chưa giao --</option>
              {assignableMembers
                .filter(m => selectionKeyOf(m) === sdrSelectionKey || selectionKeyOf(m) !== leadedBySelectionKey)
                .map(m => {
                  const linked = !!(m.linked_user_id || m.linked_user_id_2);
                  return (
                    <option key={m.id} value={selectionKeyOf(m)}>
                      {linked ? `${m.display_name}${m.email ? ` (${m.email})` : ''}` : m.display_name}
                    </option>
                  );
                })}
            </select>
          </Field>
        </div>
      </section>
    </>
  );
}

function Field({
  label,
  hint,
  required,
  full,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`crm-field ${full ? 'crm-field--full' : ''}`}>
      {label ? (
        <span>
          {label} {hint ? <em>({hint})</em> : null} {required ? <b>*</b> : null}
        </span>
      ) : null}
      {children}
    </label>
  );
}
