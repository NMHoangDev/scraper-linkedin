import type {
  CreateQuoteFormInput,
  CreateQuoteInput,
  Quote,
  QuoteForm,
  UpdateQuoteFormInput,
  UpdateQuoteInput,
} from '../types';
import type { ServiceCatalogOptions } from '../../service-catalog/types';

export interface QuoteRepository {
  getForms(): Promise<QuoteForm[]>;
  getForm(id: string): Promise<QuoteForm>;
  getPublicForm(token: string): Promise<QuoteForm>;
  createForm(input: CreateQuoteFormInput): Promise<QuoteForm>;
  updateForm(id: string, input: UpdateQuoteFormInput): Promise<QuoteForm>;
  deleteForm(id: string): Promise<{ deleted: boolean; archived: boolean; form?: QuoteForm }>;
  duplicateForm(id: string): Promise<QuoteForm>;
  shareForm(id: string, enabled?: boolean): Promise<QuoteForm>;

  getQuotes(): Promise<Quote[]>;
  getQuote(id: string): Promise<Quote>;
  getPublicQuote(token: string): Promise<Quote>;
  createQuote(input: CreateQuoteInput): Promise<Quote>;
  updateQuote(id: string, input: UpdateQuoteInput): Promise<Quote>;
  deleteQuote(id: string): Promise<void>;
  /** Duyệt báo giá — khoá chỉnh sửa vĩnh viễn, sinh public link. */
  approveQuote(id: string): Promise<Quote>;
  /** Lưu thay đổi cuối + duyệt atomic (dùng khi bấm "Duyệt báo giá" trong modal đang sửa). */
  updateAndApproveQuote(id: string, input: UpdateQuoteInput): Promise<Quote>;

  /** Danh mục dịch vụ liên kết với 1 mẫu báo giá (danh sách id nhóm). */
  getFormCatalogLinks(formId: string): Promise<string[]>;
  setFormCatalogLinks(formId: string, catalogItemIds: string[]): Promise<string[]>;
  /** Gói bán + dịch vụ thành phần khả dụng cho 1 mẫu báo giá, dùng dựng dropdown khi điền báo giá. */
  getServiceCatalogOptions(formId: string): Promise<ServiceCatalogOptions>;
}
