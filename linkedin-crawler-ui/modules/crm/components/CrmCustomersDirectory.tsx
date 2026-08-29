'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, API_KEY } from '@/lib/env';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { useMembers } from '@/hooks/useMembers';
import { formatVND } from '../constants/crmConfig';
import { SOURCE_OPTIONS } from '../constants/crmConfig';
import { CustomerFormModal } from './CustomerFormModal';
import { ActionMenu } from './ActionMenu';
import { Eye, Loader2, Plus, RotateCcw } from './icons';
import type { CrmCustomerKpi, CrmCustomerRow } from '../types';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'new_lead', label: 'Lead mới' },
  { value: 'following', label: 'Đang chăm sóc' },
  { value: 'current_customer', label: 'Khách hàng hiện tại' },
  { value: 'not_fit', label: 'Không phù hợp' },
];

const STATUS_LABEL: Record<string, string> = {
  new_lead: 'Lead mới',
  following: 'Đang chăm sóc',
  current_customer: 'Khách hàng',
  not_fit: 'Không phù hợp',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  new_lead: 'crm-customer-status--new',
  following: 'crm-customer-status--following',
  current_customer: 'crm-customer-status--current',
  not_fit: 'crm-customer-status--not-fit',
};

const PAGE_SIZE = 20;

type ApiCustomerRow = {
  id: string;
  customer_name?: string | null;
  company_name?: string | null;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  source?: string | null;
  status?: CrmCustomerRow['status'] | null;
  owner_id?: string | null;
  can_edit?: boolean | null;
  deal_count?: number | null;
  total_value?: number | string | null;
  last_deal_at?: string | null;
  updated_at?: string | null;
};

type ApiListResponse = {
  items?: ApiCustomerRow[];
  total?: number;
  page?: number;
  page_size?: number;
  // Backend trả đúng {total, new_lead, following, current_customer, not_fit} —
  // KHÔNG phải total_customers/current_customers/new_leads như bản cũ đã đoán
  // sai (bug key mismatch khiến 4 thẻ KPI luôn hiện 0).
  kpi?: Partial<CrmCustomerKpi>;
};

function headers() {
  const value: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) value['X-API-Key'] = API_KEY;
  return value;
}

function mapCustomer(row: ApiCustomerRow): CrmCustomerRow {
  return {
    id: row.id,
    customerName: row.customer_name || 'Khách hàng chưa tên',
    companyName: row.company_name || '',
    position: row.position || '',
    phone: row.phone || '',
    email: row.email || '',
    source: row.source || '',
    status: row.status || undefined,
    ownerId: row.owner_id || '',
    canEdit: Boolean(row.can_edit),
    dealCount: Number(row.deal_count || 0),
    totalValue: Number(row.total_value || 0),
    lastDealAt: row.last_deal_at || '',
    updatedAt: row.updated_at || '',
  };
}

function buildDealLink(customer: CrmCustomerRow) {
  const params = new URLSearchParams({
    openDeal: 'new',
    customerId: customer.id,
    customerName: customer.customerName || '',
  });
  if (customer.companyName) params.set('companyName', customer.companyName);
  if (customer.phone) params.set('phone', customer.phone);
  if (customer.email) params.set('email', customer.email);
  return `/all-platform/crm?${params.toString()}`;
}

export function CrmCustomersDirectory() {
  const router = useRouter();
  const { user } = useAppAuth();
  const { members } = useMembers();
  const [items, setItems] = useState<CrmCustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [kpi, setKpi] = useState<CrmCustomerKpi>({ total: 0, new_lead: 0, following: 0, current_customer: 0, not_fit: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CrmCustomerRow | null>(null);

  // Debounce ô tìm kiếm ~300ms — tránh gọi API mỗi lần gõ phím.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [status, source, ownerId]);

  const load = useCallback(() => {
    let alive = true;
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (source) params.set('source', source);
    if (ownerId) params.set('owner_id', ownerId);
    setLoading(true);
    fetch(`${API_BASE_URL}/api/all-platform/crm/customers?${params.toString()}`, {
      credentials: 'include',
      headers: headers(),
    })
      .then(async res => {
        const body = await res.json();
        if (!res.ok || body.success === false) throw new Error(body.message || 'Không tải được hồ sơ khách hàng.');
        return body.data as ApiListResponse;
      })
      .then(data => {
        if (!alive) return;
        setItems((data.items || []).map(mapCustomer));
        setTotal(data.total || 0);
        setKpi({
          total: data.kpi?.total ?? 0,
          new_lead: data.kpi?.new_lead ?? 0,
          following: data.kpi?.following ?? 0,
          current_customer: data.kpi?.current_customer ?? 0,
          not_fit: data.kpi?.not_fit ?? 0,
        });
        setError('');
      })
      .catch(err => {
        if (!alive) return;
        setItems([]);
        setError(err instanceof Error ? err.message : 'Không tải được hồ sơ khách hàng.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [page, search, status, source, ownerId]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load, reloadTick]);

  const ownerName = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach(m => {
      const key = m.linked_user_id || m.linked_user_id_2;
      if (key) map.set(key, m.display_name);
    });
    if (user?.id && !map.has(user.id)) map.set(user.id, user.name || user.email);
    return map;
  }, [members, user]);

  const ownerFilterOptions = useMemo(() => {
    const seen = new Map<string, string>();
    members.forEach(m => {
      const key = m.linked_user_id || m.linked_user_id_2;
      if (key) seen.set(key, m.display_name);
    });
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [members]);

  const kpiCards = [
    { label: 'Tổng hồ sơ', value: kpi.total, tone: 'total' },
    { label: 'Khách hàng hiện tại', value: kpi.current_customer, tone: 'won' },
    { label: 'Đang chăm sóc', value: kpi.following, tone: 'open' },
    { label: 'Lead mới', value: kpi.new_lead, tone: 'won-value' },
    { label: 'Không phù hợp', value: kpi.not_fit, tone: 'total' },
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(search || status || source || ownerId);

  function resetFilters() {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setSource('');
    setOwnerId('');
    setPage(1);
  }

  function handleSaved() {
    setFormOpen(false);
    setEditingCustomer(null);
    setReloadTick(tick => tick + 1);
  }

  return (
    <div className="crm-shell">
      <section className="crm-page-card crm-customers-page-shell">
        {error ? <p className="crm-error">{error}</p> : null}

        <div className="crm-stat-grid crm-stat-grid--5">
          {kpiCards.map(card => (
            <div key={card.label} className={`crm-stat-card crm-stat-card--${card.tone}`}>
              <p className="crm-stat-label">{card.label}</p>
              <p className="crm-stat-value">{card.value}</p>
            </div>
          ))}
        </div>

        <section className="crm-filter-card">
          <div className="crm-filter-grid crm-filter-grid--customers">
            <input
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              className="crm-input"
              placeholder="Tìm tên, công ty, SĐT, email..."
              autoComplete="off"
            />
            <select className="crm-input" value={status} onChange={event => setStatus(event.target.value)}>
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select className="crm-input" value={source} onChange={event => setSource(event.target.value)}>
              <option value="">Tất cả nguồn</option>
              {SOURCE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select className="crm-input" value={ownerId} onChange={event => setOwnerId(event.target.value)}>
              <option value="">Tất cả người phụ trách</option>
              {ownerFilterOptions.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <div className="crm-icon-action-group" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
              {hasFilters ? (
                <button type="button" className="crm-secondary-button crm-filter-reset" onClick={resetFilters}>
                  <RotateCcw className="crm-button-icon" /> Xóa lọc
                </button>
              ) : null}
              <button type="button" className="crm-primary-button" onClick={() => { setEditingCustomer(null); setFormOpen(true); }}>
                <Plus className="crm-button-icon" /> Thêm khách hàng
              </button>
            </div>
          </div>
        </section>

        <section className="crm-content-section">
          <div className="crm-table-card crm-customer-table-card--desktop">
            <div className="crm-table-scroll">
              <table className="crm-table crm-customer-directory-table">
                <colgroup>
                  <col className="crm-col-cust-name" />
                  <col className="crm-col-cust-contact" />
                  <col className="crm-col-cust-source" />
                  <col className="crm-col-cust-status" />
                  <col className="crm-col-cust-owner" />
                  <col className="crm-col-cust-deals" />
                  <col className="crm-col-cust-value" />
                  <col className="crm-col-cust-lastdeal" />
                  <col className="crm-col-cust-updated" />
                  <col className="crm-col-cust-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="crm-th">Khách hàng</th>
                    <th className="crm-th">Liên hệ</th>
                    <th className="crm-th">Nguồn</th>
                    <th className="crm-th">Trạng thái</th>
                    <th className="crm-th">Phụ trách</th>
                    <th className="crm-th crm-th--right">Deal</th>
                    <th className="crm-th crm-th--right">Tổng giá trị</th>
                    <th className="crm-th">Gần nhất</th>
                    <th className="crm-th">Cập nhật</th>
                    <th className="crm-th crm-th--right crm-th--actions-col">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} className="crm-empty-cell"><Loader2 className="crm-spin-icon" /> Đang tải...</td></tr>
                  ) : items.length ? (
                    items.map(customer => (
                      <tr key={customer.id} className="crm-row">
                        <td className="crm-td">
                          <Link
                            href={`/all-platform/crm/customers/${customer.id}`}
                            className="crm-customer-name-link"
                            title={customer.customerName}
                          >
                            {customer.customerName}
                          </Link>
                          <div className="crm-customer-company" title={customer.companyName || 'Chưa có công ty'}>
                            {customer.companyName || 'Chưa có công ty'}
                          </div>
                        </td>
                        <td className="crm-td crm-contact-cell">
                          {customer.phone ? (
                            <a className="crm-contact-link" href={`tel:${customer.phone.replace(/[^\d+]/g, '')}`}>{customer.phone}</a>
                          ) : <div className="crm-small">-</div>}
                          {customer.email ? (
                            <a className="crm-contact-link crm-muted crm-truncate" title={customer.email} href={`mailto:${customer.email}`}>{customer.email}</a>
                          ) : <div className="crm-muted crm-truncate">-</div>}
                        </td>
                        <td className="crm-td"><span className="crm-source-badge">{customer.source || 'Manual'}</span></td>
                        <td className="crm-td">
                          <span className={`crm-customer-status-badge ${STATUS_BADGE_CLASS[customer.status || ''] || ''}`}>
                            {STATUS_LABEL[customer.status || ''] || 'Chưa phân loại'}
                          </span>
                        </td>
                        <td className="crm-td crm-small">{ownerName.get(customer.ownerId || '') || 'Chưa gán'}</td>
                        <td className="crm-td crm-td--right">{customer.dealCount || 0}</td>
                        <td className="crm-td crm-td--right crm-budget">{formatVND(customer.totalValue || 0) || '0 đ'}</td>
                        <td className="crm-td crm-muted crm-td--nowrap">{customer.lastDealAt ? new Date(customer.lastDealAt).toLocaleDateString('vi-VN') : '-'}</td>
                        <td className="crm-td crm-muted crm-td--nowrap">{customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString('vi-VN') : '-'}</td>
                        <td className="crm-td crm-td--actions-col">
                          <div className="crm-row-actions">
                            <Link
                              href={`/all-platform/crm/customers/${customer.id}`}
                              className="crm-row-action-primary crm-row-action-icon"
                              title="Xem hồ sơ khách hàng"
                              aria-label="Xem"
                            >
                              <Eye className="crm-inline-icon" />
                            </Link>
                            <ActionMenu
                              label="Thao tác khác"
                              items={[
                                ...(customer.canEdit
                                  ? [{ key: 'edit', label: 'Sửa', onSelect: () => { setEditingCustomer(customer); setFormOpen(true); } }]
                                  : []),
                                { key: 'deal', label: 'Tạo deal', onSelect: () => router.push(buildDealLink(customer)) },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10}>
                        <div className="crm-empty-state">
                          <span className="crm-empty-state-icon">
                            <Plus className="crm-button-icon" />
                          </span>
                          <p className="crm-empty-state-title">
                            {hasFilters ? 'Không có hồ sơ phù hợp với bộ lọc' : 'Chưa có khách hàng'}
                          </p>
                          <p className="crm-empty-state-desc">
                            {hasFilters
                              ? 'Thử đổi từ khóa tìm kiếm hoặc bấm "Xóa lọc" để xem lại toàn bộ danh sách.'
                              : 'Bắt đầu bằng cách thêm hồ sơ khách hàng đầu tiên vào CRM.'}
                          </p>
                          {hasFilters ? (
                            <button type="button" className="crm-secondary-button" onClick={resetFilters}>
                              <RotateCcw className="crm-button-icon" /> Xóa lọc
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="crm-primary-button"
                              onClick={() => { setEditingCustomer(null); setFormOpen(true); }}
                            >
                              <Plus className="crm-button-icon" /> Thêm khách hàng đầu tiên
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bang desktop 10 cot khong dung duoc o man hep - table-layout:fixed
           * ep het chu xuong tung ky tu, khong doc noi (bug thuc te thay qua
           * anh chup 375/768px). Thay bang danh sach card rieng, chi hien o
           * man hep qua CSS (xem .crm-customer-card-list). */}
          <div className="crm-customer-card-list">
            {loading ? (
              <div className="crm-empty-cell"><Loader2 className="crm-spin-icon" /> Đang tải...</div>
            ) : items.length ? (
              items.map(customer => (
                <div key={customer.id} className="crm-customer-card">
                  <div className="crm-customer-card-head">
                    <div className="crm-customer-card-identity">
                      <Link
                        href={`/all-platform/crm/customers/${customer.id}`}
                        className="crm-customer-name-link"
                        title={customer.customerName}
                      >
                        {customer.customerName}
                      </Link>
                      <div className="crm-customer-company" title={customer.companyName || 'Chưa có công ty'}>
                        {customer.companyName || 'Chưa có công ty'}
                      </div>
                    </div>
                    <span className={`crm-customer-status-badge ${STATUS_BADGE_CLASS[customer.status || ''] || ''}`}>
                      {STATUS_LABEL[customer.status || ''] || 'Chưa phân loại'}
                    </span>
                  </div>
                  <div className="crm-customer-card-contact">
                    {customer.phone ? (
                      <a className="crm-contact-link" href={`tel:${customer.phone.replace(/[^\d+]/g, '')}`}>{customer.phone}</a>
                    ) : null}
                    {customer.email ? (
                      <a className="crm-contact-link crm-muted crm-truncate" title={customer.email} href={`mailto:${customer.email}`}>{customer.email}</a>
                    ) : null}
                  </div>
                  <div className="crm-customer-card-meta">
                    <span className="crm-source-badge">{customer.source || 'Manual'}</span>
                    <span className="crm-small">{ownerName.get(customer.ownerId || '') || 'Chưa gán'}</span>
                  </div>
                  <div className="crm-customer-card-metrics">
                    <span>{customer.dealCount || 0} deal</span>
                    <span className="crm-budget">{formatVND(customer.totalValue || 0) || '0 đ'}</span>
                  </div>
                  <div className="crm-customer-card-actions">
                    <Link href={`/all-platform/crm/customers/${customer.id}`} className="crm-row-action-primary">Xem</Link>
                    <ActionMenu
                      label="Thao tác khác"
                      items={[
                        ...(customer.canEdit
                          ? [{ key: 'edit', label: 'Sửa', onSelect: () => { setEditingCustomer(customer); setFormOpen(true); } }]
                          : []),
                        { key: 'deal', label: 'Tạo deal', onSelect: () => router.push(buildDealLink(customer)) },
                      ]}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="crm-empty-state">
                <span className="crm-empty-state-icon">
                  <Plus className="crm-button-icon" />
                </span>
                <p className="crm-empty-state-title">
                  {hasFilters ? 'Không có hồ sơ phù hợp với bộ lọc' : 'Chưa có khách hàng'}
                </p>
                <p className="crm-empty-state-desc">
                  {hasFilters
                    ? 'Thử đổi từ khóa tìm kiếm hoặc bấm "Xóa lọc" để xem lại toàn bộ danh sách.'
                    : 'Bắt đầu bằng cách thêm hồ sơ khách hàng đầu tiên vào CRM.'}
                </p>
                {hasFilters ? (
                  <button type="button" className="crm-secondary-button" onClick={resetFilters}>
                    <RotateCcw className="crm-button-icon" /> Xóa lọc
                  </button>
                ) : (
                  <button
                    type="button"
                    className="crm-primary-button"
                    onClick={() => { setEditingCustomer(null); setFormOpen(true); }}
                  >
                    <Plus className="crm-button-icon" /> Thêm khách hàng đầu tiên
                  </button>
                )}
              </div>
            )}
          </div>

          {total > 0 ? (
            <div className="crm-pagination">
              <span className="crm-pagination-info">
                Trang {page}/{totalPages} · {total} hồ sơ
              </span>
              <div className="crm-pagination-actions">
                <button type="button" className="crm-secondary-button" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  Trước
                </button>
                <button type="button" className="crm-secondary-button" disabled={page >= totalPages || loading} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                  Sau
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </section>

      <CustomerFormModal
        open={formOpen}
        customer={editingCustomer}
        currentUser={user}
        onClose={() => { setFormOpen(false); setEditingCustomer(null); }}
        onSaved={handleSaved}
      />
    </div>
  );
}
