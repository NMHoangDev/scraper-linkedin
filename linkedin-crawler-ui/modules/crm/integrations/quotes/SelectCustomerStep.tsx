'use client';

import { useMemo, useState } from 'react';
import { dealFormFromDeal, emptyDealForm } from '../../components/DealFormFields';
import type { DealFormState } from '../../components/DealFormFields';
import type { Deal, DealStage } from '../../types';

const OPEN_STAGES: DealStage[] = ['new_lead', 'contacted', 'qualified', 'requirement', 'proposal_sent', 'negotiation', 'contract_sent', 'on_hold'];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

/** Deal trùng khách (theo SĐT hoặc email) với thông tin khách đang chọn — dùng để
 * gợi ý danh sách deal cho ô "Gắn vào Deal (nếu có)". */
function findDealsForCustomer(deals: Deal[], customer: DealFormState): Deal[] {
  const phone = normalize(customer.phone);
  const email = normalize(customer.email);
  if (!phone && !email) return [];
  return deals.filter(deal => {
    if (!OPEN_STAGES.includes(deal.stage)) return false;
    const dealPhone = normalize(deal.phone || '');
    const dealEmail = normalize(deal.email || '');
    return (phone && dealPhone === phone) || (email && dealEmail === email);
  });
}

export function SelectCustomerStep({
  deals,
  customer,
  linkedDealId,
  onChangeCustomer,
  onChangeLinkedDeal,
  /** Mở từ "Tạo báo giá cho deal này" — khách hàng + deal đã cố định theo đúng
   * deal đó, không cho tìm/đổi sang khách khác hay gỡ deal ra nữa. */
  lockedDeal,
}: {
  deals: Deal[];
  customer: DealFormState;
  linkedDealId: string;
  onChangeCustomer: (next: DealFormState) => void;
  onChangeLinkedDeal: (dealId: string) => void;
  lockedDeal?: Deal | null;
}) {
  const [search, setSearch] = useState('');
  const [pickedExisting, setPickedExisting] = useState(false);

  const searchResults = useMemo(() => {
    const q = normalize(search);
    if (!q) return [];
    return deals
      .filter(deal =>
        [deal.customerName, deal.companyName, deal.phone, deal.email].some(value => normalize(String(value || '')).includes(q))
      )
      .slice(0, 8);
  }, [deals, search]);

  const candidateDeals = useMemo(() => findDealsForCustomer(deals, customer), [deals, customer]);

  function pickExistingCustomer(deal: Deal) {
    onChangeCustomer(dealFormFromDeal(deal));
    // Kết quả tìm kiếm vốn dĩ đã là 1 deal cụ thể (không có bảng khách hàng
    // riêng) — chọn xong thì gắn thẳng vào đúng deal đó luôn, không bắt thêm
    // bước "Gắn vào Deal" nữa, trừ khi deal đó đã đóng (won/lost) thì để trống
    // cho ô "Gắn vào Deal" bên dưới xử lý.
    onChangeLinkedDeal(OPEN_STAGES.includes(deal.stage) ? deal.id : '');
    setPickedExisting(true);
    setSearch('');
  }

  function startNewCustomer() {
    onChangeCustomer(emptyDealForm());
    onChangeLinkedDeal('');
    setPickedExisting(false);
    setSearch('');
  }

  const hasCustomer = Boolean(customer.customerName.trim() || customer.phone.trim() || customer.email.trim());

  return (
    <section className="crm-wizard-form-section">
      <div className="crm-wizard-section-head">
        <div>
          <h3 className="crm-wizard-form-title">Khách hàng</h3>
          <p className="crm-wizard-form-description">Chọn khách hàng đã có trên hệ thống hoặc thêm khách mới.</p>
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
                        </span>
                      </button>
                    ))
                  )}
                  <button type="button" className="crm-quote-customer-option crm-quote-customer-option--new" onClick={startNewCustomer}>
                    + Thêm khách hàng mới
                  </button>
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
      </div>

      {lockedDeal ? null : (
        <label className="crm-field" style={{ marginTop: '0.85rem' }}>
          <span>Gắn vào Deal (nếu có)</span>
          <select
            disabled={!hasCustomer || candidateDeals.length === 0}
            value={linkedDealId}
            onChange={event => onChangeLinkedDeal(event.target.value)}
          >
            <option value="">-- Không gắn vào deal nào --</option>
            {candidateDeals.map(deal => (
              <option key={deal.id} value={deal.id}>
                {deal.customerName} {deal.position ? `- ${deal.position}` : ''} ({deal.stage})
              </option>
            ))}
          </select>
          <p className="crm-help-text">
            {hasCustomer && candidateDeals.length === 0
              ? 'Chưa có deal mở nào của khách này — báo giá vẫn tạo được bình thường, không gắn deal cũng không sao.'
              : 'Chọn deal đang mở của khách này nếu muốn báo giá gắn thẳng vào deal đó.'}
          </p>
        </label>
      )}
    </section>
  );
}
