'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, API_KEY } from '@/lib/env';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { formatVND, getStageMeta } from '../constants/crmConfig';
import type { DealStage } from '../types';
import { CustomerFormModal } from './CustomerFormModal';
import { CrmContactsPanel } from './CrmContactsPanel';
import { Loader2 } from './icons';
import type { CrmCustomerRow } from '../types';

type RelatedPayload = {
  customer?: {
    id: string;
    customer_name?: string | null;
    company_name?: string | null;
    position?: string | null;
    phone?: string | null;
    email?: string | null;
    zalo?: string | null;
    facebook?: string | null;
    telegram?: string | null;
    website?: string | null;
    tax_code?: string | null;
    address?: string | null;
    city?: string | null;
    industry?: string | null;
    source?: string | null;
    status?: CrmCustomerRow['status'] | null;
    owner_id?: string | null;
    note?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  deals?: Array<{
    id: string;
    customer_name?: string | null;
    deal_stage?: string | null;
    estimated_budget?: number | string | null;
    lifetime_value?: number | string | null;
    updated_at?: string | null;
  }>;
  quotes?: Array<{
    id: string;
    quote_number?: string | null;
    status?: string | null;
    total_amount?: number | string | null;
    deal_id?: string | null;
  }>;
  contracts?: Array<{
    id: string;
    contract_number?: string | null;
    status?: string | null;
    deal_id?: string | null;
  }>;
  kpi?: {
    deal_count?: number;
    quote_count?: number;
    contract_count?: number;
    total_value?: number;
  };
};

const STATUS_LABEL: Record<string, string> = {
  new_lead: 'Tiềm năng',
  following: 'Đang bán',
  current_customer: 'Đã mua',
  not_fit: 'Ngừng hoạt động',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  new_lead: 'crm-customer-status--new',
  following: 'crm-customer-status--following',
  current_customer: 'crm-customer-status--current',
  not_fit: 'crm-customer-status--not-fit',
};

function headers() {
  const value: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) value['X-API-Key'] = API_KEY;
  return value;
}

function isAdminOrLeader(role?: string) {
  const normalized = String(role || '').toLowerCase();
  return normalized === 'admin' || normalized === 'leader';
}

function toCustomerRow(customer: RelatedPayload['customer']): CrmCustomerRow | null {
  if (!customer) return null;
  return {
    id: customer.id,
    customerName: customer.customer_name || '',
    companyName: customer.company_name || '',
    position: customer.position || '',
    phone: customer.phone || '',
    email: customer.email || '',
    zalo: customer.zalo || '',
    facebook: customer.facebook || '',
    telegram: customer.telegram || '',
    website: customer.website || '',
    taxCode: customer.tax_code || '',
    address: customer.address || '',
    city: customer.city || '',
    industry: customer.industry || '',
    source: customer.source || '',
    status: customer.status || undefined,
    ownerId: customer.owner_id || '',
    note: customer.note || '',
    createdAt: customer.created_at || '',
    updatedAt: customer.updated_at || '',
  };
}

type Tab = 'deals' | 'quotes' | 'contracts';

export function CrmCustomerDetailPage({ customerId }: { customerId: string }) {
  const { user } = useAppAuth();
  const [data, setData] = useState<RelatedPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('deals');
  const [editOpen, setEditOpen] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`${API_BASE_URL}/api/all-platform/crm/customers/${encodeURIComponent(customerId)}/related`, {
      credentials: 'include',
      headers: headers(),
    })
      .then(async res => {
        const body = await res.json();
        if (!res.ok || body.success === false) throw new Error(body.message || 'Không tải được hồ sơ khách hàng.');
        return body.data as RelatedPayload;
      })
      .then(payload => {
        if (alive) {
          setData(payload);
          setError('');
        }
      })
      .catch(err => {
        if (alive) setError(err instanceof Error ? err.message : 'Không tải được hồ sơ khách hàng.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [customerId, reloadTick]);

  const customer = data?.customer;
  const customerRow = useMemo(() => toCustomerRow(customer), [customer]);

  // can_edit KHÔNG được /related trả kèm (chỉ list_customers() mới attach) —
  // suy lại đúng quy tắc can_edit_customer() ở backend (crm_customer_service.py):
  // admin/leader luôn sửa được; còn lại chỉ khi owner_id === chính mình. Đây
  // chỉ là UX (ẩn/hiện nút Sửa) — server vẫn tự enforce lại khi PUT.
  const canEdit = Boolean(
    customer &&
    user &&
    (isAdminOrLeader(user.role) || String(customer.owner_id || '') === String(user.id || ''))
  );

  const dealLink = useMemo(() => {
    if (!customer) return '/all-platform/crm';
    const params = new URLSearchParams({
      openDeal: 'new',
      customerId: customer.id,
      customerName: customer.customer_name || '',
    });
    if (customer.company_name) params.set('companyName', customer.company_name);
    if (customer.phone) params.set('phone', customer.phone);
    if (customer.email) params.set('email', customer.email);
    return `/all-platform/crm?${params.toString()}`;
  }, [customer]);

  if (loading && !data) {
    return (
      <div className="crm-shell">
        <div className="crm-loading">
          <Loader2 className="crm-spin-icon" />
          <span>Đang tải hồ sơ khách hàng...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="crm-shell">
        <div className="crm-empty">
          <div>
            <h3>Không tải được hồ sơ khách hàng</h3>
            <p>{error}</p>
            <button type="button" className="crm-primary-button crm-empty-action" onClick={() => setReloadTick(t => t + 1)}>
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const initial = (customer?.customer_name || '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="crm-shell">
      <section className="crm-page-card crm-customers-page-shell">
        <Link href="/all-platform/crm/customers" className="crm-back-button crm-customer-detail-back">
          ← Hồ sơ khách hàng
        </Link>
        <div className="crm-header">
          <div className="crm-customer-detail-header">
            <span className="crm-customer-avatar" aria-hidden="true">{initial}</span>
            <div className="crm-customer-detail-title">
              <h1>{customer?.customer_name || 'Khách hàng chưa tên'}</h1>
              <div className="crm-customer-detail-meta">
                <span>{[customer?.company_name, customer?.phone, customer?.email].filter(Boolean).join(' · ') || 'Chưa có thông tin liên hệ'}</span>
                {customer?.status ? (
                  <span className={`crm-customer-status-badge ${STATUS_BADGE_CLASS[customer.status] || ''}`}>
                    {STATUS_LABEL[customer.status] || customer.status}
                  </span>
                ) : null}
              </div>
              {error ? <p className="crm-error">{error}</p> : null}
            </div>
          </div>
          <div className="crm-header-actions">
            {canEdit ? (
              <button type="button" className="crm-secondary-button" onClick={() => setEditOpen(true)}>
                Sửa
              </button>
            ) : null}
            <Link href={dealLink} className="crm-primary-button">
              + Tạo deal mới
            </Link>
          </div>
        </div>

        <div className="crm-stat-grid">
          <div className="crm-stat-card"><p className="crm-stat-label">Deal</p><p className="crm-stat-value">{data?.kpi?.deal_count || 0}</p></div>
          <div className="crm-stat-card"><p className="crm-stat-label">Báo giá</p><p className="crm-stat-value">{data?.kpi?.quote_count || 0}</p></div>
          <div className="crm-stat-card"><p className="crm-stat-label">Hợp đồng</p><p className="crm-stat-value">{data?.kpi?.contract_count || 0}</p></div>
          <div className="crm-stat-card"><p className="crm-stat-label">Giá trị</p><p className="crm-stat-value">{formatVND(data?.kpi?.total_value || 0) || '0 đ'}</p></div>
        </div>

        {customer ? (
          <section className="crm-detail-info-grid">
            {customer.position ? <InfoItem label="Chức vụ" value={customer.position} /> : null}
            {customer.address ? <InfoItem label="Địa chỉ" value={customer.address} /> : null}
            {customer.city ? <InfoItem label="Thành phố" value={customer.city} /> : null}
            {customer.industry ? <InfoItem label="Lĩnh vực" value={customer.industry} /> : null}
            {customer.source ? <InfoItem label="Nguồn" value={customer.source} /> : null}
            {customer.zalo ? <InfoItem label="Zalo" value={customer.zalo} /> : null}
            {customer.facebook ? <InfoItem label="Facebook" value={customer.facebook} /> : null}
            {customer.telegram ? <InfoItem label="Telegram" value={customer.telegram} /> : null}
            {customer.website ? <InfoItem label="Website" value={customer.website} /> : null}
            {customer.tax_code ? <InfoItem label="Mã số thuế" value={customer.tax_code} /> : null}
            {customer.note ? <InfoItem label="Ghi chú" value={customer.note} full /> : null}
          </section>
        ) : null}

        {customer ? <CrmContactsPanel customerId={customer.id} canEdit={canEdit} /> : null}

        <section className="crm-content-section">
          <div className="crm-segment crm-customer-tabs">
            <button type="button" className={`crm-segment-button ${tab === 'deals' ? 'crm-segment-button--active' : ''}`} onClick={() => setTab('deals')}>
              Deal ({data?.deals?.length || 0})
            </button>
            <button type="button" className={`crm-segment-button ${tab === 'quotes' ? 'crm-segment-button--active' : ''}`} onClick={() => setTab('quotes')}>
              Báo giá ({data?.quotes?.length || 0})
            </button>
            <button type="button" className={`crm-segment-button ${tab === 'contracts' ? 'crm-segment-button--active' : ''}`} onClick={() => setTab('contracts')}>
              Hợp đồng ({data?.contracts?.length || 0})
            </button>
          </div>

          <div className="crm-table-card">
            <div className="crm-table-scroll">
              {tab === 'deals' ? (
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th className="crm-th">Deal</th>
                      <th className="crm-th">Giai đoạn</th>
                      <th className="crm-th crm-th--right">Giá trị</th>
                      <th className="crm-th">Cập nhật</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={4} className="crm-empty-cell">Đang tải...</td></tr>
                    ) : data?.deals?.length ? (
                      data.deals.map(deal => (
                        <tr key={deal.id} className="crm-row">
                          <td className="crm-td">{deal.customer_name || deal.id}</td>
                          <td className="crm-td">
                            {(() => {
                              const meta = getStageMeta((deal.deal_stage as DealStage) || 'new_lead');
                              return (
                                <span className={`crm-stage-badge ${meta.badgeClass}`}>{meta.label}</span>
                              );
                            })()}
                          </td>
                          <td className="crm-td crm-td--right crm-budget">{formatVND(Number(deal.estimated_budget || deal.lifetime_value || 0)) || '0 đ'}</td>
                          <td className="crm-td crm-muted">{deal.updated_at ? new Date(deal.updated_at).toLocaleDateString('vi-VN') : '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="crm-empty-cell">Chưa có deal liên quan.</td></tr>
                    )}
                  </tbody>
                </table>
              ) : null}

              {tab === 'quotes' ? (
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th className="crm-th">Số báo giá</th>
                      <th className="crm-th">Trạng thái</th>
                      <th className="crm-th crm-th--right">Tổng tiền</th>
                      <th className="crm-th crm-th--right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={4} className="crm-empty-cell">Đang tải...</td></tr>
                    ) : data?.quotes?.length ? (
                      data.quotes.map(quote => (
                        <tr key={quote.id} className="crm-row">
                          <td className="crm-td">{quote.quote_number || quote.id}</td>
                          <td className="crm-td"><span className="crm-source-badge">{quote.status || '-'}</span></td>
                          <td className="crm-td crm-td--right crm-budget">{formatVND(Number(quote.total_amount || 0)) || '0 đ'}</td>
                          <td className="crm-td crm-td--right">
                            <Link className="crm-row-action" href={`/all-platform/quotes/${quote.id}`}>Xem</Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="crm-empty-cell">Chưa có báo giá liên quan.</td></tr>
                    )}
                  </tbody>
                </table>
              ) : null}

              {tab === 'contracts' ? (
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th className="crm-th">Số hợp đồng</th>
                      <th className="crm-th">Trạng thái</th>
                      <th className="crm-th crm-th--right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={3} className="crm-empty-cell">Đang tải...</td></tr>
                    ) : data?.contracts?.length ? (
                      data.contracts.map(contract => (
                        <tr key={contract.id} className="crm-row">
                          <td className="crm-td">{contract.contract_number || contract.id}</td>
                          <td className="crm-td"><span className="crm-source-badge">{contract.status || '-'}</span></td>
                          <td className="crm-td crm-td--right">
                            <Link className="crm-row-action" href={`/all-platform/contracts/${contract.id}`}>Xem</Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={3} className="crm-empty-cell">Chưa có hợp đồng liên quan.</td></tr>
                    )}
                  </tbody>
                </table>
              ) : null}
            </div>
          </div>
        </section>
      </section>

      <CustomerFormModal
        open={editOpen}
        customer={customerRow}
        currentUser={user}
        onClose={() => setEditOpen(false)}
        onSaved={() => { setEditOpen(false); setReloadTick(t => t + 1); }}
      />
    </div>
  );
}

function InfoItem({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={`crm-detail-info-item ${full ? 'crm-detail-info-item--full' : ''}`}>
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}
