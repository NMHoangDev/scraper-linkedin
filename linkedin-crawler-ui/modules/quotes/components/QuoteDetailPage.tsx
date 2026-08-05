'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { QUOTE_STATUS_LABELS } from '../constants/quoteConfig';
import { seedingQuoteRepository } from '../repositories/SeedingQuoteRepository';
import type { Quote } from '../types';
import { QuoteDocumentRenderer } from './QuoteDocumentRenderer';

interface Props {
  quoteId: string;
}

export function QuoteDetailPage({ quoteId }: Props) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    seedingQuoteRepository
      .getQuote(quoteId)
      .then(setQuote)
      .catch(err => setError(err instanceof Error ? err.message : 'Không tải được chi tiết báo giá.'))
      .finally(() => setLoading(false));
  }, [quoteId]);

  async function togglePublic() {
    if (!quote) return;
    const updated = await seedingQuoteRepository.updateQuote(quote.id, {
      publicEnabled: !quote.publicEnabled,
    });
    setQuote(updated);
  }

  async function copyLink() {
    if (!quote?.publicUrl) return;
    await navigator.clipboard.writeText(`${window.location.origin}${quote.publicUrl}`);
  }

  function downloadPDF() {
    if (quote?.publicUrl) {
      window.open(`${quote.publicUrl}?print=true`, '_blank', 'noopener');
      return;
    }
    window.print();
  }

  if (loading) return <main className="quote-page"><section className="quote-state">Đang tải...</section></main>;
  if (error || !quote) return <main className="quote-page"><section className="quote-state quote-state--error">{error || 'Không tìm thấy báo giá.'}</section></main>;

  return (
    <main className="quote-detail-page">
      <header className="quote-detail-header no-print">
        <div>
          <Link href="/all-platform/quotes" className="quote-back">Quay lại</Link>
          <h1>{String(quote.data.quoteTitle || 'Chi tiết báo giá')}</h1>
          <p>{quote.quoteNumber} · {QUOTE_STATUS_LABELS[quote.status]} · {new Date(quote.createdAt).toLocaleString('vi-VN')}</p>
        </div>
        <div className="quote-head-actions">
          <label className="quote-switch">
            Link công khai
            <input type="checkbox" checked={Boolean(quote.publicEnabled)} onChange={() => void togglePublic()} />
          </label>
          <button type="button" className="quote-button quote-button--secondary" onClick={() => void copyLink()}>Copy Link</button>
          <button type="button" className="quote-button quote-button--primary" onClick={downloadPDF}>Tải PDF</button>
        </div>
      </header>
      <div className="quote-print-root">
        <QuoteDocumentRenderer
          schemaSnapshot={quote.formSnapshot}
          quoteData={quote.data}
          quoteItems={quote.items}
          solutionItems={quote.data.solutionItems}
          totals={{
            subtotalAmount: quote.subtotalAmount,
            totalVatAmount: quote.vatAmount,
            totalAmount: quote.totalAmount,
          }}
          mode="detail"
        />
      </div>
    </main>
  );
}
