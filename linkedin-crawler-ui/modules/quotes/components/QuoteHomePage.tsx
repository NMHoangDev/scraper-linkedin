'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FORM_STATUS_LABELS } from '../constants/quoteConfig';
import { seedingQuoteRepository } from '../repositories/SeedingQuoteRepository';
import type { QuoteForm } from '../types';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date).replace(',', ' ·');
}

export function QuoteHomePage() {
  const [forms, setForms] = useState<QuoteForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const formRows = await seedingQuoteRepository.getForms();
      setForms(formRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu báo giá.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function copyFormLink(form: QuoteForm) {
    const updated = await seedingQuoteRepository.shareForm(form.id, true);
    setForms(rows => rows.map(row => (row.id === updated.id ? updated : row)));
    await navigator.clipboard.writeText(`${window.location.origin}${updated.shareUrl}`);
  }

  async function toggleFormShare(form: QuoteForm) {
    const updated = await seedingQuoteRepository.shareForm(form.id, !form.shareEnabled);
    setForms(rows => rows.map(row => (row.id === updated.id ? updated : row)));
  }

  async function duplicateForm(form: QuoteForm) {
    await seedingQuoteRepository.duplicateForm(form.id);
    await load();
  }

  async function deleteForm(form: QuoteForm) {
    if (!window.confirm('Xóa mẫu báo giá này? Nếu đã có báo giá, mẫu sẽ được lưu trữ.')) return;
    await seedingQuoteRepository.deleteForm(form.id);
    await load();
  }

  return (
    <main className="quote-page">
      <header className="quote-head">
        <div>
          <p>Quản lý form, preview, public link, quote detail và renderer độc lập.</p>
        </div>
        <div className="quote-head-actions">
          <button type="button" className="quote-button quote-button--secondary" onClick={() => void load()}>
            Làm mới
          </button>
          <Link href="/all-platform/quotes/new" className="quote-button quote-button--primary">
            Tạo form mới
          </Link>
        </div>
      </header>

      {loading ? <section className="quote-state">Đang tải danh sách mẫu báo giá...</section> : null}
      {error ? <section className="quote-state quote-state--error">{error}</section> : null}

      {!loading && !error ? (
        <section className="quote-grid">
          {forms.length === 0 ? (
            <div className="quote-state">Chưa có mẫu báo giá nào.</div>
          ) : (
            forms.map(form => (
              <article key={form.id} className="quote-card">
                <div className="quote-card__main">
                  <div>
                    <div className="quote-card__title-row">
                      <h2>{form.name}</h2>
                      <span className={`quote-badge ${form.status === 'active' ? 'quote-badge--active' : ''}`}>
                        {FORM_STATUS_LABELS[form.status]}
                      </span>
                    </div>
                    <p>{form.description}</p>
                  </div>
                  <dl className="quote-meta">
                    <div>
                      <dt>Cập nhật lần cuối</dt>
                      <dd>{formatDate(form.updatedAt)}</dd>
                    </div>
                    <div>
                      <dt>Cấu trúc</dt>
                      <dd>{form.sectionCount} nhóm · {form.fieldCount} trường</dd>
                    </div>
                  </dl>
                </div>
                <div className="quote-actions">
                  <Link href={`/all-platform/quotes/${form.id}/edit`} className="quote-button quote-button--secondary">Chỉnh sửa</Link>
                  <Link href={`/all-platform/quotes/${form.id}/preview`} className="quote-button quote-button--secondary">Xem thử</Link>
                  <button type="button" className="quote-button quote-button--secondary" onClick={() => void copyFormLink(form)}>Copy Link</button>
                  <button type="button" className="quote-button quote-button--secondary" onClick={() => void toggleFormShare(form)}>
                    {form.shareEnabled ? 'Tắt public' : 'Bật public'}
                  </button>
                  <button type="button" className="quote-button quote-button--secondary" onClick={() => void duplicateForm(form)}>Nhân bản</button>
                  <button type="button" className="quote-button quote-button--danger" onClick={() => void deleteForm(form)}>Xóa</button>
                </div>
              </article>
            ))
          )}
        </section>
      ) : null}
    </main>
  );
}
