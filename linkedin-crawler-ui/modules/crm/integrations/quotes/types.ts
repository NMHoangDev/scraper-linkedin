import type { Quote, QuoteData, QuoteForm, QuoteItem, VillaSolutionItem } from '@/modules/quotes';
import type { DealFormState } from '../../components/DealFormFields';

export type WizardStep = 1 | 2 | 3 | 4;

/** Cột bảng dịch vụ mặc định hiện cho khách khi tạo báo giá mới — khớp đúng 5
 * checkbox "Cột hiển thị" ở bước Xem trước & gửi. */
export const DEFAULT_VISIBLE_QUOTE_COLUMNS = ['description', 'unit', 'quantity', 'unitPrice', 'total'];

export interface QuoteDraft {
  data: QuoteData;
  items: QuoteItem[];
  solutionItems: VillaSolutionItem[];
}

export function emptyQuoteDraft(): QuoteDraft {
  return { data: {}, items: [], solutionItems: [] };
}

export function quoteDraftFromForm(form: QuoteForm, dealDraft?: DealFormState): QuoteDraft {
  const fields = form.schemaJson.sections.flatMap(section => section.fields);
  const data: QuoteData = {};
  fields.forEach(field => {
    if (field.type === 'repeater-table') return;
    if (field.defaultValue !== undefined) data[field.key] = field.defaultValue;
  });
  const solutionField = fields.find(field => field.key === 'solutionItems');
  const solutionItems = Array.isArray(solutionField?.defaultValue)
    ? (solutionField?.defaultValue as VillaSolutionItem[])
    : [];
  const quoteItemsField = fields.find(field => field.key === 'quoteItems');
  const quoteItems = Array.isArray(quoteItemsField?.defaultValue)
    ? (JSON.parse(JSON.stringify(quoteItemsField.defaultValue)) as QuoteItem[])
    : [];

  if (fields.some(field => field.key === 'quoteDate') && !data.quoteDate) {
    data.quoteDate = new Date().toISOString().slice(0, 10);
  }
  if (!data.visibleColumns) {
    data.visibleColumns = [...DEFAULT_VISIBLE_QUOTE_COLUMNS];
  }

  if (dealDraft) {
    Object.assign(data, {
      customerRecipient: dealDraft.customerName || dealDraft.companyName,
      customerCompanyName: dealDraft.companyName || dealDraft.customerName,
      customerContactName: dealDraft.customerName,
      customerAddress: dealDraft.address,
      customerPhone: dealDraft.phone,
      customerEmail: dealDraft.email,
      customerTaxCode: dealDraft.taxCode,
    });
  }

  return { data, items: quoteItems, solutionItems };
}

/** Dựng lại QuoteDraft từ 1 báo giá đã tồn tại (chế độ sửa) - để prefill wizard
 * đúng dữ liệu đã lưu, không phải giá trị mặc định của mẫu. */
export function quoteDraftFromExistingQuote(quote: Quote): QuoteDraft {
  const { solutionItems, ...data } = quote.data || {};
  // Bao gia luu truoc khi co tinh nang "Cot hien thi" se khong co visibleColumns
  // trong data da luu - mac dinh hien du (khop hanh vi cu, khong bi rot cot).
  if (!data.visibleColumns) {
    data.visibleColumns = [...DEFAULT_VISIBLE_QUOTE_COLUMNS];
  }
  return {
    data,
    items: quote.items || [],
    solutionItems: Array.isArray(solutionItems) ? solutionItems : [],
  };
}
