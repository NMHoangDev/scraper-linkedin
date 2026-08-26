'use client';

import { useEffect, useMemo, useState } from 'react';
import { customerLeadService } from '@/services/customer-lead.service';
import { seedingQuoteRepository } from '../repositories/SeedingQuoteRepository';
import type { CreateIssuerCompanyInput, IssuerCompany, QuoteForm } from '../types';
import '../../service-catalog/styles/service-catalog.css';
import './issuer-company-admin.css';

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp';

function emptyForm(): CreateIssuerCompanyInput {
  return {
    code: '',
    legalName: '',
    brandName: '',
    address: '',
    contactName: '',
    phone: '',
    email: '',
    website: '',
    taxCode: '',
    logoUrl: '',
    defaultQuoteFormId: '',
    status: 'active',
    sortOrder: 0,
  };
}

function companyToForm(company: IssuerCompany): CreateIssuerCompanyInput {
  return {
    code: company.code,
    legalName: company.legalName,
    brandName: company.brandName || '',
    address: company.address || '',
    contactName: company.contactName || '',
    phone: company.phone || '',
    email: company.email || '',
    website: company.website || '',
    taxCode: company.taxCode || '',
    logoUrl: company.logoUrl || '',
    defaultQuoteFormId: company.defaultQuoteFormId || '',
    status: company.status,
    sortOrder: 0,
  };
}

/** Trang quản trị "Danh mục công ty phát hành báo giá" — CRUD 3 công ty
 * (SecurityZone/Cloudgate/Markee AI...) dùng ở Bước 1 wizard tạo báo giá. Riêng
 * upload logo: file thật lên storage (bucket crm-attachments, prefix "logo"),
 * DB chỉ lưu URL — không bao giờ lưu base64. */
export function IssuerCompanyAdminPage() {
  const [companies, setCompanies] = useState<IssuerCompany[]>([]);
  const [forms, setForms] = useState<QuoteForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editTarget, setEditTarget] = useState<{ mode: 'add' | 'edit'; id?: string } | null>(null);
  const [form, setForm] = useState<CreateIssuerCompanyInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [companyRows, formRows] = await Promise.all([
        seedingQuoteRepository.getIssuerCompanies(true),
        seedingQuoteRepository.getForms(),
      ]);
      setCompanies(companyRows);
      setForms(formRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh mục công ty.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const formsForEditingCompany = useMemo(
    () => forms.filter(f => editTarget?.id && f.issuerCompanyId === editTarget.id),
    [forms, editTarget]
  );

  function openAdd() {
    setEditTarget({ mode: 'add' });
    setForm(emptyForm());
    setFormError('');
  }
  function openEdit(company: IssuerCompany) {
    setEditTarget({ mode: 'edit', id: company.id });
    setForm(companyToForm(company));
    setFormError('');
  }

  async function handleSave() {
    if (!form.code.trim() || !form.legalName.trim()) {
      setFormError('Mã công ty và tên pháp lý bắt buộc.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editTarget?.mode === 'edit' && editTarget.id) {
        await seedingQuoteRepository.updateIssuerCompany(editTarget.id, form);
      } else {
        await seedingQuoteRepository.createIssuerCompany(form);
      }
      setEditTarget(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không lưu được công ty.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(company: IssuerCompany) {
    try {
      await seedingQuoteRepository.updateIssuerCompany(company.id, {
        status: company.status === 'active' ? 'inactive' : 'active',
      });
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Không cập nhật được trạng thái.');
    }
  }

  async function handleLogoChange(file: File) {
    if (!LOGO_ACCEPT.split(',').includes(file.type)) {
      setFormError('Logo chỉ nhận PNG/JPG/WebP.');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setFormError('Logo tối đa 2 MB.');
      return;
    }
    setFormError('');
    setUploadingLogo(true);
    try {
      const result = await customerLeadService.uploadAttachment(file, 'logo');
      setForm(current => ({ ...current, logoUrl: result.url }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không upload được logo.');
    } finally {
      setUploadingLogo(false);
    }
  }

  function removeLogo() {
    setForm(current => ({ ...current, logoUrl: '' }));
  }

  return (
    <div className="sc-page">
      <div className="sc-header">
        <h1>Danh mục công ty phát hành báo giá</h1>
      </div>
      <p className="sc-tab-note">
        Công ty đứng tên phát hành báo giá (bên bán) — chọn ở Bước 1 wizard tạo báo giá. Sửa thông tin/logo ở đây chỉ
        áp dụng cho báo giá tạo mới sau đó, không đổi ngược báo giá đã lưu.
      </p>

      {error ? <div className="sc-error">{error}</div> : null}
      {loading ? <div>Đang tải...</div> : null}

      {!loading ? (
        <div className="sc-tab-panel">
          <div className="sc-toolbar">
            <button type="button" className="sc-btn sc-btn-primary" onClick={openAdd}>
              + Công ty mới
            </button>
          </div>

          {editTarget ? (
            <div className="sc-panel">
              <strong>{editTarget.mode === 'add' ? 'Thêm công ty phát hành' : `Sửa: ${form.legalName}`}</strong>

              <div className="issuer-logo-editor">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="Logo" className="issuer-logo-editor-preview" />
                ) : (
                  <div className="issuer-logo-editor-placeholder">{(form.legalName || '?').slice(0, 2).toUpperCase()}</div>
                )}
                <div className="issuer-logo-editor-actions">
                  <label className="sc-btn">
                    {uploadingLogo ? 'Đang tải...' : form.logoUrl ? 'Thay logo' : 'Tải logo lên'}
                    <input
                      type="file"
                      accept={LOGO_ACCEPT}
                      style={{ display: 'none' }}
                      disabled={uploadingLogo}
                      onChange={event => {
                        const file = event.target.files?.[0];
                        if (file) void handleLogoChange(file);
                        event.target.value = '';
                      }}
                    />
                  </label>
                  {form.logoUrl ? (
                    <button type="button" className="sc-btn" onClick={removeLogo}>
                      Xoá logo
                    </button>
                  ) : null}
                  <p className="sc-tab-note">PNG/JPG/WebP, tối đa 2MB. Khuyến nghị nền trong suốt, tỷ lệ ngang.</p>
                </div>
              </div>

              <div className="sc-panel-grid">
                <label className="sc-field">
                  <span>Mã công ty *</span>
                  <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                </label>
                <label className="sc-field">
                  <span>Tên pháp lý *</span>
                  <input value={form.legalName} onChange={e => setForm({ ...form, legalName: e.target.value })} />
                </label>
                <label className="sc-field">
                  <span>Thương hiệu hiển thị</span>
                  <input value={form.brandName || ''} onChange={e => setForm({ ...form, brandName: e.target.value })} />
                </label>
                <label className="sc-field">
                  <span>Mã số thuế</span>
                  <input value={form.taxCode || ''} onChange={e => setForm({ ...form, taxCode: e.target.value })} />
                </label>
                <label className="sc-field crm-field--full" style={{ gridColumn: '1 / -1' }}>
                  <span>Địa chỉ</span>
                  <input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} />
                </label>
                <label className="sc-field">
                  <span>Người liên hệ</span>
                  <input value={form.contactName || ''} onChange={e => setForm({ ...form, contactName: e.target.value })} />
                </label>
                <label className="sc-field">
                  <span>SĐT</span>
                  <input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </label>
                <label className="sc-field">
                  <span>Email</span>
                  <input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
                </label>
                <label className="sc-field">
                  <span>Website</span>
                  <input value={form.website || ''} onChange={e => setForm({ ...form, website: e.target.value })} />
                </label>
                {editTarget.mode === 'edit' ? (
                  <label className="sc-field">
                    <span>Mẫu báo giá mặc định</span>
                    <select
                      value={form.defaultQuoteFormId || ''}
                      onChange={e => setForm({ ...form, defaultQuoteFormId: e.target.value })}
                    >
                      <option value="">-- Chưa gán (dùng Mẫu báo giá chuẩn) --</option>
                      {formsForEditingCompany.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="sc-field">
                  <span>Trạng thái</span>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}>
                    <option value="active">Đang dùng</option>
                    <option value="inactive">Ngừng dùng</option>
                  </select>
                </label>
              </div>

              {formError ? <div className="sc-error">{formError}</div> : null}
              <div className="sc-panel-actions">
                <button type="button" className="sc-btn" onClick={() => setEditTarget(null)}>
                  Huỷ
                </button>
                <button type="button" className="sc-btn sc-btn-primary" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>
          ) : null}

          <div className="sc-table-wrap">
            <table className="sc-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Công ty</th>
                  <th>Liên hệ</th>
                  <th>Số mẫu báo giá</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="sc-empty">
                      Chưa có công ty phát hành nào.
                    </td>
                  </tr>
                ) : (
                  companies.map(company => (
                    <tr key={company.id}>
                      <td>
                        {company.logoUrl ? (
                          <img src={company.logoUrl} alt="" className="issuer-logo-thumb" />
                        ) : (
                          <div className="issuer-logo-thumb issuer-logo-thumb--placeholder">
                            {company.legalName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="sc-cell-title">{company.legalName}</div>
                        <div className="sc-cell-desc">{company.code}</div>
                      </td>
                      <td className="sc-cell-desc">{company.contactName || company.email || '—'}</td>
                      <td>{forms.filter(f => f.issuerCompanyId === company.id).length}</td>
                      <td>
                        <span className={`sc-badge ${company.status === 'inactive' ? 'sc-badge-inactive' : 'sc-badge-active'}`}>
                          {company.status === 'inactive' ? 'Ngừng dùng' : 'Đang dùng'}
                        </span>
                      </td>
                      <td className="sc-row-actions">
                        <button type="button" className="sc-icon-btn" onClick={() => openEdit(company)}>
                          Sửa
                        </button>
                        <button type="button" className="sc-icon-btn" onClick={() => void toggleStatus(company)}>
                          {company.status === 'inactive' ? 'Kích hoạt lại' : 'Ngưng dùng'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
