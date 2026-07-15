'use client';

import { QuoteFormFiller } from '@/modules/quotes';
import type { QuoteSchema } from '@/modules/quotes';
import type { QuoteDraft } from './types';

export function FillQuoteStep({
  schema,
  value,
  onChange,
}: {
  schema: QuoteSchema;
  value: QuoteDraft;
  onChange: (next: QuoteDraft) => void;
}) {
  return (
    <div className="crm-wizard-fill-step">
      <QuoteFormFiller schema={schema} value={value} onChange={onChange} />
    </div>
  );
}
