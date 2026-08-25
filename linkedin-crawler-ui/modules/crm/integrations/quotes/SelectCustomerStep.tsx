'use client';

import { useMemo, useState } from 'react';
import { dealFormFromDeal, emptyDealForm } from '../../components/DealFormFields';
import type { DealFormState } from '../../components/DealFormFields';
import type { CrmUserOption, Deal } from '../../types';
import type { Quote } from '@/modules/quotes';

function normalize(value: string) {
  return value.trim().toLowerCase();
}

/** Khoá gộp khách hàng dùng chung cho search step 1 lẫn thống kê lịch sử báo
 * giá — ưu tiên contactId (định danh CRM thật) > email > SĐT > cuối cùng mới
 * ghép tên + công ty (dễ trùng nếu 2 khách khác nhau cùng tên, chỉ dùng khi
 * không còn dữ liệu định danh nào khác). */
export function customerDedupeKey(deal: Deal): string {
  if (deal.contactId) return `contact:${deal.contactId}`;
  const email = normalize(deal.email || '');
  if (email) return `email:${email}`;
  const phone = normalize(deal.phone || '');
  if (phone) return `phone:${phone}`;
  return `name:${normalize(deal.customerName)}|${normalize(deal.companyName || '')}`;
}

/** 1 khách có thể đứng tên nhiều deal (mỗi lần tạo báo giá độc lập lại ra 1 deal
 * mới) — không có bảng khách hàng riêng nên phải tự gộp lại theo customerDedupeKey,
 * không thì search ra cùng 1 khách lặp lại N lần (N = số deal của khách đó). */
function dedupeByCustomer(matches: Deal[]): Array<Deal & { dealCount: number }> {
  const byKey = new Map<string, Deal & { dealCount: number }>();
  for (const deal of matches) {
    const key = customerDedupeKey(deal);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...deal, dealCount: 1 });
    } else {
      existing.dealCount += 1;
    }
  }
  return [...byKey.values()];
}

export function SelectCustomerStep({
  deals,
  customer,
  onChangeCustomer,
  /** Mở từ "Tạo báo giá cho deal này" — khách hàng + deal đã cố định theo đúng
   * deal đó, không cho tìm/đổi sang khách khác hay gỡ deal ra nữa. */
  lockedDeal,
  /** Tất cả báo giá thật (để tính thống kê lịch sử theo khách hàng) — optional,
   * không truyền thì ẩn hẳn khối thống kê thay vì hiện số 0 giả. */
  quotes,
  /** Danh sách Sale để chọn "Sale phụ trách" khi tạo khách mới. */
  agents,
}: {
  deals: Deal[];
  customer: DealFormState;
  onChangeCustomer: (next: DealFormState) => void;
  lockedDeal?: Deal | null;
  quotes?: Quote[];
  agents?: CrmUserOption[];
}) {
  const [search, setSearch] = useState('');
  const [pickedDeal, setPickedDeal] = useState<Deal | null>(null);
  const pickedExisting = Boolean(pickedDeal);
  const referenceDeal = lockedDeal || pickedDeal;

  const searchResults = useMemo(() => {
    const q = normalize(search);
    if (!q) return [];
    const matches = deals.filter(deal =>
      [deal.customerName, deal.companyName, deal.phone, deal.email].some(value => normalize(String(value || '')).includes(q))
    );
    return dedupeByCustomer(matches).slice(0, 8);
  }, [deals, search]);

  // Thống kê lịch sử báo giá của khách này — gộp TẤT CẢ deal cùng khoá với
  // referenceDeal (1 khách có thể đứng tên nhiều deal), không chỉ riêng deal
  // đang chọn.
  const customerStats = useMemo(() => {
    if (!referenceDeal || !quotes) return null;
    const key = customerDedupeKey(referenceDeal);
    const sameCustomerDealIds = new Set(deals.filter(deal => customerDedupeKey(deal) === key).map(deal => deal.id));
    const relatedQuotes = quotes.filter(quote => quote.dealId && sameCustomerDealIds.has(quote.dealId));
    const won = relatedQuotes.filter(quote => {
      const deal = deals.find(item => item.id === quote.dealId);
      return deal?.stage === 'won' || deal?.crmStatus === 'won';
    });
    const totalValue = relatedQuotes.reduce((sum, quote) => sum + (quote.totalAmount || 0), 0);
    return {
      count: relatedQuotes.length,
      totalValue,
      wonCount: won.length,
      conversionRate: relatedQuotes.length ? Math.round((won.length / relatedQuotes.length) * 1000) / 10 : 0,
    };
  }, [referenceDeal, quotes, deals]);

  function pickExistingCustomer(deal: Deal) {
    // Chỉ lấy lại THÔNG TIN khách (tên/SĐT/email/công ty...) để đỡ gõ tay lại
    // — KHÔNG gắn báo giá mới vào deal cũ đó. Deal cũ có thể đã ở giai đoạn
    // khác, đã có báo giá riêng, gắn đại vào sẽ ghi đè/gây nhầm lẫn dữ liệu
    // deal cũ. Báo giá mới luôn ra 1 deal mới riêng (tự tạo ở bước submit).
    onChangeCustomer(dealFormFromDeal(deal));
    setPickedDeal(deal);
    setSearch('');
  }

  function startNewCustomer() {
    onChangeCustomer(emptyDealForm());
    setPickedDeal(null);
    setSearch('');
  }

  const hasCustomer = Boolean(customer.customerName.trim() || customer.phone.trim() || customer.email.trim());

  return (
    <section className="crm-wizard-form-section">
      <div className="crm-wizard-section-head">
        <div>
          <h3 className="crm-wizard-form-title">Khách hàng</h3>
          <p className="crm-wizard-form-description">Chọn khách hàng đã có trên hệ thống.</p>
        </div>
      </div>

      {lockedDeal ? (
        <div className="crm-quote-customer-picked">
          <div>
            <b>{lockedDeal.customerName}</b>
            {lockedDeal.companyName ? <span> · {lockedDeal.companyName}</span> : null}
            <span className="crm-quote-customer-tag">Gắn với deal này</span>
          </div>
        </div>
      ) : (
        <>
          {!hasCustomer || !pickedExisting ? (
            <div className="crm-quote-customer-search">
              <input
                className="crm-input"
                placeholder="Tìm theo tên, SĐT, email, công ty..."
                value={search}
                onChange={event => setSearch(event.target.value)}
                autoComplete="off"
              />
              {search.trim() ? (
                <div className="crm-quote-customer-results">
                  {searchResults.length === 0 ? (
                    <div className="crm-quote-customer-empty">Không tìm thấy khách hàng nào khớp.</div>
                  ) : (
                    searchResults.map(deal => (
                      <button type="button" key={deal.id} className="crm-quote-customer-option" onClick={() => pickExistingCustomer(deal)}>
                        <span className="crm-quote-customer-tag">Đã có</span>
                        <span>
                          <b>{deal.customerName}</b>
                          {deal.companyName ? ` · ${deal.companyName}` : ''}
                          {deal.phone ? ` · ${deal.phone}` : ''}
                          {deal.dealCount > 1 ? ` · ${deal.dealCount} deal` : ''}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {hasCustomer ? (
            <div className="crm-quote-customer-picked">
              <div>
                <b>{customer.customerName || '(Chưa có tên)'}</b>
                {customer.companyName ? <span> · {customer.companyName}</span> : null}
                {pickedExisting ? <span className="crm-quote-customer-tag">Đã có</span> : <span className="crm-quote-customer-tag crm-quote-customer-tag--new">Khách mới</span>}
              </div>
              <button type="button" className="crm-secondary-inline" onClick={startNewCustomer}>
                Đổi khách khác
              </button>
            </div>
          ) : null}
        </>
      )}

      {referenceDeal ? (
        <div className="crm-quote-crm-linked">
          <span className="crm-quote-crm-linked-badge">✓ Đã liên kết CRM</span>
          {customerStats ? (
            <div className="crm-quote-crm-stats">
              <div>
                <span>Số báo giá</span>
                <strong>{customerStats.count}</strong>
              </div>
              <div>
                <span>Tổng giá trị</span>
                <strong>{formatVndShort(customerStats.totalValue)}</strong>
              </div>
              <div>
                <span>Đã chốt</span>
                <strong>{customerStats.wonCount}</strong>
              </div>
              <div>
                <span>Tỷ lệ chuyển đổi</span>
                <strong>{customerStats.conversionRate}%</strong>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="crm-wizard-form-card-grid" style={{ marginTop: '0.85rem' }}>
        <label className="crm-field">
          <span>Tên khách hàng *</span>
          <input value={customer.customerName} onChange={event => onChangeCustomer({ ...customer, customerName: event.target.value })} />
        </label>
        <label className="crm-field">
          <span>Công ty</span>
          <input value={customer.companyName} onChange={event => onChangeCustomer({ ...customer, companyName: event.target.value })} />
        </label>
        <label className="crm-field">
          <span>Số điện thoại</span>
          <input value={customer.phone} onChange={event => onChangeCustomer({ ...customer, phone: event.target.value })} />
        </label>
        <label className="crm-field">
          <span>Email</span>
          <input value={customer.email} onChange={event => onChangeCustomer({ ...customer, email: event.target.value })} />
        </label>
        <label className="crm-field crm-field--full">
          <span>Địa chỉ</span>
          <input value={customer.address} onChange={event => onChangeCustomer({ ...customer, address: event.target.value })} />
        </label>
        <label className="crm-field">
          <span>Sale phụ trách</span>
          {referenceDeal ? (
            <input value={referenceDeal.assignment.sdrName || referenceDeal.assignment.leadName || 'Chưa gán'} disabled readOnly />
          ) : (
            <select value={customer.sdrId} onChange={event => onChangeCustomer({ ...customer, sdrId: event.target.value })}>
              <option value="">-- Chưa chọn --</option>
              {(agents || []).map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          )}
        </label>
      </div>
    </section>
  );
}

function formatVndShort(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(
    value || 0
  );
}
