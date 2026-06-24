import { API_BASE_URL, API_KEY } from "@/lib/env";

export interface CustomerLead {
  id: string;
  customer_name: string;
  company_name: string | null;
  leaded_by: string | null;
  is_assigned: boolean;
  sdr_id: string | null;
  conv_id: string | null;
  status: 'pending' | 'closed' | 'rejected';
  note: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
  leader_name?: string | null;
  sdr_name?: string | null;
}

export interface SDRUser {
  id: string;
  name: string;
  role: string;
}

const getDefaultHeaders = () => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) headers["X-API-Key"] = API_KEY;
  return headers;
};

export const customerLeadService = {
  getAll: async () => {
    const res = await fetch(`${API_BASE_URL}/api/all-platform/customer-leads`, {
      credentials: "include",
      headers: getDefaultHeaders(),
    });
    const data = await res.json();
    return (data?.data as CustomerLead[]) || [];
  },

  getSdrs: async () => {
    const res = await fetch(`${API_BASE_URL}/api/all-platform/customer-leads/sdrs`, {
      credentials: "include",
      headers: getDefaultHeaders(),
    });
    const data = await res.json();
    return (data?.data as SDRUser[]) || [];
  },

  create: async (payload: Partial<CustomerLead>) => {
    const res = await fetch(`${API_BASE_URL}/api/all-platform/customer-leads`, {
      method: "POST",
      credentials: "include",
      headers: getDefaultHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  update: async (id: string, payload: Partial<CustomerLead>) => {
    const res = await fetch(`${API_BASE_URL}/api/all-platform/customer-leads/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: getDefaultHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/api/all-platform/customer-leads/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: getDefaultHeaders(),
    });
    return res.json();
  }
};
