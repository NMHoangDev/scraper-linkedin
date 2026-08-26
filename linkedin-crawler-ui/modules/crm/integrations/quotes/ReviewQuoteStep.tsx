'use client';

import { useMemo, useState } from 'react';
import { QuoteDocumentRenderer, calculateQuoteTotals, calculateVillaTotals } from '@/modules/quotes';
import type { QuoteSchema } from '@/modules/quotes';
import { resolveToggleableColumns } from '@/modules/quotes/utils/quoteColumns';
import type { QuoteDraft } from './types';

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
  const isVilla = schema.layoutType === 'villa_solution_package';
  const totals = isVilla
    ? calculateVillaTotals(draft.solutionItems)
    : calculateQuoteTotals(draft.items, draft.data.discountPercent);

  // Danh sach checkbox "Cot hien thi" phai an theo dung cot THAT cua MAU nay
  // (schema.quoteItems.config.columns), khong phai danh sach co dinh - moi mau
  // khac nhau se hien dung tung checkbox tuong ung, dung chung logic voi
  // QuoteDocumentRenderer (xem utils/quoteColumns.ts) de khong bao gio lech nhau.
  const columnToggleOptions = useMemo(() => resolveToggleableColumns(schema, draft.items), [schema, draft.items]);
  const defaultVisibleColumns = useMemo(() => columnToggleOptions.map(column => column.key), [columnToggleOptions]);
  const visibleColumns = Array.isArray(draft.data.visibleColumns) ? draft.data.visibleColumns : defaultVisibleColumns;

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
            <p className="crm-wizard-form-description">
              {isVilla ? 'Mẫu này dùng bảng giải pháp riêng, không tuỳ chỉnh cột được.' : 'Tuỳ chỉnh cột hiển thị trước khi gửi.'}
            </p>
          </div>
          {/* Layout Villa (GIẢI PHÁP/BẠN NHẬN ĐƯỢC/BAO GỒM...) dùng bảng cột
              hoàn toàn khác, không đọc visibleColumns - ẩn hẳn panel này đi để
              tránh hiện checkbox không có tác dụng gì (đánh lừa người dùng). */}
          {!isVilla ? (
            <div className="crm-quote-column-picker">
              <button type="button" className="crm-cancel-button" onClick={() => setColumnMenuOpen(open => !open)}>
                Cột hiển thị <span className="crm-quote-column-count">{visibleColumns.length}/{columnToggleOptions.length}</span>
              </button>
              {columnMenuOpen ? (
                <div className="crm-quote-column-menu">
                  <p>Chỉ ảnh hưởng bản gửi khách, không xoá dữ liệu nội bộ.</p>
                  {columnToggleOptions.map(option => (
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
                    <button type="button" onClick={() => setVisibleColumns([...defaultVisibleColumns])}>
                      Hiện tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleColumns(
                          columnToggleOptions.filter(column => column.type !== 'number' && column.type !== 'currency').map(column => column.key)
                        )
                      }
                    >
                      Ẩn thông tin giá
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <QuoteDocumentRenderer
        schemaSnapshot={schema}
        quoteData={draft.data}
        quoteItems={draft.items}
        solutionItems={draft.solutionItems}
        totals={totals}
        mode="preview"
        respectVisibleColumns={Boolean(onChange) && !isVilla}
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
