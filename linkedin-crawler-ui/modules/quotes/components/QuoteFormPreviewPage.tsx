'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { seedingQuoteRepository } from '../repositories/SeedingQuoteRepository';
import type { QuoteForm, QuoteItem, VillaSolutionItem } from '../types';
import { calculateQuoteTotals, calculateVillaTotals } from '../utils/quoteCalculations';
import { QuoteDocumentRenderer } from './QuoteDocumentRenderer';

interface Props {
  formId: string;
}

function sampleItems(vatRate = 10): QuoteItem[] {
  return [
    {
      serviceDescription: 'Tải video nguồn',
      description: 'Nhóm dịch vụ xử lý video đầu vào cho hệ thống chatbot_auto_inbox và lồng tiếng Douyin.',
      unit: 'Gói',
      quantity: 1,
      unitPrice: 5000000,
      discountPercent: 10,
      vatRate,
      children: [
        { serviceDescription: 'Tải qua relay bot Telegram công khai', description: 'Nhận link và tải qua relay bot.', unit: 'Tác vụ', quantity: 1, unitPrice: 1000000, discountPercent: 0, vatRate },
        { serviceDescription: 'Tải trực tiếp bằng cookie Douyin', description: 'Dùng cookie hợp lệ để tải trực tiếp.', unit: 'Tác vụ', quantity: 1, unitPrice: 1500000, discountPercent: 50, vatRate },
        { serviceDescription: 'Tự động làm mới cookie Douyin theo lịch', description: 'Theo dõi và refresh cookie định kỳ.', unit: 'Tháng', quantity: 1, unitPrice: 1200000, discountPercent: 0, vatRate },
        { serviceDescription: 'Giới hạn thời lượng video nguồn', description: 'Áp rule thời lượng trước khi đưa vào xử lý.', unit: 'Rule', quantity: 1, unitPrice: 800000, discountPercent: 100, vatRate },
      ],
    },
  ];
}

export function QuoteFormPreviewPage({ formId }: Props) {
  const [form, setForm] = useState<QuoteForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    seedingQuoteRepository
      .getForm(formId)
      .then(setForm)
      .catch(err => setError(err instanceof Error ? err.message : 'Không tải được mẫu báo giá.'))
      .finally(() => setLoading(false));
  }, [formId]);

  if (loading) return <main className="quote-preview-page"><section className="quote-state">Đang tải bản xem trước...</section></main>;
  if (error || !form) return <main className="quote-preview-page"><section className="quote-state quote-state--error">{error || 'Không tìm thấy mẫu.'}</section></main>;

  const quoteData = Object.fromEntries(
    form.schemaJson.sections
      .flatMap(section => section.fields)
      .filter(field => field.key !== 'quoteItems' && field.key !== 'solutionItems')
      .map(field => [field.key, field.defaultValue || ''])
  );
  quoteData.quoteDate ||= new Date().toISOString().slice(0, 10);
  quoteData.quoteNumber ||= 'Sẽ sinh khi lưu';
  const fields = form.schemaJson.sections.flatMap(section => section.fields);
  const solutionItems = (fields.find(field => field.key === 'solutionItems')?.defaultValue || []) as VillaSolutionItem[];
  const defaultQuoteItems = fields.find(field => field.key === 'quoteItems')?.defaultValue;
  const items = Array.isArray(defaultQuoteItems)
    ? (defaultQuoteItems as QuoteItem[])
    : sampleItems(Number(quoteData.defaultVatRate || 10));
  const totals =
    form.schemaJson.layoutType === 'villa_solution_package'
      ? calculateVillaTotals(solutionItems)
      : calculateQuoteTotals(items);

  return (
    <main className="quote-preview-page">
      <header className="quote-head">
        <div>
          <h1>Xem trước mẫu báo giá</h1>
          <p>{form.name}</p>
        </div>
        <div className="quote-head-actions">
          <Link href="/all-platform/quotes" className="quote-button quote-button--secondary">Quay lại danh sách</Link>
          <Link href={`/all-platform/quotes/${form.id}/edit`} className="quote-button quote-button--primary">Chỉnh sửa</Link>
        </div>
      </header>
      <QuoteDocumentRenderer
        schemaSnapshot={form.schemaJson}
        quoteData={quoteData}
        quoteItems={items}
        solutionItems={solutionItems}
        totals={totals}
        mode="preview"
      />
    </main>
  );
}
