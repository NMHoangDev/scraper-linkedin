import type {
  CreateQuoteFormInput,
  CreateQuoteInput,
  Quote,
  QuoteForm,
  QuoteReference,
  UpdateQuoteFormInput,
  UpdateQuoteInput,
} from '../types';

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
  publishQuote(id: string): Promise<QuoteReference>;
}
