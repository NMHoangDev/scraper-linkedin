'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { internalQuoteStatusClass, internalQuoteStatusLabel } from '../constants/quoteConfig';
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
  // Trang này thường mở từ nút "Mở báo giá" trong Drawer chi tiết deal (CRM) -
  // giữ dealId trên URL để "Quay lại" mở đúng lại drawer deal đó, thay vì về
  // trang danh sách báo giá chung chung (mất hết ngữ cảnh đang xem deal nào).
  const dealId = useSearchParams().get('dealId');
  const backHref = dealId ? `/all-platform/crm?openDeal=${encodeURIComponent(dealId)}` : '/all-platform/quotes';

  useEffect(() => {
    seedingQuoteRepository
      .getQuote(quoteId)
      .then(setQuote)
      .catch(err => setError(err instanceof Error ? err.message : 'Không tải được chi tiết báo giá.'))
      .finally(() => setLoading(false));
  }, [quoteId]);

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
      <Link href={backHref} className="quote-back quote-back--breadcrumb no-print">← Quay lại</Link>
      <header className="quote-detail-header no-print">
        <div>
          <h1>{String(quote.data.quoteTitle || 'Chi tiết báo giá')}</h1>
          <p>
            {quote.quoteNumber}
            <span className={`quote-badge ${internalQuoteStatusClass(quote.status)}`}>{internalQuoteStatusLabel(quote.status)}</span>
            · {new Date(quote.createdAt).toLocaleString('vi-VN')}
          </p>
        </div>
        <div className="quote-head-actions">
          {quote.status === 'approved' || quote.status === 'confirmed' ? (
            <>
              <button type="button" className="quote-button quote-button--secondary" onClick={() => void copyLink()}>Copy Link</button>
              <button type="button" className="quote-button quote-button--primary" onClick={downloadPDF}>Tải PDF</button>
            </>
          ) : (
            <span className="quote-badge status-draft">Chưa có link công khai gửi khách</span>
          )}
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
