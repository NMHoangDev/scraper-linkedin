import type { QuoteItem, VillaSolutionItem } from '../types';

export const parseCurrencyInput = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isNaN(value) ? 0 : value;
  const parsed = Number.parseInt(String(value).replace(/[^\d-]/g, ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const toSafeNumber = (value: unknown) => parseCurrencyInput(value);

export const calculateItemSubtotal = (item?: Partial<QuoteItem>) =>
  toSafeNumber(item?.quantity) * toSafeNumber(item?.unitPrice);

export const calculateItemVat = (item?: Partial<QuoteItem>) =>
  (calculateItemSubtotal(item) * toSafeNumber(item?.vatRate)) / 100;

export const calculateItemTotal = (item?: Partial<QuoteItem>) =>
  calculateItemSubtotal(item) + calculateItemVat(item);

/** Kẹp % giảm giá về [0, 100] - phòng người dùng gõ số âm hoặc >100% làm tổng
 * tiền ra số vô lý (âm hoặc lớn hơn cả tổng gốc). */
export const clampDiscountPercent = (value: unknown) => {
  const pct = toSafeNumber(value);
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
  discountPercent: unknown = 0
) => {
  const pct = clampDiscountPercent(discountPercent);
  const subtotalAmount = items.reduce(
    (sum, item) => sum + calculateItemSubtotal(item),
    0
  );
  const grossVatAmount = items.reduce(
    (sum, item) => sum + calculateItemVat(item),
    0
  );
  const discountAmount = (subtotalAmount * pct) / 100;
  const totalVatAmount = (grossVatAmount * (100 - pct)) / 100;
  return {
    subtotalAmount,
    discountAmount,
    totalVatAmount,
    totalAmount: subtotalAmount - discountAmount + totalVatAmount,
  };
};

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
