'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { QuoteDocumentRenderer, calculateQuoteTotals, calculateVillaTotals } from '@/modules/quotes';
import type { QuoteSchema } from '@/modules/quotes';
import { getLockedColumnKeys, resolveQuoteItemColumns, resolveToggleableColumns } from '@/modules/quotes/utils/quoteColumns';
import { loadVisibleColumnsDraft, saveVisibleColumnsDraft } from './quoteColumnsDraft';
import type { QuoteDraft } from './types';

// Cột "khoá" (STT + tên hạng mục), không bao giờ ẩn được - hiện như dòng có
// khoá trong khối "Cột hiển thị", không phải checkbox. Bộ khoá phụ thuộc bảng
// hạng mục THẬT của mẫu (quoteItems hay solutionItems...) - xem
// getLockedColumnKeys/LOCKED_COLUMN_KEYS_BY_ITEM_FIELD_KEY trong quoteColumns.ts,
// KHÔNG còn hardcode ở đây để áp dụng đúng cho mọi mẫu, kể cả villa.

export function ReviewQuoteStep({
  schema,
  draft,
  onChange,
  quoteFormId,
}: {
  schema: QuoteSchema;
  draft: QuoteDraft;
  /** Optional — không truyền thì ẩn khối "Cột hiển thị"/tuỳ chọn gửi (dùng cho
   * nơi chỉ xem trước thuần tuý, không phải bước cuối của wizard tạo báo giá). */
  onChange?: (next: QuoteDraft) => void;
  /** Id mẫu báo giá đang dùng - dùng để lưu/khôi phục nháp lựa chọn "Cột hiển
   * thị" theo localStorage (xem quoteColumnsDraft.ts), theo đúng mẫu này, không
   * lẫn với mẫu khác. Không truyền = không lưu/khôi phục nháp. */
  quoteFormId?: string;
}) {
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const isVilla = schema.layoutType === 'villa_solution_package';
  const totals = isVilla
    ? calculateVillaTotals(draft.solutionItems)
    : calculateQuoteTotals(draft.items, draft.data.discountPercent);

  // Schema/mẫu không hợp lệ (thiếu sections, hoặc không phải mảng) - hiện cảnh
  // báo rõ ràng ngay trong khối, KHÔNG âm thầm dùng đỡ mẫu khác (không có quy
  // tắc nghiệp vụ nào cho phép fallback ngầm sang mẫu khác ở bước này).
  const schemaInvalid = !schema || !Array.isArray(schema.sections);

  // Danh sach checkbox "Cot hien thi" phai an theo dung cot THAT cua MAU nay
  // (schema.quoteItems.config.columns), khong phai danh sach co dinh - moi mau
  // khac nhau se hien dung tung checkbox tuong ung, dung chung logic voi
  // QuoteDocumentRenderer (xem utils/quoteColumns.ts) de khong bao gio lech nhau.
  // resolveQuoteItemColumns/resolveToggleableColumns KHÔNG bị sửa ở đây (giữ
  // nguyên logic tính cột gốc) - chỉ phân loại lại kết quả có sẵn thành
  // "bắt buộc" (2 cột cố định) vs "tuỳ chọn" (mọi cột khác mẫu thật sự khai báo).
  const allColumns = useMemo(
    () => (schemaInvalid ? [] : resolveQuoteItemColumns(schema, draft.items)),
    [schema, schemaInvalid, draft.items]
  );
  const requiredColumnKeys = useMemo(
    () => (schemaInvalid ? new Set<string>() : new Set(getLockedColumnKeys(schema))),
    [schema, schemaInvalid]
  );
  const requiredColumns = useMemo(
    () => allColumns.filter(column => requiredColumnKeys.has(column.key)),
    [allColumns, requiredColumnKeys]
  );
  const toggleableColumns = useMemo(
    () => (schemaInvalid ? [] : resolveToggleableColumns(schema, draft.items)),
    [schema, schemaInvalid, draft.items]
  );
  // resolveToggleableColumns() giờ đã đọc đúng bảng hạng mục THẬT của mẫu này
  // (quoteItems hoặc solutionItems...) nên villa cũng có cột tuỳ chọn thật
  // (customerBenefit/includedFeatures/offerPrice/originalPrice/pricingNote) -
  // đi qua ĐÚNG code path như mọi mẫu khác, không còn ép về [] riêng cho villa.
  const optionalColumns = toggleableColumns;
  const optionalColumnKeys = useMemo(() => optionalColumns.map(column => column.key), [optionalColumns]);
  const defaultVisibleColumns = optionalColumnKeys;

  const savedVisibleColumns = Array.isArray(draft.data.visibleColumns) ? draft.data.visibleColumns : null;
  const visibleColumns = (savedVisibleColumns || defaultVisibleColumns).filter(key => optionalColumnKeys.includes(key));
  const visibleCount = visibleColumns.length;
  const optionalTotal = optionalColumnKeys.length;

  function setVisibleColumns(next: string[]) {
    onChange?.({ ...draft, data: { ...draft.data, visibleColumns: next } });
    saveVisibleColumnsDraft(quoteFormId, next);
  }
  function toggleColumn(key: string) {
    setVisibleColumns(
      visibleColumns.includes(key) ? visibleColumns.filter(item => item !== key) : [...visibleColumns, key]
    );
  }

  // Khôi phục nháp "Cột hiển thị" đã lưu (localStorage) cho ĐÚNG mẫu này khi
  // báo giá đang tạo CHƯA có lựa chọn cột nào (data.visibleColumns rỗng/chưa
  // set) - vd sau khi refresh trang giữa chừng rồi tạo lại báo giá cùng mẫu.
  // Chỉ chạy 1 lần cho mỗi mẫu (formId đổi), không ghi đè lựa chọn người dùng
  // đang thao tác dở trong phiên hiện tại.
  const restoredForFormId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!onChange || !quoteFormId || schemaInvalid) return;
    if (restoredForFormId.current === quoteFormId) return;
    restoredForFormId.current = quoteFormId;
    if (savedVisibleColumns) return; // đã có lựa chọn thật (mẫu mới tạo hoặc đang sửa báo giá cũ) - không ghi đè.
    const draftColumns = loadVisibleColumnsDraft(quoteFormId);
    if (!draftColumns) return;
    const reconciled = draftColumns.filter(key => optionalColumnKeys.includes(key));
    if (reconciled.length) setVisibleColumns(reconciled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteFormId, schemaInvalid]);

  // Cong ty/mau doi (schema doi) trong khi dang o buoc nay - dam bao khong bao
  // gio de lot 1 key visibleColumns cu KHONG con thuoc mau moi (vd mau cu co
  // cot "unitPriceUsd" nhung mau moi khong co) hoac thieu cot MOI cua mau nay
  // (phai mac dinh hien = true, giong hanh vi mac dinh hien tai). CHI hoa giai
  // khi optionalColumnKeys THAT SU DOI trong luc component da mount san (vd
  // doi cong ty/mau ngay tren buoc nay) - KHONG duoc chay o LAN RENDER DAU
  // (mount), vi luc do savedVisibleColumns rat co the la 1 lua chon THAT co
  // chu dich cua nguoi dung tu 1 lan tao bao gia truoc (khoi phuc qua
  // localStorage draft, xem quoteDraftFromForm) - hoa giai o day se hieu nham
  // "thieu cot" va tu y bat lai cac cot nguoi dung da CHU DICH bo tick, xoa
  // sach y nghia cua ban nhap. Dung ref luu signature LAN TRUOC (rong o lan
  // dau) de chi phan ung voi thay doi THAT SU sau khi da mount, khong phai
  // trang thai ban dau.
  const optionalKeysSignature = optionalColumnKeys.join('|');
  const previousSignatureRef = useRef<string | null>(null);
  useEffect(() => {
    const previousSignature = previousSignatureRef.current;
    previousSignatureRef.current = optionalKeysSignature;
    if (previousSignature === null || previousSignature === optionalKeysSignature) return; // lan dau mount - bo qua.
    if (!onChange || schemaInvalid || optionalTotal === 0) return;
    if (!savedVisibleColumns) return; // chua co lua chon nao - dung default toan bo, khong can hoa giai.
    const staleKeys = savedVisibleColumns.filter(key => !optionalColumnKeys.includes(key));
    const missingKeys = optionalColumnKeys.filter(key => !savedVisibleColumns.includes(key));
    if (!staleKeys.length && !missingKeys.length) return;
    const reconciled = [...savedVisibleColumns.filter(key => optionalColumnKeys.includes(key)), ...missingKeys];
    setVisibleColumns(reconciled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionalKeysSignature, schemaInvalid]);

  return (
    <div className="crm-wizard-review-step">
      {onChange ? (
        <div className="crm-quote-review-toolbar">
          <div>
            <h3 className="crm-wizard-form-title">Bản xem trước gửi khách hàng</h3>
            <p className="crm-wizard-form-description">Tuỳ chỉnh cột hiển thị trước khi gửi.</p>
          </div>

          {/* Khối "Cột hiển thị" LUÔN hiện (không bao giờ trả về null cả khối) -
              chỉ đổi NỘI DUNG bên trong tuỳ trạng thái (mẫu không có cột tuỳ
              chọn nào / schema lỗi / có cột để chọn). */}
          <div className="crm-quote-column-picker">
            {schemaInvalid ? (
              <div className="crm-quote-column-warning">⚠ Không đọc được cấu hình mẫu báo giá này.</div>
            ) : (
              <>
                <button
                  type="button"
                  className="crm-cancel-button"
                  onClick={() => setColumnMenuOpen(open => !open)}
                  disabled={optionalTotal === 0}
                >
                  Cột hiển thị{' '}
                  <span className="crm-quote-column-count">
                    {optionalTotal === 0 ? '—' : `${visibleCount}/${optionalTotal}`}
                  </span>
                </button>
                {optionalTotal === 0 ? (
                  <p className="crm-quote-column-empty-hint">Mẫu này không có cột tùy chỉnh.</p>
                ) : null}
                {columnMenuOpen && optionalTotal > 0 ? (
                  <div className="crm-quote-column-menu">
                    <p>Chỉ ảnh hưởng bản gửi khách, không xoá dữ liệu nội bộ.</p>
                    {requiredColumns.map(option => (
                      <label key={option.key} className="crm-quote-column-option crm-quote-column-option--locked">
                        <input type="checkbox" checked disabled />
                        🔒 {option.label} <span className="crm-quote-column-required-badge">Bắt buộc</span>
                      </label>
                    ))}
                    {optionalColumns.map(option => (
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
                            optionalColumns.filter(column => column.type !== 'number' && column.type !== 'currency').map(column => column.key)
                          )
                        }
                      >
                        Ẩn thông tin giá
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
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
