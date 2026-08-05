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

export const calculateQuoteTotals = (items: Partial<QuoteItem>[] = []) => {
  const subtotalAmount = items.reduce(
    (sum, item) => sum + calculateItemSubtotal(item),
    0
  );
  const totalVatAmount = items.reduce(
    (sum, item) => sum + calculateItemVat(item),
    0
  );
  return {
    subtotalAmount,
    totalVatAmount,
    totalAmount: subtotalAmount + totalVatAmount,
  };
};

export const calculateVillaTotals = (items: Partial<VillaSolutionItem>[] = []) => {
  const totalAmount = items.reduce(
    (sum, item) => sum + toSafeNumber(item.offerPrice),
    0
  );
  return {
    subtotalAmount: totalAmount,
    totalVatAmount: 0,
    totalAmount,
  };
};

export const formatVnd = (value: unknown) =>
  `${Math.round(toSafeNumber(value)).toLocaleString('vi-VN')} đ`;

export const sanitizeMoneyInput = (value: unknown) => toSafeNumber(value);
