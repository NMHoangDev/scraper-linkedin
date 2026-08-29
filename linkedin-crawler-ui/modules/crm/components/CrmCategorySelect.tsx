'use client';

import { useEffect, useState } from 'react';
import { SearchableSelect } from './SearchableSelect';
import { allPlatformCategoriesService } from '@/services/all-platform.service';
import type { CategoryType } from '@/types/unified.types';

export type CrmCategoryOption = { value: string; label: string };

// Cache theo category_type (module-level, dung chung cho MOI CrmCategorySelect
// tren trang) — cung y tuong voi cache trong PositionSelect.tsx, chi khac la
// tham so hoa theo category_type thay vi dong cung 'crm_position', vi drawer
// "Xac minh Lead" can 2 danh sach khac nhau (crm_service_package +
// crm_next_step) va khong co ly do gi de fork 2 ban copy cua cung 1 co che.
const cachedOptions = new Map<string, string[]>();
const cachedPromises = new Map<string, Promise<string[]>>();

/** Tra ve danh sach NHAN (name) cua 1 category_type dang active. */
export function fetchCrmCategoryLabels(categoryType: CategoryType): Promise<string[]> {
  const cached = cachedOptions.get(categoryType);
  if (cached) return Promise.resolve(cached);
  let promise = cachedPromises.get(categoryType);
  if (!promise) {
    promise = allPlatformCategoriesService
      .getAll(categoryType, { activeOnly: true })
      .then(res => {
        const labels = (res.data || []).map(c => c.name || c.code).filter(Boolean);
        cachedOptions.set(categoryType, labels);
        return labels;
      })
      .catch(() => {
        cachedPromises.delete(categoryType);
        return [] as string[];
      });
    cachedPromises.set(categoryType, promise);
  }
  return promise;
}

/** Goi sau khi admin them/sua/ngung dung 1 muc o trang Danh muc CRM. */
export function invalidateCrmCategoryCache(categoryType?: CategoryType) {
  if (categoryType) {
    cachedOptions.delete(categoryType);
    cachedPromises.delete(categoryType);
    return;
  }
  cachedOptions.clear();
  cachedPromises.clear();
}

/**
 * Hook lay danh sach nhan cua 1 category_type, kem `fallbackLabels` dung khi
 * danh muc do CHUA co dong nao trong DB (vd migration 080 seed
 * category_type='crm_next_step' chua duoc ap dung tren moi truong dang chay).
 *
 * Ly do co fallback: yeu cau nghiep vu la dropdown "Viec tiep theo" khong bao
 * gio duoc rong/chet. Khi danh muc that da co du lieu thi fallback KHONG duoc
 * dung den — no khong phai danh sach hard-code song song.
 */
export function useCrmCategoryLabels(categoryType: CategoryType, fallbackLabels: string[] = []) {
  const [labels, setLabels] = useState<string[]>(() => cachedOptions.get(categoryType) || []);
  const [loaded, setLoaded] = useState<boolean>(() => cachedOptions.has(categoryType));

  useEffect(() => {
    let alive = true;
    void fetchCrmCategoryLabels(categoryType).then(next => {
      if (!alive) return;
      setLabels(next);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [categoryType]);

  const usingFallback = loaded && labels.length === 0 && fallbackLabels.length > 0;
  return { labels: usingFallback ? fallbackLabels : labels, loaded, usingFallback };
}

/**
 * Combobox chon 1 muc trong `categories` theo category_type bat ky — tai dung
 * nguyen SearchableSelect (giong PositionSelect), khong de ra co che dropdown
 * moi.
 *
 * Gia tri lam viec o day la NHAN (text), khong phai categories.id: 2 cho dung
 * no (`crm_leads.qualification_need`, `crm_leads.next_step`) deu la cot TEXT
 * co san ma moi duong doc hien tai — ke ca RPC crm_convert_lead — dang doc
 * truc tiep. Luu nhan giu cho du lieu round-trip nguyen ven ma khong phai
 * them cot id moi vao 1 bang dang chay (xem migration 080).
 *
 * Ban ghi cu co the dang giu 1 nhan tu do nhap tay truoc khi co danh muc —
 * nhan do van phai hien thi dung, nen duoc chen tam vao dau danh sach.
 */
export function CrmCategorySelect({
  categoryType,
  value,
  onChange,
  placeholder,
  disabled = false,
  fallbackLabels = [],
}: {
  categoryType: CategoryType;
  value: string;
  onChange: (label: string) => void;
  placeholder?: string;
  disabled?: boolean;
  fallbackLabels?: string[];
}) {
  const { labels } = useCrmCategoryLabels(categoryType, fallbackLabels);
  const options: CrmCategoryOption[] = labels.map(label => ({ value: label, label }));
  const displayOptions =
    value && !labels.includes(value) ? [{ value, label: value }, ...options] : options;

  return (
    <SearchableSelect
      value={value}
      disabled={disabled}
      onChange={next => onChange(next)}
      options={displayOptions}
      placeholder={placeholder || '-- Chọn --'}
    />
  );
}
