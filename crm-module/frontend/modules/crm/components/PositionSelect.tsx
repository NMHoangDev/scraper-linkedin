'use client';

import { useEffect, useState } from 'react';
import { SearchableSelect } from './SearchableSelect';
import { allPlatformCategoriesService } from '@/services/all-platform.service';

// Cache trong module (dùng chung cho MỌI PositionSelect trên trang — Lead
// drawer, Deal form, Contact modal... đều gọi cùng 1 danh sách "Chức vụ").
// Không hard-code 7 giá trị mẫu ở đây — luôn fetch thật từ
// GET /categories?category_type=crm_position&active_only=true.
let cachedOptions: Array<{ value: string; label: string }> | null = null;
let cachedPromise: Promise<Array<{ value: string; label: string }>> | null = null;

async function fetchActivePositions(): Promise<Array<{ value: string; label: string }>> {
  if (cachedOptions) return cachedOptions;
  if (!cachedPromise) {
    cachedPromise = allPlatformCategoriesService
      .getAll('crm_position', { activeOnly: true })
      .then(res => {
        const opts = (res.data || []).map(c => ({ value: c.id, label: c.name || c.code }));
        cachedOptions = opts;
        return opts;
      })
      .catch(() => {
        cachedPromise = null;
        return [];
      });
  }
  return cachedPromise;
}

/** Gọi sau khi admin thêm/sửa/ngừng dùng 1 "Chức vụ" ở trang Danh mục CRM, để
 * mọi combobox Chức vụ đang mở (kể cả tab/drawer khác) load lại danh sách mới
 * nhất ngay lần fetch tiếp theo — không cần reload trang. */
export function invalidatePositionOptionsCache() {
  cachedOptions = null;
  cachedPromise = null;
}

const DEACTIVATED_SUFFIX = ' (đã ngừng dùng)';

/** Combobox chọn "Chức vụ" — category_type=crm_position. Tái dùng nguyên
 * SearchableSelect (đúng pattern đã có sẵn cho Nguồn/Gói/Lĩnh vực/Danh mục
 * sản phẩm ở DealFormFields — fetch 1 lần rồi lọc phía client, không phải
 * kiểu debounce-search-server dùng cho danh sách khách hàng lớn) thay vì bịa
 * ra 1 cơ chế dropdown mới.
 *
 * Nếu record đã lưu 1 position_category_id không còn nằm trong danh sách
 * đang active (bị ngừng dùng, hoặc vừa bị xoá) thì vẫn phải hiện đúng tên cũ
 * qua `labelSnapshot` — chèn tạm option đó vào đầu danh sách kèm nhãn "(đã
 * ngừng dùng)" thay vì để trống/gãy hiển thị. */
export function PositionSelect({
  value,
  labelSnapshot,
  onChange,
  disabled = false,
}: {
  value: string;
  labelSnapshot?: string | null;
  onChange: (positionCategoryId: string, label: string) => void;
  disabled?: boolean;
}) {
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>(() => cachedOptions || []);

  useEffect(() => {
    let alive = true;
    void fetchActivePositions().then(opts => {
      if (alive) setOptions(opts);
    });
    return () => {
      alive = false;
    };
  }, []);

  const hasValueInOptions = Boolean(value) && options.some(o => o.value === value);
  const displayOptions =
    value && !hasValueInOptions && labelSnapshot
      ? [{ value, label: `${labelSnapshot}${DEACTIVATED_SUFFIX}` }, ...options]
      : options;

  return (
    <SearchableSelect
      value={value}
      disabled={disabled}
      onChange={id => {
        if (!id) {
          onChange('', '');
          return;
        }
        const picked = displayOptions.find(o => o.value === id);
        const label = picked ? picked.label.replace(DEACTIVATED_SUFFIX, '') : '';
        onChange(id, label);
      }}
      options={displayOptions}
      placeholder="-- Chọn chức vụ --"
    />
  );
}
