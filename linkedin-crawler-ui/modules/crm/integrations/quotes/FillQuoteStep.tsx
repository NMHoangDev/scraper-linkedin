'use client';

import { QuoteFormFiller } from '@/modules/quotes';
import type { QuoteSchema } from '@/modules/quotes';
import type { QuoteDraft } from './types';

// Section da hien o Buoc 1 (IssuerCompanySection/SelectCustomerStep) hoac da co
// san khoi Tong tien rieng ngay trong QuoteFormFiller (ngoai vong lap section) -
// hien lai theo schema o day se bi trung lap, roi rac. Chi con quoteInfo (tieu
// de/ngay/hieu luc - khong co UI nhap nao khac), quoteItems, notes,
// representatives la thuc su can o Buoc 2 "Hang muc bao gia".
const REDUNDANT_SECTION_KEYS = new Set(['seller', 'customer', 'totals']);

export function FillQuoteStep({
  schema,
  value,
  onChange,
  quoteFormId,
}: {
  schema: QuoteSchema;
  value: QuoteDraft;
  onChange: (next: QuoteDraft) => void;
  quoteFormId?: string;
}) {
  const trimmedSchema: QuoteSchema = {
    ...schema,
    sections: schema.sections.filter(section => !REDUNDANT_SECTION_KEYS.has(section.key)),
  };
  return (
    <div className="crm-wizard-fill-step">
      <QuoteFormFiller schema={trimmedSchema} value={value} onChange={onChange} quoteFormId={quoteFormId} />
    </div>
  );
}
