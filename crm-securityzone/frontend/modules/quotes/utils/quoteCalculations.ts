import type { QuoteItem, VillaSolutionItem } from '../types';

export const parseCurrencyInput = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isNaN(value) ? 0 : value;
  const parsed = Number.parseInt(String(value).replace(/[^\d-]/g, ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const toSafeNumber = (value: unknown) => parseCurrencyInput(value);

const toSafePercent = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isNaN(value) ? 0 : value;
  const normalized = String(value).replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const calculateItemSubtotal = (item?: Partial<QuoteItem>) =>
  toSafeNumber(item?.quantity) * toSafeNumber(item?.unitPrice);

export const calculateItemDiscount = (item?: Partial<QuoteItem>) =>
  (calculateItemSubtotal(item) * clampDiscountPercent(item?.discountPercent)) / 100;

export const calculateItemAfterDiscount = (item?: Partial<QuoteItem>) =>
  calculateItemSubtotal(item) - calculateItemDiscount(item);

export const calculateItemVat = (item?: Partial<QuoteItem>) =>
  (calculateItemAfterDiscount(item) * toSafeNumber(item?.vatRate)) / 100;

export const calculateItemTotal = (item?: Partial<QuoteItem>) =>
  calculateItemAfterDiscount(item) + calculateItemVat(item);

/** Kẹp % giảm giá về [0, 100] - phòng người dùng gõ số âm hoặc >100% làm tổng
 * tiền ra số vô lý (âm hoặc lớn hơn cả tổng gốc). */
export const clampDiscountPercent = (value: unknown) => {
  const pct = toSafePercent(value);
  if (pct < 0) return 0;
  if (pct > 100) return 100;
  return pct;
};

/**
 * Giảm giá % áp dụng trên TỔNG TRƯỚC THUẾ (subtotal), rồi VAT tính lại trên
 * phần đã giảm - không phải giảm sau khi đã cộng VAT. Vì giảm giá là 1 hệ số
 * NHÂN đều lên mọi dòng, và VAT mỗi dòng cũng tuyến tính theo subtotal dòng
 * đó, nên tổng VAT sau giảm = tổng VAT gốc (không giảm) × (1 - %/100) —
 * đúng cho mọi trường hợp kể cả các dòng có VAT % khác nhau, không cần tính
 * lại VAT từng dòng riêng. Xem chứng minh trong PR mô tả "Luồng duyệt báo giá".
 */
export const calculateQuoteTotals = (
  items: Partial<QuoteItem>[] = [],
  _discountPercent: unknown = 0
) => {
  void _discountPercent;
  const allItems = flattenQuoteItems(items);
  const discountAmount = allItems.reduce(
    (sum, item) => sum + calculateItemDiscount(item),
    0
  );
  const totalVatAmount = allItems.reduce(
    (sum, item) => sum + calculateItemVat(item),
    0
  );
  return {
    subtotalAmount: allItems.reduce((sum, item) => sum + calculateItemSubtotal(item), 0),
    discountAmount,
    totalVatAmount,
    totalAmount: allItems.reduce((sum, item) => sum + calculateItemTotal(item), 0),
  };
};

export const flattenQuoteItems = (items: Partial<QuoteItem>[] = []): Partial<QuoteItem>[] =>
  items.flatMap(item => [item, ...flattenQuoteItems(item.children || [])]);

export const calculateVillaTotals = (items: Partial<VillaSolutionItem>[] = []) => {
  const totalAmount = items.reduce(
    (sum, item) => sum + toSafeNumber(item.offerPrice),
    0
  );
  return {
    subtotalAmount: totalAmount,
    discountAmount: 0,
    totalVatAmount: 0,
    totalAmount,
  };
};

export const formatVnd = (value: unknown) =>
  `${Math.round(toSafeNumber(value)).toLocaleString('vi-VN')} đ`;

export const sanitizeMoneyInput = (value: unknown) => toSafeNumber(value);
