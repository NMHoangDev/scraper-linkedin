'use client';

import { QuoteFormFiller } from '@/modules/quotes';
import type { QuoteSchema } from '@/modules/quotes';
import type { QuoteDraft } from './types';

// Section da hien o Buoc 1 (IssuerCompanySection/SelectCustomerStep) hoac da co
// san khoi Tong tien rieng ngay trong QuoteFormFiller (ngoai vong lap section) -
// hien lai theo schema o day se bi trung lap, roi rac. Chi con quoteInfo (tieu
// de/ngay/hieu luc - khong co UI nhap nao khac), quoteItems, notes,
// representatives la thuc su can o Buoc 2 "Hang muc bao gia".
const REDUNDANT_SECTION_KEYS = new Set(['seller', 'customer', 'totals']);

export function FillQuoteStep({
  schema,
  value,
  onChange,
  quoteFormId,
  section,
}: {
  schema: QuoteSchema;
  value: QuoteDraft;
  onChange: (next: QuoteDraft) => void;
  quoteFormId?: string;
  /** Tách màn điền báo giá thành 2 bước: 'items' = CHỈ bảng hạng mục (chọn từ
   * danh mục/thêm ngoài danh mục) + khối Tạm tính/VAT/Tổng cộng — dùng cho Bước
   * 2 "Hạng mục báo giá"; 'info' = phần còn lại (tiêu đề/ngày/hiệu lực/ghi
   * chú/đại diện ký...) — dùng cho Bước 3 "Thông tin báo giá". undefined = giữ
   * hành vi cũ, gộp hết 1 màn (DealQuoteWizard vẫn dùng 1 bước "Báo giá" duy
   * nhất, không đổi để tránh ảnh hưởng luồng đó). Tiêu chí tách hoàn toàn theo
   * cấu trúc schema (section có field 'repeater-table' hay không) — áp dụng
   * đúng cho MỌI mẫu (chuẩn/villa/blank...) không hardcode key theo mẫu cụ thể. */
  section?: 'items' | 'info';
}) {
  const withoutRedundant = schema.sections.filter(section2 => !REDUNDANT_SECTION_KEYS.has(section2.key));
  const scopedSections = !section
    ? withoutRedundant
    : withoutRedundant
        .filter(sectionItem => {
          const hasRepeater = sectionItem.fields.some(field => field.type === 'repeater-table');
          return section === 'items' ? hasRepeater : !hasRepeater;
        })
        .map(sectionItem =>
          // Buoc 'info' bo cac field 'calculated' (Tam tinh/VAT/Tong cong) - da
          // hien rieng o Buoc 2 (khoi tong tien cua QuoteFormFiller), tranh hien
          // trung lap o Buoc 3.
          section === 'info' ? { ...sectionItem, fields: sectionItem.fields.filter(field => field.type !== 'calculated') } : sectionItem
        );
  const trimmedSchema: QuoteSchema = { ...schema, sections: scopedSections };
  return (
    <div className="crm-wizard-fill-step">
      <QuoteFormFiller
        schema={trimmedSchema}
        value={value}
        onChange={onChange}
        quoteFormId={quoteFormId}
        showTotals={section === 'items' ? true : section === 'info' ? false : undefined}
      />
    </div>
  );
}
