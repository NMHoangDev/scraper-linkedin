'use client';

import type {
  QuoteData,
  QuoteField,
  QuoteItem,
  QuoteSchema,
  VillaSolutionItem,
} from '../types';
import {
  calculateItemSubtotal,
  calculateItemTotal,
  calculateItemVat,
  formatVnd,
} from '../utils/quoteCalculations';

interface Totals {
  subtotalAmount: number;
  totalVatAmount: number;
  totalAmount: number;
}

interface Props {
  schemaSnapshot: QuoteSchema;
  quoteData?: QuoteData;
  quoteItems?: QuoteItem[];
  solutionItems?: VillaSolutionItem[];
  totals: Totals;
  mode?: 'preview' | 'detail' | 'public' | 'print';
}

function emptySchema(): QuoteSchema {
  return { version: 1, layoutType: 'cloudgate_standard_quote', sections: [] };
}

export function QuoteDocumentRenderer({
  schemaSnapshot,
  quoteData = {},
  quoteItems = [],
  solutionItems = [],
  totals,
  mode = 'preview',
}: Props) {
  const schema = schemaSnapshot || emptySchema();
  const layoutType = schema.layoutType || 'cloudgate_standard_quote';
  const sections = schema.sections || [];
  const findSection = (key: string) =>
    sections.find(section => section.key === key) || { key, title: '', fields: [] };
  const findField = (key: string): QuoteField =>
    sections
      .flatMap(section => section.fields || [])
      .flatMap(field => [field, ...(field.config?.columns || [])])
      .find(field => field.key === key) || {
      key,
      label: key,
      type: 'text',
      visible: true,
      editable: true,
    };
  const fieldValue = (key: string) => {
    const value = quoteData[key];
    if (value !== undefined && value !== null && value !== '') return value;
    return findField(key).defaultValue || '';
  };
  const visibleColumns =
    findField('quoteItems').config?.columns?.filter(column => column.visible !== false) || [];

  const renderCell = (item: QuoteItem, column: QuoteField) => {
    if (column.key === 'subtotal') return formatVnd(calculateItemSubtotal(item));
    if (column.key === 'vatAmount') return formatVnd(calculateItemVat(item));
    if (column.key === 'total') return formatVnd(calculateItemTotal(item));
    if (column.key === 'unitPrice') return formatVnd(item.unitPrice);
    const value = item[column.key] ?? item.description ?? '';
    return String(value || '');
  };

  const notes = String(fieldValue('notes') || '');
  const commitments = fieldValue('commitments');
  const commitmentRows = Array.isArray(commitments)
    ? commitments
    : String(commitments || '')
        .split('\n')
        .map(item => item.trim())
        .filter(Boolean);
  const activeSolutionItems =
    solutionItems.length > 0
      ? solutionItems
      : Array.isArray(quoteData.solutionItems)
        ? quoteData.solutionItems
        : [];

  if (layoutType === 'villa_solution_package') {
    const setupTotal = activeSolutionItems.reduce(
      (sum, item) => sum + Number(item.offerPrice || 0),
      0
    );
    const phaseOnePercent = Number(fieldValue('paymentPhaseOnePercent') || 0);
    const phaseTwoPercent = Number(fieldValue('paymentPhaseTwoPercent') || 0);
    return (
      <div className="quote-document-renderer" data-mode={mode}>
        <section className="quote-sheet villa-sheet">
          <header className="villa-header">
            <div className="villa-brand">{String(fieldValue('sellerBrandName') || 'MARKEE')}</div>
            <div className="villa-meta">
              <p>Ngày: {String(fieldValue('quoteDate') || '[Ngày]')}</p>
              <p>Số báo giá: {String(fieldValue('quoteNumber') || '[Số]')}</p>
            </div>
          </header>

          <section className="villa-hero">
            <p className="villa-to">Kính gửi: {String(fieldValue('customerRecipient') || '[Tên khách hàng]')}</p>
            <h1 className="villa-title">{String(fieldValue('quoteTitle'))}</h1>
            <p className="villa-subtitle">{String(fieldValue('quoteSubtitle'))}</p>
            <div className="villa-benefit">{String(fieldValue('quoteBenefitLine'))}</div>
          </section>

          <section className="villa-table-wrap">
            <table className="villa-table">
              <thead>
                <tr>
                  <th>Giải pháp</th>
                  <th>Mô tả</th>
                  <th>Giá gốc</th>
                  <th>Giá đề xuất</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {activeSolutionItems.map((item, index) => (
                  <tr key={`${item.name}-${index}`}>
                    <td>{item.name}</td>
                    <td>{item.description}</td>
                    <td className="villa-price-original">
                      <span>{formatVnd(item.originalPrice || 0)}</span>
                    </td>
                    <td className="villa-price-offer">
                      <strong>{formatVnd(item.offerPrice)}</strong>
                    </td>
                    <td>{item.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="villa-split">
            <section className="villa-commitments">
              <h3>Cam kết triển khai</h3>
              <ul className="villa-list">
                {commitmentRows.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </section>
            <section className="villa-totals">
              <h3>Tổng đầu tư</h3>
              <div className="villa-total-row">
                <span>Phí triển khai</span>
                <strong>{formatVnd(setupTotal || totals.totalAmount)}</strong>
              </div>
              <div className="villa-total-row">
                <span>Phí duy trì hàng tháng</span>
                <strong>{formatVnd(fieldValue('monthlyAmount'))}</strong>
              </div>
              <div className="villa-total-sub">
                Thanh toán đợt 1 ({phaseOnePercent}%):{' '}
                {formatVnd((setupTotal * phaseOnePercent) / 100)}
              </div>
              <div className="villa-total-sub">
                Thanh toán đợt 2 ({phaseTwoPercent}%):{' '}
                {formatVnd((setupTotal * phaseTwoPercent) / 100)}
              </div>
            </section>
          </div>

          <section className="villa-footer">
            <div className="villa-footer-col">
              <h4>Lộ trình</h4>
              <p>1. {String(fieldValue('implementationStepOne'))}</p>
              <p>2. {String(fieldValue('implementationStepTwo'))}</p>
            </div>
            <div className="villa-footer-col">
              <h4>Liên hệ</h4>
              <p>Zalo: {String(fieldValue('sellerZalo'))}</p>
              <p>Email: {String(fieldValue('sellerEmail'))}</p>
            </div>
            <div className="villa-footer-col">
              <h4>Hiệu lực</h4>
              <p>{String(fieldValue('offerExpiryText'))}</p>
              <strong>{String(fieldValue('offerExpiryDate') || '[Ngày]')}</strong>
            </div>
          </section>
        </section>
      </div>
    );
  }

  return (
    <div className="quote-document-renderer" data-mode={mode}>
      <section className="quote-sheet">
        <header className="sheet-company">
          <div>
            <h2>{String(fieldValue('sellerCompanyName') || '[Tên công ty]')}</h2>
            <p>{String(fieldValue('sellerAddress'))}</p>
            <p>
              {String(fieldValue('sellerPhone'))}
              {fieldValue('sellerEmail') ? ` · ${String(fieldValue('sellerEmail'))}` : ''}
              {fieldValue('sellerWebsite') ? ` · ${String(fieldValue('sellerWebsite'))}` : ''}
            </p>
          </div>
          <div className="sheet-company-stamp">CRM</div>
        </header>

        <section className="sheet-parties">
          <div>
            <h3>{findSection('customer').title || 'Thông tin khách hàng'}</h3>
            {findSection('customer')
              .fields.filter(field => field.visible !== false)
              .map(field => (
                <p key={field.key} className={!fieldValue(field.key) && mode === 'preview' ? 'placeholder' : ''}>
                  <strong>{field.label}:</strong>{' '}
                  {String(fieldValue(field.key) || `[${field.label}]`)}
                </p>
              ))}
          </div>
          <div>
            <h3>Người phụ trách</h3>
            <p><strong>{findField('sellerContactName').label}:</strong> {String(fieldValue('sellerContactName') || '[Người liên hệ]')}</p>
            <p><strong>{findField('sellerPhone').label}:</strong> {String(fieldValue('sellerPhone') || '[Số điện thoại]')}</p>
            <p><strong>{findField('sellerEmail').label}:</strong> {String(fieldValue('sellerEmail') || '[Email liên hệ]')}</p>
          </div>
        </section>

        <section className="sheet-title-block">
          <h1>{String(fieldValue('quoteTitle') || 'Bảng báo giá')}</h1>
          <div className="sheet-quote-meta">
            <span>{findField('customerCompanyName').label}: {String(fieldValue('customerCompanyName') || '[Tên khách hàng]')}</span>
            <span>{findField('quoteNumber').label}: {String(fieldValue('quoteNumber') || '[Số báo giá]')}</span>
            <span>{findField('quoteDate').label}: {String(fieldValue('quoteDate') || '[Ngày báo giá]')}</span>
          </div>
        </section>

        <section className="sheet-items">
          <h3>{findSection('quoteItems').title || 'Bảng dịch vụ'}</h3>
          <table className="sheet-items-table">
            <thead>
              <tr>
                {(visibleColumns.length ? visibleColumns : [
                  { key: 'serviceDescription', label: 'Tên dịch vụ', type: 'text' as const },
                  { key: 'unit', label: 'ĐVT', type: 'text' as const },
                  { key: 'quantity', label: 'SL', type: 'number' as const },
                  { key: 'unitPrice', label: 'Đơn giá', type: 'currency' as const },
                  { key: 'vatRate', label: 'VAT', type: 'number' as const },
                ]).map(column => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quoteItems.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(visibleColumns.length, 5)} className="empty-row">
                    Chưa có dòng dịch vụ.
                  </td>
                </tr>
              ) : (
                quoteItems.map((item, index) => (
                  <tr key={item.id || index}>
                    {(visibleColumns.length ? visibleColumns : [
                      { key: 'serviceDescription', label: 'Tên dịch vụ', type: 'text' as const },
                      { key: 'unit', label: 'ĐVT', type: 'text' as const },
                      { key: 'quantity', label: 'SL', type: 'number' as const },
                      { key: 'unitPrice', label: 'Đơn giá', type: 'currency' as const },
                      { key: 'vatRate', label: 'VAT', type: 'number' as const },
                    ]).map(column => (
                      <td key={column.key}>{renderCell(item, column)}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="sheet-total-block">
          <div className="sheet-total-row">
            <span>{findField('subtotalAmount').label || 'Tổng trước VAT'}</span>
            <strong>{formatVnd(totals.subtotalAmount)}</strong>
          </div>
          <div className="sheet-total-row">
            <span>{findField('totalVatAmount').label || 'VAT'}</span>
            <strong>{formatVnd(totals.totalVatAmount)}</strong>
          </div>
          <div className="sheet-total-row sheet-total-row--grand">
            <span>{findField('totalAmount').label || 'Tổng cộng'}</span>
            <strong>{formatVnd(totals.totalAmount)}</strong>
          </div>
        </section>

        {notes ? <section className="sheet-note">{notes}</section> : null}

        <footer className="sheet-signatures">
          <div>
            <strong>{findField('companyRepresentative').label || 'Đại diện công ty'}</strong>
            <span>{String(fieldValue('companyRepresentative'))}</span>
          </div>
          <div>
            <strong>{findField('customerRepresentative').label || 'Đại diện khách hàng'}</strong>
            <span>{String(fieldValue('customerRepresentative') || '[Đại diện khách hàng]')}</span>
          </div>
        </footer>
      </section>
    </div>
  );
}
