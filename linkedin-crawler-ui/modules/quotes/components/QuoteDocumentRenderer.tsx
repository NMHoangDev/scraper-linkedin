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
  /** Tiền giảm giá (đã tính sẵn = subtotalAmount * discountPercent / 100) - optional
   * để không phá các nơi gọi cũ (villa layout, quote đã lưu trước khi có tính năng
   * giảm giá) chưa truyền field này. */
  discountAmount?: number;
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

/** Ngày lưu dạng "YYYY-MM-DD" (hoặc ISO datetime) — hiện cho khách theo dd/mm/yyyy
 * quen thuộc thay vì để nguyên định dạng máy đọc được. Parse thủ công phần
 * YYYY-MM-DD thay vì qua `Date` để tránh lệch múi giờ (Date coi "YYYY-MM-DD" là UTC
 * midnight, đọc lại bằng getDate() theo giờ local có thể lùi/tới 1 ngày). */
function formatDateVN(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

function textValue(value: unknown): string {
  return String(value ?? '').trim();
}

function splitLines(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(item => textValue(item)).filter(Boolean);
  return textValue(value)
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
}

function cleanDocumentText(value: unknown): string {
  return textValue(value)
    .replace(/[✅⭐★☆✔✓☑️]/g, '')
    .replace(/^\s*\d+\.\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Dữ liệu cũ (trước khi có cột riêng cho "Tên dịch vụ") chỉ lưu 1 chuỗi
 * "• Tên ngắn — mô tả dài..." vào field description, không có serviceDescription
 * riêng. Tách theo dấu gạch ngang "—"/"–" đầu tiên (đúng quy ước đã dùng khi
 * soạn nội dung) để hiển thị đúng 2 cột thay vì Tên dịch vụ trống/lặp Mô tả. */
function splitLegacyServiceText(raw: unknown): { name: string; rest: string } {
  const text = textValue(raw).replace(/^"+|"+$/g, '').trim();
  const match = text.match(/^•?\s*([^—–]+?)\s*[—–]\s*([\s\S]+)$/);
  if (!match) return { name: '', rest: text };
  return { name: match[1].trim(), rest: match[2].trim() };
}

/** Mô tả nhiều gạch đầu dòng ("• Ý 1. • Ý 2. ...") đang bị dồn thành 1 đoạn
 * dính liền, khó đọc. Tách mỗi "•" thành 1 dòng riêng, bỏ dấu chấm cuối câu
 * thừa (đã có xuống dòng phân tách rồi, không cần chấm câu nữa). Không có
 * "•" thì giữ nguyên 1 dòng, chỉ bỏ dấu chấm cuối. */
function formatDescriptionLines(raw: unknown): string[] {
  const text = textValue(raw).replace(/^"+|"+$/g, '').trim();
  if (!text) return [];
  const parts = text.includes('•') ? text.split('•') : [text];
  return parts
    .map(part => part.trim().replace(/\.+\s*$/, ''))
    .filter(Boolean);
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

  const renderCell = (item: QuoteItem, column: QuoteField, index: number) => {
    if (column.type === 'auto-number' || column.key === 'order') return String(index + 1);
    if (column.key === 'subtotal') return formatVnd(calculateItemSubtotal(item));
    if (column.key === 'vatAmount') return formatVnd(calculateItemVat(item));
    if (column.key === 'total') return formatVnd(calculateItemTotal(item));
    if (column.key === 'unitPrice') return formatVnd(item.unitPrice);
    if (column.key === 'quantity') return String(item.quantity || '');
    if (column.key === 'vatRate') return item.vatRate ? `${item.vatRate}%` : '';
    // "Mô tả" luôn qua tách dòng theo "•" (kể cả du lieu moi da co serviceDescription
    // rieng) - phai xu ly TRUOC fallback chung ben duoi, khong thi item.description
    // (luon co gia tri) se bi return thang o do, khien nhanh tach dong o day
    // thanh dead code khong bao gio chay toi.
    if (column.key === 'description') {
      const raw = !item.serviceDescription ? splitLegacyServiceText(item.description).rest : item.description || '';
      const lines = formatDescriptionLines(raw);
      if (lines.length <= 1) return lines[0] || '';
      return (
        <>
          {lines.map((line, lineIndex) => (
            <div key={lineIndex} className="quote-desc-line">{line}</div>
          ))}
        </>
      );
    }
    let value = item[column.key];
    if (column.key === 'serviceDescription' && !value && ('name' in item) && item.name) {
      value = String(item.name);
    }
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
    // item.serviceDescription trống (du lieu cu) -> thu tach tu description
    // theo quy uoc "Ten — Mo ta" thay vi de trong/lap noi dung.
    if (column.key === 'serviceDescription' && item.description) {
      return splitLegacyServiceText(item.description).name;
    }
    return '';
  };

  const discountPercentValue = textValue(quoteData.discountPercent);
  // Trang chi tiết/public chỉ truyền subtotalAmount/totalVatAmount/totalAmount
  // đã LƯU (không kèm discountAmount) - tự suy ra từ % lưu trong quoteData để
  // không phải sửa từng nơi gọi. Nơi nào đã tính sẵn discountAmount (bước
  // preview khi đang điền/xem lại) thì ưu tiên dùng giá trị đó.
  const resolvedDiscountAmount =
    totals.discountAmount ??
    (discountPercentValue ? (totals.subtotalAmount * Number(discountPercentValue)) / 100 : 0);
  const notesValue = fieldValue('notes');
  const notesRows = splitLines(notesValue).map(cleanDocumentText).filter(Boolean);
  const commitments = fieldValue('commitments');
  const commitmentRows = splitLines(commitments).map(cleanDocumentText).filter(Boolean);
  const activeSolutionItems =
    solutionItems.length > 0
      ? solutionItems
      : Array.isArray(quoteData.solutionItems)
        ? quoteData.solutionItems
        : [];

  const solutionColumns = (
    findField('solutionItems').config?.columns?.filter(column => column.visible !== false) || []
  ) as QuoteField[];

  const renderSolutionCell = (item: VillaSolutionItem, column: QuoteField, index: number) => {
    if (column.type === 'auto-number') return String(index + 1);
    const value = (item as unknown as Record<string, unknown>)[column.key];
    if (column.type === 'currency') return formatVnd(Number(value || 0));
    return String(value ?? '');
  };

  const customerRows = findSection('customer')
    .fields.filter(field => field.visible !== false)
    .map(field => ({
      key: field.key,
      label: field.label,
      value: textValue(fieldValue(field.key)),
      placeholder: `[${field.label}]`,
    }));
  const validUntil = textValue(fieldValue('offerExpiryDate'))
    ? formatDateVN(fieldValue('offerExpiryDate'))
    : textValue(fieldValue('validityDays'))
      ? `${textValue(fieldValue('validityDays'))} ngày kể từ ngày báo giá`
      : '';
  const insightRows = [
    ['customerNeed', 'Nhu cầu khách hàng'],
    ['customerRequirement', 'Yêu cầu chính'],
    ['proposedSolution', 'Giải pháp đề xuất'],
    ['solutionOverview', 'Tóm tắt giải pháp'],
    ['projectScope', 'Phạm vi triển khai'],
  ]
    .map(([key, label]) => ({ key, label, value: textValue(fieldValue(key)) }))
    .filter(row => row.value);
  const defaultColumns: QuoteField[] = [
    { key: 'order', label: 'STT', type: 'auto-number' as const },
    { key: 'serviceDescription', label: 'Hạng mục', type: 'text' as const },
    { key: 'unit', label: 'ĐVT', type: 'text' as const },
    { key: 'quantity', label: 'SL', type: 'number' as const },
    { key: 'unitPrice', label: 'Đơn giá', type: 'currency' as const },
    { key: 'vatRate', label: 'VAT', type: 'number' as const },
    { key: 'total', label: 'Thành tiền', type: 'currency' as const },
  ];
  const standardColumns = visibleColumns.length ? visibleColumns : defaultColumns;

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
              <p>Ngày: {formatDateVN(fieldValue('quoteDate')) || '[Ngày]'}</p>
              <p>Số báo giá: {String(fieldValue('quoteNumber') || '[Số]')}</p>
            </div>
          </header>

          <section className="villa-hero">
            <p className="villa-to">Kính gửi: {String(fieldValue('customerRecipient') || '[Tên khách hàng]')}</p>
            <h1 className="villa-title">{String(fieldValue('quoteTitle'))}</h1>
            <p className="villa-subtitle">{cleanDocumentText(fieldValue('quoteSubtitle'))}</p>
            {cleanDocumentText(fieldValue('quoteBenefitLine')) ? (
              <div className="villa-benefit">{cleanDocumentText(fieldValue('quoteBenefitLine'))}</div>
            ) : null}
          </section>

          <section className="villa-table-wrap">
            <table className="villa-table">
              <thead>
                <tr>
                  {solutionColumns.map(column => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeSolutionItems.map((item, index) => (
                  <tr key={index}>
                    {solutionColumns.map(column => (
                      <td
                        key={column.key}
                        className={
                          column.key === 'originalPrice'
                            ? 'villa-price-original'
                            : column.key === 'offerPrice'
                              ? 'villa-price-offer'
                              : undefined
                        }
                      >
                        {column.key === 'offerPrice' ? (
                          <strong>{renderSolutionCell(item, column, index)}</strong>
                        ) : column.key === 'originalPrice' ? (
                          <span>{renderSolutionCell(item, column, index)}</span>
                        ) : (
                          renderSolutionCell(item, column, index)
                        )}
                      </td>
                    ))}
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
              <strong>{formatDateVN(fieldValue('offerExpiryDate')) || '[Ngày]'}</strong>
            </div>
          </section>
        </section>
      </div>
    );
  }

  return (
    <div className="quote-document-renderer" data-mode={mode}>
      <section className="quote-sheet quote-sheet--standard">
        <header className="sheet-company sheet-company--standard">
          <div className="sheet-brand-block">
            <div className="sheet-brand-mark">{String(fieldValue('sellerCompanyName') || 'MARKEE')}</div>
            <p>{String(fieldValue('sellerAddress'))}</p>
            <p>
              {String(fieldValue('sellerPhone'))}
              {fieldValue('sellerEmail') ? ` · ${String(fieldValue('sellerEmail'))}` : ''}
              {fieldValue('sellerWebsite') ? ` · ${String(fieldValue('sellerWebsite'))}` : ''}
            </p>
          </div>
          <div className="sheet-doc-code">
            <span>BÁO GIÁ</span>
            <strong>{String(fieldValue('quoteNumber') || '[Số báo giá]')}</strong>
          </div>
        </header>

        <section className="sheet-title-block sheet-title-block--standard">
          <p className="sheet-eyebrow">Đề xuất thương mại</p>
          <h1>{String(fieldValue('quoteTitle') || 'Bảng báo giá')}</h1>
          <div className="sheet-quote-meta sheet-quote-meta--cards">
            <span><b>Ngày báo giá</b>{formatDateVN(fieldValue('quoteDate')) || '[Ngày báo giá]'}</span>
            <span><b>Hiệu lực</b>{validUntil || '[Thời hạn hiệu lực]'}</span>
            <span><b>Tiền tệ</b>{String(fieldValue('currency') || 'VND')}</span>
          </div>
        </section>

        <section className="sheet-parties sheet-parties--standard">
          <div>
            <h3>{findSection('customer').title || 'Thông tin khách hàng'}</h3>
            {customerRows.map(row => (
              <p key={row.key} className={!row.value && mode === 'preview' ? 'placeholder' : ''}>
                <strong>{row.label}:</strong> {row.value || row.placeholder}
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

        {insightRows.length ? (
          <section className="sheet-insights">
            <h3>Nhu cầu & giải pháp đề xuất</h3>
            <div className="sheet-insight-grid">
              {insightRows.map(row => (
                <div key={row.key} className="sheet-insight-item">
                  <span>{row.label}</span>
                  <p>{row.value}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="sheet-items">
          <div className="sheet-section-heading">
            <span>Chi phí đề xuất</span>
            <h3>{findSection('quoteItems').title || 'Bảng dịch vụ'}</h3>
          </div>
          <table className="sheet-items-table">
            <thead>
              <tr>
                {standardColumns.map(column => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quoteItems.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(standardColumns.length, 1)} className="empty-row">
                    Chưa có hạng mục báo giá.
                  </td>
                </tr>
              ) : (
                quoteItems.map((item, index) => (
                  <tr key={item.id || index}>
                    {standardColumns.map(column => (
                      <td
                        key={column.key}
                        className={
                          column.type === 'currency' ||
                          ['unitPrice', 'subtotal', 'vatAmount', 'total'].includes(column.key)
                            ? 'money-cell'
                            : undefined
                        }
                      >
                        {renderCell(item, column, index)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="sheet-total-block sheet-total-block--standard">
          <div className="sheet-total-row">
            <span>{findField('subtotalAmount').label || 'Tổng trước VAT'}</span>
            <strong>{formatVnd(totals.subtotalAmount)}</strong>
          </div>
          {resolvedDiscountAmount ? (
            <div className="sheet-total-row sheet-total-row--discount">
              <span>Giảm giá{discountPercentValue ? ` (${discountPercentValue}%)` : ''}</span>
              <strong>-{formatVnd(resolvedDiscountAmount)}</strong>
            </div>
          ) : null}
          <div className="sheet-total-row">
            <span>{findField('totalVatAmount').label || 'VAT'}</span>
            <strong>{formatVnd(totals.totalVatAmount)}</strong>
          </div>
          <div className="sheet-total-row sheet-total-row--grand">
            <span>{findField('totalAmount').label || 'Tổng cộng'}</span>
            <strong>{formatVnd(totals.totalAmount)}</strong>
          </div>
        </section>

        {notesRows.length ? (
          <section className="sheet-note sheet-note--terms">
            <h3>Điều khoản & ghi chú</h3>
            <ul>
              {notesRows.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          </section>
        ) : null}

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
