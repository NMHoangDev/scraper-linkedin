export type QuoteFormStatus = 'active' | 'inactive' | 'archived';
export type QuoteStatus = 'draft' | 'confirmed' | 'cancelled';
export type QuoteLayoutType =
  | 'cloudgate_standard_quote'
  | 'villa_solution_package'
  | 'blank_quote';

export type QuoteFieldType =
  | 'text'
  | 'textarea'
  | 'phone'
  | 'email'
  | 'date'
  | 'number'
  | 'select'
  | 'repeater-table'
  | 'auto-number'
  | 'currency'
  | 'calculated'
  | 'repeatable-textarea'
  | 'checkbox';

export interface QuoteField {
  key: string;
  label: string;
  type: QuoteFieldType;
  required?: boolean;
  visible?: boolean;
  editable?: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: unknown;
  options?: string[];
  config?: {
    allowAddRows?: boolean;
    allowDeleteRows?: boolean;
    allowReorderRows?: boolean;
    initialRows?: number;
    columns?: QuoteField[];
    [key: string]: unknown;
  };
}

export interface QuoteSection {
  key: string;
  title: string;
  fields: QuoteField[];
}

export interface QuoteSchema {
  version: number;
  layoutType: QuoteLayoutType;
  sections: QuoteSection[];
}

export interface QuoteForm {
  id: string;
  code: string;
  name: string;
  description: string;
  status: QuoteFormStatus;
  schemaVersion: number;
  schemaJson: QuoteSchema;
  createdAt: string;
  updatedAt: string;
  sectionCount: number;
  fieldCount: number;
  shareToken?: string;
  shareEnabled?: boolean;
  shareUrl?: string;
}

export interface QuoteItem {
  id?: string;
  quoteId?: string;
  description?: string;
  serviceDescription?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  subtotalAmount?: number;
  vatAmount?: number;
  totalAmount?: number;
  sortOrder?: number;
  [key: string]: unknown;
}

export interface VillaSolutionItem {
  name: string;
  description?: string;
  originalPrice?: number;
  offerPrice: number;
  note?: string;
}

export interface QuoteData {
  quoteTitle?: string;
  quoteNumber?: string;
  quoteDate?: string;
  validityDays?: number;
  currency?: string;
  solutionItems?: VillaSolutionItem[];
  [key: string]: unknown;
}

export interface Quote {
  id: string;
  accountId?: string;
  contactId?: string;
  dealId?: string;
  quoteFormId: string;
  quoteNumber: string;
  status: QuoteStatus;
  formSchemaVersion: number;
  formSnapshot: QuoteSchema;
  data: QuoteData;
  items: QuoteItem[];
  subtotalAmount: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  issuedAt: string;
  validUntil?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  publicToken?: string;
  publicUrl?: string;
  publicEnabled?: boolean;
}

export interface QuoteReference {
  id?: string;
  number?: string;
  url?: string;
  totalAmount?: number;
}

export interface CreateQuoteFormInput {
  name: string;
  description?: string;
  status: QuoteFormStatus;
  layoutType?: QuoteLayoutType;
  schemaVersion?: number;
  schemaJson: QuoteSchema;
}

export type UpdateQuoteFormInput = Partial<CreateQuoteFormInput>;

export interface CreateQuoteInput {
  quoteFormId: string;
  dealId?: string;
  status?: QuoteStatus;
  data: QuoteData;
  items?: QuoteItem[];
}

export interface UpdateQuoteInput {
  status?: QuoteStatus;
  data?: QuoteData;
  items?: QuoteItem[];
  publicEnabled?: boolean;
}
