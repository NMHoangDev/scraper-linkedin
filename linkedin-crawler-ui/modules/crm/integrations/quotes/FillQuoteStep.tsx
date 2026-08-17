'use client';

import { QuoteFormFiller } from '@/modules/quotes';
import type { QuoteSchema } from '@/modules/quotes';
import type { QuoteDraft } from './types';

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
  return (
    <div className="crm-wizard-fill-step">
      <QuoteFormFiller schema={schema} value={value} onChange={onChange} quoteFormId={quoteFormId} />
    </div>
  );
}
