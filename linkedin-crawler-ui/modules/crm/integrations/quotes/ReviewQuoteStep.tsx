'use client';

import { useState } from 'react';
import { QuoteDocumentRenderer, calculateQuoteTotals, calculateVillaTotals } from '@/modules/quotes';
import type { QuoteSchema } from '@/modules/quotes';
import { DEFAULT_VISIBLE_QUOTE_COLUMNS } from './types';
import type { QuoteDraft } from './types';

const COLUMN_TOGGLE_OPTIONS: Array<{ key: string; label: string }> = [
  { key: 'description', label: 'Mô tả' },
  { key: 'unit', label: 'Đơn vị tính' },
  { key: 'quantity', label: 'Số lượng' },
  { key: 'unitPrice', label: 'Đơn giá' },
  { key: 'total', label: 'Thành tiền' },
];

export function ReviewQuoteStep({
  schema,
  draft,
  onChange,
}: {
  schema: QuoteSchema;
  draft: QuoteDraft;
  /** Optional — không truyền thì ẩn khối "Cột hiển thị"/tuỳ chọn gửi (dùng cho
   * nơi chỉ xem trước thuần tuý, không phải bước cuối của wizard tạo báo giá). */
  onChange?: (next: QuoteDraft) => void;
}) {
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const totals =
    schema.layoutType === 'villa_solution_package'
      ? calculateVillaTotals(draft.solutionItems)
      : calculateQuoteTotals(draft.items, draft.data.discountPercent);

  const visibleColumns = Array.isArray(draft.data.visibleColumns)
    ? draft.data.visibleColumns
    : DEFAULT_VISIBLE_QUOTE_COLUMNS;

  function setVisibleColumns(next: string[]) {
    onChange?.({ ...draft, data: { ...draft.data, visibleColumns: next } });
  }
  function toggleColumn(key: string) {
    setVisibleColumns(
      visibleColumns.includes(key) ? visibleColumns.filter(item => item !== key) : [...visibleColumns, key]
    );
  }

  return (
    <div className="crm-wizard-review-step">
      {onChange ? (
        <div className="crm-quote-review-toolbar">
          <div>
            <h3 className="crm-wizard-form-title">Bản xem trước gửi khách hàng</h3>
            <p className="crm-wizard-form-description">Tuỳ chỉnh cột hiển thị trước khi gửi.</p>
          </div>
          <div className="crm-quote-column-picker">
            <button type="button" className="crm-cancel-button" onClick={() => setColumnMenuOpen(open => !open)}>
              Cột hiển thị <span className="crm-quote-column-count">{visibleColumns.length}/{COLUMN_TOGGLE_OPTIONS.length}</span>
            </button>
            {columnMenuOpen ? (
              <div className="crm-quote-column-menu">
                <p>Chỉ ảnh hưởng bản gửi khách, không xoá dữ liệu nội bộ.</p>
                {COLUMN_TOGGLE_OPTIONS.map(option => (
                  <label key={option.key} className="crm-quote-column-option">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(option.key)}
                      onChange={() => toggleColumn(option.key)}
                    />
                    {option.label}
                  </label>
                ))}
                <div className="crm-quote-column-menu-foot">
                  <button type="button" onClick={() => setVisibleColumns([...DEFAULT_VISIBLE_QUOTE_COLUMNS])}>
                    Hiện tất cả
                  </button>
                  <button type="button" onClick={() => setVisibleColumns(['description'])}>
                    Ẩn thông tin giá
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <QuoteDocumentRenderer
        schemaSnapshot={schema}
        quoteData={draft.data}
        quoteItems={draft.items}
        solutionItems={draft.solutionItems}
        totals={totals}
        mode="preview"
        respectVisibleColumns={Boolean(onChange)}
      />

      {onChange ? (
        <div className="crm-quote-send-options">
          <label className="crm-quote-send-option crm-quote-send-option--disabled">
            <input type="checkbox" disabled />
            Thông báo khi khách mở <em>(sắp có)</em>
          </label>
          <label className="crm-quote-send-option crm-quote-send-option--disabled">
            <input type="checkbox" disabled />
            Cho phép phản hồi trực tuyến <em>(sắp có)</em>
          </label>
          <label className="crm-quote-send-option">
            <input type="checkbox" checked disabled />
            Yêu cầu duyệt trước khi gửi
          </label>
          <p className="crm-quote-send-hint">
            Mọi báo giá mới luôn ở trạng thái chờ duyệt — duyệt là thao tác riêng, cần quyền duyệt.
          </p>
        </div>
      ) : null}
    </div>
  );
}
