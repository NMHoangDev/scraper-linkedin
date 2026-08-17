'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { seedingQuoteRepository } from '../repositories/SeedingQuoteRepository';
import { internalQuoteStatusClass, internalQuoteStatusLabel } from '../constants/quoteConfig';
import { formatVnd } from '../utils/quoteCalculations';
import type { Quote, QuoteItem } from '../types';

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

/** Dòng đầu tiên trong báo giá coi là "hạng mục chính" để hiển thị Part number/
 * Description Items trên bảng log — quy ước "SKU – Tên" khi chọn từ Danh mục
 * dịch vụ (xem bundleToQuoteItem/componentToQuoteItem trong QuoteFormFiller). */
function primaryItem(items: QuoteItem[]): QuoteItem | null {
  return items[0] || null;
}

function splitPartNumber(serviceDescription?: string): { partNumber: string; name: string } {
  const text = (serviceDescription || '').trim();
  const dashIndex = text.indexOf(' – ');
  if (dashIndex === -1) return { partNumber: '', name: text };
  return { partNumber: text.slice(0, dashIndex).trim(), name: text.slice(dashIndex + 2).trim() };
}

export function QuoteHistoryPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [allQuotes, forms] = await Promise.all([
        seedingQuoteRepository.getQuotes(),
        seedingQuoteRepository.getForms(),
      ]);
      // Trang này chỉ dùng cho luồng VPS (bảng Tb_in) - lọc theo mẫu báo giá có
      // tên chứa "VPS", không hiện báo giá của các mẫu khác (Douyin, Villa...).
      const vpsFormIds = new Set(
        forms.filter(form => form.name.toLowerCase().includes('vps')).map(form => form.id)
      );
      setQuotes(allQuotes.filter(quote => vpsFormIds.has(quote.quoteFormId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được lịch sử báo giá.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function copyLink(quote: Quote) {
    const link = quote.publicUrl
      ? `${window.location.origin}${quote.publicUrl}`
      : `${window.location.origin}/all-platform/quotes/${quote.id}`;
    await navigator.clipboard.writeText(link);
  }

  return (
    <main className="quote-page">
      <header className="quote-head">
        <div>
          <h1>Lịch sử báo giá VPS</h1>
          <p>Báo giá VPS đã tạo cho khách hàng, kèm ngày báo giá và link báo giá.</p>
        </div>
        <div className="quote-head-actions">
          <button type="button" className="quote-button quote-button--secondary" onClick={() => void load()}>
            Làm mới
          </button>
        </div>
      </header>

      {loading ? <section className="quote-state">Đang tải lịch sử báo giá...</section> : null}
      {error ? <section className="quote-state quote-state--error">{error}</section> : null}

      {!loading && !error ? (
        <div className="quote-table-wrap">
          <table className="quote-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Part number</th>
                <th>Description Items</th>
                <th>SL</th>
                <th>Unit price VND</th>
                <th>Thành tiền VND</th>
                <th>Discount</th>
                <th>% VAT</th>
                <th>VAT (VND)</th>
                <th>Thành tiền sau VAT (VND)</th>
                <th>Ngày báo giá</th>
                <th>Trạng thái</th>
                <th>Link báo giá</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={13} className="empty-row">Chưa có báo giá nào.</td>
                </tr>
              ) : (
                quotes.map((quote, index) => {
                  const item = primaryItem(quote.items);
                  const { partNumber, name } = splitPartNumber(item?.serviceDescription);
                  const extraCount = quote.items.length > 1 ? quote.items.length - 1 : 0;
                  return (
                    <tr key={quote.id}>
                      <td>{index + 1}</td>
                      <td>{partNumber || quote.quoteNumber}</td>
                      <td>
                        {name || item?.description || quote.data.quoteTitle || ''}
                        {extraCount ? <span className="quote-history-extra"> +{extraCount} hạng mục khác</span> : null}
                      </td>
                      <td>{item?.quantity ?? ''}</td>
                      <td>{item ? formatVnd(item.unitPriceVnd ?? item.unitPrice) : ''}</td>
                      <td>{formatVnd(quote.subtotalAmount)}</td>
                      <td>{item?.discountPercent ? `${item.discountPercent}%` : '—'}</td>
                      <td>{item?.vatRate ? `${item.vatRate}%` : ''}</td>
                      <td>{formatVnd(quote.vatAmount)}</td>
                      <td>{formatVnd(quote.totalAmount)}</td>
                      <td>{formatDate(quote.issuedAt || quote.createdAt)}</td>
                      <td>
                        <span className={`quote-badge ${internalQuoteStatusClass(quote.status)}`}>
                          {internalQuoteStatusLabel(quote.status)}
                        </span>
                      </td>
                      <td className="quote-history-link-cell">
                        <Link href={`/all-platform/quotes/${quote.id}`} className="quote-button quote-button--secondary">
                          Mở
                        </Link>
                        <button type="button" className="quote-button quote-button--secondary" onClick={() => void copyLink(quote)}>
                          Copy link
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
