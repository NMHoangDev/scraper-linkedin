'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL, API_KEY } from '@/lib/env';
import { useMembers } from '@/hooks/useMembers';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { SOURCE_OPTIONS } from '../constants/crmConfig';
import { PositionSelect } from './PositionSelect';
import { mapLead } from './LeadsDirectory';
import { ChevronDown, ChevronUp, Loader2, X } from './icons';
import type { AppUser } from '@/types/unified.types';
import type { CrmLeadRow } from '../types';

type FormState = {
  leadName: string;
  companyName: string;
  positionCategoryId: string;
  positionLabel: string;
  phone: string;
  email: string;
  zalo: string;
  facebook: string;
  telegram: string;
  website: string;
  source: string;
  sdrId: string;
  sdrLabel: string;
  note: string;
};

function emptyForm(currentUser: AppUser | null): FormState {
  return {
    leadName: '',
    companyName: '',
    positionCategoryId: '',
    positionLabel: '',
    phone: '',
    email: '',
    zalo: '',
    facebook: '',
    telegram: '',
    website: '',
    source: 'Manual',
    sdrId: currentUser?.id || '',
    sdrLabel: currentUser?.name || currentUser?.email || '',
    note: '',
  };
}

function headers() {
  const value: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) value['X-API-Key'] = API_KEY;
  return value;
}

function isAdminOrLeader(user: AppUser | null) {
  const role = String(user?.role || '').toLowerCase();
  return role === 'admin' || role === 'leader';
}

// Regex don gian cho SDT VN (10 so, bat dau 0, hoac +84) va email - du dung cho
// ban rule-based dau tien (khong goi AI/backend), theo dung yeu cau spec.
const PHONE_RE = /(?:\+?84|0)(?:\d[\s.-]?){9,10}\b/;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

type DuplicateRow = {
  id: string;
  lead_name?: string | null;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
};

type CompanyMatchRow = {
  id: string;
  customer_name?: string | null;
  company_name?: string | null;
  website?: string | null;
  match_reason?: string;
};

export function LeadFormDrawer({
  open,
  currentUser,
  onClose,
  onSaved,
  onOpenQualification,
}: {
  open: boolean;
  currentUser: AppUser | null;
  onClose: () => void;
  onSaved: (lead: CrmLeadRow) => void;
  onOpenQualification: (lead: CrmLeadRow) => void;
}) {
  const [form, setForm] = useState<FormState>(() => emptyForm(currentUser));
  const [pasteText, setPasteText] = useState('');
  const [saving, setSaving] = useState<'create' | 'create-next' | 'create-qualify' | null>(null);
  const [error, setError] = useState('');
  const [extraOpen, setExtraOpen] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateRow[]>([]);
  const [companyMatches, setCompanyMatches] = useState<CompanyMatchRow[]>([]);
  const [matchedCustomerId, setMatchedCustomerId] = useState('');
  const { members } = useMembers();
  const leadNameRef = useRef<HTMLInputElement>(null);
  const dupTimer = useRef<number | undefined>(undefined);
  const companyTimer = useRef<number | undefined>(undefined);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setError('');
    setDuplicates([]);
    setCompanyMatches([]);
    setMatchedCustomerId('');
    setPasteText('');
    setForm(emptyForm(currentUser));
    setExtraOpen(false);
  }, [open, currentUser]);

  function setValue<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  const canPickOwner = isAdminOrLeader(currentUser);
  const selectionKeyOf = (m: { id: string; linked_user_id?: string | null; linked_user_id_2?: string | null }) =>
    m.linked_user_id || m.linked_user_id_2 || m.id;
  const sdrOptions = useMemo(() => {
    const linked = members.filter(m => m.linked_user_id || m.linked_user_id_2);
    return [...linked].sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [members]);

  function runDuplicateCheck(phone: string, email: string) {
    if (!phone.trim() && !email.trim()) {
      setDuplicates([]);
      return;
    }
    const params = new URLSearchParams();
    if (phone.trim()) params.set('phone', phone.trim());
    if (email.trim()) params.set('email', email.trim());
    fetch(`${API_BASE_URL}/api/all-platform/crm/leads/duplicate-check?${params.toString()}`, {
      credentials: 'include',
      headers: headers(),
    })
      .then(res => res.json())
      .then(body => {
        if (body.success !== false) setDuplicates((body.data?.matches || []) as DuplicateRow[]);
      })
      .catch(() => { /* im lang - canh bao trung khong bat buoc, khong chan submit */ });
  }

  function handlePhoneBlur() {
    window.clearTimeout(dupTimer.current);
    dupTimer.current = window.setTimeout(() => runDuplicateCheck(form.phone, form.email), 300);
  }
  function handleEmailBlur() {
    window.clearTimeout(dupTimer.current);
    dupTimer.current = window.setTimeout(() => runDuplicateCheck(form.phone, form.email), 300);
  }

  function runCompanyMatch(name: string, website: string) {
    if (!name.trim() && !website.trim()) {
      setCompanyMatches([]);
      return;
    }
    const params = new URLSearchParams();
    if (website.trim()) params.set('website', website.trim());
    if (name.trim()) params.set('name', name.trim());
    fetch(`${API_BASE_URL}/api/all-platform/crm/leads/company-match?${params.toString()}`, {
      credentials: 'include',
      headers: headers(),
    })
      .then(res => res.json())
      .then(body => {
        if (body.success !== false) setCompanyMatches((body.data?.matches || []) as CompanyMatchRow[]);
      })
      .catch(() => { /* im lang - goi y doanh nghiep khong bat buoc */ });
  }

  function handleCompanyNameChange(value: string) {
    setValue('companyName', value);
    setMatchedCustomerId('');
    window.clearTimeout(companyTimer.current);
    companyTimer.current = window.setTimeout(() => runCompanyMatch(value, form.website), 300);
  }

  function handleParsePaste() {
    const text = pasteText;
    const phoneMatch = text.match(PHONE_RE);
    const emailMatch = text.match(EMAIL_RE);
    if (phoneMatch && !form.phone.trim()) {
      setValue('phone', phoneMatch[0].replace(/[\s.-]/g, ''));
    }
    if (emailMatch && !form.email.trim()) {
      setValue('email', emailMatch[0]);
    }
    // Doan ten don gian: dong dau tien khong phai la SDT/email thuan tuy, cat truoc dau '-' hoac ','.
    if (!form.leadName.trim()) {
      const firstLine = text.split(/\n/)[0] || '';
      const namePart = firstLine.split(/[-,]/)[0].trim();
      if (namePart && !PHONE_RE.test(namePart) && !EMAIL_RE.test(namePart) && namePart.length < 60) {
        setValue('leadName', namePart);
      }
    }
  }

  function validate(): string | null {
    if (!form.leadName.trim()) return 'Vui lòng nhập tên khách hàng.';
    if (!form.phone.trim() && !form.email.trim()) return 'Cần nhập số điện thoại hoặc email.';
    return null;
  }

  function buildPayload() {
    return {
      lead_name: form.leadName.trim(),
      company_name: form.companyName.trim() || null,
      position_category_id: form.positionCategoryId || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      zalo: form.zalo.trim() || null,
      facebook: form.facebook.trim() || null,
      telegram: form.telegram.trim() || null,
      website: form.website.trim() || null,
      source: form.source || null,
      status: 'new_lead',
      sdr_id: canPickOwner ? (form.sdrId || null) : (currentUser?.id || null),
      note: form.note.trim() || null,
    };
  }

  async function submitLead(): Promise<CrmLeadRow | null> {
    const res = await fetch(`${API_BASE_URL}/api/all-platform/crm/leads`, {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
      body: JSON.stringify(buildPayload()),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.message || `Lỗi máy chủ (${res.status})`);
    if (body.success === false) {
      const dupRows = (body.data?.duplicates || []) as DuplicateRow[];
      if (dupRows.length) {
        setDuplicates(dupRows);
        setError('Đã có Lead trùng số điện thoại hoặc email — kiểm tra danh sách bên dưới trước khi tạo tiếp.');
        return null;
      }
      throw new Error(body.message || 'Không tạo được Lead.');
    }
    return mapLead(body.data);
  }

  async function handleAction(mode: 'create' | 'create-next' | 'create-qualify') {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(mode);
    setError('');
    try {
      const created = await submitLead();
      if (!created) return;
      onSaved(created);
      if (mode === 'create') {
        onClose();
      } else if (mode === 'create-next') {
        setForm(emptyForm(currentUser));
        setPasteText('');
        setDuplicates([]);
        setCompanyMatches([]);
        setMatchedCustomerId('');
        window.setTimeout(() => leadNameRef.current?.focus(), 0);
      } else {
        onOpenQualification(created);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được Lead.');
    } finally {
      setSaving(null);
    }
  }

  if (!open) return null;

  return (
    <div className="crm-drawer-backdrop" onClick={onClose}>
      <aside className="crm-drawer crm-lead-drawer" onClick={event => event.stopPropagation()}>
        <header className="crm-lead-drawer-header">
          <div>
            <h2>Thêm Lead nhanh</h2>
            <p>Tạo Lead mới — chưa tạo Khách hàng/Deal, chỉ khi Tạo cơ hội mới tạo hồ sơ chính thức.</p>
          </div>
          <button type="button" className="crm-drawer-close" onClick={onClose} aria-label="Đóng">
            <X className="crm-icon" />
          </button>
        </header>

        <div className="crm-drawer-body crm-lead-drawer-body">
          {error ? <p className="crm-error">{error}</p> : null}

          <section className="crm-ai-fill">
            <h3 className="crm-form-title">Dán nội dung để điền nhanh <em className="crm-optional-hint">(tùy chọn)</em></h3>
            <div className="crm-ai-fill-row">
              <textarea
                className="crm-ai-fill-textarea"
                value={pasteText}
                onChange={event => setPasteText(event.target.value)}
                placeholder="Dán tin nhắn/email có SĐT + email, hệ thống tự tách ra ô tương ứng..."
                rows={2}
              />
              <button type="button" className="crm-ai-fill-btn" disabled={!pasteText.trim()} onClick={handleParsePaste}>
                Phân tích nội dung
              </button>
            </div>
            <p className="crm-ai-fill-hint">Bóc tách bằng quy tắc (regex SĐT/email) — chạy tức thì, không gọi AI/backend.</p>
          </section>

          {duplicates.length ? (
            <div className="crm-duplicate-list">
              <p>Có thể trùng với Lead đã có (không chặn tạo mới):</p>
              <ul>
                {duplicates.map(dup => (
                  <li key={dup.id}>
                    <span>
                      {dup.lead_name || 'Lead chưa tên'}
                      {dup.company_name ? ` · ${dup.company_name}` : ''}
                      {dup.phone ? ` · ${dup.phone}` : ''}
                      {dup.email ? ` · ${dup.email}` : ''}
                    </span>
                    <Link href="/all-platform/crm/leads" target="_blank" className="crm-duplicate-open-btn">
                      Xem danh sách Lead
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="crm-form-section">
            <p className="crm-form-title">Thông tin Lead</p>
            <div className="crm-form-grid">
              <Field label="Tên khách hàng" required>
                <input ref={leadNameRef} value={form.leadName} onChange={e => setValue('leadName', e.target.value)} placeholder="Nguyễn Văn A" />
              </Field>
              <Field label="Công ty">
                <input value={form.companyName} onChange={e => handleCompanyNameChange(e.target.value)} placeholder="Công ty TNHH ABC" />
              </Field>
              <Field label="Chức vụ">
                <PositionSelect
                  value={form.positionCategoryId}
                  labelSnapshot={form.positionLabel}
                  onChange={(id, label) => {
                    setValue('positionCategoryId', id);
                    setValue('positionLabel', label);
                  }}
                />
              </Field>
              <Field label="Nguồn">
                <select value={form.source} onChange={e => setValue('source', e.target.value)}>
                  {SOURCE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Số điện thoại" required hint="cần SĐT hoặc email">
                <input value={form.phone} onChange={e => setValue('phone', e.target.value)} onBlur={handlePhoneBlur} type="tel" placeholder="09xxxxxxxx" />
              </Field>
              <Field label="Email" required hint="cần SĐT hoặc email">
                <input value={form.email} onChange={e => setValue('email', e.target.value)} onBlur={handleEmailBlur} type="email" placeholder="ten@congty.com" />
              </Field>
              {canPickOwner ? (
                <Field label="Người phụ trách Lead">
                  <select value={form.sdrId} onChange={e => setValue('sdrId', e.target.value)}>
                    <option value={currentUser?.id || ''}>-- Chính bạn --</option>
                    {sdrOptions.map(m => (
                      <option key={m.id} value={selectionKeyOf(m)}>
                        {m.display_name}{m.email ? ` (${m.email})` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field label="Người phụ trách Lead">
                  <input value={currentUser?.name || currentUser?.email || 'Bạn'} disabled readOnly />
                </Field>
              )}
              <Field label="Trạng thái">
                <input value="Lead mới" disabled readOnly />
              </Field>
            </div>
          </div>

          {companyMatches.length ? (
            <div className="crm-form-section crm-lead-company-match">
              <p className="crm-form-title">Doanh nghiệp có thể trùng</p>
              {companyMatches.slice(0, 3).map(match => (
                <div key={match.id} className={`crm-lead-company-match-card ${matchedCustomerId === match.id ? 'is-selected' : ''}`}>
                  <div>
                    <b>{match.customer_name || match.company_name || 'Khách hàng'}</b>
                    <span>{match.website || ''}</span>
                  </div>
                  <button
                    type="button"
                    className="crm-secondary-inline"
                    onClick={() => setMatchedCustomerId(current => (current === match.id ? '' : match.id))}
                  >
                    {matchedCustomerId === match.id ? 'Đã liên kết' : 'Liên kết doanh nghiệp này'}
                  </button>
                </div>
              ))}
              <p className="crm-ai-fill-hint">Chỉ ghi nhớ tạm trên form này — việc liên kết thật sự diễn ra ở bước Tạo cơ hội.</p>
            </div>
          ) : null}

          <div className="crm-form-section">
            <button type="button" className="crm-lead-extra-toggle" onClick={() => setExtraOpen(v => !v)}>
              {extraOpen ? <ChevronUp className="crm-inline-icon" /> : <ChevronDown className="crm-inline-icon" />}
              Thông tin bổ sung
            </button>
            {extraOpen ? (
              <div className="crm-form-grid" style={{ marginTop: '0.75rem' }}>
                <Field label="Zalo">
                  <input value={form.zalo} onChange={e => setValue('zalo', e.target.value)} placeholder="Số/link Zalo" />
                </Field>
                <Field label="Facebook">
                  <input value={form.facebook} onChange={e => setValue('facebook', e.target.value)} placeholder="Link Facebook" />
                </Field>
                <Field label="Telegram">
                  <input value={form.telegram} onChange={e => setValue('telegram', e.target.value)} placeholder="@username hoặc link" />
                </Field>
                <Field label="Website">
                  <input value={form.website} onChange={e => setValue('website', e.target.value)} placeholder="https://..." />
                </Field>
                <Field full label="Ghi chú">
                  <textarea value={form.note} onChange={e => setValue('note', e.target.value)} placeholder="Ghi chú nội bộ..." />
                </Field>
              </div>
            ) : null}
          </div>
        </div>

        <footer className="crm-drawer-footer crm-lead-drawer-footer">
          <button type="button" className="crm-cancel-button" onClick={onClose} disabled={saving !== null}>
            Hủy
          </button>
          <div className="crm-lead-drawer-footer-actions">
            <button type="button" className="crm-secondary-button" disabled={saving !== null} onClick={() => void handleAction('create-next')}>
              {saving === 'create-next' ? <Loader2 className="crm-save-spinner" /> : null}
              Tạo và thêm Lead tiếp theo
            </button>
            <button type="button" className="crm-secondary-button" disabled={saving !== null} onClick={() => void handleAction('create-qualify')}>
              {saving === 'create-qualify' ? <Loader2 className="crm-save-spinner" /> : null}
              Tạo và mở Qualification
            </button>
            <button type="button" className="crm-save-button" disabled={saving !== null} onClick={() => void handleAction('create')}>
              {saving === 'create' ? <Loader2 className="crm-save-spinner" /> : null}
              Tạo Lead
            </button>
          </div>
        </footer>
      </aside>
    </div>
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
      <span>
        {label} {hint ? <em>({hint})</em> : null} {required ? <b>*</b> : null}
      </span>
      {children}
    </label>
  );
}
