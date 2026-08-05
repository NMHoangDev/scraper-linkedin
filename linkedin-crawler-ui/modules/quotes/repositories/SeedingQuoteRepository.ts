import { API_BASE_URL, API_KEY } from '@/lib/env';
import type {
  CreateQuoteFormInput,
  CreateQuoteInput,
  Quote,
  QuoteForm,
  UpdateQuoteFormInput,
  UpdateQuoteInput,
} from '../types';
import type { QuoteRepository } from './QuoteRepository';

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

function getDefaultHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['X-API-Key'] = API_KEY;
  return headers;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: getDefaultHeaders(),
    ...options,
  });
  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok) {
    throw new Error(body.message || `Lỗi máy chủ (${res.status})`);
  }
  if (body.success === false) {
    throw new Error(body.message || 'Không thực hiện được yêu cầu báo giá.');
  }
  return body.data as T;
}

function toCreateFormPayload(input: CreateQuoteFormInput) {
  return {
    name: input.name,
    description: input.description,
    status: input.status,
    layout_type: input.layoutType,
    schema_version: input.schemaVersion,
    schema_json: input.schemaJson,
  };
}

function toUpdateFormPayload(input: UpdateQuoteFormInput) {
  return {
    name: input.name,
    description: input.description,
    status: input.status,
    layout_type: input.layoutType,
    schema_version: input.schemaVersion,
    schema_json: input.schemaJson,
  };
}

function toCreateQuotePayload(input: CreateQuoteInput) {
  return {
    deal_id: input.dealId,
    quote_form_id: input.quoteFormId,
    data: input.data,
    items: (input.items || []).map(item => ({
      description: item.description ?? '',
      service_description: item.serviceDescription ?? null,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      vat_rate: item.vatRate,
    })),
  };
}

function toUpdateQuotePayload(input: UpdateQuoteInput) {
  return {
    data: input.data,
    items: input.items?.map(item => ({
      description: item.description ?? '',
      service_description: item.serviceDescription ?? null,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      vat_rate: item.vatRate,
    })),
  };
}

export class SeedingQuoteRepository implements QuoteRepository {
  async getForms(): Promise<QuoteForm[]> {
    return apiFetch<QuoteForm[]>('/api/all-platform/quote-forms?status=active');
  }

  async getForm(id: string): Promise<QuoteForm> {
    return apiFetch<QuoteForm>(`/api/all-platform/quote-forms/${encodeURIComponent(id)}`);
  }

  async getPublicForm(token: string): Promise<QuoteForm> {
    return apiFetch<QuoteForm>(`/api/all-platform/quote-forms/public/${encodeURIComponent(token)}`);
  }

  async createForm(input: CreateQuoteFormInput): Promise<QuoteForm> {
    return apiFetch<QuoteForm>('/api/all-platform/quote-forms', {
      method: 'POST',
      body: JSON.stringify(toCreateFormPayload(input)),
    });
  }

  async updateForm(id: string, input: UpdateQuoteFormInput): Promise<QuoteForm> {
    return apiFetch<QuoteForm>(`/api/all-platform/quote-forms/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(toUpdateFormPayload(input)),
    });
  }

  async deleteForm(id: string): Promise<{ deleted: boolean; archived: boolean; form?: QuoteForm }> {
    return apiFetch(`/api/all-platform/quote-forms/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async duplicateForm(id: string): Promise<QuoteForm> {
    return apiFetch<QuoteForm>(`/api/all-platform/quote-forms/${encodeURIComponent(id)}/duplicate`, {
      method: 'POST',
    });
  }

  async shareForm(id: string, enabled = true): Promise<QuoteForm> {
    return apiFetch<QuoteForm>(
      `/api/all-platform/quote-forms/${encodeURIComponent(id)}/share?enabled=${enabled ? 'true' : 'false'}`,
      { method: 'POST' }
    );
  }

  async getQuotes(): Promise<Quote[]> {
    return apiFetch<Quote[]>('/api/all-platform/quotes');
  }

  async getQuote(id: string): Promise<Quote> {
    return apiFetch<Quote>(`/api/all-platform/quotes/${encodeURIComponent(id)}`);
  }

  async getPublicQuote(token: string): Promise<Quote> {
    return apiFetch<Quote>(`/api/all-platform/quotes/public/${encodeURIComponent(token)}`);
  }

  async createQuote(input: CreateQuoteInput): Promise<Quote> {
    return apiFetch<Quote>('/api/all-platform/quotes', {
      method: 'POST',
      body: JSON.stringify(toCreateQuotePayload(input)),
    });
  }

  async updateQuote(id: string, input: UpdateQuoteInput): Promise<Quote> {
    return apiFetch<Quote>(`/api/all-platform/quotes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(toUpdateQuotePayload(input)),
    });
  }

  async deleteQuote(id: string): Promise<void> {
    await apiFetch<unknown>(`/api/all-platform/quotes/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async approveQuote(id: string): Promise<Quote> {
    return apiFetch<Quote>(`/api/all-platform/quotes/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
    });
  }

  async updateAndApproveQuote(id: string, input: UpdateQuoteInput): Promise<Quote> {
    return apiFetch<Quote>(`/api/all-platform/quotes/${encodeURIComponent(id)}/update-and-approve`, {
      method: 'POST',
      body: JSON.stringify(toUpdateQuotePayload(input)),
    });
  }
}

export const seedingQuoteRepository = new SeedingQuoteRepository();
