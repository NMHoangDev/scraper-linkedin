import type { QuoteField, QuoteItem, QuoteSchema } from '../types';
import { flattenQuoteItems } from './quoteCalculations';

/** Cột mặc định khi mẫu KHÔNG khai báo cột nào trong schema (repeater-table
 * quoteItems trống config.columns) — chỉ dùng làm fallback cuối cùng, KHÔNG
 * phải danh sách cột cố định áp cho mọi mẫu. */
const FALLBACK_COLUMNS: QuoteField[] = [
  { key: 'order', label: 'STT', type: 'auto-number' },
  { key: 'serviceDescription', label: 'Hạng mục', type: 'text' },
  { key: 'unit', label: 'ĐVT', type: 'text' },
  { key: 'quantity', label: 'SL', type: 'number' },
  { key: 'unitPrice', label: 'Đơn giá', type: 'currency' },
  { key: 'vatRate', label: 'VAT', type: 'number' },
  { key: 'total', label: 'Thành tiền', type: 'currency' },
];

const CATALOG_PRICING_COLUMNS: QuoteField[] = [
  { key: 'listPriceUsd', label: 'List price USD', type: 'text' },
  { key: 'unitPriceUsd', label: 'Unit Price USD', type: 'text' },
  { key: 'unitPriceVnd', label: 'Unit price VND', type: 'text' },
];

/** Cột bảng hạng mục thật của MẪU này (đọc từ schema.quoteItems.config.columns,
 * không phải danh sách cố định) — dùng chung cho cả QuoteDocumentRenderer (khi
 * render) và ReviewQuoteStep (khi dựng checkbox "Cột hiển thị"), để 2 nơi luôn
 * khớp nhau. quoteItems truyền vào chỉ để biết có dùng Danh mục dịch vụ hay
 * không (chèn thêm 3 cột giá USD/VND tham khảo), không đổi cột theo TỪNG dòng. */
export function resolveQuoteItemColumns(schema: QuoteSchema, quoteItems: QuoteItem[] = []): QuoteField[] {
  const quoteItemsField = schema.sections.flatMap(section => section.fields).find(field => field.key === 'quoteItems');
  const baseColumns = quoteItemsField?.config?.columns?.filter(column => column.visible !== false) || [];
  const hasCatalogPricing = flattenQuoteItems(quoteItems).some(item => item.catalogItemId);
  const unitPriceIndex = baseColumns.findIndex(column => column.key === 'unitPrice');
  const withCatalogColumns = hasCatalogPricing
    ? unitPriceIndex >= 0
      ? [...baseColumns.slice(0, unitPriceIndex), ...CATALOG_PRICING_COLUMNS, ...baseColumns.slice(unitPriceIndex)]
      : [...CATALOG_PRICING_COLUMNS, ...baseColumns]
    : baseColumns;

  const columns = (withCatalogColumns.length ? [...withCatalogColumns] : [...FALLBACK_COLUMNS]).filter(
    column => !['subtotal', 'vatAmount'].includes(column.key)
  );
  if (!columns.some(column => column.key === 'order' || column.type === 'auto-number')) {
    columns.unshift({ key: 'order', label: 'STT', type: 'auto-number' });
  }
  if (!columns.some(column => column.key === 'description')) {
    const unitIndex = columns.findIndex(column => column.key === 'unit');
    columns.splice(unitIndex >= 0 ? unitIndex : 2, 0, { key: 'description', label: 'Mô tả', type: 'textarea' });
  }
  if (!columns.some(column => column.key === 'discountPercent')) {
    const vatIndex = columns.findIndex(column => column.key === 'vatRate');
    columns.splice(vatIndex >= 0 ? vatIndex : columns.length - 1, 0, { key: 'discountPercent', label: 'Giảm giá', type: 'number' });
  }
  return columns;
}

/** Cột nào không bao giờ được ẩn khỏi khách (cấu trúc bảng/tên hạng mục/giảm
 * giá — giữ nguyên hành vi cũ: giảm giá luôn hiện, không cho toggle để tránh
 * vỡ tương thích ngược với báo giá cũ đã lưu visibleColumns trước khi có field
 * này). Còn lại — MỌI cột thật sự khai báo trong schema của mẫu — đều toggle
 * được, tự động đổi theo từng mẫu, không phải danh sách cố định. */
const NEVER_TOGGLE_KEYS = new Set(['order', 'serviceDescription', 'discountPercent']);

export function resolveToggleableColumns(schema: QuoteSchema, quoteItems: QuoteItem[] = []): QuoteField[] {
  return resolveQuoteItemColumns(schema, quoteItems).filter(
    column => !NEVER_TOGGLE_KEYS.has(column.key) && column.type !== 'auto-number' && column.type !== 'calculated'
  );
}
