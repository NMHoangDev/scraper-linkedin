'use client';

import { QuoteDocumentRenderer, calculateQuoteTotals, calculateVillaTotals } from '@/modules/quotes';
import type { QuoteSchema } from '@/modules/quotes';
import type { QuoteDraft } from './types';

export function ReviewQuoteStep({ schema, draft }: { schema: QuoteSchema; draft: QuoteDraft }) {
  const totals =
    schema.layoutType === 'villa_solution_package'
      ? calculateVillaTotals(draft.solutionItems)
      : calculateQuoteTotals(draft.items, draft.data.discountPercent);

  return (
    <div className="crm-wizard-review-step">
      <QuoteDocumentRenderer
        schemaSnapshot={schema}
        quoteData={draft.data}
        quoteItems={draft.items}
        solutionItems={draft.solutionItems}
        totals={totals}
        mode="preview"
      />
    </div>
  );
}
